import type { NavigationAction } from '@/shared/navigation';

export type NavigationBarDefaultIcon = 'home' | 'grid' | 'compass' | 'arrow' | 'bookmark' | 'star';
export type NavigationBarPosition = 'left' | 'right' | 'bottom';

export interface NavigationBarItem {
  id: string;
  label: string;
  action: NavigationAction;
  defaultIcon: NavigationBarDefaultIcon;
  customIconDataUrl?: string;
  customIconName?: string;
}

export interface NavigationBarConfig {
  version: 2;
  enabled: boolean;
  position: NavigationBarPosition;
  items: NavigationBarItem[];
}
