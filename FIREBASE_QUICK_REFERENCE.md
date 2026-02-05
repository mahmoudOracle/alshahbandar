# Firebase Configuration Quick Reference

## 🔐 Your Firebase Credentials

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

**Company ID:** `uv9acIebvvNgx9ftSnPh`

---

## ⚡ Quick Start (3 Steps)

```bash
# 1. Start dev server
npm run dev

# 2. Open browser → http://localhost:5173
# 3. Paste Firebase config → Save & Reload
```

---

## 🛠️ Setup Methods

| Method | Command | Speed | Best For |
|--------|---------|-------|----------|
| Web Form | Visit app → Paste JSON | 2 min | Browser-based |
| HTML Helper | Open `setup-firebase.html` | 1 min | Quick setup |
| Script | `node setup-firebase.js` | 1 min | Automation |
| Manual | Edit `.env.local` | 2 min | Fine control |

---

## 📍 Configuration Storage

**Location:** Browser localStorage
**Key:** `app:firebaseWebConfig`
**Persistence:** Until cleared

To verify setup:
1. Open DevTools (F12)
2. Storage → Local Storage
3. Look for `app:firebaseWebConfig`

---

## ✅ Verification

After setup, check:

- [ ] App loads (no "Firebase Setup Required" page)
- [ ] DevTools → Storage has `app:firebaseWebConfig`
- [ ] No Firebase errors in console
- [ ] Company data visible in app

---

## ❌ Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "Firebase Setup Required" | Config not saved | Go to setup page → Paste JSON → Save |
| "Company not found" | Wrong company ID | Verify ID is `uv9acIebvvNgx9ftSnPh` |
| Permission denied | Firebase rules issue | Check Firestore Security Rules |
| Connection failed | Network/credentials | Verify API key and Firebase project |

---

## 🚀 Environment Variables

**Already configured in `.env.local`:**
```bash
VITE_COMPANY_ID=uv9acIebvvNgx9ftSnPh
```

**Optional settings:**
```bash
VITE_USE_FIREBASE_EMULATORS=false  # For local testing
VITE_FREE_MODE=true                 # Disable cloud functions
```

---

## 🔗 Firebase Project URLs

- **Firebase Console:** https://console.firebase.google.com/project/al-shabandar
- **Firestore:** https://console.firebase.google.com/project/al-shabandar/firestore
- **Authentication:** https://console.firebase.google.com/project/al-shabandar/authentication
- **Storage:** https://console.firebase.google.com/project/al-shabandar/storage

---

## 🎯 What Gets Saved Where

| Item | Storage | Key |
|------|---------|-----|
| Firebase Config | localStorage | `app:firebaseWebConfig` |
| Company ID | `.env.local` + localStorage | `VITE_COMPANY_ID` + `app:companyId` |
| Company Name | localStorage | `app:companyName` |
| Auto-create Flag | localStorage | `app:autoCreateCompany` |

---

## 💡 Pro Tips

1. **Setup Once:** Firebase config is saved in localStorage
2. **Multi-Customer:** Each customer has own Firebase project
3. **Offline Check:** Look in localStorage to debug
4. **Clear Setup:** `localStorage.clear()` in console to reset
5. **Test First:** Click "Test Connection" before saving

---

## 📞 Need Help?

1. Check `FIREBASE_SETUP.md` for detailed docs
2. Review browser console (F12) for errors
3. Verify Firestore Security Rules
4. Check Firebase project status

---

**Project:** Al-Shabandar Trading App
**Type:** Multi-Tenant ERP
**Firebase:** Web SDK v9+
**Status:** ✅ Ready

