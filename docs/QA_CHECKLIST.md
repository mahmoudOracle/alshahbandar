# QA Checklist

Purpose: concise, executable tests for core flows. Run on web app using HashRouter URLs.

## 1) Login (valid/invalid) + reset password
Steps:
1) Open login screen.
2) Enter a valid email/password.
3) Submit.
Expected:
- User is signed in, app loads main layout.
- No error message shown.

Steps:
1) Enter an invalid email or wrong password.
2) Submit.
Expected:
- Clear error message.
- User stays on login screen.

Steps:
1) Click "Forgot password" (or reset link).
2) Enter a registered email.
3) Submit.
Expected:
- Confirmation shown (email sent).
- No crash or navigation loop.

## 2) First login bootstrap (membership missing)
Precondition: user profile exists, company doc exists, membership doc missing at `companies/{companyId}/users/{uid}`.
Steps:
1) Sign in as the company owner (owner uid/email matches company doc).
2) Observe login.
Expected:
- App loads without crash.
- Membership doc is created (role=owner).
- No "No access" blocking message.

Steps:
1) Sign in as a non-owner with missing membership.
Expected:
- App loads but shows a clear warning to contact owner.
- No crash; user cannot edit protected sections.

## 3) Company status not approved
Precondition: company doc status is "pending" or "rejected".
Steps:
1) Sign in with a user tied to that company.
Expected:
- Access is blocked with a clear message.
- No data pages render.

## 4) Dashboard "ملخّص"
Steps:
1) Open `/#/`.
Expected:
- Title shows "ملخّص".
- Totals reflect invoice count and customer count.
- Total revenue uses invoice total field if present.

Empty state:
1) Use a company with zero invoices/customers.
Expected:
- Empty states show friendly messages.
- No crashes.

## 5) Reports
Steps:
1) Open `/#/reports`.
2) Select date range preset (7/30/90) and custom dates.
Expected:
- Summary totals update for the range.
- Records list updates.

Fallback totals:
1) Use a company with invoices but no payments.
Expected:
- Revenue still shows (from invoice totals).

## 6) Settings
Steps:
1) Open `/#/settings`.
2) Verify users list loads (if you have access).
3) Load invitations list.
Expected:
- Settings page renders; no "No routes matched" error.
- Invitations load or show empty state without crashing.

Permissions:
1) Log in as a non-owner.
2) Open settings.
Expected:
- Access denied message shown for editing.
- Route still renders.

Role change:
1) As owner/manager, change a user role.
Expected:
- Role updates or queued; UI stays stable.

## 7) Offline / DNS failure
Steps:
1) Disconnect network or block Firestore endpoint.
2) Open Dashboard and Reports.
Expected:
- Offline banner or error message appears.
- No forced logout.
- App remains usable where cached; shows empty/loading states gracefully.

## 8) Payments + Statement + Export
Steps:
1) From invoice detail, click "تسجيل دفعة" and verify amount is prefilled with remaining.
2) Try a payment amount greater than remaining.
Expected:
- Save is blocked with Arabic error.

Steps:
1) From customer detail, click "تسجيل دفعة".
2) Select "دفعة على الحساب" and save.
Expected:
- Payment saved and appears in customer statement.

Steps:
1) Open "كشف حساب العميل".
2) Verify running balance with mixed invoices/payments.
Expected:
- Rows sorted by date ascending and balance updates correctly.

Steps:
1) Export statement as PDF and PNG.
2) Export reports as PDF and PNG.
Expected:
- Arabic header/footer renders correctly.

## 9) Low Stock + Returns + Supplier Statement
Low stock:
1) Set reorder level for a product.
2) Reduce stock below reorder level.
Expected:
- Dashboard shows low stock count.
- Products filter "منخفض" shows the item.

Returns:
1) Open an invoice and click "مرتجع".
2) Return a quantity for a product and save.
Expected:
- Return appears in invoice returns list.
- Product stock increases by returned quantity.

Reports:
1) Open Reports.
Expected:
- Returns are shown as "مرتجعات" and net sales reflects sales - returns.

Supplier statement:
1) Open a supplier and view "كشف حساب المورد".
2) Add a supplier payment and export PDF/PNG.
Expected:
- Running balance updates correctly and export renders Arabic header/footer.
