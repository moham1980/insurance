import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrandWrapper, type BrandConfig } from './BrandWrapper';

const brand: BrandConfig = {
  brandKey: 'test-brand',
  displayNameFa: 'بیمه تست',
  primaryColor: '#FF0000',
  secondaryColor: '#00FF00',
};

describe('BrandWrapper', () => {
  it('renders children', () => {
    render(<BrandWrapper brand={brand}><div>Content</div></BrandWrapper>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('sets CSS variables for brand colors', () => {
    render(<BrandWrapper brand={brand}><div>Content</div></BrandWrapper>);
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--color-brand-primary')).toBe('#FF0000');
    expect(root.style.getPropertyValue('--color-brand-secondary')).toBe('#00FF00');
  });

  it('displays brand name when showHeader is true', () => {
    const brandWithName = { ...brand, displayNameFa: 'بیمه ایران' };
    render(<BrandWrapper brand={brandWithName} showHeader><div>Content</div></BrandWrapper>);
    expect(screen.getByText('بیمه ایران')).toBeInTheDocument();
  });
});
