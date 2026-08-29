import { normalizeInternalAnchorId } from '@/shared/utils/internalAnchor';
import type { WidgetLayout } from '../types/widget';
import { loadWidgets, type WidgetLayoutMode } from './widgetStorage';

export interface WidgetAnchorEntry {
  id: string;
  anchorId: string;
}

export const getStoredWidgetAnchorEntries = (mode: WidgetLayoutMode = 'vertical'): WidgetAnchorEntry[] => loadWidgets(mode)
  .map((widget) => ({ id: widget.id, anchorId: normalizeInternalAnchorId(widget.anchorId ?? '') }))
  .filter((entry) => Boolean(entry.anchorId));

export const findWidgetByAnchorId = (widgets: WidgetLayout[], anchorId: string): WidgetLayout | null => {
  const normalized = normalizeInternalAnchorId(anchorId);
  if (!normalized) return null;
  return widgets.find((widget) => normalizeInternalAnchorId(widget.anchorId ?? '') === normalized) ?? null;
};

export const findStoredWidgetByAnchorId = (anchorId: string, mode: WidgetLayoutMode = 'vertical'): WidgetLayout | null => findWidgetByAnchorId(loadWidgets(mode), anchorId);
