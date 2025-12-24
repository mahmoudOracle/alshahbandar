// Simple verification script to inspect company, membership, and user profile
// Usage:
// node ./scripts/checkCompanyDocs.js <serviceAccountPath>
// or place service-account.json in repo root and run without args

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

const cliPath = process.argv[2];
const envPath = process.env.SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
let saPath = cliPath || envPath;
if (!saPath) {
  const root = path.resolve(__dirname, '..');
  const candidates = [
    path.join(root, 'service-account.json'),
    path.join(root, 'serviceAccountKey.json'),
  ];
  for (const c of candidates) if (fs.existsSync(c)) { saPath = c; break; }
}

if (!saPath) {
  console.error('Service account JSON not found. Provide path as arg or set SERVICE_ACCOUNT_PATH.');
  process.exit(2);
}

process.env.GOOGLE_APPLICATION_CREDENTIALS = saPath;
admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

const OWNER_EMAIL = process.env.OWNER_EMAIL || 'hoodaalawamry@gmail.com';
const COMPANY_ID = process.env.COMPANY_ID || 'uv9acIebvvNgx9ftSnPh';

async function run() {
  try {
    console.log('[check] Using service account:', saPath);
    const userRecord = await admin.auth().getUserByEmail(OWNER_EMAIL);
    console.log('[check] Found user:', { uid: userRecord.uid, email: userRecord.email });

    const companyRef = db.collection('companies').doc(COMPANY_ID);
    const compSnap = await companyRef.get();
    if (!compSnap.exists) {
      console.warn('[check] Company doc not found:', COMPANY_ID);
    } else {
      console.log('[check] Company doc:', { id: compSnap.id, data: compSnap.data() });
    }

    const membershipRef = db.collection('companies').doc(COMPANY_ID).collection('users').doc(userRecord.uid);
    const memSnap = await membershipRef.get();
    if (!memSnap.exists) {
      console.warn('[check] Membership doc not found for uid under company');
    } else {
      console.log('[check] Membership doc:', memSnap.data());
    }

    const profileRef = db.collection('users').doc(userRecord.uid);
    const profSnap = await profileRef.get();
    if (!profSnap.exists) {
      console.warn('[check] Top-level user profile not found');
    } else {
      console.log('[check] User profile:', profSnap.data());
    }

    process.exit(0);
  } catch (err) {
    console.error('[check] Failed:', err);
    process.exit(3);
  }
}

run();
