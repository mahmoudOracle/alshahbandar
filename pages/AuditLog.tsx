import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const AuditLog: React.FC = () => {
  const { companyId } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    (async () => {
      try {
        // Lightweight read via client-side Firestore helper (services/firestoreService has helpers)
        const { getAuditLogs } = await import('../services/firestoreService');
        const logs = await getAuditLogs(companyId, { limit: 100 });
        setEntries(logs || []);
      } catch (e) {
        console.warn('Could not load audit logs', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [companyId]);

  if (!companyId) return <div className="p-6">Select a company to view audit logs.</div>;
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Audit Trail</h2>
      {loading ? <p>Loading...</p> : null}
      <div className="space-y-3">
        {entries.map((e, i) => (
          <div key={i} className="p-3 bg-white border rounded shadow-sm">
            <div className="text-sm text-gray-600">
              {new Date(
                e.performedAt?.toDate ? e.performedAt.toDate() : e.performedAt || Date.now()
              ).toLocaleString()}
            </div>
            <div className="font-medium">{e.action}</div>
            <div className="text-xs text-gray-500">By: {e.performedBy || 'system'}</div>
            <details className="mt-2 text-xs text-gray-700">
              <summary className="cursor-pointer">Details</summary>
              <pre className="whitespace-pre-wrap mt-2 text-xs">
                {JSON.stringify({ before: e.before, after: e.after, meta: e.meta }, null, 2)}
              </pre>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AuditLog;
