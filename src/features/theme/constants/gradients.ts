/**
 * 玻璃主题背景预设。
 *
 * 渐变色值由 Design System 的 --background-gradient-* 统一提供；这里仅保留
 * 业务稳定 ID、展示名、亮度元数据，以及 light/dark 实体主题所需的纯色回退。
 * IDs 保持不变，避免已有用户设置失效。
 */
export const GRADIENT_PRESETS = [
    {
        id: 'theme-default',
        name: '默认',
        nameEn: 'Default',
        gradient: 'var(--background-gradient-glass)',
        brightness: 'dark',
        solid: '#F3F3F3', // 浅色主题默认值
        solidDark: '#1c1c1e',
    },
    {
        id: 'workshop-sage',
        name: '鼠尾草',
        nameEn: 'Sage',
        gradient: 'var(--background-gradient-sage)',
        brightness: 'light',
        solid: '#F4F6F2',
        // Design System Sage dark canvas: neutral base with a restrained accent wash.
        solidDark: 'color-mix(in srgb, #1c1c1e 94%, #91ad82 6%)',
    },
    {
        id: 'gradient-1',
        name: '花瓣',
        nameEn: 'Petal',
        gradient: 'var(--background-gradient-petal)',
        brightness: 'light',
        solid: '#FFF5F7',
        // Design System Rose dark canvas.
        solidDark: 'color-mix(in srgb, #1c1c1e 94%, #dd829c 6%)',
    },
    {
        id: 'gradient-2',
        name: '雾蓝',
        nameEn: 'Mist',
        gradient: 'var(--background-gradient-mist)',
        brightness: 'light',
        solid: '#F5F9FF',
        // Design System Ocean dark canvas.
        solidDark: 'color-mix(in srgb, #1c1c1e 94%, #7fa8cf 6%)',
    },
    {
        id: 'gradient-3',
        name: '涟漪',
        nameEn: 'Ripple',
        gradient: 'var(--background-gradient-ripple)',
        brightness: 'light',
        solid: '#F1F6EF',
        // Design System Teal/Sage dark canvas family.
        solidDark: 'color-mix(in srgb, #1c1c1e 94%, #58b8aa 6%)',
    },
    {
        id: 'gradient-4',
        name: '暖石',
        nameEn: 'Stone',
        gradient: 'var(--background-gradient-stone)',
        brightness: 'light',
        solid: '#F8F6F4',
        // Neutral-first dark canvas with a restrained warm-stone wash.
        solidDark: 'color-mix(in srgb, #1c1c1e 96%, #b4a09b 4%)',
    },
    {
        id: 'gradient-5',
        name: '极光',
        nameEn: 'Aurora',
        gradient: 'var(--background-gradient-aurora)',
        brightness: 'dark',
        solid: '#F9F5FF',
        // Design System Violet dark canvas.
        solidDark: 'color-mix(in srgb, #1c1c1e 94%, #b49ae0 6%)'
    },
    {
        id: 'gradient-6',
        name: '琥珀',
        nameEn: 'Amber',
        gradient: 'var(--background-gradient-amber)',
        brightness: 'light',
        solid: '#FAF5E9',
        // Design System Sand dark canvas.
        solidDark: 'color-mix(in srgb, #1c1c1e 94%, #d39a62 6%)'
    },
    {
        id: 'gradient-7',
        name: '朱砂',
        nameEn: 'Cinnabar',
        gradient: 'var(--background-gradient-cinnabar)',
        brightness: 'light',
        solid: '#FAF1EF',
        // Warm dark canvas, kept restrained so accent carries the chroma.
        solidDark: 'color-mix(in srgb, #1c1c1e 94%, #ed8b55 6%)'
    },
    {
        id: 'gradient-8',
        name: '青金',
        nameEn: 'Lapis',
        gradient: 'var(--background-gradient-lapis)',
        brightness: 'dark',
        solid: '#F5F7FF',
        // Indigo follows the Design System Ocean dark canvas family.
        solidDark: 'color-mix(in srgb, #1c1c1e 94%, #7fa8cf 6%)',
    },
    {
        id: 'gradient-9',
        name: '石墨',
        nameEn: 'Graphite',
        gradient: 'var(--background-gradient-graphite)',
        brightness: 'dark',
        solid: '#323232',
        // Keep the graphite preset near-black while matching the dark canvas scale.
        solidDark: '#161618'
    },
] as const;

export interface GradientPreset {
    readonly id: string;
    readonly name: string;
    readonly nameEn: string;
    readonly gradient: string;
    readonly brightness: 'light' | 'dark';
    readonly solid: string;
    readonly solidDark?: string;
    readonly blendMode?: string;
}

export type GradientPresetType = typeof GRADIENT_PRESETS[number];
