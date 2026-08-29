import { useCallback, useState } from 'react';
import { compressStickerImageToBlob } from '@/features/theme/utils/imageCompression';
import { ensureVisibleSvgPaint } from '@/features/vector-icons/utils/svgSanitizer';
import { db } from '@/shared/utils/db';
import type { StickerImageAddOptions, StickerImagePlacement } from './useStickerImageImport';

interface StickerVectorIconPickerOptions {
  addImageBlob: (blob: Blob, placement?: StickerImagePlacement, options?: StickerImageAddOptions) => Promise<void>;
  onSetSwapIcon?: (stickerId: string, imageId: string) => void;
}

type PickerTarget =
  | { kind: 'newSticker'; origin: StickerImagePlacement }
  | { kind: 'iconSwap'; stickerId: string };

const STICKER_IMAGE_PREFIX = 'stickerimg_';

function vectorDataUrlToBlob(dataUrl: string): Blob {
  const separator = dataUrl.indexOf(',');
  if (separator < 0) throw new Error('Invalid SVG data URL');
  const svg = decodeURIComponent(dataUrl.slice(separator + 1));
  return new Blob([svg], { type: 'image/svg+xml' });
}

const saveVectorIconBlob = async (dataUrl: string): Promise<string> => {
  const rawBlob = await compressStickerImageToBlob(vectorDataUrlToBlob(dataUrl));
  const svgText = ensureVisibleSvgPaint(await rawBlob.text());
  const blob = new Blob([svgText], { type: 'image/svg+xml' });
  const id = `${STICKER_IMAGE_PREFIX}${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  await db.saveStickerImage({ id, data: blob });
  return id;
};

export const useStickerVectorIconPicker = ({ addImageBlob, onSetSwapIcon }: StickerVectorIconPickerOptions) => {
  const [target, setTarget] = useState<PickerTarget | null>(null);

  const openAt = useCallback((x: number, y: number) => {
    setTarget({ kind: 'newSticker', origin: { x, y } });
  }, []);

  const openSwapFor = useCallback((stickerId: string) => {
    setTarget({ kind: 'iconSwap', stickerId });
  }, []);

  const close = useCallback(() => setTarget(null), []);

  const choose = useCallback(async (dataUrl: string) => {
    if (!target) return;
    try {
      if (target.kind === 'newSticker') {
        await addImageBlob(vectorDataUrlToBlob(dataUrl), target.origin, { presentation: 'vectorIcon' });
      } else {
        const imageId = await saveVectorIconBlob(dataUrl);
        onSetSwapIcon?.(target.stickerId, imageId);
      }
      setTarget(null);
    } catch (error) {
      console.error('Failed to choose vector icon:', error);
      throw error;
    }
  }, [addImageBlob, onSetSwapIcon, target]);

  return {
    isOpen: target !== null,
    openAt,
    openSwapFor,
    close,
    choose,
  };
};
