import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createCloudSync, normalizeCloudRecord } from '../src/services/cloudSync.js';
import { prepareDemoImport } from '../src/domain/demoImport.js';

function harness() {
  const records = new Map(), pending = new Map();
  let user = { uid: 'user-a', email: 'a@qa.invalid' }, connected = true;
  const driver = {
    async transaction(id, update) { const next = update(structuredClone(records.get(id) || null)); records.set(id, next); return structuredClone(next); },
    async read(id) { return structuredClone(records.get(id) || null); },
    async readAll() { return structuredClone([...records.values()]); },
    subscribe(callback) { callback([...records.values()]); return () => {}; }
  };
  const drafts = { all: async () => structuredClone([...pending.values()]), put: async (d) => { pending.set(d.id, structuredClone(d)); }, delete: async (id) => { pending.delete(id); } };
  const sync = createCloudSync({ driver, drafts, getUser: () => user, online: () => connected });
  return { sync, driver, drafts, records, pending, setUser: (next) => { user = next; }, offline: () => { connected = false; }, online: () => { connected = true; } };
}
const experiment = () => ({ id: 'QA', code: 'QA', title: 'original', creatorId: 'user-a', creatorEmail: 'a@qa.invalid', units: { mass: 'g', mole: 'mol' }, stoichiometry: [], labRoom: 'old' });

test('cloud adapter creates and merges independent stale fields without replacing other data', async () => {
  const h = harness(); const first = await h.sync.save(experiment()); assert.equal(first.success, true);
  const base = first.data;
  await h.sync.save({ ...base, title: 'remote' }, { base, patch: { title: 'remote' } });
  const next = await h.sync.save({ ...base, labRoom: 'local' }, { base, patch: { labRoom: 'local' } });
  assert.equal(next.success, true); assert.equal(next.data.title, 'remote'); assert.equal(next.data.labRoom, 'local');
  assert.equal(h.pending.size, 0);
});
test('same-field conflict preserves durable draft and cloud choice does not write cloud', async () => {
  const h = harness(); const { data: base } = await h.sync.save(experiment());
  await h.sync.save({ ...base, title: 'remote' }, { base, patch: { title: 'remote' } });
  const local = await h.sync.save({ ...base, title: 'local' }, { base, patch: { title: 'local' } });
  assert.equal(local.success, false); assert.equal(h.pending.size, 1);
  const before = JSON.stringify(h.records.get('QA'));
  await h.sync.resolve(await h.sync.conflict('QA'), 'cloud');
  assert.equal(JSON.stringify(h.records.get('QA')), before); assert.equal(h.pending.size, 0);
});
test('explicit local choice writes chosen record; moving cloud and changing owner reject overwrite', async () => {
  const h = harness(); const { data: base } = await h.sync.save(experiment());
  await h.sync.save({ ...base, title: 'remote' }, { base, patch: { title: 'remote' } });
  await h.sync.save({ ...base, title: 'local' }, { base, patch: { title: 'local' } });
  const snapshot = await h.sync.conflict('QA');
  h.records.get('QA').labRoom = 'changed';
  await assert.rejects(h.sync.resolve(snapshot, 'local'));
  const refreshed = await h.sync.conflict('QA'); await h.sync.resolve(refreshed, 'local');
  assert.equal(h.records.get('QA').title, 'local');
  h.setUser({ uid: 'other' }); assert.equal((await h.sync.save(experiment())).success, false);
});
test('offline draft replay, trash and tombstone prevent stale resurrection', async () => {
  const h = harness(); const { data: base } = await h.sync.save(experiment());
  h.offline(); const pending = await h.sync.save({ ...base, title: 'queued' }, { base, patch: { title: 'queued' } });
  assert.equal(pending.pending, true); assert.equal(h.pending.size, 1);
  h.online(); await h.sync.retry(); assert.equal(h.records.get('QA').title, 'queued');
  const current = h.records.get('QA');
  assert.equal((await h.sync.purge(['QA'])).success, false);
  await h.sync.save({ ...current, inTrash: true }, { base: current, patch: { inTrash: true }, kind: 'trash' });
  assert.equal((await h.sync.save({ ...base, title: 'stale' }, { base, patch: { title: 'stale' } })).success, false);
  assert.equal((await h.sync.purge(['QA'])).success, true);
  assert.equal(h.records.get('QA')._deleted, true);
  assert.equal((await h.sync.save(experiment())).success, false);
});
test('legacy Firebase arrays, zero-duration timer and capture timestamps are preserved', () => {
  const loaded = normalizeCloudRecord({ ...experiment(), creatorId: null, reactionTimer: { totalSeconds: 7200, intervals: { a: { id: 'i', durationSeconds: 0, startTime: '2026-01-01T00:00:00Z', endTime: '2026-01-01T02:00:00Z' } } }, columnAndYield: { fractionGroups: { a: { id: 'g', fractionNumbers: { a: '4' } } }, fractions: [{ number: 4 }] } }, { uid: 'user-a', email: 'a@qa.invalid' });
  assert.equal(loaded.reactionTimer.totalSeconds, 0); assert.equal(loaded.creatorId, 'user-a');
  assert.deepEqual(loaded.columnAndYield.fractionGroups[0].fractionNumbers, [4]);
});
test('production JSON retains Firebase images; demo retains only references', () => {
  const source = { ...experiment(), tlcTimeline: [{ id: 't', images: { uv254: 'https://firebasestorage.googleapis.com/v0/b/test/o/test?alt=media' } }] };
  assert.equal(prepareDemoImport([source], { allowRemoteImages: true }).items[0].tlcTimeline[0].images.uv254, source.tlcTimeline[0].images.uv254);
  assert.equal(prepareDemoImport([source]).remoteAssetCount, 1);
});
test('main production build selects Firebase while demo build stays isolated', () => {
  const source = fs.readdirSync('dist/assets').filter((name) => name.endsWith('.js')).map((name) => fs.readFileSync('dist/assets/' + name, 'utf8')).join('\n');
  assert.match(source, /identitytoolkit|signInWithPassword/);
  assert.ok(!source.includes('researcher.a@demo.invalid'));
  const html = fs.readFileSync('dist/index.html', 'utf8');
  assert.ok(html.includes('https://*.firebasedatabase.app'));
  assert.ok(!html.includes('__MEDCHEM_'));
});

test('cloud subscriptions do not expose another UID or write on initial read', async () => {
  const h = harness(); h.records.set('QA', experiment()); h.records.set('OTHER', { ...experiment(), id: 'OTHER', creatorId: 'other' });
  let seen; const before = JSON.stringify([...h.records.values()]);
  const stop = h.sync.subscribe((list) => { seen = list; }, 'user-a', (error) => { throw error; });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(seen.map((e) => e.id), ['QA']);
  assert.equal(JSON.stringify([...h.records.values()]), before); stop();
});
test('changed local draft requires a fresh conflict choice', async () => {
  const h = harness(); const { data: base } = await h.sync.save(experiment());
  await h.sync.save({ ...base, title: 'remote' }, { base, patch: { title: 'remote' } });
  await h.sync.save({ ...base, title: 'local' }, { base, patch: { title: 'local' } });
  const snapshot = await h.sync.conflict('QA');
  await h.sync.save({ ...base, title: 'newer local' }, { base, patch: { title: 'newer local' } });
  await assert.rejects(h.sync.resolve(snapshot, 'local'));
  assert.equal(h.records.get('QA').title, 'remote'); assert.equal(h.pending.size, 2);
});
test('legacy student UID can follow its authenticated email without claiming a different Firebase UID', () => {
  const user = { uid: 'firebase-uid', email: 'a@qa.invalid' };
  assert.equal(normalizeCloudRecord({ ...experiment(), creatorId: 'stu_old' }, user).creatorId, user.uid);
  assert.equal(normalizeCloudRecord({ ...experiment(), creatorId: 'other-firebase-uid' }, user).creatorId, 'other-firebase-uid');
});
test('two tabs replaying the same durable mutation increment revision once', async () => {
  const h = harness(); const { data: base } = await h.sync.save(experiment());
  h.offline(); await h.sync.save({ ...base, title: 'queued' }, { base, patch: { title: 'queued' } }); h.online();
  const otherTab = createCloudSync({ driver: h.driver, drafts: h.drafts, getUser: () => ({ uid: 'user-a', email: 'a@qa.invalid' }), online: () => true });
  await Promise.all([h.sync.retry(), otherTab.retry()]);
  assert.equal(h.records.get('QA').title, 'queued'); assert.equal(h.records.get('QA').revision, 2);
});
