import type { ImportedWeCameraParallax, ImportedWePoint, ImportedWeSize } from './wallpaperEngineImportedScene';

export interface WeNormalizedPointer {
  x: number;
  y: number;
}

export interface WeParallaxSceneMotion {
  cameraDepth: ImportedWePoint;
  relativeScale: number;
  relativeDepthCap: number;
}

const clampUnit = (value: number): number => Math.min(1, Math.max(-1, value));

export const getWeNormalizedPointer = (
  clientX: number,
  clientY: number,
  viewport: ImportedWeSize,
): WeNormalizedPointer => ({
  x: viewport.width > 0 ? clampUnit((clientX / viewport.width) * 2 - 1) : 0,
  y: viewport.height > 0 ? clampUnit((clientY / viewport.height) * 2 - 1) : 0,
});

/**
 * Wallpaper Engine documents Amount, Delay, Mouse influence and per-layer
 * Parallax Depth, but not the internal pixel-space camera formula. TabLab maps
 * the normalized pointer to a conservative fraction of the scene half-size so
 * those retained controls stay proportional across different resolutions.
 */
export const getWeParallaxLayerOffset = (
  canvas: ImportedWeSize,
  settings: ImportedWeCameraParallax,
  depth: ImportedWePoint | null,
  pointer: WeNormalizedPointer,
  sceneMotion: WeParallaxSceneMotion | null = null,
): ImportedWePoint => {
  if (!settings.enabled || settings.amount <= 0 || settings.mouseInfluence <= 0) {
    return { x: 0, y: 0 };
  }

  if (!depth) return { x: 0, y: 0 };

  const relativeAxisDepth = (value: number): number => {
    if (!sceneMotion) return value;
    const scaled = value * sceneMotion.relativeScale;
    const cap = Math.max(0, sceneMotion.relativeDepthCap);
    return Math.max(-cap, Math.min(cap, scaled));
  };

  const strength = settings.amount * settings.mouseInfluence;
  const x = -pointer.x * canvas.width * 0.5 * strength * relativeAxisDepth(depth.x);
  const y = -pointer.y * canvas.height * 0.5 * strength * relativeAxisDepth(depth.y);
  return {
    x: x === 0 ? 0 : x,
    y: y === 0 ? 0 : y,
  };
};

/**
 * Shared camera translation for mixed zero/non-zero parallax scenes. This is
 * intentionally applied to the scene stage, not folded into every layer, so
 * all content participates in one coherent camera motion before depth creates
 * a smaller relative separation.
 */
export const getWeParallaxCameraOffset = (
  canvas: ImportedWeSize,
  settings: ImportedWeCameraParallax,
  sceneMotion: WeParallaxSceneMotion | null,
  pointer: WeNormalizedPointer,
): ImportedWePoint => {
  if (!sceneMotion || !settings.enabled || settings.amount <= 0 || settings.mouseInfluence <= 0) {
    return { x: 0, y: 0 };
  }
  const strength = settings.amount * settings.mouseInfluence;
  const x = -pointer.x * canvas.width * 0.5 * strength * sceneMotion.cameraDepth.x;
  const y = -pointer.y * canvas.height * 0.5 * strength * sceneMotion.cameraDepth.y;
  return {
    x: x === 0 ? 0 : x,
    y: y === 0 ? 0 : y,
  };
};

/** Minimum overscan needed to keep the shifted scene covering the viewport. */
export const getWeParallaxCameraOverscan = (
  _canvas: ImportedWeSize,
  settings: ImportedWeCameraParallax,
  sceneMotion: WeParallaxSceneMotion | null,
): number => {
  if (!sceneMotion || !settings.enabled || settings.amount <= 0 || settings.mouseInfluence <= 0) return 1;
  const strength = settings.amount * settings.mouseInfluence;
  const xFraction = Math.abs(sceneMotion.cameraDepth.x) * 0.5 * strength;
  const yFraction = Math.abs(sceneMotion.cameraDepth.y) * 0.5 * strength;
  // Translation can expose one edge at a time. Doubling the maximum fractional
  // shift gives symmetric extra coverage around the stage center.
  return 1 + Math.min(0.08, Math.max(xFraction, yFraction) * 2);
};

/**
 * Exponential smoothing gives Delay a frame-rate independent transition.
 * A zero delay snaps directly to the cursor target.
 */
export const stepWeParallaxPointer = (
  current: WeNormalizedPointer,
  target: WeNormalizedPointer,
  delaySeconds: number,
  deltaMs: number,
): WeNormalizedPointer => {
  if (!Number.isFinite(delaySeconds) || delaySeconds <= 0) return { ...target };
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return { ...current };

  const timeConstantMs = Math.max(1, delaySeconds * 1000);
  const alpha = 1 - Math.exp(-deltaMs / timeConstantMs);
  return {
    x: current.x + (target.x - current.x) * alpha,
    y: current.y + (target.y - current.y) * alpha,
  };
};

export const isWeParallaxActive = (settings: ImportedWeCameraParallax): boolean => (
  settings.enabled && settings.amount > 0 && settings.mouseInfluence > 0
);
