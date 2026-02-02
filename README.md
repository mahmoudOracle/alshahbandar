# Alshabandar Business Suite - Frontend Setup

This application uses your browser's local storage to manage Firebase configuration. This lets each customer connect the app to their own Firebase project (no backend costs on the reseller).

## Running Locally

1.  **Run the Development Server:**
    Start the application using your local development server command (e.g., `npm run dev` or `npm start`).

2.  **Provide Firebase Configuration:**
    On first launch, the application will show a setup screen. Paste the Firebase config JSON from the customer's Firebase project settings and save. The app will reload and connect to that backend.

## Environment configuration

- Copy `.env.local.example` to `.env.local`.
- Add `VITE_COMPANY_ID=uv9acIebvvNgx9ftSnPh` to the file (optional; you can also set the Company ID in the setup screen).
- Optional: set `VITE_FREE_MODE=true` (default) to avoid Cloud Functions.
- Restart `npm run dev` or any running dev server after updating `.env.local`; Vite only re-reads env at startup.
- Verify the value is loaded by opening `/dev/db` in the browser (DEV only) and checking the Env panel or watching for the new fatal error message if the var is missing.

## Backend Setup

For no-cost (Spark plan) usage, deploy the provided Firestore rules and use free-mode client transactions. Cloud Functions are optional and only needed for advanced features like invitation emails or server-side admin dashboards.

1.  **Deploy Firestore Rules:**
    - Go to your Firebase Console -> Firestore -> Rules.
    - Copy the contents of `firestore.rules` from this project.
    - Paste them into the editor and click **Publish**.

2.  **Deploy Cloud Functions (Optional):**
    - You will need to set up a `functions` directory with `index.js` and `package.json` as specified in the technical report.
    - Follow the official Firebase documentation to deploy your functions using the Firebase CLI (`firebase deploy --only functions`).
    - If you want to stay fully free-tier, skip this step and keep `VITE_FREE_MODE=true` (default).

## Development

- Install dependencies:

```bash
npm install
```

- Run dev server:

```bash
npm run dev
```

### Mock mode & Firebase emulators (helpful for development)

- To use the in-memory mock service (shows sample data without a Firebase backend), create a `.env.local` file with:

```
VITE_USE_MOCK=true
```

- To connect the app to local Firebase emulators (Functions, Firestore, Auth), set:

```
VITE_USE_EMULATORS=true
VITE_FIRESTORE_EMULATOR_HOST=localhost
VITE_FUNCTIONS_EMULATOR_HOST=localhost
VITE_AUTH_EMULATOR_HOST=localhost
VITE_FIRESTORE_EMULATOR_PORT=8080
VITE_AUTH_EMULATOR_PORT=9099
VITE_FUNCTIONS_EMULATOR_PORT=5001
```

Then run the Firebase emulators and the dev server:

```bash
firebase emulators:start --only functions,firestore,auth
npm run dev
```

Using mock mode is the quickest way to see `Dashboard` and `Reports` populated when production Cloud Functions or Firestore access is restricted.

## Deploy checklist & one-command verification

I added a convenience script `scripts/deploy-and-verify.ps1` to deploy functions and perform basic verification steps.

Usage (PowerShell):

```powershell
# Deploy only the new `isPlatformAdmin` function and verify
.\scripts\deploy-and-verify.ps1

# Deploy all functions (may take longer)
.\scripts\deploy-and-verify.ps1 -AllFunctions
```

What the script does:

- Reads `projectId` from `FIREBASE_PROJECT` env var (or a local `public/config/firebase.json` if you create one).
- Ensures you are logged in to the Firebase CLI.
- Deploys the `isPlatformAdmin` function (falls back to all functions).
- Lists deployed functions and looks for `isPlatformAdmin`.
- Tails recent logs for `isPlatformAdmin` to show any runtime errors.

After deployment, disable mock mode locally (remove or set `.env.local` `VITE_USE_MOCK=false`) and restart `npm run dev` to verify the frontend connects to the live backend.

## Linting & Formatting

- Lint the codebase:

```bash
npm run lint
```

- Auto-fix and format:

```bash
npm run lint:fix
npm run format
```

## Testing

This project uses Vitest and Testing Library for unit tests.

- Run tests once:

```bash
npm run test
```

- Run tests in watch mode:

```bash
npm run test:watch
```

If you add a Sentry DSN to environment (Vite):

```bash
// .env
VITE_SENTRY_DSN=https://____@o0.ingest.sentry.io/0
```

The app will call `initSentry()` at startup when the env var is present.

## Deployment (CI)

This repo includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds and deploys the app to Firebase. Before enabling it, add the following repository secrets:

- `FIREBASE_SERVICE_ACCOUNT` — JSON service account contents (use a service account with deploy permissions).
- `FIREBASE_PROJECT_ID` — your Firebase project id.

The workflow will:

- install dependencies
- run `npm run build`
- deploy `hosting`, `functions`, and `firestore:rules` using `firebase deploy`.

Important:

- Do NOT commit your `service-account.json` to the repo. Add it as a GitHub secret and remove any existing committed copies.
- Verify your `functions/` directory contains the Cloud Functions code and `package.json`.

If you prefer to deploy manually, run:

```bash
# install firebase-tools (if not already)
npx firebase-tools login
npx firebase-tools deploy --project YOUR_PROJECT_ID --only hosting,functions,firestore:rules
```

## Create a GitHub repository (optional)

You can create a GitHub repo and push this project using the GitHub CLI. Example:

```bash
# create and push (requires gh auth login)
bash scripts/create_github_repo.sh my-org/alshabandar-trading-app private
```

The script will create the repo, set `origin`, and push the current branch. After creating the repo, add the required repository secrets (`FIREBASE_SERVICE_ACCOUNT` and `FIREBASE_PROJECT_ID`) in the repository settings.
