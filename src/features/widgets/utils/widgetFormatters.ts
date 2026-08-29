import type { DockItem } from '@/features/dock/types/dock';
import { makeFaviconRef } from '@/features/dock/utils/iconCache';
import type { BookmarkNode } from '@/features/dock/utils/bookmarks';
import { executeNavigationInput } from '@/shared/navigation';
export { parseGoogleTranslation } from '@/features/translation/services/translationProviders';
import { ANALOG_CLOCK_CENTER, TRANSLATOR_LANGUAGES } from '../config/widgetCatalog';
import type { TranslatorLanguageCode, WidgetLayout } from '../types/widget';

export const getLanguageLabel = (code: TranslatorLanguageCode) => (
  TRANSLATOR_LANGUAGES.find((language) => language.code === code)?.label ?? code
);

const LINK_BLACK = '#1C1C1E';
const LINK_WHITE = '#FFFFFF';

export const getThemeAwareLinkColor = (color: string | undefined, theme: string): string | undefined => {
  if (!color || theme !== 'dark') return color;
  const normalized = color.toUpperCase();
  if (normalized === LINK_BLACK) return LINK_WHITE;
  if (normalized === LINK_WHITE || normalized === '#FFF') return LINK_BLACK;
  return color;
};

/**
 * 与文字贴纸和绘图贴纸保持相同的黑白反转逻辑。
 * 浅色模式保留原始颜色；深色模式交换黑色和白色。
 */
export const getThemeAwareDrawingColor = (color: string, theme: string): string => {
  if (theme !== 'dark') return color;
  const normalized = color.toUpperCase();
  if (normalized === LINK_BLACK) return LINK_WHITE;
  if (normalized === LINK_WHITE || normalized === '#FFF') return LINK_BLACK;
  return color;
};

export const getAnalogHandEnd = (angleDegrees: number, length: number) => {
  const radians = (angleDegrees - 90) * Math.PI / 180;
  return {
    x: ANALOG_CLOCK_CENTER + Math.cos(radians) * length,
    y: ANALOG_CLOCK_CENTER + Math.sin(radians) * length,
  };
};

export const toLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseLocalDate = (value: string | undefined): Date | null => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getCountdownDays = (target: Date, current: Date): number => {
  const today = new Date(current.getFullYear(), current.getMonth(), current.getDate());
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.ceil((targetDay.getTime() - today.getTime()) / 86_400_000);
};

export const getMonthCells = (monthDate: Date): Array<{ day: number; date: Date; currentMonth: boolean }> => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const mondayIndex = (firstDay.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - mondayIndex);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return { day: date.getDate(), date, currentMonth: date.getMonth() === month };
  });
};

export const openExternalUrl = (url: string, openInNewTab: boolean) => {
  executeNavigationInput(url, { openInNewTab });
};

const getBookmarkIcon = (url: string): string | undefined => {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return undefined;
    return makeFaviconRef(parsed.hostname);
  } catch {
    return undefined;
  }
};

const getBookmarkName = (node: BookmarkNode): string => {
  if (node.title) return node.title;
  if (!node.url) return '未命名书签';
  try {
    return new URL(node.url).hostname;
  } catch {
    return '未命名书签';
  }
};

export const bookmarkNodesToDockItems = (
  nodes: BookmarkNode[],
  iconOverrides: WidgetLayout['bookmarkIcons'] = {},
): DockItem[] => nodes.flatMap((node) => {
  if (node.url) {
    const itemId = `bookmark-${node.id}`;
    const override = iconOverrides?.[itemId];
    return [{
      id: itemId,
      name: getBookmarkName(node),
      url: node.url,
      icon: override?.icon ?? getBookmarkIcon(node.url),
      iconSmall: override?.iconSmall,
      type: 'app' as const,
    }];
  }

  const items = bookmarkNodesToDockItems(node.children ?? [], iconOverrides);
  if (items.length === 0) return [];
  if (!node.title) return items;
  return [{
    id: `bookmark-folder-${node.id}`,
    name: node.title,
    type: 'folder' as const,
    items,
  }];
});

export const getWeatherIcon = (code: number, isDay: number) => {
  if ([0, 1].includes(code)) return isDay ? '☀️' : '🌙';
  if ([2, 3].includes(code)) return '☁️';
  if ([45, 48].includes(code)) return '🌫️';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '🌧️';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️';
  if ([95, 96, 99].includes(code)) return '⛈️';
  return isDay ? '🌤' : '🌙';
};

export const getWeatherText = (code: number) => {
  if ([0, 1].includes(code)) return '晴朗';
  if (code === 2) return '局部多云';
  if (code === 3) return '多云';
  if ([45, 48].includes(code)) return '有雾';
  if ([51, 53, 55, 56, 57].includes(code)) return '毛毛雨';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '降雨';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '降雪';
  if ([95, 96, 99].includes(code)) return '雷暴';
  return '实时天气';
};

export const getWindDirectionText = (degrees: number) => {
  const directions = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
  return directions[Math.round(degrees / 45) % directions.length];
};
