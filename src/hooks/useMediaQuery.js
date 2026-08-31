// hooks/useMediaQuery.js — MediaQuery.of(context).size.width, as a hook.

import { useEffect, useState } from 'react';

export function useMediaQuery(queryString) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(queryString).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(queryString);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [queryString]);

  return matches;
}

/** True on the desktop/web shell — the Dart _wideBreakpoint. */
export const useIsWide = () => useMediaQuery('(min-width: 900px)');
