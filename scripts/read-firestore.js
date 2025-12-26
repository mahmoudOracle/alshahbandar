import admin from 'firebase-admin';
import fs from 'fs';
import { fileURLToPath } from 'url';

const serviceAccountPath = fileURLToPath(new URL('../service-account.json', import.meta.url));
if (!fs.existsSync(serviceAccountPath)) {
  console.error('service-account.json not found at', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id || 'al-shabandar'
});

const db = admin.firestore();

async function listTopCollections() {
  const cols = await db.listCollections();
  console.log('Top-level collections:');
  for (const c of cols) console.log('- ' + c.id);
}

async function sampleDocs() {
  // Check platformAdmins, users, companies
  const toCheck = ['platformAdmins', 'users', 'companies'];
  for (const col of toCheck) {
    try {
      const snap = await db.collection(col).limit(5).get();
      console.log(`\nCollection ${col}: ${snap.size} documents (showing up to 5)`);
      snap.forEach(doc => console.log(` - ${doc.id}:`, doc.data()));
    } catch (err) {
      console.error('Error reading', col, err.message || err);
    }
  }

  // If any company exists, sample invoices under first company
  const companiesSnap = await db.collection('companies').limit(1).get();
  if (!companiesSnap.empty) {
    const compId = companiesSnap.docs[0].id;
    console.log('\nSampling company:', compId);
    const invoicesSnap = await db.collection(`companies/${compId}/invoices`).limit(5).get();
    console.log(`invoices: ${invoicesSnap.size}`);
    invoicesSnap.forEach(d => console.log(' -', d.id, d.data()));
  } else {
    console.log('\nNo companies found to sample subcollections.');
  }
}

async function run() {
  try {
    await listTopCollections();
    await sampleDocs();
    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(2);
  }
}

run();
