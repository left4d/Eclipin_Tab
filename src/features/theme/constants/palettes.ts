/**
 * 强调色配色
 *
 * 这层配色参考旧 web 项目的主题系统，只负责 Dock、设置页、弹窗、菜单
 * 和操作控件的强调色与轻微表面染色。搜索框、贴纸和小组件卡片继续使用
 * 原有视觉变量，避免破坏现有的洞洞板 DIY 风格。
 */
export const APPEARANCE_PALETTES = [
    {
        id: 'sage',
        nameZh: '雾松绿',
        nameEn: 'Sage',
        light: { bg: '#E8E8ED', surface: '#ffffff', accent: '#78916c' },
        // Design System dark canvas: neutral #1c1c1e with a restrained 6% brand wash.
        dark: { bg: 'color-mix(in srgb, #1c1c1e 94%, #91ad82 6%)', surface: 'color-mix(in srgb, #2c2c2e 95%, #91ad82 5%)', accent: '#91ad82' },
    },
    {
        id: 'blue',
        nameZh: '云端蓝',
        nameEn: 'Cloud Blue',
        light: { bg: '#f4f7fc', surface: '#ffffff', accent: '#5b7cfa' },
        // Keep dark canvas near-neutral; use the Design System's restrained ocean tint.
        dark: { bg: 'color-mix(in srgb, #1c1c1e 94%, #7fa8cf 6%)', surface: 'color-mix(in srgb, #2c2c2e 95%, #7fa8cf 5%)', accent: '#75a7ff' },
    },
    {
        id: 'sand',
        nameZh: '暖砂金',
        nameEn: 'Warm Sand',
        light: { bg: '#f7f3ec', surface: '#fffdf9', accent: '#b7793f' },
        // Dark surfaces stay neutral-first, with a low-strength warm sand wash.
        dark: { bg: 'color-mix(in srgb, #1c1c1e 94%, #d39a62 6%)', surface: 'color-mix(in srgb, #2c2c2e 95%, #d39a62 5%)', accent: '#d39a62' },
    },
    {
        id: 'rose',
        nameZh: '柔雾玫瑰',
        nameEn: 'Misty Rose',
        light: { bg: '#fbf5f7', surface: '#ffffff', accent: '#c45f7c' },
        // Dark surfaces follow the Design System dark canvas scale, not a saturated color block.
        dark: { bg: 'color-mix(in srgb, #1c1c1e 94%, #dd829c 6%)', surface: 'color-mix(in srgb, #2c2c2e 95%, #dd829c 5%)', accent: '#dd829c' },
    },
    {
        id: 'graphite',
        nameZh: '石墨灰',
        nameEn: 'Graphite',
        light: { bg: '#f2f4f7', surface: '#ffffff', accent: '#667085' },
        // Graphite remains the neutral anchor used by the Design System.
        dark: { bg: '#1c1c1e', surface: '#2c2c2e', accent: '#8d99aa' },
    },
    {
        id: 'violet',
        nameZh: '暮光紫',
        nameEn: 'Twilight Violet',
        light: { bg: '#f7f5fb', surface: '#ffffff', accent: '#8b6ccf' },
        // Dark violet uses a neutral canvas with only a restrained violet wash.
        dark: { bg: 'color-mix(in srgb, #1c1c1e 94%, #b49ae0 6%)', surface: 'color-mix(in srgb, #2c2c2e 95%, #b49ae0 5%)', accent: '#aa8be8' },
    },
    {
        id: 'teal',
        nameZh: '海盐青',
        nameEn: 'Sea Salt Teal',
        light: { bg: '#f0f8f7', surface: '#ffffff', accent: '#2f8f83' },
        // Teal follows the same dark neutral base as the Design System, with 6% tint.
        dark: { bg: 'color-mix(in srgb, #1c1c1e 94%, #58b8aa 6%)', surface: 'color-mix(in srgb, #2c2c2e 95%, #58b8aa 5%)', accent: '#58b8aa' },
    },
    {
        id: 'orange',
        nameZh: '落日橙',
        nameEn: 'Sunset Orange',
        light: { bg: '#fbf5ef', surface: '#fffdf9', accent: '#d66a32' },
        // Orange keeps the dark canvas calm and lets the accent carry the warmth.
        dark: { bg: 'color-mix(in srgb, #1c1c1e 94%, #ed8b55 6%)', surface: 'color-mix(in srgb, #2c2c2e 95%, #ed8b55 5%)', accent: '#ed8b55' },
    },
] as const;

export type AppearancePalette = typeof APPEARANCE_PALETTES[number]['id'];

export const DEFAULT_APPEARANCE_PALETTE: AppearancePalette = 'sage';

export function isAppearancePalette(value: string | null | undefined): value is AppearancePalette {
    return APPEARANCE_PALETTES.some((palette) => palette.id === value);
}
