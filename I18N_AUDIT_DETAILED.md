# i18n AUDIT & CORRUPTION ANALYSIS

**Date:** February 4, 2026  
**Status:** Ready for Phase 1 Fixes

---

## 📋 Files with Hardcoded Arabic / Key Leaks

### 1. **pages/CompleteCompanySetupPage.tsx**

**Line 86-89:** Raw Arabic text (not translated)
```tsx
<p className="text-sm text-gray-600">
  أكمل بيانات شركتك حتى يتمكن فريقنا من مراجعة واعتماد الحساب.
</p>
```

**Fix:**
```tsx
<p className="text-sm text-gray-600">
  {t('completeCompanyHelper')}
</p>
```

**Missing Keys to Add:**
```typescript
completeCompanyDataTitle: 'أكمل بيانات شركتك',
completeCompanyHelper: 'أكمل بيانات شركتك حتى يتمكن فريقنا من مراجعة واعتماد الحساب.',
companyNameLabel: 'اسم الشركة',
companyCountryLabel: 'الدولة',
companyCityLabel: 'المدينة',
companyPhoneLabel: 'رقم الهاتف',
companyTypeLabel: 'نوع النشاط',
companyDataSavedSuccess: 'تم حفظ البيانات بنجاح.',
companyDataSaveFailed: 'فشل حفظ البيانات. حاول مرة أخرى.',
```

---

### 2. **pages/QuoteForm.tsx**

**Line 104-109:** Raw Arabic in permission check
```tsx
if (!canWrite && id) {
  // Allow viewing
} else if (!canWrite) {
  addNotification('ليس لديك الصلاحية للوصول لهذه الصفحة.', 'error');
  navigate('/app/quotes');
}
```

**Fix:**
```tsx
addNotification(t('quoteNoAccess'), 'error');
```

**Lines 231-235:** Hardcoded tax option + Arabic
```tsx
<select name="taxRate" value={quote.taxRate} onChange={handleInputChange} className="...">
  <option value="0">بدون ضريبة</option>
  {settings?.taxes.filter(t => t.rate > 0).map(tax => (
    <option key={tax.id} value={tax.rate}>{tax.name} ({tax.rate}%)</option>
  ))}
</select>
```

**Fix:**
```tsx
<select name="taxRate" value={quote.taxRate} onChange={handleInputChange} className="...">
  <option value="0">{t('quoteNoTax')}</option>
  {settings?.taxes.filter(t => t.rate > 0).map(tax => (
    <option key={tax.id} value={tax.rate}>{tax.name} ({tax.rate}%)</option>
  ))}
</select>
```

**Lines 237-242:** Raw Arabic labels
```tsx
<div className="flex justify-between"><span>المجموع الفرعي:</span><span>{subtotal.toFixed(2)} {settings?.currency}</span></div>
<div className="flex justify-between"><span>الضريبة ({quote.taxRate || 0}%):</span><span>{taxAmount.toFixed(2)} {settings?.currency}</span></div>
```

**Fix:**
```tsx
<div className="flex justify-between">
  <span>{t('quoteSubtotal')}:</span>
  <span>{subtotal.toFixed(2)} {settings?.currency}</span>
</div>
<div className="flex justify-between">
  <span>{t('quoteTaxAmount')} ({quote.taxRate || 0}%):</span>
  <span>{taxAmount.toFixed(2)} {settings?.currency}</span>
</div>
```

**Success messages (line 180, 183):**
```tsx
addNotification(id ? 'تم تحديث عرض السعر بنجاح!' : 'تم إنشاء عرض السعر بنجاح!', 'success');
```

**Fix:**
```tsx
const msgKey = id ? 'quoteUpdatedSuccess' : 'quoteCreatedSuccess';
addNotification(t(msgKey), 'success');
```

**Missing Keys:**
```typescript
quoteNoTax: 'بدون ضريبة',
quoteSubtotal: 'المجموع الفرعي',
quoteTaxAmount: 'الضريبة',
quoteTotal: 'الإجمالي',
quoteNoAccess: 'ليس لديك الصلاحية للوصول لهذه الصفحة.',
quoteCreatedSuccess: 'تم إنشاء عرض السعر بنجاح!',
quoteUpdatedSuccess: 'تم تحديث عرض السعر بنجاح!',
quoteLoadingData: 'جاري تحميل البيانات...',
quoteSelectCustomer: 'اختر عميل',
quoteDateLabel: 'تاريخ العرض',
quoteItemsLabel: 'الأصناف',
```

---

### 3. **pages/QuoteList.tsx**

**Lines 10-17:** Hardcoded status translations
```tsx
const getStatusChip = (status: QuoteStatus) => {
    switch (status) {
      case QuoteStatus.Draft:
        return <span className="...">مسودة</span>;
      case QuoteStatus.Sent:
        return <span className="...">مُرسلة</span>;
      // ...
    }
};
```

**Fix:**
```tsx
const getStatusLabel = (status: QuoteStatus): string => {
  switch (status) {
    case QuoteStatus.Draft:
      return t('statusDraft');
    case QuoteStatus.Sent:
      return t('statusSent');
    case QuoteStatus.Accepted:
      return t('statusAccepted');
    case QuoteStatus.Rejected:
      return t('statusRejected');
    case QuoteStatus.Expired:
      return t('statusExpired');
    default:
      return t('commonUnknown');
  }
};

const getStatusChip = (status: QuoteStatus) => {
  const label = getStatusLabel(status);
  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(status)}`}>
      {label}
    </span>
  );
};
```

**Missing Keys:**
```typescript
statusDraft: 'مسودة',
statusSent: 'مُرسلة',
statusAccepted: 'مقبولة',
statusRejected: 'مرفوضة',
statusExpired: 'منتهية',
```

---

### 4. **pages/PaymentForm.tsx**

**Lines 16-21:** Payment method constants in Arabic (but using t())
```tsx
const PAYMENT_METHODS: PaymentMethod[] = [
  t('paymentMethodCash'),
  t('paymentMethodWallet'),
  t('paymentMethodInstapay'),
  t('paymentMethodBank'),
  t('paymentMethodOther'),
];
```

✅ **Already using t()** — Good!  
**Verify in ar.ts:** Keys exist and map correctly.

---

### 5. **pages/Settings.tsx**

**Line 197:** Fallback Arabic with key
```tsx
{t('settingsAddress') || 'العنوان'}
```

**Issue:** Fallback pattern suggests key might be missing.

**Fix:** Ensure `settingsAddress` exists in ar.ts. Remove fallback:
```tsx
{t('settingsAddress')}
```

**Line 228:** Hardcoded currency options with Arabic
```tsx
options={[
  { value: 'SAR', label: 'ريال سعودي (SAR)' },
  { value: 'EGP', label: 'جنيه مصري (EGP)' },
  { value: 'USD', label: 'دولار أمريكي (USD)' },
  { value: 'AED', label: 'درهم إماراتي (AED)' },
]}
```

**Fix:**
```tsx
options={[
  { value: 'SAR', label: t('currencySAR') },
  { value: 'EGP', label: t('currencyEGP') },
  { value: 'USD', label: t('currencyUSD') },
  { value: 'AED', label: t('currencyAED') },
]}
```

**Lines 335-341:** Localization issues
```tsx
<Button>{t('settingsAdd') || 'إضافة'}</Button>
<div className="text-center py-6 text-gray-500">
  <p>{t('settingsNoLockedPeriods') || 'لا توجد فترات مغلقة'}</p>
</div>
```

**Fix:** Remove fallbacks, ensure keys exist:
```tsx
<Button>{t('settingsAdd')}</Button>
<div className="text-center py-6 text-gray-500">
  <p>{t('settingsNoLockedPeriods')}</p>
</div>
```

**Missing Keys:**
```typescript
currencySAR: 'ريال سعودي (SAR)',
currencyEGP: 'جنيه مصري (EGP)',
currencyUSD: 'دولار أمريكي (USD)',
currencyAED: 'درهم إماراتي (AED)',
settingsAddress: 'العنوان',
settingsAdd: 'إضافة',
settingsNoLockedPeriods: 'لا توجد فترات مغلقة',
```

---

## 🔍 Encoding Issues

### No `??????` Found in Analyzed Pages
- ✅ `pages/Dashboard.tsx` — Clean
- ✅ `pages/Reports.tsx` — Clean
- ✅ `pages/Settings.tsx` — Clean
- ✅ Components checked — Clean

**Likely cause of past `??????` issues:**
- File encoding was not UTF-8
- Solution already applied in prior sessions (Aurora CSS fix)

---

## 📈 Translation Completeness Status

### Keys Used But Missing from ar.ts

From analysis of hardcoded Arabic patterns, add these to `src/i18n/ar.ts`:

```typescript
// Quote Form
quoteNoTax: 'بدون ضريبة',
quoteSubtotal: 'المجموع الفرعي',
quoteTaxAmount: 'الضريبة',
quoteTotal: 'الإجمالي',
quoteNoAccess: 'ليس لديك الصلاحية للوصول لهذه الصفحة.',
quoteCreatedSuccess: 'تم إنشاء عرض السعر بنجاح!',
quoteUpdatedSuccess: 'تم تحديث عرض السعر بنجاح!',
quoteSelectCustomer: 'اختر عميل',
quoteDateLabel: 'تاريخ العرض',

// Complete Company Setup
completeCompanyDataTitle: 'أكمل بيانات شركتك',
completeCompanyHelper: 'أكمل بيانات شركتك حتى يتمكن فريقنا من مراجعة واعتماد الحساب.',
companyCountryLabel: 'الدولة',
companyCityLabel: 'المدينة',
companyPhoneLabel: 'رقم الهاتف',
companyTypeLabel: 'نوع النشاط',
companyDataSavedSuccess: 'تم حفظ البيانات بنجاح.',
companyDataSaveFailed: 'فشل حفظ البيانات. حاول مرة أخرى.',

// Status Labels
statusDraft: 'مسودة',
statusSent: 'مُرسلة',
statusAccepted: 'مقبولة',
statusRejected: 'مرفوضة',
statusExpired: 'منتهية',

// Currency Labels
currencySAR: 'ريال سعودي (SAR)',
currencyEGP: 'جنيه مصري (EGP)',
currencyUSD: 'دولار أمريكي (USD)',
currencyAED: 'درهم إماراتي (AED)',

// Settings
settingsAddress: 'العنوان',
settingsAdd: 'إضافة',
settingsNoLockedPeriods: 'لا توجد فترات مغلقة',
settingsLanguageLabel: 'اللغة الافتراضية',
```

---

## ✅ Verification Checklist

After applying COMMIT 1:

```bash
# Check 1: No hardcoded Arabic in pages/
grep -r "[\u0600-\u06FF]" pages/ src/components/ --exclude-dir=node_modules | grep -v "ar\.ts" | grep -v "\.css"
# Expected: 0 matches

# Check 2: No translation keys leak in UI
grep -r '"[a-z]*Title"' pages/ src/components/ --exclude-dir=node_modules
# Expected: 0 matches (unless commented)

# Check 3: Build succeeds
npm run build
# Expected: 0 errors, 0 warnings

# Check 4: Browser shows no broken text
npm run dev
# Navigate to all pages in UI, verify Arabic text renders correctly
```

---

## 📊 Summary

| File | Issue Type | Count | Status |
|------|-----------|-------|--------|
| CompleteCompanySetupPage.tsx | Hardcoded Arabic | 1 | 🔴 Needs Fix |
| QuoteForm.tsx | Hardcoded Arabic + Keys | 3 | 🔴 Needs Fix |
| QuoteList.tsx | Hardcoded Status | 5 | 🔴 Needs Fix |
| PaymentForm.tsx | Keys (using t()) | - | ✅ Good |
| Settings.tsx | Mixed (fallbacks) | 2 | 🟡 Partial |
| ar.ts | Missing Keys | ~20 | 🔴 Needs Addition |

**Total fixes needed:** ~11 locations, ~20 new keys

---

## 🎯 Next Steps

1. Add missing keys to `src/i18n/ar.ts`
2. Update each file above to remove hardcoded Arabic
3. Replace `|| 'Arabic'` fallbacks with pure `t()` calls
4. Verify build and run browser test
5. Commit as "COMMIT 1: Fix i18n Corruption & Hardcoded Arabic"

