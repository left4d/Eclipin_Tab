export type NavigationPageCondition =
  | { type: 'pageEquals'; page: number }
  | { type: 'pageCompare'; operator: '!=' | '>' | '>=' | '<' | '<='; page: number };

export type NavigationAction =
  | { type: 'url'; url: string }
  | { type: 'anchor'; anchorId: string }
  | { type: 'page'; page: number; coordinate?: { x: number; y: number } }
  | { type: 'relativePage'; direction: 'previous' | 'next' }
  | { type: 'layout'; direction: 'vertical' | 'horizontal' | 'toggle' }
  | {
      type: 'conditional';
      condition: NavigationPageCondition;
      then: NavigationAction;
      else: NavigationAction;
    };

export const isNavigationAction = (value: unknown): value is NavigationAction => {
  if (!value || typeof value !== 'object') return false;
  const action = value as Partial<NavigationAction>;
  if (action.type === 'url') return typeof action.url === 'string';
  if (action.type === 'anchor') return typeof action.anchorId === 'string';
  if (action.type === 'page') return Number.isFinite(action.page);
  if (action.type === 'relativePage') return action.direction === 'previous' || action.direction === 'next';
  if (action.type === 'layout') return action.direction === 'vertical' || action.direction === 'horizontal' || action.direction === 'toggle';
  if (action.type !== 'conditional') return false;
  const conditional = action as Extract<NavigationAction, { type: 'conditional' }>;
  return isNavigationCondition(conditional.condition)
    && isNavigationAction(conditional.then)
    && isNavigationAction(conditional.else);
};

export const isNavigationCondition = (value: unknown): value is NavigationPageCondition => {
  if (!value || typeof value !== 'object') return false;
  const condition = value as Partial<NavigationPageCondition>;
  if (!Number.isFinite(condition.page)) return false;
  if (condition.type === 'pageEquals') return true;
  return condition.type === 'pageCompare'
    && ['!=', '>', '>=', '<', '<='].includes(String(condition.operator));
};
