import { test as base, expect, type Page } from '@playwright/test';

/**
 * Shared setup: every test starts from a fresh demo dataset, external network is blocked
 * (tiles, weather, WhatsApp) so runs are deterministic, and page errors fail the test.
 */
export const test = base.extend<{ app: Page }>({
  app: async ({ page }, use) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    await page.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (route) => route.abort());
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('e2e-init')) {
        localStorage.clear();
        sessionStorage.setItem('e2e-init', '1');
      }
    });
    await use(page);
    expect(pageErrors, 'uncaught page errors').toEqual([]);
  },
});

export { expect };

export const drawer = (page: Page) => page.getByRole('complementary', { name: /^Alert .* details$/ });
export const toast = (page: Page) => page.getByRole('status');
