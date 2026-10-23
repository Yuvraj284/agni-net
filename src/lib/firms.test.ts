import { describe, expect, it } from 'vitest';
import { parseCsv, rowToObservation, toLiveDataset, type FirmsProxyBody } from './firms';

// Header and row shapes follow the FIRMS area API CSV for VIIRS and MODIS NRT products.
const VIIRS_CSV = [
  'latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight',
  // Inside the Garhwal–Kumaon region (uk)
  '29.85012,79.05231,341.2,0.39,0.36,2026-10-23,812,N20,VIIRS,h,2.0NRT,295.1,12.4,D',
  // Inside Similipal–Rourkela (od), low confidence, night
  '21.95,85.7,310.0,0.4,0.37,2026-10-23,2011,N20,VIIRS,l,2.0NRT,290.0,1.1,N',
  // Delhi — outside every monitored region
  '28.61,77.21,330.0,0.4,0.37,2026-10-23,812,N20,VIIRS,n,2.0NRT,292.0,5.0,D',
].join('\n');

const MODIS_CSV = [
  'latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight',
  '30.5,75.45,318.4,1.0,1.0,2026-10-23,0545,T,MODIS,76,6.1NRT,298.0,20.3,D',
  'not-a-number,75.45,318.4,1.0,1.0,2026-10-23,0545,T,MODIS,76,6.1NRT,298.0,20.3,D',
].join('\n');

const body = (results: FirmsProxyBody['results']): FirmsProxyBody => ({
  fetchedAt: '2026-10-23T09:00:00.000Z',
  days: 1,
  bbox: '68,6,98,37.5',
  results,
});

describe('FIRMS CSV conversion', () => {
  it('parses rows by header name', () => {
    const rows = parseCsv(VIIRS_CSV);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ latitude: '29.85012', confidence: 'h', satellite: 'N20' });
  });

  it('maps VIIRS rows: satellite from the product, category confidence, padded UTC time', () => {
    const obs = rowToObservation('VIIRS_NOAA20_NRT', parseCsv(VIIRS_CSV)[0]);
    expect(obs).toMatchObject({
      regionId: 'uk',
      instrument: 'VIIRS',
      satellite: 'NOAA-20',
      observedAt: '2026-10-23T08:12:00Z',
      confidence: { scheme: 'viirs-category', value: 'high' },
      brightnessK: 341.2,
      frpMW: 12.4,
      dayNight: 'D',
      provenance: 'firms-nrt',
    });
  });

  it('maps MODIS rows with percentage confidence', () => {
    const obs = rowToObservation('MODIS_NRT', parseCsv(MODIS_CSV)[0]);
    expect(obs).toMatchObject({ regionId: 'pb', satellite: 'Terra', instrument: 'MODIS', confidence: { scheme: 'modis-percent', value: 76 } });
  });

  it('flags detections outside monitored regions and rejects malformed rows', () => {
    expect(rowToObservation('VIIRS_NOAA20_NRT', parseCsv(VIIRS_CSV)[2])).toBe('outside');
    expect(rowToObservation('MODIS_NRT', parseCsv(MODIS_CSV)[1])).toBeNull();
  });

  it('builds a dataset with stable ids, de-duplication and coverage counts', () => {
    const ok = body([
      { source: 'VIIRS_NOAA20_NRT', ok: true, csv: VIIRS_CSV },
      { source: 'MODIS_NRT', ok: true, csv: MODIS_CSV },
      { source: 'VIIRS_NOAA20_NRT', ok: true, csv: VIIRS_CSV }, // duplicate response
      { source: 'VIIRS_SNPP_NRT', ok: false, error: 'HTTP 500' },
    ]);
    const a = toLiveDataset(ok);
    expect(a.observations).toHaveLength(3);
    expect(a.totalDetections).toBe(8);
    expect(a.outsideRegions).toBe(2);
    expect(a.failedSources).toEqual([{ source: 'VIIRS_SNPP_NRT', error: 'HTTP 500' }]);
    expect(toLiveDataset(ok).observations.map((o) => o.id)).toEqual(a.observations.map((o) => o.id));
    expect(a.observations.every((o) => /^F-[0-9a-z]{7}$/.test(o.id))).toBe(true);
  });
});
