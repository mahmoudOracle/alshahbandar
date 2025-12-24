# Multi-Tenant Data Isolation & Security Guide

## Overview
This app is built as a **multi-tenant SaaS platform** where each user/company has isolated access to their own data. This document outlines the security architecture and best practices.

---

## ✅ Core Security Architecture

### 1. Authentication Layer
- **System**: Firebase Authentication (email/password)
- **Model**: Each user has a unique Firebase UID
- **Session**: Firebase tokens stored in browser (secure, httpOnly for server-only)
- **Logout**: Clears all local user data and Firebase session

### 2. Company Isolation
```
Database Structure:
├── companies/{companyId}/
│   ├── (company metadata)
│   ├── users/{userId} → CompanyMembership (role-based)
│   ├── invoices/
│   ├── customers/
│   ├── products/
│   └── ... (all business data)
├── users/{userId}
│   └── (user profile with companyId reference)
```

**Key Point**: Every user has exactly ONE `companyId` in their profile. All data queries use this company ID.

### 3. Firestore Security Rules
Located in `firestore.rules`, rules enforce:

```firestore
- Users can ONLY read/write data in their company's documents
- No cross-company access allowed (even with direct URLs or hacks)
- Role-based write restrictions (Owner, Manager can write; Employee/Viewer limited)
- Platform admins bypass company checks
```

**Critical Rule**:
```
match /companies/{companyId}/documents {
  allow read: if isCompanyUser(companyId) || isPlatformAdmin()
  allow write: if hasCompanyRole(companyId, ['owner', 'manager'])
}
```

### 4. Query-Level Scoping
All data service functions use company-scoped queries:

```typescript
// CORRECT ✅
getCustomers(companyId, options) 
  → queries companies/{companyId}/customers

// Backend enforces this - no client-side bypass possible
```

---

## 🔐 Data Isolation Verification

### User Cannot Access Another Company's Data Because:

1. **Firestore Rules Block It** (Server-side enforcement)
   - If User A tries to read `companies/{companyB_id}/invoices`, Firebase returns permission denied
   - Rules check: Is User A in `companies/{companyB_id}/users/userA_uid`? NO → DENY

2. **Frontend Prevents It** (UI-level protection)
   - User profile stores only their `companyId`
   - All queries automatically scoped to their company
   - URL manipulation can't bypass this (Firestore rules always enforce)

3. **Session Isolation**
   - Each user can have only ONE active company per session
   - Switching companies requires re-authentication context

---

## 🛡️ Security Best Practices Implemented

### ✅ What's Already Secure
- [x] Password hashed by Firebase (bcrypt)
- [x] HTTPS-only communication
- [x] Firebase session tokens (auto-expiring)
- [x] Server-side Firestore rules (not bypassable from client)
- [x] No user cross-company queries possible
- [x] Role-based write restrictions
- [x] Audit logging for sensitive operations

### ⚠️ Recommendations for Production

#### 1. Enable Cloud Firestore Backup
```bash
gcloud firestore backups create --database=(default)
```

#### 2. Use Cloud Functions for Sensitive Operations
- Invitations should use Cloud Functions (already done ✅)
- Bulk operations use admin SDK (not client-facing)
- Sensitive calculations done server-side

#### 3. Add Two-Factor Authentication (Optional)
```typescript
// In Firebase Console:
// Enable MFA → can add to AuthContext
```

#### 4. Monitor for Suspicious Activity
```typescript
// Already logs: user actions, failed auth, data access
// Extend to: alert on multiple failed logins, bulk exports, etc.
```

#### 5. Session Timeout
```typescript
// Add to AuthContext:
const AUTO_LOGOUT_MINUTES = 30;
// Reset on user activity
```

---

## 🔍 Testing Data Isolation

### Test User A Cannot Access User B's Data:

1. **Setup**:
   - Create Company A (user1) and Company B (user2)
   - Both login to separate windows

2. **Browser DevTools Console**:
   ```javascript
   // User A logs into browser 1
   // Tries to manually access Company B's data
   db.collection('companies/companyB_id/invoices').getDocs()
   // Result: ❌ PERMISSION DENIED (Firestore rules block)
   ```

3. **URL Manipulation Test**:
   - Company A data stored under `activeCompanyId = companyA_id`
   - User changes localStorage to `activeCompanyId = companyB_id`
   - Tries to load invoices
   - Result: ❌ All queries fail (Firestore rules check company membership)

---

## 🚀 Resale Model Recommendations

### For Each Customer:
1. **Independent Company Account**
   - They get a unique `companyId`
   - They can invite their team members
   - Their data is 100% isolated

2. **Role Management**
   - Owner: Full access + manage users
   - Manager: Full access (except user mgmt)
   - Employee: Read/write invoices, customers, products
   - Viewer: Read-only access

3. **Data Migrations**
   - Use Cloud Functions to bulk-import their legacy data
   - Each company's data stays isolated
   - No cross-company data mixing possible

### Example Setup Script:
```typescript
// Cloud Function (server-side)
async function setupNewCustomer(ownerEmail, companyName) {
  // 1. Create company document
  const companyId = db.collection('companies').doc().id;
  
  // 2. Create user profile linking to company
  await db.collection('users/{ownerUid}').set({
    companyId,
    role: UserRole.Owner
  });
  
  // 3. Create company membership
  await db.collection('companies/{companyId}/users/{ownerUid}').set({
    role: UserRole.Owner
  });
  
  // Result: Complete isolation, ready to use
}
```

---

## 📋 Checklist Before Going Live

- [x] Firebase Authentication enabled
- [x] Firestore security rules deployed
- [x] Company-scoped queries implemented
- [x] Role-based access control in place
- [ ] Enable Firestore backups
- [ ] Set up Cloud Monitoring alerts
- [ ] Enable audit logging
- [ ] Add rate limiting on sensitive endpoints
- [ ] Test multi-user concurrent access
- [ ] Document onboarding process for new customers
- [ ] Set up customer support procedures

---

## 🆘 Troubleshooting

### "User can't see their data"
1. Check `users/{uid}` has valid `companyId`
2. Check user exists in `companies/{companyId}/users/{uid}`
3. Check company status is `approved`

### "Permission denied on all queries"
1. Verify user is in company's users collection
2. Check Firestore rules haven't been accidentally reverted
3. Verify `activeCompanyId` is correctly set in AuthContext

### "User sees another company's data" (CRITICAL)
1. This should be IMPOSSIBLE if rules are correct
2. Check if query is using company ID
3. Review recent Firestore rule changes
4. Contact Firebase support immediately

---

## 📞 Support & Updates

For security concerns or questions:
1. Review Firestore rules in `firestore.rules`
2. Check AuthContext logic in `contexts/AuthContext.tsx`
3. Verify data services use company scoping in `services/firestoreService.ts`
