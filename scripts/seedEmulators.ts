import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { Company, Product, UserRole } from '../types'; // Adjust path if types.ts is elsewhere

// Initialize Firebase Admin SDK to connect to emulators
// Check if an app already exists to prevent re-initialization
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'al-shabandar', // Use your project ID here
  });
}

// Connect to emulators
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIREBASE_FUNCTIONS_EMULATOR_HOST = '127.0.0.1:5001'; // Not directly used by admin SDK for seeding but good practice

const auth = getAuth();
const db = getFirestore();

const seed = async () => {
  console.log('✨ Starting emulator seeding...');

  try {
    // 1. Create a test user
    const testUserEmail = 'test@example.com';
    const testUserPassword = 'password123';
    let userRecord: admin.auth.UserRecord;

    try {
      userRecord = await auth.getUserByEmail(testUserEmail);
      console.log(`- User ${testUserEmail} already exists. Skipping creation.`);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        userRecord = await auth.createUser({
          email: testUserEmail,
          password: testUserPassword,
          displayName: 'Test User',
        });
        console.log(`- Created test user: ${testUserEmail} (UID: ${userRecord.uid})`);
      } else {
        throw error;
      }
    }

    const userId = userRecord.uid;

    // 2. Create a company document
    const companyId = 'test-company-id'; // Fixed ID for easier testing
    const companyRef = db.collection('companies').doc(companyId);
    const companySnap = await companyRef.get();
    
    if (companySnap.exists) {
      console.log(`- Company ${companyId} already exists. Skipping creation.`);
    } else {
      const newCompany: Company = {
        id: companyId,
        companyName: 'Test Company',
        ownerUid: userId,
        ownerEmail: testUserEmail,
        ownerEmailLower: testUserEmail.toLowerCase(),
        status: 'approved',
        isActive: true,
        plan: { maxUsers: 5 }, // Example plan
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        contactEmail: 'contact@testcompany.com',
        phone: '123-456-7890',
        address: '123 Test St',
        city: 'Testville',
        country: 'Testland',
        contactPersonName: 'John Doe',
        contactPersonTitle: 'CEO',
        // Add other required fields from your Company type
      };
      await companyRef.set(newCompany);
      console.log(`- Created company: ${newCompany.companyName} (ID: ${companyId})`);
    }

    // 3. Create sample products for that company
    const productsCollectionRef = db.collection(`companies/${companyId}/products`);
    const sampleProducts: Product[] = [
      {
        id: 'product-1',
        name: 'Sample Product 1',
        description: 'A description for sample product 1',
        price: 100,
        unit: 'piece',
        category: 'Electronics',
        stock: 50,
        minStock: 10,
        averageCost: 60,
        defaultCost: 55,
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {
        id: 'product-2',
        name: 'Sample Product 2',
        description: 'A description for sample product 2',
        price: 25.50,
        unit: 'kg',
        category: 'Groceries',
        stock: 120,
        minStock: 20,
        averageCost: 15,
        defaultCost: 14,
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    ];

    for (const product of sampleProducts) {
      const productRef = productsCollectionRef.doc(product.id);
      const productSnap = await productRef.get();
      if (productSnap.exists) {
        console.log(`- Product ${product.name} already exists. Skipping creation.`);
      } else {
        await productRef.set(product);
        console.log(`- Created product: ${product.name} (ID: ${product.id})`);
      }
    }

    // 4. Create members document for the user in the company
    const memberRef = db.collection(`companies/${companyId}/members`).doc(userId);
    const memberSnap = await memberRef.get();

    if (memberSnap.exists) {
      console.log(`- Membership for user ${testUserEmail} in company ${companyId} already exists. Skipping creation.`);
    } else {
      await memberRef.set({
        uid: userId,
        email: testUserEmail,
        role: UserRole.Owner,
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
        // Add other required fields for CompanyUser type
      });
      console.log(`- Created membership for user ${testUserEmail} in company ${companyId}.`);
    }

    console.log('✅ Emulator seeding complete.');
  } catch (error) {
    console.error('🔴 Emulator seeding failed:', error);
    process.exit(1);
  } finally {
    // Ensure the process exits to prevent it from hanging
    process.exit(0);
  }
};

seed();