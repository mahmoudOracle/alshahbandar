import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { getFirestoreDb } from './firebase';
import { Receipt } from '../types';

const db = getFirestoreDb();

/**
 * Create a new receipt (payment record).
 * Validates amount and date on client.
 */
export async function createReceipt(
  companyId: string,
  customerId: string,
  customerName: string,
  amount: number,
  method: string,
  date: string,
  note?: string,
  invoiceId?: string,
  invoiceNumber?: string,
  userEmail?: string
): Promise<string> {
  const receiptsRef = collection(db, 'companies', companyId, 'receipts');

  // Validate
  if (!companyId) throw new Error('Company ID is required');
  if (!customerId) throw new Error('Customer ID is required');
  if (amount <= 0) throw new Error('Amount must be greater than 0');
  if (!date) throw new Error('Date is required');
  if (!method) throw new Error('Payment method is required');

  const docRef = await addDoc(receiptsRef, {
    companyId,
    customerId,
    customerName,
    amount,
    method,
    date, // ISO 8601 local time
    note: note || '',
    invoiceId: invoiceId || null,
    invoiceNumber: invoiceNumber || '',
    createdAt: Timestamp.now(),
    createdBy: userEmail || 'unknown',
  });

  return docRef.id;
}

/**
 * Fetch all receipts for a customer (scoped by company).
 */
export async function getReceiptsByCustomerId(
  companyId: string,
  customerId: string
): Promise<Receipt[]> {
  if (!companyId) throw new Error('Company ID is required');
  if (!customerId) throw new Error('Customer ID is required');

  const q = query(
    collection(db, 'companies', companyId, 'receipts'),
    where('customerId', '==', customerId)
  );

  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.() || new Date(),
  } as Receipt));
}

/**
 * Fetch all receipts for a date range (for daily collection page).
 */
export async function getReceiptsByDateRange(
  companyId: string,
  startDate: string,
  endDate: string
): Promise<Receipt[]> {
  if (!companyId) throw new Error('Company ID is required');
  if (!startDate) throw new Error('Start date is required');
  if (!endDate) throw new Error('End date is required');

  const q = query(
    collection(db, 'companies', companyId, 'receipts'),
    where('date', '>=', startDate),
    where('date', '<=', endDate)
  );

  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.() || new Date(),
  } as Receipt));
}

/**
 * Delete a receipt (for corrections/cancellations).
 */
export async function deleteReceipt(
  companyId: string,
  receiptId: string
): Promise<void> {
  if (!companyId) throw new Error('Company ID is required');
  if (!receiptId) throw new Error('Receipt ID is required');

  const docRef = doc(db, 'companies', companyId, 'receipts', receiptId);
  await deleteDoc(docRef);
}

/**
 * Get receipt by ID.
 */
export async function getReceiptById(
  companyId: string,
  receiptId: string
): Promise<Receipt | null> {
  if (!companyId) throw new Error('Company ID is required');
  if (!receiptId) throw new Error('Receipt ID is required');

  const q = query(
    collection(db, 'companies', companyId, 'receipts'),
    where('__name__', '==', receiptId)
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;

  const doc = snap.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.() || new Date(),
  } as Receipt;
}
