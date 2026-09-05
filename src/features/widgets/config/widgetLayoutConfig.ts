import type { WidgetLayout, WidgetSizeRule, WidgetType } from '../types/widget';

export const WIDGET_STORAGE_KEY = 'eclipin_widgets_v1';
export const WIDGETS_CHANGED_EVENT = 'eclipin:widgets-changed';
export const ADD_WIDGET_EVENT = 'eclipin:add-widget';
export const CLEAR_WIDGETS_EVENT = 'eclipin:clear-widgets';
export const RESET_WIDGETS_EVENT = 'eclipin:reset-widgets';

export const PAGE_EDGE = 28;
export const SECOND_PAGE_BOTTOM_SPACE = 320;
export const SECOND_PAGE_EXTENSION_THRESHOLD = 760;
export const SECOND_PAGE_EXTENSION_STEP = 1440;

export const WIDGET_DISPLAY_NAMES: Record<WidgetType, string> = {
  clock: '时钟',
  analogClock: '圆形时钟',
  weather: '天气',
  translate: '翻译',
  link: '快捷链接',
  notes: '便签',
  todo: '计算器',
  pomodoro: '番茄钟',
  calendar: '月历',
  countdown: '倒数日',
  gtrend: '空白容器',
  colorPicker: '颜色选择器',
  embed: '网页嵌入',
  space: '空间网站',
  bookmarks: '书签',
  openTabs: '打开的标签页',
};

export const INITIAL_WIDGETS: readonly WidgetLayout[] = [];

export const WIDGET_MIN_SIZE: Record<WidgetType, { w: number; h: number }> = {
  clock: { w: 220, h: 140 },
  analogClock: { w: 180, h: 180 },
  weather: { w: 240, h: 168 },
  translate: { w: 300, h: 280 },
  link: { w: 76, h: 98 },
  notes: { w: 240, h: 180 },
  todo: { w: 220, h: 260 },
  pomodoro: { w: 210, h: 230 },
  calendar: { w: 280, h: 270 },
  countdown: { w: 230, h: 190 },
  gtrend: { w: 96, h: 72 },
  colorPicker: { w: 240, h: 96 },
  embed: { w: 240, h: 180 },
  space: { w: 260, h: 200 },
  bookmarks: { w: 260, h: 200 },
  openTabs: { w: 320, h: 260 },
};

export const DEFAULT_WIDGET_SIZE: Record<WidgetType, { w: number; h: number }> = {
  clock: { w: 300, h: 176 },
  analogClock: { w: 280, h: 280 },
  weather: { w: 280, h: 176 },
  translate: { w: 360, h: 320 },
  link: { w: 112, h: 138 },
  notes: { w: 360, h: 250 },
  todo: { w: 300, h: 380 },
  pomodoro: { w: 250, h: 250 },
  calendar: { w: 330, h: 310 },
  countdown: { w: 280, h: 220 },
  gtrend: { w: 340, h: 240 },
  colorPicker: { w: 320, h: 168 },
  embed: { w: 350, h: 230 },
  space: { w: 360, h: 280 },
  bookmarks: { w: 360, h: 280 },
  openTabs: { w: 430, h: 420 },
};

export const SIZE_RULES: Record<WidgetType, WidgetSizeRule> = {
  clock: { minW: 3, minH: 2, maxW: 6, maxH: 4, defW: 3, defH: 2 },
  analogClock: { minW: 2, minH: 2, maxW: 6, maxH: 6, defW: 3, defH: 3 },
  link: { minW: 1, minH: 1, maxW: 2, maxH: 2, defW: 1, defH: 1 },
  notes: { minW: 2, minH: 2, maxW: 6, maxH: 6, defW: 4, defH: 4 },
  todo: { minW: 3, minH: 4, maxW: 6, maxH: 8, defW: 4, defH: 6 },
  weather: { minW: 3, minH: 2, maxW: 6, maxH: 4, defW: 3, defH: 2 },
  translate: { minW: 3, minH: 3, maxW: 7, maxH: 6, defW: 4, defH: 4 },
  gtrend: { minW: 1, minH: 1, maxW: 6, maxH: 8, defW: 4, defH: 5 },
  colorPicker: { minW: 2, minH: 1, maxW: 6, maxH: 3, defW: 4, defH: 2 },
  pomodoro: { minW: 2, minH: 2, maxW: 5, maxH: 5, defW: 3, defH: 3 },
  calendar: { minW: 3, minH: 3, maxW: 6, maxH: 6, defW: 4, defH: 4 },
  countdown: { minW: 2, minH: 2, maxW: 5, maxH: 4, defW: 3, defH: 3 },
  embed: { minW: 3, minH: 3, maxW: 8, maxH: 8, defW: 5, defH: 5 },
  space: { minW: 3, minH: 2, maxW: 10, maxH: 8, defW: 5, defH: 4 },
  bookmarks: { minW: 3, minH: 2, maxW: 10, maxH: 8, defW: 5, defH: 4 },
  openTabs: { minW: 4, minH: 3, maxW: 10, maxH: 9, defW: 6, defH: 6 },
};
