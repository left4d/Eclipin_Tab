import { useCallback, useEffect, useRef, type ChangeEvent } from 'react';
import type { StickerInput } from '@/shared/types';
import { IMAGE_MAX_WIDTH } from '@/shared/types';
import { compressStickerImageToBlob } from '@/features/theme/utils/imageCompression';
import { ensureVisibleSvgPaint } from '@/features/vector-icons/utils/svgSanitizer';
import { VECTOR_ICON_DEFAULT_DISPLAY_SIZE } from '@/features/vector-icons/utils/vectorIconSizing';
import { db } from '@/shared/utils/db';
import { isEditableElement } from '../utils/zenShelfUtils';

const STICKER_IMAGE_PREFIX = 'stickerimg_';
const DEFAULT_SVG_SIZE = 256;

export interface StickerImagePlacement {
  x: number;
  y: number;
}

export interface StickerImageAddOptions {
  presentation?: 'default' | 'vectorIcon';
}

interface StickerImageImportOptions {
  addSticker: (sticker: StickerInput) => string;
  currentPageScrollY: number;
  viewportScale: number;
}

const parsePositiveNumber = (value: string | null): number | null => {
  const match = value?.trim().match(/^([0-9]*\.?[0-9]+)(?:px)?$/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const getSvgDimensions = async (blob: Blob): Promise<{ width: number; height: number }> => {
  const source = await blob.text();
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
  if (doc.querySelector('parsererror')) throw new Error('SVG 内容无法解析。');
  const svg = doc.documentElement;
  if (!svg || svg.tagName.toLowerCase() !== 'svg') throw new Error('SVG 缺少根节点。');

  let width = parsePositiveNumber(svg.getAttribute('width'));
  let height = parsePositiveNumber(svg.getAttribute('height'));
  const viewBox = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  const viewBoxWidth = viewBox.length === 4 && Number.isFinite(viewBox[2]) && viewBox[2] > 0 ? viewBox[2] : null;
  const viewBoxHeight = viewBox.length === 4 && Number.isFinite(viewBox[3]) && viewBox[3] > 0 ? viewBox[3] : null;

  if (!width && !height && viewBoxWidth && viewBoxHeight) {
    width = viewBoxWidth;
    height = viewBoxHeight;
  } else if (width && !height && viewBoxWidth && viewBoxHeight) {
    height = width * viewBoxHeight / viewBoxWidth;
  } else if (height && !width && viewBoxWidth && viewBoxHeight) {
    width = height * viewBoxWidth / viewBoxHeight;
  }

  return {
    width: width || DEFAULT_SVG_SIZE,
    height: height || DEFAULT_SVG_SIZE,
  };
};

const getRasterDimensions = (blob: Blob): Promise<{ width: number; height: number }> => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.decoding = 'async';
  image.onload = () => {
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    URL.revokeObjectURL(url);
    if (width > 0 && height > 0) resolve({ width, height });
    else reject(new Error('图片尺寸无效。'));
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('图片无法解码。'));
  };
  image.src = url;
});

const getImageDimensions = (blob: Blob) => (
  blob.type === 'image/svg+xml' ? getSvgDimensions(blob) : getRasterDimensions(blob)
);

export const useStickerImageImport = ({
  addSticker,
  currentPageScrollY,
  viewportScale,
}: StickerImageImportOptions) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addImageBlob = useCallback(async (blob: Blob, placement?: StickerImagePlacement, options?: StickerImageAddOptions): Promise<void> => {
    const rawBlob = await compressStickerImageToBlob(blob);
    const compressedBlob = rawBlob.type === 'image/svg+xml' && options?.presentation === 'vectorIcon'
      ? new Blob([ensureVisibleSvgPaint(await rawBlob.text())], { type: 'image/svg+xml' })
      : rawBlob;
    // 先拿到尺寸再写数据库，避免解码失败后留下孤儿 Blob。SVG 直接解析 viewBox，
    // 不依赖 <img> 对无 width/height SVG 的兼容行为，这是“添加为图片贴纸”无反应的主要薄弱点。
    const { width: sourceWidth, height: sourceHeight } = await getImageDimensions(compressedBlob);
    const naturalDisplayWidth = Math.min(sourceWidth, IMAGE_MAX_WIDTH);
    // 图标库 SVG 都以统一的默认视觉尺寸进入桌面画布。
    // 这里把目标尺寸编码进 scale，StickerItem 再以 SVG 的标准 100px 逻辑宽度渲染，
    // 从而让新旧图标、不同源 viewBox 的图标拥有一致的初始大小。
    const scale = options?.presentation === 'vectorIcon'
      ? VECTOR_ICON_DEFAULT_DISPLAY_SIZE / naturalDisplayWidth
      : 1;
    const displayWidth = naturalDisplayWidth * scale;
    const displayHeight = Math.max(1, sourceHeight * naturalDisplayWidth / sourceWidth * scale);

    const id = `${STICKER_IMAGE_PREFIX}${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await db.saveStickerImage({ id, data: compressedBlob });

    const centerX = placement?.x ?? window.innerWidth / 2;
    const centerY = placement?.y ?? window.innerHeight / 2;
    addSticker({
      type: 'image',
      content: id,
      x: centerX / viewportScale - displayWidth / 2,
      y: (centerY + currentPageScrollY) / viewportScale - displayHeight / 2,
      scale,
      imagePresentation: options?.presentation ?? 'default',
    });
  }, [addSticker, currentPageScrollY, viewportScale]);

  const handleFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      await addImageBlob(file);
    } catch (error) {
      console.error('Failed to save sticker image:', error);
    }
  }, [addImageBlob]);

  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      if (isEditableElement(document.activeElement)) return;
      const imageItem = Array.from(event.clipboardData?.items ?? []).find((item) => item.type.startsWith('image/'));
      if (!imageItem) return;
      const blob = imageItem.getAsFile();
      if (!blob) return;

      event.preventDefault();
      try {
        await addImageBlob(blob);
      } catch (error) {
        console.error('Failed to save pasted sticker image:', error);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [addImageBlob]);

  return { fileInputRef, handleFileChange, addImageBlob };
};
