export interface ElementSize {
  width: number;
  height: number;
}

const SIZE_CLIPBOARD_KEY = 'eclipin_element_size_clipboard_v1';
const MIN_SIZE = 1;
const MAX_SIZE = 10000;

const normalizeDimension = (value: number): number => (
  Math.round(Math.max(MIN_SIZE, Math.min(MAX_SIZE, Number.isFinite(value) ? value : MIN_SIZE)))
);

export const normalizeElementSize = (size: ElementSize): ElementSize => ({
  width: normalizeDimension(size.width),
  height: normalizeDimension(size.height),
});

export const formatElementSize = (size: ElementSize): string => {
  const normalized = normalizeElementSize(size);
  return `${normalized.width} × ${normalized.height}`;
};

export const copyElementSize = (size: ElementSize): ElementSize => {
  const normalized = normalizeElementSize(size);
  try {
    localStorage.setItem(SIZE_CLIPBOARD_KEY, JSON.stringify(normalized));
  } catch {
    // localStorage can be unavailable in private/locked-down contexts. The
    // system clipboard write below is best-effort and does not block editing.
  }

  try {
    void navigator.clipboard?.writeText(formatElementSize(normalized)).catch(() => undefined);
  } catch {
    // Clipboard permission is intentionally non-fatal; the internal clipboard
    // remains the source of truth for the "粘贴尺寸" command.
  }
  return normalized;
};

export const readElementSizeClipboard = (): ElementSize | null => {
  try {
    const raw = localStorage.getItem(SIZE_CLIPBOARD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ElementSize> | null;
    if (!parsed || !Number.isFinite(parsed.width) || !Number.isFinite(parsed.height)) return null;
    return normalizeElementSize({ width: Number(parsed.width), height: Number(parsed.height) });
  } catch {
    return null;
  }
};

export const fitSizeToAspectRatio = (bounds: ElementSize, aspectRatio: number): ElementSize => {
  const normalized = normalizeElementSize(bounds);
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) return normalized;

  const boundsRatio = normalized.width / normalized.height;
  if (boundsRatio > aspectRatio) {
    return normalizeElementSize({
      width: normalized.height * aspectRatio,
      height: normalized.height,
    });
  }
  return normalizeElementSize({
    width: normalized.width,
    height: normalized.width / aspectRatio,
  });
};
