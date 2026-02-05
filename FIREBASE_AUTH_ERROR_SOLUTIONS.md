# 🔴 FIREBASE NETWORK ERROR - SOLUTIONS

**Error:** `net::ERR_NAME_NOT_RESOLVED` on `identitytoolkit.googleapis.com`

**Problem:** Firebase authentication can't reach Google's servers

---

## Solution 1: Check Your Internet Connection ⚡

### Verify connectivity
```bash
ping google.com
ping identitytoolkit.googleapis.com
```

If these fail:
- ✅ Check your WiFi/Ethernet connection
- ✅ Restart your router/network
- ✅ Check firewall/proxy settings
- ✅ Try a different network

---

## Solution 2: Check Firewall/Proxy 🔒

### Windows
1. Open **Windows Defender Firewall**
2. Click **Allow an app through firewall**
3. Make sure your browser (Chrome/Firefox/Edge) is allowed
4. Restart the app

### MacOS
1. System Preferences → Security & Privacy → Firewall
2. Click **Firewall Options**
3. Make sure apps are not blocked

### Linux
```bash
sudo ufw allow 443      # HTTPS
sudo ufw allow 80       # HTTP
```

---

## Solution 3: Use Mock Mode (Temporary) 🧪

If you can't connect to Firebase right now, use mock mode for development:

### Option A: Automatic Mock Mode

**File:** `.env.local`

Add this line:
```env
VITE_USE_MOCK_MODE=true
```

This will:
- ✅ Skip real Firebase authentication
- ✅ Use in-memory mock data
- ✅ Simulate login without network
- ✅ Let you test the app locally

### Option B: Check If Mock Mode Exists

Look for environment variables in your `.env` files:
```bash
VITE_USE_MOCK_MODE=true
VITE_MOCK_AUTH=true
```

---

## Solution 4: Check Firebase Configuration 🔧

Your Firebase config might be wrong or missing:

### Verify Firebase credentials
1. Go to http://localhost:3002/setup/firebase
2. Paste your Firebase web config
3. Click Save

### Your API Key
```
AIzaSyBVkrMWNJ1nKCYkmbSJEfnXjy1_i7SX8Co
```

This key looks valid. Make sure it:
- ✅ Is enabled in Firebase Console
- ✅ Has "Identity Toolkit API" enabled
- ✅ Has authentication enabled

### Check Firebase Console
1. Go to https://console.firebase.google.com
2. Select your project "al-shabandar"
3. Go to Settings → API Keys
4. Verify the key is enabled
5. Check "Authentication" is enabled

---

## Solution 5: Use Firebase Emulator (Local Testing) 🏗️

If you want to test without internet, use Firebase Emulator:

### Setup Emulator
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Start emulators
firebase emulators:start --only auth,firestore
```

### Enable Emulator in App
Create/edit `.env.local`:
```env
VITE_USE_EMULATORS=true
VITE_AUTH_EMULATOR_HOST=127.0.0.1
VITE_AUTH_EMULATOR_PORT=9099
```

Then restart dev server:
```bash
npm run dev
```

Now you can:
- ✅ Create test accounts
- ✅ Login without internet
- ✅ Test auth flows locally

---

## Solution 6: Network Debugging 🔍

Check network requests in browser:

### Step 1: Open DevTools
Press `F12` (or `Cmd+Option+I`)

### Step 2: Go to Network Tab
Click **Network**

### Step 3: Try to login
Fill in credentials and click Sign In

### Step 4: Look for failed requests
You should see a failed request to:
```
https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword
```

Status will be one of:
- `net::ERR_NAME_NOT_RESOLVED` - DNS issue
- `net::ERR_FAILED` - Connection refused
- `CORS error` - Firewall/proxy blocking
- `401` - Invalid credentials
- `503` - Google service down

---

## Solution 7: Try Different Login Credentials 📝

Maybe your account doesn't have the right permissions:

### Test with a known account
1. Go to Firebase Console
2. Go to Authentication → Users
3. Create a new test user with:
   - Email: `test@example.com`
   - Password: `Test123!@`

### Try login with test account
- Email: `test@example.com`
- Password: `Test123!@`

If it works:
- ✅ Network is fine
- ✅ Firebase is configured correctly
- ✅ Your original account might have issues

If it fails:
- ❌ Network or Firebase config issue

---

## Solution 8: Check Google API Status 🌐

Google's servers might be down:

### Check status
Go to: https://www.google.com/appsstatus

Look for **Firebase** or **Google Identity Toolkit**

If it shows issues, wait for Google to fix it.

---

## Quick Troubleshooting Checklist

- [ ] Do you have internet connection? (ping google.com)
- [ ] Is your firewall/proxy blocking requests?
- [ ] Is Firebase configured correctly?
- [ ] Is your API key valid in Firebase Console?
- [ ] Is "Identity Toolkit API" enabled?
- [ ] Is authentication enabled in Firebase?
- [ ] Are you using the correct Firebase project?
- [ ] Can you reach other websites normally?
- [ ] Have you tried the mock mode?
- [ ] Have you tried the Firebase emulator?

---

## What to Do Now

### If you have internet:
1. Verify Firebase configuration
2. Check firewall settings
3. Restart browser and app
4. Try again

### If you don't have internet:
1. Use mock mode: `VITE_USE_MOCK_MODE=true` in `.env.local`
2. Or use Firebase Emulator
3. Or connect to internet

### If it still fails:
1. Check Firebase Console
2. Verify API key
3. Enable required APIs
4. Check Google's status page
5. Contact Firebase support

---

## Recommended: Enable Mock Mode Now

**Fastest solution:**

### Step 1: Create `.env.local` file
In project root, create `.env.local`:

```env
# Use mock mode for testing
VITE_USE_MOCK_MODE=true
```

### Step 2: Restart dev server
```bash
npm run dev
```

### Step 3: Login with any credentials
- Email: `test@example.com`
- Password: `anything`

This will let you test the app while the network issue is being resolved.

---

## Reference Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `net::ERR_NAME_NOT_RESOLVED` | DNS issue | Check internet, firewall |
| `net::ERR_FAILED` | Connection refused | Check firewall, proxy |
| `CORS error` | Firewall blocking | Check network settings |
| `401 Unauthorized` | Wrong credentials | Check password, account |
| `503 Service Unavailable` | Google down | Wait for Google to fix |
| `firebase/network-request-failed` | Network issue | Same as above |

---

**Status: Choose Solution 1-8 above and let me know what happens!** 🔧
