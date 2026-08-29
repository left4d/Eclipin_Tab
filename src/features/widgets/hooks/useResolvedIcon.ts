import { useEffect, useState } from 'react';
import {
  getCachedIconUrlSync,
  getCachedRemoteIconUrlSync,
  getDomainFromRef,
  isFaviconRef,
  isRemoteIconUrl,
  resolveIconUrl,
  resolveRemoteIconUrl,
} from '@/features/dock/utils/iconCache';

const placeholderIcon = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZyI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTYiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4yKSIvPjwvc3ZnPg==';

/** Resolves cached, favicon-reference and remote icons behind one stable hook API. */
export function useResolvedIcon(icon: string | undefined): string {
  const [resolved, setResolved] = useState<string>(() => {
    if (!icon) return placeholderIcon;
    if (isFaviconRef(icon)) return getCachedIconUrlSync(getDomainFromRef(icon)) || placeholderIcon;
    if (isRemoteIconUrl(icon)) return getCachedRemoteIconUrlSync(icon) || placeholderIcon;
    return icon;
  });

  useEffect(() => {
    if (!icon) {
      setResolved(placeholderIcon);
      return;
    }

    if (isFaviconRef(icon)) {
      const cached = getCachedIconUrlSync(getDomainFromRef(icon));
      if (cached) {
        setResolved(cached);
        return;
      }
      let cancelled = false;
      resolveIconUrl(getDomainFromRef(icon)).then((url) => {
        if (!cancelled) setResolved(url || placeholderIcon);
      });
      return () => { cancelled = true; };
    }

    if (isRemoteIconUrl(icon)) {
      const cached = getCachedRemoteIconUrlSync(icon);
      if (cached) {
        setResolved(cached);
        return;
      }
      let cancelled = false;
      resolveRemoteIconUrl(icon).then((url) => {
        if (!cancelled) setResolved(url || placeholderIcon);
      });
      return () => { cancelled = true; };
    }

    setResolved(icon);
  }, [icon]);

  return resolved;
}
