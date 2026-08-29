import type { RefObject } from 'react';
import type { DockItem } from '@/features/dock/types/dock';
import type { DockItemDropPlacement } from '@/features/spaces/utils/dockItemTree';
import type { Space } from '@/features/spaces/types/space';
import type { WidgetLayout } from '../../types/widget';

export interface SortableWidgetProps {
  widget: WidgetLayout;
  isSelected?: boolean;
  spaces: Space[];
  canvasWidth: number;
  canvasHeight: number;
  /** Physical CSS pixels per one logical widget-canvas unit. */
  viewportScale: number;
  infiniteY: boolean;
  scrollContainerRef?: RefObject<HTMLDivElement>;
  onMove: (id: string, x: number, y: number) => void;
  onActivate: (id: string, additive?: boolean) => void;
  onRemove: (id: string) => void;
  onResize: (id: string, w: number, h: number) => void;
  onUpdate: (id: string, updates: Partial<WidgetLayout>) => void;
  onMovePage: (id: string) => void;
  onOpenWidgetMenu: (id: string, x: number, y: number, anchorRect: DOMRect) => void;
  onEditSpaceItem: (widgetId: string, spaceId: string, item: DockItem, anchorRect: DOMRect) => void;
  onAddSpaceItem: (widgetId: string, spaceId: string, anchorRect: DOMRect) => void;
  onDeleteSpaceItem: (spaceId: string, itemId: string) => void;
  onReorderSpaceItem: (spaceId: string, sourceId: string, targetId: string, placement: DockItemDropPlacement) => void;
  onMergeSpaceItem: (spaceId: string, sourceId: string, targetId: string) => void;
  onUpdateSpaceFolderItems: (spaceId: string, folderId: string, items: DockItem[]) => void;
  onMoveSpaceFolderItemToRoot: (spaceId: string, folderId: string, itemId: string, targetId?: string, placement?: DockItemDropPlacement) => void;
  onConfigureEmbed: (id: string, anchorRect: DOMRect) => void;
}

export interface WeatherNow {
  lat: number;
  lon: number;
  temp: number;
  feelsLike: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  windDirection: number;
  code: number;
  isDay: number;
  place: string;
}

export type SpaceDropMode = 'merge' | 'reorder';
