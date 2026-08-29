import { extractSvgBody, sanitizeSvg } from './svgSanitizer';
import { SVG_DRAWABLE_SELECTOR, SVG_NON_FILL_TAGS, removeInlinePaint, resolveInheritedPaint } from './svgPaint';


interface ViewBoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function parseViewBox(viewBox: string): ViewBoxRect {
  const values = viewBox.trim().split(/[\s,]+/).map(Number);
  if (values.length !== 4 || values.some(value => !Number.isFinite(value)) || values[2] <= 0 || values[3] <= 0) {
    return { x: 0, y: 0, width: 24, height: 24 };
  }
  return { x: values[0], y: values[1], width: values[2], height: values[3] };
}

/**
 * 只替换 SVG 的可见填充/描边颜色，不修改线宽、圆角、滤镜或几何数据。
 * 用于图标选择器中的轻量预设颜色覆盖。
 */
export function recolorVectorIconSvg(source: string, color?: string | null): string {
  const sanitized = sanitizeSvg(source);
  if (!color) return sanitized.svg;

  const document = new DOMParser().parseFromString(sanitized.svg, 'image/svg+xml');
  const root = document.documentElement;
  for (const element of Array.from(root.querySelectorAll(SVG_DRAWABLE_SELECTOR))) {
    const fill = resolveInheritedPaint(element, 'fill');
    const stroke = resolveInheritedPaint(element, 'stroke');
    const tag = element.tagName.toLowerCase();

    if (!SVG_NON_FILL_TAGS.has(tag) && fill && fill.toLowerCase() !== 'none') {
      removeInlinePaint(element, 'fill');
      element.setAttribute('fill', color);
    }
    if (stroke && stroke.toLowerCase() !== 'none') {
      removeInlinePaint(element, 'stroke');
      element.setAttribute('stroke', color);
    }
  }

  return sanitizeSvg(new XMLSerializer().serializeToString(root)).svg;
}

export function normalizeVectorRotation(angle: number): number {
  if (!Number.isFinite(angle)) return 0;
  const normalized = ((angle % 360) + 360) % 360;
  return normalized > 180 ? normalized - 360 : normalized;
}

/**
 * 将已清理的 SVG 放进正方形图标画布并烘焙颜色与旋转角度。
 * Dock / 图片贴纸最终都只保存普通 SVG，不引入额外运行时状态。
 */
export function createRotatedVectorIconSvg(source: string, angle: number, color?: string | null): string {
  const styled = recolorVectorIconSvg(source, color);
  const sanitized = sanitizeSvg(styled);
  const box = parseViewBox(sanitized.viewBox);
  const side = Math.max(box.width, box.height);
  const offsetX = (side - box.width) / 2 - box.x;
  const offsetY = (side - box.height) / 2 - box.y;
  const rotation = normalizeVectorRotation(angle);
  const body = extractSvgBody(sanitized.svg, 'vector-picker');
  const translated = offsetX === 0 && offsetY === 0 ? body : `<g transform="translate(${offsetX} ${offsetY})">${body}</g>`;
  const content = rotation === 0 ? translated : `<g transform="rotate(${rotation} ${side / 2} ${side / 2})">${translated}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}" width="${side}" height="${side}" preserveAspectRatio="xMidYMid meet">${content}</svg>`;
}

export function createVectorIconDataUrl(source: string, angle: number, color?: string | null): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(createRotatedVectorIconSvg(source, angle, color))}`;
}
