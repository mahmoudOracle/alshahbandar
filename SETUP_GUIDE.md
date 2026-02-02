# Alshabandar Business Suite - Firebase Setup Guide (Rebuilt for Clarity)

Welcome! This guide will walk you through the one-time setup process to securely connect the invoicing application to its new Firebase backend. All your company's data will be stored safely in a professional, scalable Firestore database.

This process takes about 10 minutes. Please follow each step carefully.

---

### Step 1: Create and Configure Your Firebase Project

First, we will create the backend infrastructure for your application.

1.  **Go to Firebase Console:** Open the [Firebase Console](https://console.firebase.google.com/). You may need to sign in with your Google account.
2.  **Create a Project:** Click on **"Add project"**. Give it a name like "My Invoicing App" and click **Continue**. You can disable Google Analytics for this project to simplify setup. Click **"Create project"**.
3.  **Create a Web App:** Once your project is ready, you'll be on the project dashboard.
    - Click the Web icon (`</>`) to add a web app to your project.
    - Give your app a nickname, e.g., "Invoicing Web App".
    - Click **"Register app"**.
4.  **CRITICAL - Copy Firebase Config:** Firebase will now show you your configuration details. This is the most important piece of information you will get.
    - Find the `const firebaseConfig = { ... };` code block.
    - **Copy the entire JavaScript object, including the curly braces `{}`.** You will need to paste this into the application on first launch.
    - Click **"Continue to console"**.

---

Note: If you are running in single-company mode, set `VITE_COMPANY_ID` in `.env.local` or enter the Company ID in the setup screen when you paste the Firebase config.

### Step 2: Plan Choice (Spark or Blaze)

This app can run fully on the free **Spark** plan when `VITE_FREE_MODE=true` (default). In free mode, the app uses client-side transactions and does not require Cloud Functions.

If you want advanced features like invitation emails or server-side admin dashboards, you can upgrade to **Blaze** and deploy Cloud Functions. This is optional.

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
3.  **Paste New Rules:** Copy the contents of `firestore.rules` from this project and paste them into the empty editor.
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

### Step 7: Deploy Cloud Functions (Optional)

The invitation email flow and some admin features rely on Cloud Functions. Deploy these only if you need them.

1.  **Set up a `functions` directory** in your project.
2.  Add the `index.js` and `package.json` files as provided in your technical report.
3.  Follow the [official Firebase guide](https://firebase.google.com/docs/functions/get-started) to deploy your functions using the Firebase CLI. The command will be `firebase deploy --only functions`.

---

### Step 8: Configure Automated Emails (Optional)

If you enable invitation emails, connect to an email service like SendGrid.

1.  **Create a SendGrid Account:** Go to [SendGrid](https://sendgrid.com/) and create a free account.
2.  **Create an API Key:**
    - Inside SendGrid, navigate to **Settings -> API Keys**.
    - Click **"Create API Key"**. Give it a name (e.g., "Firebase Invoicing App") and choose **"Full Access"**.
    - **Copy the API key immediately.** You will not be able to see it again.
3.  **Set the API Key in Firebase:**
    - Open your terminal in your project's root directory.
    - Run the following command, replacing `your_sendgrid_api_key_here` with the key you just copied:
      ```bash
      firebase functions:secrets:set SENDGRID_API_KEY
      ```
    - When prompted, paste your API key and press Enter.
4.  **Verify a Sender Identity:**
    - In SendGrid, go to **Sender Authentication**. You must verify a "Single Sender" (your email address) or an entire domain to be able to send emails. Follow their instructions.
    - **IMPORTANT:** Open the `functions/index.js` file and replace the placeholder `from: 'support@yourdomain.com'` with your own verified sender email address.
5.  **Redeploy Functions:** After setting the secret and updating the sender email, you must redeploy your functions for the changes to take effect:
    ```bash
    firebase deploy --only functions
    ```

You are all set! Your application is now fully configured.










