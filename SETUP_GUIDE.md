# Alshabandar Business Suite - Firebase Setup Guide (Rebuilt for Clarity)

Welcome! This guide will walk you through the one-time setup process to securely connect the invoicing application to its new Firebase backend. All your company's data will be stored safely in a professional, scalable Firestore database.

This process takes about 10 minutes. Please follow each step carefully.

---

### Step 1: Create and Configure Your Firebase Project

First, we will create the backend infrastructure for your application.

1.  **Go to Firebase Console:** Open the [Firebase Console](https://console.firebase.google.com/). You may need to sign in with your Google account.
2.  **Create a Project:** Click on **"Add project"**. Give it a name like "My Invoicing App" and click **Continue**. You can disable Google Analytics for this project to simplify setup. Click **"Create project"**.
3.  **Create a Web App:** Once your project is ready, you'll be on the project dashboard.
    *   Click the Web icon (`</>`) to add a web app to your project.
    *   Give your app a nickname, e.g., "Invoicing Web App".
    *   Click **"Register app"**.
4.  **CRITICAL - Copy Firebase Config:** Firebase will now show you your configuration details. This is the most important piece of information you will get.
    *   Find the `const firebaseConfig = { ... };` code block.
    *   **Copy the entire JavaScript object, including the curly braces `{}`.** You will need to paste this into the application on first launch.
    *   Click **"Continue to console"**.

---

### Step 2: CRITICAL - Upgrade to the Blaze (Pay-as-you-go) Plan

This is the most important configuration step. **Cloud Functions, which are essential for creating new companies, will fail with an "internal server error" if your project is on the free "Spark" plan.**

You **MUST** upgrade your project to the Blaze plan. The free tier is very generous, and you are unlikely to incur costs for normal use.

1.  **Open Billing:** In your Firebase Console, look for the "Spark Plan" banner near the bottom of the left-hand menu. Click **"Upgrade"**.
2.  **Select "Blaze"**: Choose the Blaze plan and link a billing account when prompted. You can set budget alerts in the Google Cloud Console to prevent unexpected charges.

**If you see "حدث خطأ داخلي في الخادم" (Internal server error) in the app, it is almost certainly because this step was missed.**

---

### Step 3: Set Up Firestore Database

This is where your invoices, customers, and products will be stored.

1.  **Go to Firestore:** In the left-hand menu of your Firebase project, go to **Build -> Firestore Database**.
2.  **Create Database:** Click **"Create database"**.
3.  **Start in Production Mode:** Select **"Start in production mode"** and click **Next**.
4.  **Choose Location:** Select a location close to you (e.g., `eur3 (europe-west)`). Click **"Enable"**.

---

### Step 4: ESSENTIAL - Set Security Rules for Multi-User Access

This is the most important step to secure your data and enable multi-user roles. You MUST replace the default rules.

1.  **Go to Rules:** In the Firestore Database section, click on the **"Rules"** tab.
2.  **Replace Rules:** You will see a text editor with some default rules. **Delete all the text in the editor.**
3.  **Paste New Rules:** Copy the entire code block below and paste it into the empty editor.

    ```javascript
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {

        // --- HELPER FUNCTIONS (CORRECTED & ALIGNED WITH APP) ---
        function isPlatformAdmin() {
          return request.auth != null && exists(/databases/$(database)/documents/platformAdmins/$(request.auth.uid));
        }

        function getCompanyRole(companyId) {
            if (request.auth == null) { return null; }
            let userDocPath = /databases/$(database)/documents/companies/$(companyId)/users/$(request.auth.uid);
            if (!exists(userDocPath)) { return null; }
            return get(userDocPath).data.role;
        }

        function isCompanyMember(companyId) {
            return getCompanyRole(companyId) != null;
        }

        function isCompanyManager(companyId) {
            let role = getCompanyRole(companyId);
            return role == 'owner' || role == 'manager';
        }

        function isCompanyEditor(companyId) {
            let role = getCompanyRole(companyId);
            return role in ['owner', 'manager', 'employee'];
        }

        // --- TOP-LEVEL COLLECTIONS ---
        match /platformAdmins/{adminId} {
            // Only platform admins can read the list of other admins.
            // This collection should be managed manually or through a secure backend process.
            allow read: if isPlatformAdmin();
        }
        
        match /companies/{companyId} {
          // Only Platform Admins can create new company documents.
          allow create: if isPlatformAdmin();
          
          // Any member of the company can read the main company document.
          allow read: if isCompanyMember(companyId);
          
          allow update: if 
            // Company managers can update general company details.
            isCompanyManager(companyId) || 
            // A new user can "claim" an unassigned company if their email matches
            // by setting their own UID on it as part of the invitation acceptance transaction.
            (
              request.auth != null &&
              resource.data.ownerUid == null &&
              resource.data.ownerEmailLower == request.auth.token.email &&
              request.resource.data.ownerUid == request.auth.uid &&
              request.resource.data.keys().hasAny(['ownerUid', 'updatedAt'])
            );
        }

        // --- COMPANY SUBCOLLECTIONS ---
        match /companies/{companyId}/users/{userId} {
            // Any company member can read user profiles within the same company.
            allow read: if isCompanyMember(companyId);
            
            allow create: if (
                // A user can create their OWN user document if they are accepting an invitation.
                // The client-side transaction in `resolveFirstLogin` ensures an invitation exists
                // and has the correct role. This rule just ensures the user can only write their own document.
                request.auth != null &&
                request.auth.uid == userId
            );
            
            allow update: if (
                // A manager can update roles of non-owners/managers.
                (isCompanyManager(companyId) && resource.data.role in ['employee', 'viewer']) ||
                // A user can update their own profile, but cannot change their role.
                (request.auth.uid == userId && request.resource.data.role == resource.data.role)
            );

            allow delete: if (
                isCompanyManager(companyId) &&
                resource.data.role in ['employee', 'viewer'] &&
                request.auth.uid != userId // Managers cannot delete themselves.
            );
        }

        match /companies/{companyId}/invitations/{inviteId} {
            // Platform Admins can create the initial owner invitation. Company managers can invite staff.
            allow create: if isCompanyManager(companyId) || isPlatformAdmin();
            allow read: if isCompanyManager(companyId) || 
                         (request.auth != null && request.auth.token.email == resource.data.email);
            allow update: if (
                // Allow the invited user to accept the invitation (part of the transaction in resolveFirstLogin)
                request.auth != null && 
                resource.data.email == request.auth.token.email &&
                request.resource.data.used == true &&
                request.resource.data.usedByUid == request.auth.uid
            );
            allow delete: if isCompanyManager(companyId);
        }

        // --- GENERIC RULE FOR OTHER BUSINESS DATA (Invoices, Customers, etc.) ---
        match /companies/{companyId}/{collection}/{docId} {
          allow read: if isCompanyMember(companyId);
          allow write: if isCompanyEditor(companyId);
        }
      }
    }
    ```

4.  **Publish:** Click the **"Publish"** button. Your database is now secure and ready for multi-user access.

---

### Step 5: Enable Email/Password Sign-In

This allows you and your team to log in to the application using an email and password.

1.  **Go to Authentication:** In the left-hand menu, go to **Build -> Authentication**.
2.  **Get started:** Click the **"Get started"** button if you haven't already.
3.  **Sign-in Method Tab:** From the list of providers, click on **"Email/Password"**.
4.  **Enable:** In the window that appears, toggle the **Enable** switch.
5.  **Save:** Click **"Save"**.

---

### Step 6: Authorize Your Domain

This is a security step to tell Firebase which websites are allowed to access your backend.

1.  **Go to Settings:** In the Authentication section, click the **"Settings"** tab.
2.  **Authorized Domains:** Click on **"Authorized domains"**.
3.  **Add Domain:** Click **"Add domain"** and enter the domain where you are hosting the app (e.g., `localhost` if you are running it on your computer, or `your-app-name.web.app` if you deployed it).
4.  **Add:** Click **"Add"**.

---

### Step 7: Deploy Cloud Functions (Required for Invitations)

The new system for inviting customers and creating companies relies on backend Cloud Functions. You must deploy these for the app to work correctly.

1.  **Set up a `functions` directory** in your project.
2.  Add the `index.js` and `package.json` files as provided in your technical report.
3.  Follow the [official Firebase guide](https://firebase.google.com/docs/functions/get-started) to deploy your functions using the Firebase CLI. The command will be `firebase deploy --only functions`.

---

### Step 8: Configure Automated Emails (Required for Invitations)

To send invitation emails automatically, you need to connect to an email service like SendGrid.

1.  **Create a SendGrid Account:** Go to [SendGrid](https://sendgrid.com/) and create a free account.
2.  **Create an API Key:**
    *   Inside SendGrid, navigate to **Settings -> API Keys**.
    *   Click **"Create API Key"**. Give it a name (e.g., "Firebase Invoicing App") and choose **"Full Access"**.
    *   **Copy the API key immediately.** You will not be able to see it again.
3.  **Set the API Key in Firebase:**
    *   Open your terminal in your project's root directory.
    *   Run the following command, replacing `your_sendgrid_api_key_here` with the key you just copied:
        ```bash
        firebase functions:secrets:set SENDGRID_API_KEY
        ```
    *   When prompted, paste your API key and press Enter.
4.  **Verify a Sender Identity:**
    *   In SendGrid, go to **Sender Authentication**. You must verify a "Single Sender" (your email address) or an entire domain to be able to send emails. Follow their instructions.
    *   **IMPORTANT:** Open the `functions/index.js` file and replace the placeholder `from: 'support@yourdomain.com'` with your own verified sender email address.
5.  **Redeploy Functions:** After setting the secret and updating the sender email, you must redeploy your functions for the changes to take effect:
    ```bash
    firebase deploy --only functions
    ```

You are all set! Your application is now fully configured.