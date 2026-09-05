import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { storage } from '@/shared/utils/storage';
import { useSystemTheme } from '@/features/theme/hooks/useSystemTheme';
import { useWallpaperStorage } from '@/features/theme/hooks/useWallpaperStorage';
import { db, isWeSceneWallpaperItem, type WallpaperType } from '@/shared/utils/db';
import { GRADIENT_PRESETS } from '@/features/theme/constants/gradients';
import { generateTextureDataUrl, getTextureSize, type TextureId } from '@/features/theme/constants/textures';
import { getTextureColorFromBackground } from '@/features/theme/utils/colorUtils';
import { DEFAULT_APPEARANCE_PALETTE, isAppearancePalette, type AppearancePalette } from '@/features/theme/constants/palettes';
import { isBackgroundLight } from '@/features/theme/utils/backgroundLightness';
import { classifyWallpaperUpload, maxWallpaperUploadSize } from '@/features/theme/utils/wallpaperUpload';
import { useVideoWallpaperRetention } from '@/features/theme/hooks/useVideoWallpaperRetention';

export type Theme = 'default' | 'light' | 'dark';
export type Texture = TextureId;
export type DockPosition = 'top' | 'center' | 'bottom';
export type IconSize = 'large' | 'small';
export type ContainerStyle = 'classic' | 'frame' | 'ambient' | 'veil';
export type PageScrollMode = 'continuous' | 'paged';
export type PageSlideDirection = 'vertical' | 'horizontal';

export const DEFAULT_THEME_COLORS = {
    light: '#f1f1f1',
    // 与共享 Design System 的暗色背景保持一致，避免旧版 #202225 偏亮且偏中性的观感。
    dark: '#1c1c1e',
};

// ============================================================================
// 数据层 Context (变化时需要重渲染)
// ============================================================================
interface ThemeDataContextType {
    theme: Theme;
    followSystem: boolean;
    wallpaper: string | null;
    wallpaperType: WallpaperType;
    gradientId: string | null;
    solidId: string | null;
    texture: Texture;
    wallpaperId: string | null;
    backgroundValue: string;
    backgroundBaseValue: string;
    backgroundTextureValue: string | null;
    backgroundTextureTileSize: string;
    backgroundBlendMode: string;
    dockPosition: DockPosition;
    quickLinksBarEnabled: boolean;
    iconSize: IconSize;
    openInNewTab: boolean;
    appearancePalette: AppearancePalette;
    containerStyle: ContainerStyle;
    pageScrollMode: PageScrollMode;
    pageSlideDirection: PageSlideDirection;
}

const ThemeDataContext = createContext<ThemeDataContextType | undefined>(undefined);

// ============================================================================
// 操作层 Context (几乎不变)
// ============================================================================
interface ThemeActionsContextType {
    setTheme: (theme: Theme) => void;
    setFollowSystem: (follow: boolean) => void;
    setWallpaper: (wallpaper: string | null) => void;
    uploadWallpaper: (file: File) => Promise<void>;
    setGradientId: (gradientId: string | null) => void;
    setSolidId: (solidId: string | null) => void;
    setTexture: (texture: Texture) => void;
    setWallpaperId: (id: string) => Promise<void>;
    setDockPosition: (position: DockPosition) => void;
    setQuickLinksBarEnabled: (enabled: boolean) => void;
    setIconSize: (size: IconSize) => void;
    setOpenInNewTab: (openInNewTab: boolean) => void;
    setAppearancePalette: (palette: AppearancePalette) => void;
    setContainerStyle: (style: ContainerStyle) => void;
    setPageScrollMode: (mode: PageScrollMode) => void;
    setPageSlideDirection: (direction: PageSlideDirection) => void;
}

const ThemeActionsContext = createContext<ThemeActionsContextType | undefined>(undefined);

// ============================================================================
// 兼容层 (组合类型)
// ============================================================================
type ThemeContextType = ThemeDataContextType & ThemeActionsContextType;


export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemTheme = useSystemTheme();

    // 壁纸存储钩子
    const {
        saveWallpaper: saveToDb,
        saveWallpaperEngineZip: saveWeSceneZipToDb,
        createWallpaperUrl,
        revokeWallpaperUrl
    } = useWallpaperStorage();

    // 核心主题状态
    const [manualTheme, setManualTheme] = useState<Theme>(() => {
        const saved = storage.getTheme();
        return (saved as Theme) || 'default';
    });

    const [followSystem, setFollowSystemState] = useState<boolean>(() => {
        return storage.getFollowSystem();
    });

    // Current wallpaper URL (blob URL, 仅内存状态)
    const [wallpaper, setWallpaperState] = useState<string | null>(null);

    // Current wallpaper type
    const [wallpaperType, setWallpaperType] = useState<WallpaperType>('image');

    // Current wallpaper ID (for IndexedDB)
    const [wallpaperId, setWallpaperIdState] = useState<string | null>(() => {
        return storage.getWallpaperId();
    });

    // 清理旧版壁纸 localStorage 数据
    useEffect(() => {
        storage.cleanupLegacyWallpaper();
    }, []);

    const [gradientId, setGradientIdState] = useState<string | null>(() => {
        return storage.getGradient();
    });

    const [solidId, setSolidIdState] = useState<string | null>(() => {
        return storage.getSolidGradient();
    });

    const [texture, setTextureState] = useState<Texture>(() => {
        return (storage.getTexture() as Texture) || 'none';
    });

    // Dock 布局设置
    const [dockPosition, setDockPositionState] = useState<DockPosition>(() => {
        return storage.getDockPosition();
    });

    const [quickLinksBarEnabled, setQuickLinksBarEnabledState] = useState<boolean>(() => {
        return storage.getConfig().quickLinksBarEnabled !== false;
    });

    const [iconSize, setIconSizeState] = useState<IconSize>(() => {
        return storage.getIconSize();
    });

    const [openInNewTab, setOpenInNewTabState] = useState<boolean>(() => {
        return storage.getOpenInNewTab();
    });

    const [appearancePalette, setAppearancePaletteState] = useState<AppearancePalette>(() => {
        const saved = storage.getAppearancePalette();
        return isAppearancePalette(saved) ? saved : DEFAULT_APPEARANCE_PALETTE;
    });

    const [containerStyle, setContainerStyleState] = useState<ContainerStyle>(() => storage.getContainerStyle());
    const [pageSlideDirection, setPageSlideDirectionState] = useState<PageSlideDirection>(() => storage.getPageSlideDirection());
    const [pageScrollMode, setPageScrollModeState] = useState<PageScrollMode>(() => (
        storage.getPageSlideDirection() === 'horizontal' ? 'paged' : storage.getPageScrollMode()
    ));

    // 计算主题：如果启用了 followSystem，则使用系统主题
    const theme = followSystem ? systemTheme : manualTheme;
    const isDefaultTheme = manualTheme === 'default' && !followSystem;

    // Blob URL 生命周期必须与当前壁纸一致；旧实现会在每次切换时累积 URL。
    const wallpaperUrlRef = useRef<string | null>(null);
    const wallpaperLoadTokenRef = useRef(0);

    const releaseCurrentWallpaper = useCallback(() => {
        wallpaperLoadTokenRef.current += 1;
        const currentUrl = wallpaperUrlRef.current;
        wallpaperUrlRef.current = null;
        if (currentUrl) revokeWallpaperUrl(currentUrl);
        setWallpaperState(null);
    }, [revokeWallpaperUrl]);

    const loadWallpaperById = useCallback(async (id: string) => {
        const token = ++wallpaperLoadTokenRef.current;
        const item = await db.get(id);
        if (token !== wallpaperLoadTokenRef.current || !item) return;

        if (isWeSceneWallpaperItem(item)) {
            // weScene is a multi-resource wallpaper. Do not manufacture a Blob URL
            // or pass it through the legacy image/video background path. Phase 4
            // will load the scene + referenced resources in a dedicated renderer.
            const previousUrl = wallpaperUrlRef.current;
            wallpaperUrlRef.current = null;
            if (previousUrl) revokeWallpaperUrl(previousUrl);
            setWallpaperType('weScene');
            setWallpaperState(null);
            return;
        }

        const nextUrl = createWallpaperUrl(item.data);
        if (token !== wallpaperLoadTokenRef.current) {
            revokeWallpaperUrl(nextUrl);
            return;
        }

        const previousUrl = wallpaperUrlRef.current;
        wallpaperUrlRef.current = nextUrl;
        if (previousUrl && previousUrl !== nextUrl) revokeWallpaperUrl(previousUrl);
        setWallpaperType(item.type || 'image');
        setWallpaperState(nextUrl);
    }, [createWallpaperUrl, revokeWallpaperUrl]);

    // 初次打开/切换壁纸时按需创建 URL；后台标签页不预加载视频。
    useEffect(() => {
        if (!wallpaperId) {
            releaseCurrentWallpaper();
            return;
        }
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        void loadWallpaperById(wallpaperId);
    }, [loadWallpaperById, releaseCurrentWallpaper, wallpaperId]);

    useVideoWallpaperRetention({
        wallpaperId,
        wallpaperType,
        wallpaperUrlRef,
        loadWallpaperById,
        releaseCurrentWallpaper,
    });

    useEffect(() => () => {
        wallpaperLoadTokenRef.current += 1;
        const url = wallpaperUrlRef.current;
        wallpaperUrlRef.current = null;
        if (url) revokeWallpaperUrl(url);
    }, [revokeWallpaperUrl]);

    // 更新手动主题
    const setTheme = useCallback((newTheme: Theme) => {
        setManualTheme(newTheme);
        storage.saveTheme(newTheme);
        // 手动设置主题时，禁用跟随系统
        if (followSystem) {
            setFollowSystemState(false);
            storage.saveFollowSystem(false);
        }
    }, [followSystem]);

    // 更新跟随系统设置
    const setFollowSystem = useCallback((follow: boolean) => {
        setFollowSystemState(follow);
        storage.saveFollowSystem(follow);
    }, []);

    // 更新壁纸。当前 UI 主要用 null 清除壁纸；非空值保留兼容能力。
    const setWallpaper = useCallback((wp: string | null) => {
        if (!wp) {
            setWallpaperIdState(null);
            storage.saveWallpaperId(null);
            releaseCurrentWallpaper();
            return;
        }
        releaseCurrentWallpaper();
        setWallpaperState(wp);
    }, [releaseCurrentWallpaper]);

    // 通过 ID 设置壁纸 (从画廊)。真正加载统一由上方 effect 完成，避免同一壁纸创建两次 Blob URL。
    const setWallpaperId = useCallback(async (id: string) => {
        setWallpaperIdState(id);
        storage.saveWallpaperId(id);
    }, []);

    // 上传壁纸文件
    const uploadWallpaper = useCallback(async (file: File) => {
        const kind = classifyWallpaperUpload(file);
        if (!kind) throw new Error('请选择图片、视频或 Wallpaper Engine RePKG 解包后的 ZIP 文件');

        const maxSize = maxWallpaperUploadSize(kind);
        if (file.size > maxSize) throw new Error(`文件大小不能超过 ${maxSize / 1024 / 1024}MB`);

        try {
            if (kind === 'weScene') {
                const ids = await saveWeSceneZipToDb(file);
                await setWallpaperId(ids[0]);
                return;
            }
            const id = await saveToDb(file);
            await setWallpaperId(id);
        } catch (error) {
            console.error('Failed to upload wallpaper:', error);
            throw error;
        }
    }, [saveToDb, saveWeSceneZipToDb, setWallpaperId]);

    // 更新渐变 (Default 模式使用)
    const setGradientId = useCallback((id: string | null) => {
        setGradientIdState(id);
        storage.saveGradient(id);
    }, []);

    // 更新纯色 (非 Default 模式使用)
    const setSolidId = useCallback((id: string | null) => {
        setSolidIdState(id);
        storage.saveSolidGradient(id);
    }, []);

    const setTexture = useCallback((newTexture: Texture) => {
        setTextureState(newTexture);
        storage.saveTexture(newTexture);
        // 如果设置了纹理，我们可能想要清除壁纸（如果存在）？
        // 但让我们把这个交给 UI 处理程序或用户选择。
    }, []);

    // 更新 Dock 位置
    const setDockPosition = useCallback((position: DockPosition) => {
        setDockPositionState(position);
        storage.saveDockPosition(position);
    }, []);

    const setQuickLinksBarEnabled = useCallback((enabled: boolean) => {
        setQuickLinksBarEnabledState(enabled);
        storage.updateConfig({ quickLinksBarEnabled: enabled });
    }, []);

    // 更新图标大小
    const setIconSize = useCallback((size: IconSize) => {
        setIconSizeState(size);
        storage.saveIconSize(size);
    }, []);

    // 更新打开标签页方式
    const setOpenInNewTab = useCallback((open: boolean) => {
        setOpenInNewTabState(open);
        storage.saveOpenInNewTab(open);
    }, []);

    const setAppearancePalette = useCallback((palette: AppearancePalette) => {
        setAppearancePaletteState(palette);
        storage.saveAppearancePalette(palette);
    }, []);

    const setContainerStyle = useCallback((style: ContainerStyle) => {
        setContainerStyleState(style);
        storage.saveContainerStyle(style);
    }, []);

    const setPageScrollMode = useCallback((mode: PageScrollMode) => {
        const effectiveMode: PageScrollMode = pageSlideDirection === 'horizontal' ? 'paged' : mode;
        setPageScrollModeState(effectiveMode);
        storage.savePageScrollMode(effectiveMode);
    }, [pageSlideDirection]);

    const setPageSlideDirection = useCallback((direction: PageSlideDirection) => {
        setPageSlideDirectionState(direction);
        storage.savePageSlideDirection(direction);
        if (direction === 'horizontal') {
            setPageScrollModeState('paged');
        }
    }, []);

    // 将主题应用到文档
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('data-theme-palette', appearancePalette);
        document.documentElement.setAttribute('data-container-style', containerStyle);
    }, [theme, appearancePalette, containerStyle]);

    // 将壁纸或渐变/纯色/纹理应用到 body 背景
    // 计算背景值和混合模式
    const { backgroundValue, backgroundBaseValue, backgroundTextureValue, backgroundTextureTileSize, backgroundBlendMode } = React.useMemo(() => {
        let fullBgValue = '';
        let baseValue = '';
        let textureValue: string | null = null;
        let textureTileSize = 'cover';
        let blendMode = 'normal';
        const hasWeSceneWallpaper = wallpaperType === 'weScene' && wallpaperId !== null;

        if (wallpaper) {
            baseValue = `url(${wallpaper})`;
            fullBgValue = baseValue;
        } else {
            // 根据当前模式选择对应的活动 ID
            const activeId = isDefaultTheme ? gradientId : (solidId || gradientId);

            if (activeId) {
                const preset = GRADIENT_PRESETS.find(g => g.id === activeId);
                if (preset) {
                    if (preset.id === 'theme-default') {
                        if (isDefaultTheme) {
                            baseValue = 'linear-gradient(180deg, #00020E 0%, #071633 25%, #3966AD 65%, #7e9ecb 100%)';
                        } else {
                            const isDarkTheme = theme === 'dark';
                            baseValue = isDarkTheme ? DEFAULT_THEME_COLORS.dark : DEFAULT_THEME_COLORS.light;
                        }
                    } else if (isDefaultTheme) {
                        baseValue = preset.gradient;
                    } else {
                        const isDarkTheme = theme === 'dark' || (followSystem && systemTheme === 'dark');
                        baseValue = isDarkTheme && 'solidDark' in preset ? preset.solidDark : preset.solid;
                    }

                    if ('blendMode' in preset && (preset as any).blendMode) {
                        blendMode = (preset as any).blendMode;
                    }
                }
            } else {
                // 如果没有显式设置 ID，尝试使用默认逻辑
                if (isDefaultTheme) {
                    baseValue = 'linear-gradient(180deg, #00020E 0%, #071633 25%, #3966AD 65%, #7e9ecb 100%)';
                } else {
                    const isDarkTheme = theme === 'dark';
                    baseValue = isDarkTheme ? DEFAULT_THEME_COLORS.dark : DEFAULT_THEME_COLORS.light;
                }
            }

            fullBgValue = baseValue;

            // 如果启用，应用纹理图案 (不在默认主题且不为 'none')
            if (!hasWeSceneWallpaper && !isDefaultTheme && texture !== 'none') {
                // 从基础背景计算动态颜色
                const textureColor = getTextureColorFromBackground(baseValue);

                const textureDataUrl = generateTextureDataUrl(texture, textureColor);
                textureValue = `url("${textureDataUrl}")`;
                textureTileSize = getTextureSize(texture);
                fullBgValue = `${textureValue}, ${baseValue}`;
            }
        }

        return {
            backgroundValue: fullBgValue,
            backgroundBaseValue: baseValue,
            backgroundTextureValue: textureValue,
            backgroundTextureTileSize: textureTileSize,
            backgroundBlendMode: blendMode
        };
    }, [wallpaper, wallpaperId, wallpaperType, gradientId, solidId, texture, isDefaultTheme, theme, followSystem, systemTheme]);

    // 将主题应用到文档，并设置 CSS 变量以保持向后兼容
    useEffect(() => {
        const root = document.documentElement;

        // 移除 data-texture 属性
        root.removeAttribute('data-texture');

        // 仅对默认主题检测背景亮度
        if (isDefaultTheme && backgroundBaseValue) {
            const isLight = isBackgroundLight(backgroundBaseValue);
            root.setAttribute('data-background-brightness', isLight ? 'light' : 'dark');
        } else {
            root.removeAttribute('data-background-brightness');
        }

        // 设置 CSS 变量
        root.style.setProperty('--background-custom', backgroundValue);

        // 配置背景大小和位置
        const hasTexture = !isDefaultTheme && texture !== 'none' && !wallpaper && wallpaperType !== 'weScene';
        if (hasTexture) {
            // 纹理图案层 + 纯色/渐变层
            const textureSize = getTextureSize(texture);
            root.style.setProperty('--background-size', `${textureSize}, cover`);
            root.style.setProperty('--background-position', '0 0, center');
            root.style.setProperty('--background-repeat', 'repeat, no-repeat');
        } else {
            // 单层 (壁纸或纯色/渐变)
            root.style.setProperty('--background-size', 'cover');
            root.style.setProperty('--background-position', 'center');
            root.style.setProperty('--background-repeat', 'no-repeat');
        }

        if (backgroundBlendMode !== 'normal') {
            root.style.setProperty('--background-blend-mode', backgroundBlendMode);
        } else {
            root.style.removeProperty('--background-blend-mode');
        }

        // 设置图标大小 CSS 变量
        root.style.setProperty('--icon-size', iconSize === 'small' ? '52px' : '64px');
        // 动态调整图标圆角：支持超椭圆曲线的浏览器放大 1.5 倍
        // 不支持 corner-shape 的浏览器（Firefox/Safari）使用原始值回退
        const supportsSuperellipse = CSS.supports('corner-shape: superellipse(1.5)');
        root.style.setProperty(
            '--icon-border-radius',
            iconSize === 'small'
                ? (supportsSuperellipse ? '18px' : '12px')
                : (supportsSuperellipse ? '24px' : '16px')
        );
    }, [backgroundValue, backgroundBaseValue, backgroundBlendMode, isDefaultTheme, iconSize, texture, wallpaper, wallpaperType]);

    // ========================================================================
    // 性能优化: 分离 data 和 actions context values
    // ========================================================================
    const dataValue: ThemeDataContextType = useMemo(() => ({
        theme,
        followSystem,
        wallpaper,
        wallpaperType,
        gradientId,
        solidId,
        texture,
        wallpaperId,
        backgroundValue,
        backgroundBaseValue,
        backgroundTextureValue,
        backgroundTextureTileSize,
        backgroundBlendMode,
        dockPosition,
        quickLinksBarEnabled,
        iconSize,
        openInNewTab,
        appearancePalette,
        containerStyle,
        pageScrollMode,
        pageSlideDirection,
    }), [theme, followSystem, wallpaper, wallpaperType, gradientId, solidId, texture, wallpaperId, backgroundValue, backgroundBaseValue, backgroundTextureValue, backgroundTextureTileSize, backgroundBlendMode, dockPosition, quickLinksBarEnabled, iconSize, openInNewTab, appearancePalette, containerStyle, pageScrollMode, pageSlideDirection]);

    const actionsValue: ThemeActionsContextType = useMemo(() => ({
        setTheme,
        setFollowSystem,
        setWallpaper,
        uploadWallpaper,
        setGradientId,
        setSolidId,
        setTexture,
        setWallpaperId,
        setDockPosition,
        setQuickLinksBarEnabled,
        setIconSize,
        setOpenInNewTab,
        setAppearancePalette,
        setContainerStyle,
        setPageScrollMode,
        setPageSlideDirection,
    }), [setTheme, setFollowSystem, setWallpaper, uploadWallpaper, setGradientId, setSolidId, setTexture, setWallpaperId, setDockPosition, setQuickLinksBarEnabled, setIconSize, setOpenInNewTab, setAppearancePalette, setContainerStyle, setPageScrollMode, setPageSlideDirection]);

    return (
        <ThemeDataContext.Provider value={dataValue}>
            <ThemeActionsContext.Provider value={actionsValue}>
                {children}
            </ThemeActionsContext.Provider>
        </ThemeDataContext.Provider>
    );
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * 获取主题数据状态 (变化时触发重渲染)
 * 用于需要读取 theme、wallpaper 等数据的组件
 */
export const useThemeData = (): ThemeDataContextType => {
    const context = useContext(ThemeDataContext);
    if (context === undefined) {
        throw new Error('useThemeData must be used within a ThemeProvider');
    }
    return context;
};

/**
 * 获取主题操作方法 (几乎不变)
 * 用于只需要调用 setTheme、setWallpaper 等操作的组件
 */
export const useThemeActions = (): ThemeActionsContextType => {
    const context = useContext(ThemeActionsContext);
    if (context === undefined) {
        throw new Error('useThemeActions must be used within a ThemeProvider');
    }
    return context;
};

/**
 * 获取完整的 Theme Context (兼容层)
 * 组合 ThemeDataContext 和 ThemeActionsContext
 * 
 * 性能建议：如果组件只需要部分状态，建议使用 useThemeData 或 useThemeActions
 */
export const useTheme = (): ThemeContextType => {
    const data = useThemeData();
    const actions = useThemeActions();
    return { ...data, ...actions };
};
