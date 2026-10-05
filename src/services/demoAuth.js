// Local test accounts only. No Firebase SDK, credentials, or network operations.
const DB = 'medchem-demo-auth-v1';
const SESSION = 'medchem_demo_auth_session_v1';
let opening, initializing;
const normalize = (s) => String(s || '').trim().toLowerCase();
const encode = (bytes) => Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
const decode = (hex) => Uint8Array.from(hex.match(/../g) || [], (b) => parseInt(b, 16));
const profile = ({ uid, email, displayName, studentId }) => ({ uid, email, displayName, studentId: studentId || '', isLocal: true, isDemo: true });
function open() {
  return opening ||= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('accounts', { keyPath: 'uid' });
      request.result.createObjectStore('identifiers', { keyPath: 'id' });
      request.result.createObjectStore('sessions', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
const read = (store, key) => open().then((db) => new Promise((resolve, reject) => {
  const request = db.transaction(store).objectStore(store).get(key);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
}));
async function digest(password, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return encode(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: decode(salt), iterations: 600000 }, key, 256));
}
async function addAccount({ uid = crypto.randomUUID(), email, password, displayName, studentId = '' }) {
  const identifier = normalize(email), student = normalize(studentId);
  if (!identifier || !String(displayName || '').trim()) throw new Error('Nhập tài khoản và họ tên.');
  if (typeof password !== 'string' || password.length < 6) throw new Error('Mật khẩu tối thiểu 6 ký tự.');
  const salt = encode(crypto.getRandomValues(new Uint8Array(16)));
  const account = { uid, email: identifier, displayName: displayName.trim(), studentId: String(studentId).trim(), salt, passwordHash: await digest(password, salt) };
  const db = await open();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(['accounts', 'identifiers'], 'readwrite');
    tx.objectStore('accounts').add(account);
    for (const id of new Set([identifier, ...(student ? [student] : [])])) tx.objectStore('identifiers').add({ id, uid });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(new Error('Tên tài khoản hoặc MSSV đã tồn tại.'));
    tx.onabort = () => reject(new Error('Tên tài khoản hoặc MSSV đã tồn tại.'));
  });
  return profile(account);
}
export function initializeDemoAccounts(users) {
  return initializing ||= (async () => {
    for (const user of users) if (!await read('accounts', user.uid)) {
      try { await addAccount({ ...user, password: 'DemoLab123!' }); }
      catch (error) { if (!await read('accounts', user.uid)) throw error; }
    }
  })().catch((error) => { initializing = null; throw error; });
}
async function createSession(user) {
  const previous = localStorage.getItem(SESSION);
  const session = { id: crypto.randomUUID(), uid: user.uid, expiresAt: Date.now() + 7 * 86400000 };
  const db = await open();
  await new Promise((resolve, reject) => {
    const tx = db.transaction('sessions', 'readwrite');
    if (previous) tx.objectStore('sessions').delete(previous);
    tx.objectStore('sessions').add(session);
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
  });
  localStorage.setItem(SESSION, session.id);
  return user;
}
export async function signUpDemoAccount(email, password, displayName, studentId) {
  return createSession(await addAccount({ email, password, displayName, studentId }));
}
export async function signInDemoAccount(identifier, password) {
  const match = await read('identifiers', normalize(identifier));
  const account = match && await read('accounts', match.uid);
  if (!account || typeof password !== 'string' || await digest(password, account.salt) !== account.passwordHash) throw new Error('Tài khoản/MSSV hoặc mật khẩu không chính xác.');
  return createSession(profile(account));
}
export async function readDemoSession() {
  const token = localStorage.getItem(SESSION);
  if (!token) return null;
  const session = await read('sessions', token);
  if (!session || session.expiresAt <= Date.now()) { localStorage.removeItem(SESSION); return null; }
  const account = await read('accounts', session.uid);
  return account ? profile(account) : null;
}
export async function signOutDemoAccount() {
  const token = localStorage.getItem(SESSION);
  localStorage.removeItem(SESSION);
  if (!token) return;
  const db = await open();
  await new Promise((resolve, reject) => {
    const tx = db.transaction('sessions', 'readwrite'); tx.objectStore('sessions').delete(token);
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
  });
}
