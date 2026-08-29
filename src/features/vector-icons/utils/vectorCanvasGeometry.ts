import type { CanvasVectorItem } from '../types/vectorIcon';

export interface CanvasBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getViewBoxAspectRatio(viewBox: string): number {
  const values = viewBox.trim().split(/[\s,]+/).map(Number);
  const width = values[2];
  const height = values[3];
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 1;
  return width / height;
}

export function getItemBounds(item: CanvasVectorItem): CanvasBounds {
  const radians = (item.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const halfWidth = item.width / 2;
  const halfHeight = item.height / 2;
  const centerX = item.x + halfWidth;
  const centerY = item.y + halfHeight;
  const extentX = halfWidth * cos + halfHeight * sin;
  const extentY = halfWidth * sin + halfHeight * cos;
  return {
    minX: centerX - extentX,
    minY: centerY - extentY,
    maxX: centerX + extentX,
    maxY: centerY + extentY,
  };
}

export function getSelectionBounds(items: CanvasVectorItem[]): CanvasBounds | null {
  if (items.length === 0) return null;
  const bounds = items.map(getItemBounds);
  return {
    minX: Math.min(...bounds.map(item => item.minX)),
    minY: Math.min(...bounds.map(item => item.minY)),
    maxX: Math.max(...bounds.map(item => item.maxX)),
    maxY: Math.max(...bounds.map(item => item.maxY)),
  };
}

export function boundsOverlap(a: CanvasBounds, b: CanvasBounds): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

export function boundsFromPoints(a: { x: number; y: number }, b: { x: number; y: number }): CanvasBounds {
  return {
    minX: Math.min(a.x, b.x),
    minY: Math.min(a.y, b.y),
    maxX: Math.max(a.x, b.x),
    maxY: Math.max(a.y, b.y),
  };
}

export function snapToStep(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}
