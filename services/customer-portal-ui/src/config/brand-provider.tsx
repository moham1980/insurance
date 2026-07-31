'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  BrandTheme,
  DEFAULT_BRAND_THEME,
  brandConfigToTheme,
  applyBrandCssVars,
} from '../themes/brand-theme';

interface BrandContextValue {
  theme: BrandTheme;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const BrandContext = createContext<BrandContextValue>({
  theme: DEFAULT_BRAND_THEME,
  loading: true,
  error: null,
  refresh: () => {},
});

/**
 * Resolve the brand key from the current browser host.
 * Matches against domainAllowList in brand configs.
 */
function resolveBrandKeyFromHost(): string | null {
  if (typeof window === 'undefined') return null;
  const host = window.location.hostname;
  // Allow explicit brandKey in query param: ?brandKey=foo
  const params = new URLSearchParams(window.location.search);
  const explicit = params.get('brandKey');
  if (explicit) return explicit;
  // Simple convention: subdomain.brand.tld → subdomain
  const parts = host.split('.');
  if (parts.length >= 3) return parts[0];
  return null;
}

/**
 * BrandProvider — dynamically loads BrandConfig from the auth-service
 * based on the Host header or an explicit brandKey query parameter.
 * Falls back to DEFAULT_BRAND_THEME if the API is unreachable.
 */
export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<BrandTheme>(DEFAULT_BRAND_THEME);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBrand = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const brandKey = resolveBrandKeyFromHost();
      if (!brandKey) {
        // No brand key resolved — use default
        setTheme(DEFAULT_BRAND_THEME);
        applyBrandCssVars(DEFAULT_BRAND_THEME);
        setLoading(false);
        return;
      }

      // Fetch brand config from auth-service public endpoint
      const apiUrl =
        process.env.NEXT_PUBLIC_AUTH_API_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        'http://localhost:18000';

      const res = await fetch(
        `${apiUrl}/auth/api/v1/brand/by-domain?domain=${encodeURIComponent(window.location.hostname)}`,
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );

      if (!res.ok) {
        // If 404, brand not found — use default
        if (res.status === 404) {
          setTheme(DEFAULT_BRAND_THEME);
          applyBrandCssVars(DEFAULT_BRAND_THEME);
        } else {
          throw new Error(`Failed to load brand config: ${res.status}`);
        }
      } else {
        const json = await res.json();
        const data = json.data || json;
        const resolved = brandConfigToTheme(data);
        setTheme(resolved);
        applyBrandCssVars(resolved);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load brand');
      // Fallback to default theme
      setTheme(DEFAULT_BRAND_THEME);
      applyBrandCssVars(DEFAULT_BRAND_THEME);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBrand();
  }, [loadBrand]);

  return (
    <BrandContext.Provider
      value={{ theme, loading, error, refresh: loadBrand }}
    >
      {children}
    </BrandContext.Provider>
  );
}

/**
 * useBrand — hook to access the current brand theme.
 */
export function useBrand(): BrandContextValue {
  return useContext(BrandContext);
}

/**
 * useBrandTheme — convenience hook returning just the theme object.
 */
export function useBrandTheme(): BrandTheme {
  return useContext(BrandContext).theme;
}
