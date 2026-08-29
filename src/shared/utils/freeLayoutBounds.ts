/**
 * Free-layout edge rules shared by widgets and stickers.
 * Up to 25% of an item's own size may sit outside the viewport so edge-aligned
 * compositions do not immediately bounce back while most of the item remains reachable.
 */
export const FREE_LAYOUT_OVERFLOW_RATIO = 0.25;

export const getFreeLayoutAxisBounds = (
  viewportSize: number,
  itemSize: number,
  overflowRatio = FREE_LAYOUT_OVERFLOW_RATIO,
): { min: number; max: number } => {
  const safeViewport = Math.max(0, viewportSize);
  const safeItem = Math.max(0, itemSize);
  const ratio = Math.max(0, Math.min(0.49, overflowRatio));
  return {
    min: -safeItem * ratio,
    max: safeViewport - safeItem * (1 - ratio),
  };
};

export const clampFreeLayoutAxis = (
  value: number,
  viewportSize: number,
  itemSize: number,
  overflowRatio = FREE_LAYOUT_OVERFLOW_RATIO,
): number => {
  const { min, max } = getFreeLayoutAxisBounds(viewportSize, itemSize, overflowRatio);
  if (max < min) return (min + max) / 2;
  return Math.max(min, Math.min(max, value));
};

export const clampFreeLayoutPosition = (
  x: number,
  y: number,
  viewportWidth: number,
  viewportHeight: number,
  itemWidth: number,
  itemHeight: number,
): { x: number; y: number } => ({
  x: clampFreeLayoutAxis(x, viewportWidth, itemWidth),
  y: clampFreeLayoutAxis(y, viewportHeight, itemHeight),
});
