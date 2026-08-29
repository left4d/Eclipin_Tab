import { useEffect, useRef, useState } from 'react';
import { MAX_STICKER_SCALE, MIN_STICKER_SCALE } from '@/features/shelf/utils/stickerSizing';

interface UseStickerResizeOptions {
    disabled: boolean;
    scale: number;
    onScaleChange: (scale: number) => void;
}

interface ResizeStart {
    x: number;
    y: number;
    scale: number;
}

const SCALE_DRAG_DISTANCE = 200;

export const useStickerResize = ({ disabled, scale, onScaleChange }: UseStickerResizeOptions) => {
    const [isResizing, setIsResizing] = useState(false);
    const resizeStartRef = useRef<ResizeStart | null>(null);

    const handleResizeStart = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        if (disabled) return;

        setIsResizing(true);
        resizeStartRef.current = {
            x: event.clientX,
            y: event.clientY,
            scale,
        };
    };

    useEffect(() => {
        if (!isResizing) return;

        let frameId: number | null = null;
        let pendingScale: number | null = null;

        const flushScale = () => {
            frameId = null;
            if (pendingScale !== null) onScaleChange(pendingScale);
        };

        const handleMouseMove = (event: MouseEvent) => {
            const start = resizeStartRef.current;
            if (!start) return;

            const distance = ((event.clientX - start.x) + (event.clientY - start.y)) / 2;
            pendingScale = Math.max(
                MIN_STICKER_SCALE,
                Math.min(MAX_STICKER_SCALE, start.scale + distance / SCALE_DRAG_DISTANCE),
            );

            if (frameId === null) frameId = requestAnimationFrame(flushScale);
        };

        const handleMouseUp = () => {
            if (frameId !== null) {
                cancelAnimationFrame(frameId);
                frameId = null;
                if (pendingScale !== null) onScaleChange(pendingScale);
            }
            setIsResizing(false);
            resizeStartRef.current = null;
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            if (frameId !== null) cancelAnimationFrame(frameId);
        };
    }, [isResizing, onScaleChange]);

    return { isResizing, handleResizeStart };
};
