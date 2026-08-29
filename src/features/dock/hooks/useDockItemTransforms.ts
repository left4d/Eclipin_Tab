import { useCallback, useMemo } from 'react';
import type { DockItem } from '@/shared/types';
import { createHorizontalStrategy } from '@/shared/utils/dragMath';
import type { DockDragState } from './useDragBase';

const horizontalStrategy = createHorizontalStrategy();

interface UseDockItemTransformsOptions {
    itemsLength: number;
    placeholderIndex: number | null;
    dragState: DockDragState;
    externalDragItem?: DockItem | null;
}

export const useDockItemTransforms = ({
    itemsLength,
    placeholderIndex,
    dragState,
    externalDragItem,
}: UseDockItemTransformsOptions) => {
    const itemTransforms = useMemo(() => {
        const targetSlot = placeholderIndex;
        if (targetSlot === null) return Array.from({ length: itemsLength }, () => 0);

        const isInternalDragActive = (dragState.isDragging || dragState.isAnimatingReturn)
            && dragState.originalIndex !== -1;
        const originalIndex = isInternalDragActive
            ? dragState.originalIndex
            : (externalDragItem ? -1 : dragState.originalIndex);
        const isDragging = dragState.isDragging || dragState.isAnimatingReturn;
        const transforms = Array.from({ length: itemsLength }, (_, index) => horizontalStrategy.calculateTransform(
            index,
            targetSlot,
            originalIndex,
            isDragging,
        ).x);
        transforms.push(horizontalStrategy.calculateTransform(
            itemsLength,
            targetSlot,
            originalIndex,
            isDragging,
        ).x);
        return transforms;
    }, [
        placeholderIndex,
        dragState.isDragging,
        dragState.isAnimatingReturn,
        dragState.originalIndex,
        externalDragItem,
        itemsLength,
    ]);

    return useCallback((index: number) => itemTransforms[index] ?? 0, [itemTransforms]);
};
