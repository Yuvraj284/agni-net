import { drawer, expect, test, toast } from './fixtures';

test('overview loads on sample data with the India boundary basemap', async ({ app: page }) => {
  await page.goto('/#/map');
  await expect(page.getByRole('button', { name: 'Data source: Sample data' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Live map' })).toBeVisible();
  // MapLibre reports idle once the style is parsed and tile requests settle (tiles are blocked here).
  await expect(page.locator('.agn-map')).toHaveAttribute('data-basemap', 'ready', { timeout: 20_000 });
  await expect(page.locator('.leaflet-tile-pane canvas')).toHaveCount(1);

  // The boundary is served with the app (MapLibre fetches it from a worker).
  const borders = await page.request.get('/geo/india-land-borders.geojson');
  expect(borders.status()).toBe(200);
  expect((await borders.json()).features[0].geometry.type).toBe('LineString');
  await expect(page.locator('.leaflet-control-attribution')).toContainText('Natural Earth (India view)');
});

test('theme choice persists across reloads', async ({ app: page }) => {
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('a review is appended to history and survives a reload', async ({ app: page }) => {
  await page.goto('/#/alerts/ALT-OD-001');
  const panel = drawer(page);
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('heading', { name: 'ALT-OD-001' })).toBeVisible();

  await panel.getByRole('radio', { name: /^Confirmed/ }).check();
  await panel.getByRole('button', { name: 'Save review' }).click();
  await expect(panel.getByRole('alert')).toContainText('A note of at least 10 characters');

  await panel.getByRole('textbox').fill('Smoke column confirmed by range office call.');
  await panel.getByRole('button', { name: 'Save review' }).click();
  await expect(panel.getByRole('alert')).toContainText('Assign a reviewer before confirming');

  await panel.getByRole('combobox', { name: 'Reviewer' }).selectOption('rv-ar');
  await panel.getByRole('button', { name: 'Save review' }).click();
  await expect(toast(page)).toContainText('Saved');
  await expect(panel.getByText('Smoke column confirmed by range office call.')).toBeVisible();

  await page.reload();
  await expect(drawer(page).getByText('Smoke column confirmed by range office call.')).toBeVisible();
  await expect(drawer(page).getByText('Verified incident')).toBeVisible();
});

test('alert links open the alert, and copying a link works', async ({ app: page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/#/map/ALT-MP-001');
  await expect(drawer(page).getByRole('heading', { name: 'ALT-MP-001' })).toBeVisible();
  await drawer(page).getByRole('button', { name: 'Copy link to this alert' }).click();
  await expect(toast(page)).toContainText('Link to ALT-MP-001 copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/#\/map\/ALT-MP-001$/);

  await page.keyboard.press('Escape');
  await expect(drawer(page)).toBeHidden();
  await expect(page).toHaveURL(/#\/map$/);
});

test('the alert queue exports as CSV', async ({ app: page }) => {
  await page.goto('/#/alerts');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Export \d+ as CSV$/ }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^agninet-alerts-demo-\d{8}-\d{4}\.csv$/);
  const text = await (await file.createReadStream()).toArray();
  const csv = Buffer.concat(text).toString('utf8');
  expect(csv.split('\r\n')[0]).toContain('alert_id,verification_status,priority_band');
  expect(csv).toContain('ALT-OD-001');
});
