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

// Clean up any legacy local storage / IndexedDB experiment caches so stale browser tabs can never conflict with Cloud data
const purgeLegacyLocalExperimentCache = () => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('medchem_experiments');
    localStorage.removeItem('medchem_deleted_ids');
  } catch (e) {
    // Ignore
  }
  try {
    if (window.indexedDB) {
      window.indexedDB.deleteDatabase('medchem_eln_db');
    }
  } catch (e) {
    // Ignore
  }
};

purgeLegacyLocalExperimentCache();

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
 * Save an experiment directly to Firebase Realtime Database on user action
 */
export const saveExperimentData = async (experiment) => {
  if (!experiment || !experiment.id) return { success: false };

  const cleanExp = sanitizeForFirebase({
    ...experiment,
    updatedAt: experiment.updatedAt || new Date().toISOString(),
  });

  if (database) {
    try {
      const experimentRef = ref(database, `experiments/${cleanExp.id}`);
      await set(experimentRef, cleanExp);
      return { success: true, mode: 'firebase', data: cleanExp };
    } catch (err) {
      console.error('Firebase save error:', err);
      return { success: false, mode: 'firebase', error: err, data: cleanExp };
    }
  }

  return { success: false, mode: 'offline', data: cleanExp };
};

/**
 * Permanently delete an experiment from Firebase Realtime Database
 */
export const deleteExperimentData = async (id) => {
  if (!id) return { success: false };

  if (database) {
    try {
      const experimentRef = ref(database, `experiments/${id}`);
      await remove(experimentRef);
      return { success: true };
    } catch (err) {
      console.error('Firebase permanent delete error:', err);
      return { success: false, error: err };
    }
  }

  return { success: false };
};

/**
 * Permanently delete multiple experiments (Empty Trash) from Firebase Realtime Database
 */
export const permanentlyDeleteExperimentsBatch = async (ids = []) => {
  const allIdsToRemove = Array.from(new Set([...(ids || []), ...PERMANENT_PURGED_IDS])).filter(Boolean);
  if (allIdsToRemove.length === 0) return { success: true, count: 0 };

  if (database) {
    try {
      await Promise.all(
        allIdsToRemove.map((id) => remove(ref(database, `experiments/${id}`)))
      );
      return { success: true, count: ids.length };
    } catch (err) {
      console.error('Firebase batch permanent delete error:', err);
      return { success: false, error: err };
    }
  }

  return { success: false };
};

/**
 * Normalize an experiment loaded from Firebase RTDB (which strips empty arrays [] and null keys)
 */
const normalizeExperimentArrays = (exp) => {
  if (!exp) return exp;
  return {
    ...exp,
    inTrash: Boolean(exp.inTrash),
    trashedAt: exp.trashedAt || null,
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
 * Subscribe directly to Firebase Realtime Database (no local offline cache merging)
 */
export const loadExperimentsData = (onDataUpdate) => {
  purgeLegacyLocalExperimentCache();

  if (database) {
    try {
      const expRef = ref(database, 'experiments');
      const unsubscribe = onValue(
        expRef,
        (snapshot) => {
          const val = snapshot.val();
          const remoteList = val ? Object.values(val) : [];
          const validExperiments = [];

          for (const rItem of remoteList) {
            if (!rItem || !rItem.id) continue;
            if (isDeletedRecord(rItem)) continue;
            validExperiments.push(normalizeExperimentArrays(rItem));
          }

          const finalSorted = validExperiments.sort(
            (a, b) => new Date(b.updatedAt || b.date || 0) - new Date(a.updatedAt || a.date || 0)
          );

          onDataUpdate(finalSorted, 'firebase');
        },
        (error) => {
          console.warn('Firebase onValue error:', error);
          onDataUpdate([], 'firebase');
        }
      );
      return unsubscribe;
    } catch (err) {
      console.warn('Firebase listen error:', err);
    }
  }

  onDataUpdate([], 'firebase');
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
