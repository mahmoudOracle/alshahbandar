import { initializeApp, FirebaseApp, getApp, getApps, FirebaseOptions } from 'firebase/app';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, Functions, connectFunctionsEmulator } from 'firebase/functions';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import {
  getStorage,
  ref as storageRef,
  connectStorageEmulator,
  FirebaseStorage,
} from 'firebase/storage';
// --- IMPORTANT DEVELOPMENT CONTEXT ---
// This project uses Firebase Emulators for local development to avoid hitting
// production Firebase services and to enable full local testing without Blaze billing.
//
// The VITE_USE_EMULATORS environment variable (set in .env.local)
// controls whether the app connects to these local emulators.
//
// The VITE_FREE_MODE environment variable (also in .env.local)
// controls certain business logic (e.g., invoice saving) to either use
// Cloud Functions (when VITE_FREE_MODE=false, typically with emulators in dev)
// or client-side transactions (when VITE_FREE_MODE=true, for free production mode).
// For local development, VITE_FREE_MODE should be 'false' to test Cloud Functions.

/**
 * Firebase configuration object.
 * By embedding this here, we ensure it's always available at build time and eliminate
 * potential module resolution issues with external config files.
 */
const firebaseConfig: FirebaseOptions = {
  apiKey: 'AIzaSyBVkrMWNJ1nKCYkmbSJEfnXjy1_i7SX8Co',
  authDomain: 'al-shabandar.firebaseapp.com',
  projectId: 'al-shabandar',
  storageBucket: 'al-shabandar.firebasestorage.app',
  messagingSenderId: '145557395180',
  appId: '1:145557395180:web:401b8f099bfb6d899e37c9',
  measurementId: 'G-FGH0FLMVWB',
};

// --- Firebase Service Initialization ---
// This pattern ensures that Firebase is initialized only once and that the initialized
// instances are available immediately to any module that imports them, preventing race conditions.

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let functions: Functions;
let storage: FirebaseStorage;

try {
  if (!firebaseConfig.apiKey) {
    console.warn('⚠️ [FIREBASE] Firebase configuration is missing API key. Connecting to remote Firebase might fail.');
  }
  // Initialize Firebase immediately when this module is imported.
  // This is idempotent and safe to be in the top-level scope.
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  functions = getFunctions(app);
  storage = getStorage(app);
  const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
  // Connect to local emulators only when explicitly enabled in DEV.
  try {
    const useEmulators = import.meta.env.DEV && metaEnv?.VITE_USE_EMULATORS === 'true';
    if (useEmulators) {
      console.log('🟢 [FIREBASE] Connecting to Firebase Emulators...');
      const firestoreHost =
        metaEnv?.VITE_FIRESTORE_EMULATOR_HOST ||
        metaEnv?.VITE_FIREBASE_EMULATOR_HOST ||
        '127.0.0.1';
      const functionsHost =
        metaEnv?.VITE_FUNCTIONS_EMULATOR_HOST ||
        metaEnv?.VITE_FIREBASE_EMULATOR_HOST ||
        '127.0.0.1';
      const authHost =
        metaEnv?.VITE_AUTH_EMULATOR_HOST || metaEnv?.VITE_FIREBASE_EMULATOR_HOST || '127.0.0.1';

      const firestorePort = Number(metaEnv?.VITE_FIRESTORE_EMULATOR_PORT || 8080);
      const functionsPort = Number(metaEnv?.VITE_FUNCTIONS_EMULATOR_PORT || 5001);
      const authPort = Number(metaEnv?.VITE_AUTH_EMULATOR_PORT || 9099);
      const storagePort = Number(metaEnv?.VITE_STORAGE_EMULATOR_PORT || 9199);

      connectFirestoreEmulator(db, firestoreHost, firestorePort);
      connectFunctionsEmulator(functions, functionsHost, functionsPort);
      connectAuthEmulator(auth, `http://${authHost}:${authPort}`, { disableWarnings: true });
      try {
        connectStorageEmulator(storage, firestoreHost, storagePort);
      } catch (e) {
        // connectStorageEmulator may not be available in some SDK combos; ignore if fails
        console.warn('[FIREBASE] Failed to connect storage emulator', e);
      }
      console.info('✅ [FIREBASE] Successfully connected to emulators', {
        firestoreHost,
        firestorePort,
        functionsHost,
        functionsPort,
        authHost,
        authPort,
      });
    } else {
        console.log('🌐 [FIREBASE] Connecting to remote Firebase project...');
    }
  } catch (e) {
    console.error('🔴 [FIREBASE] Failed to connect to emulators', e);
  }
} catch (error) {
  console.error('CRITICAL: Firebase initialization failed.', error);
  // We throw an error here to make it clear that the app cannot function
  // without a valid Firebase connection. This will be caught by the top-level
  // error boundary in index.tsx.
  throw new Error(`Firebase initialization failed: ${(error as Error).message}`);
}

// Diagnostic: log initialization info when debug enabled
import { DEBUG_MODE, APP_ENV } from '../config';
if (DEBUG_MODE) {
  try {
    console.log(
      `🔍 [FIREBASE] Initialized project: ${(firebaseConfig && firebaseConfig.projectId) || 'unknown'}`
    );
    console.log(`🔍 [FIREBASE] Environment: ${APP_ENV}`);
  } catch (e) {
    console.warn('⚠️ [FIREBASE] Failed to log initialization info', e);
  }
}

// The module now only exports the initialized services.
// The `initializeFirebase` function is no longer needed as initialization
// happens automatically on module import.
export { app, auth, db, functions, storage, storageRef };
