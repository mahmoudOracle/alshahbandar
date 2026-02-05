# Quick Reference - New Enhancements

## Keyboard Shortcuts (Daily Collection Page)

| Shortcut | Action | Use Case |
|----------|--------|----------|
| **↓** (Arrow Down) | Go to previous day | Quickly navigate backwards |
| **↑** (Arrow Up) | Go to next day | Quickly navigate forwards |
| **T** | Jump to today | Quick return to current date |
| **N** | Open new payment form | Fast payment entry |

**Example Workflow:**
```
1. Press T to go to today
2. Press N to add new payment
3. Fill in customer, amount, method
4. Save
5. Press ↓ to check yesterday's collections
```

---

## Daily Collection Features

### 1. **View Summary**
- Cash collected (كاش)
- Non-cash collected (غير كاش)  
- Total collected (الإجمالي)
- Real-time calculation as you add payments

### 2. **Delete Payment**
- Hover over any payment in the list
- Click the trash icon (🗑️)
- Confirm deletion
- Automatic recalculation of summary

### 3. **Export Daily Summary**
- Click "Export" button (when payments exist)
- Downloads as `.txt` file with:
  - Date
  - Summary totals
  - Detailed payment list
- Useful for records and backups

---

## Payment Receipt Operations

### Create Receipt
```
POST /companies/{companyId}/receipts
{
  customerId: string (required)
  customerName: string (required)
  amount: number (required, > 0)
  date: string (required)
  method: 'cash' | 'transfer' | 'check' | 'wallet' | 'other' (required)
  paymentDate: string (required)
  invoiceNumber?: string
  note?: string
}
```

### Delete Receipt
```
DELETE /companies/{companyId}/receipts/{receiptId}
```
**Validation:** companyId and receiptId required

### Get Receipt by ID
```
GET /companies/{companyId}/receipts/{receiptId}
Returns: Receipt | null
```
**Validation:** companyId and receiptId required

### Query Receipts
```
GET /companies/{companyId}/receipts?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
Returns: Receipt[]
```
**Validation:** All parameters required

---

## Customer Detail - Tab Navigation

### **Invoices Tab**
- View all customer invoices
- Shows: Invoice #, Date, Amount
- Empty state if no invoices

### **Payments Tab**
- View all customer payment receipts
- Shows: Method, Date, Amount
- Empty state if no payments

### **Statement Tab**
- Detailed account statement
- Date range filtering
- Opening/closing balances
- Transaction history

---

## Error Messages (Arabic)

| Scenario | Message | Action |
|----------|---------|--------|
| Delete receipt without ID | تعذر حذف الإيصال | Contact support |
| Firestore error | Specific error message | Try again or contact support |
| Empty payment | حقل مطلوب | Fill all required fields |
| Amount ≤ 0 | المبلغ يجب أن يكون أكبر من صفر | Enter positive amount |

---

## Service Function Validation

### All Functions Validate:
1. `companyId` - Required (multi-tenant safety)
2. Specific parameter checks per function
3. Specific error messages per validation

### Example Error:
```javascript
// If companyId is missing:
throw new Error('Company ID is required')

// If amount is invalid:
throw new Error('Amount must be greater than 0')
```

---

## Browser Compatibility

✅ Works with:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

✅ Features:
- Responsive design
- Touch-friendly buttons
- Keyboard accessible
- Dark mode support

---

## Performance Notes

- **Keyboard shortcuts:** Zero latency
- **Export:** Immediate download
- **Delete:** Instant UI update
- **Bundle impact:** Zero (no new dependencies)

---

## Multi-Tenant Safety

All operations are automatically scoped to:
- Current company (companyId)
- Current user's role
- Firestore security rules

Example: User can only see/delete receipts from their own company.

---

## i18n Coverage

All new features include Arabic translations:
- Tab labels ✅
- Error messages ✅
- Button labels ✅
- Help text ✅
- Keyboard shortcuts ✅

---

## Common Tasks

### Add Payment
```
1. Open Daily Collection (/app/daily-collection)
2. Press N (or click "دفعة جديدة")
3. Select customer
4. Enter amount and method
5. Click "تسجيل دفعة"
```

### Check Customer Balance
```
1. Go to Customers
2. Click on customer name
3. View stat cards at top:
   - إجمالي الفواتير (Total Invoiced)
   - إجمالي المدفوع (Total Paid)
   - الرصيد (Balance = Invoiced - Paid)
```

### View Payment History
```
1. Open customer detail page
2. Click "المدفوعات" tab
3. See all payments with dates and methods
```

### Export Daily Collection
```
1. Navigate to specific date
2. Make payments
3. Click "Export" button
4. File downloads as `daily-collection-YYYY-MM-DD.txt`
```

### Delete Incorrect Payment
```
1. Find the payment in Daily Collection
2. Hover to reveal delete button
3. Click trash icon
4. Confirm deletion
5. Summary updates automatically
```

---

## FAQ

**Q: Can I undo a deleted payment?**  
A: No, deletion is permanent. Double-check before confirming.

**Q: Can I edit a payment after saving?**  
A: Delete and re-create with correct details. Edit feature coming soon.

**Q: Does export include all company data?**  
A: No, export only includes the selected date's payments.

**Q: Are keyboard shortcuts customizable?**  
A: Not currently. Standard shortcuts for consistency.

**Q: Does it work offline?**  
A: No, requires internet connection for Firestore operations.

**Q: What happens to deleted payments in statements?**  
A: They are completely removed from all views and reports.

---

**Version:** 1.0  
**Last Updated:** 2024  
**Status:** ✅ Production Ready
