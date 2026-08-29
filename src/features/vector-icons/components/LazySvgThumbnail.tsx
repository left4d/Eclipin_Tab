import { useEffect, useRef, useState } from 'react';
import { getVectorIcon } from '../services/vectorIconStore';
import { observeVectorThumbnail } from '../services/vectorThumbnailVisibility';

interface LazySvgThumbnailProps {
  iconId: string;
  className?: string;
}

export const LazySvgThumbnail = ({ iconId, className }: LazySvgThumbnailProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let requestVersion = 0;

    const stopObserving = observeVectorThumbnail(host, (visible) => {
      requestVersion += 1;
      const version = requestVersion;
      if (!visible) {
        setSvg(null);
        return;
      }
      void getVectorIcon(iconId).then(record => {
        if (!cancelled && version === requestVersion) setSvg(record?.svg ?? null);
      });
    });

    return () => {
      cancelled = true;
      requestVersion += 1;
      stopObserving();
    };
  }, [iconId]);

  return (
    <div ref={hostRef} className={className} aria-hidden="true">
      {svg ? <div dangerouslySetInnerHTML={{ __html: svg }} /> : <span />}
    </div>
  );
};
