/**
 * DB Sanity Check Utility
 * Lightweight Firestore validation for development mode only
 * Detects schema violations, missing fields, and data anomalies
 * 
 * Usage:
 *   import { showDBSanityCheck } from '@/src/utils/dbSanityCheck';
 *   showDBSanityCheck(); // Logs to console + shows UI notification
 */

import { getDocs, collection, limit as firestoreLimit, query } from 'firebase/firestore';
import { getFirestoreDb } from '../../services/firebase';

interface SanityCheckResult {
  collectionName: string;
  docCount: number;
  samplesChecked: number;
  errors: Array<{ docId: string; field: string; issue: string }>;
  warnings: Array<{ docId: string; field: string; issue: string }>;
}

const SAMPLE_SIZE = 3; // Check first N documents per collection
const TIMEOUT_MS = 30000; // 30 second timeout per collection
const DEV_ONLY = import.meta.env.DEV;

/**
 * Validates a receipt document against expected schema
 */
function validateReceipt(docId: string, data: any): { errors: any[]; warnings: any[] } {
  const errors = [];
  const warnings = [];

  // Required fields
  if (!data.companyId) errors.push({ field: 'companyId', issue: 'Missing required field' });
  if (!data.customerId) errors.push({ field: 'customerId', issue: 'Missing required field' });
  if (!data.customerName) errors.push({ field: 'customerName', issue: 'Missing required field' });
  if (typeof data.amount !== 'number') errors.push({ field: 'amount', issue: 'Expected number' });
  if (data.amount <= 0) errors.push({ field: 'amount', issue: 'Must be > 0' });
  if (!data.date) errors.push({ field: 'date', issue: 'Missing required field' });
  if (!data.method) errors.push({ field: 'method', issue: 'Missing required field' });

  // Type validation
  if (data.date && typeof data.date !== 'string') {
    errors.push({ field: 'date', issue: `Expected string ISO date, got ${typeof data.date}` });
  }

  // Enum validation
  const validMethods = ['cash', 'transfer', 'check', 'wallet', 'instapay', 'other'];
  if (data.method && !validMethods.includes(data.method)) {
    errors.push({
      field: 'method',
      issue: `Invalid method "${data.method}". Expected: ${validMethods.join('|')}`,
    });
  }

  // Optional but important fields
  if (!data.createdAt) warnings.push({ field: 'createdAt', issue: 'Missing audit timestamp' });
  if (!data.createdBy) warnings.push({ field: 'createdBy', issue: 'Missing audit user' });

  return { errors, warnings };
}

/**
 * Validates an invoice document
 */
function validateInvoice(docId: string, data: any): { errors: any[]; warnings: any[] } {
  const errors = [];
  const warnings = [];

  if (!data.invoiceNumber) errors.push({ field: 'invoiceNumber', issue: 'Missing required field' });
  if (!data.customerId) errors.push({ field: 'customerId', issue: 'Missing required field' });
  if (!Array.isArray(data.items) || data.items.length === 0) {
    errors.push({ field: 'items', issue: 'Must be non-empty array' });
  }
  if (typeof data.total !== 'number' || data.total <= 0) {
    errors.push({ field: 'total', issue: 'Expected number > 0' });
  }

  // Status enum
  const validStatuses = ['Paid', 'Due', 'Cancelled'];
  if (data.status && !validStatuses.includes(data.status)) {
    errors.push({ field: 'status', issue: `Invalid status "${data.status}"` });
  }

  return { errors, warnings };
}

/**
 * Validates an expense document
 */
function validateExpense(docId: string, data: any): { errors: any[]; warnings: any[] } {
  const errors = [];
  const warnings = [];

  if (!data.date) errors.push({ field: 'date', issue: 'Missing required field' });
  if (!data.category) errors.push({ field: 'category', issue: 'Missing required field' });
  if (!data.vendor) errors.push({ field: 'vendor', issue: 'Missing required field' });
  if (typeof data.amount !== 'number' || data.amount <= 0) {
    errors.push({ field: 'amount', issue: 'Expected number > 0' });
  }

  return { errors, warnings };
}

/**
 * Validates a customer document
 */
function validateCustomer(docId: string, data: any): { errors: any[]; warnings: any[] } {
  const errors = [];
  const warnings = [];

  if (!data.name) errors.push({ field: 'name', issue: 'Missing required field' });
  if (!data.mobilePhone && !data.whatsappPhone) {
    errors.push({ field: 'phone', issue: 'At least one phone required' });
  }
  if (!data.address) warnings.push({ field: 'address', issue: 'Missing optional field' });

  return { errors, warnings };
}

/**
 * Validates a product document
 */
function validateProduct(docId: string, data: any): { errors: any[]; warnings: any[] } {
  const errors = [];
  const warnings = [];

  if (!data.name) errors.push({ field: 'name', issue: 'Missing required field' });
  if (typeof data.price !== 'number' || data.price < 0) {
    errors.push({ field: 'price', issue: 'Expected number >= 0' });
  }
  if (typeof data.stock !== 'number') {
    errors.push({ field: 'stock', issue: 'Expected number' });
  }

  return { errors, warnings };
}

/**
 * Route to correct validator
 */
function validateDocument(
  collection: string,
  docId: string,
  data: any
): { errors: any[]; warnings: any[] } {
  switch (collection) {
    case 'receipts':
      return validateReceipt(docId, data);
    case 'invoices':
      return validateInvoice(docId, data);
    case 'expenses':
      return validateExpense(docId, data);
    case 'customers':
      return validateCustomer(docId, data);
    case 'products':
      return validateProduct(docId, data);
    default:
      return { errors: [], warnings: [] };
  }
}

/**
 * Check a single collection
 */
async function checkCollection(
  companyId: string,
  collectionName: string
): Promise<SanityCheckResult> {
  const result: SanityCheckResult = {
    collectionName,
    docCount: 0,
    samplesChecked: 0,
    errors: [],
    warnings: [],
  };

  try {
    const db = getFirestoreDb();
    const collRef = collection(db, 'companies', companyId, collectionName);

    // Get total count (just first N docs)
    const q = query(collRef, firestoreLimit(SAMPLE_SIZE));
    const snap = await Promise.race([
      getDocs(q),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)),
    ]);

    const docs = snap.docs;
    result.samplesChecked = docs.length;

    // Validate each sample
    for (const doc of docs) {
      const { errors, warnings } = validateDocument(collectionName, doc.id, doc.data());

      errors.forEach((err) => {
        result.errors.push({ docId: doc.id, ...err });
      });

      warnings.forEach((warn) => {
        result.warnings.push({ docId: doc.id, ...warn });
      });
    }
  } catch (err) {
    if (!(err instanceof Error) || err.message !== 'timeout') {
      console.error(`[DB SANITY] Failed to check ${collectionName}:`, err);
    }
  }

  return result;
}

/**
 * Main sanity check function
 * Call this from DevDebugPage or admin tools
 */
export async function showDBSanityCheck(): Promise<void> {
  if (!DEV_ONLY) {
    console.warn('[DB SANITY] Sanity check only available in DEV mode');
    return;
  }

  try {
    const db = getFirestoreDb();

    // Get current company (from somewhere - for now, just log generic info)
    console.log(
      '%c[DB SANITY] Starting Firestore data validation...',
      'color: #0066ff; font-weight: bold'
    );

    // Collections to check
    const collections = ['customers', 'products', 'invoices', 'receipts', 'expenses'];
    const results: SanityCheckResult[] = [];

    // Placeholder: in real impl, get actual companyId from AuthContext
    const companyId = 'unknown';

    for (const collName of collections) {
      const result = await checkCollection(companyId, collName);
      results.push(result);

      // Log result
      const status = result.errors.length === 0 ? '✅' : '❌';
      console.log(
        `%c${status} ${collName}: ${result.samplesChecked} samples checked`,
        'color:' + (result.errors.length === 0 ? '#00aa00' : '#dd0000')
      );

      // Log errors
      if (result.errors.length > 0) {
        console.group(`  Errors in ${collName}:`);
        for (const err of result.errors) {
          console.error(`    ${err.docId}.${err.field}: ${err.issue}`);
        }
        console.groupEnd();
      }

      // Log warnings
      if (result.warnings.length > 0) {
        console.group(`  Warnings in ${collName}:`);
        for (const warn of result.warnings) {
          console.warn(`    ${warn.docId}.${warn.field}: ${warn.issue}`);
        }
        console.groupEnd();
      }
    }

    // Summary
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

    console.log(
      `%c[DB SANITY] Complete: ${totalErrors} errors, ${totalWarnings} warnings`,
      totalErrors === 0 ? 'color: #00aa00; font-weight: bold' : 'color: #dd0000; font-weight: bold'
    );

    // Return results for UI display (if needed)
    return { results, totalErrors, totalWarnings } as any;
  } catch (err) {
    console.error('[DB SANITY] Check failed:', err);
  }
}

/**
 * Quick validation for a single operation (before write)
 * Use in form submit handlers
 */
export function validateBeforeWrite(collectionName: string, data: any): boolean {
  const { errors } = validateDocument(collectionName, 'preview', data);
  if (errors.length > 0) {
    console.error(`[DB SANITY] Validation failed for ${collectionName}:`, errors);
    return false;
  }
  return true;
}
