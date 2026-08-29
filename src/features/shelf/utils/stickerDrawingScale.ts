import type { StickerDrawing } from '@/shared/types';

export const scaleStickerDrawing = (drawing: StickerDrawing, factor: number): StickerDrawing => {
  const safeFactor = Number.isFinite(factor) && factor > 0 ? factor : 1;
  if (drawing.type === 'line') {
    return {
      ...drawing,
      x1: drawing.x1 * safeFactor,
      y1: drawing.y1 * safeFactor,
      x2: drawing.x2 * safeFactor,
      y2: drawing.y2 * safeFactor,
      strokeWidth: drawing.strokeWidth * safeFactor,
    };
  }

  return {
    ...drawing,
    x: drawing.x * safeFactor,
    y: drawing.y * safeFactor,
    width: drawing.width * safeFactor,
    height: drawing.height * safeFactor,
    strokeWidth: drawing.strokeWidth * safeFactor,
  };
};
