import { useMemo, useRef } from 'react';
import type { Sticker } from '@/shared/types';
import { useVisibleSessionMount } from '@/shared/hooks/useVisibleSessionMount';
import { getRenderableStickers } from '@/features/shelf/utils/stickerVisibility';

interface VisibleStickerWindowOptions {
  stickers: Sticker[];
  pageIndex: number;
  scrollY: number;
  viewportHeight: number;
  viewportScale: number;
  batchSelectedStickerIds: readonly string[];
  selectedStickerId: string | null;
  editingStickerId?: string;
}

/**
 * Retain stickers after they enter the warm window for the current visible
 * new-tab session. This prevents repeated DOM remount + bitmap decode when the
 * user scrolls away and back. Hiding the document clears the retained window;
 * image Blob URLs are released independently by useStickerImageSource.
 */
export const useVisibleStickerWindow = ({
  stickers,
  pageIndex,
  scrollY,
  viewportHeight,
  viewportScale,
  batchSelectedStickerIds,
  selectedStickerId,
  editingStickerId,
}: VisibleStickerWindowOptions): Sticker[] => {
  const retainVisitedStickers = useVisibleSessionMount(pageIndex === 1);
  const warmStickerIdsRef = useRef<Set<string>>(new Set());

  return useMemo(() => {
    const retainedIds = new Set(batchSelectedStickerIds);
    if (selectedStickerId) retainedIds.add(selectedStickerId);
    if (editingStickerId) retainedIds.add(editingStickerId);

    const nearbyStickers = getRenderableStickers(stickers, {
      pageIndex,
      scrollY,
      viewportHeight,
      viewportScale,
      retainedIds,
    });

    if (!retainVisitedStickers) {
      warmStickerIdsRef.current.clear();
      return nearbyStickers;
    }
    // Page 0 does not vertically cull stickers. Keep the second-page warm set
    // intact while the visible session flips between pages.
    if (pageIndex !== 1) return nearbyStickers;

    const liveIds = new Set(stickers.map((sticker) => sticker.id));
    for (const id of warmStickerIdsRef.current) {
      if (!liveIds.has(id)) warmStickerIdsRef.current.delete(id);
    }
    for (const sticker of nearbyStickers) warmStickerIdsRef.current.add(sticker.id);
    return stickers.filter((sticker) => warmStickerIdsRef.current.has(sticker.id));
  }, [batchSelectedStickerIds, editingStickerId, pageIndex, retainVisitedStickers, scrollY, selectedStickerId, stickers, viewportHeight, viewportScale]);
};
