import type { VectorStyleOptions } from '../types/vectorIcon';
import { sanitizeSvg } from './svgSanitizer';
import {
  SVG_DRAWABLE_SELECTOR,
  SVG_NON_FILL_TAGS,
  clearInlinePaintOverrides,
  hasVisiblePaint,
  resolveInheritedPaint,
} from './svgPaint';

function resolveStyleColor(element: Element): string | null {
  const stroke = resolveInheritedPaint(element, 'stroke');
  if (stroke && stroke.toLowerCase() !== 'none') return stroke;
  const fill = resolveInheritedPaint(element, 'fill');
  if (fill && fill.toLowerCase() !== 'none') return fill;
  return null;
}

export function inferVectorStyle(svgSource: string): VectorStyleOptions {
  try {
    const document = new DOMParser().parseFromString(svgSource, 'image/svg+xml');
    const drawable = document.querySelector(SVG_DRAWABLE_SELECTOR);
    if (!drawable) return { color: '#1f2937', strokeWidth: 2, roundness: 8, paintMode: 'existing' };
    const resolvedColor = resolveStyleColor(drawable) ?? '#1f2937';
    const width = Number(drawable.getAttribute('stroke-width') || 2);
    const rx = Number(drawable.getAttribute('rx') || 0);
    return {
      color: /^#[0-9a-f]{3,8}$/i.test(resolvedColor) ? resolvedColor : '#1f2937',
      strokeWidth: Number.isFinite(width) ? Math.min(12, Math.max(0.5, width)) : 2,
      roundness: Number.isFinite(rx) && rx > 0 ? Math.min(24, rx) : 8,
      paintMode: 'existing',
    };
  } catch {
    return { color: '#1f2937', strokeWidth: 2, roundness: 8, paintMode: 'existing' };
  }
}

export function applyVectorStyle(svgSource: string, options: VectorStyleOptions): string {
  const document = new DOMParser().parseFromString(svgSource, 'image/svg+xml');
  const root = document.documentElement;
  for (const element of Array.from(root.querySelectorAll(SVG_DRAWABLE_SELECTOR))) {
    const tag = element.tagName.toLowerCase();
    // 先读取“继承之后”的实际可见 paint，再清理本元素的覆盖。
    // 这样 root 上的 fill="none" / stroke="..." 会被正确保留其语义。
    const hadStroke = hasVisiblePaint(element, 'stroke');
    const hadFill = hasVisiblePaint(element, 'fill');
    clearInlinePaintOverrides(element, ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin']);

    if (options.paintMode === 'stroke') {
      element.setAttribute('stroke', options.color);
      if (SVG_NON_FILL_TAGS.has(tag)) element.setAttribute('fill', 'none');
    } else if (options.paintMode === 'fill') {
      if (!SVG_NON_FILL_TAGS.has(tag)) element.setAttribute('fill', options.color);
    } else {
      if (hadStroke) element.setAttribute('stroke', options.color);
      if (hadFill && !SVG_NON_FILL_TAGS.has(tag)) element.setAttribute('fill', options.color);
    }

    if (hadStroke || options.paintMode === 'stroke') {
      element.setAttribute('stroke-width', String(options.strokeWidth));
      element.setAttribute('stroke-linecap', options.roundness > 0 ? 'round' : 'butt');
      element.setAttribute('stroke-linejoin', options.roundness > 0 ? 'round' : 'miter');
    }
    if (tag === 'rect') {
      element.setAttribute('rx', String(options.roundness));
      element.setAttribute('ry', String(options.roundness));
    }
  }
  return sanitizeSvg(new XMLSerializer().serializeToString(root)).svg;
}
