
import { 
    User as FirebaseUser,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    updateProfile
} from 'firebase/auth';
import { auth } from './firebase';
import { DEBUG_MODE } from '../config';

export const subscribeToAuthChanges = (callback: (user: FirebaseUser | null) => void): (() => void) => {
    return onAuthStateChanged(auth, (user) => {
        if (DEBUG_MODE) {
            if (user) {
                console.log('🟢 [AUTH] onAuthStateChanged: user signed in', { uid: user.uid, email: user.email });
            } else {
                console.log('🟡 [AUTH] onAuthStateChanged: user signed out');
            }
        }
        callback(user);
    });
};

export const signInWithEmail = async (email: string, password: string): Promise<FirebaseUser> => {
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        if (DEBUG_MODE) console.log('🟢 [AUTH] Login success:', { uid: result.user.uid, email: result.user.email });
        return result.user;
    } catch (err: any) {
        if (DEBUG_MODE) console.error('🔴 [AUTH] Login failure:', { email, error: err?.message || err });
        throw err;
    }
};

export const registerWithEmail = async (email: string, password: string): Promise<FirebaseUser> => {
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        if (DEBUG_MODE) console.log('🟢 [AUTH] Register success:', { uid: result.user.uid, email: result.user.email });
        return result.user;
    } catch (err: any) {
        if (DEBUG_MODE) console.error('🔴 [AUTH] Register failure:', { email, error: err?.message || err });
        throw err;
    }
};

export const signOutUser = async (): Promise<void> => {
    await signOut(auth);
};