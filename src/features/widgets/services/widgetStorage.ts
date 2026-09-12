import {
  ADD_WIDGET_EVENT,
  CLEAR_WIDGETS_EVENT,
  RESET_WIDGETS_EVENT,
  WIDGET_MIN_SIZE,
  WIDGET_STORAGE_KEY,
  WIDGETS_CHANGED_EVENT,
} from '../config/widgetLayoutConfig';
import { clampFreeLayoutAxis } from '@/shared/utils/freeLayoutBounds';
import { isNavigationAction } from '@/shared/navigation';
import { createInitialWidgets, getWidgetCounts, getWidgetViewport, migrateWidgetToFreeLayout, normalizeStoredWidget } from './widgetLayoutService';
import type { WidgetLayout, WidgetPageId, WidgetType } from '../types/widget';

export type WidgetLayoutMode = 'vertical' | 'horizontal';
export const HORIZONTAL_WIDGET_STORAGE_KEY = `${WIDGET_STORAGE_KEY}_horizontal`;

export interface WidgetChangedDetail {
  first: number;
  second: number;
  widgets: WidgetLayout[];
}

export interface AddWidgetDetail {
  type: WidgetType;
  spaceId?: string;
  pageId?: WidgetPageId;
}

const widgetMemoryCache: Partial<Record<WidgetLayoutMode, WidgetLayout[]>> = {};
let storageListenerAttached = false;

export const getWidgetStorageKey = (mode: WidgetLayoutMode): string => (
  mode === 'horizontal' ? HORIZONTAL_WIDGET_STORAGE_KEY : WIDGET_STORAGE_KEY
);

const ensureStorageInvalidationListener = () => {
  if (storageListenerAttached || typeof window === 'undefined') return;
  storageListenerAttached = true;
  window.addEventListener('storage', (event) => {
    if (event.key === WIDGET_STORAGE_KEY) widgetMemoryCache.vertical = undefined;
    if (event.key === HORIZONTAL_WIDGET_STORAGE_KEY) widgetMemoryCache.horizontal = undefined;
  });
};

const getStorage = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};


const needsStructuredWidgetMigration = (value: unknown): boolean => (
  Array.isArray(value) && value.some((raw) => {
    if (!raw || typeof raw !== 'object') return false;
    const widget = raw as Partial<WidgetLayout>;
    if (widget.type === 'gtrend' && widget.priority === undefined) return true;
    if (widget.type !== 'link') return false;
    if (!isNavigationAction(widget.action)) {
      return typeof widget.url === 'string' && widget.url.trim().length > 0;
    }
    const expectedUrl = widget.action.type === 'url' ? widget.action.url : undefined;
    return widget.url !== expectedUrl;
  })
);

const normalizeWidgets = (value: unknown): WidgetLayout[] => {
  if (!Array.isArray(value)) return createInitialWidgets();
  const knownWidgetTypes = new Set(Object.keys(WIDGET_MIN_SIZE));
  return value
    .filter((widget): widget is WidgetLayout => Boolean(widget && typeof widget === 'object' && knownWidgetTypes.has((widget as WidgetLayout).type)))
    .map(migrateWidgetToFreeLayout)
    .map(normalizeStoredWidget);
};

const convertVerticalToHorizontal = (widgets: WidgetLayout[]): WidgetLayout[] => {
  const viewport = getWidgetViewport();
  return widgets.map((widget) => {
    const w = Math.min(widget.w, viewport.w);
    const h = Math.min(widget.h, viewport.h);
    if (widget.positionMode === 'viewport') {
      return {
        ...widget,
        w,
        h,
        x: clampFreeLayoutAxis(widget.x, viewport.w, w),
        y: clampFreeLayoutAxis(widget.y, viewport.h, h),
      };
    }
    const sourcePage = Math.max(0, Math.trunc(widget.pageId ?? 1));
    if (sourcePage === 0) {
      return {
        ...widget,
        pageId: 0,
        w,
        h,
        x: clampFreeLayoutAxis(widget.x, viewport.w, w),
        y: clampFreeLayoutAxis(widget.y, viewport.h, h),
      };
    }
    const pageOffset = widget.y < 0 ? 0 : Math.floor(widget.y / Math.max(1, viewport.h));
    const pageId = Math.max(1, sourcePage + pageOffset);
    const localY = widget.y - pageOffset * viewport.h;
    return {
      ...widget,
      pageId,
      w,
      h,
      x: clampFreeLayoutAxis(widget.x, viewport.w, w),
      y: clampFreeLayoutAxis(localY, viewport.h, h),
    };
  });
};

export const hasStoredWidgets = (mode: WidgetLayoutMode = 'vertical'): boolean => (
  getStorage()?.getItem(getWidgetStorageKey(mode)) !== null
);

export const loadWidgets = (mode: WidgetLayoutMode = 'vertical'): WidgetLayout[] => {
  try {
    ensureStorageInvalidationListener();
    const cached = widgetMemoryCache[mode];
    if (cached) return cached;
    const storage = getStorage();
    const key = getWidgetStorageKey(mode);
    const saved = storage?.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      const widgets = normalizeWidgets(parsed);
      if (needsStructuredWidgetMigration(parsed)) {
        persistWidgets(widgets, mode);
      } else {
        widgetMemoryCache[mode] = widgets;
      }
      return widgets;
    }

    if (mode === 'horizontal') {
      const verticalRaw = storage?.getItem(WIDGET_STORAGE_KEY);
      const source = verticalRaw ? normalizeWidgets(JSON.parse(verticalRaw)) : createInitialWidgets();
      const migrated = convertVerticalToHorizontal(source);
      persistWidgets(migrated, 'horizontal');
      return migrated;
    }

    return createInitialWidgets();
  } catch {
    return mode === 'horizontal' ? convertVerticalToHorizontal(createInitialWidgets()) : createInitialWidgets();
  }
};

export const persistWidgets = (widgets: WidgetLayout[], mode: WidgetLayoutMode = 'vertical'): void => {
  try {
    const raw = JSON.stringify(widgets);
    getStorage()?.setItem(getWidgetStorageKey(mode), raw);
    widgetMemoryCache[mode] = widgets;
  } catch {
    // 存储不可用时保持内存布局，不让 UI 崩溃。
  }
};

export const emitWidgetsChanged = (widgets: WidgetLayout[]): void => {
  if (typeof window === 'undefined') return;
  const detail: WidgetChangedDetail = { ...getWidgetCounts(widgets), widgets };
  window.dispatchEvent(new CustomEvent<WidgetChangedDetail>(WIDGETS_CHANGED_EVENT, { detail }));
};

export const persistAndEmitWidgets = (widgets: WidgetLayout[], mode: WidgetLayoutMode = 'vertical'): void => {
  persistWidgets(widgets, mode);
  emitWidgetsChanged(widgets);
};

export const requestAddWidget = (detail: AddWidgetDetail): void => {
  window.dispatchEvent(new CustomEvent<AddWidgetDetail>(ADD_WIDGET_EVENT, { detail }));
};

export const requestClearWidgets = (pageId: WidgetPageId): void => {
  window.dispatchEvent(new CustomEvent(CLEAR_WIDGETS_EVENT, { detail: { pageId } }));
};

export const requestResetWidgets = (pageId: WidgetPageId): void => {
  window.dispatchEvent(new CustomEvent(RESET_WIDGETS_EVENT, { detail: { pageId } }));
};

export const clearWidgetMemoryCaches = (): void => {
  widgetMemoryCache.vertical = undefined;
  widgetMemoryCache.horizontal = undefined;
};
