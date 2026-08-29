import type { PropsWithChildren } from 'react';
import { useVisibleSessionMount } from '@/shared/hooks/useVisibleSessionMount';

type WidgetPageRetentionProps = PropsWithChildren<{ active: boolean }>;

/**
 * A visited widget page stays warm for the current visible new-tab session.
 * Hiding the document unmounts it immediately so embedded pages and other
 * expensive widget state do not remain resident while the user browses away.
 */
export const WidgetPageRetention = ({ active, children }: WidgetPageRetentionProps) => {
  const shouldMount = useVisibleSessionMount(active);
  return shouldMount ? <>{children}</> : null;
};
