/*
 * @Author: left4d 3190836003@qq.com
 * @Date: 2026-08-08 17:03:58
 * @LastEditors: left4d 3190836003@qq.com
 * @LastEditTime: 2026-08-08 17:56:36
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import type { CanvasVectorItem } from '../types/vectorIcon';
import { getItemBounds } from './vectorCanvasGeometry';
import { extractSvgBody, sanitizeSvg } from './svgSanitizer';

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 360;

export const VECTOR_CANVAS_SIZE = { width: CANVAS_WIDTH, height: CANVAS_HEIGHT } as const;

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getItemTransform(item: CanvasVectorItem, offsetX: number, offsetY: number): string {
  const centerX = item.x - offsetX + item.width / 2;
  const centerY = item.y - offsetY + item.height / 2;
  const transforms: string[] = [];
  if (item.rotation) transforms.push(`rotate(${item.rotation} ${centerX} ${centerY})`);
  if (item.flipX || item.flipY) {
    const scaleX = item.flipX ? -1 : 1;
    const scaleY = item.flipY ? -1 : 1;
    transforms.push(`translate(${centerX} ${centerY}) scale(${scaleX} ${scaleY}) translate(${-centerX} ${-centerY})`);
  }
  return transforms.length > 0 ? ` transform="${transforms.join(' ')}"` : '';
}

export function composeCanvasSvg(items: CanvasVectorItem[]): { svg: string; viewBox: string } {
  if (items.length === 0) throw new Error('画布还是空的。');
  const padding = 12;
  const bounds = items.map(getItemBounds);
  const minX = Math.max(0, Math.min(...bounds.map(item => item.minX)) - padding);
  const minY = Math.max(0, Math.min(...bounds.map(item => item.minY)) - padding);
  const maxX = Math.min(CANVAS_WIDTH, Math.max(...bounds.map(item => item.maxX)) + padding);
  const maxY = Math.min(CANVAS_HEIGHT, Math.max(...bounds.map(item => item.maxY)) + padding);
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  const body = items.map(item => {
    const inner = extractSvgBody(item.svg, item.id);
    const x = item.x - minX;
    const y = item.y - minY;
    const transform = getItemTransform(item, minX, minY);
    const opacity = item.opacity < 0.999 ? ` opacity="${Math.max(0.05, Math.min(1, item.opacity)).toFixed(3)}"` : '';
    return `<g${transform}${opacity}><svg x="${x}" y="${y}" width="${item.width}" height="${item.height}" viewBox="${escapeAttribute(item.viewBox)}" preserveAspectRatio="none">${inner}</svg></g>`;
  }).join('');

  return sanitizeSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${body}</svg>`);
}

export type PrimitiveKind = 'circle' | 'roundedRect' | 'line' | 'plus' | 'triangle' | 'star' | 'arrow';

export function createPrimitiveSvg(kind: PrimitiveKind): { name: string; svg: string; viewBox: string } {
  const source = kind === 'circle'
    ? '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="34" fill="none" stroke="#1f2937" stroke-width="8"/></svg>'
    : kind === 'roundedRect'
      ? '<svg viewBox="0 0 100 100"><rect x="18" y="18" width="64" height="64" rx="16" fill="none" stroke="#1f2937" stroke-width="8"/></svg>'
      : kind === 'line'
        ? '<svg viewBox="0 0 100 100"><line x1="14" y1="50" x2="86" y2="50" stroke="#1f2937" stroke-width="8" stroke-linecap="round"/></svg>'
        : kind === 'plus'
          ? '<svg viewBox="0 0 100 100"><path d="M50 18V82M18 50H82" fill="none" stroke="#1f2937" stroke-width="8" stroke-linecap="round"/></svg>'
          : kind === 'triangle'
            ? '<svg viewBox="0 0 100 100"><path d="M50 15L86 82H14Z" fill="none" stroke="#1f2937" stroke-width="8" stroke-linejoin="round"/></svg>'
            : kind === 'star'
              ? '<svg viewBox="0 0 100 100"><path d="M50 12L60 38L88 40L66 58L73 86L50 70L27 86L34 58L12 40L40 38Z" fill="none" stroke="#1f2937" stroke-width="7" stroke-linejoin="round"/></svg>'
              : '<svg viewBox="0 0 100 100"><path d="M14 50H76M58 30L80 50L58 70" fill="none" stroke="#1f2937" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const sanitized = sanitizeSvg(source);
  const names: Record<PrimitiveKind, string> = {
    circle: '圆形',
    roundedRect: '圆角矩形',
    line: '线条',
    plus: '加号',
    triangle: '三角形',
    star: '星形',
    arrow: '箭头',
  };
  return { name: names[kind], ...sanitized };
}
