import type { CanvasVectorItem } from '../types/vectorIcon';
import { VECTOR_CANVAS_SIZE } from './svgCompose';
import { getItemBounds, getSelectionBounds } from './vectorCanvasGeometry';

export type CanvasAlignAction = 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom';
export type CanvasLayerAction = 'front' | 'forward' | 'backward' | 'back';

export function normalizeCanvasRotation(value: number): number {
  let result = value % 360;
  if (result > 180) result -= 360;
  if (result < -180) result += 360;
  return result;
}

export function reorderCanvasItems(
  items: CanvasVectorItem[],
  selectedIds: string[],
  action: CanvasLayerAction,
): CanvasVectorItem[] {
  const selected = new Set(selectedIds);
  if (action === 'front') return [...items.filter(item => !selected.has(item.id)), ...items.filter(item => selected.has(item.id))];
  if (action === 'back') return [...items.filter(item => selected.has(item.id)), ...items.filter(item => !selected.has(item.id))];
  const next = [...items];
  if (action === 'forward') {
    for (let index = next.length - 2; index >= 0; index -= 1) {
      if (selected.has(next[index].id) && !selected.has(next[index + 1].id)) [next[index], next[index + 1]] = [next[index + 1], next[index]];
    }
  } else {
    for (let index = 1; index < next.length; index += 1) {
      if (selected.has(next[index].id) && !selected.has(next[index - 1].id)) [next[index], next[index - 1]] = [next[index - 1], next[index]];
    }
  }
  return next;
}

export function alignCanvasItems(
  items: CanvasVectorItem[],
  selectedIds: string[],
  action: CanvasAlignAction,
): CanvasVectorItem[] {
  const selectedSet = new Set(selectedIds);
  const selectedItems = items.filter(item => selectedSet.has(item.id));
  const group = getSelectionBounds(selectedItems);
  if (!group) return items;
  const single = selectedItems.length === 1;
  const target = action === 'left' ? (single ? 0 : group.minX)
    : action === 'right' ? (single ? VECTOR_CANVAS_SIZE.width : group.maxX)
      : action === 'centerX' ? (single ? VECTOR_CANVAS_SIZE.width / 2 : (group.minX + group.maxX) / 2)
        : action === 'top' ? (single ? 0 : group.minY)
          : action === 'bottom' ? (single ? VECTOR_CANVAS_SIZE.height : group.maxY)
            : (single ? VECTOR_CANVAS_SIZE.height / 2 : (group.minY + group.maxY) / 2);

  return items.map(item => {
    if (!selectedSet.has(item.id)) return item;
    const bounds = getItemBounds(item);
    const dx = action === 'left' ? target - bounds.minX
      : action === 'right' ? target - bounds.maxX
        : action === 'centerX' ? target - (bounds.minX + bounds.maxX) / 2 : 0;
    const dy = action === 'top' ? target - bounds.minY
      : action === 'bottom' ? target - bounds.maxY
        : action === 'centerY' ? target - (bounds.minY + bounds.maxY) / 2 : 0;
    return { ...item, x: item.x + dx, y: item.y + dy };
  });
}

export function distributeCanvasItems(
  items: CanvasVectorItem[],
  selectedIds: string[],
  axis: 'x' | 'y',
): CanvasVectorItem[] {
  const selected = new Set(selectedIds);
  const selectedItems = items.filter(item => selected.has(item.id));
  if (selectedItems.length < 3) return items;
  const sorted = [...selectedItems].sort((a, b) => {
    const aBounds = getItemBounds(a);
    const bBounds = getItemBounds(b);
    return axis === 'x'
      ? (aBounds.minX + aBounds.maxX) - (bBounds.minX + bBounds.maxX)
      : (aBounds.minY + aBounds.maxY) - (bBounds.minY + bBounds.maxY);
  });
  const centers = sorted.map(item => {
    const bounds = getItemBounds(item);
    return axis === 'x' ? (bounds.minX + bounds.maxX) / 2 : (bounds.minY + bounds.maxY) / 2;
  });
  const step = (centers[centers.length - 1] - centers[0]) / (centers.length - 1);
  const offsets = new Map<string, number>();
  sorted.forEach((item, index) => offsets.set(item.id, centers[0] + step * index - centers[index]));
  return items.map(item => {
    const delta = offsets.get(item.id);
    if (delta === undefined) return item;
    return axis === 'x' ? { ...item, x: item.x + delta } : { ...item, y: item.y + delta };
  });
}
