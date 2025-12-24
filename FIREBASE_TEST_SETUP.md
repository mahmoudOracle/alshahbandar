# Firebase Test Setup Guide (Production-Ready)

This guide will set up your Firebase project for owner testing in **~10 minutes**.

---

## Prerequisites

- You have access to Firebase Console: https://console.firebase.google.com
- Project name: **al-shabandar**
- App is running on `http://localhost:3000`

---

## Step 1: Create Test User in Firebase Authentication

1. Go to **Firebase Console** → **al-shabandar** project
2. Click **Build** → **Authentication** (left sidebar)
3. Click **Users** tab
4. Click **Add User** button (top right)
5. Enter:
   - Email: `owner@alshabandar.com`
   - Password: `Test@123456` (must be 6+ chars with uppercase/number)
6. Click **Add User**

✅ **Test user created!**

---

## Step 2: Get the User's UID

1. In the **Users** list, click on the user you just created
2. Copy the **UID** (looks like: `abc123xyz...`)
3. **Save this UID** — you'll need it for the next steps

Example UID format: `abcDEF1234567890xyz`

---

## Step 3: Create Test Company in Firestore

1. Go to **Firebase Console** → **al-shabandar** project
2. Click **Build** → **Firestore Database** (left sidebar)
3. Click **Data** tab
4. Click **+ Start collection**
5. Collection ID: `companies`
6. Click **Next**
7. Create first document:
   - Document ID: `test-company-001` (you can customize this)
   - Add fields (click "Add field" for each):

| Field Name | Type | Value |
|-----------|------|-------|
| companyName | String | Test Trading Company |
| companyAddress | String | 123 Main Street |
| city | String | Dubai |
| country | String | UAE |
| phone | String | +971501234567 |
| email | String | owner@alshabandar.com |
| ownerName | String | Test Owner |
| ownerUid | String | `[PASTE_YOUR_UID_HERE]` |
| status | String | `approved` |
| isActive | Boolean | `true` |
| plan | String | `free` |
| createdAt | Timestamp | (auto-generated) |
| updatedAt | Timestamp | (auto-generated) |

8. Click **Save**

✅ **Company created!**

---

## Step 4: Add User Membership to Company

1. In Firestore **Data** tab, open the company you just created: `companies/test-company-001`
2. Click **+ Start subcollection**
3. Subcollection ID: `users`
4. Click **Next**
5. Create first document:
   - Document ID: `[PASTE_YOUR_UID_HERE]` (use the same UID from Step 2)
   - Add fields:

| Field Name | Type | Value |
|-----------|------|-------|
| uid | String | `[PASTE_YOUR_UID_HERE]` |
| role | String | `owner` |
| status | String | `active` |

6. Click **Save**

✅ **User membership created!**

---

## Step 5: Create User Profile in Firestore

1. In Firestore **Data** tab, click **+ Start collection** (at root level)
2. Collection ID: `users`
3. Click **Next**
4. Create first document:
   - Document ID: `[PASTE_YOUR_UID_HERE]` (same UID)
   - Add fields:

| Field Name | Type | Value |
|-----------|------|-------|
| uid | String | `[PASTE_YOUR_UID_HERE]` |
| email | String | owner@alshabandar.com |
| companyId | String | `test-company-001` |
| role | String | `owner` |
| createdAt | Timestamp | (auto-generated) |

5. Click **Save**

✅ **User profile created!**

---

## Step 6: Verify Setup in Firestore

Your Firestore should now look like this:

```
firestore
├── companies/
│   └── test-company-001/
│       ├── companyName: "Test Trading Company"
│       ├── status: "approved"
│       ├── ownerUid: "abc123..."
│       └── users/
│           └── [YOUR_UID]/
│               ├── uid: "abc123..."
│               ├── role: "owner"
│               └── status: "active"
└── users/
    └── [YOUR_UID]/
        ├── email: "owner@alshabandar.com"
        ├── companyId: "test-company-001"
        └── role: "owner"
```

---

## Step 7: Test Login in the App

1. **Make sure the app is running:**
   ```bash
   npm run dev
   ```

2. **Open the app** in browser: `http://localhost:3000`

3. **You should see a login page**

4. **Login with:**
   - Email: `owner@alshabandar.com`
   - Password: `Test@123456`

5. **Click "Sign In"**

✅ **You should now be logged in!**

---

## Step 8: Verify You Can Create Data

Once logged in:

1. **Create an Invoice:**
   - Click "الفواتير" (Invoices) in sidebar
   - Click "+ فاتورة جديدة" (New Invoice)
   - Fill in details
   - Click Save

2. **Create a Customer:**
   - Click "العملاء" (Customers)
   - Click "+ عميل جديد" (New Customer)
   - Fill in details
   - Click Save

3. **Create a Product:**
   - Click "المنتجات" (Products)
   - Click "+ منتج جديد" (New Product)
   - Fill in details
   - Click Save

✅ **If these work, Firebase is properly configured!**

---

## Troubleshooting

### Problem: "Permission Denied" Error

**Cause:** User isn't in the company's `users` collection

**Fix:**
1. Go to Firestore → `companies/test-company-001/users`
2. Add document with ID = your UID
3. Add fields: `uid`, `role: "owner"`, `status: "active"`

### Problem: Can't Log In

**Cause:** User not created or wrong password

**Fix:**
1. Go to Firebase → Authentication → Users
2. Verify user exists: `owner@alshabandar.com`
3. Reset password if needed

### Problem: "Company not found" Error

**Cause:** User profile doesn't have correct `companyId`

**Fix:**
1. Go to Firestore → `users/[YOUR_UID]`
2. Verify `companyId: "test-company-001"` (matches your company ID)

### Problem: App is blank/loading forever

**Cause:** Firebase not connecting

**Fix:**
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Look for "Firebase initialization" messages
4. Check internet connection

---

## Test Data Checklist

After setup, verify you have:

- [ ] Test user created in Firebase Authentication
- [ ] Company document in Firestore with `status: "approved"`
- [ ] User membership in `companies/{companyId}/users/{uid}`
- [ ] User profile in `users/{uid}` with correct `companyId`
- [ ] Can login with test email/password
- [ ] Can see dashboard with no errors
- [ ] Can create invoices
- [ ] Can create customers
- [ ] Can create products
- [ ] Changes persist after page refresh

---

## Sample Test Data (Ready to Copy-Paste)

If you need help filling in the Firebase Console, here's example data:

### Company Fields (Step 3)
```
companyName: "Ahmed Trading Company"
companyAddress: "Building 5, Dubai Business Park"
city: "Dubai"
country: "UAE"
phone: "+971505555555"
email: "owner@alshabandar.com"
ownerName: "Ahmed Mohammed"
ownerUid: [YOUR_UID]
status: "approved"
isActive: true
plan: "free"
```

### User Membership Fields (Step 4)
```
uid: [YOUR_UID]
role: "owner"
status: "active"
```

### User Profile Fields (Step 5)
```
uid: [YOUR_UID]
email: "owner@alshabandar.com"
companyId: "test-company-001"
role: "owner"
```

---

## Next Steps (After Testing)

Once you've verified everything works:

1. **Create more test users:**
   - Manager: `manager@alshabandar.com` (role: "manager")
   - Employee: `employee@alshabandar.com` (role: "employee")

2. **Test different roles:**
   - Owner can do everything
   - Manager can't manage users (Settings)
   - Employee can't delete data

3. **Populate with sample data:**
   - Add 5-10 test customers
   - Add 10-20 test invoices
   - Add 5-10 test products

4. **Test features:**
   - [ ] Generate reports
   - [ ] Export invoices to PDF
   - [ ] Invite team member
   - [ ] Change settings

---

## Cost Impact (This Test Setup)

- ✅ Firestore reads/writes: **FREE** (quota: 50k reads/day)
- ✅ Authentication: **FREE** (up to 100 users)
- ✅ Storage: **FREE** (5 GB included)

You won't pay anything for this test setup.

---

## Questions?

1. **"How do I find my UID?"** → Firebase Console → Authentication → Click user → Copy UID
2. **"What's the password rule?"** → Min 6 chars, must have uppercase + number
3. **"Can I use my real email?"** → Yes, use any email you can access
4. **"Will this data be deleted?"** → No, stays in Firebase until you delete it

---

**Time to complete:** ~10 minutes  
**Difficulty:** Easy (just copy-paste)  
**Result:** Fully functional production-ready testing environment

**Start now!** ✅
