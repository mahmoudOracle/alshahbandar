# Alshahbandar — User Guide (Non-technical)

Welcome to Alshahbandar, a mobile-first accounting system built for small and medium businesses.

## Mobile-First Principles
- Designed for one-handed use on phones.
- Large touch targets, clear spacing, and simplified card-based lists.
- Bottom navigation for quick access to the most used domains: Dashboard, Invoices, Customers, Products, Reports.

## Getting Started
1. Create an account using the "Create Account" link on the login screen.
2. After creating an account, you'll be prompted to create a company and be assigned a role.
3. The Dashboard shows key KPIs: Today's Sales, Cash Balances, Expenses, and Monthly Profit.

## Primary Workflows
- Invoicing: Create invoices from the Dashboard or Invoices area. Use mobile-friendly item entry and numeric keypad.
- Customers: Add and search customers. Tap a customer to view history and create invoices.
- Products: Add products with price and stock. Low-stock items appear in Dashboard.
- Receiving Purchases: Use the Receipts flow to record incoming stock and update inventory.

## Accounting Safety
- Posted (finalized) entries cannot be edited or deleted from the UI.
- Monthly periods can be locked by administrators; locked periods prevent changes to historical data.
- All sensitive server-side enforcement (rules, cloud functions) is authoritative; UI-level checks are informational.

## Offline & Sync
- The app supports offline usage and background sync. Changes are queued locally and synchronized when connectivity is restored.
- The Sync Status badge (top-right) shows sync health and last successful sync.

## Roles & Permissions
- Owner: Full access (admin-level)
- Manager / Accountant: Create and edit transactions, manage customers/products
- Employee / Cashier: Limited access (sales, receipts)
- Viewer: Read-only access for reporting

## Tips for Mobile
- Use the bottom navigation for quick access.
- Use the quick-add product flow to add items during invoice entry.
- Expand card rows for details instead of relying on wide tables.

## Support
For assistance, contact support@example.com or consult the technical documentation in the `docs/` folder.

---
This guide is intentionally short and written for non-technical users. Maintainers: keep this file updated with final screenshots and step-by-step flows.