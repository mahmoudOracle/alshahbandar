import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { UserRole, CompanyMembership, Company } from '../types';
import * as authService from '../services/authService';
import { getCompany, upsertUserProfile } from '../services/firestoreService';
import { FullPageSpinner } from '../components/Spinner';
import { DEBUG_MODE } from '../config';
import { validateUserDataIsolation, cleanupSessionData } from '../services/dataTenantUtils';
import { getErrorMessage } from '../src/utils/errorMessage';

export type AuthPhase = 'loading' | 'resolved' | 'unauthorized' | 'terminal_error';
export type CompanyPhase = 'idle' | 'loading' | 'resolved' | 'error';

export type WriteableSection =
  | 'invoices'
  | 'customers'
  | 'products'
  | 'expenses'
  | 'settings'
  | 'users'
  | 'quotes'
  | 'recurring'
  | 'payments'
  | 'reports';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  authPhase: AuthPhase;
  companyPhase: CompanyPhase;
  authErrorMessage: string | null;
  isPlatformAdmin: boolean;
  authRole: 'platformAdmin' | 'tenant' | 'unknown' | null;
  authLoading: boolean;
  companyMemberships: CompanyMembership[];
  activeCompanyId: string | null;
  activeCompany: Company | null;
  activeRole: UserRole | null;
  setActiveCompanyId: (companyId: string | null) => void;
  signOutUser: () => Promise<void>;
  hasRole?: (role: string | string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Constants ---
const ACTIVE_COMPANY_ID_KEY = 'app:activeCompanyId';
const ACTIVE_ROLE_KEY = 'app:activeRole';
const PLATFORM_ADMIN_EMAIL = 'mahmoud.shineh3m@gmail.com';
const TENANT_ALLOWED_EMAILS = ['hoodaalawamry@gmail.com'];
const TENANT_COMPANY_ID = 'uv9acIebvvNgx9ftSnPh';

// --- Error Messages ---
const OFFLINE_ERROR_MESSAGE =
  '\u062a\u0639\u0630\u0631\u0020\u0627\u0644\u0627\u062a\u0635\u0627\u0644\u0020\u0628\u0642\u0627\u0639\u062f\u0629\u0020\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a\u002e\u0020\u062a\u0623\u0643\u062f\u0020\u0645\u0646\u0020\u062a\u0634\u063a\u064a\u0644\u0020\u0627\u0644\u0645\u062d\u0627\u0643\u064a\u0627\u062a\u0020\u0623\u0648\u0020\u0625\u064a\u0642\u0627\u0641\u0020\u0648\u0636\u0639\u0020\u0627\u0644\u0645\u062d\u0627\u0643\u064a\u0627\u062a\u002e';
const MSG_UNAUTHORIZED = '\u063a\u064a\u0631\u0020\u0645\u0635\u0631\u062d';
const MSG_COMPANY_FALLBACK = '\u0634\u0631\u0643\u0629';
const MSG_NO_COMPANY = '\u0644\u0627\u0020\u062a\u0648\u062c\u062f\u0020\u0634\u0631\u0643\u0629\u0020\u0645\u0631\u062a\u0628\u0637\u0629\u0020\u0628\u0647\u0630\u0627\u0020\u0627\u0644\u062d\u0633\u0627\u0628\u002e';
const MSG_COMPANY_INCOMPLETE = '\u0628\u064a\u0627\u0646\u0627\u062a\u0020\u0627\u0644\u0634\u0631\u0643\u0629\u0020\u063a\u064a\u0631\u0020\u0645\u0643\u062a\u0645\u0644\u0629\u002e\u0020\u064a\u0631\u062c\u0649\u0020\u0627\u0644\u062a\u0648\u0627\u0635\u0644\u0020\u0645\u0639\u0020\u0627\u0644\u0625\u062f\u0627\u0631\u0629\u002e';
const MSG_COMPANY_PENDING = '\u0627\u0644\u0634\u0631\u0643\u0629\u0020\u063a\u064a\u0631\u0020\u0645\u0641\u0639\u0644\u0629\u0020\u062d\u0627\u0644\u064a\u0627\u002e\u0020\u064a\u0631\u062c\u0649\u0020\u0627\u0644\u062a\u0648\u0627\u0635\u0644\u0020\u0645\u0639\u0020\u0627\u0644\u0625\u062f\u0627\u0631\u0629\u002e';
const MSG_COMPANY_BLOCKED = '\u062a\u0645\u0020\u0625\u064a\u0642\u0627\u0641\u0020\u0627\u0644\u0634\u0631\u0643\u0629\u002e\u0020\u064a\u0631\u062c\u0649\u0020\u0627\u0644\u062a\u0648\u0627\u0635\u0644\u0020\u0645\u0639\u0020\u0627\u0644\u0625\u062f\u0627\u0631\u0629\u002e';
const MSG_COMPANY_PAUSED =
  '\u062a\u0645\u0020\u0625\u064a\u0642\u0627\u0641\u0020\u0627\u0644\u0634\u0631\u0643\u0629\u0020\u0645\u0624\u0642\u062a\u064b\u0627\u002e\u0020\u062a\u0648\u0627\u0635\u0644\u0020\u0645\u0639\u0020\u0625\u062f\u0627\u0631\u0629\u0020\u0627\u0644\u0646\u0638\u0627\u0645\u002e';
const MSG_PERMISSION_DENIED = '\u0644\u064a\u0633\u0020\u0644\u062f\u064a\u0643\u0020\u0635\u0644\u0627\u062d\u064a\u0627\u062a\u0020\u0644\u0644\u0648\u0635\u0648\u0644\u0020\u0625\u0644\u0649\u0020\u0628\u064a\u0627\u0646\u0627\u062a\u0020\u0627\u0644\u0634\u0631\u0643\u0629\u002e\u0020\u064a\u0631\u062c\u0649\u0020\u0627\u0644\u062a\u0648\u0627\u0635\u0644\u0020\u0645\u0639\u0020\u0627\u0644\u0625\u062f\u0627\u0631\u0629\u002e';
const MSG_GENERIC_ERROR = '\u062d\u062f\u062b\u0020\u062e\u0637\u0623\u0020\u0623\u062b\u0646\u0627\u0621\u0020\u062a\u062d\u0645\u064a\u0644\u0020\u0628\u064a\u0627\u0646\u0627\u062a\u0020\u0627\u0644\u062d\u0633\u0627\u0628\u002e\u0020\u064a\u0631\u062c\u0649\u0020\u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629\u0020\u0645\u0631\u0629\u0020\u0623\u062e\u0631\u0649\u002e';

const isOfflineError = (err: unknown): boolean => {
  const code = (err as any)?.code;
  const message = (err as any)?.message?.toLowerCase() || '';
  return code === 'client-offline' || message.includes('offline') || message.includes('firestore');
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authPhase, setAuthPhase] = useState<AuthPhase>('loading');
  const [companyPhase, setCompanyPhase] = useState<CompanyPhase>('idle');
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [authRole, setAuthRole] = useState<'platformAdmin' | 'tenant' | 'unknown' | null>(null);
  const [companyMemberships, setCompanyMemberships] = useState<CompanyMembership[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ACTIVE_COMPANY_ID_KEY);
    } catch {
      return null;
    }
  });

  // Track if we've already resolved auth to prevent re-entry
  const authResolvedRef = React.useRef(false);
  const companyResolvedRef = React.useRef(false);

  const setActiveCompanyId = useCallback((companyId: string | null) => {
    setActiveCompanyIdState(companyId);
    try {
      if (companyId) {
        localStorage.setItem(ACTIVE_COMPANY_ID_KEY, companyId);
      } else {
        localStorage.removeItem(ACTIVE_COMPANY_ID_KEY);
        cleanupSessionData(null);
      }
    } catch (e) {
      /* ignore */
    }
  }, []);

  // Auth listener effect: registered ONCE per mount with [] dependency array
  // This ensures onAuthStateChanged is subscribed to exactly once (or twice in StrictMode dev)
  useEffect(() => {
    if (DEBUG_MODE) console.count("[AUTH] onAuthStateChanged listener registered");
    
    const unsubscribe = authService.subscribeToAuthChanges(async (user) => {
      if (DEBUG_MODE) {
        console.log('[AUTH] Auth state changed', {
          userId: user?.uid,
          email: user?.email,
          authResolvedRef: authResolvedRef.current,
        });
      }
      
      // GUARD: If we've already resolved auth and company, skip re-entry
      // This prevents loops when auth listener fires multiple times
      if (authResolvedRef.current) {
        if (DEBUG_MODE) console.log('[AUTH] Skipping re-entry - auth already resolved');
        return;
      }

      // Mark auth as being resolved to prevent concurrent/duplicate processing
      authResolvedRef.current = true;

      // Reset states for this auth change
      setAuthPhase('loading');
      setCompanyPhase('idle');
      setAuthErrorMessage(null);
      setActiveCompany(null);
      setCompanyMemberships([]);
      companyResolvedRef.current = false;

      if (!user) {
        if (DEBUG_MODE) console.info('[AUTH] Auth resolved: No user.');
        setFirebaseUser(null);
        setAuthRole(null);
        setActiveCompanyId(null);
        setAuthPhase('resolved');
        return;
      }

      setFirebaseUser(user);
      const email = (user.email || '').trim().toLowerCase();

      try {
        await upsertUserProfile(user);

        const isPlatformEmail = email === PLATFORM_ADMIN_EMAIL;
        const isTenantEmail = TENANT_ALLOWED_EMAILS.includes(email);

        if (!isPlatformEmail && !isTenantEmail) {
          throw new Error(MSG_UNAUTHORIZED);
        }

        if (isPlatformEmail) {
          setIsPlatformAdmin(true);
          setAuthRole('platformAdmin');
          setActiveCompanyId(null);
          setCompanyPhase('resolved'); // No company needed for platform admin
          companyResolvedRef.current = true;
          
          // PLATFORM ADMIN: Redirect to platform dashboard on first login
          const currentHash = window.location.hash || '#/';
          if (!currentHash.startsWith('#/platform')) {
            if (DEBUG_MODE) console.log('[AUTH] Redirecting platform admin to /#/platform');
            window.location.replace('/#/platform');
          }
          
          if (DEBUG_MODE) console.info('[AUTH] Auth resolved: Platform Admin.');
        } else { // Tenant user
          setIsPlatformAdmin(false);
          setAuthRole('tenant');
          setActiveCompanyId(TENANT_COMPANY_ID);
          setCompanyPhase('loading');

          if (DEBUG_MODE) console.count('[COMPANY] Fetching company document');
          const company = await getCompany(TENANT_COMPANY_ID);
          if (DEBUG_MODE) console.count('[COMPANY] Company fetch completed');

          if (!company) throw new Error(MSG_NO_COMPANY);
          if (!company.companyName || !company.status) throw new Error(MSG_COMPANY_INCOMPLETE);
          if (company.isActive === false) throw new Error(MSG_COMPANY_PAUSED);
          if (company.status !== 'approved') {
            const msg = company.status === 'pending' ? MSG_COMPANY_PENDING : MSG_COMPANY_BLOCKED;
            throw new Error(msg);
          }

          setActiveCompany(company);
          setCompanyMemberships([{
            companyId: TENANT_COMPANY_ID,
            companyName: company.companyName || MSG_COMPANY_FALLBACK,
            role: UserRole.Owner,
            status: 'active',
          }]);
          setCompanyPhase('resolved');
          companyResolvedRef.current = true;

          const currentHash = window.location.hash || '#/';
          if (!currentHash.startsWith('#/dashboard')) {
            window.location.replace('/#/dashboard');
          }
        }

        setAuthPhase('resolved');
      } catch (err) {
        console.error('[AUTH] Critical error during auth/company resolution:', err);
        const rawMessage = getErrorMessage(err, MSG_GENERIC_ERROR);
        const code = (err as any)?.code;

        if (isOfflineError(err) || code === 'client-offline') {
          setAuthErrorMessage(OFFLINE_ERROR_MESSAGE);
        } else if (code === 'permission-denied' || /permission/i.test(rawMessage)) {
          setAuthErrorMessage(MSG_PERMISSION_DENIED);
        } else {
          setAuthErrorMessage(rawMessage);
        }
        
        // Determine final error phase
        if (rawMessage === MSG_UNAUTHORIZED) {
          setAuthPhase('unauthorized');
        } else {
          setAuthPhase('terminal_error');
        }
        setCompanyPhase('error');
        companyResolvedRef.current = true; // Mark as resolved even on error to prevent retry loops
      }
    });

    return () => {
      unsubscribe();
      if (DEBUG_MODE) console.log('[AUTH] Auth listener unsubscribed');
    };
  }, []); // EMPTY dependency array - auth listener registered exactly ONCE

  const activeMembership = companyMemberships.find((m) => m.companyId === activeCompanyId);
  const activeRole = activeMembership ? activeMembership.role : null;
  const authLoading = authPhase === 'loading';

  useEffect(() => {
    try {
      if (activeRole) localStorage.setItem(ACTIVE_ROLE_KEY, activeRole);
      else localStorage.removeItem(ACTIVE_ROLE_KEY);
    } catch (e) {
      /* ignore */
    }
  }, [activeRole]);

  const value: AuthContextType = {
    firebaseUser,
    authPhase,
    companyPhase,
    authErrorMessage,
    isPlatformAdmin,
    authLoading,
    authRole,
    companyMemberships,
    activeCompanyId,
    activeCompany,
    activeRole,
    setActiveCompanyId,
    signOutUser: authService.signOutUser,
    hasRole: (roleOrRoles?: string | string[]) => {
      if (!roleOrRoles) return false;
      const current = activeRole;
      if (!current) return false;
      const roles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
      return roles.some((r) => String(r).toLowerCase() === String(current).toLowerCase());
    },
  };

  if (authPhase === 'loading' || (authRole === 'tenant' && companyPhase === 'loading')) {
    return <FullPageSpinner />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    return {
      firebaseUser: null,
      authPhase: 'loading',
      companyPhase: 'idle',
      authErrorMessage: null,
      isPlatformAdmin: false,
      authRole: null,
      authLoading: true,
      companyMemberships: [],
      activeCompanyId: null,
      activeCompany: null,
      activeRole: null,
      setActiveCompanyId: (_: string | null) => {},
      signOutUser: async () => {},
      hasRole: (_?: string | string[]) => false,
      user: null,
      role: null,
      companyId: null,
    } as unknown as AuthContextType & {
      user: FirebaseUser | null;
      role: UserRole | null;
      companyId: string | null;
    };
  }
  return {
    ...context,
    user: context.firebaseUser,
    role: context.activeRole,
    companyId: context.activeCompanyId,
  } as AuthContextType & {
    user: FirebaseUser | null;
    role: UserRole | null;
    companyId: string | null;
  };
};

export function useCanWrite(section: WriteableSection): boolean {
  const { activeRole } = useAuth();
  if (!activeRole) return false;
  if (activeRole === UserRole.Owner || activeRole === UserRole.Manager) return true;
  if (activeRole === UserRole.Employee) return section !== 'settings' && section !== 'users';
  return false;
}
