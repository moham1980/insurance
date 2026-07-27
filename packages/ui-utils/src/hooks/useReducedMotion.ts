import { useState, useEffect } from 'react';

/**
 * Detect user preference for reduced motion (accessibility).
 * @example const shouldReduce = useReducedMotion();
 *          <motion.div animate={shouldReduce ? {} : { x: 100 }} />
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setReduced(e.matches);
    };

    setReduced(mql.matches);

    if (mql.addEventListener) {
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }

    mql.addListener(handler);
    return () => mql.removeListener(handler);
  }, []);

  return reduced;
}
