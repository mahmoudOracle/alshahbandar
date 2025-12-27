import { collectionGroup, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

// Lightweight membership helper (client-side). Prefer server callables for large-scale queries.
export const getCompanyMembershipsForUid = async (uid: string): Promise<{ companyId: string; membershipData: Record<string, unknown> }[]> => {
  const usersQuery = query(collectionGroup(db, 'users'), where('uid', '==', uid));
  const querySnapshot = await getDocs(usersQuery);
  const results: { companyId: string; membershipData: Record<string, unknown> }[] = [];
  for (const userDoc of querySnapshot.docs) {
    const companyId = userDoc.ref.parent.parent?.id;
    if (companyId) results.push({ companyId, membershipData: userDoc.data() as Record<string, unknown> });
  }
  return results;
};
