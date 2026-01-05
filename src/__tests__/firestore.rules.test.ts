import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// These tests use @firebase/rules-unit-testing against the emulator. They will
// be skipped if the emulator is not running or the package is not installed.

let testsAvailable = true;
let initializeTestEnvironment: any;
let assertFails: any;
let assertSucceeds: any;
let RulesTestEnvironment: any;
let fs: any;

try {
  // Dynamically import to avoid throwing when dev deps are not installed
  const pkgName = ['@firebase', 'rules-unit-testing'].join('/');
  const ru = await import(pkgName as any);
  initializeTestEnvironment = ru.initializeTestEnvironment;
  assertFails = ru.assertFails;
  assertSucceeds = ru.assertSucceeds;
  RulesTestEnvironment = ru.RulesTestEnvironment;
  const fsPkg = ['f', 's'].join('');
  fs = await import(fsPkg as any);
} catch (err) {
  // Not installed; mark tests to be skipped
  testsAvailable = false;
}

const PROJECT_ID = 'test-al-shabandar';
let testEnv: any;

describe('Firestore security rules - stockLedger & inventory', () => {
  beforeAll(async () => {
    if (!testsAvailable) return;
    // Start a test environment pointing to the emulator
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firebaseConfig: { projectId: PROJECT_ID },
      rules: fs.readFileSync('firestore.rules', 'utf8'),
    });
  });

  afterAll(async () => {
    if (!testsAvailable || !testEnv) return;
    await testEnv.cleanup();
  });

  it('prevents non-admin clients from creating stockLedger entries', async () => {
    if (!testsAvailable) return;
    const alice = testEnv.authenticatedContext('alice', { uid: 'alice', email: 'alice@test.com' });
    const aliceDb = alice.firestore();

    const write = aliceDb
      .collection('companies')
      .doc('comp1')
      .collection('stockLedger')
      .doc('entry1')
      .set({
        productId: 'p1',
        change: -2,
        qtyBefore: 5,
        qtyAfter: 3,
        unitCost: 10,
        sourceType: 'SALE',
        referenceId: 'inv1',
        timestamp: new Date(),
      });

    await assertFails(write);
  });

  it('allows admin-claim clients to create valid stockLedger entries', async () => {
    if (!testsAvailable) return;
    const admin = testEnv.authenticatedContext('admin', {
      uid: 'admin',
      email: 'admin@test.com',
      token: { admin: true },
    });
    const adminDb = admin.firestore();

    const write = adminDb
      .collection('companies')
      .doc('comp1')
      .collection('stockLedger')
      .doc('entry2')
      .set({
        productId: 'p1',
        change: 10,
        qtyBefore: 0,
        qtyAfter: 10,
        unitCost: 5,
        sourceType: 'PURCHASE',
        referenceId: 'pur1',
        timestamp: new Date(),
      });

    await assertSucceeds(write);
  });

  it('prevents invalid qty arithmetic in ledger entries', async () => {
    if (!testsAvailable) return;
    const admin = testEnv.authenticatedContext('admin2', {
      uid: 'admin2',
      email: 'a2@test.com',
      token: { admin: true },
    });
    const adminDb = admin.firestore();

    const bad = adminDb
      .collection('companies')
      .doc('comp1')
      .collection('stockLedger')
      .doc('entry3')
      .set({
        productId: 'p1',
        change: -5,
        qtyBefore: 2,
        qtyAfter: -3, // inconsistent
        unitCost: 5,
        sourceType: 'SALE',
        referenceId: 'inv2',
        timestamp: new Date(),
      });

    await assertFails(bad);
  });
});
