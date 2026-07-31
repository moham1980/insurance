import { describe, it, expect } from 'bun:test';

describe('P3 Policy Lifecycle', () => {
  it('validates UUID format', () => {
    const re = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const valid = '12345678-1234-4123-8123-123456789012';
    expect(re.test(valid)).toBe(true);
    expect(re.test('not-a-uuid')).toBe(false);
  });

  it('extracts coverages from legacy object format', () => {
    const coverages = {
      tpl: { limit: 1000000, premium: 50000 },
      bodily: { limit: 2000000, premium: 80000 },
    };
    const rows = Object.keys(coverages).map((key) => ({
      coverageCode: key,
      limitAmount: coverages[key].limit,
      premiumAmount: coverages[key].premium,
      deductibleAmount: 0,
      metadata: coverages[key],
    }));
    expect(rows.length).toBe(2);
    expect(rows[0].coverageCode).toBe('tpl');
  });
});
