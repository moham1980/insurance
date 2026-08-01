'use client';
import * as React from 'react';
import { cn } from '@insurance/ui-utils';

export interface BrandConfig {
  brandKey: string;
  displayNameFa?: string;
  displayNameEn?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  fontFamily?: 'vazirmatn' | 'inter' | 'custom';
  direction?: 'rtl' | 'ltr';
  calendar?: 'jalali' | 'gregorian';
  currency?: string;
  footerText?: string;
  legalText?: string;
}

export interface BrandWrapperProps {
  brand: BrandConfig;
  children: React.ReactNode;
  className?: string;
}

export function BrandWrapper({ brand, children, className }: BrandWrapperProps) {
  React.useEffect(() => {
    const root = document.documentElement;
    if (brand.primaryColor) root.style.setProperty('--color-brand-primary', brand.primaryColor);
    if (brand.secondaryColor) root.style.setProperty('--color-brand-secondary', brand.secondaryColor);
    if (brand.accentColor) root.style.setProperty('--color-brand-accent', brand.accentColor);

    if (brand.faviconUrl) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
      if (link) link.href = brand.faviconUrl;
      else {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.href = brand.faviconUrl;
        document.head.appendChild(newLink);
      }
    }

    if (brand.displayNameFa) document.title = brand.displayNameFa;

    if (brand.direction) {
      document.documentElement.setAttribute('dir', brand.direction);
    }
  }, [brand]);

  const style: React.CSSProperties = {
    ['--color-brand-primary' as string]: brand.primaryColor,
    ['--color-brand-secondary' as string]: brand.secondaryColor,
    ['--color-brand-accent' as string]: brand.accentColor,
  };

  return (
    <div
      className={cn('min-h-screen bg-bg-base font-primary text-text-primary', className)}
      style={style}
      data-brand={brand.brandKey}
      dir={brand.direction ?? 'rtl'}
    >
      {children}
      {brand.footerText && (
        <footer className="border-t border-border-default bg-bg-subtle px-6 py-4 text-center text-caption text-text-muted">
          {brand.footerText}
          {brand.legalText && <span className="mx-2">|</span>}
          {brand.legalText}
        </footer>
      )}
    </div>
  );
}
