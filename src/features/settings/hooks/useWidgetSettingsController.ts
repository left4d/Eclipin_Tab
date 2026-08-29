import { useCallback, useEffect, useState } from 'react';
import { WIDGETS_CHANGED_EVENT } from '@/features/widgets/config/widgetLayoutConfig';
import {
  loadWidgets,
  requestAddWidget,
  requestClearWidgets,
  requestResetWidgets,
  type WidgetChangedDetail,
} from '@/features/widgets/services/widgetStorage';
import { getWidgetCounts } from '@/features/widgets/services/widgetLayoutService';
import type { WidgetLayout, WidgetPageId, WidgetType } from '@/features/widgets/types/widget';
import { useThemeData, type PageSlideDirection } from '@/features/theme/context/ThemeContext';
import { useLanguage } from '@/shared/context/LanguageContext';

export interface WidgetSettingsController {
  widgetTargetPage: WidgetPageId;
  setWidgetTargetPage: (pageId: WidgetPageId) => void;
  widgetCounts: { first: number; second: number };
  widgetLayouts: WidgetLayout[];
  widgetNotice: string;
  currentPage: WidgetPageId;
  pageSlideDirection: PageSlideDirection;
  widgetTargetCount: number;
  addWidget: (type: WidgetType, spaceId?: string) => void;
  clearWidgetPage: () => void;
  resetWidgetPage: () => void;
}

export const useWidgetSettingsController = (
  currentPage: WidgetPageId,
  isOpen: boolean,
): WidgetSettingsController => {
  const { pageSlideDirection } = useThemeData();
  const { language } = useLanguage();
  const [widgetTargetPage, setWidgetTargetPage] = useState<WidgetPageId>(currentPage);
  const [widgetLayouts, setWidgetLayouts] = useState<WidgetLayout[]>(() => loadWidgets(pageSlideDirection));
  const [widgetCounts, setWidgetCounts] = useState(() => getWidgetCounts(widgetLayouts));
  const [widgetNotice, setWidgetNotice] = useState('');

  const refresh = useCallback((items = loadWidgets(pageSlideDirection)) => {
    setWidgetLayouts(items);
    setWidgetCounts(getWidgetCounts(items));
  }, [pageSlideDirection]);

  useEffect(() => {
    if (isOpen) {
      setWidgetTargetPage(currentPage);
      refresh();
    }
  }, [currentPage, isOpen, refresh]);

  useEffect(() => {
    const handleWidgetsChanged = (event: Event) => {
      const detail = (event as CustomEvent<WidgetChangedDetail>).detail;
      if (detail?.widgets) {
        setWidgetLayouts(detail.widgets);
        setWidgetCounts({ first: detail.first, second: detail.second });
      } else {
        refresh();
      }
    };
    window.addEventListener(WIDGETS_CHANGED_EVENT, handleWidgetsChanged);
    return () => window.removeEventListener(WIDGETS_CHANGED_EVENT, handleWidgetsChanged);
  }, [refresh]);

  useEffect(() => {
    if (!widgetNotice) return;
    const timer = window.setTimeout(() => setWidgetNotice(''), 2200);
    return () => window.clearTimeout(timer);
  }, [widgetNotice]);

  const addWidget = (type: WidgetType, spaceId?: string) => {
    requestAddWidget({ type, spaceId, pageId: widgetTargetPage });
    setWidgetNotice(language === 'zh' ? `已添加到第 ${widgetTargetPage + 1} 页` : `Added to Page ${widgetTargetPage + 1}`);
  };

  const clearWidgetPage = () => {
    const pageName = language === 'zh' ? `第 ${widgetTargetPage + 1} 页` : `Page ${widgetTargetPage + 1}`;
    if (!window.confirm(language === 'zh' ? `确定清空${pageName}的全部小组件吗？` : `Clear all widgets from ${pageName}?`)) return;
    requestClearWidgets(widgetTargetPage);
    setWidgetNotice(language === 'zh' ? `${pageName}已清空` : `${pageName} cleared`);
  };

  const resetWidgetPage = () => {
    requestResetWidgets(widgetTargetPage);
    setWidgetNotice(language === 'zh' ? `第 ${widgetTargetPage + 1} 页已恢复为空白` : `Page ${widgetTargetPage + 1} reset to empty`);
  };

  const widgetTargetCount = widgetLayouts.filter((widget) => Math.max(0, Math.trunc(widget.pageId ?? 1)) === widgetTargetPage).length;

  return {
    widgetTargetPage,
    setWidgetTargetPage,
    widgetCounts,
    widgetLayouts,
    widgetNotice,
    addWidget,
    clearWidgetPage,
    resetWidgetPage,
    currentPage,
    pageSlideDirection,
    widgetTargetCount,
  };
};
