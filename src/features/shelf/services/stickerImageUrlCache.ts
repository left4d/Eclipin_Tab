export interface CachedStickerImageSource {
  resolvedImageUrl: string;
  isSvgImage: boolean;
  svgText: string | null;
}

interface CacheEntry {
  source: CachedStickerImageSource;
  refs: number;
  lastUsedAt: number;
  warmImage: HTMLImageElement | null;
  warmPixels: number;
}

/** While the new tab is visible, keep a larger warm sticker URL cache. */
const MAX_UNUSED_VISIBLE_STICKER_IMAGE_URLS = 64;
/**
 * URL retention alone does not guarantee Chromium keeps the decoded bitmap.
 * Keep a bounded set of recently-used zero-ref images decoded across page flips;
 * document-hidden cleanup still drops these pins immediately.
 */
const MAX_WARM_DECODED_STICKER_IMAGES = 24;
const MAX_WARM_DECODED_STICKER_PIXELS = 48 * 1024 * 1024;
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<CachedStickerImageSource | null>>();
let visibilityListenerAttached = false;

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const documentHidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';

const releaseWarmImage = (entry: CacheEntry) => {
  if (!entry.warmImage) return;
  entry.warmImage.src = '';
  entry.warmImage = null;
  entry.warmPixels = 0;
};

const pruneWarmDecodedImages = () => {
  const warmEntries = [...cache.values()]
    .filter((entry) => entry.refs === 0 && entry.warmImage)
    .sort((a, b) => a.lastUsedAt - b.lastUsedAt);
  let warmPixels = warmEntries.reduce((total, entry) => total + entry.warmPixels, 0);

  while (warmEntries.length > MAX_WARM_DECODED_STICKER_IMAGES || warmPixels > MAX_WARM_DECODED_STICKER_PIXELS) {
    const oldest = warmEntries.shift();
    if (!oldest) break;
    warmPixels -= oldest.warmPixels;
    releaseWarmImage(oldest);
  }
};

const pinWarmDecodedImage = (key: string, entry: CacheEntry) => {
  if (entry.refs !== 0 || entry.warmImage || documentHidden() || typeof Image === 'undefined') return;

  const image = new Image();
  image.decoding = 'async';
  image.src = entry.source.resolvedImageUrl;
  entry.warmImage = image;
  entry.warmPixels = 0;

  void image.decode().then(() => {
    if (cache.get(key) !== entry || entry.warmImage !== image || entry.refs !== 0 || documentHidden()) {
      if (entry.warmImage === image) releaseWarmImage(entry);
      return;
    }
    entry.warmPixels = Math.max(0, image.naturalWidth * image.naturalHeight);
    pruneWarmDecodedImages();
  }).catch(() => {
    if (entry.warmImage === image) releaseWarmImage(entry);
  });

  // Count-based pruning works before decode() reports natural dimensions.
  pruneWarmDecodedImages();
};

const revokeEntry = (key: string, entry: CacheEntry) => {
  releaseWarmImage(entry);
  URL.revokeObjectURL(entry.source.resolvedImageUrl);
  cache.delete(key);
};

const pruneUnusedEntries = (limit = MAX_UNUSED_VISIBLE_STICKER_IMAGE_URLS) => {
  const unused = [...cache.entries()]
    .filter(([, entry]) => entry.refs === 0)
    .sort((a, b) => a[1].lastUsedAt - b[1].lastUsedAt);

  while (unused.length > limit) {
    const oldest = unused.shift();
    if (!oldest) break;
    const [key, entry] = oldest;
    if (cache.get(key) === entry && entry.refs === 0) revokeEntry(key, entry);
  }
};

const ensureVisibilityListener = () => {
  if (visibilityListenerAttached || typeof document === 'undefined') return;
  visibilityListenerAttached = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      for (const entry of cache.values()) releaseWarmImage(entry);
      pruneUnusedEntries(0);
      return;
    }
    pruneUnusedEntries();
    pruneWarmDecodedImages();
  });
};

export const acquireStickerImageUrl = async (
  key: string,
  loader: () => Promise<CachedStickerImageSource | null>,
): Promise<CachedStickerImageSource | null> => {
  ensureVisibilityListener();
  const existing = cache.get(key);
  if (existing) {
    releaseWarmImage(existing);
    existing.refs += 1;
    existing.lastUsedAt = now();
    return existing.source;
  }

  let pending = inFlight.get(key);
  if (!pending) {
    pending = loader();
    inFlight.set(key, pending);
  }

  let source: CachedStickerImageSource | null;
  try {
    source = await pending;
  } finally {
    if (inFlight.get(key) === pending) inFlight.delete(key);
  }
  if (!source) return null;

  const raced = cache.get(key);
  if (raced) {
    releaseWarmImage(raced);
    raced.refs += 1;
    raced.lastUsedAt = now();
    // Another acquire populated the shared cache while this loader resolved.
    // The returned source is the same loader result in normal races; do not
    // revoke it here because the winning cache entry may reference it.
    return raced.source;
  }

  cache.set(key, {
    source,
    refs: 1,
    lastUsedAt: now(),
    warmImage: null,
    warmPixels: 0,
  });
  pruneUnusedEntries(documentHidden() ? 0 : MAX_UNUSED_VISIBLE_STICKER_IMAGE_URLS);
  return source;
};

export const releaseStickerImageUrl = (key: string): void => {
  ensureVisibilityListener();
  const entry = cache.get(key);
  if (!entry) return;
  entry.refs = Math.max(0, entry.refs - 1);
  entry.lastUsedAt = now();
  if (entry.refs > 0) return;

  // Active new-tab sessions favor smooth page flips; leaving the tab favors
  // memory reclamation, so zero-ref URLs/decoded pins are released when hidden.
  if (documentHidden()) {
    revokeEntry(key, entry);
    return;
  }

  // Keep the recently-visible decoded bitmap warm across page switches without
  // retaining the whole StickerItem DOM tree. A count + pixel budget bounds the
  // extra foreground-session memory, and visibilitychange clears it immediately.
  pinWarmDecodedImage(key, entry);
  pruneUnusedEntries();
};
