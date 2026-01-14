const admin = require('firebase-admin');
const path = require('path');

const args = process.argv.slice(2);
const getArg = (key) => {
  const found = args.find((a) => a.startsWith(key + '='));
  return found ? found.split('=').slice(1).join('=') : null;
};

const targetName = getArg('--targetName') || 'الشاهبندر لمستحضرات التجميل';
const write = args.includes('--write');
const companyIdArg = getArg('--companyId');

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? process.env.GOOGLE_APPLICATION_CREDENTIALS
  : path.join(__dirname, '..', 'service-account.json');

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const countDocs = async (companyId, collectionName) => {
  const snap = await db.collection('companies').doc(companyId).collection(collectionName).get();
  return snap.size;
};

const run = async () => {
  if (companyIdArg) {
    const docRef = db.collection('companies').doc(companyIdArg);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      console.error(`Company ${companyIdArg} not found.`);
      process.exit(1);
    }
    if (write) {
      await docRef.set({ companyName: targetName }, { merge: true });
      console.log(`Updated companyName to "${targetName}" for ${companyIdArg}`);
    }
    console.log(JSON.stringify({ companyId: companyIdArg, company: docSnap.data() }, null, 2));
    return;
  }

  const companiesSnap = await db.collection('companies').get();
  const summaries = [];
  for (const doc of companiesSnap.docs) {
    const data = doc.data() || {};
    const companyId = doc.id;
    const counts = {
      customers: await countDocs(companyId, 'customers'),
      products: await countDocs(companyId, 'products'),
      invoices: await countDocs(companyId, 'invoices'),
      expenses: await countDocs(companyId, 'expenses'),
      payments: await countDocs(companyId, 'payments'),
    };
    const total = Object.values(counts).reduce((sum, v) => sum + v, 0);
    summaries.push({ companyId, companyName: data.companyName || data.name || '', counts, total });
  }

  summaries.sort((a, b) => b.total - a.total);
  const preferred = summaries.find((s) => (s.companyName || '').includes('الشاهبندر')) || summaries[0];

  console.log('Company summaries (top 5):');
  console.log(JSON.stringify(summaries.slice(0, 5), null, 2));
  if (preferred) {
    console.log('Suggested COSMETICS_COMPANY_ID:');
    console.log(JSON.stringify(preferred, null, 2));
    if (write) {
      await db.collection('companies').doc(preferred.companyId).set({ companyName: targetName }, { merge: true });
      console.log(`Updated companyName to "${targetName}" for ${preferred.companyId}`);
    }
  }
};

run().catch((err) => {
  console.error('Lookup failed:', err);
  process.exit(1);
});
