import { test, expect } from '@playwright/test';

// Simple E2E: create a purchase via UI and verify a success notification appears
// Assumes local dev server running at PLAYWRIGHT_BASE_URL and emulator endpoints available

test.describe('Purchase flow', () => {
  test('creates a purchase from the UI', async ({ page }) => {
    const base = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001';
    await page.goto(base);

    // Navigate to purchases page (assumes sidebar link exists)
    await page.click('a:has-text("المشتريات")');

    // Click new purchase (if a button exists)
    await page.click('button:has-text("إنشاء")');

    // Select supplier
    await page.waitForSelector('[aria-label="purchase-supplier-select"]');
    await page
      .selectOption('[aria-label="purchase-supplier-select"]', { index: 1 })
      .catch(() => {});

    // Add a row
    await page.click('button:has-text("أضف صف")');

    // Fill first row product and quantity/price
    await page
      .selectOption('[aria-label="purchase-row-product-select-0"]', { index: 1 })
      .catch(() => {});
    await page.fill('[aria-label="purchase-row-quantity-0"]', '2');
    await page.fill('[aria-label="purchase-row-unitPrice-0"]', '10');

    // Submit purchase
    await page.click('[aria-label="create-purchase-submit"]');

    // Expect a success notification to appear (selector may vary)
    const notif = page.locator('text=تم إنشاء أمر الشراء');
    await expect(notif).toBeVisible({ timeout: 5000 });
  });
});
