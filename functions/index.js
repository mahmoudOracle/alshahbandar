const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');

admin.initializeApp();
const db = admin.firestore();

// Set the SendGrid API Key.
// Make sure to set this in your Firebase Functions environment:
// firebase functions:secrets:set SENDGRID_API_KEY
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.createInvitation = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  
  // Ensure the user has configured the SendGrid key
  if (!process.env.SENDGRID_API_KEY) {
      throw new functions.https.HttpsError('failed-precondition', 'Email service is not configured. Please set the SENDGRID_API_KEY secret.');
  }

  const { email, companyName, notes } = data;
  if (!email || !companyName) throw new functions.https.HttpsError('invalid-argument','Missing fields');

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const companyId = companyName.toLowerCase().replace(/[^\w]+/g,'-') + '-' + Date.now();

  const inviteRef = db.collection('invitations').doc();
  await inviteRef.set({
    email, companyName, companyId,
    tokenHash, status: 'pending',
    createdBy: context.auth.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7*24*60*60*1000)),
    notes: notes || null
  });

  // Fetch the inviter's company name for a professional email
  let inviterBusinessName = 'Alshabandar Business Suite'; // Fallback
  try {
      const inviterProfileSnap = await db.collection('users').doc(context.auth.uid).get();
      if (inviterProfileSnap.exists) {
          const inviterCompanyId = inviterProfileSnap.data().companyId;
          const inviterCompanySnap = await db.collection('companies').doc(inviterCompanyId).get();
          if (inviterCompanySnap.exists) {
              inviterBusinessName = inviterCompanySnap.data().name;
          }
      }
  } catch (e) {
      console.warn("Could not fetch inviter's company name:", e);
  }

  // Use the reliably-injected FIREBASE_CONFIG to get the project ID
  const projectId = JSON.parse(process.env.FIREBASE_CONFIG).projectId;
  // Add '#' for HashRouter compatibility
  const acceptUrl = `https://${projectId}.web.app/#/invite/accept?token=${token}&inviteId=${inviteRef.id}`;
  
  // Send the invitation email via SendGrid
  const msg = {
    to: email,
    // IMPORTANT: You must configure a verified sender in your SendGrid account.
    from: 'support@yourdomain.com', 
    subject: `You're invited to join ${companyName} on ${inviterBusinessName}'s Platform`,
    html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2>Hello!</h2>
            <p>You have been invited by <strong>${inviterBusinessName}</strong> to set up your company, <strong>${companyName}</strong>, on the Alshabandar Business Suite platform.</p>
            <p>Click the button below to accept the invitation and create your account. This link is valid for 7 days.</p>
            <a href="${acceptUrl}" style="background-color: #007bff; color: white; padding: 15px 25px; text-align: center; text-decoration: none; display: inline-block; border-radius: 5px; font-size: 16px;">Accept Invitation</a>
            <p style="margin-top: 20px; font-size: 12px; color: #777;">If you did not expect this invitation, you can safely ignore this email.</p>
        </div>
    `,
  };

  try {
      await sgMail.send(msg);
  } catch (error) {
      console.error('Error sending invitation email:', error);
      // If the email fails, we should still let the user know, but the invitation is still created.
      // For a more robust system, we might delete the invitation or mark it as failed.
      throw new functions.https.HttpsError('internal', 'The invitation was created, but failed to send the email.');
  }

  return { success: true, inviteId: inviteRef.id };
});

exports.acceptInvitation = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated','Login required');
  const { inviteId, token } = data;
  if (!inviteId || !token) throw new functions.https.HttpsError('invalid-argument','Missing inviteId/token');

  const inviteRef = db.collection('invitations').doc(inviteId);
  const inviteSnap = await inviteRef.get();
  if (!inviteSnap.exists) throw new functions.https.HttpsError('not-found','Invite not found');

  const invite = inviteSnap.data();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  if (tokenHash !== invite.tokenHash)
    throw new functions.https.HttpsError('permission-denied','Invalid token');

  if (invite.expiresAt.toMillis() < Date.now()) {
    await inviteRef.update({ status: 'expired' });
    throw new functions.https.HttpsError('deadline-exceeded', 'Invite expired');
  }

  const uid = context.auth.uid;
  const companyId = invite.companyId;

  await db.runTransaction(async tx => {
    const companyRef = db.collection('companies').doc(companyId);
    const companySnap = await tx.get(companyRef);
    if (!companySnap.exists) {
      tx.set(companyRef, {
        id: companyId,
        name: invite.companyName,
        ownerUid: uid,
        status: 'trial',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    const userRef = db.collection('users').doc(uid);
    tx.set(userRef, {
      uid,
      email: context.auth.token.email || null,
      role: 'manager',
      companyId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    tx.update(inviteRef, { status: 'accepted', acceptedBy: uid, acceptedAt: admin.firestore.FieldValue.serverTimestamp() });
  });

  return { success: true, companyId };
});