import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, set, get, remove, onValue } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

// Check if valid Firebase credentials are provided in environment
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if Firebase is properly configured
export const isFirebaseConfigured = () => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey.trim() !== '' &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId.trim() !== '' &&
    !firebaseConfig.apiKey.includes('YOUR_')
  );
};

let app = null;
let database = null;
let storage = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    if (firebaseConfig.databaseURL || firebaseConfig.projectId) {
      database = getDatabase(app);
    }
    if (firebaseConfig.storageBucket) {
      storage = getStorage(app);
    }
    console.log('🧪 [MedChem ELN] Connected to Firebase Realtime Cloud mode.');
  } catch (error) {
    console.warn('⚠️ [MedChem ELN] Firebase init failed, fallback to LocalStorage mode:', error);
    database = null;
    storage = null;
  }
} else {
  console.info('ℹ️ [MedChem ELN] No Firebase credentials detected. Running in LocalStorage Dual-Mode (Fully functional offline).');
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
        // Resize image to max 1280px dimension to keep localStorage light & fast
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

        // Quality 0.8 JPEG for optimal balance of sharp lab TLC spots & small size
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
 * Save an experiment to Database (Firebase or LocalStorage)
 */
export const saveExperimentData = async (experiment) => {
  if (database) {
    try {
      const experimentRef = ref(database, `experiments/${experiment.id}`);
      await set(experimentRef, {
        ...experiment,
        updatedAt: new Date().toISOString(),
      });
      return { success: true, mode: 'firebase' };
    } catch (err) {
      console.error('Firebase save error, writing to LocalStorage:', err);
    }
  }

  // LocalStorage Fallback
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
    return { success: true, mode: 'local' };
  } catch (err) {
    console.error('LocalStorage save error:', err);
    return { success: false, error: err.message };
  }
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
      const unsubscribe = onValue(expRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          const list = Object.values(val).sort((a, b) => new Date(b.updatedAt || b.date) - new Date(a.updatedAt || a.date));
          onDataUpdate(list, 'firebase');
        } else {
          // If Firebase is empty, fall back to check localStorage
          const localList = JSON.parse(localStorage.getItem('medchem_experiments') || '[]');
          onDataUpdate(localList, 'local');
        }
      });
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
