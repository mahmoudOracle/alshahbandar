import { initializeApp, FirebaseApp, getApp, getApps, FirebaseOptions } from 'firebase/app';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import {
  getStorage,
  ref as storageRef,
  connectStorageEmulator,
  FirebaseStorage,
} from 'firebase/storage';
import {
  getStoredFirebaseConfig,
  FirebaseSetupMissingError,
} from '../src/config/runtimeSetup';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let firestoreEmulatorConnected = false;
let authEmulatorConnected = false;
let storageEmulatorConnected = false;

const getRuntimeConfig = (): FirebaseOptions => {
  const config = getStoredFirebaseConfig();
  if (!config) {
    throw new FirebaseSetupMissingError(
      'Firebase setup missing. Go to /setup/firebase and paste the web config.'
    );
  }
  return config;
};

export const getFirebaseApp = (): FirebaseApp => {
  if (app) return app;
  const config = getRuntimeConfig();
  app = getApps().length ? getApp() : initializeApp(config);
  return app;
};

const connectEmulatorsIfNeeded = (svc: {
  auth?: Auth;
  db?: Firestore;
  storage?: FirebaseStorage;
}) => {
  const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
  const useEmulators = import.meta.env.DEV && metaEnv?.VITE_USE_EMULATORS === 'true';
  if (!useEmulators) return;

  const firestoreHost =
    metaEnv?.VITE_FIRESTORE_EMULATOR_HOST ||
    metaEnv?.VITE_FIREBASE_EMULATOR_HOST ||
    '127.0.0.1';
  const authHost =
    metaEnv?.VITE_AUTH_EMULATOR_HOST || metaEnv?.VITE_FIREBASE_EMULATOR_HOST || '127.0.0.1';
  const firestorePort = Number(metaEnv?.VITE_FIRESTORE_EMULATOR_PORT || 8080);
  const authPort = Number(metaEnv?.VITE_AUTH_EMULATOR_PORT || 9099);
  const storagePort = Number(metaEnv?.VITE_STORAGE_EMULATOR_PORT || 9199);

  if (svc.db && !firestoreEmulatorConnected) {
    connectFirestoreEmulator(svc.db, firestoreHost, firestorePort);
    firestoreEmulatorConnected = true;
  }
  if (svc.auth && !authEmulatorConnected) {
    connectAuthEmulator(svc.auth, `http://${authHost}:${authPort}`, { disableWarnings: true });
    authEmulatorConnected = true;
  }
  if (svc.storage && !storageEmulatorConnected) {
    try {
      connectStorageEmulator(svc.storage, firestoreHost, storagePort);
      storageEmulatorConnected = true;
    } catch (e) {
      console.warn('[FIREBASE] Failed to connect storage emulator', e);
    }
  }
};

export const getFirebaseAuth = (): Auth => {
  if (auth) return auth;
  auth = getAuth(getFirebaseApp());
  connectEmulatorsIfNeeded({ auth });
  return auth;
};

export const getFirestoreDb = (): Firestore => {
  if (db) return db;
  db = getFirestore(getFirebaseApp());
  connectEmulatorsIfNeeded({ db });
  return db;
};

export const getFirebaseStorage = (): FirebaseStorage => {
  if (storage) return storage;
  storage = getStorage(getFirebaseApp());
  connectEmulatorsIfNeeded({ storage });
  return storage;
};

export { storageRef };
