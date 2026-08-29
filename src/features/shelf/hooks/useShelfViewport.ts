import { useEffect, useRef, useState } from 'react';

export const SHELF_REFERENCE_WIDTH = 1920;
const SCROLL_SETTLE_DELAY = 140;

export const useShelfViewport = (pageIndex: number) => {
  const viewportMetricsRef = useRef({
    innerWidth: window.innerWidth,
    outerWidth: window.outerWidth,
    devicePixelRatio: window.devicePixelRatio,
  });
  const resizeFrameRef = useRef<number | null>(null);
  const scrollSettleTimerRef = useRef<number | null>(null);
  const pendingScrollYRef = useRef(0);
  const committedScrollYRef = useRef(0);
  const previousPageIndexRef = useRef(pageIndex);
  const [viewportScale, setViewportScale] = useState(() => window.innerWidth / SHELF_REFERENCE_WIDTH);
  const [viewportHeight, setViewportHeight] = useState(() => window.innerHeight);
  const [pageTransitionDirection, setPageTransitionDirection] = useState<'up' | 'down' | null>(null);
  const [secondPageScrollY, setSecondPageScrollY] = useState(0);

  useEffect(() => {
    const applyResize = () => {
      resizeFrameRef.current = null;
      setViewportHeight((current) => current === window.innerHeight ? current : window.innerHeight);
      const previous = viewportMetricsRef.current;
      const nextOuterWidth = window.outerWidth;
      const nextDevicePixelRatio = window.devicePixelRatio;
      const outerWindowChanged = Math.abs(nextOuterWidth - previous.outerWidth) > 2;
      const zoomChanged = Math.abs(nextDevicePixelRatio - previous.devicePixelRatio) > 0.01;

      if (outerWindowChanged || zoomChanged) {
        viewportMetricsRef.current = {
          innerWidth: window.innerWidth,
          outerWidth: nextOuterWidth,
          devicePixelRatio: nextDevicePixelRatio,
        };
        setViewportScale(window.innerWidth / SHELF_REFERENCE_WIDTH);
      }
    };

    const handleResize = () => {
      if (resizeFrameRef.current !== null) cancelAnimationFrame(resizeFrameRef.current);
      resizeFrameRef.current = requestAnimationFrame(applyResize);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeFrameRef.current !== null) cancelAnimationFrame(resizeFrameRef.current);
    };
  }, []);

  useEffect(() => {
    const previousPageIndex = previousPageIndexRef.current;
    if (previousPageIndex !== pageIndex) {
      setPageTransitionDirection(pageIndex > previousPageIndex ? 'up' : 'down');
      const timer = window.setTimeout(() => setPageTransitionDirection(null), 760);
      previousPageIndexRef.current = pageIndex;
      return () => window.clearTimeout(timer);
    }
    previousPageIndexRef.current = pageIndex;
  }, [pageIndex]);

  useEffect(() => {
    const commitSecondPageScroll = (scrollTop: number) => {
      committedScrollYRef.current = scrollTop;
      setSecondPageScrollY((current) => current === scrollTop ? current : scrollTop);
    };
    const scheduleSecondPageScroll = (scrollTop: number) => {
      pendingScrollYRef.current = scrollTop;
      // Sticker movement itself is applied directly to the shared DOM layer in
      // ZenShelf. React only needs a coarse position for visibility culling and
      // editor/import bookkeeping, so avoid a full Shelf render every frame.
      // The sticker DOM layer follows scroll directly. React only advances the
      // warm/culling window every ~1.5 screens; a 3-screen overscan guarantees
      // the next batch is mounted well before it can become visible.
      const commitDistance = Math.max(720, window.innerHeight * 1.5);
      if (Math.abs(scrollTop - committedScrollYRef.current) >= commitDistance) {
        commitSecondPageScroll(scrollTop);
      }
      if (scrollSettleTimerRef.current !== null) window.clearTimeout(scrollSettleTimerRef.current);
      scrollSettleTimerRef.current = window.setTimeout(() => {
        scrollSettleTimerRef.current = null;
        commitSecondPageScroll(pendingScrollYRef.current);
      }, SCROLL_SETTLE_DELAY);
    };
    const updateSecondPageScroll = () => {
      const scroller = document.querySelector<HTMLElement>('[data-widget-scroll-page="1"]');
      const scrollTop = scroller?.scrollTop ?? 0;
      pendingScrollYRef.current = scrollTop;
      commitSecondPageScroll(scrollTop);
    };
    const handleSecondPageScroll = (event: Event) => {
      const detail = (event as CustomEvent<{ scrollTop?: number }>).detail;
      scheduleSecondPageScroll(detail?.scrollTop ?? 0);
    };

    updateSecondPageScroll();
    window.addEventListener('eclipin:second-page-scroll', handleSecondPageScroll);
    return () => {
      window.removeEventListener('eclipin:second-page-scroll', handleSecondPageScroll);
      if (scrollSettleTimerRef.current !== null) window.clearTimeout(scrollSettleTimerRef.current);
      scrollSettleTimerRef.current = null;
    };
  }, []);

  return {
    viewportScale,
    viewportHeight,
    stableViewportWidth: viewportMetricsRef.current.innerWidth,
    currentPageScrollY: pageIndex === 1 ? secondPageScrollY : 0,
    pageTransitionDirection,
  };
};
