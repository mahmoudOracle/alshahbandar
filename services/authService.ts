
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
import { auth, db } from './firebase';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';

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
    const user = result.user;
    if (user) {
        await updateProfile(user, { displayName });

        // Create a new company for the user
        const companyRef = await addDoc(collection(db, "companies"), {
            name: `${displayName}'s Company`,
            ownerUid: user.uid,
            createdAt: new Date(),
            updatedAt: new Date(),
            plan: "free",
            isActive: true,
            ownerEmail: user.email
        });

        // Create a user profile
        await setDoc(doc(db, "users", user.uid), {
            displayName: displayName,
            email: user.email,
            uid: user.uid,
            companyId: companyRef.id, // Link user to the new company
            role: "admin", // The first user is the admin of their company
            createdAt: new Date()
        });
    }
    return user;
};

export const signOutUser = async (): Promise<void> => {
    await signOut(auth);
};
