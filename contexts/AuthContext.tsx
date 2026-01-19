import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

// Single-tenant company ID from environment
const COMPANY_ID = import.meta.env.VITE_COMPANY_ID || '';

// ============ STATE MACHINE ============
export type AuthStatus =
  | 'authLoading' // Initial state, waiting for Firebase onAuthStateChanged
  | 'loggedOut' // User is not authenticated
  | 'resolvingMembership' // Firebase user exists, checking Firestore for membership
  | 'authorized' // User is authenticated and a member of the company
  | 'unauthorized_notMember' // User is authenticated but not in the members subcollection
  | 'unauthorized_companyInactive' // User is a member, but the company is inactive
  | 'error'; // An error occurred during the process

// ============ CONTEXT TYPE ============
export interface AuthContextType {
  user: User | null;
  status: AuthStatus;
  error: string | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  companyId: string;
  logout: () => Promise<void>;
}

// ============ CONTEXT CREATION ============
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============ AUTH PROVIDER ============
export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('authLoading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Validate company ID is set
    if (!COMPANY_ID) {
      console.error('VITE_COMPANY_ID is not configured');
      setStatus('error');
      setError('Environment configuration error: VITE_COMPANY_ID is missing');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Reset previous error state on auth change
      setError(null);

      if (!firebaseUser) {
        setUser(null);
        setStatus('loggedOut');
        return;
      }

      setUser(firebaseUser);
      setStatus('resolvingMembership');

      try {
        // Check 1: Is the user a member of the company?
        const memberDocRef = doc(
          db,
          'companies',
          COMPANY_ID,
          'members',
          firebaseUser.uid
        );
        const memberDocSnap = await getDoc(memberDocRef);

        if (!memberDocSnap.exists()) {
          setStatus('unauthorized_notMember');
          return;
        }

        // Check 2: Is the company active?
        const companyDocRef = doc(db, 'companies', COMPANY_ID);
        const companyDocSnap = await getDoc(companyDocRef);

        if (!companyDocSnap.exists() || !companyDocSnap.data()?.isActive) {
          setStatus('unauthorized_companyInactive');
          return;
        }

        // All checks passed
        setStatus('authorized');
      } catch (e: any) {
        console.error('Error resolving membership:', e);
        const errorMessage = e.message || 'An unexpected error occurred.';
        setError(errorMessage);
        setStatus('error');
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setStatus('loggedOut');
    } catch (e) {
      console.error('Error signing out:', e);
      // Even on logout error, we force the state to loggedOut
      setUser(null);
      setStatus('loggedOut');
    }
  };

  const value: AuthContextType = {
    user,
    status,
    error,
    isLoading: status === 'authLoading' || status === 'resolvingMembership',
    isLoggedIn: status === 'authorized',
    companyId: COMPANY_ID,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ============ CUSTOM HOOKS ============
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Hook to check if user can write to a given resource type.
 * Returns true if user is authorized (i.e., is an authenticated company member).
 * 
 * For role-based permission control, pages should check the user's role from 
 * the Firestore member document (companies/{companyId}/members/{uid})
 * and implement resource-specific permissions as needed.
 * 
 * Basic permission matrix (can be enhanced per resource):
 * - owner/manager: can write all resources
 * - employee/staff: can write invoices, payments, returns (not products, settings)
 * - viewer/readonly: cannot write
 */
export const useCanWrite = (_resourceType?: string): boolean => {
  const { status } = useAuth();
  // Authorization check: user must be a company member and company must be active
  return status === 'authorized';
};

