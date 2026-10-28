import { drawer, expect, test, toast } from './fixtures';

test('WhatsApp sharing opens a demo-marked message and logs it once', async ({ app: page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __opened: string[] }).__opened = [];
    window.open = (url?: string | URL) => {
      (window as unknown as { __opened: string[] }).__opened.push(String(url));
      return null;
    };
  });
  await page.goto('/#/alerts/ALT-OD-001');
  const panel = drawer(page);
  await panel.getByRole('button', { name: /Share with (Forest Team|a field team)/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Share with a field team' });
  await expect(dialog).toContainText('DEMO DATA, not a real alert');

  // Escape closes the dialog first, not the drawer underneath.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(panel).toBeVisible();

  await panel.getByRole('button', { name: /Share with (Forest Team|a field team)/ }).click();
  await dialog.getByLabel(/WhatsApp number/).fill('+91 00000 00000');
  await dialog.getByRole('button', { name: 'Open in WhatsApp' }).click();
  await dialog.getByRole('button', { name: 'Open WhatsApp again' }).click();

  const opened = await page.evaluate(() => (window as unknown as { __opened: string[] }).__opened);
  expect(opened).toHaveLength(2);
  expect(opened[0]).toMatch(/^https:\/\/api\.whatsapp\.com\/send\?phone=910000000000&text=/);
  expect(decodeURIComponent(opened[0])).toContain('Request: ground verification');

  await page.keyboard.press('Escape');
  await expect(panel.getByText(/Opened a WhatsApp dispatch message/)).toHaveCount(1);
  await expect(panel.getByText(/Delivery and response are not tracked/)).toBeVisible();
});

const LIVE_CSV = [
  'latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight',
  '29.85,79.05,341.2,0.39,0.36,2026-10-23,0812,N20,VIIRS,h,2.0NRT,295.1,12.4,D',
  '29.851,79.051,338.0,0.39,0.36,2026-10-23,0812,N20,VIIRS,n,2.0NRT,294.0,9.1,D',
  '28.61,77.21,330.0,0.4,0.37,2026-10-23,0812,N20,VIIRS,n,2.0NRT,292.0,5.0,D',
].join('\n');

test('switching to NASA FIRMS uses live detections through the proxy', async ({ app: page }) => {
  await page.route('**/api/firms**', (route) =>
    route.fulfill({
      json: {
        fetchedAt: new Date().toISOString(),
        days: 1,
        bbox: '68,6,98,37.5',
        results: [
          { source: 'VIIRS_NOAA20_NRT', ok: true, csv: LIVE_CSV },
          { source: 'MODIS_NRT', ok: false, error: 'HTTP 500' },
        ],
      },
    }),
  );
  await page.goto('/#/alerts');
  await page.getByRole('button', { name: /^Data source:/ }).click();
  await page.getByRole('radio', { name: /NASA FIRMS, last 24 hours/ }).click();
  await expect(toast(page)).toContainText('Loaded 2 NASA FIRMS detections in monitored regions (1 elsewhere in India not shown). 1 source(s) failed.');
  await expect(page.getByRole('button', { name: 'Data source: NASA FIRMS' })).toBeVisible();

  // Two detections 150 m apart group into one live candidate alert.
  const row = page.getByRole('row').filter({ hasText: /ALT-F-/ });
  await expect(row).toHaveCount(1);
  await row.click();
  await expect(drawer(page).getByText('NASA FIRMS', { exact: true })).toBeVisible();
  await expect(drawer(page)).toContainText('VIIRS (NASA FIRMS near real time)');
});

test('an unconfigured live feed falls back to sample data with a clear message', async ({ app: page }) => {
  await page.goto('/#/overview');
  await page.getByRole('button', { name: /^Data source:/ }).click();
  await page.getByRole('radio', { name: /NASA FIRMS, last 24 hours/ }).click();
  await expect(toast(page)).toContainText('Live feed is not configured. Add FIRMS_MAP_KEY to .env.local');
  await expect(page.getByRole('button', { name: 'Data source: Sample data' })).toBeVisible();
});
