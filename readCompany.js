
import admin from 'firebase-admin';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';

// Initialize Firebase Admin SDK
initializeApp({
  credential: applicationDefault(),
  projectId: 'al-shahbandar',
});

const db = getFirestore();
const auth = getAuth();

async function createCompany() {
  try {
    // Read company data from test_company.json
    const companyData = JSON.parse(fs.readFileSync('test_company.json', 'utf8'));

    // Get the user by email
    const user = await auth.getUserByEmail(companyData.ownerEmail);

    // Create a new company document
    const companyRef = await db.collection('companies').add({
      ...companyData,
      ownerUid: user.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('Company created with ID:', companyRef.id);

    // Add the user to the company's users subcollection
    await db.collection('companies').doc(companyRef.id).collection('users').doc(user.uid).set({
      email: user.email,
      role: 'admin',
      createdAt: new Date(),
    });

    console.log(`User ${user.email} added to company ${companyRef.id} as an admin.`);

  } catch (error) {
    console.error('Error creating company:', error);
  }
}

createCompany();
