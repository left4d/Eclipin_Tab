/**
 * Per-page budget for live WebGL contexts.
 *
 * Chrome keeps a small number of WebGL contexts alive per page and silently
 * loses the oldest when a page exceeds it. A packed Wallpaper Engine scene can
 * easily ask for more than that on its own: `pkg/scene_1.pkg` has 22 layers that
 * each used to create a context. A context-lost canvas paints as an opaque
 * blank slab, which surfaced to the user as huge white rectangles drifting
 * across the wallpaper.
 *
 * Layers therefore ask for a slot before calling `getContext`, and release it on
 * unmount. A layer that cannot get one falls back to its plain source image —
 * losing a subtle animation is a far better outcome than a white rectangle, and
 * the slot is re-evaluated the next time the scene mounts.
 */

/**
 * Deliberately below Chrome's own limit so the non-budgeted renderers
 * (puppet mesh, composition) still fit alongside these layers.
 */
export const MAX_LIVE_WEBGL_CONTEXTS = 12;

let liveContexts = 0;

/** Number of contexts currently held through this budget. Diagnostics only. */
export const getLiveWebGlContextCount = (): number => liveContexts;

/**
 * Reserve one context slot.
 *
 * @returns a release function, or `null` when the budget is already exhausted.
 */
export const acquireWebGlContextSlot = (): (() => void) | null => {
  if (liveContexts >= MAX_LIVE_WEBGL_CONTEXTS) return null;
  liveContexts += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    liveContexts = Math.max(0, liveContexts - 1);
  };
};
