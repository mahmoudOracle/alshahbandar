# 🚀 CALM UI RESTRUCTURE - QUICK START GUIDE

**For:** Developers ready to refactor pages  
**Time:** 5 minutes to understand the system  
**Result:** Ready to refactor first page  

---

## ⚡ TL;DR

**What happened:**
✅ Built calm UI system with spacing, components, and i18n  
✅ Dashboard already refactored as example  
✅ 14 pages ready to be refactored  

**What you need to know:**
```
1. Wrap every page in <PageContainer>
2. Use 24px gaps between sections (page-section class)
3. Replace tables with <ListRow> components
4. Put related fields in <Card> with card-header/body/footer
5. Use <Input>, <Textarea>, <Select> for forms
6. Use calm.css spacing: --space-1 through --space-12
7. Import Arabic text from ar.ts with t('key')
8. Test on mobile (375px) and desktop
```

---

## 🎯 PATTERN 1: List Page (InvoiceList, CustomerList, etc.)

### Template Structure
```tsx
import { PageContainer } from '../src/ui/PageContainer';
import { SectionHeader } from '../src/ui/SectionHeader';
import { ListRow } from '../src/ui/ListRow';
import { Input } from '../src/ui/Input';
import { Button } from '../src/ui/Button';
import { t } from '../src/i18n/ar';

export const InvoiceList = () => {
  return (
    <PageContainer maxWidth="lg" title={t('invoices.title')}>
      
      {/* Filters - Section 1 */}
      <div className="page-section">
        <div className="flex gap-3 flex-wrap">
          <Input placeholder={t('common.search')} />
          <Button variant="secondary">{t('common.filter')}</Button>
        </div>
      </div>

      {/* Action Button - Section 2 */}
      <div className="page-section">
        <Button variant="primary">{t('invoices.new')}</Button>
      </div>

      {/* Items List - Section 3 */}
      <div className="page-section">
        <SectionHeader title="Recent Invoices" />
        <div className="space-y-2">
          {items.map(item => (
            <ListRow
              key={item.id}
              to={`/app/invoices/${item.id}`}
              title={item.title}
              subtitle={item.date}
              rightText={item.amount}
            />
          ))}
        </div>
      </div>

    </PageContainer>
  );
};
```

**Key changes from old version:**
- ❌ Table → ✅ ListRow
- ❌ Many buttons → ✅ One action button
- ❌ Inline styles → ✅ Calm CSS classes
- ❌ No structure → ✅ PageContainer + sections

---

## 🎯 PATTERN 2: Form Page (InvoiceForm, CustomerForm, etc.)

### Template Structure
```tsx
export const InvoiceForm = () => {
  return (
    <PageContainer maxWidth="md" title={t('invoices.edit')}>
      
      {/* Section 1: Basic Info */}
      <Card className="page-section">
        <div className="card-header">
          <h3>Invoice Details</h3>
        </div>
        <div className="card-body space-y-6">
          <Input label={t('invoices.number')} required />
          <Select label={t('invoices.customer')} options={...} required />
        </div>
      </Card>

      {/* Section 2: Dates */}
      <Card className="page-section">
        <div className="card-header">
          <h3>Dates</h3>
        </div>
        <div className="card-body space-y-6">
          <Input type="date" label={t('invoices.date')} required />
          <Input type="date" label="Due Date" />
        </div>
      </Card>

      {/* Section 3: Items */}
      <Card className="page-section">
        <div className="card-header">
          <h3>Items</h3>
        </div>
        <div className="card-body">
          {/* Items list */}
          <Button variant="secondary">+ Add Item</Button>
        </div>
      </Card>

      {/* Actions - Centered */}
      <div className="page-section flex justify-center gap-4">
        <Button type="submit">{t('forms.submit')}</Button>
        <Button type="button" variant="secondary">{t('forms.cancel')}</Button>
      </div>

    </PageContainer>
  );
};
```

**Key changes:**
- ❌ Dense form → ✅ Card sections
- ❌ Inconsistent spacing → ✅ 24px page-section gaps
- ❌ Full-width buttons → ✅ Centered inline buttons
- ❌ No visual breaks → ✅ Clear card sections

---

## 🎯 PATTERN 3: Detail Page (InvoiceDetail, CustomerDetail)

### Template Structure
```tsx
export const InvoiceDetail = () => {
  return (
    <PageContainer maxWidth="lg">
      
      {/* Header with Title & Actions */}
      <div className="page-section flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{invoice.number}</h1>
          <p className="text-gray-600">{invoice.customer}</p>
        </div>
        <div className="flex gap-2">
          <Button>Edit</Button>
          <Button variant="secondary">Print</Button>
        </div>
      </div>

      {/* Summary Cards - Grid */}
      <div className="page-section grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card><div className="text-center">
          <p className="text-gray-600 text-sm">Invoice Date</p>
          <p className="text-lg font-bold">{invoice.date}</p>
        </div></Card>
        <Card><div className="text-center">
          <p className="text-gray-600 text-sm">Due Date</p>
          <p className="text-lg font-bold">{invoice.dueDate}</p>
        </div></Card>
        <Card><div className="text-center">
          <p className="text-gray-600 text-sm">Status</p>
          <Badge>{invoice.status}</Badge>
        </div></Card>
      </div>

      {/* Items Section */}
      <div className="page-section">
        <SectionHeader title="Items" />
        <Card>
          {invoice.items.map(item => (
            <ListRow
              key={item.id}
              title={item.product}
              subtitle={`${item.qty} × ${item.price}`}
              rightText={item.total}
            />
          ))}
        </Card>
      </div>

      {/* Total Section */}
      <div className="page-section">
        <Card>
          <div className="text-end space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{invoice.subtotal}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>{invoice.total}</span>
            </div>
          </div>
        </Card>
      </div>

    </PageContainer>
  );
};
```

**Key changes:**
- ❌ Dense display → ✅ Clear sections
- ❌ All in one section → ✅ Summary cards, items, total
- ❌ No spacing → ✅ 24px gaps
- ❌ Hard to read → ✅ Clear visual hierarchy

---

## 🎯 PATTERN 4: Settings Page

### Template Structure
```tsx
export const Settings = () => {
  return (
    <PageContainer maxWidth="md" title={t('settings.title')}>
      
      {/* Company Settings Section */}
      <Card className="page-section">
        <div className="card-header"><h3>Company</h3></div>
        <div className="card-body space-y-6">
          <Input label="Company Name" value={...} onChange={...} />
          <Input label="Phone" value={...} onChange={...} />
          <Input label="Email" type="email" value={...} onChange={...} />
        </div>
        <div className="card-footer">
          <Button>{t('forms.submit')}</Button>
        </div>
      </Card>

      {/* Notification Settings Section */}
      <Card className="page-section">
        <div className="card-header"><h3>Notifications</h3></div>
        <div className="card-body space-y-3">
          <label className="flex items-center gap-3">
            <input type="checkbox" />
            <span>Email Notifications</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" />
            <span>SMS Notifications</span>
          </label>
        </div>
        <div className="card-footer">
          <Button>{t('forms.submit')}</Button>
        </div>
      </Card>

      {/* Security Settings Section */}
      <Card className="page-section">
        <div className="card-header"><h3>Security</h3></div>
        <div className="card-body space-y-6">
          <Input type="password" label="Current Password" />
          <Input type="password" label="New Password" />
          <Input type="password" label="Confirm Password" />
        </div>
        <div className="card-footer">
          <Button>{t('forms.submit')}</Button>
        </div>
      </Card>

    </PageContainer>
  );
};
```

**Key changes:**
- ❌ One long form → ✅ Grouped card sections
- ❌ No clear breaks → ✅ Clear section separation
- ❌ One button at end → ✅ Save button per section
- ❌ Confusing layout → ✅ Clear organization

---

## 📚 SPACING RULES

### Use These Classes

```tsx
/* Sections - 24px gap (most important!) */
<div className="page-section">
  {/* content */}
</div>

/* Card body - space between items */
<div className="card-body space-y-6">  // 24px gap
  <Input ... />
  <Input ... />
</div>

/* Grid layout */
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* items */}
</div>

/* Flex buttons */
<div className="flex gap-3">  // 12px gap
  <Button>...</Button>
  <Button>...</Button>
</div>
```

### DON'T USE

```tsx
/* ❌ Wrong - inline styles */
<div style={{ marginBottom: '20px' }}>

/* ❌ Wrong - random Tailwind spacing */
<div className="mb-7 mt-5 p-9">

/* ❌ Wrong - no spacing system */
<div style={{ padding: '17px', gap: '11px' }}>
```

---

## 🎨 COMMON COMPONENTS

### Input (with label and error)
```tsx
<Input
  label={t('invoices.number')}
  placeholder="Enter invoice number"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  error={error}
  required
/>
```

### Textarea (with character count)
```tsx
<Textarea
  label="Notes"
  maxLength={500}
  showCharCount
  value={notes}
  onChange={(e) => setNotes(e.target.value)}
/>
```

### Select (with options)
```tsx
<Select
  label={t('invoices.customer')}
  options={customers.map(c => ({ value: c.id, label: c.name }))}
  value={selectedId}
  onChange={(e) => setSelectedId(e.target.value)}
  required
/>
```

### Button (various types)
```tsx
<Button variant="primary">Save</Button>           {/* Primary action */}
<Button variant="secondary">Cancel</Button>      {/* Secondary action */}
<Button variant="ghost">More Options</Button>    {/* Tertiary action */}
<Button variant="danger">Delete</Button>         {/* Destructive action */}
```

### ListRow (for lists)
```tsx
<ListRow
  to="/app/path/id"        {/* Click navigates here */}
  title="Row Title"        {/* Left side, large */}
  subtitle="Date"          {/* Left side, small */}
  rightText="Amount"       {/* Right side, large */}
/>
```

### Card (for grouping)
```tsx
<Card>
  <div className="card-header">
    <h3>Section Title</h3>
  </div>
  <div className="card-body space-y-6">
    {/* Content */}
  </div>
  <div className="card-footer">
    <Button>Action</Button>
  </div>
</Card>
```

---

## ✅ BEFORE YOU COMMIT

### Checklist
```
Mobile (375px):
  ☐ No horizontal scroll
  ☐ Text readable
  ☐ Buttons tappable (44px+)
  ☐ Lists stack vertically
  ☐ Forms responsive

Desktop (1024px+):
  ☐ Max-width centered
  ☐ Proper spacing
  ☐ Side-by-side layout works
  ☐ Buttons inline

RTL:
  ☐ Text right-aligned
  ☐ Icons correct direction
  ☐ Lists items correct order
  ☐ Forms inputs aligned
  ☐ No padding-left/right used

Dark Mode:
  ☐ All elements visible
  ☐ Text readable
  ☐ Proper contrast

Accessibility:
  ☐ Keyboard navigation works
  ☐ Focus rings visible
  ☐ Error messages clear
```

---

## 🔗 HELPFUL LINKS

| Doc | Purpose |
|-----|---------|
| PAGE_REFACTOR_EXAMPLES.md | Full code examples for each pattern |
| CALM_UI_RESTRUCTURE.md | Complete implementation guide |
| ARCHITECTURE.md | System design and flow |
| DELIVERABLES.md | What was built |

---

## 🚀 LET'S GO!

1. **Pick a page**: Start with InvoiceList (good template)
2. **Choose a pattern**: It's a list page, so use Pattern 1
3. **Copy the template**: From PAGE_REFACTOR_EXAMPLES.md
4. **Replace the code**: Update your page
5. **Test**: Mobile (375px), desktop, RTL, dark mode
6. **Commit**: Done!
7. **Repeat**: For next page

**Total time per page:** 30-45 minutes  
**Total for 14 pages:** 7-10 hours  
**Estimated timeline:** 2-3 days  

---

## 💡 PRO TIPS

### Use t() for all Arabic text
```tsx
// ✅ Good
const label = t('invoices.number');

// ❌ Wrong
const label = 'رقم الفاتورة';
```

### Always use page-section for spacing
```tsx
// ✅ Good
<div className="page-section">
  <Card>...</Card>
</div>
<div className="page-section">
  <Card>...</Card>
</div>

// ❌ Wrong
<div className="mb-6">
  <Card>...</Card>
</div>
<div className="mt-8 mb-4">
  <Card>...</Card>
</div>
```

### Import components from src/ui/
```tsx
// ✅ Good
import { PageContainer } from '../src/ui/PageContainer';
import { Card } from '../src/ui/Card';
import { ListRow } from '../src/ui/ListRow';

// ❌ Wrong
import PageContainer from '../components/PageContainer';
import { MyCard } from '../components/custom/Card';
```

### Test on mobile first
```tsx
// Always check at 375px width
// Then 768px
// Then 1024px
// Not the other way around
```

---

**Ready? Let's refactor! 🎉**

Start with: `InvoiceList.tsx`  
Use template from: `PAGE_REFACTOR_EXAMPLES.md`  
Need help? Read: `CALM_UI_RESTRUCTURE.md`  

