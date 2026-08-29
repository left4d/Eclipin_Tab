import type { Sticker } from '@/shared/types';
import type { ElementSize } from '@/shared/utils/elementSizeClipboard';

export const MIN_STICKER_SCALE = 0.1;
export const MAX_STICKER_SCALE = 8;

export const clampStickerScale = (value: number): number => (
  Math.max(MIN_STICKER_SCALE, Math.min(MAX_STICKER_SCALE, Number.isFinite(value) ? value : 1))
);

export const getStickerLogicalSize = (sticker: Sticker): ElementSize | null => {
  const element = document.querySelector<HTMLElement>(`[data-sticker-id="${sticker.id}"]`);
  if (!element) return null;
  const scale = clampStickerScale(sticker.scale ?? 1);
  const width = element.offsetWidth * scale;
  const height = element.offsetHeight * scale;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return { width, height };
};

export const getStickerVisualRect = (sticker: Sticker): DOMRect | null => {
  const element = document.querySelector<HTMLElement>(`[data-sticker-id="${sticker.id}"]`);
  if (!element) return null;
  return element.querySelector<HTMLElement>('[data-sticker-visual="true"]')?.getBoundingClientRect()
    ?? element.getBoundingClientRect();
};

export const resizeStickerToWidth = (sticker: Sticker, currentSize: ElementSize, targetWidth: number): number => {
  const currentScale = clampStickerScale(sticker.scale ?? 1);
  if (!Number.isFinite(currentSize.width) || currentSize.width <= 0) return currentScale;
  return clampStickerScale(currentScale * targetWidth / currentSize.width);
};
