import { describe, it, expect } from 'bun:test';
import { SanhabIssuanceService } from '../src/sanhab/sanhab-issuance.service';

describe('SanhabIssuanceService', () => {
  it('getConfig returns mock mode when SANHAB_USE_REAL is not true', () => {
    const dataSource: any = {};
    const service = new SanhabIssuanceService(dataSource);
    const config = service.getConfig();
    expect(config.mode).toBe('mock');
    expect(config.submitMethod).toBe('SubmitPolicy');
  });

  it('getConfig returns real mode when SANHAB_USE_REAL=true', () => {
    const prev = process.env.SANHAB_USE_REAL;
    process.env.SANHAB_USE_REAL = 'true';
    process.env.SANHAB_WSDL_URL = 'http://sanhab.test/wsdl';
    process.env.SANHAB_API_KEY = 'key';

    const dataSource: any = {};
    const service = new SanhabIssuanceService(dataSource);
    const config = service.getConfig();
    expect(config.mode).toBe('real');

    process.env.SANHAB_USE_REAL = prev;
  });

  it('returns status not found when policy cannot be fetched', async () => {
    const dataSource: any = {};
    const service = new SanhabIssuanceService(dataSource);
    const result = await service.getStatus('missing-policy');
    expect(result.success).toBe(false);
    expect(result.error.code).toBe('NOT_FOUND');
  });
});
