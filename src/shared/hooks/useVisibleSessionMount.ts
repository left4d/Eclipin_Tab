import { useEffect, useState } from 'react';

const isDocumentVisible = () => (
  typeof document === 'undefined' || document.visibilityState !== 'hidden'
);

/**
 * Keep an expensive subtree mounted after it has been visited while the new-tab
 * document remains visible. Hiding the document drops the retained subtree so
 * memory-heavy iframes/decoders can be reclaimed aggressively. When the tab is
 * shown again only the currently active/nearby subtree remounts immediately;
 * other pages warm up again when the user visits them.
 */
export const useVisibleSessionMount = (isActive: boolean): boolean => {
  const [shouldMount, setShouldMount] = useState(() => isActive && isDocumentVisible());

  useEffect(() => {
    if (isActive && isDocumentVisible()) setShouldMount(true);
  }, [isActive]);

  useEffect(() => {
    const syncVisibility = () => {
      if (!isDocumentVisible()) {
        setShouldMount(false);
        return;
      }
      if (isActive) setShouldMount(true);
    };
    const handlePageHide = () => setShouldMount(false);

    document.addEventListener('visibilitychange', syncVisibility);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', syncVisibility);
    return () => {
      document.removeEventListener('visibilitychange', syncVisibility);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', syncVisibility);
    };
  }, [isActive]);

  return shouldMount;
};
