# 📋 CALM UI - Page Refactor Examples

## Pattern 1: List Pages (InvoiceList, CustomerList, etc.)

### BEFORE (Table-based, heavy):
```tsx
<div className="page">
  <h1>Invoices</h1>
  
  <div className="filters">
    <input placeholder="Search..." />
    <select>...status...</select>
    <button>Filter</button>
    <button>Export</button>
  </div>

  <table>
    <thead>
      <tr>
        <th>Number</th>
        <th>Customer</th>
        <th>Total</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {invoices.map(inv => (
        <tr>
          <td>{inv.number}</td>
          <td>{inv.customer}</td>
          <td>{formatMoney(inv.total)}</td>
          <td><span className="badge">{inv.status}</span></td>
          <td>
            <button>Edit</button>
            <button>Delete</button>
            <button>Duplicate</button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

### AFTER (Calm ListRow):
```tsx
import { PageContainer } from '../src/ui/PageContainer';
import { SectionHeader } from '../src/ui/SectionHeader';
import { ListRow } from '../src/ui/ListRow';
import { Input } from '../src/ui/Input';
import { Select } from '../src/ui/Select';
import { Button } from '../src/ui/Button';

export const InvoiceList: React.FC = () => {
  return (
    <PageContainer 
      maxWidth="lg"
      title={t('invoices.title')}
      subtitle="Manage your invoices"
    >
      {/* Filters Section */}
      <div className="page-section">
        <div className="grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder={t('common.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
          <div className="flex gap-3">
            <Button variant="secondary">{t('common.filter')}</Button>
            <Button variant="ghost">{t('common.export')}</Button>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="page-section">
        <Button 
          variant="primary" 
          onClick={() => navigate('/app/invoices/new')}
        >
          {t('invoices.new')}
        </Button>
      </div>

      {/* List Items */}
      <div className="page-section">
        <SectionHeader 
          title={`${t('invoices.title')} (${invoices.length})`}
        />
        
        <div className="space-y-2">
          {invoices.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              {t('common.noResults')}
            </div>
          ) : (
            invoices.map(inv => (
              <ListRow
                key={inv.id}
                to={`/app/invoices/${inv.id}`}
                title={inv.number}
                subtitle={inv.customerName}
                rightText={formatMoney(inv.total)}
                rightBadge={{
                  text: getStatusLabel(inv.status),
                  variant: getStatusVariant(inv.status)
                }}
              />
            ))
          )}
        </div>
      </div>
    </PageContainer>
  );
};
```

**Key Changes:**
✅ Table → ListRow components
✅ PageContainer wraps everything
✅ SectionHeader for clear hierarchy
✅ Calm Input/Select styling
✅ 24px spacing between sections
✅ Status as badge variant
✅ No action buttons on row (use menu icon instead)

---

## Pattern 2: Form Pages (InvoiceForm, CustomerForm, etc.)

### BEFORE (Dense form):
```tsx
<div className="page">
  <h1>{isNew ? 'New Invoice' : 'Edit Invoice'}</h1>

  <form>
    <div className="form-row">
      <input placeholder="Invoice Number" />
      <select>...customers...</select>
    </div>

    <div className="form-row">
      <input type="date" placeholder="Invoice Date" />
      <input type="date" placeholder="Due Date" />
    </div>

    <div className="form-section">
      <h3>Items</h3>
      {/* Items table */}
    </div>

    <div className="form-row">
      <input placeholder="Notes" />
    </div>

    <div className="buttons">
      <button type="submit">Save</button>
      <button type="button">Cancel</button>
      <button type="button">Draft</button>
    </div>
  </form>
</div>
```

### AFTER (Calm form):
```tsx
import { PageContainer } from '../src/ui/PageContainer';
import { Input } from '../src/ui/Input';
import { Select } from '../src/ui/Select';
import { Textarea } from '../src/ui/Textarea';
import { Card } from '../src/ui/Card';
import { Button } from '../src/ui/Button';

export const InvoiceForm: React.FC = () => {
  return (
    <PageContainer 
      maxWidth="md"
      title={isNew ? t('invoices.new') : t('invoices.edit')}
    >
      <form className="page-section space-y-6">
        
        {/* Basic Info Card */}
        <Card>
          <div className="card-header">
            <h3>Invoice Details</h3>
          </div>
          <div className="card-body space-y-6">
            <Input
              label={t('invoices.number')}
              value={form.number}
              onChange={(e) => setForm({...form, number: e.target.value})}
              required
            />
            
            <Select
              label={t('invoices.customer')}
              options={customers}
              value={form.customerId}
              onChange={(e) => setForm({...form, customerId: e.target.value})}
              required
            />
          </div>
        </Card>

        {/* Dates Card */}
        <Card>
          <div className="card-header">
            <h3>Dates</h3>
          </div>
          <div className="card-body space-y-6">
            <Input
              type="date"
              label={t('invoices.date')}
              value={form.date}
              onChange={(e) => setForm({...form, date: e.target.value})}
              required
            />
            
            <Input
              type="date"
              label="Due Date"
              value={form.dueDate}
              onChange={(e) => setForm({...form, dueDate: e.target.value})}
            />
          </div>
        </Card>

        {/* Items Card */}
        <Card>
          <div className="card-header">
            <h3>Invoice Items</h3>
          </div>
          <div className="card-body">
            {/* Items list with inline editing */}
            {form.items.map((item, idx) => (
              <div key={idx} className="page-section space-y-3">
                <Input
                  label="Product"
                  value={item.productId}
                  onChange={(e) => updateItem(idx, 'productId', e.target.value)}
                />
                <Input
                  type="number"
                  label="Quantity"
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value))}
                />
                <Input
                  type="number"
                  label="Price"
                  value={item.price}
                  onChange={(e) => updateItem(idx, 'price', parseFloat(e.target.value))}
                />
              </div>
            ))}
            <Button 
              variant="secondary"
              onClick={addItem}
            >
              + Add Item
            </Button>
          </div>
        </Card>

        {/* Notes Card */}
        <Card>
          <div className="card-header">
            <h3>Notes</h3>
          </div>
          <div className="card-body">
            <Textarea
              label="Additional Notes"
              value={form.notes}
              onChange={(e) => setForm({...form, notes: e.target.value})}
              rows={4}
              maxLength={500}
              showCharCount
            />
          </div>
        </Card>

        {/* Action Buttons - Centered */}
        <div className="page-section flex justify-center gap-4">
          <Button 
            variant="primary"
            type="submit"
            loading={loading}
          >
            {t('forms.submit')}
          </Button>
          <Button 
            variant="secondary"
            type="button"
            onClick={handleDraft}
          >
            Save as Draft
          </Button>
          <Button 
            variant="ghost"
            type="button"
            onClick={() => navigate(-1)}
          >
            {t('forms.cancel')}
          </Button>
        </div>
      </form>
    </PageContainer>
  );
};
```

**Key Changes:**
✅ Form groups in cards (better organization)
✅ 24px spacing between sections
✅ Input labels clear
✅ Textarea with character count
✅ Action buttons centered
✅ Better visual hierarchy
✅ Mobile responsive (stacked inputs)
✅ Dark mode friendly

---

## Pattern 3: Detail Pages (InvoiceDetail, CustomerDetail)

### BEFORE (Dense):
```tsx
<div className="page">
  <div className="header">
    <h1>Invoice #001</h1>
    <div className="buttons">
      <button>Edit</button>
      <button>Print</button>
      <button>Email</button>
      <button>Delete</button>
    </div>
  </div>

  <div className="details-grid">
    <div>Invoice #: 001</div>
    <div>Customer: Ahmed Store</div>
    <div>Date: 2025-02-03</div>
    <div>Total: 5,000</div>
  </div>

  <div className="items-table">...</div>
</div>
```

### AFTER (Calm):
```tsx
import { PageContainer } from '../src/ui/PageContainer';
import { SectionHeader } from '../src/ui/SectionHeader';
import { Card } from '../src/ui/Card';
import { Button } from '../src/ui/Button';

export const InvoiceDetail: React.FC = () => {
  return (
    <PageContainer maxWidth="lg">
      {/* Header with Actions */}
      <div className="page-section flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{invoice.number}</h1>
          <p className="text-gray-600">{invoice.customerName}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={handleEdit}>Edit</Button>
          <Button variant="secondary" onClick={handlePrint}>Print</Button>
          <Button variant="ghost" onClick={handleMore}>More</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="page-section grid-cols-3">
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600">Invoice Date</p>
            <p className="text-lg font-semibold">{formatDate(invoice.date)}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600">Due Date</p>
            <p className="text-lg font-semibold">{formatDate(invoice.dueDate)}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600">Status</p>
            <Badge variant={getStatusVariant(invoice.status)}>
              {getStatusLabel(invoice.status)}
            </Badge>
          </div>
        </Card>
      </div>

      {/* Items */}
      <div className="page-section">
        <SectionHeader title="Items" />
        <Card>
          {invoice.items.map((item) => (
            <ListRow
              key={item.id}
              title={item.productName}
              subtitle={`${item.quantity} × ${formatMoney(item.price)}`}
              rightText={formatMoney(item.total)}
            />
          ))}
        </Card>
      </div>

      {/* Summary */}
      <div className="page-section">
        <Card>
          <div className="space-y-3 text-end">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span>{formatMoney(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax:</span>
              <span>{formatMoney(invoice.tax)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between font-bold">
              <span>Total:</span>
              <span className="text-2xl">{formatMoney(invoice.total)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="page-section">
          <SectionHeader title="Notes" />
          <Card>
            <p className="text-gray-700">{invoice.notes}</p>
          </Card>
        </div>
      )}
    </PageContainer>
  );
};
```

**Key Changes:**
✅ Clear information hierarchy
✅ Summary cards at top
✅ ListRow for items
✅ Large total display
✅ 24px spacing
✅ Actions in header
✅ Mobile responsive
✅ RTL safe

---

## Pattern 4: Settings Page

### BEFORE (Dense):
```tsx
<div className="settings-page">
  <h1>Settings</h1>
  
  <div className="settings-section">
    <h3>Company</h3>
    <input placeholder="Company Name" />
    <input placeholder="Phone" />
    <button>Save</button>
  </div>

  <div className="settings-section">
    <h3>Notifications</h3>
    <label><input type="checkbox" /> Email</label>
    <label><input type="checkbox" /> SMS</label>
    <button>Save</button>
  </div>
</div>
```

### AFTER (Calm):
```tsx
import { PageContainer } from '../src/ui/PageContainer';
import { Card } from '../src/ui/Card';
import { Input } from '../src/ui/Input';
import { Button } from '../src/ui/Button';

export const Settings: React.FC = () => {
  return (
    <PageContainer 
      maxWidth="md"
      title={t('settings.title')}
    >
      
      {/* Company Settings */}
      <Card className="page-section">
        <div className="card-header">
          <h3>Company Information</h3>
        </div>
        <div className="card-body space-y-6">
          <Input
            label="Company Name"
            value={settings.companyName}
            onChange={(e) => updateSettings('companyName', e.target.value)}
          />
          <Input
            label="Phone"
            value={settings.phone}
            onChange={(e) => updateSettings('phone', e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            value={settings.email}
            onChange={(e) => updateSettings('email', e.target.value)}
          />
        </div>
        <div className="card-footer">
          <Button 
            variant="primary"
            onClick={() => saveSettings('company')}
            loading={loading}
          >
            Save Changes
          </Button>
        </div>
      </Card>

      {/* Notification Settings */}
      <Card className="page-section">
        <div className="card-header">
          <h3>Notifications</h3>
        </div>
        <div className="card-body space-y-4">
          <label className="flex items-center gap-3">
            <input 
              type="checkbox" 
              checked={settings.emailNotifications}
              onChange={(e) => updateSettings('emailNotifications', e.target.checked)}
            />
            <span>Email Notifications</span>
          </label>
          <label className="flex items-center gap-3">
            <input 
              type="checkbox"
              checked={settings.smsNotifications}
              onChange={(e) => updateSettings('smsNotifications', e.target.checked)}
            />
            <span>SMS Notifications</span>
          </label>
        </div>
        <div className="card-footer">
          <Button 
            variant="primary"
            onClick={() => saveSettings('notifications')}
            loading={loading}
          >
            Save Changes
          </Button>
        </div>
      </Card>

      {/* Security Settings */}
      <Card className="page-section">
        <div className="card-header">
          <h3>Security</h3>
        </div>
        <div className="card-body space-y-6">
          <Input
            type="password"
            label="Current Password"
            value={passwordForm.current}
            onChange={(e) => setPasswordForm({...passwordForm, current: e.target.value})}
          />
          <Input
            type="password"
            label="New Password"
            value={passwordForm.new}
            onChange={(e) => setPasswordForm({...passwordForm, new: e.target.value})}
          />
          <Input
            type="password"
            label="Confirm Password"
            value={passwordForm.confirm}
            onChange={(e) => setPasswordForm({...passwordForm, confirm: e.target.value})}
          />
        </div>
        <div className="card-footer">
          <Button 
            variant="primary"
            onClick={handleChangePassword}
            loading={loading}
          >
            Change Password
          </Button>
        </div>
      </Card>

    </PageContainer>
  );
};
```

**Key Changes:**
✅ Each section in separate card
✅ 24px spacing between cards
✅ Clear card headers
✅ Save button in footer
✅ Better organization
✅ Calm styling
✅ Mobile responsive

---

## 🎯 Implementation Checklist

For each page refactor:

```typescript
// 1. Import calm components
import { PageContainer } from '../src/ui/PageContainer';
import { Card } from '../src/ui/Card';
import { ListRow } from '../src/ui/ListRow';
import { SectionHeader } from '../src/ui/SectionHeader';

// 2. Wrap page in PageContainer
<PageContainer maxWidth="lg" title="Page Title">
  {/* Content */}
</PageContainer>

// 3. Use 24px sections
<div className="page-section">
  {/* Content */}
</div>

// 4. Group related items in cards
<Card>
  <div className="card-header">
    <h3>Section Title</h3>
  </div>
  <div className="card-body space-y-6">
    {/* Content */}
  </div>
</Card>

// 5. Replace tables with ListRow
{items.map(item => (
  <ListRow
    key={item.id}
    to={`/path/${item.id}`}
    title={item.title}
    subtitle={item.date}
    rightText={item.amount}
  />
))}

// 6. Use calm components
<Input label="..." required />
<Select options={...} />
<Textarea />
<Button variant="primary" />

// 7. Center action buttons
<div className="page-section flex justify-center gap-4">
  <Button>Save</Button>
  <Button variant="secondary">Cancel</Button>
</div>

// 8. Test on mobile (375px), tablet (768px), desktop (1024px+)
// 9. Verify RTL alignment
// 10. Check dark mode
```

---

## ✅ Example: Converting InvoiceList Page (Full)

**See CALM_UI_RESTRUCTURE.md for the complete refactoring guide.**

