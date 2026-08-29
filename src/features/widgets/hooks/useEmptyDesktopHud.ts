import { useCallback, useEffect, useRef, useState } from 'react';
import { useZenShelf } from '@/features/shelf/context/ZenShelfContext';
import type { PageSlideDirection } from '@/features/theme/context/ThemeContext';
import type { WidgetLayout, WidgetPageId } from '../types/widget';

interface EmptyDesktopHudOptions {
  activePage: WidgetPageId;
  viewportHeight: number;
  viewportWidth: number;
  widgets: WidgetLayout[];
  pageSlideDirection: PageSlideDirection;
}

const EMPTY_DESKTOP_CHECK_DELAY = 140;

export function useEmptyDesktopHud({ activePage, viewportHeight, viewportWidth, widgets, pageSlideDirection }: EmptyDesktopHudOptions) {
  const { stickers } = useZenShelf();
  const [currentDesktopScreen, setCurrentDesktopScreen] = useState(2);
  const currentDesktopScreenRef = useRef(2);
  const [hasVisibleDesktopContent, setHasVisibleDesktopContent] = useState(true);
  const checkTimerRef = useRef<number | null>(null);

  const checkVisibleDesktopContent = useCallback(() => {
    if (pageSlideDirection !== 'vertical' || activePage !== 1 || currentDesktopScreen < 3) {
      setHasVisibleDesktopContent(true);
      return;
    }

    const candidates = document.querySelectorAll<HTMLElement>('[data-widget-type], [data-sticker-id]');
    const hasVisible = Array.from(candidates).some((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width <= 1 || rect.height <= 1) return false;
      return rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
    });
    setHasVisibleDesktopContent((current) => current === hasVisible ? current : hasVisible);
  }, [activePage, currentDesktopScreen, pageSlideDirection]);

  const scheduleVisibleDesktopCheck = useCallback((delay = EMPTY_DESKTOP_CHECK_DELAY) => {
    if (checkTimerRef.current !== null) window.clearTimeout(checkTimerRef.current);
    checkTimerRef.current = window.setTimeout(() => {
      checkTimerRef.current = null;
      checkVisibleDesktopContent();
    }, delay);
  }, [checkVisibleDesktopContent]);

  useEffect(() => {
    if (pageSlideDirection !== 'horizontal') return;
    // Horizontal mode has no vertically scrolling desktop. Avoid carrying a
    // stale screen index over from the vertical layout.
    currentDesktopScreenRef.current = 2;
    setCurrentDesktopScreen(2);
    setHasVisibleDesktopContent(true);
  }, [pageSlideDirection]);

  useEffect(() => {
    const handleDesktopScroll = (event: Event) => {
      if (pageSlideDirection !== 'vertical') return;
      const detail = (event as CustomEvent<{ scrollTop?: number }>).detail;
      const scrollTop = detail?.scrollTop ?? 0;
      const nextScreen = Math.floor(scrollTop / Math.max(1, viewportHeight)) + 2;
      // A long scroll used to set exact scrollTop into React state on every
      // scroll event, re-rendering WidgetPanel and all widgets each frame.
      // The HUD only needs the coarse screen number.
      if (currentDesktopScreenRef.current !== nextScreen) {
        currentDesktopScreenRef.current = nextScreen;
        setCurrentDesktopScreen(nextScreen);
      }
      // Visibility is HUD-only information. Check after scrolling settles
      // rather than forcing getBoundingClientRect() for every widget per frame.
      scheduleVisibleDesktopCheck();
    };
    window.addEventListener('eclipin:second-page-scroll', handleDesktopScroll);
    return () => window.removeEventListener('eclipin:second-page-scroll', handleDesktopScroll);
  }, [pageSlideDirection, scheduleVisibleDesktopCheck, viewportHeight]);

  useEffect(() => {
    scheduleVisibleDesktopCheck(0);
  }, [activePage, currentDesktopScreen, pageSlideDirection, scheduleVisibleDesktopCheck, stickers, viewportHeight, viewportWidth, widgets]);

  useEffect(() => () => {
    if (checkTimerRef.current !== null) window.clearTimeout(checkTimerRef.current);
  }, []);

  return {
    currentDesktopScreen,
    showEmptyDesktopHud: pageSlideDirection === 'vertical' && activePage === 1 && currentDesktopScreen >= 3 && !hasVisibleDesktopContent,
  };
}
