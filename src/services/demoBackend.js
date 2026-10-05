import { changedFields, deriveExperiment, mergePatch } from '../domain/experiment.js';
import { initializeDemoAccounts, signInDemoAccount, signUpDemoAccount, readDemoSession, signOutDemoAccount } from './demoAuth.js';

// Intentionally no Firebase import, URL, credential, or network operation.
const DATABASE = 'medchem-demo-v2';
const PROFILE_KEY = 'medchem_demo_profile_v2';
export const DEMO_USERS = [
  { uid: 'demo-researcher-a', email: 'researcher.a@demo.invalid', displayName: 'Nghiên cứu viên A', isDemo: true },
  { uid: 'demo-researcher-b', email: 'researcher.b@demo.invalid', displayName: 'Nghiên cứu viên B', isDemo: true }
];
let currentUser = null;
let authGeneration = 0;
let databasePromise;
let simulatedOffline = false; // Test harness only; removed from the user interface.
const listeners = new Set(), authListeners = new Set();
let operationSequence = 0;
let retryPromise;
let retryRequested = false;
const bus = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('medchem-demo-v2') : null;
bus?.unref?.();
export const isFirebaseConfigured = () => false;
export const isAuthAvailable = () => true;
export const isDeletedRecord = (item) => !item?.id || item._deleted === true;

function openDatabase() {
  if (!databasePromise) databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      for (const name of ['records', 'drafts', 'purged']) request.result.createObjectStore(name, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return databasePromise;
}
const requestValue = (request) => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
async function readStore(name) {
  const db = await openDatabase();
  return requestValue(db.transaction(name).objectStore(name).getAll());
}
async function writeDraft(draft) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('drafts', 'readwrite');
    tx.objectStore('drafts').put(draft);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Không lưu được bản nháp.'));
  });
}
function assertNoConflict(base, current, patch, path = '') {
  for (const [key, value] of Object.entries(patch || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value)) assertNoConflict(base?.[key], current?.[key], value, `${path}${key}.`);
    else if (JSON.stringify(base?.[key]) !== JSON.stringify(current?.[key]) && JSON.stringify(value) !== JSON.stringify(current?.[key])) throw new Error(`Xung đột tại ${path}${key}. Bản nháp được giữ lại; tải lại dữ liệu rồi đối chiếu.`);
  }
}
async function commitDraft(draft, user) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['records', 'drafts', 'purged'], 'readwrite');
    const records = tx.objectStore('records');
    let result, failure;
    const abort = (error) => { failure = error; tx.abort(); };
    const pending = tx.objectStore('drafts').get(draft.id);
    pending.onsuccess = () => {
      if (!pending.result) {
        const alreadySaved = records.get(draft.experimentId);
        alreadySaved.onsuccess = () => { result = alreadySaved.result; };
        return;
      }
    const checkPurged = tx.objectStore('purged').get(draft.experimentId);
    checkPurged.onsuccess = () => {
      if (checkPurged.result) return abort(new Error('Bản đã xóa vĩnh viễn; ghi cũ bị từ chối.'));
      const request = records.get(draft.experimentId);
      request.onsuccess = () => {
        try {
          const existing = request.result;
          if (existing && existing.creatorId !== user.uid) throw new Error('Không có quyền sửa thí nghiệm này.');
          if (existing?.inTrash && draft.kind !== 'restore' && draft.kind !== 'trash') throw new Error('Thí nghiệm trong thùng rác; không được ghi từ phiên cũ.');
          if (!existing && draft.base) throw new Error('Thí nghiệm không còn tồn tại.');
          if (existing && !draft.base) throw new Error('ID đã tồn tại.');
          if (existing) assertNoConflict(draft.base, existing, draft.patch);
          result = deriveExperiment({ ...(existing ? mergePatch(existing, draft.patch) : draft.experiment), id: draft.experimentId, creatorId: user.uid, creatorEmail: user.email, revision: (existing?.revision || 0) + 1, updatedAt: new Date().toISOString() });
          result.auditTrail = [...(existing?.auditTrail || []), { id: crypto.randomUUID(), at: result.updatedAt, actorId: user.uid, action: draft.kind || 'edit', fields: Object.keys(draft.patch || {}) }];
          records.put(result);
          tx.objectStore('drafts').delete(draft.id);
        } catch (error) { abort(error); }
      };
    };
    };
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(failure || tx.error);
    tx.onabort = () => reject(failure || tx.error || new Error('Lưu thất bại.'));
  });
}

async function notify() {
  try {
    const records = await readStore('records'), drafts = await readStore('drafts'), purged = await readStore('purged');
    const tombstones = new Set(purged.map((r) => r.id));
    for (const entry of listeners) {
      const userRecords = records.filter((e) => e.creatorId === entry.uid);
      const map = new Map(userRecords.map((e) => [e.id, deriveExperiment(e)]));
      for (const draft of drafts.filter((d) => d.creatorId === entry.uid).sort((a, b) => a.sequence - b.sequence)) {
        if (tombstones.has(draft.experimentId)) continue;
        const existing = map.get(draft.experimentId);
        map.set(draft.experimentId, { ...draft.experiment, ...(existing?.inTrash && draft.kind !== 'restore' ? { inTrash: true, trashedAt: existing.trashedAt } : {}), demoPending: true, demoConflict: draft.conflict || '' });
      }
      entry.callback([...map.values()], drafts.some((d) => d.creatorId === entry.uid) ? 'demo-pending' : 'demo');
    }
  } catch (error) { for (const entry of listeners) entry.onError?.(error); }
}
function changed() { bus?.postMessage('changed'); void notify(); }
export const refreshDemoData = () => notify();
if (bus) bus.onmessage = () => void notify();
export function loadExperimentsData(callback, uid = currentUser?.uid, onError) {
  const entry = { callback, uid, onError };
  listeners.add(entry); void notify();
  return () => listeners.delete(entry);
}
export async function saveExperimentData(experiment, options = {}) {
  const user = options.user || currentUser;
  if (!user || experiment.creatorId !== user.uid) return { success: false, error: new Error('Không có quyền ghi thí nghiệm.') };
  const base = options.base || null;
  const patch = options.patch || (base ? changedFields(base, experiment) : {});
  // Derived values and timestamps never cause field conflicts.
  for (const key of ['revision', 'updatedAt', 'auditTrail']) if (patch) delete patch[key];
  const draft = { id: crypto.randomUUID(), experimentId: experiment.id, sequence: Date.now() * 1000 + (operationSequence++ % 1000), creatorId: user.uid, experiment: deriveExperiment(experiment), base, patch, kind: options.kind || 'edit', user };
  try {
    await writeDraft(draft); // Durable before acknowledgement, even after a tab is closed.
    if (simulatedOffline || (typeof navigator !== 'undefined' && !navigator.onLine)) { changed(); return { success: true, pending: true, mode: 'demo-pending', data: draft.experiment }; }
    const data = await commitDraft(draft, user);
    changed(); return { success: true, mode: 'demo', data };
  } catch (error) {
    draft.conflict = error.message;
    await writeDraft(draft).catch(() => {});
    changed(); return { success: false, error };
  }
}
export function retryDemoDrafts() {
  retryRequested = true;
  if (retryPromise) return retryPromise;
  if (simulatedOffline || !navigator.onLine || !currentUser) return Promise.resolve();
  retryPromise = (async () => {
    do {
      retryRequested = false;
      const user = currentUser;
      if (!user) break;
      for (const draft of (await readStore('drafts')).sort((a, b) => a.sequence - b.sequence)) if (draft.creatorId === user.uid) {
        if (simulatedOffline || !navigator.onLine) break;
        try { await commitDraft(draft, user); }
        catch (error) { await writeDraft({ ...draft, conflict: error.message }); }
      }
    } while (retryRequested && !simulatedOffline && navigator.onLine);
    changed();
  })().finally(() => { retryPromise = null; });
  return retryPromise;
}
export function setDemoOffline(value) { simulatedOffline = value; sessionStorage.setItem('medchem_demo_offline', String(value)); if (!value) void retryDemoDrafts(); }
export async function discardDemoDrafts(experimentId) {
  if (!currentUser) return;
  const db = await openDatabase();
  const drafts = await readStore('drafts');
  await new Promise((resolve, reject) => {
    const tx = db.transaction('drafts', 'readwrite');
    for (const draft of drafts) if (draft.creatorId === currentUser.uid && draft.experimentId === experimentId) tx.objectStore('drafts').delete(draft.id);
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
  });
  changed();
}

export async function getDemoConflict(experimentId) {
  const user = currentUser;
  if (!user) throw new Error('Chọn tài khoản demo trước.');
  const db = await openDatabase();
  // Read both versions in one snapshot, so the dialog has a consistent revision.
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['records', 'drafts', 'purged']);
    let cloud, drafts, purged;
    const a = tx.objectStore('records').get(experimentId);
    a.onsuccess = () => { cloud = a.result; };
    const b = tx.objectStore('drafts').getAll();
    b.onsuccess = () => { drafts = b.result; };
    const c = tx.objectStore('purged').get(experimentId);
    c.onsuccess = () => { purged = c.result; };
    tx.oncomplete = () => {
      if (cloud && cloud.creatorId !== user.uid) return reject(new Error('Không có quyền đọc bản này.'));
      const own = drafts.filter((d) => d.creatorId === user.uid && d.experimentId === experimentId).sort((x, y) => x.sequence - y.sequence);
      const local = own.at(-1);
      if (!local) return reject(new Error('Xung đột đã được giải quyết.'));
      resolve({ experimentId, uid: user.uid, cloud: cloud || null, local: local.experiment, revision: cloud?.revision ?? null, draftIds: own.map((d) => d.id), purged: Boolean(purged) });
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function resolveDemoConflict(snapshot, choice) {
  if (!['cloud', 'local'].includes(choice)) throw new Error('Lựa chọn không hợp lệ.');
  const user = currentUser;
  if (!user || snapshot.uid !== user.uid) throw new Error('Tài khoản đã đổi; mở lại thông báo.');
  const db = await openDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(['records', 'drafts', 'purged'], 'readwrite');
    let cloud, drafts, purged, failure, completed = 0;
    const fail = (message) => { failure = new Error(message); tx.abort(); };
    const finish = () => {
      if (++completed !== 3) return;
      const own = drafts.filter((d) => d.creatorId === user.uid && d.experimentId === snapshot.experimentId).sort((a, b) => a.sequence - b.sequence);
      if (cloud && cloud.creatorId !== user.uid) return fail('Không có quyền sửa bản này.');
      if ((cloud?.revision ?? null) !== snapshot.revision || JSON.stringify(own.map((d) => d.id)) !== JSON.stringify(snapshot.draftIds)) return fail('Dữ liệu đã thay đổi trong lúc chọn. Mở lại thông báo để xem bản mới.');
      if (!own.length) return fail('Xung đột đã được giải quyết.');
      if (choice === 'local') {
        if (!cloud || purged || cloud.inTrash) return fail('Không ghi đè bản đã xóa hoặc trong thùng rác. Chọn lấy bản cloud.');
        const latest = own.at(-1).experiment;
        const result = deriveExperiment({ ...latest, id: cloud.id, creatorId: user.uid, creatorEmail: user.email, inTrash: cloud.inTrash || false, revision: cloud.revision + 1, updatedAt: new Date().toISOString() });
        delete result.demoPending; delete result.demoConflict;
        result.auditTrail = [...(cloud.auditTrail || []), { id: crypto.randomUUID(), at: result.updatedAt, actorId: user.uid, action: 'resolve-local', replacedRevision: cloud.revision }];
        tx.objectStore('records').put(result);
      }
      for (const draft of own) tx.objectStore('drafts').delete(draft.id);
    };
    const a = tx.objectStore('records').get(snapshot.experimentId);
    a.onsuccess = () => { cloud = a.result; finish(); };
    const b = tx.objectStore('drafts').getAll();
    b.onsuccess = () => { drafts = b.result; finish(); };
    const c = tx.objectStore('purged').get(snapshot.experimentId);
    c.onsuccess = () => { purged = c.result; finish(); };
    tx.oncomplete = resolve;
    tx.onerror = () => reject(failure || tx.error);
    tx.onabort = () => reject(failure || tx.error);
  });
  changed();
}

export async function simulateDemoConflict(experimentId) {
  const cloud = (await readStore('records')).find((e) => e.id === experimentId && e.creatorId === currentUser?.uid);
  if (!cloud || cloud.inTrash) throw new Error('Chọn một thí nghiệm đã lưu để thử.');
  const remote = await saveExperimentData({ ...cloud, title: `${cloud.title} · thiết bị B` }, { base: cloud, patch: { title: `${cloud.title} · thiết bị B` } });
  if (!remote.success) throw remote.error;
  const local = await saveExperimentData({ ...cloud, title: `${cloud.title} · thiết bị A` }, { base: cloud, patch: { title: `${cloud.title} · thiết bị A` } });
  if (local.success) throw new Error('Chưa tạo được xung đột.');
}
if (typeof window !== 'undefined') window.addEventListener('online', () => void retryDemoDrafts());

export async function permanentlyDeleteExperimentsBatch(ids = []) {
  const user = currentUser;
  if (!user || simulatedOffline || !navigator.onLine) return { success: false, error: new Error('Xóa vĩnh viễn cần chế độ trực tuyến giả lập.') };
  const db = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['records', 'purged', 'drafts'], 'readwrite');
      let failure;
      for (const id of new Set(ids)) {
        const request = tx.objectStore('records').get(id);
        request.onsuccess = () => {
          if (!request.result || request.result.creatorId !== user.uid || !request.result.inTrash) { failure = new Error('Chỉ xóa bản trong thùng rác của bạn.'); tx.abort(); return; }
          tx.objectStore('records').delete(id);
          const cursorRequest = tx.objectStore('drafts').openCursor();
          cursorRequest.onsuccess = () => { const cursor = cursorRequest.result; if (cursor) { if (cursor.value.experimentId === id) cursor.delete(); cursor.continue(); } };
          tx.objectStore('purged').put({ id, creatorId: user.uid, at: new Date().toISOString() });
        };
      }
      tx.oncomplete = resolve;
      tx.onerror = () => reject(failure || tx.error);
      tx.onabort = () => reject(failure || tx.error);
    });
    changed(); return { success: true, count: ids.length };
  } catch (error) { return { success: false, error }; }
}
export const deleteExperimentData = (id) => permanentlyDeleteExperimentsBatch([id]);

export async function importDemoExperiments(items, user = currentUser) {
  if (!user || user.uid !== currentUser?.uid) return { success: false, error: new Error('Tài khoản đã đổi; chọn lại tệp nhập.') };
  const db = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction('records', 'readwrite');
      for (const item of items) tx.objectStore('records').add(deriveExperiment({ ...item, creatorId: user.uid, revision: 1 }));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    changed(); return { success: true, count: items.length };
  } catch (error) { return { success: false, error }; }
}

export async function uploadImage(file) {
  if (!file) return null;
  if (typeof file === 'string') { if (!file.startsWith('data:image/')) throw new Error('Demo chỉ dùng ảnh cục bộ.'); return file; }
  if (!file.type.startsWith('image/') || file.size > 15 * 1024 * 1024) throw new Error('Chọn ảnh ≤15 MB.');
  // Embedded local assets are reference-safe when duplicated; no remote storage or orphan objects.
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Không đọc được ảnh.'));
    reader.readAsDataURL(file);
  });
}
export const subscribeFirebaseAuthState = (callback) => {
  authListeners.add(callback);
  const generation = authGeneration;
  void initializeDemoAccounts(DEMO_USERS).then(readDemoSession).then((user) => {
    if (!authListeners.has(callback) || generation !== authGeneration) return;
    currentUser = user; callback(currentUser);
  }).catch(() => { if (authListeners.has(callback) && generation === authGeneration) callback(null); });
  return () => authListeners.delete(callback);
};
export function selectDemoUser(uid) {
  authGeneration++;
  currentUser = DEMO_USERS.find((u) => u.uid === uid) || null;
  if (currentUser) localStorage.setItem(PROFILE_KEY, currentUser.uid); else localStorage.removeItem(PROFILE_KEY);
  authListeners.forEach((callback) => callback(currentUser));
  if (currentUser) void retryDemoDrafts();
  return currentUser;
}
function setAuthenticatedUser(user) {
  authGeneration++; currentUser = user;
  authListeners.forEach((callback) => callback(user));
  if (user) void retryDemoDrafts();
  return user;
}
export const firebaseSignIn = async (email, password) => {
  await initializeDemoAccounts(DEMO_USERS);
  return setAuthenticatedUser(await signInDemoAccount(email, password));
};
export const firebaseSignUp = async (email, password, displayName, studentId) => {
  await initializeDemoAccounts(DEMO_USERS);
  return setAuthenticatedUser(await signUpDemoAccount(email, password, displayName, studentId));
};
export const firebaseSignOut = async () => {
  await signOutDemoAccount(); localStorage.removeItem(PROFILE_KEY);
  return setAuthenticatedUser(null);
};
export const hashPassword = async () => { throw new Error('Không sử dụng mật khẩu trong demo.'); };
export const saveLabAccount = async () => { throw new Error('Demo không lưu tài khoản thật.'); };
export const findLabAccount = async () => null;
