export const SVG_DRAWABLE_SELECTOR = 'path,circle,rect,line,polyline,polygon,ellipse';
export const SVG_NON_FILL_TAGS = new Set(['line', 'polyline']);

export type SvgPaintProperty = 'fill' | 'stroke';

export function readInlinePaint(element: Element, property: SvgPaintProperty): string | null {
  const style = element.getAttribute('style');
  if (!style) return null;
  const match = style.match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, 'i'));
  return match?.[1]?.trim() ?? null;
}

export function removeInlinePaint(element: Element, property: SvgPaintProperty): void {
  const style = element.getAttribute('style');
  if (!style) return;
  const kept = style
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .filter(part => {
      const separator = part.indexOf(':');
      if (separator < 0) return true;
      return part.slice(0, separator).trim().toLowerCase() !== property;
    });
  if (kept.length) element.setAttribute('style', kept.join('; '));
  else element.removeAttribute('style');
}

export function clearInlinePaintOverrides(element: Element, properties: string[]): void {
  const style = element.getAttribute('style');
  if (!style) return;
  const blocked = new Set(properties.map(property => property.toLowerCase()));
  const kept = style
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .filter(part => {
      const separator = part.indexOf(':');
      if (separator < 0) return true;
      return !blocked.has(part.slice(0, separator).trim().toLowerCase());
    });
  if (kept.length) element.setAttribute('style', kept.join('; '));
  else element.removeAttribute('style');
}

/**
 * 解析 SVG presentation attribute / inline style 的继承值。
 *
 * SVG 的 fill 会继承，且默认值是黑色；stroke 默认是 none。
 * 这里必须沿祖先向上查找，否则像 `<svg fill="none"><path stroke="..."/></svg>`
 * 这样的纯线框图标会被误判为“path 需要填充”，重着色后就会出现整块黑色/实心区域。
 */
export function resolveInheritedPaint(element: Element, property: SvgPaintProperty): string | null {
  let current: Element | null = element;
  while (current) {
    const direct = current.getAttribute(property);
    if (direct !== null) return direct.trim();
    const inline = readInlinePaint(current, property);
    if (inline !== null) return inline;
    current = current.parentElement;
  }
  if (property === 'fill' && !SVG_NON_FILL_TAGS.has(element.tagName.toLowerCase())) return '#000000';
  return null;
}

export function hasVisiblePaint(element: Element, property: SvgPaintProperty): boolean {
  const value = resolveInheritedPaint(element, property)?.trim().toLowerCase();
  return Boolean(value && value !== 'none' && value !== 'transparent');
}
