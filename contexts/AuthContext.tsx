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
import { ENV, EnvConfigError } from '../src/config/env';

const AUTHORIZED_MEMBERSHIP_ROLES = new Set(['owner', 'manager', 'staff']);

const getRoleFromDocData = (data?: Record<string, unknown>): string | null => {
  if (!data) return null;
  const candidate = data.role ?? data.memberRole ?? data.roleName;
  return typeof candidate === 'string' ? candidate : null;
};

const getRoleFromMembershipEntry = (entry: unknown): string | null => {
  if (!entry) return null;
  if (typeof entry === 'string') return entry;
  if (typeof entry === 'object' && entry !== null) {
    return getRoleFromDocData(entry as Record<string, unknown>);
  }
  return null;
};

const isAuthorizedRole = (role: string | null | undefined): boolean =>
  Boolean(role && AUTHORIZED_MEMBERSHIP_ROLES.has(role.toLowerCase()));

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
export type AuthRole = 'owner' | 'manager' | 'staff' | null;

export interface AuthContextType {
  user: User | null;
  status: AuthStatus;
  error: string | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  authLoading: boolean;
  authorized: boolean;
  role: AuthRole;
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
  const [role, setRole] = useState<AuthRole>(null);

  useEffect(() => {
    let companyId: string;
    try {
      companyId = ENV.companyId;
    } catch (err) {
      console.error(err instanceof EnvConfigError ? err.message : err);
      setStatus('error');
      setError(
        err instanceof Error
          ? err.message
          : 'Environment configuration error: VITE_COMPANY_ID is missing'
      );
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Reset previous error state on auth change
      setError(null);

      if (!firebaseUser) {
        setUser(null);
        setRole(null);
        setStatus('loggedOut');
        return;
      }

      setUser(firebaseUser);
      setStatus('resolvingMembership');

      try {
        const memberDocRef = doc(db, 'companies', companyId, 'members', firebaseUser.uid);
        const memberDocSnap = await getDoc(memberDocRef);
        const memberRole = getRoleFromDocData(memberDocSnap.data());
        let resolvedRole: AuthRole = null;
        let isAuthorized = memberDocSnap.exists() && isAuthorizedRole(memberRole);
        if (isAuthorized && memberRole) {
          resolvedRole = memberRole.toLowerCase() as AuthRole;
        }

        if (!isAuthorized) {
          const companyUserDocRef = doc(db, 'companies', companyId, 'users', firebaseUser.uid);
          const companyUserSnap = await getDoc(companyUserDocRef);
          const companyUserRole = getRoleFromDocData(companyUserSnap.data());
          isAuthorized = companyUserSnap.exists() && isAuthorizedRole(companyUserRole);
          if (isAuthorized && companyUserRole) {
            resolvedRole = companyUserRole.toLowerCase() as AuthRole;
          }

          if (!isAuthorized) {
            const rootUserDocRef = doc(db, 'users', firebaseUser.uid);
            const rootUserSnap = await getDoc(rootUserDocRef);
            const memberships =
              rootUserSnap.exists() && typeof rootUserSnap.data()?.memberships === 'object'
                ? (rootUserSnap.data()?.memberships || {})
                : {};
            const membershipEntry = memberships[companyId];
            const membershipRole = getRoleFromMembershipEntry(membershipEntry);
            isAuthorized = isAuthorizedRole(membershipRole);
            if (isAuthorized && membershipRole) {
              resolvedRole = membershipRole.toLowerCase() as AuthRole;
            }
          }
        }

        if (!isAuthorized) {
          setRole(null);
          setStatus('unauthorized_notMember');
          return;
        }

        const companyDocRef = doc(db, 'companies', companyId);
        const companyDocSnap = await getDoc(companyDocRef);
        const companyIsActive =
          companyDocSnap.exists() && companyDocSnap.data()?.isActive === false ? false : true;

        if (companyDocSnap.exists() && !companyIsActive) {
          setRole(null);
          setStatus('unauthorized_companyInactive');
          return;
        }

        setRole(resolvedRole);
        setStatus('authorized');
      } catch (e: any) {
        console.error('Error resolving membership:', e);
        const errorMessage = e.message || 'An unexpected error occurred.';
        setError(errorMessage);
        setRole(null);
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
      setRole(null);
      setStatus('loggedOut');
    } catch (e) {
      console.error('Error signing out:', e);
      // Even on logout error, we force the state to loggedOut
      setUser(null);
      setRole(null);
      setStatus('loggedOut');
    }
  };

  const value: AuthContextType = {
    user,
    status,
    error,
    isLoading: status === 'authLoading' || status === 'resolvingMembership',
    isLoggedIn: status === 'authorized',
    authLoading: status === 'authLoading' || status === 'resolvingMembership',
    authorized: status === 'authorized',
    role,
    companyId: (() => {
      try {
        return ENV.companyId;
      } catch {
        return '';
      }
    })(),
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

