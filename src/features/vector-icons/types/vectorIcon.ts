export interface VectorIconRecord {
  id: string;
  name: string;
  svg: string;
  viewBox: string;
  createdAt: number;
  updatedAt: number;
}

export type VectorIconMeta = Omit<VectorIconRecord, 'svg'>;

export type VectorPaintMode = 'existing' | 'stroke' | 'fill';

export interface VectorStyleOptions {
  color: string;
  strokeWidth: number;
  roundness: number;
  paintMode: VectorPaintMode;
}

export interface CanvasVectorItem {
  id: string;
  name: string;
  svg: string;
  viewBox: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  flipX: boolean;
  flipY: boolean;
  lockAspectRatio: boolean;
}

export type VectorIconPickerPurpose = 'dock' | 'sticker' | 'navigation';
