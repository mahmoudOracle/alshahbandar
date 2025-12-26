import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Company } from '../../types';

export const getCompany = async (tenantId: string): Promise<Company | null> => {
  const ref = doc(db, 'companies', tenantId);
  const snap = await getDoc(ref);
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as any) } as Company) : null;
};

export const createCompany = async (tenantId: string, data: Partial<Company>) => {
  const ref = doc(db, 'companies', tenantId);
  await setDoc(ref, { ...data, createdAt: Timestamp.now() }, { merge: true });
  return tenantId;
};
