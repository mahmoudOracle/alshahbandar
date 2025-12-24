import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { UserRole, CompanyMembership } from '../types';
import * as authService from '../services/authService';
import * as dataService from '../services/dataService';
import { FullPageSpinner } from '../components/Spinner';

export type WriteableSection = 'invoices' | 'customers' | 'products' | 'expenses' | 'settings' | 'users' | 'quotes' | 'recurring' | 'payments' | 'reports';

interface AuthContextType {
    firebaseUser: FirebaseUser | null;
    authLoading: boolean;
    isPlatformAdmin: boolean;
    companyMemberships: CompanyMembership[];
    activeCompanyId: string | null;
    activeRole: UserRole | null;
    setActiveCompanyId: (companyId: string) => void;
    signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACTIVE_COMPANY_ID_KEY = 'app:activeCompanyId';
const ACTIVE_ROLE_KEY = 'app:activeRole'; // For insecure UI logic

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
    const [companyMemberships, setCompanyMemberships] = useState<CompanyMembership[]>([]);
    const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(() => localStorage.getItem(ACTIVE_COMPANY_ID_KEY));
    
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
                setIsPlatformAdmin(false);
                setCompanyMemberships([]);
                setActiveCompanyIdState(null);
                localStorage.removeItem(ACTIVE_COMPANY_ID_KEY);
                localStorage.removeItem(ACTIVE_ROLE_KEY);
                setAuthLoading(false);
                return;
            }

            // User is logged in, process their roles and memberships
            try {
                // 1. Check for Platform Admin status
                const isAdmin = await dataService.checkIfPlatformAdmin(user.uid);
                setIsPlatformAdmin(isAdmin);
                if(isAdmin) {
                    setAuthLoading(false);
                    return;
                }

                // 2. Resolve first-time owner claims and invitations
                const justResolved = await dataService.resolveFirstLogin(user);

                // 3. Get all company memberships
                let memberships = await dataService.getCompanyMemberships(user.uid);

                // FIX for eventual consistency on collectionGroup query
                if (justResolved && memberships.length === 0) {
                    console.log("New membership detected, but query returned empty. Retrying after delay...");
                    await delay(1500); // Wait for Firestore index to update
                    memberships = await dataService.getCompanyMemberships(user.uid);
                    console.log("Retry fetch memberships result:", memberships);
                }

                setCompanyMemberships(memberships);

                // 4. Determine active company
                if (memberships.length === 1) {
                    setActiveCompanyId(memberships[0].companyId);
                } else {
                    const storedCompanyId = localStorage.getItem(ACTIVE_COMPANY_ID_KEY);
                    if (storedCompanyId && memberships.some(m => m.companyId === storedCompanyId)) {
                        setActiveCompanyIdState(storedCompanyId);
                    } else {
                        // User has multiple companies but no active one selected, or stored one is invalid
                        setActiveCompanyIdState(null);
                    }
                }
            } catch (error) {
                console.error("Error during auth processing:", error);
                // Handle error state if necessary
            } finally {
                setAuthLoading(false);
            }
        });

        return () => unsubscribe();
    }, [setActiveCompanyId]);

    const activeMembership = companyMemberships.find(m => m.companyId === activeCompanyId);
    const activeRole = activeMembership ? activeMembership.role : null;
    
    // This is insecure and for UI hints only. Do not use for write logic.
    useEffect(() => {
        if (activeRole) {
            localStorage.setItem(ACTIVE_ROLE_KEY, activeRole);
        } else {
            localStorage.removeItem(ACTIVE_ROLE_KEY);
        }
    }, [activeRole]);

    const value: AuthContextType = {
        firebaseUser,
        authLoading,
        isPlatformAdmin,
        companyMemberships,
        activeCompanyId,
        activeRole,
        setActiveCompanyId,
        signOutUser: authService.signOutUser,
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
  
  if (activeRole === UserRole.Owner || activeRole === UserRole.Manager) return true;
  if (activeRole === UserRole.Employee) return section !== 'settings' && section !== 'users';
  return false; // viewer
}