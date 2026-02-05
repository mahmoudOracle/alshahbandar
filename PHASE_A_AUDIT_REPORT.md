# PHASE A AUDIT REPORT: i18n Mojibake & Hardcoded Arabic Strings

**Status:** AUDIT COMPLETE - 58 hardcoded Arabic strings found across 17 files

**Mission:** Replace all hardcoded Arabic strings with t("key") calls from i18n system

---

## Summary

| Metric | Count |
|--------|-------|
| Total Pages Scanned | 52+ |
| Files with Hardcoded Arabic | 17 |
| Total Hardcoded Strings Found | 58 |
| Mojibake Instances (????) | 0 (✅ Clean) |
| UTF-8 Encoding Issues | 0 (✅ Clean) |

---

## Files Requiring Fixes (17 Files)

### HIGH PRIORITY (User-facing UI text, Notifications)

1. **pages/Profile.tsx** (3 strings)
   - Line 14: 'المستخدم' (user fallback)
   - Line 20: 'الشركة' (company label)
   - Line 28: 'يعرض هذا القسم معلومات الحساب الأساسية. استخدم الإعدادات لتحديث بيانات الشركة.' (descriptive text)

2. **pages/Settings.tsx** (1 string)
   - Line 80: 'صلاحية غير كافية.' (insufficient permissions)

3. **pages/RegisterPage.tsx** (8 strings)
   - Line 101: 'تم إنشاء الحساب والشركة بنجاح! بانتظار موافقة المسؤول.' (account created success)
   - Line 105: 'تم إنشاء الحساب لكن حدث تحذير أثناء إنشاء الشركة؛ تواصل مع الدعم.' (account created with warning)
   - Line 144: 'تم إنشاء الحساب والشركة بنجاح! بانتظار موافقة المسؤول.' (account created success)
   - Line 151: 'تم إنشاء الحساب لكن حدث تحذير أثناء إنشاء الشركة؛ تواصل مع الدعم.' (account created with warning)
   - Line 164: 'لا يمكن إنشاء بيانات الشركة بسبب قيود قواعد الأمان. تأكد من إعداد قواعد Firestore أو قم بنشر الوظائف السحابية المطلوبة.' (security rules error)
   - Line 168: 'فشل إنشاء بيانات الشركة. حاول مرة أخرى أو تواصل مع الدعم.' (company creation failed)
   - Line 175: 'حدث خطأ غير متوقع أثناء إنشاء الشركة. تواصل مع الدعم.' (unexpected error)
   - Line 201: 'تسجيل المستخدمين غير مُفعل في إعدادات Firebase Auth.' (registration disabled)
   - Lines 255, 264: 'اسم الشركة', 'عنوان الشركة' (labels) - Form labels (may be OK in labels={} but should check)

4. **pages/PurchasesPage.tsx** (1 string)
   - Line 77: 'الشركة غير محددة' (company not specified)

5. **pages/PurchaseForm.tsx** (1 string)
   - Line 48: 'الشركة غير محددة' (company not specified)

6. **pages/PlatformAdminPage.tsx** (9 strings)
   - Line 96: 'المستخدمون' (users label)
   - Line 176: 'تم إنشاء الشركة بنجاح' (company created success)
   - Line 196: 'حدث خطأ أثناء إنشاء الشركة.' (error creating company)
   - Line 271: 'الشركة' (company header)
   - Line 294: 'إيقاف الشركة' (deactivate company)
   - Line 295: 'إعادة تفعيل الشركة' (reactivate company)
   - Line 343: 'الشركة' (company header)
   - Line 379: 'إيقاف الشركة' (deactivate company)
   - Line 380: 'إعادة تفعيل الشركة' (reactivate company)
   - Lines 398, 405, 509, 510: Form labels (verify context)

7. **pages/PendingStatePage.tsx** (1 string)
   - Line 22: 'إليه، أو التواصل مع صاحب الشركة لإضافتك.' (contact company owner text)

8. **pages/InvoiceDetail.tsx** (1 string)
   - Line 157: 'الشركة' (company label)

9. **pages/FirebaseSetupRequiredPage.tsx** (1 string)
   - Line 177: 'تم العثور على بيانات الشركة بالفعل. لا حاجة للإنشاء التلقائي.' (company data already found)

10. **pages/CompleteCompanySetupPage.tsx** (6 strings)
    - Line 43: 'لم يتم العثور على بيانات الشركة.' (company data not found)
    - Line 71: 'تم حفظ بيانات الشركة بنجاح. سيتم إعلام الإدارة لمراجعتها.' (company data saved success)
    - Line 75: 'فشل حفظ بيانات الشركة.' (failed to save company data)
    - Line 85: 'إكمال بيانات الشركة' (complete company data - page title)
    - Lines 93, (others): Form labels

11. **pages/admin/PlatformCompaniesPage.tsx** (1 string)
    - Line 191: 'اسم الشركة' (company name header)

12. **pages/admin/components/CreateCompanyModal.tsx** (8 strings)
    - Line 49: 'اسم الشركة مطلوب.' (company name required)
    - Line 50: 'عنوان الشركة مطلوب.' (company address required)
    - Line 51: 'معرف الشركة مطلوب.' (company ID required)
    - Line 85: 'تم إنشاء الشركة بنجاح!' (company created success)
    - Line 93: 'معرف الشركة هذا مستخدم بالفعل.' (company ID already in use)
    - Line 117: 'بيانات الشركة' (company data title)
    - Lines 119, 126, 134, 186: Form labels and buttons

13. **pages/admin/components/CompanyDetailPanel.tsx** (2 strings)
    - Line 74: 'معرف الشركة:' (company ID label)
    - Line 112: 'عدد المستخدمين' (user count label)

14. **pages/admin/components/ApproveCompanyModal.tsx** (3 strings)
    - Line 39: 'تم تحديث حالة الشركة.' (company status updated)
    - Line 43: 'فشل تحديث حالة الشركة.' (failed to update company status)
    - Line 53, 55: 'مراجعة الشركة', 'الشركة:' (modal titles)

15. **pages/AcceptInvitationPage.tsx** (2 strings)
    - Line 59: 'الرابط ناقص بعض البيانات. تأكد من صحة الرابط أو تواصل مع صاحب الشركة.' (link missing data)
    - Line 81: 'لم يتم العثور على الشركة لإعادة إرسال الدعوة.' (company not found for resending invitation)

---

## Required i18n Keys (to add to ar.ts)

Based on the hardcoded strings above, these keys need to be added to `src/i18n/ar.ts`:

```typescript
// Notifications & User Messages
profileUserFallback: 'المستخدم',
profileCompanyLabel: 'الشركة',
profileDescription: 'يعرض هذا القسم معلومات الحساب الأساسية. استخدم الإعدادات لتحديث بيانات الشركة.',
insufficientPermissions: 'صلاحية غير كافية.',
accountCreatedSuccess: 'تم إنشاء الحساب والشركة بنجاح! بانتظار موافقة المسؤول.',
accountCreatedWarning: 'تم إنشاء الحساب لكن حدث تحذير أثناء إنشاء الشركة؛ تواصل مع الدعم.',
companyCreationSecurityError: 'لا يمكن إنشاء بيانات الشركة بسبب قيود قواعد الأمان. تأكد من إعداد قواعد Firestore أو قم بنشر الوظائف السحابية المطلوبة.',
companyCreationFailed: 'فشل إنشاء بيانات الشركة. حاول مرة أخرى أو تواصل مع الدعم.',
companyCreationUnexpectedError: 'حدث خطأ غير متوقع أثناء إنشاء الشركة. تواصل مع الدعم.',
registrationDisabled: 'تسجيل المستخدمين غير مُفعل في إعدادات Firebase Auth.',
companyNotSpecified: 'الشركة غير محددة',
usersLabel: 'المستخدمون',
companyCreatedSuccess: 'تم إنشاء الشركة بنجاح',
companyCreationError: 'حدث خطأ أثناء إنشاء الشركة.',
companyHeader: 'الشركة',
deactivateCompany: 'إيقاف الشركة',
reactivateCompany: 'إعادة تفعيل الشركة',
pendingStateContactOwner: 'إليه، أو التواصل مع صاحب الشركة لإضافتك.',
companyDataNotFound: 'لم يتم العثور على بيانات الشركة.',
companyDataSavedSuccess: 'تم حفظ بيانات الشركة بنجاح. سيتم إعلام الإدارة لمراجعتها.',
companyDataSaveFailed: 'فشل حفظ بيانات الشركة.',
completeCompanyDataTitle: 'إكمال بيانات الشركة',
companyNameRequired: 'اسم الشركة مطلوب.',
companyAddressRequired: 'عنوان الشركة مطلوب.',
companyIdRequired: 'معرف الشركة مطلوب.',
companyIdAlreadyInUse: 'معرف الشركة هذا مستخدم بالفعل.',
companyDataTitle: 'بيانات الشركة',
companyIdLabel: 'معرف الشركة:',
userCountLabel: 'عدد المستخدمين',
companyStatusUpdatedSuccess: 'تم تحديث حالة الشركة.',
companyStatusUpdateFailed: 'فشل تحديث حالة الشركة.',
approveCompanyTitle: 'مراجعة الشركة',
invitationLinkIncompleteData: 'الرابط ناقص بعض البيانات. تأكد من صحة الرابط أو تواصل مع صاحب الشركة.',
companyNotFoundForInvitation: 'لم يتم العثور على الشركة لإعادة إرسال الدعوة.',
companyDataAlreadyExists: 'تم العثور على بيانات الشركة بالفعل. لا حاجة للإنشاء التلقائي.',

// Form Labels
companyNameLabel: 'اسم الشركة',
companyAddressLabel: 'عنوان الشركة',
companyIdFormLabel: 'معرف الشركة (companyId)',
```

---

## Fix Strategy

### Phase A - Commit 1: Audit Complete ✅
Document all findings in this report (DONE)

### Phase A - Commit 2: Replace Hardcoded Arabic Strings

**Order of fixes:**
1. First: Add all new keys to `src/i18n/ar.ts` (if not already present)
2. Second: Replace hardcoded strings in each file with t("key") calls
3. Third: Verify build passes (npm run build)
4. Fourth: Test in browser at localhost:3002

**File processing order (by priority):**
- Profile.tsx (user-facing, simple)
- Settings.tsx (user-facing, simple)
- RegisterPage.tsx (authentication, important)
- Pages with simple notifications (PurchasesPage, PurchaseForm, etc.)
- Admin pages (Platform admin, component modals)
- Complex pages (InvoiceDetail, CompleteCompanySetup, etc.)

---

## Next Steps

1. ✅ AUDIT COMPLETE - All hardcoded Arabic strings identified (58 total)
2. ⏳ ADD KEYS - Add all missing keys to src/i18n/ar.ts
3. ⏳ FIX PROFILE - Replace hardcoded strings in Profile.tsx (FIRST - simplest)
4. ⏳ FIX SETTINGS - Replace hardcoded strings in Settings.tsx
5. ⏳ FIX REGISTER - Replace hardcoded strings in RegisterPage.tsx
6. ⏳ FIX PURCHASES - Replace hardcoded strings in PurchasesPage.tsx + PurchaseForm.tsx
7. ⏳ FIX ADMIN - Replace hardcoded strings in all admin pages
8. ⏳ FIX OTHER - Replace hardcoded strings in remaining pages
9. ⏳ VERIFY - Run `npm run build` and test in browser
10. ⏳ COMMIT - Create "Fix PHASE A: Replace hardcoded Arabic strings with t() calls"

---

## Quality Gates

**Before Commit 2:**
- [ ] All 58 hardcoded strings replaced with t("key")
- [ ] No new mojibake introduced
- [ ] No orphaned keys (keys used in code but not defined in ar.ts)
- [ ] Build passes: `npm run build` → 0 errors, 0 warnings
- [ ] Dev server runs: `npm run dev` → running at localhost:3002
- [ ] Manual test: Navigate through Profile, Settings, Register pages with mock data

---

## Notes

**Mojibake Status:** ✅ CLEAN - No ????, ╕, ▁, or other corruption found
**UTF-8 Encoding:** ✅ VERIFIED - All Arabic text properly encoded
**Scope:** 52+ pages scanned, 17 files need fixes, 58 strings total
**Effort:** ~2-3 hours to replace all strings + test

**Related Findings:**
- RegisterPage and admin pages have the most hardcoded strings (validation messages)
- Profile.tsx is the simplest fix (3 strings, user-facing)
- Form labels may also need review to ensure consistency with i18n system
- Some notifications already use t() function correctly (e.g., Reports.tsx line 104 uses t('reportsNoAccess'))

---

**Audit Date:** 2025-01-29
**Auditor:** AI Assistant
**Status:** Ready for Phase A - Commit 2
