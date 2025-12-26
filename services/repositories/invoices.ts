import { collection, getDocs, query, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { db } from '../firebase';
import { Invoice } from '../../types';

export const getInvoices = async (tenantId: string, limit = 50): Promise<Invoice[]> => {
  const q = query(collection(db, 'companies', tenantId, 'invoices'), orderBy('createdAt', 'desc'), firestoreLimit(limit));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Invoice));
};
