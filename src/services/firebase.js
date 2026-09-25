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

/**
 * Upload an image file:
 * - If Firebase Storage is available -> uploads to storage and returns downloadURL.
 * - Fallback -> converts file to optimized compressed Base64 data URL for offline storage.
 */
export const uploadImage = async (file, pathFolder = 'tlc_images') => {
  if (!file) return null;

  // Try Firebase Storage first if configured
  if (storage) {
    try {
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
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
      const img = new Image();
      img.onload = () => {
        // Resize image to max 1280px dimension to keep storage light & fast
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Quality 0.82 JPEG for optimal balance of sharp lab TLC spots & small size
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
        resolve(compressedBase64);
      };
      img.onerror = () => resolve(e.target.result); // Fallback to raw base64
      img.src = e.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

/**
 * Save an experiment to Database (Firebase and LocalStorage mirror)
 */
export const saveExperimentData = async (experiment) => {
  // Always mirror in localStorage for immediate resilience
  try {
    const existing = JSON.parse(localStorage.getItem('medchem_experiments') || '[]');
    const index = existing.findIndex((e) => e.id === experiment.id);
    const updatedExp = {
      ...experiment,
      updatedAt: new Date().toISOString(),
    };

    if (index >= 0) {
      existing[index] = updatedExp;
    } else {
      existing.unshift(updatedExp);
    }

    localStorage.setItem('medchem_experiments', JSON.stringify(existing));
  } catch (err) {
    console.error('LocalStorage mirror error:', err);
  }

  // Firebase Realtime Database
  if (database) {
    try {
      const experimentRef = ref(database, `experiments/${experiment.id}`);
      await set(experimentRef, {
        ...experiment,
        updatedAt: new Date().toISOString(),
      });
      return { success: true, mode: 'firebase' };
    } catch (err) {
      console.error('Firebase save error:', err);
      return { success: true, mode: 'local' };
    }
  }

  return { success: true, mode: 'local' };
};

/**
 * Delete experiment
 */
export const deleteExperimentData = async (id) => {
  if (database) {
    try {
      const experimentRef = ref(database, `experiments/${id}`);
      await remove(experimentRef);
    } catch (err) {
      console.error('Firebase delete error:', err);
    }
  }

  try {
    const existing = JSON.parse(localStorage.getItem('medchem_experiments') || '[]');
    const filtered = existing.filter((e) => e.id !== id);
    localStorage.setItem('medchem_experiments', JSON.stringify(filtered));
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Subscribe or load experiments
 */
export const loadExperimentsData = (onDataUpdate) => {
  if (database) {
    try {
      const expRef = ref(database, 'experiments');
      const unsubscribe = onValue(
        expRef,
        (snapshot) => {
          const val = snapshot.val();
          if (val) {
            const list = Object.values(val).sort(
              (a, b) => new Date(b.updatedAt || b.date) - new Date(a.updatedAt || a.date)
            );
            onDataUpdate(list, 'firebase');
          } else {
            // Firebase is connected and completely clean/empty
            onDataUpdate([], 'firebase');
          }
        },
        (error) => {
          console.warn('Firebase onValue error, falling back to LocalStorage:', error);
          const localList = JSON.parse(localStorage.getItem('medchem_experiments') || '[]');
          onDataUpdate(localList, 'local');
        }
      );
      return unsubscribe;
    } catch (err) {
      console.warn('Firebase listen error:', err);
    }
  }

  // LocalStorage read
  const localList = JSON.parse(localStorage.getItem('medchem_experiments') || '[]');
  onDataUpdate(localList, 'local');
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
