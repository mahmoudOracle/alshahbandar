# Manual Testing Checklist - Data Normalization Layer

## Pre-Testing Setup
- [ ] Application running on `http://localhost:3001/`
- [ ] Browser developer console open (F12)
- [ ] No errors visible in console on page load
- [ ] Network tab shows successful Firestore queries

## Test Environment
- **Branch**: `shahbadar-170126`
- **Commit**: `bb0d089` (feat(data): add comprehensive data normalization layer)
- **Build Status**: ✅ Success (no errors)
- **Test Date**: January 19, 2026

---

## Test Section 1: Authentication Flow

### Test 1.1: Login Process
1. [ ] Navigate to `http://localhost:3001/`
2. [ ] Page displays login form
3. [ ] Enter valid email and password
4. [ ] Click "تسجيل الدخول" (Login)
5. [ ] Wait for redirect to dashboard
6. **Verify**: 
   - [ ] No console errors
   - [ ] Dashboard loads
   - [ ] User name appears in header

### Test 1.2: Post-Login State
1. [ ] Dashboard is visible
2. [ ] Sidebar shows navigation menu
3. [ ] User avatar visible in header
4. **Verify numeric/date fields exist**:
   - [ ] No `[object Object]` in any display
   - [ ] No `NaN` values
   - [ ] No `undefined` in UI

---

## Test Section 2: Invoice Data Type Correctness

### Test 2.1: Invoice List Page
1. [ ] Navigate to "الفواتير" (Invoices)
2. [ ] Wait for invoices to load
3. **Verify numeric fields**:
   - [ ] Invoice numbers display correctly
   - [ ] Amounts show as numbers (e.g., "1,234.56" not "1,234.56.toString()")
   - [ ] No quotes around numbers
4. **Verify date fields**:
   - [ ] All dates show in format: YYYY-MM-DD (e.g., 2025-01-18)
   - [ ] No Firestore Timestamp objects visible
   - [ ] Consistent date formatting across all rows

### Test 2.2: Invoice Details Page
1. [ ] Click on any invoice to open details
2. **Verify invoice properties**:
   - [ ] Invoice Number: displays correctly (string)
   - [ ] Date: YYYY-MM-DD format
   - [ ] Due Date: YYYY-MM-DD format
   - [ ] Customer Name: displays properly
3. **Verify numeric calculations**:
   - [ ] Subtotal: correct number format
   - [ ] Tax Amount: correct calculation (not as string)
   - [ ] Total: correct sum (subtotal + tax)
4. **Verify invoice items table**:
   - [ ] Quantity column: numbers not strings
   - [ ] Unit Price: formatted as currency numbers
   - [ ] Line Total: correct calculation

### Test 2.3: Payment Summary (if visible)
1. [ ] Look for payment summary in invoice details
2. **Verify amounts**:
   - [ ] "Paid" amount: number format
   - [ ] "Due" amount: number format
   - [ ] Total matches (Paid + Due = Total)

---

## Test Section 3: Invoice Creation/Editing

### Test 3.1: Create New Invoice
1. [ ] Click "فاتورة جديدة" (New Invoice)
2. [ ] Select a customer
3. [ ] Add invoice item:
   - [ ] Enter quantity as string: "5"
   - [ ] Enter price as string: "100.50"
   - [ ] Tab out or click save
4. **Verify normalization happens**:
   - [ ] Item displays with numeric quantity (5, not "5")
   - [ ] Item displays with numeric price (100.50, not "100.50")
   - [ ] Line total calculates: 5 × 100.50 = 502.50

### Test 3.2: Tax Calculation
1. [ ] Set tax rate to 15%
2. [ ] Verify subtotal is numeric
3. **Calculate**: Subtotal × (15/100) = Tax Amount
4. [ ] Tax Amount displays correctly
5. [ ] Total = Subtotal + Tax Amount

### Test 3.3: Save and Reload
1. [ ] Click "حفظ" (Save)
2. [ ] Wait for success notification
3. [ ] Refresh the page (F5)
4. **Verify persistence**:
   - [ ] Invoice reloads correctly
   - [ ] All numeric fields maintain precision
   - [ ] No rounding errors visible

---

## Test Section 4: Payment Recording

### Test 4.1: Record Payment
1. [ ] Navigate to an invoice
2. [ ] Click "تسجيل دفعة" (Record Payment)
3. **Verify form**:
   - [ ] Amount field displays placeholder as number
   - [ ] Date field shows YYYY-MM-DD format
4. [ ] Enter payment amount: "250.75"
5. [ ] Select payment method: "كاش"
6. [ ] Click "حفظ"
7. **Verify**:
   - [ ] Payment amount displays as number (250.75)
   - [ ] Payment date converts to YYYY-MM-DD
   - [ ] Payment summary updates correctly

---

## Test Section 5: Product Management

### Test 5.1: Product List
1. [ ] Navigate to "المنتجات" (Products)
2. **Verify numeric fields**:
   - [ ] Price column: numbers not strings (e.g., 50.00 not "50.00")
   - [ ] Stock column: numbers (e.g., 100 not "100")
   - [ ] No NaN values

### Test 5.2: Product Details
1. [ ] Click on any product
2. **Verify fields**:
   - [ ] Unit Price: numeric format
   - [ ] Stock Level: numeric format
   - [ ] Cost fields: numeric format
   - [ ] SKU: text format

### Test 5.3: Create/Edit Product
1. [ ] Create new product with:
   - [ ] Price: "199.99" (string)
   - [ ] Stock: "50" (string)
   - [ ] Reorder Level: "10" (string)
2. [ ] Save product
3. **Verify normalization**:
   - [ ] All numeric fields show as numbers
   - [ ] No conversion errors

---

## Test Section 6: Customer Data

### Test 6.1: Customer List
1. [ ] Navigate to "العملاء" (Customers)
2. **Verify display**:
   - [ ] Customer names display correctly
   - [ ] No "[object Object]" errors
   - [ ] Contact info appears correctly

### Test 6.2: Customer Details
1. [ ] Click on any customer
2. **Verify fields**:
   - [ ] Name: text
   - [ ] Email: email format
   - [ ] Phone: phone format
   - [ ] Address: text
   - [ ] IsActive status: boolean (shows as yes/no or toggle)

---

## Test Section 7: Return Transactions

### Test 7.1: Create Return
1. [ ] Navigate to invoice with items
2. [ ] Click "إرجاع" (Return) if available
3. **Verify numeric fields**:
   - [ ] Return quantity: numeric
   - [ ] Unit price snapshot: numeric
   - [ ] Line total: calculated correctly (qty × price)
4. [ ] Submit return
5. **Verify**:
   - [ ] Total return amount: numeric format
   - [ ] Date converts to YYYY-MM-DD

---

## Test Section 8: Stock Ledger (Inventory)

### Test 8.1: Stock Ledger Entries
1. [ ] Navigate to stock ledger/inventory section
2. **Verify numeric fields**:
   - [ ] Quantity Before: numeric
   - [ ] Quantity After: numeric
   - [ ] Quantity Change: numeric (can be negative)
   - [ ] Unit Cost: numeric
3. **Verify date fields**:
   - [ ] Timestamp: YYYY-MM-DD HH:MM:SS format
   - [ ] Consistent across all rows

### Test 8.2: Stock Movement Types
1. [ ] View entries with different source types
2. **Verify source types normalize**:
   - [ ] PURCHASE entries display correctly
   - [ ] SALE entries display correctly
   - [ ] ADJUSTMENT entries display correctly
   - [ ] RETURN entries display correctly
   - [ ] TRANSFER entries display correctly

---

## Test Section 9: Reports

### Test 9.1: Sales Report
1. [ ] Navigate to Reports → Sales
2. **Verify numeric fields**:
   - [ ] Invoice totals: numbers
   - [ ] Amount received: numbers
   - [ ] Amount due: numbers
   - [ ] Calculations correct
3. **Verify dates**:
   - [ ] Date range filters show YYYY-MM-DD
   - [ ] Report filtered correctly

### Test 9.2: Inventory Report
1. [ ] Navigate to Reports → Inventory
2. **Verify**:
   - [ ] Stock quantities: numeric
   - [ ] Reorder levels: numeric
   - [ ] Low stock items identified correctly

---

## Test Section 10: Edge Cases

### Test 10.1: Missing Customer Data
1. [ ] If possible, view invoice with deleted/orphaned customer
2. **Verify**:
   - [ ] Customer name shows fallback: "عميل غير موجود"
   - [ ] No console error
   - [ ] Invoice still displays correctly

### Test 10.2: Missing Product Data
1. [ ] If possible, view invoice with deleted/orphaned product
2. **Verify**:
   - [ ] Product name shows fallback: "منتج غير موجود"
   - [ ] No console error
   - [ ] Line item still displays

### Test 10.3: Mixed Date Formats
1. [ ] View historical invoices (if available)
2. **Verify all display consistently**:
   - [ ] Old Firestore Timestamps → YYYY-MM-DD
   - [ ] ISO strings → YYYY-MM-DD
   - [ ] Date objects → YYYY-MM-DD

### Test 10.4: Zero/Null Values
1. [ ] Create invoice with 0 tax rate
2. **Verify**:
   - [ ] Tax amount: 0 (not NaN)
   - [ ] Total = Subtotal (correct)
3. [ ] View invoice with optional unitCost missing
4. **Verify**:
   - [ ] Displays as 0 or blank (not NaN)
   - [ ] Profit calculation still works

---

## Test Section 11: Console Validation

### Test 11.1: Browser Console Check
1. [ ] Open Developer Tools (F12)
2. [ ] Go to Console tab
3. **Check for**:
   - [ ] NO red errors
   - [ ] NO "[NORMALIZE]" error messages (unless in DEBUG_MODE)
   - [ ] NO "undefined is not a number"
   - [ ] NO "Cannot read property of null"

### Test 11.2: Network Activity
1. [ ] Open Network tab
2. [ ] Reload page
3. [ ] Wait for all Firestore queries to complete
4. **Verify**:
   - [ ] No failed requests
   - [ ] Response status: 200 (success)
   - [ ] Response times reasonable

---

## Test Section 12: Performance

### Test 12.1: Page Load Time
1. [ ] Note initial page load time
2. **Baseline expected**: < 3 seconds
3. [ ] Should not be slower than pre-normalization

### Test 12.2: List Navigation
1. [ ] Load invoice list (50+ records)
2. [ ] Scroll through list
3. **Verify**:
   - [ ] Smooth scrolling
   - [ ] No lag in rendering
   - [ ] Normalization doesn't cause delays

---

## Test Section 13: Logout Flow

### Test 13.1: Logout
1. [ ] Click user avatar in header
2. [ ] Click "تسجيل الخروج" (Sign Out)
3. **Verify**:
   - [ ] Redirected to login page
   - [ ] All cached data cleared
   - [ ] No cached numbers visible in console

### Test 13.2: Re-login
1. [ ] Login again with different user (if available)
2. **Verify**:
   - [ ] Different data loads
   - [ ] No cross-user data contamination
   - [ ] All numeric fields normalize correctly

---

## Summary Checklist

### Critical Tests (Must Pass)
- [ ] All numeric fields display as numbers, not strings
- [ ] All date fields display in YYYY-MM-DD format
- [ ] Enum values are valid (no typos, correct casing)
- [ ] Calculations are correct (no NaN, no rounding errors)
- [ ] No console errors related to normalization
- [ ] Fallback names appear for missing references
- [ ] Build completed successfully

### Important Tests (Should Pass)
- [ ] Performance not degraded
- [ ] Page loads < 3 seconds
- [ ] No UI rendering issues
- [ ] Mobile display correct
- [ ] Responsive design maintained

### Nice-to-Have Tests (Can Pass)
- [ ] Debug mode logs normalization differences
- [ ] Edge cases handled gracefully
- [ ] Negative numbers handled correctly

---

## Test Results Template

**Date Tested**: _______________  
**Tester Name**: _______________  
**Browser**: Chrome / Firefox / Safari / Edge  
**Device**: Desktop / Tablet / Mobile  

**Tests Passed**: _____ / _____ (85/105 expected)  
**Critical Tests**: ✅ All Pass / ⚠️ Some Failed / ❌ Failed  

**Issues Found**:
1. ___________________________________________
2. ___________________________________________
3. ___________________________________________

**Notes**:
_______________________________________________
_______________________________________________

---

## Rollback Plan (if needed)
```bash
# If issues discovered:
git revert bb0d089
git push origin shahbadar-170126
```

---

## Sign-Off

**QA Approved**: ☐ Yes / ☐ No  
**Comments**: _______________________________________________

**Date**: _______________  
**Signature**: _______________
