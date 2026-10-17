import { createCloudSync, normalizeCloudRecord } from './cloudSync.js';
import { cloudDrafts } from './cloudDrafts.js';
import { createSessionIdentity } from './sessionIdentity.js';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, runTransaction } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';

// Check if valid Firebase credentials are provided in environment
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'tonghophoad.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://tonghophoad-default-rtdb.asia-southeast1.firebasedatabase.app/',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'tonghophoad',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Check if Firebase Realtime Database is configured
export const isFirebaseConfigured = () => {
  return Boolean(
    (firebaseConfig.databaseURL && firebaseConfig.databaseURL.trim() !== '') ||
    (firebaseConfig.apiKey && firebaseConfig.apiKey.trim() !== '')
  );
};

let app = null;
let database = null;
let storage = null;
let auth = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    if (firebaseConfig.databaseURL || firebaseConfig.projectId) {
      database = getDatabase(app);
    }
    if (firebaseConfig.storageBucket && firebaseConfig.apiKey) {
      try {
        storage = getStorage(app);
      } catch (err) {
        storage = null;
      }
    }
    if (firebaseConfig.apiKey) {
      try {
        auth = getAuth(app);
      } catch (err) {
        auth = null;
      }
    }
    console.log('🧪 [MedChem ELN] Connected to Firebase Realtime Database:', firebaseConfig.databaseURL);
  } catch (error) {
    console.warn('⚠️ [MedChem ELN] Firebase init fallback to LocalStorage mode:', error);
    database = null;
    storage = null;
    auth = null;
  }
} else {
  console.info('ℹ️ [MedChem ELN] Running in LocalStorage Dual-Mode.');
}

const PERMANENT_PURGED_IDS = new Set([
  'EXP-2025-COU-01',
  'EXP-202609-3251',
  'EXP-202609-9989'
]);

export const isDeletedRecord = (item) => {
  if (!item || !item.id) return true;
  if (item._deleted === true || item.creatorId === '__DELETED__') return true;
  if (PERMANENT_PURGED_IDS.has(item.id)) return true;
  return false;
};

/**
 * Upload an image file:
 * - If Firebase Storage is available -> uploads to storage and returns downloadURL.
 * - Fallback -> converts file to optimized compressed Base64 data URL for fast cloud storage.
 */
export const uploadImage = async (file, pathFolder = 'tlc_images') => {
  if (!file) return null;
  if (typeof file === 'string') return file;

  // Try Firebase Storage first if configured
  if (storage) {
    try {
      const fileName = `${Date.now()}_${(file.name || 'tlc.jpg').replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const fileRef = storageRef(storage, `${pathFolder}/${fileName}`);
      const snapshot = await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    } catch (err) {
      console.warn('Storage upload error, falling back to Base64:', err);
    }
  }

  // Fallback: Compress and convert to Base64 Data URL
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target.result;
      const img = new Image();
      img.onload = () => {
        try {
          // Resize image to max 960px dimension to keep Firebase RTDB fast and reliable
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 960;
          const MAX_HEIGHT = 960;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Quality 0.78 JPEG for sharp lab TLC spots & compact payload (~65KB per photo)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.78);
          resolve(compressedBase64);
        } catch (canvasErr) {
          resolve(rawDataUrl);
        }
      };
      img.onerror = () => resolve(rawDataUrl);
      img.src = rawDataUrl;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

/**
 * Clean undefined values recursively so Firebase RTDB set() never throws
 */
const sanitizeForFirebase = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Authentication Helpers
 */
export const isAuthAvailable = () => Boolean(auth && firebaseConfig.apiKey);

export const firebaseSignUp = async (email, password, displayName) => {
  if (!auth) throw new Error('Firebase Auth chưa được khởi tạo (thiếu API Key)');
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName && cred.user) {
    await updateProfile(cred.user, { displayName });
  }
  return cred.user;
};

export const firebaseSignIn = async (email, password) => {
  if (!auth) throw new Error('Firebase Auth chưa được khởi tạo (thiếu API Key)');
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
};

export const firebaseSignOut = async () => {
  if (!auth) return;
  await signOut(auth);
};

export const subscribeFirebaseAuthState = (onUserChanged) => {
  if (!auth) {
    onUserChanged(null);
    return () => {};
  }
  return onAuthStateChanged(auth, onUserChanged);
};

/**
 * SHA-256 Salted Password Hasher for Lab Accounts
 */
export const hashPassword = async (password) => {
  const salted = `${String(password || '')}_medchem_lab_salt_2025`;
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(salted);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      // Fallback below
    }
  }
  // Fast deterministic hash fallback if subtle is unavailable
  let hash1 = 5381;
  let hash2 = 52711;
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    hash1 = (hash1 * 33) ^ char;
    hash2 = (hash2 * 33) ^ char;
  }
  return (hash1 >>> 0).toString(16) + (hash2 >>> 0).toString(16);
};

/**
 * Save / Update a Lab Student Account in Firebase Realtime Database and LocalStorage
 */
export const saveLabAccount = async (account) => {
  if (!account || !account.uid) return;

  // 1. Save to LocalStorage
  try {
    const existing = JSON.parse(localStorage.getItem('medchem_lab_students') || '[]');
    const filtered = existing.filter((s) => s.uid !== account.uid && s.email?.toLowerCase() !== account.email?.toLowerCase());
    filtered.push(account);
    localStorage.setItem('medchem_lab_students', JSON.stringify(filtered));
  } catch (e) {
    console.error('LocalStorage account save error:', e);
  }

  // 2. Save to Firebase Realtime Database
  if (database) {
    try {
      const safeKey = account.uid.replace(/[^a-zA-Z0-9_-]/g, '_');
      await set(ref(database, `lab_accounts/${safeKey}`), {
        ...account,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Firebase account save error:', err);
    }
  }
};

/**
 * Find Lab Student Account by Email, Student ID (MSSV), or Display Name
 */
export const findLabAccount = async (identifier) => {
  const cleanId = String(identifier || '').trim().toLowerCase();
  if (!cleanId) return null;

  // 1. Check LocalStorage first
  let localStudents = [];
  try {
    localStudents = JSON.parse(localStorage.getItem('medchem_lab_students') || '[]');
  } catch (e) {
    localStudents = [];
  }

  let found = localStudents.find((s) =>
    (s.email && s.email.toLowerCase() === cleanId) ||
    (s.studentId && s.studentId.trim().toLowerCase() === cleanId) ||
    (s.displayName && s.displayName.trim().toLowerCase() === cleanId)
  );

  if (found) return found;

  // 2. Query Firebase Realtime Database
  if (database) {
    try {
      const snapshot = await get(ref(database, 'lab_accounts'));
      if (snapshot.exists()) {
        const val = snapshot.val();
        const accounts = Object.values(val || {});
        // Cache to local storage
        localStorage.setItem('medchem_lab_students', JSON.stringify(accounts));
        found = accounts.find((s) =>
          (s.email && s.email.toLowerCase() === cleanId) ||
          (s.studentId && s.studentId.trim().toLowerCase() === cleanId) ||
          (s.displayName && s.displayName.trim().toLowerCase() === cleanId)
        );
        return found || null;
      }
    } catch (err) {
      console.warn('Firebase account lookup error:', err);
    }
  }

  return null;
};


export const isDemoBackend = false;
const requireDatabase = () => { if (!database) throw new Error('Firebase chưa được cấu hình.'); return database; };
const driver = {
  async read(id) { return (await get(ref(requireDatabase(), 'experiments/' + id))).val(); },
  async readAll() { return Object.values((await get(ref(requireDatabase(), 'experiments'))).val() || {}); },
  subscribe(callback, onError) {
    if (!database) { onError?.(new Error('Firebase chưa được cấu hình.')); return () => {}; }
    return onValue(ref(database, 'experiments'), (snapshot) => callback(Object.values(snapshot.val() || {})), onError);
  },
  async transaction(id, updater) {
    const location = ref(requireDatabase(), 'experiments/' + id);
    const initial = (await get(location)).val();
    let first = true;
    let failure;
    const result = await runTransaction(location, (current) => {
      // Firebase may initially invoke the callback with an empty local cache.
      const input = first && current == null && initial != null ? initial : current;
      first = false;
      try { return updater(input); } catch (error) { failure = error; return undefined; }
    }, { applyLocally: false });
    if (!result.committed) throw failure || new Error('Dữ liệu đã đổi; vui lòng thử lại.');
    return result.snapshot.val();
  }
};
const identity = createSessionIdentity({ authConfigured: isAuthAvailable, authUser: () => auth?.currentUser });
export const setBackendSessionUser = (user) => identity.setLabUser(user);
const cloudSync = createCloudSync({ driver, drafts: cloudDrafts, getUser: () => identity.current() });
export const saveExperimentData = (experiment, options) => cloudSync.save(experiment, options);
export const loadExperimentsData = (callback, uid, onError) => cloudSync.subscribe(callback, uid, onError);
export const deleteExperimentData = (id) => cloudSync.purge([id]);
export const permanentlyDeleteExperimentsBatch = (ids = []) => cloudSync.purge([...new Set(ids)]);
export const refreshDemoData = () => cloudSync.notify();
export const retryDemoDrafts = () => cloudSync.retry();
export const getDemoConflict = (id) => cloudSync.conflict(id);
export const resolveDemoConflict = (snapshot, choice) => cloudSync.resolve(snapshot, choice);
export async function importDemoExperiments(items, user) {
  try {
    if (identity.current()?.uid !== user.uid || items.some((item) => item.creatorId !== user.uid)) throw new Error('Tài khoản đã đổi hoặc không có quyền nhập.');
    const location = ref(requireDatabase(), 'experiments');
    await get(location); let failure;
    const result = await runTransaction(location, (current) => {
      if (identity.current()?.uid !== user.uid) { failure = new Error('Tài khoản đã đổi.'); return undefined; }
      const next = { ...(current || {}) };
      for (const item of items) {
        if (next[item.id]) { failure = new Error('ID đã tồn tại; không ghi đè dữ liệu cũ.'); return undefined; }
        next[item.id] = sanitizeForFirebase({ ...normalizeCloudRecord(item, user), revision: 1 });
      }
      return next;
    }, { applyLocally: false });
    if (!result.committed) throw failure || new Error('Chưa nhập được JSON.');
    return { success: true, count: items.length, mode: 'firebase' };
  } catch (error) { return { success: false, error }; }
}
if (typeof window !== 'undefined') window.addEventListener('online', () => void cloudSync.retry());

export async function prepareTlcDownloadImages(images) {
  const localImages = {};
  for (const [key, url] of Object.entries(images || {})) {
    if (!url || url.startsWith('data:image/')) { localImages[key] = url; continue; }
    if (!/^https:\/\/(firebasestorage\.googleapis\.com|storage\.googleapis\.com)\//.test(url)) throw new Error('Chỉ tải ảnh từ Firebase Storage.');
    const response = await fetch(url, { credentials: 'omit' });
    if (!response.ok) throw new Error('Không tải được ảnh từ Storage.');
    const blob = await response.blob();
    if (!blob.type.startsWith('image/') || blob.size > 30 * 1024 * 1024) throw new Error('Ảnh không hợp lệ hoặc lớn hơn 30 MB.');
    localImages[key] = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); });
  }
  return localImages;
}
