import type { Sticker, StickerInteractionEffect } from '@/shared/types';

export const STICKER_STROKE_MIN = 1;
export const STICKER_STROKE_MAX = 20;
export const STICKER_CORNER_RADIUS_MIN = 0;
export const STICKER_CORNER_RADIUS_MAX = 80;

const FALLBACK_IMAGE_STICKER_CORNER_RADIUS = 12;

export const DEFAULT_TEXT_STICKER_STROKE = 6;
export const DEFAULT_IMAGE_STICKER_STROKE = 6;
export const DEFAULT_SVG_STICKER_STROKE = 3;

export const normalizeStickerStrokeWidth = (value: number, fallback = DEFAULT_IMAGE_STICKER_STROKE): number => {
  const resolved = Number.isFinite(value) ? value : fallback;
  return Math.max(STICKER_STROKE_MIN, Math.min(STICKER_STROKE_MAX, resolved));
};

export const getDefaultStickerStrokeWidth = (sticker: Sticker, isSvgImage = false): number => {
  if (sticker.type === 'text') return DEFAULT_TEXT_STICKER_STROKE;
  if (sticker.type === 'image' && (isSvgImage || sticker.imagePresentation === 'vectorIcon')) return DEFAULT_SVG_STICKER_STROKE;
  return DEFAULT_IMAGE_STICKER_STROKE;
};

export const getStickerStrokeWidth = (sticker: Sticker, isSvgImage = false): number => {
  const fallback = getDefaultStickerStrokeWidth(sticker, isSvgImage);
  return normalizeStickerStrokeWidth(sticker.strokeWidth ?? fallback, fallback);
};

const readDefaultImageStickerCornerRadius = (): number => {
  if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') return FALLBACK_IMAGE_STICKER_CORNER_RADIUS;
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--radius-medium').trim();
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : FALLBACK_IMAGE_STICKER_CORNER_RADIUS;
};

export const normalizeStickerCornerRadius = (value: number, fallback = FALLBACK_IMAGE_STICKER_CORNER_RADIUS): number => {
  const resolved = Number.isFinite(value) ? value : fallback;
  return Math.max(STICKER_CORNER_RADIUS_MIN, Math.min(STICKER_CORNER_RADIUS_MAX, resolved));
};

export const getDefaultStickerCornerRadius = (sticker: Sticker): number => (
  sticker.imagePresentation === 'vectorIcon' ? 0 : readDefaultImageStickerCornerRadius()
);

export const getStickerCornerRadius = (sticker: Sticker): number => {
  const fallback = getDefaultStickerCornerRadius(sticker);
  return normalizeStickerCornerRadius(sticker.cornerRadius ?? fallback, fallback);
};

export const getStickerInteractionEffect = (sticker: Sticker): StickerInteractionEffect => {
  const value = sticker.interactionEffect;
  return value === 'lift' || value === 'scale' || value === 'button' ? value : 'none';
};
