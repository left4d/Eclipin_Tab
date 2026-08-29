import type { StickerNavigationRequest } from '@/features/shelf/utils/stickerNavigation';

export interface ZenShelfProps {
    onOpenSettings?: (position: { x: number; y: number }) => void;
    onOpenAddWidget?: () => void;
    onNavigateInternal?: (request: StickerNavigationRequest) => void;
    pageIndex?: number;
}

export interface StickerContextMenuState {
    x: number;
    y: number;
    type: 'background' | 'sticker';
    stickerId?: string;
}
