import { navigateToUrl, type NavigateOptions } from '@/shared/utils/url';
import type { NavigationAction } from './navigationAction';
import { parseNavigationAction } from './navigationParser';

export const NAVIGATION_ACTION_EVENT = 'eclipin:navigation-action';

export interface NavigationActionEventDetail {
  action: NavigationAction;
}

export const executeNavigationAction = (action: NavigationAction, options: NavigateOptions = {}): boolean => {
  if (action.type === 'url') return navigateToUrl(action.url, options);
  if (typeof window === 'undefined') return false;
  window.dispatchEvent(new CustomEvent<NavigationActionEventDetail>(NAVIGATION_ACTION_EVENT, {
    detail: { action },
  }));
  return true;
};

export const executeNavigationInput = (input: string, options: NavigateOptions = {}): boolean => {
  const action = parseNavigationAction(input);
  return action ? executeNavigationAction(action, options) : false;
};
