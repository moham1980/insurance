import { useEffect, useState } from 'react';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'sm' | 'md' | 'lg';
  density: 'compact' | 'comfortable';
  sidebarCollapsed: boolean;
  recentPages: string[];
}

const STORAGE_KEY = 'insurance-user-prefs';
const defaultPrefs: UserPreferences = {
  theme: 'system',
  fontSize: 'md',
  density: 'comfortable',
  sidebarCollapsed: false,
  recentPages: [],
};

/**
 * Personalization engine hook.
 * Persists user preferences to localStorage and applies CSS variables.
 *
 * @example
 * const { prefs, updatePrefs } = usePersonalization();
 */
export function usePersonalization(): {
  prefs: UserPreferences;
  updatePrefs: (partial: Partial<UserPreferences>) => void;
} {
  const [prefs, setPrefs] = useState<UserPreferences>(() => {
    if (typeof window === 'undefined') return defaultPrefs;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...defaultPrefs, ...JSON.parse(raw) } : defaultPrefs;
    } catch {
      return defaultPrefs;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));

    // Apply font-size
    const fontSizeMap = { sm: '14px', md: '16px', lg: '18px' };
    document.documentElement.style.setProperty('--user-font-size', fontSizeMap[prefs.fontSize]);

    // Apply density
    const densityMap = { compact: '0.5rem', comfortable: '1rem' };
    document.documentElement.style.setProperty('--user-spacing', densityMap[prefs.density]);
  }, [prefs]);

  const updatePrefs = (partial: Partial<UserPreferences>) => {
    setPrefs((prev) => ({ ...prev, ...partial }));
  };

  return { prefs, updatePrefs };
}
