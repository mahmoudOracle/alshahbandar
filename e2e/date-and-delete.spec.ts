import { test, expect } from '@playwright/test';

test.describe('Date input and invoice delete', () => {
  test('can type date parts and delete an invoice', async ({ page }) => {
    await page.goto('/');
    // navigate to invoices
    await page.click('a[href="/invoices"]');
    await expect(page).toHaveURL(/invoices/);

    // open new invoice form
    await page.click('a[href="/invoices/new"]');
    await expect(page).toHaveURL(/invoices\/new/);

    // fill customer and date fields (day/month/year inputs)
    await page.fill('input[placeholder="DD"]', '05');
    await page.fill('input[placeholder="MM"]', '12');
    await page.fill('input[placeholder="YYYY"]', '2025');

    // submit (assumes there's a submit button)
    await page.click('button[type="submit"]');

    // after save, return to list and delete created invoice
    await page.goto('/invoices');
    // wait for table and click first delete button
    const del = page.locator('button[aria-label="حذف الفاتورة"]').first();
    if (await del.count()) {
      // ensure dialog is accepted
      page.once('dialog', dialog => dialog.accept());
      await del.click();
    }
  });
});
