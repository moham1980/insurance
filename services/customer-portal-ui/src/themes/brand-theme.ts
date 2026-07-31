/**
 * Brand theme type — mirrors BrandConfig entity from auth-service.
 */
export interface BrandTheme {
  brandKey: string;
  displayNameFa: string;
  displayNameEn: string;
  primaryColor: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  headerLogoUrl: string | null;
  rtl: boolean;
  calendarType: 'jalali' | 'gregorian';
  defaultCurrency: string;
  supportedLocales: string[];
  defaultLanguage: string;
  supportPhone: string | null;
  supportEmail: string | null;
  supportUrl: string | null;
  legalTextFa: string | null;
  legalTextEn: string | null;
  welcomeMessageFa: string | null;
  welcomeMessageEn: string | null;
  portalLoginBackgroundUrl: string | null;
  primaryFont: string;
  customCss: string | null;
}

/** Fallback / default brand used when no brand config is loaded yet. */
export const DEFAULT_BRAND_THEME: BrandTheme = {
  brandKey: 'default',
  displayNameFa: 'بیمه پلاس',
  displayNameEn: 'Insurance Plus',
  primaryColor: '#0d47a1',
  logoUrl: null,
  faviconUrl: null,
  headerLogoUrl: null,
  rtl: true,
  calendarType: 'jalali',
  defaultCurrency: 'IRR',
  supportedLocales: ['fa', 'en'],
  defaultLanguage: 'fa',
  supportPhone: null,
  supportEmail: null,
  supportUrl: null,
  legalTextFa: null,
  legalTextEn: null,
  welcomeMessageFa: 'به پرتال مشتری بیمه خوش آمدید',
  welcomeMessageEn: 'Welcome to Insurance Customer Portal',
  portalLoginBackgroundUrl: null,
  primaryFont: 'Vazirmatn',
  customCss: null,
};

/**
 * Convert a BrandConfig API response into a BrandTheme.
 */
export function brandConfigToTheme(cfg: Record<string, any>): BrandTheme {
  return {
    brandKey: cfg.brandKey ?? 'default',
    displayNameFa: cfg.displayNameFa ?? 'بیمه پلاس',
    displayNameEn: cfg.displayNameEn ?? 'Insurance Plus',
    primaryColor: cfg.primaryColor ?? '#0d47a1',
    logoUrl: cfg.logoUrl ?? null,
    faviconUrl: cfg.faviconUrl ?? null,
    headerLogoUrl: cfg.headerLogoUrl ?? null,
    rtl: cfg.rtl ?? true,
    calendarType: cfg.calendarType ?? 'jalali',
    defaultCurrency: cfg.defaultCurrency ?? 'IRR',
    supportedLocales: cfg.supportedLocales ?? ['fa', 'en'],
    defaultLanguage: cfg.defaultLanguage ?? 'fa',
    supportPhone: cfg.supportPhone ?? null,
    supportEmail: cfg.supportEmail ?? null,
    supportUrl: cfg.supportUrl ?? null,
    legalTextFa: cfg.legalTextFa ?? null,
    legalTextEn: cfg.legalTextEn ?? null,
    welcomeMessageFa: cfg.welcomeMessageFa ?? null,
    welcomeMessageEn: cfg.welcomeMessageEn ?? null,
    portalLoginBackgroundUrl: cfg.portalLoginBackgroundUrl ?? null,
    primaryFont: cfg.primaryFont ?? 'Vazirmatn',
    customCss: cfg.customCss ?? null,
  };
}

/**
 * Inject brand CSS variables into the document root.
 * Called by BrandProvider on theme change.
 */
export function applyBrandCssVars(theme: BrandTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--brand-primary', theme.primaryColor);
  root.style.setProperty('--brand-font', `'${theme.primaryFont}', sans-serif`);

  // Apply RTL/LTR
  root.setAttribute('dir', theme.rtl ? 'rtl' : 'ltr');
  root.setAttribute('lang', theme.defaultLanguage || (theme.rtl ? 'fa' : 'en'));

  // Favicon
  if (theme.faviconUrl) {
    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = theme.faviconUrl;
  }

  // Custom CSS
  if (theme.customCss) {
    let style = document.getElementById('brand-custom-css') as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = 'brand-custom-css';
      document.head.appendChild(style);
    }
    style.textContent = theme.customCss;
  }
}
