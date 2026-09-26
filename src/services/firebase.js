import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, set, get, remove, onValue } from 'firebase/database';
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

// Simple IndexedDB helper for unlimited local storage (especially for multiple TLC photos on iPhone/iPad)
const IDB_NAME = 'medchem_eln_db';
const IDB_STORE = 'experiments';

const openExperimentsIDB = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    const req = window.indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
};

const saveToIDB = async (experiment) => {
  try {
    const db = await openExperimentsIDB();
    if (!db) return;
    await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(experiment);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (e) {
    // Ignore IDB errors
  }
};

const deleteFromIDB = async (id) => {
  try {
    const db = await openExperimentsIDB();
    if (!db) return;
    await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (e) {
    // Ignore
  }
};

const loadAllFromIDB = async () => {
  try {
    const db = await openExperimentsIDB();
    if (!db) return [];
    return await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
};

const PERMANENT_DELETED_IDS = [
  'EXP-2025-COU-01',
  'EXP-202609-3251',
  'EXP-202609-9989'
];

export const getDeletedIds = () => {
  try {
    const stored = JSON.parse(localStorage.getItem('medchem_deleted_ids') || '[]');
    return Array.from(new Set([...PERMANENT_DELETED_IDS, ...(Array.isArray(stored) ? stored : [])]));
  } catch (e) {
    return [...PERMANENT_DELETED_IDS];
  }
};

export const markDeletedId = (id) => {
  if (!id) return;
  try {
    const list = getDeletedIds();
    if (!list.includes(id)) {
      list.push(id);
    }
    localStorage.setItem('medchem_deleted_ids', JSON.stringify(list));
  } catch (e) {
    // Ignore
  }
};

export const isDeletedRecord = (item, deletedSet = null) => {
  if (!item || !item.id) return true;
  if (item._deleted === true || item.creatorId === '__DELETED__') return true;
  if (PERMANENT_DELETED_IDS.includes(item.id)) return true;
  if (deletedSet && deletedSet.has(item.id)) return true;
  return false;
};

/**
 * Strip heavy Base64 data URLs only for the localStorage fallback mirror when 5MB quota is exceeded.
 * Full Base64 images remain safely stored in IndexedDB and Firebase Realtime Database.
 */
const stripHeavyImagesForLocalStorage = (exp) => {
  if (!exp) return exp;
  const stripImg = (val) => (typeof val === 'string' && val.startsWith('data:image/') ? null : val);
  return {
    ...exp,
    tlcTimeline: Array.isArray(exp.tlcTimeline)
      ? exp.tlcTimeline.map((p) => ({
          ...p,
          images: p.images
            ? {
                uv254: stripImg(p.images.uv254),
                uv365: stripImg(p.images.uv365),
                reagent: stripImg(p.images.reagent)
              }
            : { uv254: null, uv365: null, reagent: null }
        }))
      : [],
    columnAndYield: exp.columnAndYield
      ? {
          ...exp.columnAndYield,
          fractionTlcPlates: Array.isArray(exp.columnAndYield.fractionTlcPlates)
            ? exp.columnAndYield.fractionTlcPlates.map((p) => ({
                ...p,
                images: p.images
                  ? {
                      uv254: stripImg(p.images.uv254),
                      uv365: stripImg(p.images.uv365),
                      reagent: stripImg(p.images.reagent)
                    }
                  : { uv254: null, uv365: null, reagent: null }
              }))
            : []
        }
      : exp.columnAndYield
  };
};

const safeMirrorToLocalStorage = (experimentsList) => {
  const deletedSet = new Set(getDeletedIds());
  const cleanList = (experimentsList || []).filter((item) => !isDeletedRecord(item, deletedSet));
  try {
    localStorage.setItem('medchem_experiments', JSON.stringify(cleanList));
  } catch (quotaErr) {
    try {
      const lightweightList = cleanList.map(stripHeavyImagesForLocalStorage);
      localStorage.setItem('medchem_experiments', JSON.stringify(lightweightList));
    } catch (e) {
      console.warn('LocalStorage mirror skipped due to quota (data safely in IndexedDB & Firebase):', e);
    }
  }
};

/**
 * Upload an image file:
 * - If Firebase Storage is available -> uploads to storage and returns downloadURL.
 * - Fallback -> converts file to optimized compressed Base64 data URL for fast cloud & offline storage.
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
          // Resize image to max 960px dimension to keep Firebase RTDB & LocalStorage fast and reliable
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
 * Read local experiments from LocalStorage + IndexedDB and merge by newest updatedAt
 */
const readMergedLocalExperiments = async () => {
  let lsList = [];
  try {
    lsList = JSON.parse(localStorage.getItem('medchem_experiments') || '[]');
  } catch (e) {
    lsList = [];
  }
  const idbList = await loadAllFromIDB();
  const deletedIds = new Set(getDeletedIds());
  const map = new Map();
  let foundDeletedInLocal = false;

  // First check if any local record is a tombstone or in deletedIds
  for (const item of [...lsList, ...idbList]) {
    if (!item || !item.id) continue;
    if (isDeletedRecord(item, deletedIds)) {
      deletedIds.add(item.id);
      markDeletedId(item.id);
      await deleteFromIDB(item.id);
      foundDeletedInLocal = true;
    }
  }

  for (const item of [...idbList, ...lsList]) {
    if (isDeletedRecord(item, deletedIds)) continue;
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
    } else {
      const tNew = new Date(item.updatedAt || item.createdAt || 0).getTime();
      const tOld = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      if (tNew > tOld) {
        map.set(item.id, item);
      }
    }
  }

  const sorted = Array.from(map.values()).sort(
    (a, b) => new Date(b.updatedAt || b.date || 0) - new Date(a.updatedAt || a.date || 0)
  );

  if (foundDeletedInLocal) {
    safeMirrorToLocalStorage(sorted);
  }

  return sorted;
};

/**
 * Save an experiment to Database (LocalStorage + IndexedDB + Firebase Realtime Database)
 */
export const saveExperimentData = async (experiment) => {
  if (!experiment || !experiment.id) return { success: false };

  const cleanExp = sanitizeForFirebase({
    ...experiment,
    _deleted: false,
    syncedToCloud: Boolean(database || experiment.syncedToCloud),
    updatedAt: experiment.updatedAt || new Date().toISOString(),
  });

  // 1. Always mirror in IndexedDB first (no 5MB quota limit for photos)
  await saveToIDB(cleanExp);

  // 2. Mirror synchronously in localStorage with quota fallback
  try {
    const existing = JSON.parse(localStorage.getItem('medchem_experiments') || '[]');
    const deletedSet = new Set(getDeletedIds());
    const validExisting = existing.filter((e) => !isDeletedRecord(e, deletedSet) && e.id !== cleanExp.id);
    validExisting.unshift(cleanExp);
    safeMirrorToLocalStorage(validExisting);
  } catch (err) {
    console.warn('LocalStorage mirror warning:', err);
  }

  // 3. Firebase Realtime Database
  if (database) {
    try {
      const experimentRef = ref(database, `experiments/${cleanExp.id}`);
      await set(experimentRef, cleanExp);
      return { success: true, mode: 'firebase', data: cleanExp };
    } catch (err) {
      console.error('Firebase save error:', err);
      return { success: true, mode: 'local', data: cleanExp };
    }
  }

  return { success: true, mode: 'local', data: cleanExp };
};

/**
 * Delete experiment from Firebase, LocalStorage, and IndexedDB using Cloud Tombstones
 * so no other open tab or offline device can ever resurrect a deleted project.
 */
export const deleteExperimentData = async (id) => {
  if (!id) return { success: false };
  markDeletedId(id);

  try {
    const existing = JSON.parse(localStorage.getItem('medchem_experiments') || '[]');
    const filtered = existing.filter((e) => e && e.id !== id);
    safeMirrorToLocalStorage(filtered);
  } catch (err) {
    // Ignore
  }

  await deleteFromIDB(id);

  if (database) {
    try {
      const nowIso = new Date().toISOString();
      const tombstone = {
        id,
        _deleted: true,
        deletedAt: nowIso,
        updatedAt: nowIso,
        creatorId: '__DELETED__',
        creatorEmail: '__DELETED__',
        researcher: '__DELETED__'
      };
      const experimentRef = ref(database, `experiments/${id}`);
      await set(experimentRef, tombstone);
    } catch (err) {
      console.error('Firebase delete tombstone error:', err);
    }
  }

  return { success: true };
};

/**
 * Normalize an experiment loaded from Firebase RTDB (which strips empty arrays [] and null keys)
 */
const normalizeExperimentArrays = (exp) => {
  if (!exp) return exp;
  return {
    ...exp,
    equipment: Array.isArray(exp.equipment) ? exp.equipment : [],
    stoichiometry: Array.isArray(exp.stoichiometry) ? exp.stoichiometry : [],
    tlcTimeline: Array.isArray(exp.tlcTimeline)
      ? exp.tlcTimeline.map((p) => ({
          ...p,
          images: {
            uv254: p.images?.uv254 || null,
            uv365: p.images?.uv365 || null,
            reagent: p.images?.reagent || null
          },
          spots: Array.isArray(p.spots) ? p.spots : []
        }))
      : [],
    workup: {
      ...(exp.workup || {}),
      crudeTubes: Array.isArray(exp.workup?.crudeTubes) ? exp.workup.crudeTubes : []
    },
    columnAndYield: {
      ...(exp.columnAndYield || {}),
      fractions: Array.isArray(exp.columnAndYield?.fractions) ? exp.columnAndYield.fractions : [],
      fractionGroups: Array.isArray(exp.columnAndYield?.fractionGroups) ? exp.columnAndYield.fractionGroups : [],
      fractionTlcPlates: Array.isArray(exp.columnAndYield?.fractionTlcPlates)
        ? exp.columnAndYield.fractionTlcPlates.map((p) => ({
            ...p,
            images: {
              uv254: p.images?.uv254 || null,
              uv365: p.images?.uv365 || null,
              reagent: p.images?.reagent || null
            }
          }))
        : [],
      eppendorfYield: {
        ...(exp.columnAndYield?.eppendorfYield || {}),
        tubes: Array.isArray(exp.columnAndYield?.eppendorfYield?.tubes)
          ? exp.columnAndYield.eppendorfYield.tubes
          : []
      }
    }
  };
};

/**
 * Subscribe or load experiments, merging Firebase RTDB with LocalStorage + IndexedDB by newest updatedAt
 */
export const loadExperimentsData = (onDataUpdate) => {
  // Immediately load local data first so UI is fast & never blank
  readMergedLocalExperiments().then((initialLocal) => {
    if (initialLocal.length > 0) {
      onDataUpdate(initialLocal.map(normalizeExperimentArrays), database ? 'firebase' : 'local');
    }
  });

  if (database) {
    try {
      const expRef = ref(database, 'experiments');
      const unsubscribe = onValue(
        expRef,
        async (snapshot) => {
          const val = snapshot.val();
          const remoteList = val ? Object.values(val) : [];
          const deletedIds = new Set(getDeletedIds());

          const mergedMap = new Map();

          // 1. Inspect remote items first: record any Cloud Tombstones and purge them locally
          for (const rItem of remoteList) {
            if (!rItem || !rItem.id) continue;
            if (isDeletedRecord(rItem, deletedIds)) {
              deletedIds.add(rItem.id);
              markDeletedId(rItem.id);
              await deleteFromIDB(rItem.id);
              continue;
            }
            const normalizedRemote = {
              ...normalizeExperimentArrays(rItem),
              syncedToCloud: true
            };
            mergedMap.set(rItem.id, normalizedRemote);
          }

          // 2. Read local items AFTER tombstones have been applied
          const localList = await readMergedLocalExperiments();

          // 3. Merge local items without resurrecting deleted cloud experiments
          for (const lItem of localList) {
            if (isDeletedRecord(lItem, deletedIds)) {
              await deleteFromIDB(lItem?.id);
              continue;
            }
            const normLocal = normalizeExperimentArrays(lItem);
            const existingRemote = mergedMap.get(lItem.id);

            if (!existingRemote) {
              // If this local record was previously synced to cloud, its absence on remote means it was deleted on cloud!
              if (lItem.syncedToCloud === true) {
                deletedIds.add(lItem.id);
                markDeletedId(lItem.id);
                await deleteFromIDB(lItem.id);
                continue;
              }
              // Otherwise it is a genuinely new offline experiment that hasn't been uploaded yet
              const syncedLocal = { ...normLocal, syncedToCloud: true };
              mergedMap.set(lItem.id, syncedLocal);
              const cleanExp = sanitizeForFirebase(syncedLocal);
              await saveToIDB(cleanExp);
              set(ref(database, `experiments/${cleanExp.id}`), cleanExp).catch(() => {});
            } else {
              const tLocal = new Date(normLocal.updatedAt || normLocal.createdAt || 0).getTime();
              const tRemote = new Date(existingRemote.updatedAt || existingRemote.createdAt || 0).getTime();
              if (tLocal > tRemote) {
                const syncedLocal = { ...normLocal, syncedToCloud: true };
                mergedMap.set(lItem.id, syncedLocal);
                const cleanExp = sanitizeForFirebase(syncedLocal);
                await saveToIDB(cleanExp);
                set(ref(database, `experiments/${cleanExp.id}`), cleanExp).catch(() => {});
              } else {
                // Remote is newer or equal -> update local IndexedDB cache
                await saveToIDB(existingRemote);
              }
            }
          }

          const finalSorted = Array.from(mergedMap.values()).sort(
            (a, b) => new Date(b.updatedAt || b.date || 0) - new Date(a.updatedAt || a.date || 0)
          );

          safeMirrorToLocalStorage(finalSorted);
          onDataUpdate(finalSorted, 'firebase');
        },
        async (error) => {
          console.warn('Firebase onValue error, falling back to LocalStorage/IndexedDB:', error);
          const localList = await readMergedLocalExperiments();
          onDataUpdate(localList.map(normalizeExperimentArrays), 'local');
        }
      );
      return unsubscribe;
    } catch (err) {
      console.warn('Firebase listen error:', err);
    }
  }

  // LocalStorage + IndexedDB fallback
  readMergedLocalExperiments().then((localList) => {
    onDataUpdate(localList.map(normalizeExperimentArrays), 'local');
  });
  return () => {};
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
