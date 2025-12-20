import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { UserRole, CompanyMembership } from '../types';
import * as authService from '../services/authService';
import * as dataService from '../services/dataService';
import { getUserProfile, getCompany, getCompanyMembershipByUid } from '../services/firestoreService';
import { FullPageSpinner } from '../components/Spinner';
import { useNotification } from '../contexts/NotificationContext';
import { DEBUG_MODE } from '../config';

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
    const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(() => {
        try {
            return localStorage.getItem(ACTIVE_COMPANY_ID_KEY);
        } catch (e) { /* ignore localStorage read errors (privacy/browser settings) */ return null; }
    });
    const [onboardingError, setOnboardingError] = useState<string | null>(null);

    const notify = useNotification();

    const setActiveCompanyId = useCallback((companyId: string | null) => {
        setActiveCompanyIdState(companyId);
        try {
            if (companyId) localStorage.setItem(ACTIVE_COMPANY_ID_KEY, companyId);
            else localStorage.removeItem(ACTIVE_COMPANY_ID_KEY);
        } catch (e) { /* ignore localStorage write errors (privacy/browser settings) */ }
    }, []);

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

                const isAdmin = await dataService.checkIfPlatformAdmin(user.uid);
                setIsPlatformAdmin(isAdmin);
                if (DEBUG_MODE) console.log(`🔍 [AUTH] isPlatformAdmin: ${isAdmin}`);

                // Fetch user profile to determine company association
                const profile = await getUserProfile(user.uid);
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

                // Fetch company and check status (with permission-failure fallback diagnostics)
                if (DEBUG_MODE) console.log('🔍 [FIRESTORE] Fetching company for companyId:', companyId);
                let company = null;
                try {
                    company = await getCompany(companyId);
                    if (!company) {
                        if (DEBUG_MODE) console.warn('🟡 [FIRESTORE] Company not found for companyId:', companyId);
                        setOnboardingError('لم يتم العثور على الشركة المرتبطة بحسابك.');
                        setCompanyMemberships([]);
                        setActiveCompanyIdState(null);
                        setAuthLoading(false);
                        return;
                    }
                } catch (companyErr: any) {
                    // If permission denied, attempt to read membership doc for clearer diagnostics
                    if (companyErr?.code === 'permission-denied' || /permission/i.test(companyErr?.message || '')) {
                        if (DEBUG_MODE) console.warn('[AUTH][DIAG] Permission denied reading company. Attempting membership check...', companyErr?.message || companyErr);
                        try {
                            const membership = await getCompanyMembershipByUid(companyId, user.uid);
                            if (membership) {
                                console.error('[AUTH][DIAG] Membership exists but company read was denied. Check Firestore rules or company-level restrictions.', { companyId, uid: user.uid });
                                setOnboardingError('تم العثور على عضويتك، لكن لا يمكن الوصول إلى بيانات الشركة بسبب قواعد الأمان. تحقق من إعدادات القواعد.');
                            } else {
                                if (DEBUG_MODE) console.warn('[AUTH][DIAG] No membership document found for user', { companyId, uid: user.uid });
                                setOnboardingError('لم يتم العثور على عضويتك في الشركة. يرجى التواصل مع الدعم.');
                            }
                        } catch (memErr) {
                            console.error('[AUTH][DIAG] Failed to read membership doc during fallback check', memErr);
                            setOnboardingError('حدث خطأ أثناء التحقق من حالة العضوية. تواصل مع الدعم.');
                        }
                        setCompanyMemberships([]);
                        setActiveCompanyIdState(null);
                        setAuthLoading(false);
                        return;
                    }
                    // Re-throw unexpected errors
                    throw companyErr;
                }

                if (DEBUG_MODE) console.log('🟢 [FIRESTORE] Company retrieved:', { companyId, status: company.status });
                // Validate required company fields
                const requiredFields = ['companyName', 'companyAddress', 'country', 'city', 'phone', 'email', 'ownerUid', 'status', 'createdAt'];
                const missing = requiredFields.filter(f => !(f in company));
                if (missing.length > 0) {
                    console.warn('🟡 [DATA] Company document missing required fields:', missing, company);
                    setOnboardingError('بيانات الشركة غير كاملة. يرجى إكمال إعدادات الشركة أو التواصل مع الدعم.');
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

                // Approved: set membership and active company
                if (DEBUG_MODE) console.log('🟢 [ACCESS] Company approved, proceeding to set membership for companyId:', companyId);
                const membership: CompanyMembership = { companyId, companyName: company.companyName, role: (profile.role as UserRole) || UserRole.Owner, status: 'active' };
                setCompanyMemberships([membership]);
                setActiveCompanyIdState(companyId);
                setActiveCompany(company);
                setOnboardingError(null);
                setAuthLoading(false);
            } catch (err: any) {
                console.error('🔴 [AUTH] Error during auth processing:', err);
                if (DEBUG_MODE) console.error('🔴 [AUTH] error details:', err?.message || err);
                // Detect offline/network errors and display a helpful message
                const msg = String(err?.message || '').toLowerCase();
                if (err?.code === 'client-offline' || /client offline|failed to reach firestore|could not reach cloud firestore|net::err_connection_closed/.test(msg)) {
                    console.error('🔴 [AUTH] Network/offline detected while accessing Firestore', err);
                    setOnboardingError('تعذر الاتصال بخوادمنا. تحقق من اتصال الإنترنت وحاول مرة أخرى.');
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
        throw new Error('useAuth must be used within an AuthProvider');
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