import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearFirmsCache, FIRMS_SOURCES, handleFirmsRequest } from './firms';

const KEY = 'abcdef0123456789abcdef0123456789';
const url = new URL('http://localhost/api/firms?days=1');
const CSV = 'latitude,longitude,bright_ti4,acq_date,acq_time,confidence,frp,daynight\n29.8,79.0,330,2026-10-23,0812,h,5,D\n';

const respond = (status: number, text: string) => vi.fn(async () => new Response(text, { status })) as unknown as typeof fetch;

describe('FIRMS proxy', () => {
  beforeEach(() => clearFirmsCache());

  it('reports a missing key without calling FIRMS', async () => {
    const f = respond(200, CSV);
    const res = await handleFirmsRequest(url, undefined, f);
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ error: 'not_configured' });
    expect(f).not.toHaveBeenCalled();
  });

  it('queries every product for the India bounding box and returns raw CSV', async () => {
    const f = respond(200, CSV);
    const res = await handleFirmsRequest(url, KEY, f);
    expect(res.status).toBe(200);
    expect(f).toHaveBeenCalledTimes(FIRMS_SOURCES.length);
    const calls = (f as unknown as { mock: { calls: [string][] } }).mock.calls.map((c) => c[0]);
    expect(calls.every((u) => u.includes('/api/area/csv/') && u.endsWith('/68,6,98,37.5/1'))).toBe(true);
    expect(res.body).toMatchObject({ days: 1, results: expect.arrayContaining([expect.objectContaining({ ok: true, csv: CSV })]) });
  });

  it('never echoes the key back in errors', async () => {
    const f = respond(400, `Invalid MAP_KEY: ${KEY}`);
    const res = await handleFirmsRequest(url, KEY, f);
    expect(res.status).toBe(502);
    expect(JSON.stringify(res.body)).not.toContain(KEY);
    expect(JSON.stringify(res.body)).toContain('[key]');
  });

  it('caches a successful response and clamps the day range', async () => {
    const f = respond(200, CSV);
    await handleFirmsRequest(url, KEY, f);
    await handleFirmsRequest(url, KEY, f);
    expect(f).toHaveBeenCalledTimes(FIRMS_SOURCES.length);
    const wide = await handleFirmsRequest(new URL('http://localhost/api/firms?days=99'), KEY, respond(200, CSV));
    expect(wide.body).toMatchObject({ days: 5 });
  });
});
