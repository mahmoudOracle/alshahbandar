
import { initializeApp, FirebaseApp, getApp, getApps } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getFunctions, Functions } from 'firebase/functions';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from '../config/firebase';

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let functions: Functions;

/**
 * Initializes the Firebase app. This function is idempotent, meaning it can be
 * called multiple times without creating new instances. It now uses a direct
 * import for the configuration to avoid async network requests on startup.
 * 
 * @returns An object containing the initialized Firebase services.
 * @throws An error if the configuration is invalid or initialization fails.
 */
export const initializeFirebase = () => {
    // Check if the app is already initialized to make the function idempotent.
    if (!getApps().length) {
        try {
            if (firebaseConfig && firebaseConfig.apiKey) {
                app = initializeApp(firebaseConfig);
                auth = getAuth(app);
                db = getFirestore(app);
                functions = getFunctions(app);
            } else {
                throw new Error("Firebase configuration from firebase.ts is missing or invalid.");
            }
        } catch (error) {
            console.error("Failed to initialize Firebase:", error);
            throw new Error("Could not initialize Firebase. Please ensure 'config/firebase.ts' is configured correctly.");
        }
    } else {
        app = getApp();
        auth = getAuth(app);
        db = getFirestore(app);
        functions = getFunctions(app);
    }
    
    return { app, auth, db, functions, config: firebaseConfig };
};

export { app, auth, db, functions };