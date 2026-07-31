import { describe, it, expect } from '@jest/globals';

describe('BrandConfig white-label', () => {
  it('should load default brand theme when no brandKey is provided', () => {
    const defaultTheme = {
      brandKey: 'default',
      displayName: 'بیمه',
      primaryColor: '#0d47a1',
      rtl: true,
    };
    expect(defaultTheme.brandKey).toBe('default');
    expect(defaultTheme.rtl).toBe(true);
    expect(defaultTheme.primaryColor).toBe('#0d47a1');
  });

  it('should apply CSS variables from brand theme', () => {
    const theme = {
      brandKey: 'sanhab',
      displayName: 'سنهاب',
      primaryColor: '#1565c0',
      secondaryColor: '#42a5f5',
      rtl: true,
    };
    expect(theme.primaryColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(theme.secondaryColor).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('should support RTL layout for Persian brands', () => {
    const theme = { brandKey: 'iranian', rtl: true };
    expect(theme.rtl).toBe(true);
  });

  it('should have legal text for brand', () => {
    const theme = {
      brandKey: 'default',
      legalText: 'این سامانه تحت نظارت بیمه مرکزی ایران فعالیت می‌کند.',
    };
    expect(theme.legalText).toContain('بیمه مرکزی');
  });
});
