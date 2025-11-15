import { test, expect } from '@playwright/test';

const WARNING_TEXT = 'state update on an unmounted component';

test('rapid query typing keeps search hook mounted safely', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (error) => {
    consoleErrors.push(error.message);
  });

  await page.goto('/search?q=tokyo');

  const followUpInput = page.getByPlaceholder('Ask a follow-up...');
  await followUpInput.click();
  await followUpInput.type('cheap hotels near shibuya', { delay: 10 });
  await page.keyboard.press('Enter');
  await followUpInput.type('open now please', { delay: 5 });
  await page.keyboard.press('Enter');

  const queries = ['tokyo%20restaurants', 'tokyo%20bars', 'tokyo%20cafes'];
  for (const q of queries) {
    await page.goto(`/search?q=${q}`, { waitUntil: 'domcontentloaded' });
  }

  await page.waitForTimeout(500);
  expect(consoleErrors.some((msg) => msg.includes(WARNING_TEXT))).toBeFalsy();
});
