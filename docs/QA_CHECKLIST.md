# QA Checklist
ملاحظة: هذا الملف محفوظ بترميز UTF-8

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
Precondition: user profile exists, company doc exists, membership doc missing at `companies/{companyId}/members/{uid}`.
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
- الرسالة العربية تظهر بشكل صحيح بدون أي ترميز مثل \uXXXX.

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
1) Open an invoice and click "إنشاء مرتجع".
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
2) Toggle opening balance and verify running balance.
3) Add a supplier payment and export PDF/PNG.
Expected:
- Running balance updates correctly and export renders Arabic header/footer.

## 10) QR Invoice + WhatsApp Share
Steps:
1) Open an invoice detail page.
2) Verify "QR الفاتورة" appears and scan it.
Expected:
- QR opens `/#/invoices/{id}` in the same tenant.

Steps:
1) Click "مشاركة عبر واتساب" with a customer phone.
Expected:
- WhatsApp opens with a prefilled Arabic message and invoice link.

Steps:
1) Remove customer phone and click "مشاركة عبر واتساب".
2) Enter `01xxxxxxxxx` and confirm share.
Expected:
- Number is normalized to Egypt (`20...`) in wa.me link.

## 11) Platform admin routing (allowlist)
Steps:
1) Login as platform admin (mahmoud.shineh3m@gmail.com).
2) Verify it lands on `/#/platform` without tenant resolution.
Expected:
- Platform console loads normally.

Steps:
1) Login as tenant user (hoodaalawamry@gmail.com) and open `/#/platform`.
Expected:
- "غير مصرح بالدخول إلى المنصة." is shown and user stays in tenant app.

Steps:
1) Login with any other email.
Expected:
- User is signed out and sees unauthorized message.

## 12) Emulator toggle (DEV)
Steps:
1) Set `VITE_USE_EMULATORS=false` in dev and do not run emulators.
Expected:
- App connects to real Firebase and loads normally.

Steps:
1) Set `VITE_USE_EMULATORS=true` in dev and keep emulators stopped.
Expected:
- Offline warning is shown: "تعذر الاتصال بقاعدة البيانات. تأكد من تشغيل المحاكيات أو إيقاف وضع المحاكيات."

Steps:
1) Set `VITE_USE_EMULATORS=true` and run emulators.
Expected:
- App works with emulators.

## 13) Platform admin (no mode switching)
Steps:
1) Login as platform admin.
2) Confirm there is no "تغيير الشركة" menu and no "الدخول كشركة" button.
Expected:
- Platform stays on `/#/platform` only.

## 14) Platform create company
Steps:
1) Open `/#/platform` and click "إضافة شركة".
2) Fill required fields and submit.
Expected:
- "تم إنشاء الشركة بنجاح" appears and the company is listed.

## 15) Functions CORS safety
Steps:
1) Open `/#/settings` and `/#/platform`.
Expected:
- No CORS errors in console; functions are called via `httpsCallable` only.

## 16) Platform audit log
Steps:
1) Create a company from `/#/platform`.
2) Freeze/unfreeze a company.
Expected:
- `auditLogs` receives entries for company_create and freeze/unfreeze actions.
