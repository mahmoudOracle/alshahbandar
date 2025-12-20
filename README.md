# Alshabandar Business Suite - Frontend Setup

This application uses your browser's local storage to securely manage Firebase configuration. This allows you to connect the application to your own private Firebase backend without modifying the source code.

## Running Locally

1.  **Run the Development Server:**
    Start the application using your local development server command (e.g., `npm run dev` or `npm start`).

2.  **Provide Firebase Configuration:**
    On first launch, the application will prompt you to enter your Firebase project configuration. You can find this in your Firebase project settings. Paste the entire JSON object into the provided text area and save. The app will reload and connect to your backend.

## Backend Setup

For the new invitation and multi-company features to work, you must deploy the provided Firestore rules and Cloud Functions to your Firebase project.

1.  **Deploy Firestore Rules:**
    - Go to your Firebase Console -> Firestore -> Rules.
    - Copy the contents of `firestore.rules` from this project.
    - Paste them into the editor and click **Publish**.

2.  **Deploy Cloud Functions:**
    - You will need to set up a `functions` directory with `index.js` and `package.json` as specified in the technical report.
    - Follow the official Firebase documentation to deploy your functions using the Firebase CLI (`firebase deploy --only functions`).