import { collectionGroup, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CompanyMembership } from '../../types';
import { withRetry } from '../firestoreService';

// Lightweight membership helper (client-side). Prefer server callables for large-scale queries.
export const getCompanyMembershipsForUid = async (uid: string): Promise<{ companyId: string; membershipData: any }[]> => {
  const usersQuery = query(collectionGroup(db, 'users'), where('uid', '==', uid));
  const querySnapshot = await getDocs(usersQuery);
  const results: { companyId: string; membershipData: any }[] = [];
  for (const userDoc of querySnapshot.docs) {
    const companyId = userDoc.ref.parent.parent?.id;
    if (companyId) results.push({ companyId, membershipData: userDoc.data() });
  }
  return results;
};
