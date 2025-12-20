
import { initializeApp, FirebaseApp, getApp, getApps, FirebaseOptions } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getFunctions, Functions } from 'firebase/functions';
import { getAuth, Auth } from 'firebase/auth';

/**
 * Firebase configuration object.
 * By embedding this here, we ensure it's always available at build time and eliminate
 * potential module resolution issues with external config files.
 */
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyBVkrMWNJ1nKCYkmbSJEfnXjy1_i7SX8Co",
  authDomain: "al-shabandar.firebaseapp.com",
  projectId: "al-shabandar",
  storageBucket: "al-shabandar.firebasestorage.app",
  messagingSenderId: "145557395180",
  appId: "1:145557395180:web:401b8f099bfb6d899e37c9",
  measurementId: "G-FGH0FLMVWB"
};

// --- Firebase Service Initialization ---
// This pattern ensures that Firebase is initialized only once and that the initialized
// instances are available immediately to any module that imports them, preventing race conditions.

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let functions: Functions;

try {
    if (!firebaseConfig.apiKey) {
        throw new Error("Firebase configuration is missing API key.");
    }
    // Initialize Firebase immediately when this module is imported.
    // This is idempotent and safe to be in the top-level scope.
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    functions = getFunctions(app);
} catch (error) {
    console.error("CRITICAL: Firebase initialization failed.", error);
    // We throw an error here to make it clear that the app cannot function
    // without a valid Firebase connection. This will be caught by the top-level
    // error boundary in index.tsx.
    throw new Error(`Firebase initialization failed: ${(error as Error).message}`);
}

// Diagnostic: log initialization info when debug enabled
import { DEBUG_MODE, APP_ENV } from '../config';
if (DEBUG_MODE) {
    try {
        console.log(`🔍 [FIREBASE] Initialized project: ${(firebaseConfig && firebaseConfig.projectId) || 'unknown'}`);
        console.log(`🔍 [FIREBASE] Environment: ${APP_ENV}`);
    } catch (e) {
        console.warn('⚠️ [FIREBASE] Failed to log initialization info', e);
    }
}

// The module now only exports the initialized services.
// The `initializeFirebase` function is no longer needed as initialization
// happens automatically on module import.
export { app, auth, db, functions };