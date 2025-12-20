// This script grants owner and full permissions to the user with email 'hoodaalwamry@gmail.com'.
// Run this in the Firebase Functions shell or as a one-time admin script.

const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

const OWNER_EMAIL = 'hoodaalwamry@gmail.com';
const OWNER_UID = null; // Fill this with the user's UID if known

async function grantOwnerPermissions() {
  // Find user by email
  const usersSnap = await db.collection('users').where('email', '==', OWNER_EMAIL).get();
  if (usersSnap.empty) {
    console.error('No user found with email:', OWNER_EMAIL);
    return;
  }
  const userDoc = usersSnap.docs[0];
  const uid = userDoc.id;
  console.log('Granting owner permissions to UID:', uid);

  // Update user role to 'owner'
  await userDoc.ref.update({ role: 'owner' });

  // Add to platformAdmins for full permissions
  await db.collection('platformAdmins').doc(uid).set({ email: OWNER_EMAIL, grantedAt: new Date() }, { merge: true });

  console.log('Owner and full permissions granted to:', OWNER_EMAIL);
}

grantOwnerPermissions().catch(console.error);