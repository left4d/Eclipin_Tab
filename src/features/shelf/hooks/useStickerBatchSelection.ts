import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Sticker } from '@/shared/types';
import { clampStickerPositionToViewport } from '../utils/zenShelfUtils';

interface UseStickerBatchSelectionOptions {
    stickers: Sticker[];
    selectedStickerId: string | null;
    pageIndex: number;
    viewportScale: number;
    viewportWidth: number;
    bounceBackClassName: string;
    selectSticker: (id: string | null) => void;
    updateSticker: (id: string, updates: Partial<Sticker>) => void;
    deleteSticker: (id: string) => void;
}

export const useStickerBatchSelection = ({
    stickers,
    selectedStickerId,
    pageIndex,
    viewportScale,
    viewportWidth,
    bounceBackClassName,
    selectSticker,
    updateSticker,
    deleteSticker,
}: UseStickerBatchSelectionOptions) => {
    const [batchSelectedStickerIds, setBatchSelectedStickerIds] = useState<string[]>([]);
    const [isAnyDragging, setIsAnyDragging] = useState(false);
    const batchDragStartRef = useRef<Map<string, { x: number; y: number }>>(new Map());

    const selectedStickerIds = useMemo(() => (
        batchSelectedStickerIds.length > 0
            ? batchSelectedStickerIds
            : selectedStickerId ? [selectedStickerId] : []
    ), [batchSelectedStickerIds, selectedStickerId]);

    const getStickerScrollOffset = useCallback((sticker: Sticker | undefined) => {
        if (pageIndex !== 1 || sticker?.positionMode === 'viewport') return 0;
        const scrollTop = document.querySelector<HTMLElement>('[data-widget-scroll-page="1"]')?.scrollTop ?? 0;
        return scrollTop / viewportScale;
    }, [pageIndex, viewportScale]);

    useEffect(() => {
        const stickerIds = new Set(stickers.map((sticker) => sticker.id));
        setBatchSelectedStickerIds((previous) => {
            const next = previous.filter((id) => stickerIds.has(id));
            return next.length === previous.length ? previous : next;
        });
    }, [stickers]);

    const handleStickerDragStart = useCallback(() => setIsAnyDragging(true), []);
    const handleStickerDragEnd = useCallback(() => {
        setIsAnyDragging(false);
        batchDragStartRef.current = new Map();
    }, []);

    const toggleBatchSelect = useCallback((sticker: Sticker, seedStickerId?: string | null) => {
        setBatchSelectedStickerIds((previous) => {
            const seeded = previous.length === 0 && seedStickerId && seedStickerId !== sticker.id
                ? [seedStickerId]
                : previous;
            return seeded.includes(sticker.id)
                ? seeded.filter((id) => id !== sticker.id)
                : [...seeded, sticker.id];
        });
        selectSticker(null);
    }, [selectSticker]);

    const ensureBatchDragStart = useCallback((ids: string[]) => {
        if (batchDragStartRef.current.size > 0) return;
        batchDragStartRef.current = new Map(
            stickers
                .filter((sticker) => ids.includes(sticker.id))
                .map((sticker) => [sticker.id, { x: sticker.x, y: sticker.y }]),
        );
    }, [stickers]);

    const previewIds = useCallback((ids: string[], excludedId: string | null, dx: number, dy: number) => {
        if (ids.length === 0) return;
        ensureBatchDragStart(ids);
        ids.forEach((id) => {
            if (id === excludedId) return;
            const startPosition = batchDragStartRef.current.get(id);
            const stickerElement = document.querySelector<HTMLElement>(`[data-sticker-id="${id}"]`);
            if (!startPosition || !stickerElement) return;
            stickerElement.style.left = `${startPosition.x + dx}px`;
            stickerElement.style.top = `${startPosition.y + dy}px`;
        });
    }, [ensureBatchDragStart]);

    const cancelIds = useCallback((ids: string[], excludedId: string | null) => {
        ids.forEach((id) => {
            if (id === excludedId) return;
            const startPosition = batchDragStartRef.current.get(id);
            const stickerElement = document.querySelector<HTMLElement>(`[data-sticker-id="${id}"]`);
            if (!startPosition || !stickerElement) return;
            stickerElement.style.left = `${startPosition.x}px`;
            stickerElement.style.top = `${startPosition.y}px`;
        });
        batchDragStartRef.current = new Map();
    }, []);

    const commitIds = useCallback((ids: string[], excludedId: string | null, dx: number, dy: number) => {
        if (ids.length === 0) return;
        ensureBatchDragStart(ids);
        ids.forEach((id) => {
            if (id === excludedId) return;
            const startPosition = batchDragStartRef.current.get(id);
            const stickerElement = document.querySelector<HTMLElement>(`[data-sticker-id="${id}"]`);
            if (!startPosition || !stickerElement) return;

            const sticker = stickers.find(item => item.id === id);
            const scrollOffset = getStickerScrollOffset(sticker);
            const nextPosition = { x: startPosition.x + dx, y: startPosition.y + dy };
            const viewportPosition = { x: nextPosition.x, y: nextPosition.y - scrollOffset };
            const stickerVisual = stickerElement.querySelector<HTMLElement>('[data-sticker-visual="true"]') ?? stickerElement;
            const clampedViewport = clampStickerPositionToViewport(
                viewportPosition.x,
                viewportPosition.y,
                stickerVisual,
                viewportScale,
                viewportWidth,
            );
            const clampedPosition = { x: clampedViewport.x, y: clampedViewport.y + scrollOffset };
            const needsBounce = Math.abs(clampedPosition.x - nextPosition.x) > 0.1
                || Math.abs(clampedPosition.y - nextPosition.y) > 0.1;

            updateSticker(id, clampedPosition);
            if (!needsBounce) return;

            stickerElement.classList.add(bounceBackClassName);
            stickerElement.style.left = `${clampedPosition.x}px`;
            stickerElement.style.top = `${clampedPosition.y}px`;
            window.setTimeout(() => stickerElement.classList.remove(bounceBackClassName), 350);
        });
        batchDragStartRef.current = new Map();
    }, [bounceBackClassName, ensureBatchDragStart, getStickerScrollOffset, stickers, updateSticker, viewportScale, viewportWidth]);

    const previewBatchPosition = useCallback((activeStickerId: string, dx: number, dy: number) => {
        if (!selectedStickerIds.includes(activeStickerId) || selectedStickerIds.length <= 1) return;
        previewIds(selectedStickerIds, activeStickerId, dx, dy);
    }, [previewIds, selectedStickerIds]);

    const commitBatchPosition = useCallback((activeStickerId: string, dx: number, dy: number) => {
        if (!selectedStickerIds.includes(activeStickerId) || selectedStickerIds.length <= 1) return;
        commitIds(selectedStickerIds, activeStickerId, dx, dy);
    }, [commitIds, selectedStickerIds]);

    const previewExternalBatchPosition = useCallback((dx: number, dy: number) => {
        previewIds(selectedStickerIds, null, dx, dy);
    }, [previewIds, selectedStickerIds]);

    const commitExternalBatchPosition = useCallback((dx: number, dy: number) => {
        commitIds(selectedStickerIds, null, dx, dy);
    }, [commitIds, selectedStickerIds]);

    const cancelExternalBatchPosition = useCallback(() => {
        cancelIds(selectedStickerIds, null);
    }, [cancelIds, selectedStickerIds]);

    const deleteBatchSelection = useCallback((activeStickerId: string) => {
        const idsToDelete = selectedStickerIds.includes(activeStickerId)
            ? selectedStickerIds
            : [activeStickerId];
        idsToDelete.forEach((id) => deleteSticker(id));
        setBatchSelectedStickerIds([]);
        if (selectedStickerId && idsToDelete.includes(selectedStickerId)) selectSticker(null);
    }, [deleteSticker, selectSticker, selectedStickerId, selectedStickerIds]);

    return {
        batchSelectedStickerIds,
        selectedStickerIds,
        setBatchSelectedStickerIds,
        isAnyDragging,
        handleStickerDragStart,
        handleStickerDragEnd,
        toggleBatchSelect,
        previewBatchPosition,
        commitBatchPosition,
        previewExternalBatchPosition,
        commitExternalBatchPosition,
        cancelExternalBatchPosition,
        deleteBatchSelection,
    };
};
