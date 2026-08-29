import type { Sticker } from '../types/sticker';

export interface StickerVisibilityWindow {
  pageIndex: number;
  scrollY: number;
  viewportHeight: number;
  viewportScale: number;
  retainedIds?: ReadonlySet<string>;
}

const STICKER_RENDER_OVERSCAN_SCREENS = 3;

const getEstimatedStickerHeight = (sticker: Sticker): number => {
  if (sticker.type === 'drawing') return Math.max(64, sticker.drawingSize?.height ?? 0);
  if (sticker.type === 'image') return Math.max(320, 1200 * (sticker.scale ?? 1));
  return Math.max(260, (sticker.style?.fontSize ?? 40) * 8);
};

/**
 * Keep only the second-page stickers that are close enough to the viewport to
 * matter. Keep several screens warm while the tab is visible so image stickers
 * are decoded before they enter the viewport. Very distant items are still
 * culled; document-hidden cleanup remains handled by the image source cache.
 */
export const getRenderableStickers = (
  stickers: readonly Sticker[],
  {
    pageIndex,
    scrollY,
    viewportHeight,
    viewportScale,
    retainedIds,
  }: StickerVisibilityWindow,
): Sticker[] => {
  if (pageIndex !== 1 || viewportScale <= 0 || viewportHeight <= 0) return [...stickers];

  const visibleTop = scrollY / viewportScale;
  const visibleHeight = viewportHeight / viewportScale;
  const visibleBottom = visibleTop + visibleHeight;
  const overscan = visibleHeight * STICKER_RENDER_OVERSCAN_SCREENS;
  const renderTop = visibleTop - overscan;
  const renderBottom = visibleBottom + overscan;

  return stickers.filter((sticker) => {
    if (sticker.positionMode === 'viewport' || retainedIds?.has(sticker.id)) return true;
    const estimatedBottom = sticker.y + getEstimatedStickerHeight(sticker);
    return estimatedBottom >= renderTop && sticker.y <= renderBottom;
  });
};
