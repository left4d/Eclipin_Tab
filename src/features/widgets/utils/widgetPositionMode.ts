import { FREE_LAYOUT_OVERFLOW_RATIO } from '@/shared/utils/freeLayoutBounds';
import type { WidgetLayout, WidgetPageId } from '../types/widget';

export const getToggledWidgetPositionMode = (
  widget: WidgetLayout,
  activePage: WidgetPageId,
  secondPageScrollTop: number,
): Pick<WidgetLayout, 'positionMode' | 'pageId' | 'y'> => {
  if (widget.positionMode === 'viewport') {
    return {
      positionMode: 'page',
      pageId: activePage,
      y: Math.max(-widget.h * FREE_LAYOUT_OVERFLOW_RATIO, widget.y + (activePage === 1 ? secondPageScrollTop : 0)),
    };
  }

  return {
    positionMode: 'viewport',
    pageId: widget.pageId ?? 1,
    y: Math.max(-widget.h * FREE_LAYOUT_OVERFLOW_RATIO, widget.y - ((widget.pageId ?? 1) === 1 ? secondPageScrollTop : 0)),
  };
};
