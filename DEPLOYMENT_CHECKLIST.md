# Deployment Checklist

Pre-requisites

- Ensure `FIREBASE_SERVICE_ACCOUNT` and `FIREBASE_PROJECT_ID` secrets are configured in GitHub repository settings.
- Confirm `package.json` `version` is updated (v0.1.0).
- Ensure CI workflows are present (`.github/workflows/deploy.yml`, `ci.yml`, `e2e.yml`).

Steps

1. Run local smoke tests (optional but recommended):
   - Start Firebase emulators (requires Java 21+).
   - Run `npm run test:integration` against emulators.
2. Push release tag and CI will run the deploy workflow (if configured) or run manual deploy via the deploy workflow.
3. In CI, `deploy` job will:
   - Authenticate using `FIREBASE_SERVICE_ACCOUNT`.
   - Build the app and deploy hosting, functions and rules via `firebase deploy`.

Post-deploy validation

- Check hosting URL for application load.
- Verify functions logs for any runtime errors.
- Run a small set of E2E smoke tests (Playwright) against the deployed site.

Roll-back plan

- If deployment causes critical failures, revert to previous tag and re-deploy.
