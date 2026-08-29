import type { WidgetLayout, WidgetPageId } from '../types/widget';

/**
 * 横向分页从第 3 页开始才需要空页导航提示；第 1/2 页保持界面干净。
 * 相对屏幕固定组件在任何横向页都可见，因此也应视为“当前页有组件”。
 */
export const hasVisibleWidgetOnHorizontalPage = (
  widgets: readonly WidgetLayout[],
  activePage: WidgetPageId,
): boolean => widgets.some((widget) => (
  widget.positionMode === 'viewport'
  || Math.max(0, Math.trunc(widget.pageId ?? 1)) === activePage
));

export const shouldShowHorizontalEmptyPageHud = (
  widgets: readonly WidgetLayout[],
  activePage: WidgetPageId,
): boolean => activePage >= 2 && !hasVisibleWidgetOnHorizontalPage(widgets, activePage);
