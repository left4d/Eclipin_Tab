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
        light: { bg: '#f4f6f2', surface: '#ffffff', accent: '#78916c' },
        dark: { bg: '#171b18', surface: '#222824', accent: '#91ad82' },
    },
    {
        id: 'blue',
        nameZh: '云端蓝',
        nameEn: 'Cloud Blue',
        light: { bg: '#f4f7fc', surface: '#ffffff', accent: '#5b7cfa' },
        dark: { bg: '#111722', surface: '#1a2230', accent: '#75a7ff' },
    },
    {
        id: 'sand',
        nameZh: '暖砂金',
        nameEn: 'Warm Sand',
        light: { bg: '#f7f3ec', surface: '#fffdf9', accent: '#b7793f' },
        dark: { bg: '#1c1814', surface: '#28221c', accent: '#d39a62' },
    },
    {
        id: 'rose',
        nameZh: '柔雾玫瑰',
        nameEn: 'Misty Rose',
        light: { bg: '#fbf5f7', surface: '#ffffff', accent: '#c45f7c' },
        dark: { bg: '#1c1519', surface: '#291f24', accent: '#dd829c' },
    },
    {
        id: 'graphite',
        nameZh: '石墨灰',
        nameEn: 'Graphite',
        light: { bg: '#f2f4f7', surface: '#ffffff', accent: '#667085' },
        dark: { bg: '#15171a', surface: '#22252a', accent: '#8d99aa' },
    },
    {
        id: 'violet',
        nameZh: '暮光紫',
        nameEn: 'Twilight Violet',
        light: { bg: '#f7f5fb', surface: '#ffffff', accent: '#8b6ccf' },
        dark: { bg: '#191620', surface: '#26212f', accent: '#aa8be8' },
    },
    {
        id: 'teal',
        nameZh: '海盐青',
        nameEn: 'Sea Salt Teal',
        light: { bg: '#f0f8f7', surface: '#ffffff', accent: '#2f8f83' },
        dark: { bg: '#101b1a', surface: '#192827', accent: '#58b8aa' },
    },
    {
        id: 'orange',
        nameZh: '落日橙',
        nameEn: 'Sunset Orange',
        light: { bg: '#fbf5ef', surface: '#fffdf9', accent: '#d66a32' },
        dark: { bg: '#1d1713', surface: '#2b211b', accent: '#ed8b55' },
    },
] as const;

export type AppearancePalette = typeof APPEARANCE_PALETTES[number]['id'];

export const DEFAULT_APPEARANCE_PALETTE: AppearancePalette = 'sage';

export function isAppearancePalette(value: string | null | undefined): value is AppearancePalette {
    return APPEARANCE_PALETTES.some((palette) => palette.id === value);
}
