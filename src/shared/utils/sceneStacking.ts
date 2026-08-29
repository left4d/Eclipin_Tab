export const SCENE_PRIORITY_MIN = -999;
export const SCENE_PRIORITY_MAX = 999;

/**
 * Keep the whole editable scene in a positive z-index range and leave a wide
 * gap below app chrome/modals (which start around 1_000_000_000).
 *
 * A single priority band is shared by widgets and stickers so values are
 * directly comparable across both systems instead of each feature inventing
 * its own z-index formula.
 */
const SCENE_Z_INDEX_BASE = 200_000_000;
const SCENE_PRIORITY_STRIDE = 200_000;
export const SCENE_LOCAL_LAYER_MAX = SCENE_PRIORITY_STRIDE - 1;
export const SCENE_WIDGET_LOCAL_LAYER = Math.floor(SCENE_PRIORITY_STRIDE / 2);
export const SCENE_DRAGGING_Z_INDEX = 900_000_000;

export const normalizeScenePriority = (value: number | undefined): number => {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(SCENE_PRIORITY_MIN, Math.min(SCENE_PRIORITY_MAX, Math.trunc(numeric)));
};

export const resolveSceneZIndex = (priorityValue: number | undefined, localLayerValue = 0): number => {
  const priority = normalizeScenePriority(priorityValue);
  const localLayer = Math.max(0, Math.min(SCENE_LOCAL_LAYER_MAX, Math.trunc(Number(localLayerValue) || 0)));
  return SCENE_Z_INDEX_BASE + priority * SCENE_PRIORITY_STRIDE + localLayer;
};
