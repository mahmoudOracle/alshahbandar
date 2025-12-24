# Enable Mock/Offline Mode for Testing

If you want to test the app **without Firebase** (for UI/UX testing), follow these steps:

## Option 1: Use Mock Data Locally (Fastest)

Edit `index.tsx` and change:

```typescript
// Change this:
import * as firestoreService from './services/firestoreService';
setDataServiceImpl(firestoreService, 'firestore');

// To this:
import * as mockService from './services/mockService';
setDataServiceImpl(mockService, 'mock');
```

Then restart the app (`npm run dev`).

**What you get:**
- ✅ Mock user logged in automatically
- ✅ Fake data (invoices, customers, products)
- ✅ Can create/edit/delete (stored in memory)
- ✅ Full UI functionality
- ❌ Data disappears on page refresh
- ❌ Not connected to Firebase

## Option 2: Use Real Firebase (Recommended for Production Testing)

1. **Create a test user:**
   - Go to Firebase Console → Authentication
   - Add a test user email: `test@example.com` password: `password123`

2. **Ensure Firestore rules allow writes:**
   - Check `firestore.rules` 
   - Verify rules allow authenticated users to write to their company

3. **Create a test company in Firestore:**
   - Go to Firebase Console → Firestore
   - Add collection `companies` with a document (e.g., `test-company-123`)
   - Add fields: `companyName`, `status: "approved"`, `ownerUid: [user-uid]`
   - Add subcollection `users/{user-uid}` with `role: "owner"`

4. **Login with your test account**

## Troubleshooting

**"I can't write data"**
- Check browser console (F12) for errors
- Verify Firestore rules allow writes
- Check if user is authenticated (see AuthContext logs)
- Ensure company exists and user is a member

**"Data disappears on refresh"**
- You're using mock mode (data is in memory only)
- Switch to Firebase mode to persist data

**"I see 'Permission Denied' errors"**
- Firestore rules are blocking writes
- Check your user role and company membership in Firestore

## Quick Toggle: Use Environment Variable

Add to `.env.local`:
```
VITE_USE_MOCK=true
```

Then in `index.tsx`:
```typescript
const useMock = import.meta.env.VITE_USE_MOCK === 'true';
const service = useMock ? mockService : firestoreService;
setDataServiceImpl(service, useMock ? 'mock' : 'firestore');
```

Then toggle with:
```bash
VITE_USE_MOCK=true npm run dev   # Mock mode
VITE_USE_MOCK=false npm run dev  # Firebase mode
```
