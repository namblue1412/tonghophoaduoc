import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionIdentity } from '../src/services/sessionIdentity.js';
import { createCloudSync, normalizeCloudRecord } from '../src/services/cloudSync.js';

test('existing lab-account session supplies identity when Firebase Auth is not configured', () => {
  const identity = createSessionIdentity({ authConfigured: () => false, authUser: () => null });
  identity.setLabUser({ uid: 'stu_current', email: 'current@qa.invalid', studentId: 'QA' });
  assert.equal(identity.current().uid, 'stu_current'); assert.equal(identity.current().studentId, 'QA');
  identity.setLabUser(null); assert.equal(identity.current(), null);
});
test('configured Firebase Auth never accepts an injected legacy session', () => {
  let firebaseUser = null;
  const identity = createSessionIdentity({ authConfigured: () => true, authUser: () => firebaseUser });
  identity.setLabUser({ uid: 'stu_fake' }); assert.equal(identity.current(), null);
  firebaseUser = { uid: 'firebase-user' }; assert.equal(identity.current(), firebaseUser);
});
test('old different-email results require an explicit local link, without writing source records', async () => {
  const raw = { id: 'QA', code: 'D1-QA', title: 'Legacy result', researcher: 'QA Researcher', creatorId: 'student-old', creatorEmail: 'old@qa.invalid' };
  const before = JSON.stringify(raw); let writes = 0;
  const identity = createSessionIdentity({ authConfigured: () => false, authUser: () => null });
  identity.setLabUser({ uid: 'stu_current', email: 'current@qa.invalid', displayName: 'QA Researcher' });
  const driver = { subscribe(callback) { callback([raw]); return () => {}; }, async transaction() { writes++; throw new Error('Read-only test'); } };
  const drafts = { all: async () => [], put: async () => {}, delete: async () => {} };
  const sync = createCloudSync({ driver, drafts, getUser: () => identity.current(), online: () => false });
  let list, details;
  const stop = sync.subscribe((items, mode, metadata) => { list = items; details = metadata; }, 'stu_current', (error) => { throw error; });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(list.length, 0); assert.equal(details.legacyOwners[0].id, 'student-old');
  identity.setLabUser({ ...identity.current(), legacyOwnerIds: ['student-old'] }); await sync.notify();
  assert.equal(list.length, 1); assert.equal(list[0].creatorId, 'stu_current');
  assert.equal(details.legacyOwners.length, 0);
  identity.setLabUser({ ...identity.current(), legacyOwnerIds: [] }); await sync.notify();
  assert.equal(list.length, 0); assert.equal(writes, 0); assert.equal(JSON.stringify(raw), before); stop();
});
test('local link cannot match unrelated researcher or non-legacy UID', () => {
  const identity = createSessionIdentity({ authConfigured: () => false, authUser: () => null });
  identity.setLabUser({ uid: 'stu_current', legacyOwnerIds: ['firebase-other', 'student-old'] });
  assert.deepEqual(identity.current().legacyOwnerIds, ['student-old']);
  assert.equal(normalizeCloudRecord({ id: 'QA', creatorId: 'student-old', researcher: 'Another researcher' }, identity.current()).creatorId, 'student-old');
});
