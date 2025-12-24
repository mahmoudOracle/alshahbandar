# Multi-Tenant SaaS Resale Setup Guide

This guide explains how to resell the Alshabandar Trading App as a multi-tenant SaaS product where each customer gets isolated access to their own data.

---

## 📋 What Your Customers Get

Each customer receives:
- ✅ Full access to all app features (invoices, customers, products, expenses, etc.)
- ✅ Completely isolated data (cannot see other customers' data)
- ✅ User management (can invite their team)
- ✅ Role-based access control (Owner, Manager, Employee, Viewer)
- ✅ Secure login with username/password

---

## 🚀 Customer Onboarding Process

### Step 1: Create Customer Company Account
When a new customer signs up:

```bash
# Option A: Manual Setup (via Firebase Console + Cloud Functions)
1. Create new document in Firestore: companies/{newCompanyId}
   Fields:
   - companyName: "Customer Company Name"
   - companyAddress: "123 Main St"
   - city: "Dubai"
   - country: "UAE"
   - phone: "+971501234567"
   - email: "owner@company.com"
   - ownerUid: "{firebase_uid_of_owner}"
   - ownerName: "Owner Name"
   - status: "pending" (until you approve)
   - createdAt: Timestamp.now()

2. Customer registers via app with email/password
3. App creates user profile: users/{uid}
   Fields:
   - email: "owner@company.com"
   - companyId: "{newCompanyId}"
   - role: "owner"
   - createdAt: Timestamp.now()

4. You approve in admin dashboard: status → "approved"

# Option B: Programmatic Setup (Recommended)
Use Cloud Function: setupNewCustomerAccount(
  ownerEmail: "owner@company.com",
  companyName: "Customer Company Name",
  companyDetails: {...}
)
```

### Step 2: Customer Logs In
```
1. Customer enters: username (email) + password
2. Firebase authenticates
3. App loads user profile → reads companyId
4. App loads company data (if status = "approved")
5. User can access ONLY their company's data
```

### Step 3: Customer Manages Their Team
```
1. Owner logs in → goes to Settings > Users
2. Invites team members (manager@company.com)
3. Team member accepts invite → gets access
4. Owner can set roles: Owner, Manager, Employee, Viewer
```

---

## 🔐 Data Isolation - Technical Details

### Database Structure
```
companies/
├── {companyId_A}/
│   ├── (company metadata)
│   ├── users/
│   │   ├── {userId_1} → CompanyMembership (Owner)
│   │   └── {userId_2} → CompanyMembership (Employee)
│   ├── invoices/
│   │   └── {invoiceId} → Invoice (visible to both users)
│   ├── customers/
│   │   └── {customerId} → Customer (visible to both users)
│   └── products/
│       └── {productId} → Product (visible to both users)
│
└── {companyId_B}/
    ├── (company metadata)
    ├── users/
    │   └── {userId_3} → CompanyMembership (Owner)
    ├── invoices/
    │   └── {invoiceId} → Invoice (ONLY visible to userId_3)
    ├── customers/
    └── products/

users/
├── {userId_1} → { companyId: companyId_A, role: "owner", email: "user1@companyA.com" }
├── {userId_2} → { companyId: companyId_A, role: "employee", email: "user2@companyA.com" }
└── {userId_3} → { companyId: companyId_B, role: "owner", email: "owner@companyB.com" }
```

### Security Rules (Enforced at Database Level)
```firestore
// User A from Company A tries to access Company B's invoices:
db.collection('companies/companyB/invoices').getDocs()

// Firebase checks:
// 1. Is request.auth.uid in companies/companyB/users/{uid}? NO
// 2. Return: ❌ PERMISSION DENIED

// Even if User A manually crafts the query, it's blocked at the database level.
// No client-side hack can bypass this.
```

---

## 📊 Multi-Customer Example

### Scenario: Three Customers
```
Customer 1: "Ahmed Trading"
- Owner: ahmed@trading.com (uid: abc123)
- Employee: fatima@trading.com (uid: def456)
- Data: 50 invoices, 30 customers, 20 products
- Can see: ONLY their data

Customer 2: "Noor Distribution"
- Owner: noor@distribution.com (uid: ghi789)
- Manager: rayan@distribution.com (uid: jkl012)
- Employee: sara@distribution.com (uid: mno345)
- Data: 100 invoices, 50 customers, 30 products
- Can see: ONLY their data

Customer 3: "Layla Import"
- Owner: layla@import.com (uid: pqr678)
- Data: 20 invoices, 15 customers, 10 products
- Can see: ONLY their data

Total in Firestore:
- 170 invoices (Ahmed: 50, Noor: 100, Layla: 20)
- 95 customers (Ahmed: 30, Noor: 50, Layla: 15)
- 60 products (Ahmed: 20, Noor: 30, Layla: 10)

But:
- Ahmed can only query: companies/companyA/invoices → 50 results
- Noor can only query: companies/companyB/invoices → 100 results
- Layla can only query: companies/companyC/invoices → 20 results

Even if Ahmed tries to query Noor's data, Firestore returns permission denied.
```

---

## 💰 Pricing & Billing Model

### Option 1: Per-Company Fixed Fee
```
$29/month per company subscription
- Unlimited users per company
- Unlimited invoices/customers
- Unlimited reports
```

### Option 2: Usage-Based Pricing
```
$99/month base
+ $0.10 per invoice
+ $0.05 per customer
+ $0.02 per payment
```

### Option 3: Tiered Plans
```
Starter: $19/month
- 1 user, 100 invoices/month

Professional: $49/month
- 5 users, 1000 invoices/month, API access

Enterprise: Custom
- Unlimited users, invoices, API, support
```

**Recommended**: Per-company fixed fee is easiest to manage and scale.

---

## 🛠️ Admin Dashboard Tasks

### For You (Platform Admin)
Located in: `/admin` (auto-routes platform admins here)

Tasks:
1. ✅ View all companies
2. ✅ Approve/reject new companies
3. ✅ View company metrics (user count, invoice count)
4. ✅ Monitor activity
5. ✅ Handle disputes (export company data if needed)

### Customer Self-Service
Available in: `/settings` (for each company)

Tasks:
1. ✅ Update company profile
2. ✅ Manage team members (invite, remove, change roles)
3. ✅ View billing
4. ✅ Download reports

---

## 🔧 Backend Setup

### Cloud Functions (Already Configured)
```typescript
// functions/index.js
- createCompanyAsAdmin() // Only platform admins can call
- getAdminCompanies() // Platform admin dashboard
- setupNewCustomerAccount() // Onboarding automation
- inviteUser() // Send invite emails to team members
```

### Firestore Indexes (Auto-Created)
```
// These are automatically created for efficient queries:
- companies/{companyId}/invoices (created_at, status)
- companies/{companyId}/customers (created_at, isActive)
- companies/{companyId}/payments (customer_id, created_at)
```

---

## 📈 Going Live Checklist

### Pre-Launch
- [ ] Enable Firebase Authentication
- [ ] Deploy Firestore Security Rules
- [ ] Deploy Cloud Functions
- [ ] Set up email templates for invitations
- [ ] Configure error reporting (Sentry)
- [ ] Enable backups

### Launch Week
- [ ] Onboard first 3 test customers
- [ ] Verify data isolation (test multiple users)
- [ ] Monitor performance (Firestore usage)
- [ ] Have support ready

### Post-Launch
- [ ] Collect customer feedback
- [ ] Monitor Firestore costs (adjust pricing if needed)
- [ ] Add more features based on feedback

---

## 📞 Common Support Questions

### Q: "Can I see what data is in the app?"
A: Only your company's data is visible in the app. You cannot see other customers' data.

### Q: "What if I need to switch companies?"
A: If you own multiple companies, contact admin to add you to each company. You can then switch between them in the company selector.

### Q: "How do I invite my team?"
A: Go to Settings > Users > Invite User. Enter their email and select their role. They'll receive an invitation link.

### Q: "Is my data encrypted?"
A: Yes. All data is encrypted in transit (HTTPS) and at rest (Firestore encryption). Only you and your team can access it.

### Q: "Can I export my data?"
A: Yes. Go to Reports and download CSV exports. You own all your data.

---

## 🚨 Emergency Procedures

### If Customer Data is Compromised
```
1. Immediate: Revoke user sessions
   - Go to Firebase Console → Authentication
   - Disable customer's user accounts
   
2. Investigation: Check audit logs
   - See which user accessed what data and when
   
3. Recovery: Restore from backup
   - Firebase can restore from backup
   - Firestore point-in-time recovery
   
4. Communication: Notify customer ASAP
```

### If You Suspect Data Breach
```
1. Pause all operations
2. Check Firebase activity log
3. Contact Firebase support
4. Review Firestore rules for gaps
5. Force re-authentication for all users
```

---

## 📚 Documentation for Customers

Create a knowledge base article for each topic:
1. How to login
2. How to create invoices
3. How to manage customers
4. How to invite team members
5. How to reset password
6. How to export data
7. FAQ

Example: `https://help.alshabandar.com/getting-started`

---

## 💡 Revenue Optimization Tips

1. **Freemium Model**: Free plan with 10 invoices/month, paid plans for more
2. **Upselling**: Include premium features (API, custom reports, integrations)
3. **Annual Plans**: Offer 20% discount for annual billing
4. **Enterprise**: Contact sales for custom deployments
5. **Referral Program**: 10% commission for customer referrals

---

## 🎯 Next Steps

1. **This Week**:
   - [ ] Review security rules
   - [ ] Test with 3 customers
   - [ ] Set up admin dashboard

2. **This Month**:
   - [ ] Deploy to production
   - [ ] Onboard first 10 customers
   - [ ] Collect feedback

3. **This Quarter**:
   - [ ] Scale to 100 customers
   - [ ] Add analytics dashboard
   - [ ] Implement billing automation

---

## 📞 Questions?

Refer to:
- [MULTI_TENANT_SECURITY.md](./MULTI_TENANT_SECURITY.md) - Security deep dive
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment instructions
- Firestore docs: https://firebase.google.com/docs/firestore
- Firebase auth: https://firebase.google.com/docs/auth
