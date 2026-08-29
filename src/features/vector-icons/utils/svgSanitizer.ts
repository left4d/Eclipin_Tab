import { VECTOR_ICON_CANONICAL_CONTENT_SIZE, VECTOR_ICON_CANONICAL_SIZE } from './vectorIconSizing';

const BLOCKED_TAGS = new Set([
  'script', 'foreignobject', 'iframe', 'object', 'embed', 'image', 'audio', 'video', 'canvas', 'style', 'metadata',
  'animate', 'animatemotion', 'animatetransform', 'set',
]);

const URL_ATTRIBUTE_NAMES = new Set(['href', 'xlink:href', 'src']);
const DRAWABLE_SELECTOR = 'path,circle,rect,line,polyline,polygon,ellipse';
const MAX_SVG_LENGTH = 300_000;
const NORMALIZED_MARKER = 'data-eclipin-normalized';
const NON_FILL_TAGS = new Set(['line', 'polyline']);

export interface SanitizedSvg {
  svg: string;
  viewBox: string;
}

interface ViewBoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function parseNumericDimension(value: string | null): number | null {
  if (!value) return null;
  const match = value.trim().match(/^([+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseViewBox(value: string | null): ViewBoxRect | null {
  if (!value) return null;
  const values = value.trim().split(/[\s,]+/).map(Number);
  if (values.length !== 4 || values.some(item => !Number.isFinite(item)) || values[2] <= 0 || values[3] <= 0) return null;
  return { x: values[0], y: values[1], width: values[2], height: values[3] };
}

function resolveSourceViewBox(svg: SVGSVGElement): ViewBoxRect {
  const existing = parseViewBox(svg.getAttribute('viewBox'));
  if (existing) return existing;
  return {
    x: 0,
    y: 0,
    width: parseNumericDimension(svg.getAttribute('width')) ?? 24,
    height: parseNumericDimension(svg.getAttribute('height')) ?? 24,
  };
}

function formatNumber(value: number): string {
  const rounded = Math.abs(value) < 1e-9 ? 0 : Number(value.toFixed(6));
  return String(rounded);
}

function normalizeSvgGeometry(svg: SVGSVGElement): void {
  const canonicalViewBox = `0 0 ${VECTOR_ICON_CANONICAL_SIZE} ${VECTOR_ICON_CANONICAL_SIZE}`;
  const alreadyNormalized = svg.getAttribute(NORMALIZED_MARKER) === '1' && svg.getAttribute('viewBox') === canonicalViewBox;
  if (!alreadyNormalized) {
    const source = resolveSourceViewBox(svg);
    const scale = Math.min(VECTOR_ICON_CANONICAL_CONTENT_SIZE / source.width, VECTOR_ICON_CANONICAL_CONTENT_SIZE / source.height);
    const renderedWidth = source.width * scale;
    const renderedHeight = source.height * scale;
    const translateX = (VECTOR_ICON_CANONICAL_SIZE - renderedWidth) / 2 - source.x * scale;
    const translateY = (VECTOR_ICON_CANONICAL_SIZE - renderedHeight) / 2 - source.y * scale;

    const document = svg.ownerDocument;
    const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    wrapper.setAttribute(
      'transform',
      `translate(${formatNumber(translateX)} ${formatNumber(translateY)}) scale(${formatNumber(scale)})`,
    );
    while (svg.firstChild) wrapper.appendChild(svg.firstChild);
    svg.appendChild(wrapper);
    svg.setAttribute(NORMALIZED_MARKER, '1');
  }

  svg.setAttribute('viewBox', canonicalViewBox);
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
}

function sanitizeUrlValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('#')) return trimmed;
  return null;
}

function isSafePaintServer(value: string): boolean {
  if (!value.toLowerCase().includes('url(')) return true;
  return /^\s*url\(\s*['"]?#[-\w:.]+['"]?\s*\)\s*$/i.test(value);
}

function sanitizeElementAttributes(element: Element): void {
  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name.toLowerCase();
    const value = attribute.value;
    if (name.startsWith('on')) {
      element.removeAttribute(attribute.name);
      continue;
    }
    if (URL_ATTRIBUTE_NAMES.has(name)) {
      const safeValue = sanitizeUrlValue(value);
      if (safeValue === null) element.removeAttribute(attribute.name);
      else element.setAttribute(attribute.name, safeValue);
      continue;
    }
    if (name === 'style') {
      if (/expression\s*\(|javascript\s*:|@import|behavior\s*:|url\s*\(\s*(?!['"]?#)/i.test(value)) {
        element.removeAttribute(attribute.name);
      }
      continue;
    }
    if (!isSafePaintServer(value)) element.removeAttribute(attribute.name);
  }
}

function readStyleAttribute(element: Element, property: string): string | null {
  const style = element.getAttribute('style');
  if (!style) return null;
  const match = style.match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, 'i'));
  return match?.[1]?.trim() ?? null;
}

function resolvePaint(element: Element, property: 'fill' | 'stroke'): string | null {
  let current: Element | null = element;
  while (current) {
    const direct = current.getAttribute(property);
    if (direct !== null) return direct.trim();
    const inline = readStyleAttribute(current, property);
    if (inline !== null) return inline;
    current = current.parentElement;
  }
  if (property === 'fill' && !NON_FILL_TAGS.has(element.tagName.toLowerCase())) return '#000000';
  return null;
}

function isVisiblePaint(value: string | null): boolean {
  const normalized = value?.trim().toLowerCase();
  return Boolean(normalized && normalized !== 'none' && normalized !== 'transparent' && normalized !== 'rgba(0,0,0,0)' && normalized !== 'rgba(0, 0, 0, 0)');
}

function hasInheritedAttribute(element: Element, attribute: string): boolean {
  let current: Element | null = element;
  while (current) {
    if (current.hasAttribute(attribute)) return true;
    current = current.parentElement;
  }
  return false;
}

function replaceStylePaint(style: string, resolver: (value: string) => string): string {
  return style.replace(/((?:^|;)\s*(?:fill|stroke)\s*:\s*)([^;]+)/gi, (_match, prefix: string, value: string) => `${prefix}${resolver(value.trim())}`);
}

export function ensureVisibleSvgPaint(source: string, color = '#1f2937'): string {
  try {
    const document = new DOMParser().parseFromString(source.trim(), 'image/svg+xml');
    if (document.querySelector('parsererror')) return source;
    const root = document.documentElement;
    if (root.tagName.toLowerCase() !== 'svg') return source;
    let changed = false;
    for (const element of Array.from(root.querySelectorAll(DRAWABLE_SELECTOR))) {
      if (isVisiblePaint(resolvePaint(element, 'fill')) || isVisiblePaint(resolvePaint(element, 'stroke'))) continue;
      element.setAttribute('stroke', color);
      if (!hasInheritedAttribute(element, 'stroke-width')) element.setAttribute('stroke-width', '2');
      if (!NON_FILL_TAGS.has(element.tagName.toLowerCase()) && !hasInheritedAttribute(element, 'fill')) element.setAttribute('fill', 'none');
      changed = true;
    }
    return changed ? new XMLSerializer().serializeToString(root) : source;
  } catch {
    return source;
  }
}

export function adaptSvgPaintForDarkBackground(source: string): string {
  const adapt = (value: string): string => {
    const normalized = value.trim().toLowerCase();
    if (normalized === '#000' || normalized === '#000000' || normalized === '#1c1c1e' || normalized === '#1f2937' || normalized === 'black' || normalized === 'rgb(0,0,0)' || normalized === 'rgb(0, 0, 0)') return '#FFFFFF';
    return value;
  };
  try {
    const document = new DOMParser().parseFromString(source.trim(), 'image/svg+xml');
    if (document.querySelector('parsererror')) return source;
    const root = document.documentElement;
    if (root.tagName.toLowerCase() !== 'svg') return source;
    for (const element of Array.from(root.querySelectorAll('*'))) {
      const fill = element.getAttribute('fill');
      const stroke = element.getAttribute('stroke');
      const style = element.getAttribute('style');
      if (fill !== null) element.setAttribute('fill', adapt(fill));
      if (stroke !== null) element.setAttribute('stroke', adapt(stroke));
      if (style) element.setAttribute('style', replaceStylePaint(style, adapt));
    }
    const rootFill = root.getAttribute('fill');
    const rootStroke = root.getAttribute('stroke');
    const rootStyle = root.getAttribute('style');
    if (rootFill !== null) root.setAttribute('fill', adapt(rootFill));
    if (rootStroke !== null) root.setAttribute('stroke', adapt(rootStroke));
    if (rootStyle) root.setAttribute('style', replaceStylePaint(rootStyle, adapt));
    return new XMLSerializer().serializeToString(root);
  } catch {
    return source;
  }
}

export function sanitizeSvg(source: string): SanitizedSvg {
  const trimmed = source.trim();
  if (!trimmed || trimmed.length > MAX_SVG_LENGTH) {
    throw new Error(trimmed.length > MAX_SVG_LENGTH ? 'SVG 文件过大，请控制在 300 KB 以内。' : 'SVG 内容为空。');
  }
  const parser = new DOMParser();
  const document = parser.parseFromString(trimmed, 'image/svg+xml');
  if (document.querySelector('parsererror')) throw new Error('SVG 代码无法解析。');
  const root = document.documentElement;
  if (root.tagName.toLowerCase() !== 'svg') throw new Error('内容不是有效的 SVG。');

  for (const element of Array.from(root.querySelectorAll('*'))) {
    if (BLOCKED_TAGS.has(element.tagName.toLowerCase())) {
      element.remove();
      continue;
    }
    sanitizeElementAttributes(element);
  }
  sanitizeElementAttributes(root);

  const svg = root as unknown as SVGSVGElement;
  normalizeSvgGeometry(svg);

  if (!root.querySelector(DRAWABLE_SELECTOR)) throw new Error('SVG 中没有可显示的矢量图形。');
  const serialized = ensureVisibleSvgPaint(new XMLSerializer().serializeToString(root)).replace(/<!--[\s\S]*?-->/g, '');
  return { svg: serialized, viewBox: svg.getAttribute('viewBox') ?? `0 0 ${VECTOR_ICON_CANONICAL_SIZE} ${VECTOR_ICON_CANONICAL_SIZE}` };
}

const ROOT_PRESENTATION_ATTRIBUTES = [
  'fill', 'fill-opacity', 'fill-rule',
  'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit',
  'stroke-dasharray', 'stroke-dashoffset', 'stroke-opacity',
  'clip-rule', 'clip-path', 'mask', 'filter',
  'marker-start', 'marker-mid', 'marker-end',
  'color', 'opacity', 'paint-order', 'vector-effect', 'shape-rendering',
  'transform', 'style',
] as const;

function extractRootPresentationAttributes(svg: string): string {
  const match = svg.match(/<svg\b([^>]*)>/i);
  if (!match) return '';
  const source = match[1];
  const attributes: string[] = [];
  for (const name of ROOT_PRESENTATION_ATTRIBUTES) {
    const attributeMatch = source.match(new RegExp(`(?:^|\\s)(${name})\\s*=\\s*(["'])([\\s\\S]*?)\\2`, 'i'));
    if (!attributeMatch) continue;
    attributes.push(`${attributeMatch[1]}=${attributeMatch[2]}${attributeMatch[3]}${attributeMatch[2]}`);
  }
  return attributes.join(' ');
}

/**
 * 提取可嵌套到其他 SVG 中的内容。
 *
 * 不能只截掉外层 <svg>：fill/stroke 等 presentation attributes 会从根节点继承。
 * 例如用户提供的 `<svg fill="none"><path stroke="..."/></svg>` 一旦丢掉根节点，path
 * 会恢复 SVG 默认 fill=black，最终在画布、旋转导出或组合保存时出现“中间变黑”。
 * 因此把根节点上与绘制有关的属性转移到一个 <g> 包裹层，再执行 ID 隔离。
 */
export function extractSvgBody(svg: string, idPrefix?: string): string {
  const start = svg.indexOf('>');
  const end = svg.toLowerCase().lastIndexOf('</svg>');
  if (start < 0 || end <= start) return '';
  const inheritedAttributes = extractRootPresentationAttributes(svg);
  let body = svg.slice(start + 1, end);
  if (inheritedAttributes) body = `<g ${inheritedAttributes}>${body}</g>`;
  if (!idPrefix) return body;
  const prefix = idPrefix.replace(/[^a-z0-9_-]/gi, '_');
  const ids = Array.from(body.matchAll(/\bid=(["'])([^"']+)\1/g), match => match[2]);
  for (const id of ids) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const next = `${prefix}__${id}`;
    body = body
      .replace(new RegExp(`(\\bid=["'])${escaped}(["'])`, 'g'), `$1${next}$2`)
      .replace(new RegExp(`url\\(\\s*(["']?)#${escaped}\\1\\s*\\)`, 'g'), `url(#${next})`)
      .replace(new RegExp(`((?:xlink:)?href=["'])#${escaped}(["'])`, 'g'), `$1#${next}$2`);
  }
  return body;
}
