import { useEffect, useState } from 'react';

/**
 * Let the active page paint first, then warm nearby heavy content shortly after
 * the new tab becomes visible. Hiding the document cancels the warm state.
 */
export const useVisibleWarmup = (delayMs = 450): boolean => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let timer: number | null = null;
    const clear = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
    };
    const schedule = () => {
      clear();
      if (document.visibilityState === 'hidden') {
        setReady(false);
        return;
      }
      setReady(false);
      timer = window.setTimeout(() => {
        timer = null;
        if (document.visibilityState !== 'hidden') setReady(true);
      }, delayMs);
    };

    schedule();
    document.addEventListener('visibilitychange', schedule);
    window.addEventListener('pageshow', schedule);
    window.addEventListener('pagehide', clear);
    return () => {
      clear();
      document.removeEventListener('visibilitychange', schedule);
      window.removeEventListener('pageshow', schedule);
      window.removeEventListener('pagehide', clear);
    };
  }, [delayMs]);

  return ready;
};
