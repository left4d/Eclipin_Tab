import type { Sticker } from '@/shared/types';
import { SCENE_DRAGGING_Z_INDEX, normalizeScenePriority, resolveSceneZIndex } from '@/shared/utils/sceneStacking';

const BLACK_COLOR = '#1C1C1E';
const WHITE_COLOR = '#FFFFFF';

export const STICKER_EDGE_MARGIN = 20;
export const STICKER_DRAGGING_Z_INDEX = SCENE_DRAGGING_Z_INDEX;

export const normalizeStickerRotation = (value: number | undefined) => {
    const numeric = Number(value ?? 0);
    return Number.isFinite(numeric) ? Math.max(-180, Math.min(180, numeric)) : 0;
};

export const getThemeAwareStickerColor = (color: string, theme: string): string => {
    if (theme !== 'dark') return color;

    const upperColor = color.toUpperCase();
    if (upperColor === BLACK_COLOR || upperColor === '#1C1C1E') return WHITE_COLOR;
    if (upperColor === WHITE_COLOR || upperColor === '#FFF') return BLACK_COLOR;
    return color;
};

export const resolveStickerZIndex = (sticker: Sticker) => {
    const priority = normalizeScenePriority(sticker.priority);
    return {
        priority,
        zIndex: resolveSceneZIndex(priority, sticker.zIndex ?? 1),
    };
};
