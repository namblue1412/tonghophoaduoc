import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { prepareDemoImport } from '../src/domain/demoImport.js';
const example = JSON.parse(fs.readFileSync('fixtures/demo-experiments.json', 'utf8'));

test('main JSON export imports without changing source data or timestamps', () => {
  const before = structuredClone(example);
  const result = prepareDemoImport(example);
  assert.equal(result.items.length, example.length);
  assert.equal(result.items[0].tlcTimeline[0].timestamp, example[0].tlcTimeline[0].timestamp);
  assert.deepEqual(example, before);
});
test('Firebase keyed collections and sparse arrays are normalized', () => {
  const source = structuredClone(example[0]);
  delete source.id;
  source.stoichiometry = Object.fromEntries(source.stoichiometry.map((r, i) => [i, r]));
  source.tlcTimeline = [null, ...source.tlcTimeline];
  const result = prepareDemoImport({ experiments: { 'EXP-SOURCE': source } });
  assert.equal(result.items[0].id, 'EXP-SOURCE');
  assert.ok(Array.isArray(result.items[0].stoichiometry));
  assert.ok(result.items[0].tlcTimeline.every(Boolean));
});
test('remote image URLs are preserved as metadata but never loaded', () => {
  const source = structuredClone(example[0]);
  source.tlcTimeline[0].images = { uv254: 'https://firebasestorage.googleapis.com/v0/b/project/o/image', uv365: 'data:image/png;base64,AA==' };
  const result = prepareDemoImport([source]);
  assert.equal(result.remoteAssetCount, 1);
  assert.equal(result.items[0].tlcTimeline[0].images.uv254, '');
  assert.equal(result.items[0].tlcTimeline[0].images.uv365, 'data:image/png;base64,AA==');
  assert.equal(result.items[0].sourceRemoteAssets[0].sourceUrl, source.tlcTimeline[0].images.uv254);
});
test('unsafe keys and invalid calculations still block the whole import', () => {
  assert.throws(() => prepareDemoImport(JSON.parse('[{"__proto__":{}}]')), /Khóa/);
  const bad = structuredClone(example[0]); bad.units = { mass: 'kg' };
  assert.throws(() => prepareDemoImport([example[0], bad]));
});
