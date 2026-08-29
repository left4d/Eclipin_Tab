/**
 * Keep expensive widget trees alive briefly after an internal page transition.
 * This covers the common "flip away, then flip back" interaction without
 * keeping hidden pages resident indefinitely.
 */
export const WIDGET_PAGE_KEEP_ALIVE_MS = 12_000;

/**
 * Iframes are especially expensive to recreate because their document, scripts
 * and local package resources must initialize again. Keep them alive for the
 * same short grace period while they are merely off-screen.
 */
export const EMBED_OFFSCREEN_KEEP_ALIVE_MS = WIDGET_PAGE_KEEP_ALIVE_MS;
