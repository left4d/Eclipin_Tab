const LAST_FONT_SIZE_KEY = 'sticker_last_font_size';
const DEFAULT_FONT_SIZE = 40;

export const getLastStickerFontSize = (): number => {
    const saved = localStorage.getItem(LAST_FONT_SIZE_KEY);
    if (!saved) return DEFAULT_FONT_SIZE;
    const parsed = Number.parseInt(saved, 10);
    return Number.isFinite(parsed) && parsed >= 12 && parsed <= 120 ? parsed : DEFAULT_FONT_SIZE;
};

export const saveLastStickerFontSize = (fontSize: number) => {
    localStorage.setItem(LAST_FONT_SIZE_KEY, fontSize.toString());
};
