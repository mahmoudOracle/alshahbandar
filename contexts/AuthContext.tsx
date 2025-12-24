import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { UserRole, CompanyMembership } from '../types';
import * as authService from '../services/authService';
import * as dataService from '../services/dataService';
import { getUserProfile, getCompany, getCompanyMembershipByUid } from '../services/firestoreService';
import { FullPageSpinner } from '../components/Spinner';
import { useNotification } from '../contexts/NotificationContext';
import { DEBUG_MODE } from '../config';
import { validateUserDataIsolation, cleanupSessionData } from '../services/dataTenantUtils';

export type WriteableSection = 'invoices' | 'customers' | 'products' | 'expenses' | 'settings' | 'users' | 'quotes' | 'recurring' | 'payments' | 'reports';

interface AuthContextType {
    firebaseUser: FirebaseUser | null;
    authLoading: boolean;
    isPlatformAdmin: boolean;
    companyMemberships: CompanyMembership[];
    activeCompanyId: string | null;
    activeCompany: any | null;
    activeRole: UserRole | null;
    setActiveCompanyId: (companyId: string | null) => void;
    signOutUser: () => Promise<void>;
    onboardingError: string | null;
    clearOnboardingError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACTIVE_COMPANY_ID_KEY = 'app:activeCompanyId';
const ACTIVE_ROLE_KEY = 'app:activeRole';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
    const [companyMemberships, setCompanyMemberships] = useState<CompanyMembership[]>([]);
    const [activeCompany, setActiveCompany] = useState<any | null>(null);
    const companyCacheRef = React.useRef<Map<string, any>>(new Map());
    const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(() => {
        try {
            return localStorage.getItem(ACTIVE_COMPANY_ID_KEY);
        } catch (e) { /* ignore localStorage read errors (privacy/browser settings) */ return null; }
    });
    const [onboardingError, setOnboardingError] = useState<string | null>(null);

    const notify = useNotification();

    const setActiveCompanyId = useCallback((companyId: string | null) => {
        // Validate company ID format before setting
        if (companyId) {
            if (typeof companyId !== 'string' || companyId.length === 0) {
                console.error('[AUTH] Invalid companyId provided:', companyId);
                return;
            }
            // Security: Ensure company ID matches one of user's memberships
            const isMemberOfCompany = companyMemberships.some(m => m.companyId === companyId);
            if (!isMemberOfCompany) {
                console.error('[AUTH] User attempted to switch to unauthorized company:', companyId);
                return;
            }
        }
        
        setActiveCompanyIdState(companyId);
        try {
            if (companyId) {
                localStorage.setItem(ACTIVE_COMPANY_ID_KEY, companyId);
            } else {
                localStorage.removeItem(ACTIVE_COMPANY_ID_KEY);
                cleanupSessionData(null);
            }
        } catch (e) { /* ignore localStorage write errors (privacy/browser settings) */ }
    }, [companyMemberships]);

    useEffect(() => {
        setAuthLoading(true);
        const unsubscribe = authService.subscribeToAuthChanges(async (user) => {
            try {
                if (!user) {
                    if (DEBUG_MODE) console.log('🟡 [AUTH] onAuthChange: no user (signed out)');
                    setFirebaseUser(null);
                    setIsPlatformAdmin(false);
                    setCompanyMemberships([]);
                    setActiveCompanyIdState(null);
                    localStorage.removeItem(ACTIVE_COMPANY_ID_KEY);
                    localStorage.removeItem(ACTIVE_ROLE_KEY);
                    setOnboardingError(null);
                    setAuthLoading(false);
                    return;
                }

                setFirebaseUser(user);
                if (DEBUG_MODE) console.log('🔍 [AUTH] Logged in user detected, uid:', user.uid, 'email:', user.email);

                // Run independent reads in parallel to reduce latency
                const [isAdmin, profile] = await Promise.all([
                    dataService.checkIfPlatformAdmin(user.uid).catch(() => false),
                    getUserProfile(user.uid).catch(() => null),
                ]);

                setIsPlatformAdmin(isAdmin);
                if (DEBUG_MODE) console.log(`🔍 [AUTH] isPlatformAdmin: ${isAdmin}`);

                if (!profile) {
                    if (DEBUG_MODE) console.warn('🟡 [FIRESTORE] User profile not found for uid:', user.uid);
                    setOnboardingError('لم يتم إعداد ملف المستخدم. يرجى التواصل مع الدعم.');
                    setCompanyMemberships([]);
                    setActiveCompanyIdState(null);
                    setAuthLoading(false);
                    return;
                }

                if (DEBUG_MODE) console.log('🟢 [FIRESTORE] User profile retrieved:', { uid: user.uid, profile });
                const companyId = profile.companyId as string | undefined;
                if (!companyId) {
                    if (DEBUG_MODE) console.warn('🟡 [ACCESS] User has no companyId in profile:', user.uid);
                    setOnboardingError('لم يتم ربط حسابك بأي شركة بعد.');
                    setCompanyMemberships([]);
                    setActiveCompanyIdState(null);
                    setAuthLoading(false);
                    return;
                }

                // Use cache if available
                let company = companyCacheRef.current.get(companyId) || null;

                // Fetch company and membership in parallel
                const [companySnap, membership] = await Promise.all([
                    company ? Promise.resolve(company) : getCompany(companyId).catch((err) => { throw err; }),
                    getCompanyMembershipByUid(companyId, user.uid).catch(() => null),
                ]);

                company = companySnap;
                if (!company) {
                    if (DEBUG_MODE) console.warn('🟡 [FIRESTORE] Company not found for companyId:', companyId);
                    setOnboardingError('لم يتم العثور على الشركة المرتبطة بحسابك.');
                    setCompanyMemberships([]);
                    setActiveCompanyIdState(null);
                    setAuthLoading(false);
                    return;
                }

                // Cache the company for subsequent reads
                companyCacheRef.current.set(companyId, company);

                if (DEBUG_MODE) console.log('🟢 [FIRESTORE] Company retrieved:', { companyId, status: company.status });

                // Minimal validation: require companyName and status
                if (!company.companyName || !company.status) {
                    console.warn('🟡 [DATA] Company document missing minimal required fields:', { companyId, company });
                    setOnboardingError('بيانات الشركة غير كاملة. يرجى إكمال إعدادات الشركة.');
                    setCompanyMemberships([]);
                    setActiveCompanyIdState(null);
                    setAuthLoading(false);
                    return;
                }

                if (company.status !== 'approved') {
                    const msg = company.status === 'pending' ? 'حسابك في انتظار الموافقة من الإدارة.' : 'تم رفض طلب شركتك.';
                    if (DEBUG_MODE) console.warn('🔴 [ACCESS] Company access blocked, status:', company.status, 'companyId:', companyId);
                    setOnboardingError(msg);
                    setCompanyMemberships([]);
                    setActiveCompanyIdState(null);
                    setAuthLoading(false);
                    return;
                }

                // Prepare membership data (use profile.role if membership doc missing)
                const roleFromProfile = (profile.role as UserRole) || UserRole.Owner;
                const memberRole = membership?.role || roleFromProfile;
                const membershipObj: CompanyMembership = { companyId, companyName: company.companyName, role: memberRole, status: 'active' };

                // Batch update state to minimize re-renders
                setCompanyMemberships([membershipObj]);
                setActiveCompanyIdState(companyId);
                setActiveCompany(company);
                setOnboardingError(null);
                setAuthLoading(false);
            } catch (err: any) {
                console.error('🔴 [AUTH] Error during auth processing:', err);
                if (DEBUG_MODE) console.error('🔴 [AUTH] error details:', err?.message || err);
                const msg = String(err?.message || '').toLowerCase();
                if (err?.code === 'client-offline' || /client offline|failed to reach firestore|could not reach cloud firestore|net::err_connection_closed/.test(msg)) {
                    console.error('🔴 [AUTH] Network/offline detected while accessing Firestore', err);
                    setOnboardingError('تعذر الاتصال بخوادمنا. تحقق من اتصال الإنترنت وحاول مرة أخرى.');
                } else if (err?.code === 'permission-denied' || /permission/i.test(err?.message || '')) {
                    setOnboardingError('لا تملك صلاحية الوصول إلى بيانات الشركة. تواصل مع الدعم.');
                } else {
                    setOnboardingError('حدث خطأ أثناء تحميل بيانات المصادقة. حاول إعادة تسجيل الدخول.');
                }
                setCompanyMemberships([]);
                setAuthLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const activeMembership = companyMemberships.find(m => m.companyId === activeCompanyId);
    const activeRole = activeMembership ? activeMembership.role : null;

    // Persist active role to localStorage for UI hints only
    useEffect(() => {
        try {
            if (activeRole) localStorage.setItem(ACTIVE_ROLE_KEY, activeRole);
            else localStorage.removeItem(ACTIVE_ROLE_KEY);
        } catch (e) { /* ignore localStorage write errors */ }
    }, [activeRole]);

    // Session timeout check: Auto-logout after inactivity (30 minutes)
    useEffect(() => {
        if (!firebaseUser || !activeCompanyId) return;

        const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
        let timeoutId: ReturnType<typeof setTimeout>;
        let activityCheckInterval: ReturnType<typeof setInterval>;

        const resetTimeout = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                if (DEBUG_MODE) console.log('🟡 [AUTH] Session timeout - auto-logout');
                authService.signOutUser().catch(e => console.error('Logout error:', e));
            }, SESSION_TIMEOUT_MS);
        };

        const handleUserActivity = () => {
            resetTimeout();
        };

        // Track user activity
        window.addEventListener('mousedown', handleUserActivity);
        window.addEventListener('keydown', handleUserActivity);
        window.addEventListener('scroll', handleUserActivity);

        // Initial timeout
        resetTimeout();

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('mousedown', handleUserActivity);
            window.removeEventListener('keydown', handleUserActivity);
            window.removeEventListener('scroll', handleUserActivity);
        };
    }, [firebaseUser, activeCompanyId]);

    // Validate data isolation on company/user change
    useEffect(() => {
        if (firebaseUser && activeCompanyId) {
            const isolationCheck = validateUserDataIsolation(firebaseUser, activeCompanyId);
            if (!isolationCheck.isValid) {
                console.error('[AUTH] Data isolation check failed:', isolationCheck);
                // In production, could trigger logout or alert
            }
        }
    }, [firebaseUser, activeCompanyId]);

    const value: AuthContextType = {
        firebaseUser,
        authLoading,
        isPlatformAdmin,
        companyMemberships,
        activeCompanyId,
        activeCompany,
        activeRole,
        setActiveCompanyId,
        signOutUser: authService.signOutUser,
        onboardingError,
        clearOnboardingError: () => setOnboardingError(null),
    };

    if (authLoading) return <FullPageSpinner />;

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        // Return safe defaults when used outside of provider (simplifies testing and simple usage)
        return {
            firebaseUser: null,
            authLoading: false,
            isPlatformAdmin: false,
            companyMemberships: [],
            activeCompanyId: null,
            activeCompany: null,
            activeRole: null,
            setActiveCompanyId: (_: string | null) => {},
            signOutUser: async () => {},
            onboardingError: null,
            clearOnboardingError: () => {},
            user: null,
            role: null,
            companyId: null,
        } as unknown as AuthContextType & { user: FirebaseUser | null; role: UserRole | null; companyId: string | null };
    }
    return { ...context, user: context.firebaseUser, role: context.activeRole, companyId: context.activeCompanyId } as AuthContextType & { user: FirebaseUser | null; role: UserRole | null; companyId: string | null };
};

export function useCanWrite(section: WriteableSection): boolean {
  const { activeRole } = useAuth();
  if (!activeRole) return false;
  if (activeRole === UserRole.Owner || activeRole === UserRole.Manager) return true;
  if (activeRole === UserRole.Employee) return section !== 'settings' && section !== 'users';
  return false; // viewer
}