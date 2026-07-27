import { useState, useEffect } from 'react';

/**
 * React hook for responsive media queries.
 * @example const isMobile = useMediaQuery('(max-width: 768px)');
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setMatches(e.matches);
    };

    // Set initial value
    setMatches(mql.matches);

    // Modern API
    if (mql.addEventListener) {
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }

    // Legacy API fallback
    mql.addListener(handler);
    return () => mql.removeListener(handler);
  }, [query]);

  return matches;
}
