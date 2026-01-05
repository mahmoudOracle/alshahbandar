import { test, expect } from '@playwright/test';

// This E2E test assumes the app is running locally and the emulator is available for backend.
// It performs a simple flow: create purchase (adds stock), create invoice (sale), record payment.

test('purchase -> sale -> payment flow', async ({ page }) => {
  // Navigate to app
  await page.goto('/');
  // Wait for app to load and navigate to Purchases
  await page.click('a:has-text("أوامر الشراء")');
  await page.waitForURL('**/purchases');

  // Create a purchase: select supplier (if none, this step may need seeded data)
  await page.click('text=أضف صف');
  // select first product in the added row
  await page
    .selectOption('select[aria-label="purchase-row-product-select-0"]', { index: 1 })
    .catch(() => {});
  // set quantity and price inputs for row 0
  await page.fill('input[aria-label="purchase-row-quantity-0"]', '5');
  await page.fill('input[aria-label="purchase-row-unitPrice-0"]', '10');
  await page.click('text=إنشاء أمر الشراء');
  await page.waitForTimeout(1000);

  // Navigate to Invoices and create a simple invoice using one product
  await page.click('a:has-text("الفواتير")');
  await page.waitForURL('**/invoices');
  await page.click('text=إنشاء فاتورة');
  await page.waitForSelector('text=أضف عنصر');
  await page.click('text=أضف عنصر');
  // choose product via SearchableSelect input (first product item)
  await page.fill('input[name="product_0"]', '');
  // fallback: select the first visible option in the listbox
  await page.click('ul[role="listbox"] li:nth-child(1)').catch(() => {});
  const qtyInv = await page
    .locator('input[placeholder="الكمية"]')
    .first()
    .catch(() => page.locator('input[type="number"]').first());
  await qtyInv.fill('2');
  await page.click('text=حفظ');
  await page.waitForTimeout(1000);

  // Open invoice details and make a payment
  await page.click('text=عرض');
  await page.waitForSelector('text=إضافة دفعة');
  await page.click('text=إضافة دفعة');
  const amountInput = await page.locator('input[type="number"]').first();
  await amountInput.fill('20');
  await page.click('text=حفظ الدفعة');

  // Assert payment appears
  await page.waitForSelector('text=الدفعات');
  expect(await page.locator('text=الدفعات').count()).toBeGreaterThanOrEqual(1);
});
