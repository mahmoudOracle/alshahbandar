const admin = require('firebase-admin');
const path = require('path');

const args = process.argv.slice(2);
const getArg = (key) => {
  const found = args.find((a) => a.startsWith(key + '='));
  return found ? found.split('=').slice(1).join('=') : null;
};

const companyId = getArg('--companyId');
const dryRun = args.includes('--dryRun') || !args.includes('--write');
const collectionsArg = getArg('--collections');

if (!companyId) {
  console.error('Missing --companyId. Example: node scripts/migrateLegacyDataToCompany.js --companyId=ABC123 --dryRun');
  process.exit(1);
}

const defaultCollections = ['customers', 'products', 'invoices', 'expenses', 'payments'];
const collections = collectionsArg
  ? collectionsArg.split(',').map((c) => c.trim()).filter(Boolean)
  : defaultCollections;

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? process.env.GOOGLE_APPLICATION_CREDENTIALS
  : path.join(__dirname, '..', 'service-account.json');

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const summary = {
  companyId,
  dryRun,
  collections: {},
  referenceIssues: [],
};

const getLegacyDocs = async (collectionName) => {
  const snap = await db.collection(collectionName).get();
  return snap.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
};

const chunk = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
};

const migrateCollection = async (collectionName) => {
  const legacyDocs = await getLegacyDocs(collectionName);
  const result = {
    legacyCount: legacyDocs.length,
    moved: 0,
    skippedExisting: 0,
    skippedEmpty: 0,
  };

  if (legacyDocs.length === 0) {
    summary.collections[collectionName] = result;
    return;
  }

  const destRef = db.collection('companies').doc(companyId).collection(collectionName);
  const batches = [];
  let currentBatch = db.batch();
  let ops = 0;

  for (const doc of legacyDocs) {
    if (!doc || !doc.id) {
      result.skippedEmpty += 1;
      continue;
    }

    const targetDocRef = destRef.doc(doc.id);
    const targetSnap = await targetDocRef.get();
    if (targetSnap.exists) {
      result.skippedExisting += 1;
      continue;
    }

    if (!dryRun) {
      currentBatch.set(targetDocRef, doc.data, { merge: true });
      ops += 1;
      if (ops >= 400) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        ops = 0;
      }
    }

    result.moved += 1;
  }

  if (!dryRun && ops > 0) batches.push(currentBatch);

  if (!dryRun) {
    for (const batch of batches) {
      await batch.commit();
    }
  }

  summary.collections[collectionName] = result;
};

const checkInvoiceReferences = async () => {
  if (!collections.includes('invoices')) return;

  const legacyInvoices = await getLegacyDocs('invoices');
  if (legacyInvoices.length === 0) return;

  const customerIds = new Set();
  const productIds = new Set();

  if (collections.includes('customers')) {
    const customers = await getLegacyDocs('customers');
    customers.forEach((c) => customerIds.add(c.id));
  }

  if (collections.includes('products')) {
    const products = await getLegacyDocs('products');
    products.forEach((p) => productIds.add(p.id));
  }

  legacyInvoices.forEach((inv) => {
    const data = inv.data || {};
    if (data.customerId && !customerIds.has(String(data.customerId))) {
      summary.referenceIssues.push({
        invoiceId: inv.id,
        type: 'missing-customer',
        customerId: String(data.customerId),
      });
    }
    if (Array.isArray(data.items)) {
      data.items.forEach((item, idx) => {
        if (item && item.productId && !productIds.has(String(item.productId))) {
          summary.referenceIssues.push({
            invoiceId: inv.id,
            type: 'missing-product',
            productId: String(item.productId),
            itemIndex: idx,
          });
        }
      });
    }
  });
};

const run = async () => {
  console.log('Starting migration', { companyId, dryRun, collections });
  const companySnap = await db.collection('companies').doc(companyId).get();
  if (!companySnap.exists) {
    console.error(
      `Company ${companyId} not found. Create the tenant company first, then rerun the migration.`
    );
    process.exit(1);
  }
  await checkInvoiceReferences();
  for (const collectionName of collections) {
    await migrateCollection(collectionName);
  }

  console.log('Migration summary');
  console.log(JSON.stringify(summary, null, 2));
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
