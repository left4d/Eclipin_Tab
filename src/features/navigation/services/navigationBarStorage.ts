import { isNavigationAction, parseNavigationAction } from '@/shared/navigation';
import type { NavigationBarConfig, NavigationBarDefaultIcon, NavigationBarItem, NavigationBarPosition } from '../types/navigationBar';

export const NAVIGATION_BAR_STORAGE_KEY = 'Eclipin_navigationBar';
export const NAVIGATION_BAR_CHANGED_EVENT = 'eclipin:navigation-bar-changed';

const DEFAULT_ITEMS: NavigationBarItem[] = [
  {
    id: 'nav-home',
    label: '首页',
    action: { type: 'page', page: 1 },
    defaultIcon: 'home',
  },
  {
    id: 'nav-widgets',
    label: '组件页',
    action: { type: 'page', page: 2 },
    defaultIcon: 'grid',
  },
];


export const getNavigationBarItemLabel = (item: NavigationBarItem, language: 'en' | 'zh'): string => {
  if (language !== 'en') return item.label;
  if (item.id === 'nav-home' && item.label === '首页') return 'Home';
  if (item.id === 'nav-widgets' && item.label === '组件页') return 'Widgets';
  return item.label;
};

export const createDefaultNavigationBarConfig = (): NavigationBarConfig => ({
  version: 2,
  enabled: true,
  position: 'left',
  items: DEFAULT_ITEMS.map((item) => ({ ...item, action: { ...item.action } })),
});

const ICONS = new Set<NavigationBarDefaultIcon>(['home', 'grid', 'compass', 'arrow', 'bookmark', 'star']);
const POSITIONS = new Set<NavigationBarPosition>(['left', 'right', 'bottom']);

const normalizeItem = (value: unknown, index: number): NavigationBarItem | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<NavigationBarItem> & { action?: unknown; target?: unknown; url?: unknown };
  let action = isNavigationAction(raw.action) ? raw.action : null;
  if (!action && typeof raw.target === 'string') action = parseNavigationAction(raw.target);
  if (!action && typeof raw.url === 'string') action = parseNavigationAction(raw.url);
  if (!action) return null;

  const defaultIcon = ICONS.has(raw.defaultIcon as NavigationBarDefaultIcon)
    ? raw.defaultIcon as NavigationBarDefaultIcon
    : index === 0 ? 'home' : index === 1 ? 'grid' : 'compass';

  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `nav-${Date.now()}-${index}`,
    label: typeof raw.label === 'string' && raw.label.trim() ? raw.label.trim() : `导航 ${index + 1}`,
    action,
    defaultIcon,
    customIconDataUrl: typeof raw.customIconDataUrl === 'string' && raw.customIconDataUrl.startsWith('data:image/svg+xml')
      ? raw.customIconDataUrl
      : undefined,
    customIconName: typeof raw.customIconName === 'string' && raw.customIconName.trim() ? raw.customIconName.trim() : undefined,
  };
};

export const normalizeNavigationBarConfig = (value: unknown): NavigationBarConfig => {
  if (!value || typeof value !== 'object') return createDefaultNavigationBarConfig();
  const raw = value as Partial<NavigationBarConfig>;
  const items = Array.isArray(raw.items)
    ? raw.items.map(normalizeItem).filter((item): item is NavigationBarItem => Boolean(item)).slice(0, 16)
    : [];
  const position = raw.position;
  return {
    version: 2,
    enabled: raw.enabled !== false,
    position: position && POSITIONS.has(position) ? position : 'left',
    items: items.length > 0 ? items : createDefaultNavigationBarConfig().items,
  };
};

export const loadNavigationBarConfig = (): NavigationBarConfig => {
  try {
    const raw = localStorage.getItem(NAVIGATION_BAR_STORAGE_KEY);
    return raw ? normalizeNavigationBarConfig(JSON.parse(raw)) : createDefaultNavigationBarConfig();
  } catch {
    return createDefaultNavigationBarConfig();
  }
};

export const saveNavigationBarConfig = (config: NavigationBarConfig): void => {
  const normalized = normalizeNavigationBarConfig(config);
  try {
    localStorage.setItem(NAVIGATION_BAR_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Keep the UI usable even when localStorage is unavailable.
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<NavigationBarConfig>(NAVIGATION_BAR_CHANGED_EVENT, { detail: normalized }));
  }
};

export const replaceNavigationBarConfig = (value: unknown): NavigationBarConfig => {
  const normalized = normalizeNavigationBarConfig(value);
  saveNavigationBarConfig(normalized);
  return normalized;
};
