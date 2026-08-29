import { useEffect, useRef } from 'react';
import type { PageScrollMode, PageSlideDirection } from '@/features/theme/context/ThemeContext';
import type { WidgetPageId } from '@/features/widgets/utils/layoutAlgorithm';
import { getPagedScrollTarget } from '../utils/pageScroll';

interface UsePageWheelNavigationOptions {
  pageIndex: WidgetPageId;
  scrollMode: PageScrollMode;
  pageSlideDirection?: PageSlideDirection;
  onPageChange: (pageId: WidgetPageId) => void;
}

const WHEEL_TRIGGER = 42;
const ACCUMULATOR_RESET_MS = 180;
const PAGED_SCROLL_LOCK_MS = 520;

const normalizeWheelAxis = (event: WheelEvent, axis: 'x' | 'y') => {
  const rawDelta = axis === 'x' ? event.deltaX : event.deltaY;
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return rawDelta * 16;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return rawDelta * (axis === 'x' ? window.innerWidth : window.innerHeight);
  }
  return rawDelta;
};

const canScrollElement = (element: HTMLElement, deltaY: number) => {
  if (deltaY > 0) return element.scrollTop + element.clientHeight < element.scrollHeight - 2;
  return element.scrollTop > 2;
};

export const usePageWheelNavigation = ({ pageIndex, scrollMode, pageSlideDirection = 'vertical', onPageChange }: UsePageWheelNavigationOptions) => {
  const accumulatorRef = useRef(0);
  const continuousDeltaRef = useRef(0);
  const continuousFrameRef = useRef(0);
  const pagedScrollLockedUntilRef = useRef(0);

  useEffect(() => {
    let resetAccumulatorTimer = 0;

    const resetWheelState = () => {
      accumulatorRef.current = 0;
      continuousDeltaRef.current = 0;
    };

    const accumulatePageWheel = (deltaY: number) => {
      window.clearTimeout(resetAccumulatorTimer);
      accumulatorRef.current += deltaY;
      resetAccumulatorTimer = window.setTimeout(() => {
        accumulatorRef.current = 0;
      }, ACCUMULATOR_RESET_MS);
      return accumulatorRef.current;
    };

    const handleWheel = (event: WheelEvent) => {
      const deltaY = normalizeWheelAxis(event, 'y');
      const deltaX = normalizeWheelAxis(event, 'x');
      if (Math.abs(deltaY) < 2 && Math.abs(deltaX) < 2) return;

      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('[data-page-scroll-lock="true"], [data-modal="true"], [role="dialog"]')) {
        resetWheelState();
        return;
      }

      const nestedScroller = target?.closest<HTMLElement>('[data-widget-scrollable="true"]') ?? null;

      // 左右模式下每一页固定一屏，不存在页面级纵向滚动。触控板明确的横向
      // 手势优先用于翻页；普通纵向滚轮在可滚动组件上仍交给组件自身处理。
      if (pageSlideDirection === 'horizontal') {
        const horizontalIntent = Math.abs(deltaX) >= 2 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15;
        if (!horizontalIntent && nestedScroller && canScrollElement(nestedScroller, deltaY)) {
          accumulatorRef.current = 0;
          return;
        }
        const pageDelta = horizontalIntent ? deltaX : deltaY;
        if (Math.abs(pageDelta) < 2) return;
        event.preventDefault();
        if (performance.now() < pagedScrollLockedUntilRef.current) return;
        const accumulated = accumulatePageWheel(pageDelta);
        if (Math.abs(accumulated) <= WHEEL_TRIGGER) return;
        accumulatorRef.current = 0;
        const nextPage = Math.max(0, pageIndex + (accumulated > 0 ? 1 : -1));
        // 第一页已经是左边界时不要进入翻页锁，否则反向滚动会短暂无响应。
        if (nextPage === pageIndex) return;
        pagedScrollLockedUntilRef.current = performance.now() + PAGED_SCROLL_LOCK_MS;
        onPageChange(nextPage);
        return;
      }

      if (nestedScroller && canScrollElement(nestedScroller, deltaY)) {
        accumulatorRef.current = 0;
        return;
      }

      if (Math.abs(deltaY) < 2) return;

      if (pageIndex === 0) {
        if (deltaY < 0) {
          accumulatorRef.current = 0;
          return;
        }
        event.preventDefault();
        if (accumulatePageWheel(deltaY) > WHEEL_TRIGGER) {
          accumulatorRef.current = 0;
          onPageChange(1);
        }
        return;
      }

      const secondPageScroller = document.querySelector<HTMLElement>('[data-widget-scroll-page="1"]');
      if (!secondPageScroller) return;

      if (deltaY < 0 && secondPageScroller.scrollTop <= 2) {
        event.preventDefault();
        if (accumulatePageWheel(deltaY) < -WHEEL_TRIGGER) {
          accumulatorRef.current = 0;
          onPageChange(0);
        }
        return;
      }

      event.preventDefault();

      if (scrollMode === 'paged') {
        if (performance.now() < pagedScrollLockedUntilRef.current) return;
        const accumulated = accumulatePageWheel(deltaY);
        if (Math.abs(accumulated) <= WHEEL_TRIGGER) return;

        accumulatorRef.current = 0;
        const direction = accumulated > 0 ? 1 : -1;
        const nextTop = getPagedScrollTarget({
          scrollTop: secondPageScroller.scrollTop,
          clientHeight: secondPageScroller.clientHeight,
          scrollHeight: secondPageScroller.scrollHeight,
        }, direction);
        if (Math.abs(nextTop - secondPageScroller.scrollTop) < 2) return;

        pagedScrollLockedUntilRef.current = performance.now() + PAGED_SCROLL_LOCK_MS;
        secondPageScroller.scrollTo({ top: nextTop, behavior: 'smooth' });
        return;
      }

      accumulatorRef.current = 0;
      continuousDeltaRef.current += deltaY;
      if (!continuousFrameRef.current) {
        continuousFrameRef.current = requestAnimationFrame(() => {
          continuousFrameRef.current = 0;
          secondPageScroller.scrollTop += continuousDeltaRef.current;
          continuousDeltaRef.current = 0;
        });
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.clearTimeout(resetAccumulatorTimer);
      if (continuousFrameRef.current) cancelAnimationFrame(continuousFrameRef.current);
    };
  }, [onPageChange, pageIndex, pageSlideDirection, scrollMode]);
};
