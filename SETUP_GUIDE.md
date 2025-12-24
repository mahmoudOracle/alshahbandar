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

### Step 2: Set Up Firestore Database

This is where your invoices, customers, and products will be stored.

1.  **Go to Firestore:** In the left-hand menu of your Firebase project, go to **Build -> Firestore Database**.
2.  **Create Database:** Click **"Create database"**.
3.  **Start in Production Mode:** Select **"Start in production mode"** and click **Next**.
4.  **Choose Location:** Select a location close to you (e.g., `eur3 (europe-west)`). Click **"Enable"**.

---

### Step 3: ESSENTIAL - Set Security Rules for Multi-User Access

This is the most important step to secure your data and enable multi-user roles. You MUST replace the default rules.

1.  **Go to Rules:** In the Firestore Database section, click on the **"Rules"** tab.
2.  **Replace Rules:** You will see a text editor with some default rules. **Delete all the text in the editor.**
3.  **Paste New Rules:** Copy the entire code block below and paste it into the empty editor.

    ```javascript
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {

        // --- HELPER FUNCTIONS (WITH DEV MODE SUPPORT) ---
        // Safely get a user's profile.
        function getUserProfile(userId) {
          return get(/databases/$(database)/documents/users/$(userId));
        }

        // Check if the currently authenticated user is a member of a specific company.
        function isCompanyMember(companyId) {
            // Special case for dev mode to allow access without a user profile doc
            if (companyId == 'dev-company-id') {
                return request.auth != null;
            }
            let userProfile = getUserProfile(request.auth.uid);
            return request.auth != null &&
                   userProfile.exists &&
                   userProfile.data.get('companyId', null) == companyId;
        }
        
        // Check if the currently authenticated user is a manager of a specific company.
        function isCompanyManager(companyId) {
            // Special case for dev mode grants manager access
            if (companyId == 'dev-company-id') {
                return request.auth != null;
            }
            let userProfile = getUserProfile(request.auth.uid);
            return isCompanyMember(companyId) &&
                   userProfile.data.get('role', null) == 'manager';
        }

        // Check if the currently authenticated user is an editor (manager or employee) of a specific company.
        function isCompanyEditor(companyId) {
            // Special case for dev mode grants editor access
            if (companyId == 'dev-company-id') {
                return request.auth != null;
            }
            let userProfile = getUserProfile(request.auth.uid);
            return isCompanyMember(companyId) &&
                   userProfile.data.get('role', null) in ['manager', 'employee'];
        }

        // --- USER PROFILES ---
        match /users/{userId} {
          // Allow a user to create their own initial, empty profile document upon first sign-in.
          // This is later populated by an invitation acceptance.
          allow create: if request.auth != null && request.auth.uid == userId
                        && request.resource.data.size() == 0;

          // A user can read their own profile.
          // A user can also read the profile of another user if they belong to the same company.
          allow read: if request.auth.uid == userId || (
            let targetUser = getUserProfile(userId);
            targetUser.exists &&
            targetUser.data.get('companyId', null) != null &&
            isCompanyMember(targetUser.data.get('companyId', null))
          );

          // A user can't change their own role or company. Managers handle role changes.
          allow update: if request.auth.uid == userId &&
                         request.resource.data.get('role', null) == resource.data.get('role', null) &&
                         request.resource.data.get('companyId', null) == resource.data.get('companyId', null);

          // A manager can update the role of or delete another user in the same company, but cannot affect another manager.
          allow update, delete: if (
            let targetUser = getUserProfile(userId);
            targetUser.exists &&
            targetUser.data.get('companyId', null) != null &&
            isCompanyManager(targetUser.data.get('companyId', null)) &&
            targetUser.data.get('role', null) != 'manager'
          );
        }

        // --- INVITATIONS ---
        match /invitations/{inviteId} {
          // A manager can create an invitation for their own company.
          allow create: if isCompanyManager(request.resource.data.get('companyId', null));

          // A manager can read/delete invitations for their company.
          // The invited user can read the invitation if their email matches.
          allow read, delete: if isCompanyManager(resource.data.get('companyId', null)) ||
                               (request.auth != null && request.auth.token.email == resource.data.get('email', null));
        }

        // --- COMPANY-LEVEL DATA (SETTINGS) ---
        match /companies/{companyId} {
          // Allow a user to create a company if their UID is marked as the owner in the new document.
          // ALSO allow any dev user to create the dev company doc, which is needed for first-run setup.
          allow create: if (request.auth != null && request.resource.data.get('ownerUid', null) == request.auth.uid) ||
                           (companyId == 'dev-company-id' && request.auth != null);

          // Any member of the company can read the company settings.
          allow read: if isCompanyMember(companyId);

          // Only a manager of the company can update the settings.
          allow update: if isCompanyManager(companyId);
        }

        // --- COMPANY SUBCOLLECTIONS (INVOICES, CUSTOMERS, ETC.) ---
        match /companies/{companyId}/{collection}/{docId} {
          // Any authenticated member of the company can read data.
          allow read: if isCompanyMember(companyId);
          
          // Only editors (managers/employees) can write data.
          allow write: if isCompanyEditor(companyId);
        }
      }
    }
    ```

4.  **Publish:** Click the **"Publish"** button. Your database is now secure and ready for multi-user access.

---

### Step 4: Enable Google Sign-In

This allows you and your team to log in to the application.

1.  **Go to Authentication:** In the left-hand menu, go to **Build -> Authentication**.
2.  **Get started:** Click the **"Get started"** button.
3.  **Sign-in Method Tab:** Click on **"Google"** from the list of providers.
4.  **Toggle Enable:** In the window that appears, click the **Enable** toggle.
5.  **Project Support Email:** Select your email address from the dropdown.
6.  **Save:** Click **"Save"**.

---

### Step 5: Authorize Your Domain

This is a security step to tell Firebase which websites are allowed to access your backend.

1.  **Go to Settings:** In the Authentication section, click the **"Settings"** tab.
2.  **Authorized Domains:** Click on **"Authorized domains"**.
3.  **Add Domain:** Click **"Add domain"** and enter the domain where you are hosting the app (e.g., `localhost` if you are running it on your computer, or `your-app-name.web.app` if you deployed it).
4.  **Add:** Click **"Add"**.

---

### Step 6: Deploy Cloud Functions (Required for Invitations)

The new system for inviting customers and creating companies relies on backend Cloud Functions. You must deploy these for the app to work correctly.

1.  **Set up a `functions` directory** in your project.
2.  Add the `index.js` and `package.json` files as provided in your technical report.
3.  Follow the [official Firebase guide](https://firebase.google.com/docs/functions/get-started) to deploy your functions using the Firebase CLI. The command will be `firebase deploy --only functions`.

---

### Step 7: Configure Automated Emails (Required for Invitations)

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