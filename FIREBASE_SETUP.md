# Firebase Setup Instructions

## Your Firebase Configuration

Your Firebase project has been configured with the following credentials:

```json
{
  "apiKey": "AIzaSyBVkrMWNJ1nKCYkmbSJEfnXjy1_i7SX8Co",
  "authDomain": "al-shabandar.firebaseapp.com",
  "projectId": "al-shabandar",
  "storageBucket": "al-shabandar.firebasestorage.app",
  "messagingSenderId": "145557395180",
  "appId": "1:145557395180:web:401b8f099bfb6d899e37c9",
  "measurementId": "G-FGH0FLMVWB"
}
```

**Project ID:** `al-shabandar`
**Company ID:** `uv9acIebvvNgx9ftSnPh` (already set in `.env.local`)

---

## How to Apply This Configuration

### Option 1: Use the Web Setup Page (Recommended)

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the app in your browser (typically `http://localhost:5173`)

3. You should see the **Firebase Setup Required** page

4. Paste the Firebase config JSON into the textarea:
   ```json
   {
     "apiKey": "AIzaSyBVkrMWNJ1nKCYkmbSJEfnXjy1_i7SX8Co",
     "authDomain": "al-shabandar.firebaseapp.com",
     "projectId": "al-shabandar",
     "storageBucket": "al-shabandar.firebasestorage.app",
     "messagingSenderId": "145557395180",
     "appId": "1:145557395180:web:401b8f099bfb6d899e37c9",
     "measurementId": "G-FGH0FLMVWB"
   }
   ```

5. The Company ID should auto-populate from `VITE_COMPANY_ID` environment variable

6. Click **"Test Connection"** to verify the Firebase project is accessible

7. Click **"Save & Reload"** to save the configuration

### Option 2: Use the HTML Setup Helper

1. Open `setup-firebase.html` in your browser (created in the workspace root)

2. Click **"Load Example"** to populate with your Firebase config

3. Click **"Save & Close"** to save to localStorage

### Option 3: Set Environment Variables (`.env.local`)

Add these to your `.env.local` file:

```bash
VITE_COMPANY_ID=uv9acIebvvNgx9ftSnPh

# Optional: Set Firebase config via environment variables
# VITE_FIREBASE_API_KEY=AIzaSyBVkrMWNJ1nKCYkmbSJEfnXjy1_i7SX8Co
# VITE_FIREBASE_AUTH_DOMAIN=al-shabandar.firebaseapp.com
# VITE_FIREBASE_PROJECT_ID=al-shabandar
# VITE_FIREBASE_APP_ID=1:145557395180:web:401b8f099bfb6d899e37c9
```

---

## Verification

After saving the configuration, you should:

✓ See the app load without "Firebase Setup Required" page
✓ Be able to authenticate with Firebase
✓ Access the company data from Firestore
✓ See no console errors related to Firebase initialization

---

## Troubleshooting

### Issue: "Firebase setup missing" error
- **Solution:** The configuration is stored in localStorage. Check:
  - Open Developer Tools → Storage → Local Storage
  - Look for `app:firebaseWebConfig` key
  - It should contain your Firebase config

### Issue: "Company ID is missing"
- **Solution:** Set `VITE_COMPANY_ID` in `.env.local` or enter it during setup:
  - Currently set to: `uv9acIebvvNgx9ftSnPh`

### Issue: Connection test fails
- **Solution:** Verify your Firebase project:
  - Check the API key is correct
  - Ensure Firebase Auth and Firestore are enabled in your project
  - Check Firestore security rules allow access

### Issue: Company not found after test
- **Solution:** Either:
  - Check the Company ID is correct
  - Enable "Auto-create company in Firestore" if this is a new setup
  - Manually create the company document in Firestore

---

## Storage Location

The application stores your Firebase configuration in the browser's localStorage:

- **Key:** `app:firebaseWebConfig`
- **Location:** Same origin localStorage (per browser/domain)
- **Persistence:** Remains until cleared

To view: Open DevTools → Storage → Local Storage → Look for `app:firebaseWebConfig`

---

## Multi-Tenant Support

This application supports multi-tenant setups where each customer has their own Firebase project:

- Each Firebase project must have:
  - Firestore database enabled
  - Firebase Authentication enabled
  - Firebase Storage enabled (optional)
  
- Company data structure in Firestore:
  ```
  /companies/{companyId}/
    ├── name (string)
    ├── createdAt (timestamp)
    └── [other company fields]
  ```

---

## Security Notes

⚠️ **Important:**
- Firebase web API keys are **public** by design (embedded in web apps)
- Protect your data using Firestore Security Rules
- Do NOT commit `.env.local` or localStorage data to version control
- Each customer should use their own Firebase project for data isolation

---

## Next Steps

1. ✅ Firebase config saved
2. ⏳ Start dev server: `npm run dev`
3. ⏳ Navigate to the app
4. ⏳ Complete setup form if prompted
5. ⏳ Verify connection works
6. ⏳ Start using the app!

---

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify Firebase project credentials
3. Check Firestore security rules
4. Review the application logs

