
import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { UserRole } from '../types';
import * as authService from '../services/authService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export type WriteableSection = 'invoices' | 'customers' | 'products' | 'expenses' | 'settings' | 'users' | 'quotes' | 'recurring' | 'payments' | 'reports';

interface AuthContextType {
    firebaseUser: FirebaseUser | null;
    authLoading: boolean;
    activeCompanyId: string | null;
    activeRole: UserRole | null;
    signOutUser: () => Promise<void>;
    setActiveCompanyId: (companyId: string) => void; // Keep for future flexibility
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACTIVE_COMPANY_ID_KEY = 'app:activeCompanyId';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(() => localStorage.getItem(ACTIVE_COMPANY_ID_KEY));
    const [activeRole, setActiveRole] = useState<UserRole | null>(null);

    const setActiveCompanyId = useCallback((companyId: string) => {
        localStorage.setItem(ACTIVE_COMPANY_ID_KEY, companyId);
        setActiveCompanyIdState(companyId);
    }, []);

    useEffect(() => {
        const unsubscribe = authService.subscribeToAuthChanges(async (user) => {
            setAuthLoading(true);
            setFirebaseUser(user);

            if (!user) {
                // User is logged out
                setActiveCompanyIdState(null);
                setActiveRole(null);
                localStorage.removeItem(ACTIVE_COMPANY_ID_KEY);
                setAuthLoading(false);
                return;
            }

            // User is logged in, fetch their user profile and company
            try {
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setActiveCompanyId(userData.companyId);
                    setActiveRole(userData.role || UserRole.Owner); // Default to Owner
                } else {
                    // This case might happen for a brand new user
                    // The registration flow should have created a user doc.
                    console.log("User document not found, waiting for creation...");
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            } finally {
                setAuthLoading(false);
            }
        });

        return () => unsubscribe();
    }, [setActiveCompanyId]);

    const value: AuthContextType = {
        firebaseUser,
        authLoading,
        activeCompanyId,
        activeRole,
        signOutUser: authService.signOutUser,
        setActiveCompanyId
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return { ...context, user: context.firebaseUser }; // Keep 'user' alias for compatibility
};

export function useCanWrite(section: WriteableSection): boolean {
  const { activeRole } = useAuth();
  if (!activeRole) return false;
  
  // For a single-user-per-company model, the user is always the owner/admin
  return true;
}
