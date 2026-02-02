import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { getFirestoreDb } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import {
  FirestoreOperationLog,
  getRecentFirestoreOperations,
  subscribeFirestoreOperations,
} from '../../services/devOperationLogger';
import { getTenantConfigDiagnostics } from '../../services/config/tenantConfig';
import { ENV, EnvConfigError } from '../../src/config/env';
import { clearSetup } from '../../src/config/runtimeSetup';

const MEMBER_ROLES = new Set(['owner', 'manager', 'staff']);
const DEFAULT_COLLECTION_LIMIT = 100;
const COLLECTION_LIST = [
  'customers',
  'products',
  'invoices',
  'payments',
  'returns',
  'stockLedger',
  'suppliers',
  'settings',
  'counters',
  'drafts',
  'users',
  'members',
];

type MembershipStatus = {
  path: string;
  label: string;
  exists: boolean;
  role: string | null;
  summary: string;
};

const suiteRole = (role: unknown): string | null => {
  if (!role) return null;
  if (typeof role === 'string') return role;
  if (typeof role === 'object') {
    const record = role as Record<string, unknown>;
    if (typeof record.role === 'string') return record.role;
    if (typeof record.memberRole === 'string') return record.memberRole;
    if (typeof record.roleName === 'string') return record.roleName;
  }
  return null;
};

const maskCompanyId = (value: string): string => {
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
};

const DevDbInspector: React.FC = () => {
  if (!ENV.isDev) {
    return <Navigate to="/unauthorized" replace />;
  }

  const { user, status } = useAuth();
  const uid = user?.uid ?? null;
  const db = getFirestoreDb();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [envError, setEnvError] = useState<string | null>(null);
  const [inspectorError, setInspectorError] = useState<string | null>(null);
  const [tenantConfigDiag, setTenantConfigDiag] = useState(getTenantConfigDiagnostics());
  const [companyDoc, setCompanyDoc] = useState<{
    exists: boolean;
    name?: string | null;
    isActive: boolean | null;
  } | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus[]>([]);
  const [operations, setOperations] = useState<FirestoreOperationLog[]>(getRecentFirestoreOperations());
  const [tenantLimit, setTenantLimit] = useState(DEFAULT_COLLECTION_LIMIT);
  const [tenantData, setTenantData] = useState<Record<string, unknown[]>>({});
  const [tenantLoading, setTenantLoading] = useState(false);
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [migrationMessage, setMigrationMessage] = useState<string | null>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    try {
      setCompanyId(ENV.companyId);
    } catch (err) {
      setEnvError(err instanceof EnvConfigError ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    if (!ENV.isDev) return undefined;
    return subscribeFirestoreOperations((ops) => setOperations(ops));
  }, []);

  useEffect(() => {
    if (!ENV.isDev) return undefined;
    const handle = setInterval(() => {
      setTenantConfigDiag(getTenantConfigDiagnostics());
    }, 1500);
    return () => clearInterval(handle);
  }, []);

  useEffect(() => {
    if (!ENV.isDev) return undefined;
    let isMounted = true;

    const fetchInfo = async () => {
      if (!companyId || !uid) {
        setCompanyDoc(null);
        setMembershipStatus([]);
        return;
      }
      setInspectorError(null);

      try {
        const companyRef = doc(db, 'companies', companyId);
        const companySnap = await getDoc(companyRef);
        if (!isMounted) return;

        const companyData = companySnap.exists() ? companySnap.data() : null;
        setCompanyDoc({
          exists: companySnap.exists(),
          name: companyData?.name ?? null,
          isActive:
            companyData && typeof companyData.isActive === 'boolean' ? companyData.isActive : null,
        });

        const memberRefs = [
          {
            label: 'members',
            path: `companies/${companyId}/members/${uid}`,
            ref: doc(db, 'companies', companyId, 'members', uid),
          },
          {
            label: 'users',
            path: `companies/${companyId}/users/${uid}`,
            ref: doc(db, 'companies', companyId, 'users', uid),
          },
        ];

        const rootUserRef = doc(db, 'users', uid);
        const [membersSnap, usersSnap, rootUserSnap] = await Promise.all([
          getDoc(memberRefs[0].ref),
          getDoc(memberRefs[1].ref),
          getDoc(rootUserRef),
        ]);

        const memberships =
          rootUserSnap.exists() && typeof rootUserSnap.data()?.memberships === 'object'
            ? (rootUserSnap.data()?.memberships ?? {})
            : {};

        const rootEntry = memberships[companyId];
        const rootRole = suiteRole(rootEntry);

        const statuses: MembershipStatus[] = [
          {
            label: 'members',
            path: memberRefs[0].path,
            exists: membersSnap.exists(),
            role: suiteRole(membersSnap.data()?.role),
            summary: membersSnap.exists()
              ? JSON.stringify(membersSnap.data())
              : 'document missing',
          },
          {
            label: 'users',
            path: memberRefs[1].path,
            exists: usersSnap.exists(),
            role: suiteRole(usersSnap.data()?.role),
            summary: usersSnap.exists()
              ? JSON.stringify(usersSnap.data())
              : 'document missing',
          },
          {
            label: 'root memberships',
            path: `users/${uid}.memberships`,
            exists: Boolean(rootEntry),
            role: rootRole,
            summary: rootEntry ? JSON.stringify(rootEntry) : 'entry missing',
          },
        ];

        if (!isMounted) return;
        setMembershipStatus(statuses);
      } catch (err) {
        if (!isMounted) return;
        setInspectorError(err instanceof Error ? err.message : String(err));
      }
    };

    fetchInfo();

    return () => {
      isMounted = false;
    };
  }, [companyId, uid, reloadKey]);

  const createMemberDoc = useCallback(async () => {
    if (!companyId || !uid || !user) return;
    setMigrationError(null);
    setMigrationMessage(null);
    setMigrationLoading(true);
    try {
      const memberRef = doc(db, 'companies', companyId, 'members', uid);
      const existing = await getDoc(memberRef);
      const existingRole = suiteRole(existing.data()?.role);
      if (existing.exists() && existingRole && MEMBER_ROLES.has(existingRole.toLowerCase())) {
        setMigrationMessage(`members/${uid} already exists with role=${existingRole}`);
        return;
      }

      let source: 'legacy-users' | 'root-memberships' | null = null;
      let role: string | null = null;

      const legacyRef = doc(db, 'companies', companyId, 'users', uid);
      const legacySnap = await getDoc(legacyRef);
      if (legacySnap.exists()) {
        const legacyRole = suiteRole(legacySnap.data()?.role);
        if (legacyRole) {
          source = 'legacy-users';
          role = legacyRole.toLowerCase();
        }
      }

      if (!role) {
        const rootRef = doc(db, 'users', uid);
        const rootSnap = await getDoc(rootRef);
        const memberships =
          rootSnap.exists() && typeof rootSnap.data()?.memberships === 'object'
            ? (rootSnap.data()?.memberships ?? {})
            : {};
        const entry = memberships[companyId];
        const entryRole = suiteRole(entry);
        if (entryRole) {
          source = 'root-memberships';
          role = entryRole.toLowerCase();
        }
      }

      if (!role) {
        throw new Error('No legacy membership found for current user.');
      }

      await setDoc(
        memberRef,
        {
          role,
          email: user.email ?? undefined,
          createdAt: serverTimestamp(),
          createdBy: 'dev-inspector',
          source,
        },
        { merge: true }
      );

      setMigrationMessage(`members/${uid} created with role=${role}`);
      setReloadKey((prev) => prev + 1);
    } catch (err) {
      if (err instanceof Error) {
        setMigrationError(err.message);
      } else {
        setMigrationError('Migration failed');
      }
    } finally {
      setMigrationLoading(false);
    }
  }, [companyId, user]);

  const copyReport = async () => {
    const lines: string[] = [
      `Dev DB Inspector report - ${new Date().toISOString()}`,
      `Mode: ${ENV.mode}`,
      `DEV: ${ENV.isDev}`,
      `Company ID: ${companyId || 'missing'}`,
      `User: ${user ? `${user.uid} (${user.email ?? 'no email'})` : 'not signed in'}`,
      `Auth status: ${status}`,
      companyDoc
        ? `Company doc: exists=${companyDoc.exists}, name=${companyDoc.name}, isActive=${
            companyDoc.isActive === null ? 'undefined (treated as true)' : companyDoc.isActive
          }`
        : 'Company doc: unavailable',
      'Membership checks:',
      ...membershipStatus.map(
        (mem) =>
          `- ${mem.label} (${mem.path}): ${mem.exists ? 'found' : 'missing'} | role=${
            mem.role || 'unknown'
          }`
      ),
      'Recent operations:',
      ...operations.map(
        (op) =>
          `- ${new Date(op.timestamp).toLocaleString()}: ${op.method} (${op.durationMs}ms) args=[${op.argsPreview}]`
      ),
    ];

    const payload = lines.join('\n');
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = payload;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2400);
    } catch {
      setCopySuccess(false);
    }
  };

  const fetchTenantData = async (limit: number) => {
    if (!companyId) return {};
    setTenantLoading(true);
    setTenantError(null);
    try {
      const data: Record<string, unknown[]> = {};
      for (const collectionName of COLLECTION_LIST) {
        const colRef = collection(db, 'companies', companyId, collectionName);
        const snap = await getDocs(query(colRef, firestoreLimit(limit)));
        data[collectionName] = snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
      }
      setTenantData(data);
      return data;
    } catch (err) {
      setTenantError(String(err));
      return {};
    } finally {
      setTenantLoading(false);
    }
  };

  const exportTenantData = async () => {
    if (!companyId) return;
    const data = await fetchTenantData(tenantLimit);
    const payload = JSON.stringify(
      {
        companyId,
        fetchedAt: new Date().toISOString(),
        data,
      },
      null,
      2
    );
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tenant-data-${companyId}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const loadMoreTenantData = () => {
    const next = tenantLimit + DEFAULT_COLLECTION_LIMIT;
    setTenantLimit(next);
    fetchTenantData(next);
  };

  const operationsList = useMemo(() => operations.slice(0, 50), [operations]);

  if (envError) {
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', color: '#0f172a' }}>
        <h1>Dev DB Inspector</h1>
        <p style={{ color: '#dc2626' }}>{envError}</p>
      </div>
    );
  }

  if (!uid) {
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', color: '#0f172a' }}>
        <h1>Dev DB Inspector</h1>
        <p style={{ color: '#dc2626', maxWidth: 560 }}>
          غير مسجل الدخول. افتح صفحة تسجيل الدخول ثم ارجع إلى /dev/db.
        </p>
      </div>
    );
  }

  if (inspectorError) {
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', color: '#0f172a' }}>
        <h1>Dev DB Inspector</h1>
        <p style={{ color: '#dc2626', maxWidth: 560 }}>{inspectorError}</p>
        <button
          type="button"
          onClick={() => {
            setInspectorError(null);
            setReloadKey((prev) => prev + 1);
          }}
          style={{
            marginTop: 16,
            padding: '10px 14px',
            borderRadius: 6,
            border: '1px solid rgba(15,23,42,0.2)',
            background: '#0f172a',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Retry inspection
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif', color: '#0f172a' }}>
      <h1>Dev DB Inspector</h1>
      <p style={{ maxWidth: 600 }}>
        This page exists only while `import.meta.env.DEV` is true. Use it to inspect schema assumptions without
        opening the console.
      </p>

      <section style={{ marginTop: 16 }}>
        <h2>Env</h2>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            padding: 10,
            background: '#f8fafc',
            borderRadius: 8,
            border: '1px solid rgba(148,163,184,0.5)',
          }}
        >
          <div>
            <strong>Mode:</strong> {ENV.mode}
          </div>
          <div>
            <strong>DEV:</strong> {String(ENV.isDev)}
          </div>
          <div>
            <strong>Company:</strong> {companyId ? maskCompanyId(companyId) : 'loading…'}
          </div>
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>Tenant config diagnostics</h2>
        <div
          style={{
            padding: 10,
            borderRadius: 8,
            background: '#e0f2fe',
            border: '1px solid rgba(56,189,248,0.6)',
          }}
        >
          <div>
            <strong>Last attempted path:</strong>{' '}
            {tenantConfigDiag?.path ?? 'not requested yet'}
          </div>
          <div>
            <strong>Error:</strong> {tenantConfigDiag?.error ?? 'none'}
          </div>
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>Basics</h2>
        <ul>
          <li>
            Company ID: <strong>{companyId || 'missing'}</strong>
          </li>
          <li>
            User: <strong>{user ? `${user.uid} (${user.email ?? 'no email'})` : 'not signed in'}</strong>
          </li>
          <li>Status: <strong>{status}</strong></li>
        </ul>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>Company document</h2>
        {companyDoc ? (
          <div
            style={{
              padding: 12,
              background: '#f1f5f9',
              borderRadius: 8,
              border: '1px solid rgba(148,163,184,0.5)',
            }}
          >
            <div>Exists: {companyDoc.exists ? 'yes' : 'no'}</div>
            <div>Name: {companyDoc.name ?? 'unknown'}</div>
            <div>
              isActive:{' '}
              <strong>
                {companyDoc.isActive === null ? 'undefined (treated as true)' : String(companyDoc.isActive)}
              </strong>
            </div>
            {companyDoc.exists && companyDoc.isActive === null && (
              <p style={{ color: '#b45309', marginTop: 4 }}>
                Warning: `isActive` is missing; legacy data defaults to true here.
              </p>
            )}
          </div>
        ) : (
          <div>Company document missing or not yet loaded.</div>
        )}
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>Membership sources</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {membershipStatus.map((mem) => (
            <div
              key={mem.path}
              style={{
                padding: 12,
                borderRadius: 8,
                border: '1px solid rgba(148,163,184,0.5)',
                background: '#fff',
              }}
            >
              <div style={{ fontSize: 12, color: '#475569' }}>{mem.label}</div>
              <div>
                <strong>Path:</strong> {mem.path}
              </div>
              <div>
                <strong>Status:</strong> {mem.exists ? 'found' : 'missing'}
              </div>
              <div>
                <strong>Role:</strong>{' '}
                {mem.role
                  ? `${mem.role} (${MEMBER_ROLES.has(mem.role.toLowerCase()) ? 'authorized' : 'no match'})`
                  : 'unknown'}
              </div>
              <div style={{ fontSize: 11, color: '#475569' }}>Summary: {mem.summary}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>Actions</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={copyReport}
            style={{
              padding: '10px 14px',
              borderRadius: 6,
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Copy report
          </button>
          <button
            type="button"
            onClick={exportTenantData}
            disabled={tenantLoading || !companyId}
            style={{
              padding: '10px 14px',
              borderRadius: 6,
              border: '1px solid rgba(15,23,42,0.2)',
              background: '#fff',
              cursor: 'pointer',
            }}
            >
              Export tenant data (JSON)
          </button>
          <button
            type="button"
            onClick={loadMoreTenantData}
            disabled={tenantLoading}
            style={{
              padding: '10px 14px',
              borderRadius: 6,
              border: '1px solid rgba(15,23,42,0.2)',
              background: '#fff',
              cursor: 'pointer',
            }}
            >
              Load more ({tenantLimit} per collection)
            </button>
          {ENV.isDev && (
            <button
              type="button"
              onClick={() => {
                clearSetup();
                window.location.assign('/setup/firebase');
              }}
              style={{
                padding: '10px 14px',
                borderRadius: 6,
                border: '1px solid rgba(15,23,42,0.2)',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              Reset setup (DEV)
            </button>
          )}
        </div>
        {copySuccess && <div style={{ color: '#047857', marginTop: 4 }}>Report copied!</div>}
        {tenantError && <div style={{ color: '#dc2626', marginTop: 4 }}>{tenantError}</div>}
      </section>
      {ENV.isDev && (
        <section style={{ marginTop: 16 }}>
          <h2>Migration helper (DEV)</h2>
          <p style={{ margin: '4px 0' }}>
            DEV tool. Writes to `companies/{companyId}/members/{uid}` using legacy data; click only once per user.
          </p>
          <button
            type="button"
            onClick={createMemberDoc}
            disabled={migrationLoading || !companyId || !user}
            style={{
              padding: '10px 14px',
              borderRadius: 6,
              border: '1px solid rgba(15,23,42,0.2)',
              background: '#0f172a',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            {migrationLoading ? 'Migrating…' : 'Create members doc from legacy (DEV)'}
          </button>
          {migrationMessage && (
            <div style={{ color: '#047857', marginTop: 6 }}>{migrationMessage}</div>
          )}
          {migrationError && (
            <div style={{ color: '#dc2626', marginTop: 6 }}>{migrationError}</div>
          )}
        </section>
      )}

      <section style={{ marginTop: 24 }}>
        <h2>Tenant data snapshot</h2>
        {tenantLoading && <p>Fetching collections…</p>}
        {!tenantLoading && Object.keys(tenantData).length === 0 && (
          <p>Click “Export tenant data” to fetch a sample snapshot.</p>
        )}
        {Object.entries(tenantData).map(([collectionName, docs]) => (
          <div key={collectionName} style={{ marginBottom: 16 }}>
            <strong>{collectionName}</strong> ({docs.length} documents fetched)
            <div
              style={{
                marginTop: 6,
                background: '#f1f5f9',
                borderRadius: 8,
                padding: 8,
                maxHeight: '180px',
                overflowY: 'auto',
                fontSize: 12,
              }}
            >
              {docs.map((docItem, index) => (
                <div key={`${collectionName}-${index}`} style={{ marginBottom: 4 }}>
                  <div>
                    <strong>{docItem['id']}</strong>
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontSize: 11,
                    }}
                  >
                    {JSON.stringify(docItem, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Recent Firestore operations (DEV only)</h2>
        {operationsList.length === 0 && <p>No operations recorded yet.</p>}
        <div
          style={{
            maxHeight: '240px',
            overflowY: 'auto',
            background: '#fff',
            borderRadius: 8,
            border: '1px solid rgba(148,163,184,0.4)',
            padding: 12,
            fontSize: 12,
          }}
        >
          {operationsList.map((op, idx) => (
            <div
              key={`${op.timestamp}-${idx}`}
              style={{
                marginBottom: 10,
                borderBottom: idx < operationsList.length - 1 ? '1px solid #e2e8f0' : 'none',
                paddingBottom: 8,
              }}
            >
              <div>
                <strong>{op.method}</strong> · {op.durationMs}ms
              </div>
              <div style={{ fontSize: 11, color: '#475569' }}>{new Date(op.timestamp).toLocaleString()}</div>
              <div style={{ fontSize: 11 }}>args: {op.argsPreview || 'n/a'}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default DevDbInspector;
