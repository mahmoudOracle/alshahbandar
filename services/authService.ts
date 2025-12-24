
import { 
    Auth, 
    User as FirebaseUser,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    updateProfile
} from 'firebase/auth';
import { auth } from './firebase';

const googleProvider = new GoogleAuthProvider();

export const subscribeToAuthChanges = (callback: (user: FirebaseUser | null) => void) => {
    return onAuthStateChanged(auth, callback);
};

export const signInWithGoogle = async (): Promise<FirebaseUser> => {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
};

export const signInWithEmail = async (email: string, password: string): Promise<FirebaseUser> => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
};

export const registerWithEmail = async (email: string, password: string, displayName: string): Promise<FirebaseUser> => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (result.user) {
        await updateProfile(result.user, { displayName });
    }
    return result.user;
};

export const signOutUser = async (): Promise<void> => {
    await signOut(auth);
};
