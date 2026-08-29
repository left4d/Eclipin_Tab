import { clampFreeLayoutPosition } from '@/shared/utils/freeLayoutBounds';

export const UI_SELECTORS = [
  '[data-dock-container]',
  '.dock',
  'header',
  '[class*="Searcher"]',
  '[class*="Modal"]',
  '[class*="Settings"]',
  '[class*="Editor"]',
  '[class*="FolderView"]',
  '[class*="textInputPopup"]',
  '[class*="contextMenu"]',
  '[data-widget-type]',
  '[data-ui-zone="object-inspector"]',
  '[data-page-scroll-lock="true"]',
  '[data-modal="true"]',
  '[role="dialog"]',
].join(', ');

export const STICKER_PRIORITY_MIN = -999;
export const STICKER_PRIORITY_MAX = 999;

export const normalizeStickerPriority = (value: number): number => (
  Math.max(STICKER_PRIORITY_MIN, Math.min(STICKER_PRIORITY_MAX, Math.trunc(value)))
);

export const normalizeStickerRotation = (value: number): number => (
  Number.isFinite(value) ? Math.max(-180, Math.min(180, Math.round(value))) : 0
);

export const normalizeImageLinkUrl = (value: string): string => {
  const url = value.trim();
  if (!url) return '';
  if (/^(https?:\/\/|mailto:)/i.test(url)) return url;
  return `https://${url}`;
};

export const isEditableElement = (element: Element | null): boolean => {
  if (!(element instanceof HTMLElement)) return false;
  if (element.isContentEditable) return true;
  return element.matches('input, textarea, select, [role="textbox"]')
    || Boolean(element.closest('input, textarea, select, [role="textbox"]'));
};

export const clampStickerPositionToViewport = (
  x: number,
  y: number,
  stickerEl: HTMLElement,
  viewportScale: number,
  viewportWidth: number,
): { x: number; y: number } => {
  const rect = stickerEl.getBoundingClientRect();
  const stickerWidth = rect.width / viewportScale;
  const stickerHeight = rect.height / viewportScale;
  return clampFreeLayoutPosition(
    x,
    y,
    viewportWidth / viewportScale,
    window.innerHeight / viewportScale,
    stickerWidth,
    stickerHeight,
  );
};
