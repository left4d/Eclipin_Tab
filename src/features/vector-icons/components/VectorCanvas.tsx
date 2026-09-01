import { useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type PointerEvent } from 'react';
import { createId } from '@/shared/utils/id';
import type { CanvasVectorItem } from '../types/vectorIcon';
import { createPrimitiveSvg, type PrimitiveKind, VECTOR_CANVAS_SIZE } from '../utils/svgCompose';
import {
  boundsFromPoints,
  boundsOverlap,
  clamp,
  getItemBounds,
  getSelectionBounds,
  snapToStep,
} from '../utils/vectorCanvasGeometry';
import {
  alignCanvasItems,
  distributeCanvasItems,
  normalizeCanvasRotation,
  reorderCanvasItems,
} from '../utils/vectorCanvasOperations';
import { extractSvgBody } from '../utils/svgSanitizer';
import styles from './VectorCanvas.module.css';

type HistoryMode = 'commit' | 'preview';

interface VectorCanvasProps {
  items: CanvasVectorItem[];
  selectedIds: string[];
  onItemsChange: (items: CanvasVectorItem[], mode?: HistoryMode) => void;
  onSelectedIdsChange: (ids: string[]) => void;
  onDropLibraryIcon: (id: string, x: number, y: number) => void;
  onSaveCanvas: () => void;
  onBeginTransform: () => void;
  onCommitTransform: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

interface Point { x: number; y: number }
interface MoveState { kind: 'move'; start: Point; originals: CanvasVectorItem[] }
interface ResizeState {
  kind: 'resize';
  original: CanvasVectorItem;
  anchor: Point;
  axisX: Point;
  axisY: Point;
}
interface RotateState { kind: 'rotate'; id: string; center: Point; startAngle: number; startRotation: number }
interface MarqueeState { kind: 'marquee'; start: Point; current: Point; baseSelected: string[] }
interface PrimitiveState {
  kind: 'primitive';
  primitiveKind: PrimitiveKind;
  id: string;
  start: Point;
  primitive: ReturnType<typeof createPrimitiveSvg>;
}
type InteractionState = MoveState | ResizeState | RotateState | MarqueeState | PrimitiveState;

const MIN_ITEM_DIM = 18;
const MAX_ITEM_DIM = 560;
const SNAP_GUIDE_THRESHOLD = 6;
const ZOOM_STEPS = [75, 100, 125, 150, 175, 200];

function getSvgPoint(event: { clientX: number; clientY: number; currentTarget: SVGSVGElement }): Point {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / Math.max(1, rect.width)) * VECTOR_CANVAS_SIZE.width,
    y: ((event.clientY - rect.top) / Math.max(1, rect.height)) * VECTOR_CANVAS_SIZE.height,
  };
}

function itemTransform(item: CanvasVectorItem): string | undefined {
  const centerX = item.x + item.width / 2;
  const centerY = item.y + item.height / 2;
  const transforms: string[] = [];
  if (item.rotation) transforms.push(`rotate(${item.rotation} ${centerX} ${centerY})`);
  if (item.flipX || item.flipY) {
    transforms.push(`translate(${centerX} ${centerY}) scale(${item.flipX ? -1 : 1} ${item.flipY ? -1 : 1}) translate(${-centerX} ${-centerY})`);
  }
  return transforms.length > 0 ? transforms.join(' ') : undefined;
}

export const VectorCanvas = ({
  items,
  selectedIds,
  onItemsChange,
  onSelectedIdsChange,
  onDropLibraryIcon,
  onSaveCanvas,
  onBeginTransform,
  onCommitTransform,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: VectorCanvasProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<InteractionState | null>(null);
  const [marquee, setMarquee] = useState<{ start: Point; current: Point } | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [gridSize, setGridSize] = useState(10);
  const [zoom, setZoom] = useState(100);
  const [guide, setGuide] = useState<{ x: boolean; y: boolean }>({ x: false, y: false });
  const [primitiveTool, setPrimitiveTool] = useState<PrimitiveKind | null>(null);
  const [primitivePreview, setPrimitivePreview] = useState<CanvasVectorItem | null>(null);
  const svgBodyCacheRef = useRef(new Map<string, { svg: string; body: string }>());
  const selectedItems = useMemo(() => items.filter(item => selectedIds.includes(item.id)), [items, selectedIds]);
  const selected = selectedItems.length === 1 ? selectedItems[0] : null;
  const selectionBounds = useMemo(() => getSelectionBounds(selectedItems), [selectedItems]);

  useEffect(() => {
    const activeIds = new Set(items.map(item => item.id));
    for (const id of svgBodyCacheRef.current.keys()) {
      if (!activeIds.has(id)) svgBodyCacheRef.current.delete(id);
    }
  }, [items]);

  useEffect(() => () => svgBodyCacheRef.current.clear(), []);

  const getScopedSvgBody = (item: CanvasVectorItem): string => {
    const cached = svgBodyCacheRef.current.get(item.id);
    if (cached?.svg === item.svg) return cached.body;
    const body = extractSvgBody(item.svg, item.id);
    svgBodyCacheRef.current.set(item.id, { svg: item.svg, body });
    return body;
  };

  const commitItems = (next: CanvasVectorItem[]) => onItemsChange(next, 'commit');

  const createPrimitiveItem = (interaction: PrimitiveState, current: Point): CanvasVectorItem | null => {
    const dx = current.x - interaction.start.x;
    const dy = current.y - interaction.start.y;
    if (Math.hypot(dx, dy) < 6) return null;
    const isDirectional = interaction.primitiveKind === 'line' || interaction.primitiveKind === 'arrow';
    const keepSquare = interaction.primitiveKind === 'circle' || interaction.primitiveKind === 'plus' || interaction.primitiveKind === 'star';
    let x: number;
    let y: number;
    let width: number;
    let height: number;
    let rotation = 0;

    if (isDirectional) {
      width = clamp(Math.hypot(dx, dy), MIN_ITEM_DIM, MAX_ITEM_DIM);
      height = 44;
      const center = { x: (interaction.start.x + current.x) / 2, y: (interaction.start.y + current.y) / 2 };
      x = clamp(center.x - width / 2, 0, VECTOR_CANVAS_SIZE.width - width);
      y = clamp(center.y - height / 2, 0, VECTOR_CANVAS_SIZE.height - height);
      rotation = Math.atan2(dy, dx) * 180 / Math.PI;
    } else if (keepSquare) {
      const signX = dx >= 0 ? 1 : -1;
      const signY = dy >= 0 ? 1 : -1;
      const availableX = signX > 0 ? VECTOR_CANVAS_SIZE.width - interaction.start.x : interaction.start.x;
      const availableY = signY > 0 ? VECTOR_CANVAS_SIZE.height - interaction.start.y : interaction.start.y;
      const side = clamp(Math.min(Math.max(Math.abs(dx), Math.abs(dy)), availableX, availableY), MIN_ITEM_DIM, MAX_ITEM_DIM);
      width = side;
      height = side;
      x = signX > 0 ? interaction.start.x : interaction.start.x - side;
      y = signY > 0 ? interaction.start.y : interaction.start.y - side;
      x = clamp(x, 0, VECTOR_CANVAS_SIZE.width - side);
      y = clamp(y, 0, VECTOR_CANVAS_SIZE.height - side);
    } else {
      width = clamp(Math.abs(dx), MIN_ITEM_DIM, MAX_ITEM_DIM);
      height = clamp(Math.abs(dy), MIN_ITEM_DIM, MAX_ITEM_DIM);
      x = dx >= 0 ? interaction.start.x : interaction.start.x - width;
      y = dy >= 0 ? interaction.start.y : interaction.start.y - height;
      x = clamp(x, 0, VECTOR_CANVAS_SIZE.width - width);
      y = clamp(y, 0, VECTOR_CANVAS_SIZE.height - height);
    }

    return {
      id: interaction.id,
      name: interaction.primitive.name,
      svg: interaction.primitive.svg,
      viewBox: interaction.primitive.viewBox,
      x, y, width, height, rotation, opacity: 1, flipX: false, flipY: false,
      lockAspectRatio: keepSquare || isDirectional,
    };
  };

  const selectPrimitiveTool = (kind: PrimitiveKind) => {
    setPrimitiveTool(current => current === kind ? null : kind);
    setPrimitivePreview(null);
    onSelectedIdsChange([]);
  };

  const removeSelected = () => {
    if (selectedIds.length === 0) return;
    const selectedSet = new Set(selectedIds);
    commitItems(items.filter(item => !selectedSet.has(item.id)));
    onSelectedIdsChange([]);
  };

  const duplicateSelected = () => {
    if (selectedItems.length === 0) return;
    const copies = selectedItems.map(item => ({
      ...item,
      id: createId('vector-canvas'),
      name: `${item.name} 副本`,
      x: clamp(item.x + 14, 0, VECTOR_CANVAS_SIZE.width - item.width),
      y: clamp(item.y + 14, 0, VECTOR_CANVAS_SIZE.height - item.height),
    }));
    commitItems([...items, ...copies]);
    onSelectedIdsChange(copies.map(item => item.id));
  };

  const updateSelected = (updater: (item: CanvasVectorItem) => CanvasVectorItem) => {
    const selectedSet = new Set(selectedIds);
    commitItems(items.map(item => selectedSet.has(item.id) ? updater(item) : item));
  };

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    panelRef.current?.focus({ preventScroll: true });
    const target = event.target instanceof Element ? event.target : null;
    const resizeHandle = target?.closest('[data-vector-resize-handle]');
    const rotateHandle = target?.closest('[data-vector-rotate-handle]');
    const host = target?.closest('[data-vector-item-id]');
    const id = resizeHandle?.getAttribute('data-vector-resize-handle')
      ?? rotateHandle?.getAttribute('data-vector-rotate-handle')
      ?? host?.getAttribute('data-vector-item-id');
    const item = items.find(candidate => candidate.id === id);
    const point = getSvgPoint(event);

    if (primitiveTool) {
      interactionRef.current = {
        kind: 'primitive',
        primitiveKind: primitiveTool,
        id: createId('vector-canvas'),
        start: point,
        primitive: createPrimitiveSvg(primitiveTool),
      };
      setPrimitivePreview(null);
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
      return;
    }

    if (item && resizeHandle) {
      const radians = item.rotation * Math.PI / 180;
      const axisX = { x: Math.cos(radians), y: Math.sin(radians) };
      const axisY = { x: -Math.sin(radians), y: Math.cos(radians) };
      const center = { x: item.x + item.width / 2, y: item.y + item.height / 2 };
      const anchor = {
        x: center.x - axisX.x * item.width / 2 - axisY.x * item.height / 2,
        y: center.y - axisX.y * item.width / 2 - axisY.y * item.height / 2,
      };
      interactionRef.current = { kind: 'resize', original: item, anchor, axisX, axisY };
      onBeginTransform();
    } else if (item && rotateHandle) {
      const center = { x: item.x + item.width / 2, y: item.y + item.height / 2 };
      interactionRef.current = {
        kind: 'rotate', id: item.id, center,
        startAngle: Math.atan2(point.y - center.y, point.x - center.x),
        startRotation: item.rotation,
      };
      onBeginTransform();
    } else if (item) {
      if (event.shiftKey) {
        onSelectedIdsChange(selectedIds.includes(item.id) ? selectedIds.filter(selectedId => selectedId !== item.id) : [...selectedIds, item.id]);
        event.preventDefault();
        return;
      }
      const movingIds = selectedIds.includes(item.id) ? selectedIds : [item.id];
      onSelectedIdsChange(movingIds);
      interactionRef.current = { kind: 'move', start: point, originals: items.filter(candidate => movingIds.includes(candidate.id)) };
      onBeginTransform();
    } else {
      const baseSelected = event.shiftKey ? selectedIds : [];
      if (!event.shiftKey) onSelectedIdsChange([]);
      interactionRef.current = { kind: 'marquee', start: point, current: point, baseSelected };
      setMarquee({ start: point, current: point });
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const interaction = interactionRef.current;
    if (!interaction) return;
    const point = getSvgPoint(event);

    if (interaction.kind === 'primitive') {
      setPrimitivePreview(createPrimitiveItem(interaction, point));
      return;
    }

    if (interaction.kind === 'marquee') {
      const next = { ...interaction, current: point };
      interactionRef.current = next;
      setMarquee({ start: next.start, current: point });
      const selection = boundsFromPoints(next.start, point);
      const matches = items.filter(item => boundsOverlap(getItemBounds(item), selection)).map(item => item.id);
      onSelectedIdsChange(Array.from(new Set([...next.baseSelected, ...matches])));
      return;
    }

    if (interaction.kind === 'move') {
      const originalBounds = getSelectionBounds(interaction.originals);
      if (!originalBounds) return;
      let dx = point.x - interaction.start.x;
      let dy = point.y - interaction.start.y;
      let guideX = false;
      let guideY = false;
      if (snapEnabled) {
        dx += snapToStep(originalBounds.minX + dx, gridSize) - (originalBounds.minX + dx);
        dy += snapToStep(originalBounds.minY + dy, gridSize) - (originalBounds.minY + dy);
        const centerX = (originalBounds.minX + originalBounds.maxX) / 2 + dx;
        const centerY = (originalBounds.minY + originalBounds.maxY) / 2 + dy;
        if (Math.abs(centerX - VECTOR_CANVAS_SIZE.width / 2) <= SNAP_GUIDE_THRESHOLD) {
          dx += VECTOR_CANVAS_SIZE.width / 2 - centerX;
          guideX = true;
        }
        if (Math.abs(centerY - VECTOR_CANVAS_SIZE.height / 2) <= SNAP_GUIDE_THRESHOLD) {
          dy += VECTOR_CANVAS_SIZE.height / 2 - centerY;
          guideY = true;
        }
      }
      dx = clamp(dx, -originalBounds.minX, VECTOR_CANVAS_SIZE.width - originalBounds.maxX);
      dy = clamp(dy, -originalBounds.minY, VECTOR_CANVAS_SIZE.height - originalBounds.maxY);
      setGuide({ x: guideX, y: guideY });
      const originals = new Map(interaction.originals.map(item => [item.id, item]));
      onItemsChange(items.map(item => {
        const original = originals.get(item.id);
        return original ? { ...item, x: original.x + dx, y: original.y + dy } : item;
      }), 'preview');
      return;
    }

    if (interaction.kind === 'resize') {
      const { original, anchor, axisX, axisY } = interaction;
      const vector = { x: point.x - anchor.x, y: point.y - anchor.y };
      let width = clamp(vector.x * axisX.x + vector.y * axisX.y, MIN_ITEM_DIM, MAX_ITEM_DIM);
      let height = clamp(vector.x * axisY.x + vector.y * axisY.y, MIN_ITEM_DIM, MAX_ITEM_DIM);
      if (original.lockAspectRatio) {
        const scale = Math.max(width / original.width, height / original.height);
        width = clamp(original.width * scale, MIN_ITEM_DIM, MAX_ITEM_DIM);
        height = clamp(original.height * scale, MIN_ITEM_DIM, MAX_ITEM_DIM);
      }
      const fitScale = Math.min(1, (VECTOR_CANVAS_SIZE.width - 8) / width, (VECTOR_CANVAS_SIZE.height - 8) / height);
      width *= fitScale;
      height *= fitScale;
      const center = {
        x: anchor.x + axisX.x * width / 2 + axisY.x * height / 2,
        y: anchor.y + axisX.y * width / 2 + axisY.y * height / 2,
      };
      const x = clamp(center.x - width / 2, 0, VECTOR_CANVAS_SIZE.width - width);
      const y = clamp(center.y - height / 2, 0, VECTOR_CANVAS_SIZE.height - height);
      onItemsChange(items.map(item => item.id === original.id ? { ...item, x, y, width, height } : item), 'preview');
      return;
    }

    const angle = Math.atan2(point.y - interaction.center.y, point.x - interaction.center.x);
    const degrees = (angle - interaction.startAngle) * 180 / Math.PI;
    const rotation = normalizeCanvasRotation(interaction.startRotation + degrees);
    onItemsChange(items.map(item => item.id === interaction.id ? { ...item, rotation } : item), 'preview');
  };

  const handlePointerEnd = (event: PointerEvent<SVGSVGElement>) => {
    const interaction = interactionRef.current;
    interactionRef.current = null;
    setMarquee(null);
    setGuide({ x: false, y: false });
    if (interaction?.kind === 'primitive') {
      const item = createPrimitiveItem(interaction, getSvgPoint(event));
      setPrimitivePreview(null);
      if (item) {
        commitItems([...items, item]);
        onSelectedIdsChange([item.id]);
        // 基础形状按一次放置一次：成功绘制后自动退出当前形状工具。
        setPrimitiveTool(null);
      }
    } else if (interaction && interaction.kind !== 'marquee') {
      onCommitTransform();
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handlePointerCancel = (event: PointerEvent<SVGSVGElement>) => {
    if (interactionRef.current?.kind === 'primitive') {
      interactionRef.current = null;
      setPrimitivePreview(null);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }
    handlePointerEnd(event);
  };

  const handleDrop = (event: DragEvent<SVGSVGElement>) => {
    event.preventDefault();
    const id = event.dataTransfer.getData('application/x-eclipin-vector-icon');
    if (!id) return;
    const point = getSvgPoint(event);
    onDropLibraryIcon(id, point.x, point.y);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.matches('input, textarea, select, button')) return;
    const meta = event.ctrlKey || event.metaKey;
    if (meta && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      onSelectedIdsChange(items.map(item => item.id));
      return;
    }
    if (meta && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      duplicateSelected();
      return;
    }
    if (meta && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) onRedo(); else onUndo();
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      removeSelected();
      return;
    }
    if (event.key === 'Escape') {
      setPrimitiveTool(null);
      setPrimitivePreview(null);
      onSelectedIdsChange([]);
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) || selectedIds.length === 0) return;
    event.preventDefault();
    const step = event.shiftKey ? 10 : 1;
    const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
    const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
    updateSelected(item => ({
      ...item,
      x: clamp(item.x + dx, 0, VECTOR_CANVAS_SIZE.width - item.width),
      y: clamp(item.y + dy, 0, VECTOR_CANVAS_SIZE.height - item.height),
    }));
  };

  const zoomBy = (direction: -1 | 1) => {
    const index = ZOOM_STEPS.findIndex(value => value === zoom);
    const nextIndex = clamp(index + direction, 0, ZOOM_STEPS.length - 1);
    setZoom(ZOOM_STEPS[nextIndex]);
  };

  return (
    <div ref={panelRef} className={styles.canvasPanel} tabIndex={0} onKeyDown={handleKeyDown}>
      <div className={styles.canvasToolbar}>
        <div className={styles.canvasToolbarGroup}>
          <span>形状</span>
          <button type="button" className={primitiveTool === 'circle' ? styles.activeButton : ''} aria-pressed={primitiveTool === 'circle'} title="选择后在画布按住拖拽放置" onClick={() => selectPrimitiveTool('circle')}>圆</button>
          <button type="button" className={primitiveTool === 'roundedRect' ? styles.activeButton : ''} aria-pressed={primitiveTool === 'roundedRect'} title="选择后在画布按住拖拽放置" onClick={() => selectPrimitiveTool('roundedRect')}>矩形</button>
          <button type="button" className={primitiveTool === 'line' ? styles.activeButton : ''} aria-pressed={primitiveTool === 'line'} title="选择后在画布按住拖拽放置" onClick={() => selectPrimitiveTool('line')}>线</button>
          <button type="button" className={primitiveTool === 'plus' ? styles.activeButton : ''} aria-pressed={primitiveTool === 'plus'} title="选择后在画布按住拖拽放置" onClick={() => selectPrimitiveTool('plus')}>加号</button>
          <button type="button" className={primitiveTool === 'triangle' ? styles.activeButton : ''} aria-pressed={primitiveTool === 'triangle'} title="选择后在画布按住拖拽放置" onClick={() => selectPrimitiveTool('triangle')}>三角</button>
          <button type="button" className={primitiveTool === 'star' ? styles.activeButton : ''} aria-pressed={primitiveTool === 'star'} title="选择后在画布按住拖拽放置" onClick={() => selectPrimitiveTool('star')}>星</button>
          <button type="button" className={primitiveTool === 'arrow' ? styles.activeButton : ''} aria-pressed={primitiveTool === 'arrow'} title="选择后在画布按住拖拽放置" onClick={() => selectPrimitiveTool('arrow')}>箭头</button>
        </div>
        <div className={styles.canvasToolbarGroup}>
          <button type="button" onClick={onUndo} disabled={!canUndo} title="撤销 Ctrl/⌘+Z">↶</button>
          <button type="button" onClick={onRedo} disabled={!canRedo} title="重做 Ctrl/⌘+Shift+Z">↷</button>
          <button type="button" className={snapEnabled ? styles.activeButton : ''} onClick={() => setSnapEnabled(value => !value)}>吸附</button>
          <select className={`field ${styles.compactSelect}`} value={gridSize} onChange={event => setGridSize(Number(event.target.value))} disabled={!snapEnabled} aria-label="网格吸附尺寸">
            <option value="5">5</option><option value="10">10</option><option value="20">20</option>
          </select>
          <button type="button" onClick={() => zoomBy(-1)} disabled={zoom === ZOOM_STEPS[0]}>−</button>
          <button type="button" className={styles.zoomLabel} onClick={() => setZoom(100)}>{zoom}%</button>
          <button type="button" onClick={() => zoomBy(1)} disabled={zoom === ZOOM_STEPS[ZOOM_STEPS.length - 1]}>＋</button>
          <button type="button" onClick={() => { commitItems([]); onSelectedIdsChange([]); }} disabled={items.length === 0}>清空</button>
          <button type="button" className={styles.primaryButton} onClick={onSaveCanvas} disabled={items.length === 0}>保存组合</button>
        </div>
      </div>

      <div className={styles.canvasViewport}>
        <svg
          className={`${styles.vectorCanvas} ${primitiveTool ? styles.shapePlacementMode : ''}`}
          style={{ width: `${zoom}%` }}
          viewBox={`0 0 ${VECTOR_CANVAS_SIZE.width} ${VECTOR_CANVAS_SIZE.height}`}
          role="img"
          aria-label="矢量图标拼接画布"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerCancel}
          onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }}
          onDrop={handleDrop}
        >
          <defs>
            <pattern id="vector-grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
              <path d={`M${gridSize} 0H0V${gridSize}`} className={styles.canvasGridLine} fill="none" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" className={styles.canvasBackground} />
          <rect width="100%" height="100%" fill="url(#vector-grid)" pointerEvents="none" />
          {guide.x && <line x1={VECTOR_CANVAS_SIZE.width / 2} y1="0" x2={VECTOR_CANVAS_SIZE.width / 2} y2={VECTOR_CANVAS_SIZE.height} className={styles.snapGuide} />}
          {guide.y && <line x1="0" y1={VECTOR_CANVAS_SIZE.height / 2} x2={VECTOR_CANVAS_SIZE.width} y2={VECTOR_CANVAS_SIZE.height / 2} className={styles.snapGuide} />}
          {items.map(item => (
            <g key={item.id} data-vector-item-id={item.id} transform={itemTransform(item)} opacity={item.opacity}>
              <svg
                x={item.x}
                y={item.y}
                width={item.width}
                height={item.height}
                viewBox={item.viewBox}
                preserveAspectRatio="none"
                className={styles.canvasItem}
                dangerouslySetInnerHTML={{ __html: getScopedSvgBody(item) }}
              />
            </g>
          ))}
          {primitivePreview && (
            <g transform={itemTransform(primitivePreview)} opacity="0.72" pointerEvents="none">
              <svg x={primitivePreview.x} y={primitivePreview.y} width={primitivePreview.width} height={primitivePreview.height} viewBox={primitivePreview.viewBox} preserveAspectRatio="none" className={styles.canvasItem} dangerouslySetInnerHTML={{ __html: getScopedSvgBody(primitivePreview) }} />
              <rect x={primitivePreview.x - 2} y={primitivePreview.y - 2} width={primitivePreview.width + 4} height={primitivePreview.height + 4} rx="6" className={styles.primitivePreviewBounds} />
            </g>
          )}
          {selected && (
            <g transform={selected.rotation ? `rotate(${selected.rotation} ${selected.x + selected.width / 2} ${selected.y + selected.height / 2})` : undefined}>
              <rect x={selected.x - 3} y={selected.y - 3} width={selected.width + 6} height={selected.height + 6} rx="8" className={styles.canvasSelection} pointerEvents="none" />
              <line x1={selected.x + selected.width / 2} y1={selected.y - 3} x2={selected.x + selected.width / 2} y2={selected.y - 24} className={styles.rotateStem} pointerEvents="none" />
              <circle data-vector-rotate-handle={selected.id} cx={selected.x + selected.width / 2} cy={selected.y - 27} r="7" className={styles.canvasRotateHandle} />
              <circle data-vector-resize-handle={selected.id} cx={selected.x + selected.width + 3} cy={selected.y + selected.height + 3} r="8" className={styles.canvasResizeHandle} />
            </g>
          )}
          {!selected && selectionBounds && (
            <rect x={selectionBounds.minX - 4} y={selectionBounds.minY - 4} width={selectionBounds.maxX - selectionBounds.minX + 8} height={selectionBounds.maxY - selectionBounds.minY + 8} rx="8" className={styles.canvasMultiSelection} pointerEvents="none" />
          )}
          {marquee && (() => {
            const bounds = boundsFromPoints(marquee.start, marquee.current);
            return <rect x={bounds.minX} y={bounds.minY} width={bounds.maxX - bounds.minX} height={bounds.maxY - bounds.minY} className={styles.marqueeSelection} pointerEvents="none" />;
          })()}
        </svg>
      </div>

      <div className={styles.canvasInspector}>
        {selectedItems.length > 0 ? (
          <>
            <div className={styles.selectionSummary}>
              <strong>{selected ? selected.name : `已选择 ${selectedItems.length} 个元素`}</strong>
              <span>拖空白框选 · Shift 多选 · 方向键微调 · Ctrl/⌘+D 复制</span>
            </div>
            <div className={styles.inspectorActions}>
              <button type="button" onClick={duplicateSelected}>复制</button>
              <button type="button" onClick={() => commitItems(reorderCanvasItems(items, selectedIds, 'back'))}>置底</button>
              <button type="button" onClick={() => commitItems(reorderCanvasItems(items, selectedIds, 'backward'))}>下移</button>
              <button type="button" onClick={() => commitItems(reorderCanvasItems(items, selectedIds, 'forward'))}>上移</button>
              <button type="button" onClick={() => commitItems(reorderCanvasItems(items, selectedIds, 'front'))}>置顶</button>
            </div>
            <div className={styles.inspectorActions}>
              <button type="button" onClick={() => commitItems(alignCanvasItems(items, selectedIds, 'left'))}>左</button>
              <button type="button" onClick={() => commitItems(alignCanvasItems(items, selectedIds, 'centerX'))}>水平中</button>
              <button type="button" onClick={() => commitItems(alignCanvasItems(items, selectedIds, 'right'))}>右</button>
              <button type="button" onClick={() => commitItems(alignCanvasItems(items, selectedIds, 'top'))}>上</button>
              <button type="button" onClick={() => commitItems(alignCanvasItems(items, selectedIds, 'centerY'))}>垂直中</button>
              <button type="button" onClick={() => commitItems(alignCanvasItems(items, selectedIds, 'bottom'))}>下</button>
              {selectedItems.length >= 3 && <button type="button" onClick={() => commitItems(distributeCanvasItems(items, selectedIds, 'x'))}>横向均分</button>}
              {selectedItems.length >= 3 && <button type="button" onClick={() => commitItems(distributeCanvasItems(items, selectedIds, 'y'))}>纵向均分</button>}
            </div>
            {selected && (
              <div className={styles.inspectorControls}>
                <label><span>角度 {Math.round(selected.rotation)}°</span><input type="range" className="range" min="-180" max="180" step="1" value={selected.rotation} onChange={event => updateSelected(item => ({ ...item, rotation: Number(event.target.value) }))} /></label>
                <label><span>透明度 {Math.round(selected.opacity * 100)}%</span><input type="range" className="range" min="0.1" max="1" step="0.05" value={selected.opacity} onChange={event => updateSelected(item => ({ ...item, opacity: Number(event.target.value) }))} /></label>
                <button type="button" className={selected.lockAspectRatio ? styles.activeButton : ''} onClick={() => updateSelected(item => ({ ...item, lockAspectRatio: !item.lockAspectRatio }))}>锁比例</button>
                <button type="button" onClick={() => updateSelected(item => ({ ...item, flipX: !item.flipX }))}>水平翻转</button>
                <button type="button" onClick={() => updateSelected(item => ({ ...item, flipY: !item.flipY }))}>垂直翻转</button>
              </div>
            )}
            <button type="button" className={styles.dangerButton} onClick={removeSelected}>移除</button>
          </>
        ) : <span>拖入图标，或先选择基础形状后在画布按住拖拽放置。未选择形状工具时，拖动空白区域可框选多个元素。</span>}
      </div>
    </div>
  );
};
