import { createId } from '@/shared/utils/id';
import { clampFreeLayoutAxis, FREE_LAYOUT_OVERFLOW_RATIO } from '@/shared/utils/freeLayoutBounds';
import { isNavigationAction, parseNavigationAction } from '@/shared/navigation';
import {
  DEFAULT_WIDGET_SIZE,
  INITIAL_WIDGETS,
  PAGE_EDGE,
  WIDGET_MIN_SIZE,
} from '../config/widgetLayoutConfig';
import type { WidgetCounts, WidgetLayout, WidgetPageId, WidgetType, WidgetViewport } from '../types/widget';

export const normalizePriority = (value: number): number => Math.max(-999, Math.min(999, Math.trunc(value)));

/** Widget positions and sizes live in a fixed logical canvas, matching Shelf stickers. */
export const WIDGET_REFERENCE_WIDTH = 1920;

export const getWidgetViewportScale = (): number => (
  Math.max(0.1, window.innerWidth / WIDGET_REFERENCE_WIDTH)
);

export const getWidgetViewport = (): WidgetViewport => {
  const scale = getWidgetViewportScale();
  return {
    w: WIDGET_REFERENCE_WIDTH,
    h: Math.max(320, window.innerHeight / scale),
  };
};

export const migrateWidgetToFreeLayout = (widget: WidgetLayout): WidgetLayout => {
  const migrated = { ...widget, pageId: widget.pageId ?? 1 };
  if (migrated.w <= 12 && migrated.h <= 12 && migrated.x <= 12 && migrated.y <= 20) {
    return {
      ...migrated,
      x: migrated.x * 96 + 64,
      y: migrated.y * 96 + 70,
      w: migrated.w * 78 + Math.max(0, migrated.w - 1) * 18,
      h: migrated.h * 78 + Math.max(0, migrated.h - 1) * 18,
    };
  }
  if (migrated.type === 'link' && migrated.w === 164 && migrated.h === 164) {
    return { ...migrated, w: 112, h: 138 };
  }
  return migrated;
};

export const clampWidgetToViewport = (widget: WidgetLayout, viewport = getWidgetViewport()): WidgetLayout => {
  const pageId = widget.pageId ?? 1;
  const min = WIDGET_MIN_SIZE[widget.type];
  const w = Math.min(Math.max(min.w, widget.w), viewport.w);
  const h = pageId === 0
    ? Math.min(Math.max(min.h, widget.h), viewport.h)
    : Math.max(min.h, widget.h);
  const x = clampFreeLayoutAxis(widget.x, viewport.w, w);
  const y = pageId === 0
    ? clampFreeLayoutAxis(widget.y, viewport.h, h)
    : Math.max(-h * FREE_LAYOUT_OVERFLOW_RATIO, widget.y);
  return { ...widget, pageId, x, y, w, h };
};

/**
 * 持久化读取时只做数据合法化，不根据当前窗口宽度裁切坐标。
 * 浏览器侧边栏会临时缩小窗口，不能因此永久改写布局。
 */
export const normalizeStoredWidget = (widget: WidgetLayout): WidgetLayout => {
  const pageId = widget.pageId ?? 1;
  const min = WIDGET_MIN_SIZE[widget.type];
  const rawWidth = Number.isFinite(widget.w) ? widget.w : min.w;
  const rawHeight = Number.isFinite(widget.h) ? widget.h : min.h;
  const w = Math.max(min.w, rawWidth);
  const h = Math.max(min.h, rawHeight);
  const rawX = Number.isFinite(widget.x) ? widget.x : 0;
  const rawY = Number.isFinite(widget.y) ? widget.y : 0;
  const priority = widget.priority ?? (widget.type === 'gtrend' ? -1 : undefined);
  const action = widget.type === 'link'
    ? (isNavigationAction(widget.action) ? widget.action : parseNavigationAction(widget.url ?? '') ?? undefined)
    : widget.action;
  const url = action?.type === 'url' ? action.url : (action ? undefined : widget.url);

  return {
    ...widget,
    pageId,
    priority,
    action,
    url,
    x: Math.max(-w * FREE_LAYOUT_OVERFLOW_RATIO, rawX),
    y: Math.max(-h * FREE_LAYOUT_OVERFLOW_RATIO, rawY),
    w,
    h,
  };
};

const overlaps = (candidate: { x: number; y: number; w: number; h: number }, widget: WidgetLayout): boolean => (
  !(candidate.x + candidate.w + 16 <= widget.x
    || widget.x + widget.w + 16 <= candidate.x
    || candidate.y + candidate.h + 16 <= widget.y
    || widget.y + widget.h + 16 <= candidate.y)
);

const overlapsReservedUi = (candidate: { x: number; y: number; w: number; h: number }): boolean => {
  if (typeof document === 'undefined') return false;
  const scale = getWidgetViewportScale();
  return Array.from(document.querySelectorAll<HTMLElement>('[data-ui-zone]')).some((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    const left = rect.left / scale;
    const right = rect.right / scale;
    const top = rect.top / scale;
    const bottom = rect.bottom / scale;
    const margin = 14 / scale;
    return !(
      candidate.x + candidate.w + margin <= left
      || right + margin <= candidate.x
      || candidate.y + candidate.h + margin <= top
      || bottom + margin <= candidate.y
    );
  });
};

export const findAvailableWidgetPosition = (
  pageId: WidgetPageId,
  size: { w: number; h: number },
  widgets: WidgetLayout[],
  viewport: WidgetViewport,
  visibleStartY = 0,
  fixedPage = false,
): { x: number; y: number } => {
  const samePage = widgets.filter((widget) => (widget.pageId ?? 1) === pageId);
  const maxX = Math.max(0, viewport.w - size.w - PAGE_EDGE);
  const startY = pageId === 0
    ? Math.min(150, Math.max(PAGE_EDGE, viewport.h - size.h - PAGE_EDGE))
    : Math.max(PAGE_EDGE, fixedPage ? PAGE_EDGE : visibleStartY + PAGE_EDGE);
  const maxY = pageId === 0 || fixedPage
    ? Math.max(PAGE_EDGE, viewport.h - size.h - PAGE_EDGE)
    : startY + viewport.h * 2;

  for (let y = startY; y <= maxY; y += 34) {
    for (let x = PAGE_EDGE; x <= maxX; x += 34) {
      const candidate = { x, y, w: size.w, h: size.h };
      const hitsWidget = samePage.some((widget) => overlaps(candidate, widget));
      const hitsUi = pageId === 0 && overlapsReservedUi(candidate);
      if (!hitsWidget && !hitsUi) return { x, y };
    }
  }

  if (pageId === 0 || fixedPage) {
    const index = samePage.length;
    return {
      x: Math.max(0, Math.min(PAGE_EDGE + (index % 4) * 38, viewport.w - size.w)),
      y: Math.max(0, Math.min(112 + (index % 5) * 42, viewport.h - size.h)),
    };
  }

  return {
    x: PAGE_EDGE,
    y: samePage.reduce((max, widget) => Math.max(max, widget.y + widget.h), startY) + 28,
  };
};

export const createSpaceWidgets = (
  spaces: { id: string }[],
  currentWidgets: WidgetLayout[],
  viewport: WidgetViewport,
  fixedPage = false,
): WidgetLayout[] => {
  const existingSpaceIds = new Set(
    currentWidgets
      .filter((widget) => widget.type === 'space' && widget.spaceId)
      .map((widget) => widget.spaceId),
  );

  const additions: WidgetLayout[] = [];
  spaces.filter((space) => !existingSpaceIds.has(space.id)).forEach((space) => {
    const size = DEFAULT_WIDGET_SIZE.space;
    const position = findAvailableWidgetPosition(1, size, [...currentWidgets, ...additions], viewport, fixedPage ? 0 : 40, fixedPage);
    additions.push({
      id: `space-${space.id}`,
      type: 'space',
      pageId: 1,
      spaceId: space.id,
      ...position,
      ...size,
    });
  });
  return additions;
};

export const getWidgetCounts = (widgets: WidgetLayout[]): WidgetCounts => ({
  first: widgets.filter((widget) => (widget.pageId ?? 1) === 0).length,
  second: widgets.filter((widget) => (widget.pageId ?? 1) === 1).length,
});

export const createInitialWidgets = (viewport?: WidgetViewport): WidgetLayout[] => INITIAL_WIDGETS.map((widget) => (
  viewport ? clampWidgetToViewport({ ...widget }, viewport) : normalizeStoredWidget({ ...widget })
));

export const createWidget = ({
  type,
  pageId,
  spaceId,
  widgets,
  viewport,
  visibleStartY = 0,
  fixedPage = false,
}: {
  type: WidgetType;
  pageId: WidgetPageId;
  spaceId?: string;
  widgets: WidgetLayout[];
  viewport: WidgetViewport;
  visibleStartY?: number;
  fixedPage?: boolean;
}): WidgetLayout => {
  const size = DEFAULT_WIDGET_SIZE[type];
  const position = findAvailableWidgetPosition(pageId, size, widgets, viewport, visibleStartY, fixedPage);
  const nextWidget: WidgetLayout = {
    id: type === 'space' && spaceId ? `space-${spaceId}` : `${type}-${createId()}`,
    type,
    pageId,
    spaceId: type === 'space' ? spaceId : undefined,
    priority: type === 'gtrend' ? -1 : undefined,
    name: type === 'link' ? 'GitHub' : undefined,
    action: type === 'link' ? { type: 'url', url: 'https://github.com/' } : undefined,
    url: type === 'link' ? 'https://github.com/' : undefined,
    translateProvider: type === 'translate' ? 'google' : undefined,
    translateSourceLanguage: type === 'translate' ? 'auto' : undefined,
    translateTargetLanguage: type === 'translate' ? 'zh-CN' : undefined,
    weatherLocationMode: type === 'weather' ? 'current' : undefined,
    ...position,
    ...size,
  };
  const clamped = clampWidgetToViewport(nextWidget, viewport);
  return fixedPage && pageId !== 0
    ? { ...clamped, h: Math.min(clamped.h, viewport.h), y: clampFreeLayoutAxis(clamped.y, viewport.h, Math.min(clamped.h, viewport.h)) }
    : clamped;
};
