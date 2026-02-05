# 🚀 QUICK START - NEW UI SYSTEM

**For Developers:** Copy-paste these patterns into your pages

---

## Template 1: Simple Page

```tsx
import React from 'react';

export default function MyPage() {
  return (
    <div className="page-container lg">
      {/* Title */}
      <div className="page-section">
        <h1>Page Title</h1>
        <p className="text-secondary">Optional subtitle</p>
      </div>

      {/* Main content */}
      <div className="page-section">
        <div className="card elevated">
          <div className="card-header">
            <h3>Card Title</h3>
          </div>
          <div className="card-body">
            <p>Your content here</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Template 2: List Page

```tsx
export default function ListPage() {
  const items = [
    { id: 1, name: 'Item 1', amount: '$100', status: 'success' },
    { id: 2, name: 'Item 2', amount: '$200', status: 'warning' },
  ];

  return (
    <div className="page-container lg">
      <div className="page-section">
        <h1>Items</h1>
        <input className="form-input" placeholder="Search..." />
      </div>

      <div className="page-section">
        <div className="list-container">
          {items.map((item) => (
            <div key={item.id} className="list-row">
              <div className="list-row-left">
                <div className="list-row-title">{item.name}</div>
              </div>
              <div className="list-row-right">
                <div className="list-row-amount">{item.amount}</div>
                <div className={`list-row-badge ${item.status}`}>
                  {item.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## Template 3: Form Page

```tsx
export default function FormPage() {
  const [form, setForm] = React.useState({ name: '', email: '' });

  return (
    <div className="page-container md">
      <div className="page-section">
        <h1>New Item</h1>
      </div>

      <div className="page-section">
        <div className="card">
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input 
                className="form-input" 
                value={form.name}
                onChange={(e) => setForm({...form, name: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input 
                className="form-input" 
                type="email"
                value={form.email}
                onChange={(e) => setForm({...form, email: e.target.value})}
              />
            </div>
          </div>

          <div className="card-footer">
            <button className="btn-primary">Save</button>
            <button className="btn-ghost">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Template 4: Grid Layout

```tsx
export default function GridPage() {
  return (
    <div className="page-container lg">
      <div className="page-section">
        <h1>Dashboard</h1>
      </div>

      {/* 3-column grid on desktop, 1-column on mobile */}
      <div className="page-section">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="card elevated">
            <div className="card-body">
              <h3 className="text-lg font-bold">Stat 1</h3>
              <p className="text-2xl font-bold">$1,234</p>
            </div>
          </div>
          <div className="card elevated">
            <div className="card-body">
              <h3 className="text-lg font-bold">Stat 2</h3>
              <p className="text-2xl font-bold">567</p>
            </div>
          </div>
          <div className="card elevated">
            <div className="card-body">
              <h3 className="text-lg font-bold">Stat 3</h3>
              <p className="text-2xl font-bold">89%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## CSS Classes Cheat Sheet

### Layout
```
.page-container           /* Container */
.page-container.lg        /* Large (1200px) */
.page-container.md        /* Medium (896px) */
.page-section             /* Section spacing */
```

### Cards
```
.card                     /* Base card */
.card.elevated            /* With shadow */
.card-header              /* Top part */
.card-body                /* Main part */
.card-footer              /* Bottom part */
```

### Buttons
```
.btn-primary              /* Blue button */
.btn-secondary            /* Gray button */
.btn-danger               /* Red button */
.btn-ghost                /* Transparent */
.btn-md                   /* Medium size */
.btn-lg                   /* Large size */
.btn-fullwidth            /* Full width */
```

### Forms
```
.form-group               /* Input container */
.form-label               /* Label */
.form-input               /* Input field */
.form-error               /* Error message */
.form-hint                /* Help text */
```

### Lists
```
.list-container           /* List wrapper */
.list-row                 /* Item row */
.list-row-left            /* Title area */
.list-row-right           /* Amount area */
.list-row-title           /* Item title */
.list-row-badge           /* Status badge */
.list-row-badge.success   /* Green badge */
.list-row-badge.warning   /* Yellow badge */
.list-row-badge.danger    /* Red badge */
```

### Spacing
```
.space-y-4                /* Vertical gap */
.gap-4                    /* Gap between items */
.p-4                      /* All padding */
.px-4                     /* Horizontal padding */
.py-4                     /* Vertical padding */
.m-4                      /* All margin */
```

### Text
```
.text-primary             /* Main color */
.text-secondary           /* Secondary color */
.text-muted               /* Gray color */
.text-sm                  /* Small text */
.text-lg                  /* Large text */
.text-bold                /* Bold text */
.text-center              /* Centered text */
```

### Grid
```
.grid                     /* Grid layout */
.grid-cols-1              /* 1 column */
.grid-cols-2              /* 2 columns */
.grid-cols-3              /* 3 columns */
.md:grid-cols-2           /* 2 cols on tablet+ */
.lg:grid-cols-3           /* 3 cols on desktop+ */
```

---

## Responsive Breakpoints

```
Mobile:   0px - 640px    (single column)
Tablet:   640px - 1024px (2 columns)
Desktop:  1024px+        (3-4 columns)
```

---

## Color Palette

```
Primary:   #2563eb (blue)
Success:   #10b981 (green)
Warning:   #f59e0b (amber)
Danger:    #ef4444 (red)
Info:      #0ea5e9 (cyan)

Grays:
  Gray-50:  #f9fafb (light)
  Gray-100: #f3f4f6
  Gray-200: #e5e7eb
  Gray-500: #6b7280 (medium)
  Gray-800: #1f2937
  Gray-900: #111827 (dark)
```

---

## Spacing Scale

```
1:  4px
2:  8px
3:  12px
4:  16px
6:  24px
8:  32px
12: 48px
```

---

## Common Tasks

### Center Content
```html
<div className="mx-auto">Centered content</div>
```

### Full Width Button
```html
<button className="btn-primary btn-fullwidth">Click me</button>
```

### Badge with Status
```html
<div className="list-row-badge success">Active</div>
<div className="list-row-badge warning">Pending</div>
<div className="list-row-badge danger">Failed</div>
```

### Error Message
```html
<div className="form-group">
  <label className="form-label required">Email</label>
  <input className="form-input error" />
  <div className="form-error">This field is required</div>
</div>
```

### Responsive Grid
```html
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <!-- Items automatically adjust -->
</div>
```

---

## Dark Mode

No special code needed! Dark mode is automatic via system preference.

To test:
- macOS: System Preferences → General → Appearance
- Windows: Settings → Personalization → Colors
- CSS handles color changes automatically

---

## RTL (Arabic)

No special code needed! RTL is automatic.

The app detects Arabic and automatically:
- Reverses text alignment
- Moves elements to right side
- Fixes padding and margins

---

## Build & Deploy

```bash
# Local development
npm run dev          # http://localhost:3002

# Production build
npm run build        # Creates optimized dist/

# Preview build
npm run preview      # Test production build locally
```

---

## Need Help?

See these files for more details:
- `UI_REDESIGN_COMPLETE.md` - Full design system guide
- `UI_FIXES_SUMMARY.md` - What was fixed
- `FINAL_STATUS_UI_OVERHAUL.md` - Complete status report

---

**Status: ✅ Ready to use!**

Start building beautiful pages with these templates and classes. 🎉
