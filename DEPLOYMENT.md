
# Alshabandar Business Suite - Deployment Guide

This guide provides the steps to build the application for production and deploy it to Firebase Hosting.

## Prerequisites

1.  **Node.js and npm:** Ensure you have Node.js (v18 or later) and npm installed.
2.  **Firebase CLI:** You must have the Firebase Command Line Interface installed globally. If not, run:
    ```bash
    npm install -g firebase-tools
    ```
3.  **Firebase Project:** You must have a Firebase project created and configured with Authentication and Firestore, as described in the setup guide.

## Deployment Steps

1.  **Log in to Firebase:**
    Open your terminal in the project root directory and run the following command. This will open a browser window for you to log in to your Google account associated with Firebase.
    ```bash
    firebase login
    ```

2.  **Initialize Firebase Hosting (One-Time Setup):**
    If you have never set up Firebase Hosting for this project directory before, you need to initialize it.
    ```bash
    firebase init hosting
    ```
    When prompted:
    -   Select **"Use an existing project"** and choose your `al-shahbandar` project from the list.
    -   For "What do you want to use as your public directory?", enter **`dist`**.
    -   For "Configure as a single-page app (rewrite all urls to /index.html)?", answer **Yes (y)**.
    -   For "Set up automatic builds and deploys with GitHub?", answer **No (n)** for now.
    -   It will say `firebase.json` already exists. **Do not overwrite it.**

3.  **Install Dependencies:**
    Make sure all project dependencies are installed.
    ```bash
    npm install
    ```

4.  **Build for Production:**
    Run the build script. This will compile the React/TypeScript code into optimized static files inside the `dist` directory.
    ```bash
    npm run build
    ```
    *Note: This command should be defined in your `package.json` file, typically as `vite build`.*

5.  **Deploy to Firebase Hosting:**
    After the build is complete, deploy the contents of the `dist` folder to Firebase Hosting.
    ```bash
    firebase deploy --only hosting
    ```

    The command will output the URL where your application is live. Your deployment is complete!

## Continuous Deployment via GitHub Actions

1. Add the following repository secrets in GitHub (Settings → Secrets & variables → Actions):
    - `FIREBASE_SERVICE_ACCOUNT` — the JSON content of your Firebase service account (use base64 if you prefer).
    - `FIREBASE_PROJECT_ID` — your Firebase project ID.

2. A workflow is included at `.github/workflows/deploy.yml` which will build and deploy to Firebase when you push to `main` or `master`.

3. To trigger a deployment from your machine, push changes to `main` after setting the secrets.

Notes:
- The CI workflow (`.github/workflows/ci.yml`) runs lint, unit tests and builds the site and uploads the `dist` artifact.
- For end-to-end Playwright tests, install browsers locally with `npx playwright install` and run `npm run test:e2e` against a running dev server. E2E is optional in CI by default.

## CI/CD Deploy Workflow

We added a GitHub Actions workflow at `.github/workflows/deploy.yml` that runs on pushes to `main` and deploys both Hosting and Cloud Functions.

Required repository secrets:
- `FIREBASE_SERVICE_ACCOUNT` — The JSON key file for a service account with the following roles: `Firebase Admin`, `Cloud Functions Developer`, `Firebase Hosting Admin`, `Storage Admin` (or equivalent). Paste the raw JSON as the secret value.
- `FIREBASE_PROJECT_ID` — Your Firebase project ID (e.g., `my-firebase-project`).

How it works:
- The workflow installs dependencies, runs `npm run build`, writes the `FIREBASE_SERVICE_ACCOUNT` secret to a temporary JSON file, sets `GOOGLE_APPLICATION_CREDENTIALS` and then runs `firebase deploy --only hosting,functions`.

Notes & troubleshooting:
- Ensure the service account JSON is valid and the account has sufficient permissions to deploy Hosting and Functions.
- For preview channel deploys or more advanced gating (deploy to preview on PR, production on main), we can extend the workflow to deploy to a Hosting preview channel and run Playwright tests against it before promoting to production.

### Create a service account (gcloud)

If you prefer to create a dedicated service account using the Google Cloud SDK, you can run:

```bash
# Replace with your project id
PROJECT=my-firebase-project-id
SA_NAME=github-deploy-sa

gcloud iam service-accounts create $SA_NAME --project=$PROJECT --display-name="GitHub Actions Deploy"

# Grant roles required for Firebase deploy
gcloud projects add-iam-policy-binding $PROJECT --member="serviceAccount:${SA_NAME}@${PROJECT}.iam.gserviceaccount.com" --role="roles/firebase.admin"
gcloud projects add-iam-policy-binding $PROJECT --member="serviceAccount:${SA_NAME}@${PROJECT}.iam.gserviceaccount.com" --role="roles/cloudfunctions.developer"
gcloud projects add-iam-policy-binding $PROJECT --member="serviceAccount:${SA_NAME}@${PROJECT}.iam.gserviceaccount.com" --role="roles/firebasehosting.admin"
gcloud projects add-iam-policy-binding $PROJECT --member="serviceAccount:${SA_NAME}@${PROJECT}.iam.gserviceaccount.com" --role="roles/storage.admin"

# Create JSON key
gcloud iam service-accounts keys create key.json --iam-account=${SA_NAME}@${PROJECT}.iam.gserviceaccount.com --project=$PROJECT

# Inspect key.json and copy its contents into GitHub repo secret `FIREBASE_SERVICE_ACCOUNT` (raw JSON)
```

Important: keep `key.json` secure and never commit it. Use GitHub Secrets to store the JSON.

If you want, I can:
- Extend the workflow to deploy preview channels for PRs and run Playwright tests against them.
- Add a workflow to deploy only functions when function code changes.

