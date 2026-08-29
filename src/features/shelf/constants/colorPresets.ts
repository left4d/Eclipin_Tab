export interface StickerColorPreset {
    value: string;
    label: string;
    shortcut?: string;
}

/**
 * 文字贴纸与绘图共用的颜色预设。
 * 保留旧版颜色值，避免已保存贴纸出现无法匹配选中状态的问题。
 */
export const STICKER_COLOR_PRESETS: readonly StickerColorPreset[] = [
    { value: '#1C1C1E', label: '墨黑', shortcut: '1' },
    { value: '#FF3B31', label: '红色', shortcut: '2' },
    { value: 'var(--fusion-accent)', label: '主题色', shortcut: '3' },
    { value: '#35C759', label: '绿色', shortcut: '4' },
    { value: '#FF9502', label: '橙色', shortcut: '5' },
    { value: '#B052DE', label: '紫色', shortcut: '6' },
    { value: '#FFFFFF', label: '白色', shortcut: '7' },
    { value: '#FFD60A', label: '黄色', shortcut: '8' },
    { value: '#32ADE6', label: '青蓝', shortcut: '9' },
    { value: '#FF2D55', label: '玫红', shortcut: '0' },
] as const;

export const DEFAULT_STICKER_COLOR = STICKER_COLOR_PRESETS[0].value;


const COLOR_ALIASES: Readonly<Record<string, string>> = {
    '#FF3B30': '#FF3B31',
    '#FF3B31': '#FF3B31',
    '#34C759': '#35C759',
    '#35C759': '#35C759',
    '#FF9500': '#FF9502',
    '#FF9502': '#FF9502',
    '#AF52DE': '#B052DE',
    '#B052DE': '#B052DE',
    '#FFF': '#FFFFFF',
    '#FFFFFF': '#FFFFFF',
};

export const normalizeStickerColor = (color: string): string => {
    const normalized = color.trim().toUpperCase();
    return COLOR_ALIASES[normalized] ?? normalized;
};

export const areStickerColorsEquivalent = (first: string, second: string): boolean => (
    normalizeStickerColor(first) === normalizeStickerColor(second)
);
