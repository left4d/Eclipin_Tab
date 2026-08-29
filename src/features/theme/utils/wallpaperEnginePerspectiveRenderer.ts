import type { ImportedWePoint } from './wallpaperEngineImportedScene';

export type ImportedWePerspectiveQuad = [
  ImportedWePoint,
  ImportedWePoint,
  ImportedWePoint,
  ImportedWePoint,
];

const EPSILON = 1e-8;

/**
 * Wallpaper Engine's effect UVs use the opposite vertical convention from the
 * WebGL image-effect stage. Reflecting both source and destination coordinates
 * also reverses the square-corner labels: renderer p0 corresponds to WE p3,
 * p1 to WE p2, p2 to WE p1 and p3 to WE p0. This keeps an identity quad an
 * identity quad while preserving arbitrary projective warps.
 */
export const convertWePerspectiveQuadToRenderer = (
  points: ImportedWePerspectiveQuad,
): ImportedWePerspectiveQuad => [
  { x: points[3].x, y: 1 - points[3].y },
  { x: points[2].x, y: 1 - points[2].y },
  { x: points[1].x, y: 1 - points[1].y },
  { x: points[0].x, y: 1 - points[0].y },
];

const invert3x3 = (matrix: number[]): number[] | null => {
  const [a, b, c, d, e, f, g, h, i] = matrix;
  const c00 = e * i - f * h;
  const c01 = -(d * i - f * g);
  const c02 = d * h - e * g;
  const c10 = -(b * i - c * h);
  const c11 = a * i - c * g;
  const c12 = -(a * h - b * g);
  const c20 = b * f - c * e;
  const c21 = -(a * f - c * d);
  const c22 = a * e - b * d;
  const determinant = a * c00 + b * c01 + c * c02;
  if (!Number.isFinite(determinant) || Math.abs(determinant) < EPSILON) return null;
  const inverseDeterminant = 1 / determinant;
  return [
    c00 * inverseDeterminant,
    c10 * inverseDeterminant,
    c20 * inverseDeterminant,
    c01 * inverseDeterminant,
    c11 * inverseDeterminant,
    c21 * inverseDeterminant,
    c02 * inverseDeterminant,
    c12 * inverseDeterminant,
    c22 * inverseDeterminant,
  ];
};

/**
 * Build the inverse homography used by WE's perspective shader: output quad UV
 * -> original square UV. The returned values are column-major for
 * WebGLRenderingContext.uniformMatrix3fv.
 */
export const createPerspectiveQuadToSquareMatrix = (
  points: ImportedWePerspectiveQuad,
): Float32Array | null => {
  const [p0, p1, p2, p3] = points;
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const dy3 = p0.y - p1.y + p2.y - p3.y;

  let g = 0;
  let h = 0;
  if (Math.abs(dx3) >= EPSILON || Math.abs(dy3) >= EPSILON) {
    const denominator = dx1 * dy2 - dx2 * dy1;
    if (!Number.isFinite(denominator) || Math.abs(denominator) < EPSILON) return null;
    g = (dx3 * dy2 - dx2 * dy3) / denominator;
    h = (dx1 * dy3 - dx3 * dy1) / denominator;
  }

  const squareToQuadRowMajor = [
    p1.x - p0.x + g * p1.x,
    p3.x - p0.x + h * p3.x,
    p0.x,
    p1.y - p0.y + g * p1.y,
    p3.y - p0.y + h * p3.y,
    p0.y,
    g,
    h,
    1,
  ];
  const inverse = invert3x3(squareToQuadRowMajor);
  if (!inverse || inverse.some((value) => !Number.isFinite(value))) return null;

  // WebGL accepts column-major matrices. `inverse` above is row-major.
  return new Float32Array([
    inverse[0], inverse[3], inverse[6],
    inverse[1], inverse[4], inverse[7],
    inverse[2], inverse[5], inverse[8],
  ]);
};
