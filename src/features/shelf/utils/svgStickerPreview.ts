export interface SvgStickerPreviewSpec {
  width: number;
  height: number;
  pathCount: number;
  sourceLength: number;
}

const PREVIEW_MAX_WIDTH = 1600;
const MIN_PREVIEW_WIDTH = 1;
const COMPLEX_PATH_THRESHOLD = 800;
const COMPLEX_SOURCE_LENGTH_THRESHOLD = 320 * 1024;
const TRACED_IMAGE_PATH_THRESHOLD = 300;
const LARGE_VECTOR_AREA = 4_000_000;

const parsePositiveNumber = (value: string | undefined): number | null => {
  const match = value?.trim().match(/^([0-9]*\.?[0-9]+)(?:px)?$/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const getRootAttribute = (svg: string, attribute: string): string | undefined => {
  const root = svg.match(/<svg\b[^>]*>/i)?.[0];
  if (!root) return undefined;
  const match = root.match(new RegExp(`\\b${attribute}\\s*=\\s*["']([^"']+)["']`, 'i'));
  return match?.[1];
};

const getSvgDimensions = (svg: string): { width: number; height: number } | null => {
  let width = parsePositiveNumber(getRootAttribute(svg, 'width'));
  let height = parsePositiveNumber(getRootAttribute(svg, 'height'));
  const viewBox = getRootAttribute(svg, 'viewBox')
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  const viewBoxWidth = viewBox?.length === 4 && Number.isFinite(viewBox[2]) && viewBox[2] > 0 ? viewBox[2] : null;
  const viewBoxHeight = viewBox?.length === 4 && Number.isFinite(viewBox[3]) && viewBox[3] > 0 ? viewBox[3] : null;

  if (!width && !height && viewBoxWidth && viewBoxHeight) {
    width = viewBoxWidth;
    height = viewBoxHeight;
  } else if (width && !height && viewBoxWidth && viewBoxHeight) {
    height = width * viewBoxHeight / viewBoxWidth;
  } else if (height && !width && viewBoxWidth && viewBoxHeight) {
    width = height * viewBoxWidth / viewBoxHeight;
  }

  return width && height ? { width, height } : null;
};

/**
 * Bitmap-traced SVGs can contain thousands of paths. Chromium has to style,
 * layout, paint and raster those paths whenever the image needs a new raster
 * scale, which is much more expensive than sampling a normal image texture.
 * Keep real/lightweight SVGs vector, but render a session-only bitmap preview
 * for path-heavy traced artwork. The original SVG remains untouched in IDB.
 */
export const getComplexSvgStickerPreviewSpec = (svg: string): SvgStickerPreviewSpec | null => {
  const pathCount = (svg.match(/<path(?:\s|>)/gi) ?? []).length;
  const sourceLength = svg.length;
  const dimensions = getSvgDimensions(svg);
  if (!dimensions) return null;

  const looksTraced = /imagetracer|potrace|autotrace/i.test(svg.slice(0, 4096));
  const vectorArea = dimensions.width * dimensions.height;
  const isComplex = pathCount >= COMPLEX_PATH_THRESHOLD
    || sourceLength >= COMPLEX_SOURCE_LENGTH_THRESHOLD
    || (looksTraced && pathCount >= TRACED_IMAGE_PATH_THRESHOLD)
    || (pathCount >= TRACED_IMAGE_PATH_THRESHOLD && vectorArea >= LARGE_VECTOR_AREA);
  if (!isComplex) return null;

  const width = Math.max(MIN_PREVIEW_WIDTH, Math.min(PREVIEW_MAX_WIDTH, Math.round(dimensions.width)));
  const height = Math.max(MIN_PREVIEW_WIDTH, Math.round(dimensions.height * width / dimensions.width));
  return { width, height, pathCount, sourceLength };
};
