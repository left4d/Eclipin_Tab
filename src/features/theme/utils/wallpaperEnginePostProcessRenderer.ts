import type {
  ImportedWeChromaticAberrationEffect,
  ImportedWePoint,
  ImportedWeSize,
} from './wallpaperEngineImportedScene';

export interface WeChromaticChannelOffsets {
  red: ImportedWePoint;
  green: ImportedWePoint;
  blue: ImportedWePoint;
}

const zero = (): ImportedWePoint => ({ x: 0, y: 0 });
const cleanZero = (value: number): number => Math.abs(value) < 1e-12 ? 0 : value;

/**
 * Approximate WE's scene-wide chromatic-aberration shader in a DOM/SVG stage.
 *
 * WE's expansion/radial/barrel modes vary channel displacement per pixel. A
 * CSS/SVG filter applied to the already-composited DOM stage cannot express
 * that coordinate-dependent field without re-rasterizing the entire scene, so
 * those modes use a conservative representative horizontal displacement. The
 * directional mode preserves its authored direction exactly. Channel routing
 * follows WE's VARIATION combo.
 */
export const getWeChromaticAberrationChannelOffsets = (
  canvas: ImportedWeSize,
  effect: ImportedWeChromaticAberrationEffect,
): WeChromaticChannelOffsets => {
  if (!Number.isFinite(effect.strength) || effect.strength <= 0) {
    return { red: zero(), green: zero(), blue: zero() };
  }

  const sceneSpan = Math.max(1, canvas.width, canvas.height);
  // WE multiplies strength by 0.01 UV units. Expansion/radial modes then
  // multiply by a position delta whose representative magnitude is ~0.5.
  const modeScale = effect.mode === 1 ? 1 : 0.5;
  const magnitude = effect.strength * 0.01 * sceneSpan * modeScale;
  let directionX = 1;
  let directionY = 0;
  if (effect.mode === 1) {
    directionX = -Math.sin(effect.direction);
    directionY = Math.cos(effect.direction);
  }

  // When center falloff is disabled WE modulates displacement more strongly by
  // position. Retain a conservative average rather than exaggerating edges.
  const falloffScale = 0.75 + Math.min(1, Math.max(0, effect.centerFalloff)) * 0.25;
  const positive = {
    x: cleanZero(directionX * magnitude * falloffScale),
    y: cleanZero(directionY * magnitude * falloffScale),
  };
  const negative = { x: cleanZero(-positive.x), y: cleanZero(-positive.y) };
  const center = zero();

  if (effect.variation === 1) {
    // Yellow / purple: green samples inward, blue outward, red stays centered.
    return { red: center, green: negative, blue: positive };
  }
  if (effect.variation === 2) {
    // Magenta / green: green samples outward, red inward, blue stays centered.
    return { red: negative, green: positive, blue: center };
  }
  // Red / blue (WE default): red samples outward, blue inward.
  return { red: positive, green: center, blue: negative };
};
