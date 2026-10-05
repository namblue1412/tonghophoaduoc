import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
const values = new Map();
globalThis.localStorage = { getItem: (k) => values.get(k) || null, setItem: (k, v) => values.set(k, String(v)), removeItem: (k) => values.delete(k) };
const auth = await import('../src/services/demoAuth.js');
test('local account registration, login and revocable sessions', async (t) => {
  let user;
  await t.test('register returns profile only, never password material', async () => {
    user = await auth.signUpDemoAccount(' QA@DEMO.INVALID ', 'TestPass123!', 'QA Student', 'QA001');
    assert.equal(user.email, 'qa@demo.invalid'); assert.equal(user.studentId, 'QA001');
    assert.ok(!('passwordHash' in user)); assert.equal((await auth.readDemoSession()).uid, user.uid);
  });
  await t.test('logout revokes the stored session even if the old token is copied back', async () => {
    const token = localStorage.getItem('medchem_demo_auth_session_v1');
    await auth.signOutDemoAccount();
    localStorage.setItem('medchem_demo_auth_session_v1', token);
    assert.equal(await auth.readDemoSession(), null);
  });
  await t.test('wrong password and forged session both rejected', async () => {
    await assert.rejects(auth.signInDemoAccount('qa@demo.invalid', 'wrong'), /không chính xác/);
    localStorage.setItem('medchem_demo_auth_session_v1', user.uid);
    assert.equal(await auth.readDemoSession(), null);
  });
  await t.test('login by case-insensitive email or MSSV restores the same UID', async () => {
    assert.equal((await auth.signInDemoAccount('QA@DEMO.INVALID', 'TestPass123!')).uid, user.uid);
    await auth.signOutDemoAccount();
    assert.equal((await auth.signInDemoAccount('qa001', 'TestPass123!')).uid, user.uid);
  });
  await t.test('duplicate identifiers and duplicate MSSV are atomic errors', async () => {
    await assert.rejects(auth.signUpDemoAccount('qa@demo.invalid', 'TestPass123!', 'Other'), /đã tồn tại/);
    await assert.rejects(auth.signUpDemoAccount('other@demo.invalid', 'TestPass123!', 'Other', 'qa001'), /đã tồn tại/);
    await assert.rejects(auth.signInDemoAccount('other@demo.invalid', 'TestPass123!'), /không chính xác/);
  });
  await t.test('weak password rejected, old imported-data profile UID retained', async () => {
    await assert.rejects(auth.signUpDemoAccount('new', '123', 'New'), /6 ký tự/);
    await auth.initializeDemoAccounts([{ uid: 'demo-researcher-a', email: 'researcher.a@demo.invalid', displayName: 'Nghiên cứu viên A' }]);
    assert.equal((await auth.signInDemoAccount('researcher.a@demo.invalid', 'DemoLab123!')).uid, 'demo-researcher-a');
  });
});
