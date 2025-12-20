import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function DevDebugPage() {
  const { user, companyId } = useAuth();
  const [userDoc, setUserDoc] = useState<any>(null);
  const [companyDoc, setCompanyDoc] = useState<any>(null);
  const [membershipDoc, setMembershipDoc] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [approvingCompany, setApprovingCompany] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setError(null);
      try {
        if (!user) return setError('No firebase user (not signed in)');
        const uid = user.uid;
        const uRef = doc(db, 'users', uid);
        const uSnap = await getDoc(uRef);
        setUserDoc(uSnap.exists() ? uSnap.data() : null);

        if (!companyId) return setError('No companyId on user profile');
        const cRef = doc(db, 'companies', companyId);
        const cSnap = await getDoc(cRef);
        setCompanyDoc(cSnap.exists() ? cSnap.data() : null);

        const mRef = doc(db, 'companies', companyId, 'users', uid);
        const mSnap = await getDoc(mRef);
        setMembershipDoc(mSnap.exists() ? mSnap.data() : null);
      } catch (e: any) {
        setError(e?.message || String(e));
      }
    };
    load();
  }, [user, companyId]);

  // Hide page when running in production
  const isProd = (import.meta as any).env && (import.meta as any).env.PROD;
  if (isProd) return <div className="p-6">Dev debug is disabled in production.</div>;

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Dev Debug</h2>
      {error && <div className="mb-4 text-red-600">Error: {error}</div>}
      {success && <div className="mb-4 text-green-600">{success}</div>}
      <div className="mb-4">
        <h3 className="font-semibold">Auth User</h3>
        <pre className="bg-gray-100 p-3 rounded">{JSON.stringify(user || null, null, 2)}</pre>
      </div>
      <div className="mb-4">
        <h3 className="font-semibold">users/{user?.uid}</h3>
        <pre className="bg-gray-100 p-3 rounded">{JSON.stringify(userDoc, null, 2)}</pre>
      </div>
      <div className="mb-4">
        <h3 className="font-semibold">companies/{companyId}</h3>
        <pre className="bg-gray-100 p-3 rounded">{JSON.stringify(companyDoc, null, 2)}</pre>
      </div>
      <div className="mb-4">
        <h3 className="font-semibold">companies/{companyId}/users/{user?.uid}</h3>
        <pre className="bg-gray-100 p-3 rounded">{JSON.stringify(membershipDoc, null, 2)}</pre>
      </div>

      {!( (import.meta as any).env && (import.meta as any).env.PROD ) && user && companyId && (
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Dev Actions</h3>
          <p className="text-sm text-gray-600 mb-2">Create a membership document for the current user under the company (dev-only).</p>
          <div className="flex gap-2">
            <button
              disabled={creating}
              onClick={async () => {
                if (!user || !companyId) return setError('Missing user or companyId');
                if (!window.confirm('Create membership document for this user?')) return;
                setCreating(true);
                setError(null);
                setSuccess(null);
                try {
                  const mRef = doc(db, 'companies', companyId, 'users', user.uid);
                  await setDoc(mRef, { uid: user.uid, role: 'owner', email: user.email || null, joinedAt: serverTimestamp() }, { merge: true });
                  setMembershipDoc({ uid: user.uid, role: 'owner', email: user.email || null, joinedAt: new Date().toISOString() });
                  setSuccess('Membership document created successfully.');
                } catch (e: any) {
                  setError(e?.message || String(e));
                }
                setCreating(false);
              }}
              className="btn-primary bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              {creating ? 'Creating...' : 'Create Membership Doc'}
            </button>
            <button
              disabled={creatingProfile}
              onClick={async () => {
                if (!user || !companyId) return setError('Missing user or companyId');
                if (!window.confirm('Create top-level users/{uid} profile for this user?')) return;
                setCreatingProfile(true);
                setError(null);
                setSuccess(null);
                try {
                  const uRef = doc(db, 'users', user.uid);
                  await setDoc(uRef, { uid: user.uid, name: user.displayName || user.email || null, email: user.email || null, emailLower: (user.email || '')?.toLowerCase(), companyId, role: 'company_owner', createdAt: serverTimestamp() }, { merge: true });
                  setUserDoc({ uid: user.uid, name: user.displayName || user.email || null, email: user.email || null, companyId, role: 'company_owner', createdAt: new Date().toISOString() });
                  setSuccess('Top-level user profile created/updated successfully.');
                } catch (e: any) {
                  setError(e?.message || String(e));
                }
                setCreatingProfile(false);
              }}
              className="btn-primary bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              {creatingProfile ? 'Creating profile...' : 'Create Top-level User Profile'}
            </button>
            <button
              disabled={approvingCompany}
              onClick={async () => {
                if (!companyId) return setError('Missing companyId');
                if (!window.confirm(`Set companies/${companyId}.status = 'approved'?`)) return;
                setApprovingCompany(true);
                setError(null);
                setSuccess(null);
                try {
                  const cRef = doc(db, 'companies', companyId);
                  await setDoc(cRef, { status: 'approved', updatedAt: serverTimestamp() }, { merge: true });
                  setCompanyDoc({ ...(companyDoc || {}), status: 'approved', updatedAt: new Date().toISOString() });
                  setSuccess('Company status set to approved.');
                } catch (e: any) {
                  setError(e?.message || String(e));
                }
                setApprovingCompany(false);
              }}
              className="btn-primary bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded"
            >
              {approvingCompany ? 'Approving...' : 'Approve Company'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
