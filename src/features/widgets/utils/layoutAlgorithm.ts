import { SIZE_RULES } from '../config/widgetLayoutConfig';
import type { WidgetLayout, WidgetPageId } from '../types/widget';

export type {
  TranslatorLanguageCode,
  WidgetCounts,
  WidgetLayout,
  WidgetPageId,
  WidgetSizeRule,
  WidgetType,
  WidgetViewport,
} from '../types/widget';
export { SIZE_RULES } from '../config/widgetLayoutConfig';

export function collides(a: WidgetLayout, b: WidgetLayout): boolean {
  if (a.id === b.id || (a.pageId ?? 1) !== (b.pageId ?? 1)) return false;
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

export function getCollisions(rect: WidgetLayout, excludeId: string, widgets: WidgetLayout[]): WidgetLayout[] {
  return widgets.filter((widget) => widget.id !== excludeId && collides(rect, widget));
}

export function clamp(widget: WidgetLayout, maxCols: number): WidgetLayout {
  const rule = SIZE_RULES[widget.type];
  widget.w = Math.max(rule.minW, Math.min(rule.maxW, maxCols, widget.w));
  widget.h = Math.max(rule.minH, Math.min(rule.maxH, widget.h));
  widget.x = Math.max(0, Math.min(maxCols - widget.w, widget.x));
  widget.y = Math.max(0, widget.y);
  return widget;
}

export function pushDown(mover: WidgetLayout, widgets: WidgetLayout[], maxCols: number, depth = 0): void {
  if (depth > 30) return;
  const hits = getCollisions(mover, mover.id, widgets);

  for (const hit of hits) {
    const candidates = [
      { x: mover.x + mover.w, y: hit.y },
      { x: mover.x - hit.w, y: hit.y },
      { x: hit.x, y: mover.y + mover.h },
    ];
    let moved = false;

    for (const candidate of candidates) {
      if (candidate.x < 0 || candidate.x + hit.w > maxCols || candidate.y < 0) continue;
      const test = { ...hit, x: candidate.x, y: candidate.y };
      const blocked = widgets.some((widget) => widget.id !== hit.id && widget.id !== mover.id && collides(test, widget));
      if (!blocked) {
        hit.x = candidate.x;
        hit.y = candidate.y;
        moved = true;
        break;
      }
    }

    if (!moved) {
      hit.y = widgets.reduce((max, widget) => (
        widget.id !== hit.id && (widget.pageId ?? 1) === (hit.pageId ?? 1)
          ? Math.max(max, widget.y + widget.h)
          : max
      ), 0);
    }

    pushDown(hit, widgets, maxCols, depth + 1);
  }
}

export function compact(widgets: WidgetLayout[]): void {
  const sorted = [...widgets].sort((a, b) => a.y - b.y || a.x - b.x);
  const placed: WidgetLayout[] = [];

  for (const widget of sorted) {
    let nextY = 0;
    while (nextY < widget.y) {
      if (!placed.some((placedWidget) => collides({ ...widget, y: nextY }, placedWidget))) {
        widget.y = nextY;
        break;
      }
      nextY += 1;
    }
    placed.push(widget);
  }
}

export function findFreeSlot(
  w: number,
  h: number,
  widgets: WidgetLayout[],
  maxCols: number,
  pageId: WidgetPageId = 1,
): { x: number; y: number } {
  for (let y = 0; y < 40; y += 1) {
    for (let x = 0; x <= maxCols - w; x += 1) {
      const rect: WidgetLayout = { id: '__new__', type: 'link', pageId, x, y, w, h };
      if (!widgets.some((widget) => collides(rect, widget))) return { x, y };
    }
  }
  return {
    x: 0,
    y: widgets.reduce((max, widget) => (
      (widget.pageId ?? 1) === pageId ? Math.max(max, widget.y + widget.h) : max
    ), 0),
  };
}
