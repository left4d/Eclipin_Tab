import type { WidgetLayout } from '../types/widget';

const isSameStackGroup = (a: WidgetLayout, b: WidgetLayout): boolean => (
  (a.priority ?? 0) === (b.priority ?? 0)
  && (a.pageId ?? 1) === (b.pageId ?? 1)
  && (a.positionMode ?? 'page') === (b.positionMode ?? 'page')
);

/**
 * CSS z-index uses priority bands. Within the same band the DOM order is the
 * local stacking order, so move an activated widget after its peers and keep
 * that order stable after dragging finishes.
 */
export const raiseWidgetAmongPriorityPeers = (
  widgets: readonly WidgetLayout[],
  id: string,
): WidgetLayout[] => {
  const index = widgets.findIndex((widget) => widget.id === id);
  if (index < 0) return widgets as WidgetLayout[];
  const current = widgets[index];
  const hasPeerAbove = widgets.slice(index + 1).some((widget) => isSameStackGroup(current, widget));
  if (!hasPeerAbove) return widgets as WidgetLayout[];
  return [...widgets.slice(0, index), ...widgets.slice(index + 1), current];
};
