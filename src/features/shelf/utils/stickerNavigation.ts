import type { Sticker } from '@/shared/types';
import type { NavigationAction, NavigationPageCondition } from '@/shared/navigation';
import {
  isNavigationAction,
  normalizeNavigationInput,
  parseNavigationAction,
  serializeNavigationAction,
} from '@/shared/navigation';
import { normalizeInternalAnchorId } from '@/shared/utils/internalAnchor';
import { findStoredWidgetByAnchorId } from '@/features/widgets/services/widgetAnchorService';

export type StickerLinkKind = 'external' | 'anchor' | 'page' | 'conditional' | 'condition' | 'coordinate' | 'previous' | 'next' | 'layout';
export type PageConditionOperator = '=' | '!=' | '>' | '>=' | '<' | '<=';
export type StickerPageBranch =
  | { kind: 'page'; screen: number }
  | { kind: 'previous' }
  | { kind: 'next' };

export type ParsedStickerLink =
  | { kind: 'external'; value: string; url: string }
  | { kind: 'anchor'; value: string; anchorId: string }
  | { kind: 'page'; value: string; screen: number }
  | { kind: 'conditional'; value: string; screen: number; elseScreen: number }
  | { kind: 'condition'; value: string; operator: PageConditionOperator; conditionScreen: number; whenTrue: StickerPageBranch; whenFalse: StickerPageBranch }
  | { kind: 'coordinate'; value: string; screen: number; x: number; y: number }
  | { kind: 'previous'; value: 'page:prev' }
  | { kind: 'next'; value: 'page:next' }
  | { kind: 'layout'; value: string; direction: 'vertical' | 'horizontal' | 'toggle' };

export interface StickerNavigationRequest {
  pageIndex: number;
  scrollTop: number;
  focusStickerId?: string;
  focusWidgetId?: string;
  coordinate?: { x: number; y: number };
  sourceTarget: string;
}

export const normalizeStickerAnchorId = normalizeInternalAnchorId;

export const buildStickerPageTarget = (screen: number, coordinate?: { x: number; y: number }): string => (
  serializeNavigationAction({ type: 'page', page: Math.max(1, Math.trunc(screen || 1)), coordinate })
);

export const normalizeStickerLinkTarget = (value: string): string => {
  const trimmed = value.trim();
  const toggle = trimmed.match(/^(?:toggle|切换)\s*:\s*(\d+)\s*[,，]\s*(\d+)$/i);
  if (toggle) return `page:${Math.max(1, Number.parseInt(toggle[1], 10))} else ${Math.max(1, Number.parseInt(toggle[2], 10))}`;
  const compact = trimmed.match(/^page\s*:\s*(\d+)\s+(?:else|否则)\s+(?:page\s*:\s*)?(\d+)$/i);
  if (compact) return `page:${Math.max(1, Number.parseInt(compact[1], 10))} else ${Math.max(1, Number.parseInt(compact[2], 10))}`;
  return normalizeNavigationInput(trimmed);
};

const toPageBranch = (action: NavigationAction): StickerPageBranch | null => {
  if (action.type === 'relativePage') return { kind: action.direction };
  if (action.type === 'page' && !action.coordinate) return { kind: 'page', screen: action.page };
  return null;
};

const getConditionOperator = (condition: NavigationPageCondition): PageConditionOperator => (
  condition.type === 'pageEquals' ? '=' : condition.operator
);

export const parseStickerLinkTarget = (value: string | undefined): ParsedStickerLink | null => {
  const action = parseNavigationAction(value);
  if (!action) return null;
  const normalized = serializeNavigationAction(action);

  if (action.type === 'url') return { kind: 'external', value: normalized, url: action.url };
  if (action.type === 'anchor') return { kind: 'anchor', value: normalized, anchorId: action.anchorId };
  if (action.type === 'layout') return { kind: 'layout', value: normalized, direction: action.direction };
  if (action.type === 'relativePage') {
    return action.direction === 'previous'
      ? { kind: 'previous', value: 'page:prev' }
      : { kind: 'next', value: 'page:next' };
  }
  if (action.type === 'page') {
    return action.coordinate
      ? { kind: 'coordinate', value: normalized, screen: action.page, x: action.coordinate.x, y: action.coordinate.y }
      : { kind: 'page', value: normalized, screen: action.page };
  }

  const whenTrue = toPageBranch(action.then);
  const whenFalse = toPageBranch(action.else);
  if (!whenTrue || !whenFalse) return null;

  // 兼容旧的 page:N else M / toggle:N,M 编辑模式。
  if (
    action.condition.type === 'pageEquals'
    && action.then.type === 'page'
    && !action.then.coordinate
    && action.else.type === 'page'
    && !action.else.coordinate
    && action.else.page === action.condition.page
  ) {
    return {
      kind: 'conditional',
      value: normalized,
      screen: action.condition.page,
      elseScreen: action.then.page,
    };
  }

  return {
    kind: 'condition',
    value: normalized,
    operator: getConditionOperator(action.condition),
    conditionScreen: action.condition.page,
    whenTrue,
    whenFalse,
  };
};

const getStickerPageIndex = (sticker: Sticker): number => {
  const parsed = Number.parseInt((sticker.pageId ?? 'page-0').replace('page-', ''), 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const matchesPageCondition = (currentScreen: number, condition: NavigationPageCondition): boolean => {
  if (condition.type === 'pageEquals') return currentScreen === condition.page;
  if (condition.operator === '!=') return currentScreen !== condition.page;
  if (condition.operator === '>') return currentScreen > condition.page;
  if (condition.operator === '>=') return currentScreen >= condition.page;
  if (condition.operator === '<') return currentScreen < condition.page;
  return currentScreen <= condition.page;
};

export const resolveStickerNavigationAction = (
  action: NavigationAction,
  stickers: Sticker[],
  viewport: { height: number; scale: number; currentPageIndex?: number; currentScrollTop?: number; layoutMode?: 'vertical' | 'horizontal' },
): StickerNavigationRequest | null => {
  if (action.type === 'url' || action.type === 'layout') return null;
  const sourceTarget = serializeNavigationAction(action);

  if (action.type === 'conditional') {
    const horizontal = viewport.layoutMode === 'horizontal';
    const currentScreen = horizontal
      ? Math.max(1, Math.trunc(viewport.currentPageIndex ?? 0) + 1)
      : Math.max(1, (viewport.currentPageIndex ?? 0) === 0
        ? 1
        : 2 + Math.floor(Math.max(0, viewport.currentScrollTop ?? 0) / Math.max(1, viewport.height)));
    const branch = matchesPageCondition(currentScreen, action.condition) ? action.then : action.else;
    const resolved = resolveStickerNavigationAction(branch, stickers, viewport);
    return resolved ? { ...resolved, sourceTarget } : null;
  }

  if (action.type === 'relativePage') {
    const direction = action.direction === 'next' ? 1 : -1;
    const horizontal = viewport.layoutMode === 'horizontal';
    if (horizontal) {
      const currentPage = Math.max(0, Math.trunc(viewport.currentPageIndex ?? 0));
      return {
        pageIndex: Math.max(0, currentPage + direction),
        scrollTop: 0,
        sourceTarget,
      };
    }

    const currentPage = Math.max(0, Math.trunc(viewport.currentPageIndex ?? 0));
    const height = Math.max(1, viewport.height);
    const currentScreen = currentPage === 0
      ? 0
      : 1 + Math.floor(Math.max(0, viewport.currentScrollTop ?? 0) / height);
    const targetScreen = Math.max(0, currentScreen + direction);
    return {
      pageIndex: targetScreen === 0 ? 0 : 1,
      scrollTop: targetScreen <= 1 ? 0 : (targetScreen - 1) * height,
      sourceTarget,
    };
  }

  if (action.type === 'anchor') {
    const targetSticker = stickers.find(sticker => normalizeStickerAnchorId(sticker.anchorId ?? '') === action.anchorId);
    if (targetSticker) {
      const pageIndex = targetSticker.positionMode === 'viewport'
        ? (viewport.currentPageIndex ?? getStickerPageIndex(targetSticker))
        : getStickerPageIndex(targetSticker);
      const scrollTop = viewport.layoutMode === 'horizontal' ? 0 : targetSticker.positionMode === 'viewport'
        ? (pageIndex === 1 ? Math.max(0, viewport.currentScrollTop ?? 0) : 0)
        : pageIndex === 1
          ? Math.max(0, targetSticker.y * viewport.scale - viewport.height * 0.38)
          : 0;
      return { pageIndex, scrollTop, focusStickerId: targetSticker.id, sourceTarget };
    }

    const targetWidget = findStoredWidgetByAnchorId(action.anchorId, viewport.layoutMode ?? 'vertical');
    if (!targetWidget) return null;
    const pageIndex = targetWidget.positionMode === 'viewport'
      ? (viewport.currentPageIndex ?? (targetWidget.pageId ?? 1))
      : (targetWidget.pageId ?? 1);
    const scrollTop = viewport.layoutMode === 'horizontal' ? 0 : targetWidget.positionMode === 'viewport'
      ? (pageIndex === 1 ? Math.max(0, viewport.currentScrollTop ?? 0) : 0)
      : pageIndex === 1
        ? Math.max(0, targetWidget.y * viewport.scale - viewport.height * 0.38)
        : 0;
    return { pageIndex, scrollTop, focusWidgetId: targetWidget.id, sourceTarget };
  }

  const targetScreen = action.page;
  const horizontal = viewport.layoutMode === 'horizontal';
  const pageIndex = horizontal ? Math.max(0, targetScreen - 1) : (targetScreen <= 1 ? 0 : 1);
  const scrollTop = !horizontal && pageIndex === 1 ? Math.max(0, (targetScreen - 2) * viewport.height) : 0;
  return {
    pageIndex,
    scrollTop,
    coordinate: action.coordinate,
    sourceTarget,
  };
};

/** @deprecated 输入边界兼容函数；新代码应持有 NavigationAction。 */
export const resolveStickerNavigationRequest = (
  target: string,
  stickers: Sticker[],
  viewport: { height: number; scale: number; currentPageIndex?: number; currentScrollTop?: number; layoutMode?: 'vertical' | 'horizontal' },
): StickerNavigationRequest | null => {
  const action = parseNavigationAction(target);
  return action ? resolveStickerNavigationAction(action, stickers, viewport) : null;
};

export const getStickerAction = (sticker: Sticker): NavigationAction | null => (
  isNavigationAction(sticker.action) ? sticker.action : null
);

/** UI 预览/旧接口使用；运行时不要再以字符串作为执行数据。 */
export const getStickerLinkTarget = (sticker: Sticker): string => (
  serializeNavigationAction(getStickerAction(sticker))
);
