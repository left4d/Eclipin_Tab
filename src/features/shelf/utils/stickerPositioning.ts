import type { Sticker } from '@/shared/types';
import { STICKER_EDGE_MARGIN } from './stickerPresentation';
import { clampFreeLayoutAxis, FREE_LAYOUT_OVERFLOW_RATIO } from '@/shared/utils/freeLayoutBounds';

interface Point {
    x: number;
    y: number;
}

interface ReleasePositionOptions {
    stickerType: Sticker['type'];
    isPinned: boolean;
    proposedPosition: Point;
    stickerRect: DOMRect;
    bottomZoneRect?: DOMRect;
    viewportScale: number;
    viewportWidth: number;
    viewportHeight: number;
    effectiveScrollY: number;
    infiniteY: boolean;
}

interface ReleasePositionResult extends Point {
    adjusted: boolean;
}

interface ScreenRect {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

export const isPointInsideRect = (x: number, y: number, rect: DOMRect) => (
    x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
);

const rectsOverlap = (first: ScreenRect, second: DOMRect) => !(
    first.right < second.left ||
    first.left > second.right ||
    first.bottom < second.top ||
    first.top > second.bottom
);

const avoidBottomZone = (
    position: Point,
    stickerRect: DOMRect,
    bottomZoneRect: DOMRect | undefined,
    viewportScale: number,
    viewportWidth: number,
    effectiveScrollY: number,
): ReleasePositionResult => {
    if (!bottomZoneRect) return { ...position, adjusted: false };

    const screenRect: ScreenRect = {
        left: position.x * viewportScale,
        top: position.y * viewportScale - effectiveScrollY,
        right: position.x * viewportScale + stickerRect.width,
        bottom: position.y * viewportScale - effectiveScrollY + stickerRect.height,
    };
    if (!rectsOverlap(screenRect, bottomZoneRect)) return { ...position, adjusted: false };

    const escapeUp = screenRect.bottom - bottomZoneRect.top + STICKER_EDGE_MARGIN;
    const escapeLeft = screenRect.right - bottomZoneRect.left + STICKER_EDGE_MARGIN;
    const escapeRight = bottomZoneRect.right - screenRect.left + STICKER_EDGE_MARGIN;
    const canEscapeLeft = screenRect.left - escapeLeft >= STICKER_EDGE_MARGIN;
    const canEscapeRight = screenRect.right + escapeRight <= viewportWidth - STICKER_EDGE_MARGIN;

    let direction: 'up' | 'left' | 'right' = 'up';
    let shortestDistance = escapeUp;
    if (canEscapeLeft && escapeLeft < shortestDistance) {
        shortestDistance = escapeLeft;
        direction = 'left';
    }
    if (canEscapeRight && escapeRight < shortestDistance) direction = 'right';

    if (direction === 'left') {
        return {
            x: (bottomZoneRect.left - stickerRect.width - STICKER_EDGE_MARGIN) / viewportScale,
            y: position.y,
            adjusted: true,
        };
    }
    if (direction === 'right') {
        return {
            x: (bottomZoneRect.right + STICKER_EDGE_MARGIN) / viewportScale,
            y: position.y,
            adjusted: true,
        };
    }
    return {
        x: position.x,
        y: (bottomZoneRect.top - stickerRect.height - STICKER_EDGE_MARGIN) / viewportScale,
        adjusted: true,
    };
};

export const resolveStickerReleasePosition = ({
    stickerType,
    isPinned,
    proposedPosition,
    stickerRect,
    bottomZoneRect,
    viewportScale,
    viewportWidth,
    viewportHeight,
    effectiveScrollY,
    infiniteY,
}: ReleasePositionOptions): ReleasePositionResult => {
    const avoided = stickerType === 'drawing'
        ? { ...proposedPosition, adjusted: false }
        : avoidBottomZone(
            proposedPosition,
            stickerRect,
            bottomZoneRect,
            viewportScale,
            viewportWidth,
            effectiveScrollY,
        );

    let finalX = avoided.x;
    let finalY = avoided.y;
    const stickerWidth = stickerRect.width / viewportScale;
    const stickerHeight = stickerRect.height / viewportScale;
    const logicalViewportWidth = viewportWidth / viewportScale;
    const logicalViewportHeight = viewportHeight / viewportScale;

    finalX = clampFreeLayoutAxis(finalX, logicalViewportWidth, stickerWidth);

    if (infiniteY && !isPinned) {
        const visibleTop = effectiveScrollY / viewportScale;
        finalY = Math.max(visibleTop - stickerHeight * FREE_LAYOUT_OVERFLOW_RATIO, finalY);
    } else {
        finalY = clampFreeLayoutAxis(finalY, logicalViewportHeight, stickerHeight);
    }

    const clamped = Math.abs(finalX - avoided.x) > 0.1 || Math.abs(finalY - avoided.y) > 0.1;
    return {
        x: finalX,
        y: finalY,
        adjusted: avoided.adjusted || clamped,
    };
};
