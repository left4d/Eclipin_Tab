/**
 * Wallpaper Engine stores Text Layer `pointsize` in typographic points, but its
 * generated 2D text surfaces use a fixed 4 scene-pixels per point raster scale.
 *
 * This is intentionally not the browser/CSS 96-DPI conversion (96 / 72): the
 * renderer works in Wallpaper Engine scene pixels before the whole stage is
 * scaled to the browser viewport. Using CSS-point conversion makes authored WE
 * text roughly one third of its intended size.
 */
export const wePointSizeToScenePixels = (pointSize: number): number => (
  Math.max(0.1, pointSize) * 4
);


export interface WeTextAnchorOffsetInput {
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  rotationDeg: number;
  horizontalAlign: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'center' | 'bottom';
}

/**
 * WE Text Layer origin is the authored text-alignment anchor. The browser
 * compositor positions rectangles by their geometric center, so convert the
 * left/center/right + top/center/bottom anchor into a rotated/scaled offset.
 *
 * Keeping this at render time also fixes already-imported v1 scenes: no DB
 * migration or re-import is required.
 */
export const getWeTextAnchorCenterOffset = ({
  width,
  height,
  scaleX,
  scaleY,
  rotationDeg,
  horizontalAlign,
  verticalAlign,
}: WeTextAnchorOffsetInput): { x: number; y: number } => {
  const localX = horizontalAlign === 'left'
    ? width / 2
    : horizontalAlign === 'right' ? -width / 2 : 0;
  // WE root coordinates are already converted to browser Y-down before this
  // helper runs. A top anchor therefore puts the rectangle center below it.
  const localY = verticalAlign === 'top'
    ? height / 2
    : verticalAlign === 'bottom' ? -height / 2 : 0;
  const x = localX * scaleX;
  const y = localY * scaleY;
  const angle = rotationDeg * (Math.PI / 180);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
};
