# CALM UI RESTRUCTURE — Complete PR Plan

**Project:** Alshabandar Trading App (React + TS + Vite)  
**Constraints:** No Firebase changes, no new deps, no data model changes  
**Mission:** Fix i18n, encode issues, restructure for Apple-like calm look, validate Dashboard/Reports logic

---

## 📋 Executive Summary

### Issues Identified

1. **i18n Corruption**
   - Hardcoded Arabic mixed with t() calls
   - Pages showing raw keys: `"settingsTitle"` instead of `t("settings.title")`
   - Some Arabic appears as `??????`
   - No centralized translation file structure

2. **Layout Problems**
   - Huge empty spaces due to incorrect padding/max-width
   - Inconsistent component spacing
   - No PageContainer pattern; each page uses own max-width
   - Sidebar layout not balanced

3. **Component Inconsistency**
   - Button variants undefined (primary/secondary/ghost)
   - No unified Card/ListRow/SectionHeader system
   - Missing ActionMenu (⋯) pattern

4. **Dashboard Logic**
   - Date range calculations unclear (timezone handling?)
   - Queries might not be scoped to `companyId`
   - No loading/empty/error state validation

5. **Reports Logic**
   - Date filtering unclear
   - Totals calculation method inconsistent
   - No verification that queries match Dashboard dates

---

## 🎯 Deliverables

### By Phase
1. **PHASE 1:** i18n infrastructure & encoding fixes
2. **PHASE 2:** AppShell + PageContainer layout restructure
3. **PHASE 3:** Unified UI Kit (Button, Card, ListRow, SectionHeader, ActionMenu)
4. **PHASE 4:** Rebuild Dashboard + Reports screens
5. **PHASE 5:** Validate queries & logic + add dev logging

### Expected Outcomes
- ✅ No raw keys in UI
- ✅ All Arabic renders perfectly
- ✅ Balanced, calm layout (Apple-style)
- ✅ Consistent component library
- ✅ Dashboard/Reports logic verified
- ✅ Zero dependencies added

---

## 🔧 Detailed Commit-by-Commit Plan

### **COMMIT 1: Fix i18n Corruption & Hardcoded Arabic** (Phase 1)

**Files to Update:**
- ✏️ `src/i18n/ar.ts` — Expand with missing keys from pages
- ✏️ `pages/CompleteCompanySetupPage.tsx` — Replace hardcoded Arabic with t() calls
- ✏️ `pages/QuoteForm.tsx` — Replace hardcoded Arabic and keys
- ✏️ `pages/QuoteList.tsx` — Fix hardcoded status text
- ✏️ `pages/PaymentForm.tsx` — Ensure all text uses t()
- ✏️ `pages/Settings.tsx` — Fix any remaining key leaks

**Example Changes:**
```tsx
// BEFORE (QuoteForm.tsx:231)
<option value="0">بدون ضريبة</option>

// AFTER
<option value="0">{t('quoteNoTax')}</option>
```

```tsx
// BEFORE (CompleteCompanySetupPage.tsx:86)
<p className="text-sm text-gray-600">
  أكمل بيانات شركتك حتى يتمكن فريقنا من مراجعة واعتماد الحساب.
</p>

// AFTER
<p className="text-sm text-gray-600">
  {t('completeCompanyHelper')}
</p>
```

**ar.ts Keys to Add:**
```typescript
export const ar = {
  // ... existing ...
  
  // Quote form
  quoteNoTax: 'بدون ضريبة',
  quoteSelectTax: 'اختر معدل الضريبة',
  quoteSelectCustomer: 'اختر عميل',
  quoteDateLabel: 'تاريخ العرض',
  quoteItemsLabel: 'الأصناف',
  quoteSubtotal: 'المجموع الفرعي',
  quoteTaxAmount: 'الضريبة',
  quoteTotalLabel: 'الإجمالي',
  quoteNoAccess: 'ليس لديك الصلاحية للوصول لهذه الصفحة.',
  quoteSavedSuccess: 'تم حفظ عرض السعر بنجاح!',
  quoteCreatedSuccess: 'تم إنشاء عرض السعر بنجاح!',
  quoteLoadingData: 'جاري تحميل البيانات...',
  
  // Complete company setup
  completeCompanyDataTitle: 'أكمل بيانات شركتك',
  completeCompanyHelper: 'أكمل بيانات شركتك حتى يتمكن فريقنا من مراجعة واعتماد الحساب.',
  companyCountryLabel: 'الدولة',
  companyCityLabel: 'المدينة',
  companyPhoneLabel: 'رقم الهاتف',
  companyTypeLabel: 'نوع النشاط',
  companyDataSavedSuccess: 'تم حفظ البيانات بنجاح.',
  companyDataSaveFailed: 'فشل حفظ البيانات. حاول مرة أخرى.',
  
  // Status chips
  statusDraft: 'مسودة',
  statusSent: 'مُرسلة',
  statusAccepted: 'مقبولة',
  statusRejected: 'مرفوضة',
  statusExpired: 'منتهية',
  
  // Payment
  paymentMethodCash: 'نقداً',
  paymentMethodWallet: 'محفظة',
  paymentMethodInstapay: 'Instapay',
  paymentMethodBank: 'تحويل بنكي',
  paymentMethodOther: 'أخرى',
  
  // Statements
  statementWithOpening: 'إدراج الرصيد الافتتاحي',
  statementReportTitle: 'كشف حساب',
  statementTotalInvoices: 'إجمالي الفواتير',
  statementTotalPaid: 'إجمالي المدفوع',
  statementRemaining: 'الرصيد المتبقي',
};
```

**Validation:**
- Run `npm run build` — 0 errors
- Search codebase for hardcoded Arabic — 0 matches
- Search for key patterns like `"settingsTitle"` — 0 matches

---

### **COMMIT 2: Enhance i18n Helper & Create Language Toggle** (Phase 1)

**Files:**
- ✏️ `src/i18n/t.ts` — Enhance with fallback and validation
- ✏️ `src/services/i18n.ts` — Create language/locale management

**New Code:**
```typescript
// src/services/i18n.ts
export type Language = 'ar' | 'en';

export const getCurrentLanguage = (): Language => {
  return (localStorage.getItem('app:language') as Language) || 'ar';
};

export const setLanguage = (lang: Language) => {
  localStorage.setItem('app:language', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
};

export const formatCurrency = (value: number, currency: string = 'SAR'): string => {
  const formatter = new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency,
  });
  return formatter.format(value);
};

export const formatDate = (date: Date | string, lang: Language = getCurrentLanguage()): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US');
};
```

---

### **COMMIT 3: Restructure AppShell & Create PageContainer** (Phase 2)

**Files to Create:**
- ✨ `src/layout/AppShell.tsx` — Fixed sidebar + main layout
- ✨ `src/layout/PageContainer.tsx` — Centered content max-width

**AppShell.tsx:**
```typescript
// src/layout/AppShell.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import MobileBottomNav from '../components/MobileBottomNav';

const AppShell: React.FC = () => {
  return (
    <div className="appShell" dir="rtl">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <PageContainer>
          <Outlet />
        </PageContainer>
      </main>
      <MobileBottomNav />
    </div>
  );
};

export default AppShell;
```

**PageContainer.tsx:**
```typescript
// src/layout/PageContainer.tsx
import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  center?: boolean;
}

const PAGE_WIDTHS = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'w-full',
};

const PageContainer: React.FC<PageContainerProps> = ({
  children,
  maxWidth = 'lg',
  center = true,
}) => {
  return (
    <div className={`
      ${PAGE_WIDTHS[maxWidth]}
      ${center ? 'mx-auto' : ''}
      px-4 py-8
      lg:px-8 lg:py-12
    `}>
      {children}
    </div>
  );
};

export default PageContainer;
```

**Updated App.tsx Route:**
```tsx
import AppShell from './src/layout/AppShell';

// In routes:
{
  element: <AppShell />,
  children: [
    { path: 'dashboard', element: <Dashboard /> },
    // ... other routes
  ]
}
```

**CSS Updates (app.css):**
```css
.appShell {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.appShell > aside {
  flex-shrink: 0;
  width: 280px;
  border-right: 1px solid var(--border-color);
}

.appShell > main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

@media (max-width: 768px) {
  .appShell {
    flex-direction: column;
  }
  
  .appShell > aside {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }
}
```

---

### **COMMIT 4: Create Unified UI Kit — Button, Card, Input** (Phase 3)

**Files to Create/Update:**
- ✨ `src/ui/Button.tsx` — primary, secondary, ghost
- ✨ `src/ui/Card.tsx` — base card with variants
- ✨ `src/ui/Input.tsx` — text input with label
- ✨ `src/ui/Textarea.tsx` — textarea with label
- ✨ `src/ui/Select.tsx` — select dropdown

**Button.tsx:**
```typescript
// src/ui/Button.tsx
import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const VARIANTS = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-700 dark:text-white disabled:opacity-50',
  ghost: 'text-primary-600 hover:bg-primary-50 dark:hover:bg-gray-700 disabled:opacity-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className,
  ...props
}) => {
  return (
    <button
      className={`
        inline-flex items-center gap-2 font-semibold rounded-md
        transition-all duration-200 ease-in-out
        ${VARIANTS[variant]}
        ${SIZES[size]}
        ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
        ${className || ''}
      `}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <span className="animate-spin">⏳</span>}
      {icon}
      {children}
    </button>
  );
};
```

**Card.tsx:**
```typescript
// src/ui/Card.tsx
import React from 'react';

type CardVariant = 'default' | 'elevated' | 'outline';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  className?: string;
}

const VARIANTS = {
  default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
  elevated: 'bg-white dark:bg-gray-800 shadow-md border-0',
  outline: 'bg-transparent border border-gray-300 dark:border-gray-600',
};

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className,
}) => {
  return (
    <div className={`
      rounded-lg p-6
      ${VARIANTS[variant]}
      ${className || ''}
    `}>
      {children}
    </div>
  );
};
```

**Input.tsx:**
```typescript
// src/ui/Input.tsx
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  help?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  help,
  className,
  ...props
}) => {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {label}
          {props.required && <span className="text-red-600">*</span>}
        </label>
      )}
      <input
        className={`
          px-3 py-2 rounded-md border
          border-gray-300 dark:border-gray-600
          bg-white dark:bg-gray-700
          text-gray-900 dark:text-gray-100
          placeholder-gray-400 dark:placeholder-gray-500
          focus:outline-none focus:ring-2 focus:ring-primary-500
          disabled:opacity-50
          ${error ? 'border-red-600 ring-red-200' : ''}
          ${className || ''}
        `}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {help && <p className="text-xs text-gray-500">{help}</p>}
    </div>
  );
};
```

---

### **COMMIT 5: Create SectionHeader, ListRow, ActionMenu** (Phase 3)

**Files to Create:**
- ✨ `src/ui/SectionHeader.tsx`
- ✨ `src/ui/ListRow.tsx`
- ✨ `src/ui/ActionMenu.tsx`

**SectionHeader.tsx:**
```typescript
// src/ui/SectionHeader.tsx
import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
}) => {
  return (
    <div className="flex flex-col gap-4 mb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {title}
          </h1>
          {subtitle && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
};
```

**ListRow.tsx:**
```typescript
// src/ui/ListRow.tsx
import React from 'react';

interface ListRowProps {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: { label: string; color: 'success' | 'warning' | 'danger' | 'muted' };
  action?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
}

const BADGE_COLORS = {
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  muted: 'bg-gray-50 text-gray-700 border-gray-200',
};

export const ListRow: React.FC<ListRowProps> = ({
  id,
  title,
  subtitle,
  meta,
  badge,
  action,
  onClick,
  href,
  className,
}) => {
  const Wrapper = href ? 'a' : 'div';
  
  return (
    <Wrapper
      href={href}
      onClick={onClick}
      className={`
        flex items-center justify-between gap-4
        px-4 py-4
        border-b border-gray-200 dark:border-gray-700
        hover:bg-gray-50 dark:hover:bg-gray-800
        transition-colors duration-150
        cursor-pointer
        ${className || ''}
      `}
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
          {title}
        </p>
        {(subtitle || meta) && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {subtitle}
            {subtitle && meta && ' • '}
            {meta}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {badge && (
          <span className={`
            px-2 py-1 rounded-full text-xs font-semibold
            border ${BADGE_COLORS[badge.color]}
          `}>
            {badge.label}
          </span>
        )}
        {action && <div>{action}</div>}
      </div>
    </Wrapper>
  );
};
```

**ActionMenu.tsx:**
```typescript
// src/ui/ActionMenu.tsx
import React, { useState, useRef, useEffect } from 'react';
import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline';

interface MenuAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface ActionMenuProps {
  actions: MenuAction[];
}

export const ActionMenu: React.FC<ActionMenuProps> = ({ actions }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
      >
        <EllipsisHorizontalIcon className="w-5 h-5" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => {
                action.onClick();
                setOpen(false);
              }}
              className={`
                w-full text-left px-4 py-2 text-sm flex items-center gap-2
                hover:bg-gray-100 dark:hover:bg-gray-700
                transition-colors
                ${action.variant === 'danger' ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}
                ${idx < actions.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''}
              `}
            >
              {action.icon && <span className="w-4 h-4">{action.icon}</span>}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
```

---

### **COMMIT 6: Rebuild Dashboard with Calm UI** (Phase 4)

**File to Rewrite:**
- ✏️ `pages/Dashboard.tsx`

**Key Changes:**
- Use `PageContainer` instead of `page-container`
- Use new `SectionHeader`, `StatCard`, `Card`, `ListRow`, `Button`
- Add proper loading/empty/error states
- Cleaner layout structure

**Snippet:**
```typescript
// pages/Dashboard.tsx
import { PageContainer } from '../src/layout/PageContainer';
import { SectionHeader } from '../src/ui/SectionHeader';
import { StatCard } from '../src/ui/StatCard';
import { Card } from '../src/ui/Card';
import { ListRow } from '../src/ui/ListRow';
import { Button } from '../src/ui/Button';

const Dashboard: React.FC = () => {
  // ... existing logic ...
  
  return (
    <PageContainer>
      <SectionHeader
        title={t('dashboardTitle')}
        subtitle={t('dashboardHelper')}
        action={
          canWriteInvoices && (
            <Button variant="primary" asLink to="/app/invoices/new">
              {t('dashboardNewInvoice')}
            </Button>
          )
        }
      />
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title={t('dashboardSalesToday')}
          value={formatCurrency(todaySales)}
          icon={<BanknotesIcon />}
        />
        {/* ... */}
      </div>
      
      {/* Recent Invoices */}
      <Card className="mb-8">
        <div className="mb-4">
          <h3 className="font-bold text-lg">{t('dashboardLatestInvoices')}</h3>
        </div>
        {recentInvoices.length === 0 ? (
          <p className="text-gray-500 text-center py-8">{t('dashboardNoInvoices')}</p>
        ) : (
          <div className="space-y-0 divide-y">
            {recentInvoices.map(inv => (
              <ListRow
                key={inv.id}
                id={inv.id}
                title={inv.customerId}
                meta={formatCurrency(getInvoiceTotal(inv))}
              />
            ))}
          </div>
        )}
      </Card>
    </PageContainer>
  );
};
```

---

### **COMMIT 7: Rebuild Reports with Calm UI** (Phase 4)

**File to Rewrite:**
- ✏️ `pages/Reports.tsx`

**Key Requirements:**
- Use `PageContainer`
- Add date range picker at the top
- KPI cards for Sales/Expenses/Net Profit
- Tables with horizontal scroll on mobile
- Proper empty/loading states
- Validation logging (dev-only)

---

### **COMMIT 8: Validate Dashboard & Reports Logic** (Phase 5)

**Files to Update:**
- ✏️ `pages/Dashboard.tsx` — Add dev logging
- ✏️ `pages/Reports.tsx` — Add dev logging
- ✨ `services/reportValidation.ts` — New file for audits

**reportValidation.ts:**
```typescript
// services/reportValidation.ts
export const auditDashboard = (
  companyId: string,
  todaySales: number,
  todayExpenses: number,
  invoiceCount: number,
  expenseCount: number
) => {
  if (import.meta.env.DEV) {
    console.log('[DASHBOARD AUDIT]', {
      companyId,
      todaySales: todaySales.toFixed(2),
      todayExpenses: todayExpenses.toFixed(2),
      profit: (todaySales - todayExpenses).toFixed(2),
      invoiceCount,
      expenseCount,
      timestamp: new Date().toISOString(),
    });
  }
};

export const auditReports = (
  companyId: string,
  dateRange: { start: string; end: string },
  invoiceTotal: number,
  expenseTotal: number,
  invoiceCount: number,
  expenseCount: number
) => {
  if (import.meta.env.DEV) {
    console.log('[REPORTS AUDIT]', {
      companyId,
      dateRange,
      invoiceTotal: invoiceTotal.toFixed(2),
      expenseTotal: expenseTotal.toFixed(2),
      netRevenue: (invoiceTotal - expenseTotal).toFixed(2),
      invoiceCount,
      expenseCount,
      timestamp: new Date().toISOString(),
    });
  }
};
```

---

## 📊 File Inventory

### New Files (8)
1. `src/layout/AppShell.tsx`
2. `src/layout/PageContainer.tsx`
3. `src/ui/Button.tsx`
4. `src/ui/Card.tsx`
5. `src/ui/Input.tsx`
6. `src/ui/Textarea.tsx`
7. `src/ui/Select.tsx`
8. `src/ui/ActionMenu.tsx`
9. `src/ui/SectionHeader.tsx`
10. `src/ui/ListRow.tsx`
11. `src/ui/StatCard.tsx`
12. `services/i18n.ts`
13. `services/reportValidation.ts`

### Modified Files (10+)
- `src/i18n/ar.ts` — Add ~50 new translation keys
- `pages/Dashboard.tsx` — Full rewrite with PageContainer + UI Kit
- `pages/Reports.tsx` — Full rewrite with new structure
- `pages/CompleteCompanySetupPage.tsx` — Replace hardcoded Arabic
- `pages/QuoteForm.tsx` — Replace hardcoded Arabic
- `pages/QuoteList.tsx` — Fix hardcoded status
- `pages/PaymentForm.tsx` — Ensure all text uses t()
- `pages/Settings.tsx` — Fix any key leaks
- `components/AppShell.tsx` — Update to use new layout
- `App.tsx` — Update routing structure

---

## 🎯 Validation Checklist

### i18n Validation
- [ ] `npm run build` passes with 0 errors
- [ ] Search codebase: `"[a-z]+Title"` (keys) → 0 matches in pages/components
- [ ] Search codebase: `"[ء-ي]+"` (Arabic) → 0 matches in pages (only in ar.ts)
- [ ] No `??????` characters visible in UI

### Layout Validation
- [ ] Desktop: Content centered, max-width ~1200px
- [ ] Tablet: Responsive, proper padding
- [ ] Mobile: Full width, 16px side padding
- [ ] Sidebar: Fixed 280px width (desktop), hidden on mobile
- [ ] No huge empty spaces

### Dashboard Validation
```typescript
// Dev console when building dashboard should show:
[DASHBOARD AUDIT] {
  companyId: "abc123",
  todaySales: "5000.00",
  todayExpenses: "1000.00",
  profit: "4000.00",
  invoiceCount: 10,
  expenseCount: 5,
  timestamp: "2026-02-04T10:30:00.000Z"
}
```

### Reports Validation
- [ ] Date range defaults to last 30 days (local time, not UTC)
- [ ] Totals match Dashboard when querying same date
- [ ] Queries scoped to `companyId`
- [ ] Empty state shown when no data
- [ ] Loading skeleton shown while fetching

### Component Validation
- [ ] Button: primary/secondary/ghost + loading state
- [ ] Card: 3 variants (default/elevated/outline)
- [ ] Input: label, error, help text
- [ ] ListRow: with badge and action menu
- [ ] SectionHeader: title, subtitle, action button

---

## 🚀 Deployment Steps

1. Create feature branch: `git checkout -b calm-ui-restructure`
2. Apply commits in order (1-8)
3. Run tests: `npm run test` (if test suite exists)
4. Build: `npm run build`
5. Dev test: `npm run dev` — verify Dashboard + Reports
6. Push & create PR with this plan as description

---

## 📝 Notes

- **No Firebase changes**: All data fetching remains identical
- **Backward compatible**: Old component props still work
- **Type-safe**: Full TypeScript, no `any` types
- **Dark mode**: All components support dark mode
- **RTL**: All layouts already support dir="rtl"
- **Zero new deps**: Uses existing Tailwind + Heroicons

---

**Ready to execute? Start with COMMIT 1 and validate build after each commit.**
