import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { clampFreeLayoutAxis, FREE_LAYOUT_OVERFLOW_RATIO } from '@/shared/utils/freeLayoutBounds';
import type { WidgetLayout, WidgetPageId, WidgetType } from '../types/widget';
import type { PageSlideDirection } from '@/features/theme/context/ThemeContext';
import {
  ADD_WIDGET_EVENT,
  CLEAR_WIDGETS_EVENT,
  RESET_WIDGETS_EVENT,
  SECOND_PAGE_BOTTOM_SPACE,
  SECOND_PAGE_EXTENSION_STEP,
  SECOND_PAGE_EXTENSION_THRESHOLD,
  WIDGET_MIN_SIZE,
} from '../config/widgetLayoutConfig';
import {
  clampWidgetToViewport,
  createInitialWidgets,
  createWidget,
  findAvailableWidgetPosition,
  getWidgetViewport,
  getWidgetViewportScale,
  WIDGET_REFERENCE_WIDTH,
} from '../services/widgetLayoutService';
import { loadWidgets, persistAndEmitWidgets, type WidgetLayoutMode } from '../services/widgetStorage';
import { RESTORE_WIDGET_EVENT, recycleWidget } from '../services/widgetRecycleBinService';
import { raiseWidgetAmongPriorityPeers } from '../utils/widgetStacking';

export const useWidgetPanelLayout = (
  activePage: WidgetPageId,
  pageSlideDirection: PageSlideDirection,
  onPageChange: (pageId: WidgetPageId) => void,
) => {
  const secondScrollRef = useRef<HTMLDivElement>(null);
  const viewportMetricsRef = useRef({
    innerWidth: window.innerWidth,
    outerWidth: window.outerWidth,
    devicePixelRatio: window.devicePixelRatio,
  });
  const showSecondBackToTopRef = useRef(false);
  const secondExtendFrameRef = useRef(0);
  const secondScrollVisualTimerRef = useRef<number | null>(null);
  const activeLayoutModeRef = useRef<WidgetLayoutMode>(pageSlideDirection);
  const [viewport, setViewport] = useState(getWidgetViewport);
  const [viewportScale, setViewportScale] = useState(getWidgetViewportScale);
  const [showSecondBackToTop, setShowSecondBackToTop] = useState(false);
  const [secondCanvasBaseHeight, setSecondCanvasBaseHeight] = useState(() => getWidgetViewport().h * 2);
  const [widgets, setWidgets] = useState<WidgetLayout[]>(() => loadWidgets(pageSlideDirection));
  const widgetsRef = useRef(widgets);

  const viewportFixedWidgets = useMemo(
    () => widgets.filter((widget) => widget.positionMode === 'viewport'),
    [widgets],
  );
  const firstPageWidgets = useMemo(
    () => widgets.filter((widget) => widget.positionMode !== 'viewport' && (widget.pageId ?? 1) === 0),
    [widgets],
  );
  const secondPageWidgets = useMemo(
    () => widgets.filter((widget) => widget.positionMode !== 'viewport' && (widget.pageId ?? 1) === 1),
    [widgets],
  );
  const secondContentHeight = useMemo(
    () => secondPageWidgets.reduce((max, widget) => Math.max(max, widget.y + widget.h + SECOND_PAGE_BOTTOM_SPACE), 0),
    [secondPageWidgets],
  );
  const secondCanvasHeight = useMemo(() => Math.max(
    secondCanvasBaseHeight,
    viewport.h * 2,
    secondContentHeight,
  ), [secondCanvasBaseHeight, secondContentHeight, viewport.h]);

  useEffect(() => {
    widgetsRef.current = widgets;
    persistAndEmitWidgets(widgets, activeLayoutModeRef.current);
  }, [widgets]);

  useEffect(() => {
    const flushPersistentState = () => persistAndEmitWidgets(widgets, activeLayoutModeRef.current);
    window.addEventListener('eclipin:flush-persistent-state', flushPersistentState);
    return () => window.removeEventListener('eclipin:flush-persistent-state', flushPersistentState);
  }, [widgets]);

  useEffect(() => {
    if (activeLayoutModeRef.current === pageSlideDirection) return;
    persistAndEmitWidgets(widgets, activeLayoutModeRef.current);
    activeLayoutModeRef.current = pageSlideDirection;
    setWidgets(loadWidgets(pageSlideDirection));
    onPageChange(0);
  }, [onPageChange, pageSlideDirection]);

  useEffect(() => {
    const handleViewportResize = () => {
      const previous = viewportMetricsRef.current;
      const outerWidth = window.outerWidth;
      const devicePixelRatio = window.devicePixelRatio;
      const outerWindowChanged = Math.abs(outerWidth - previous.outerWidth) > 2;
      const zoomChanged = Math.abs(devicePixelRatio - previous.devicePixelRatio) > 0.01;
      if (outerWindowChanged || zoomChanged) {
        viewportMetricsRef.current = { innerWidth: window.innerWidth, outerWidth, devicePixelRatio };
      }

      // Match Shelf behavior: sidebars may change innerWidth without changing
      // the physical browser window. Keep the logical layout stable in that
      // case; monitor changes/maximize/zoom update the scale.
      const nextScale = Math.max(0.1, viewportMetricsRef.current.innerWidth / WIDGET_REFERENCE_WIDTH);
      const nextViewport = { w: WIDGET_REFERENCE_WIDTH, h: Math.max(320, window.innerHeight / nextScale) };
      setViewport(nextViewport);
      setViewportScale((current) => Math.abs(current - nextScale) < 0.0001 ? current : nextScale);
      setSecondCanvasBaseHeight((current) => Math.max(current, nextViewport.h * 2));
    };
    window.addEventListener('resize', handleViewportResize);
    return () => window.removeEventListener('resize', handleViewportResize);
  }, []);

  useEffect(() => {
    if (secondContentHeight <= 0) return;
    setSecondCanvasBaseHeight((current) => Math.max(current, secondContentHeight));
  }, [secondContentHeight]);

  useEffect(() => () => {
    if (secondExtendFrameRef.current) cancelAnimationFrame(secondExtendFrameRef.current);
    if (secondScrollVisualTimerRef.current !== null) window.clearTimeout(secondScrollVisualTimerRef.current);
  }, []);

  const extendSecondCanvas = useCallback((logicalScrollTop: number) => {
    // Avoid clientHeight/scrollHeight reads in the scroll handler. The sticker
    // layer changes its position in the same event, so reading layout metrics
    // here can synchronously flush style/layout on every wheel frame. We already
    // know the logical viewport and canvas heights from React state.
    if (logicalScrollTop + viewport.h < secondCanvasHeight - SECOND_PAGE_EXTENSION_THRESHOLD || secondExtendFrameRef.current) return;
    secondExtendFrameRef.current = requestAnimationFrame(() => {
      secondExtendFrameRef.current = 0;
      setSecondCanvasBaseHeight((current) => current + Math.max(viewport.h, SECOND_PAGE_EXTENSION_STEP));
    });
  }, [secondCanvasHeight, viewport.h]);

  const handleSecondPageScroll = useCallback((target: HTMLDivElement) => {
    const scrollTop = target.scrollTop;
    // Backdrop filters on many large translucent widgets are expensive while
    // their sampled background changes every scroll frame. Mark only the live
    // scrolling window so CSS can use a cheaper visual path until it settles.
    if (target.dataset.scrolling !== 'true') target.dataset.scrolling = 'true';
    if (secondScrollVisualTimerRef.current !== null) window.clearTimeout(secondScrollVisualTimerRef.current);
    secondScrollVisualTimerRef.current = window.setTimeout(() => {
      secondScrollVisualTimerRef.current = null;
      delete target.dataset.scrolling;
    }, 120);
    const logicalScrollTop = scrollTop / viewportScale;
    // Shelf listens to the same event and expects physical scroll pixels. Keep
    // the public event physical while the widget layout uses logical units.
    window.dispatchEvent(new CustomEvent('eclipin:second-page-scroll', { detail: { scrollTop } }));
    if (pageSlideDirection === 'vertical') {
      extendSecondCanvas(logicalScrollTop);
    }
    // scrollTop is already available in this event. A dedicated RAF used to
    // run once for every scroll event just to update this one threshold, which
    // showed up as ~100 scripted-animation callbacks in the performance trace.
    // Only touch React when the threshold actually changes.
    const shouldShowBackToTop = scrollTop > 220;
    if (showSecondBackToTopRef.current !== shouldShowBackToTop) {
      showSecondBackToTopRef.current = shouldShowBackToTop;
      setShowSecondBackToTop(shouldShowBackToTop);
    }
  }, [extendSecondCanvas, pageSlideDirection, viewportScale]);

  useEffect(() => {
    const target = secondScrollRef.current;
    if (!target) return;
    const handleScroll = () => handleSecondPageScroll(target);
    // The high-frequency second-page scroll path does not need React's
    // SyntheticEvent layer. A passive native listener keeps the same behavior
    // while avoiding several React event-dispatch calls on every scroll tick.
    target.addEventListener('scroll', handleScroll, { passive: true });
    return () => target.removeEventListener('scroll', handleScroll);
  }, [handleSecondPageScroll]);

  useEffect(() => {
    const handleRestoreWidget = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: WidgetLayoutMode; widget?: WidgetLayout }>).detail;
      if (!detail?.widget || detail.mode !== activeLayoutModeRef.current) return;
      setWidgets((prev) => prev.some((widget) => widget.id === detail.widget!.id) ? prev : [...prev, detail.widget!]);
    };
    window.addEventListener(RESTORE_WIDGET_EVENT, handleRestoreWidget);
    return () => window.removeEventListener(RESTORE_WIDGET_EVENT, handleRestoreWidget);
  }, []);

  useEffect(() => {
    const handleAddWidget = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: WidgetType; spaceId?: string; pageId?: WidgetPageId }>).detail;
      const widgetType = detail?.type;
      if (!widgetType) return;
      const requestedPage = Number(detail.pageId);
      const pageId: WidgetPageId = Number.isFinite(requestedPage) ? Math.max(0, Math.trunc(requestedPage)) : activePage;

      setWidgets((prev) => {
        if (widgetType === 'space' && detail.spaceId && prev.some((widget) => widget.type === 'space' && widget.spaceId === detail.spaceId)) {
          return prev;
        }
        const visibleStartY = pageSlideDirection === 'vertical' && pageId === 1
          ? (secondScrollRef.current?.scrollTop ?? 0) / viewportScale
          : 0;
        const nextWidget = createWidget({
          type: widgetType,
          pageId,
          spaceId: detail.spaceId,
          widgets: prev,
          viewport,
          visibleStartY,
          fixedPage: pageSlideDirection === 'horizontal',
        });
        const boundedWidget = pageSlideDirection === 'horizontal'
          ? { ...nextWidget, y: clampFreeLayoutAxis(nextWidget.y, viewport.h, nextWidget.h) }
          : nextWidget;
        return [...prev, boundedWidget];
      });
      onPageChange(pageId);
    };

    const recycleWidgetsOnPage = (pageId: WidgetPageId) => {
      widgetsRef.current
        .filter((widget) => (widget.pageId ?? 1) === pageId)
        .forEach((widget) => recycleWidget(widget, activeLayoutModeRef.current));
    };

    const handleClearWidgets = (event: Event) => {
      const rawPage = Number((event as CustomEvent<{ pageId?: WidgetPageId }>).detail?.pageId);
      const pageId = Number.isFinite(rawPage) ? Math.max(0, Math.trunc(rawPage)) : activePage;
      recycleWidgetsOnPage(pageId);
      setWidgets((prev) => prev.filter((widget) => (widget.pageId ?? 1) !== pageId));
    };

    const handleResetWidgets = (event: Event) => {
      const rawPage = Number((event as CustomEvent<{ pageId?: WidgetPageId }>).detail?.pageId);
      const pageId = Number.isFinite(rawPage) ? Math.max(0, Math.trunc(rawPage)) : activePage;
      recycleWidgetsOnPage(pageId);
      setWidgets((prev) => {
        const otherPage = prev.filter((widget) => (widget.pageId ?? 1) !== pageId);
        if (pageId === 0 || (pageSlideDirection === 'horizontal' && pageId > 1)) return otherPage;
        return [...otherPage, ...createInitialWidgets(viewport)];
      });
      if (pageSlideDirection === 'vertical' && pageId === 1) secondScrollRef.current?.scrollTo({ top: 0 });
    };

    window.addEventListener(ADD_WIDGET_EVENT, handleAddWidget);
    window.addEventListener(CLEAR_WIDGETS_EVENT, handleClearWidgets);
    window.addEventListener(RESET_WIDGETS_EVENT, handleResetWidgets);
    return () => {
      window.removeEventListener(ADD_WIDGET_EVENT, handleAddWidget);
      window.removeEventListener(CLEAR_WIDGETS_EVENT, handleClearWidgets);
      window.removeEventListener(RESET_WIDGETS_EVENT, handleResetWidgets);
    };
  }, [activePage, onPageChange, pageSlideDirection, viewport, viewportScale]);

  const bringWidgetToFront = useCallback((id: string) => {
    setWidgets((prev) => raiseWidgetAmongPriorityPeers(prev, id));
  }, []);

  const moveWidget = useCallback((id: string, x: number, y: number) => {
    setWidgets((prev) => {
      const moved = prev.map((widget) => widget.id === id ? { ...widget, x, y } : widget);
      return raiseWidgetAmongPriorityPeers(moved, id);
    });
  }, []);

  const resizeWidget = useCallback((id: string, w: number, h: number, lockAspectRatioOverride?: boolean) => {
    setWidgets((prev) => prev.map((widget) => {
      if (widget.id !== id) return widget;
      const min = WIDGET_MIN_SIZE[widget.type];
      const pageId = widget.positionMode === 'viewport' ? 0 : (widget.pageId ?? 1);
      const visibleRatio = 1 - FREE_LAYOUT_OVERFLOW_RATIO;
      const maxW = Math.min(viewport.w, Math.max(min.w, (viewport.w - widget.x) / visibleRatio));
      const maxH = pageSlideDirection === 'horizontal' || pageId === 0
        ? Math.min(viewport.h, Math.max(min.h, (viewport.h - widget.y) / visibleRatio))
        : Number.POSITIVE_INFINITY;
      const lockAspectRatio = lockAspectRatioOverride ?? Boolean(widget.lockAspectRatio);
      if (lockAspectRatio) {
        const widthScale = w / Math.max(1, widget.w);
        const heightScale = h / Math.max(1, widget.h);
        const requestedScale = Math.abs(widthScale - 1) >= Math.abs(heightScale - 1)
          ? widthScale
          : heightScale;
        const minScale = Math.max(min.w / widget.w, min.h / widget.h);
        const maxScale = Math.min(maxW / widget.w, maxH / widget.h);
        const nextScale = Math.min(maxScale, Math.max(minScale, requestedScale));
        return { ...widget, lockAspectRatio, w: widget.w * nextScale, h: widget.h * nextScale };
      }
      return {
        ...widget,
        ...(lockAspectRatioOverride !== undefined ? { lockAspectRatio } : {}),
        w: Math.min(maxW, Math.max(min.w, w)),
        h: Math.min(maxH, Math.max(min.h, h)),
      };
    }));
  }, [pageSlideDirection, viewport]);

  const removeWidget = useCallback((id: string) => {
    setWidgets((prev) => prev.filter((widget) => widget.id !== id));
  }, []);

  const updateWidget = useCallback((id: string, updates: Partial<WidgetLayout>) => {
    setWidgets((prev) => prev.map((widget) => (widget.id === id ? { ...widget, ...updates } : widget)));
  }, []);

  const moveWidgetToOtherPage = useCallback((id: string) => {
    const current = widgets.find((widget) => widget.id === id);
    if (!current) return;
    const currentPage = Math.max(0, Math.trunc(current.pageId ?? 1));
    const nextPage: WidgetPageId = pageSlideDirection === 'horizontal' ? currentPage + 1 : (currentPage === 0 ? 1 : 0);
    const size = { w: current.w, h: current.h };
    const visibleStartY = pageSlideDirection === 'vertical' && nextPage === 1
      ? (secondScrollRef.current?.scrollTop ?? 0) / viewportScale
      : 0;

    setWidgets((prev) => {
      const position = findAvailableWidgetPosition(nextPage, size, prev.filter((widget) => widget.id !== id), viewport, visibleStartY);
      return prev.map((widget) => {
        if (widget.id !== id) return widget;
        const moved = clampWidgetToViewport({ ...widget, pageId: nextPage, ...position }, viewport);
        return pageSlideDirection === 'horizontal'
          ? { ...moved, y: clampFreeLayoutAxis(moved.y, viewport.h, moved.h) }
          : moved;
      });
    });
    onPageChange(nextPage);
  }, [onPageChange, pageSlideDirection, viewport, viewportScale, widgets]);

  return {
    bringWidgetToFront,
    firstPageWidgets,
    moveWidget,
    moveWidgetToOtherPage,
    removeWidget,
    resizeWidget,
    secondCanvasHeight,
    secondPageWidgets,
    secondScrollRef,
    setWidgets,
    showSecondBackToTop,
    updateWidget,
    viewport,
    viewportScale,
    viewportFixedWidgets,
    widgets,
  };
};
