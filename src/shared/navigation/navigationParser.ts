import { normalizeInternalAnchorId } from '@/shared/utils/internalAnchor';
import { normalizeUrl } from '@/shared/utils/url';
import type { NavigationAction, NavigationPageCondition } from './navigationAction';

const PAGE_PATTERN = /^page\s*:\s*(\d+)(?:\s*@\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?))?$/i;
const TOGGLE_PATTERN = /^(?:toggle|切换)\s*:\s*(\d+)\s*[,，]\s*(\d+)$/i;
const CONDITIONAL_PAGE_PATTERN = /^page\s*:\s*(\d+)\s+(?:else|否则)\s+(?:page\s*:\s*)?(\d+)$/i;
const ADVANCED_CONDITION_PATTERN = /^(?:if|如果)\s*page\s*(?::\s*(\d+)|(==|=|!=|>=|<=|>|<)\s*(\d+))\s*(?:then|则|那么)\s*(.+?)\s*(?:else|否则)\s*(.+)$/i;
const PREVIOUS_PAGE_PATTERN = /^page\s*:\s*(?:prev|previous|上一页)$/i;
const NEXT_PAGE_PATTERN = /^page\s*:\s*(?:next|下一页)$/i;
const LAYOUT_PATTERN = /^layout\s*:\s*(vertical|horizontal|toggle)$/i;

const normalizePage = (value: number | string): number => Math.max(1, Math.trunc(Number(value) || 1));

const parsePageBranch = (value: string): NavigationAction | null => {
  const trimmed = value.trim();
  if (/^(?:page\s*:\s*)?(?:prev|previous|上一页)$/i.test(trimmed)) {
    return { type: 'relativePage', direction: 'previous' };
  }
  if (/^(?:page\s*:\s*)?(?:next|下一页)$/i.test(trimmed)) {
    return { type: 'relativePage', direction: 'next' };
  }
  const pageMatch = trimmed.match(/^(?:page\s*:\s*)?(\d+)$/i);
  return pageMatch ? { type: 'page', page: normalizePage(pageMatch[1]) } : null;
};

const parseCondition = (operator: string | undefined, page: number): NavigationPageCondition => {
  if (!operator || operator === '=' || operator === '==') return { type: 'pageEquals', page };
  return { type: 'pageCompare', operator: operator as '!=' | '>' | '>=' | '<' | '<=', page };
};

export const parseNavigationAction = (input: string | undefined | null): NavigationAction | null => {
  const trimmed = input?.trim() ?? '';
  if (!trimmed) return null;

  if (PREVIOUS_PAGE_PATTERN.test(trimmed)) return { type: 'relativePage', direction: 'previous' };
  if (NEXT_PAGE_PATTERN.test(trimmed)) return { type: 'relativePage', direction: 'next' };
  const layoutMatch = trimmed.match(LAYOUT_PATTERN);
  if (layoutMatch) return { type: 'layout', direction: layoutMatch[1].toLowerCase() as 'vertical' | 'horizontal' | 'toggle' };

  const toggle = trimmed.match(TOGGLE_PATTERN);
  if (toggle) {
    const page = normalizePage(toggle[1]);
    const fallback = normalizePage(toggle[2]);
    return {
      type: 'conditional',
      condition: { type: 'pageEquals', page },
      then: { type: 'page', page: fallback },
      else: { type: 'page', page },
    };
  }

  const advanced = trimmed.match(ADVANCED_CONDITION_PATTERN);
  if (advanced) {
    const page = normalizePage(advanced[1] ?? advanced[3]);
    const thenAction = parsePageBranch(advanced[4]);
    const elseAction = parsePageBranch(advanced[5]);
    if (!thenAction || !elseAction) return null;
    return {
      type: 'conditional',
      condition: parseCondition(advanced[1] ? '=' : advanced[2], page),
      then: thenAction,
      else: elseAction,
    };
  }
  if (/^(?:if|如果)\b/i.test(trimmed)) return null;

  const conditional = trimmed.match(CONDITIONAL_PAGE_PATTERN);
  if (conditional) {
    const page = normalizePage(conditional[1]);
    const fallback = normalizePage(conditional[2]);
    return {
      type: 'conditional',
      condition: { type: 'pageEquals', page },
      then: { type: 'page', page: fallback },
      else: { type: 'page', page },
    };
  }

  if (trimmed.startsWith('#') || /^anchor\s*:/i.test(trimmed)) {
    const rawAnchor = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed.replace(/^anchor\s*:/i, '');
    const anchorId = normalizeInternalAnchorId(rawAnchor);
    return anchorId ? { type: 'anchor', anchorId } : null;
  }

  const pageMatch = trimmed.match(PAGE_PATTERN);
  if (pageMatch) {
    const page = normalizePage(pageMatch[1]);
    if (pageMatch[2] !== undefined && pageMatch[3] !== undefined) {
      return { type: 'page', page, coordinate: { x: Number(pageMatch[2]), y: Number(pageMatch[3]) } };
    }
    return { type: 'page', page };
  }

  const url = normalizeUrl(trimmed);
  return url ? { type: 'url', url } : null;
};

const serializeCondition = (condition: NavigationPageCondition): string => (
  condition.type === 'pageEquals'
    ? `page=${condition.page}`
    : `page${condition.operator}${condition.page}`
);

const serializeBranch = (action: NavigationAction): string => {
  if (action.type === 'relativePage') return action.direction === 'previous' ? 'prev' : 'next';
  if (action.type === 'page' && !action.coordinate) return String(action.page);
  return serializeNavigationAction(action);
};

export const serializeNavigationAction = (action: NavigationAction | undefined | null): string => {
  if (!action) return '';
  if (action.type === 'url') return action.url;
  if (action.type === 'anchor') return `#${action.anchorId}`;
  if (action.type === 'relativePage') return action.direction === 'previous' ? 'page:prev' : 'page:next';
  if (action.type === 'layout') return `layout:${action.direction}`;
  if (action.type === 'page') {
    if (!action.coordinate) return `page:${normalizePage(action.page)}`;
    return `page:${normalizePage(action.page)}@${Math.round(action.coordinate.x)},${Math.round(action.coordinate.y)}`;
  }
  return `if ${serializeCondition(action.condition)} then ${serializeBranch(action.then)} else ${serializeBranch(action.else)}`;
};

export const normalizeNavigationInput = (input: string): string => {
  const action = parseNavigationAction(input);
  return action ? serializeNavigationAction(action) : '';
};
