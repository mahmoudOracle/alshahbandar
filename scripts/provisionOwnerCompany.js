// One-time admin provisioning script
// Usage (PowerShell):
// $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"; $env:OWNER_EMAIL='hoodaalawamry@gmail.com'; node .\scripts\provisionOwnerCompany.js
// Optional: set COMPANY_ID and COMPANY_NAME and PLATFORM_ADMIN=true

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Allow passing a service account path as the first CLI argument,
// or via env var `SERVICE_ACCOUNT_PATH` or `GOOGLE_APPLICATION_CREDENTIALS`.
// If none provided, attempt to auto-detect common filenames in the repo root.
const cliPath = process.argv[2];
const envPath = process.env.SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;

let saPath = cliPath || envPath;
if (!saPath) {
  const root = path.resolve(__dirname, '..');
  const candidates = [
    path.join(root, 'service-account.json'),
    path.join(root, 'serviceAccountKey.json'),
    path.join(root, 'firebase-service-account.json'),
    path.join(root, 'firebase-adminsdk.json'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) { saPath = c; break; }
  }
}

if (!saPath) {
  console.error('ERROR: Service account JSON not found. Provide it as the first argument, set SERVICE_ACCOUNT_PATH, or place a file named service-account.json in the project root.');
  console.error('Example (PowerShell):');
  console.error('  node .\\scripts\\provisionOwnerCompany.js C:\\path\\to\\service-account.json');
  process.exit(1);
}

process.env.GOOGLE_APPLICATION_CREDENTIALS = saPath;
admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

const OWNER_EMAIL = process.env.OWNER_EMAIL || 'hoodaalawamry@gmail.com';
const COMPANY_ID = process.env.COMPANY_ID || `owner-${Date.now()}`;
const COMPANY_NAME = process.env.COMPANY_NAME || `${OWNER_EMAIL.split('@')[0]}'s Company`;
const MAKE_PLATFORM_ADMIN = (process.env.PLATFORM_ADMIN || 'false').toLowerCase() === 'true';

async function run() {
  try {
    console.log('[provision] Looking up user by email:', OWNER_EMAIL);
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(OWNER_EMAIL);
    } catch (err) {
      console.error('[provision] Could not find user in Firebase Auth. Ensure the user is registered with this email.');
      throw err;
    }

    const uid = userRecord.uid;
    console.log('[provision] Found user UID:', uid);

    const companyRef = db.collection('companies').doc(COMPANY_ID);
    const companySnap = await companyRef.get();
    if (companySnap.exists) {
      console.warn('[provision] Company doc already exists:', COMPANY_ID);
    } else {
      const companyData = {
        id: COMPANY_ID,
        name: COMPANY_NAME,
        ownerEmail: OWNER_EMAIL,
        ownerEmailLower: OWNER_EMAIL.trim().toLowerCase(),
        ownerFirstName: userRecord.displayName ? userRecord.displayName.split(' ')[0] : '',
        ownerLastName: userRecord.displayName ? userRecord.displayName.split(' ').slice(1).join(' ') : '',
        ownerMobile: '',
        plan: 'free',
        isActive: true,
        status: 'approved',
        ownerUid: uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await companyRef.set(companyData);
      console.log('[provision] Created company', COMPANY_ID);
    }

    const membershipRef = db.collection('companies').doc(COMPANY_ID).collection('users').doc(uid);
    await membershipRef.set({
      uid,
      email: OWNER_EMAIL,
      role: 'owner',
      status: 'active',
      profileCompleted: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log('[provision] Created owner membership for user under company', COMPANY_ID);

    const userProfileRef = db.collection('users').doc(uid);
    await userProfileRef.set({
      uid,
      email: OWNER_EMAIL,
      role: 'owner',
      companyId: COMPANY_ID,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log('[provision] Updated top-level user profile for UID', uid);

    if (MAKE_PLATFORM_ADMIN) {
      await db.collection('platformAdmins').doc(uid).set({
        email: OWNER_EMAIL,
        grantedAt: admin.firestore.FieldValue.serverTimestamp(),
        note: 'provisionOwnerCompany script',
      }, { merge: true });
      console.log('[provision] Added user to platformAdmins');
    }

    console.log('[provision] Done. Company:', COMPANY_ID, 'Owner UID:', uid);
    process.exit(0);
  } catch (err) {
    console.error('[provision] Failed:', err);
    process.exit(2);
  }
}

run();
