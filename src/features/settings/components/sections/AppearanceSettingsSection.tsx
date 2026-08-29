import { type CSSProperties, useCallback } from 'react';
import { useTheme, type Theme, type Texture } from '@/features/theme/context/ThemeContext';
import { useSystemTheme } from '@/features/theme/hooks/useSystemTheme';
import { useLanguage } from '@/shared/context/LanguageContext';
import { GRADIENT_PRESETS } from '@/features/theme/constants/gradients';
import { TEXTURE_PATTERNS } from '@/features/theme/constants/textures';
import { APPEARANCE_PALETTES } from '@/features/theme/constants/palettes';
import { WallpaperGallery } from '@/features/theme/components/WallpaperGallery/WallpaperGallery';
import defaultIcon from '@/assets/icons/star3.svg';
import lightIcon from '@/assets/icons/sun.svg';
import darkIcon from '@/assets/icons/moon.svg';
import autoIcon from '@/assets/icons/monitor.svg';
import slashIcon from '@/assets/icons/slash.svg';
import asteriskIcon from '@/assets/icons/asterisk.svg';
import circleIcon from '@/assets/icons/texture background/circle-preview.svg';
import crossIcon from '@/assets/icons/texture background/cross-preview.svg';
import styles from '../Modal/SettingsModal.module.css';

const CONTAINER_STYLE_OPTIONS = [
  {
    id: 'classic',
    title: '经典贴纸',
    description: '层次最明确的玻璃卡片，浮动按钮、菜单和大页面都保持清晰边界。',
    previewClassName: 'surfacePreviewClassic',
  },
  {
    id: 'frame',
    title: '柔和面板',
    description: '弱化外层玻璃，以更清晰的边框和实体面板组织界面。',
    previewClassName: 'surfacePreviewFrame',
  },
  {
    id: 'ambient',
    title: '环境仓',
    description: '更轻的半透明表面，用环境模糊和细微强调色建立层级。',
    previewClassName: 'surfacePreviewAmbient',
  },
  {
    id: 'veil',
    title: '雾面薄片',
    description: '透明度最高、模糊最明显，让壁纸成为主体，同时保留必要轮廓。',
    previewClassName: 'surfacePreviewVeil',
  },
] as const;

const CONTAINER_STYLE_LABELS = Object.fromEntries(
  CONTAINER_STYLE_OPTIONS.map((option) => [option.id, option.title]),
) as Record<(typeof CONTAINER_STYLE_OPTIONS)[number]['id'], string>;

export const AppearanceSettingsSection = () => {
  const {
    theme,
    setTheme,
    followSystem,
    setFollowSystem,
    wallpaper,
    setWallpaper,
    wallpaperId,
    setWallpaperId,
    uploadWallpaper,
    gradientId,
    setGradientId,
    solidId,
    setSolidId,
    texture,
    setTexture,
    appearancePalette,
    setAppearancePalette,
    containerStyle,
    setContainerStyle,
  } = useTheme();
  const systemTheme = useSystemTheme();
  const { language, t } = useLanguage();

  const isDefaultTheme = theme === 'default' && !followSystem;
  const paletteScheme = theme === 'dark' || (followSystem && systemTheme === 'dark') ? 'dark' : 'light';
  const activeIndex = followSystem ? 0 : theme === 'light' ? 1 : theme === 'dark' ? 2 : -1;
  const highlightStyle: CSSProperties = {
    transform: activeIndex >= 0 ? `translateX(${activeIndex * 56}px)` : 'scale(0)',
    opacity: activeIndex >= 0 ? 1 : 0,
  };

  const handleThemeSelect = useCallback((selectedTheme: Theme) => {
    setTheme(selectedTheme);
    if (followSystem) setFollowSystem(false);
  }, [followSystem, setFollowSystem, setTheme]);

  const handleGradientSelect = useCallback((id: string) => {
    if (wallpaper) setWallpaper(null);
    if (isDefaultTheme) {
      if (gradientId === id) {
        setGradientId('theme-default');
        requestAnimationFrame(() => setGradientId(id));
      } else {
        setGradientId(id);
      }
      return;
    }
    setSolidId(id);
  }, [gradientId, isDefaultTheme, setGradientId, setSolidId, setWallpaper, wallpaper]);

  const handleTextureSelect = useCallback((selectedTexture: Texture) => {
    setTexture(selectedTexture);
  }, [setTexture]);

  return (
    <section className={styles.settingsSection}>
      <div className={styles.sectionHeader}>
        <h2>外观</h2>
        <p>调整主题、背景、纹理和壁纸。</p>
      </div>
      <div className={styles.settingsCard}>
        <div className={styles.cardTitle}>主题</div>
        <div className={styles.iconContainer}>
          <div className={styles.themeGroupContainer}>
            <div className={styles.highlightBackground} style={highlightStyle} />
            <button className={styles.themeGroupOption} onClick={() => setFollowSystem(!followSystem)} title={t.settings.followSystem}>
              <img src={autoIcon} alt="Follow System" width={24} height={24} />
            </button>
            <button className={styles.themeGroupOption} onClick={() => handleThemeSelect('light')} title={t.settings.lightTheme}>
              <img src={lightIcon} alt="Light Theme" width={24} height={24} />
            </button>
            <button className={styles.themeGroupOption} onClick={() => handleThemeSelect('dark')} title={t.settings.darkTheme}>
              <img src={darkIcon} alt="Dark Theme" width={24} height={24} />
            </button>
          </div>
          <button className={`${styles.defaultTheme} ${isDefaultTheme ? styles.defaultThemeActive : ''}`} onClick={() => handleThemeSelect('default')} title={t.settings.defaultTheme}>
            <img src={defaultIcon} alt="Default Theme" width={24} height={24} />
          </button>
        </div>
      </div>
      <div className={styles.settingsCard}>
        <div className={styles.paletteCardHeader}>
          <div>
            <div className={styles.cardTitle}>强调色</div>
            <p>调整 Dock、设置、弹窗、操作控件、贴纸工具与小组件按钮的强调色。</p>
          </div>
          <span className={styles.paletteStatus}>{APPEARANCE_PALETTES.find((palette) => palette.id === appearancePalette)?.nameZh}</span>
        </div>
        <div className={styles.paletteGrid}>
          {APPEARANCE_PALETTES.map((palette) => {
            const swatches = palette[paletteScheme];
            const isActive = appearancePalette === palette.id;
            return (
              <button
                key={palette.id}
                type="button"
                className={`${styles.paletteOption} ${isActive ? styles.paletteOptionActive : ''}`}
                onClick={() => setAppearancePalette(palette.id)}
                aria-pressed={isActive}
                title={language === 'en' ? palette.nameEn : palette.nameZh}
              >
                <span className={styles.paletteSwatches} aria-hidden="true">
                  <span style={{ background: swatches.bg }} />
                  <span style={{ background: swatches.surface }} />
                  <span style={{ background: swatches.accent }} />
                </span>
                <span className={styles.paletteName}>{language === 'en' ? palette.nameEn : palette.nameZh}</span>
                <span className={styles.paletteCheck}>{isActive ? '✓' : ''}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className={styles.settingsCard}>
        <div className={styles.surfaceStyleHeader}>
          <div>
            <div className={styles.cardTitle}>界面材质</div>
            <p>统一控制搜索框、Dock、小组件、顶部浮动按钮、菜单和弹窗的表面风格。切换后整套界面会一起变化。</p>
          </div>
          <span className={styles.paletteStatus}>{CONTAINER_STYLE_LABELS[containerStyle]}</span>
        </div>
        <div className={styles.surfaceStyleGrid}>
          {CONTAINER_STYLE_OPTIONS.map((option) => {
            const isActive = containerStyle === option.id;
            return (
              <button
                key={option.id}
                type="button"
                className={`${styles.surfaceStyleOption} ${isActive ? styles.surfaceStyleOptionActive : ''}`}
                onClick={() => setContainerStyle(option.id)}
                aria-pressed={isActive}
              >
                <span className={`${styles.surfacePreview} ${styles[option.previewClassName]}`} aria-hidden="true">
                  <span className={styles.surfacePreviewChrome}><i /><i /></span>
                  <span className={styles.surfacePreviewSearch}><i /><i /></span>
                  <span className={styles.surfacePreviewDock}><i /><i /><i /><i /></span>
                  <span className={styles.surfacePreviewCards}><i /><i /><i /></span>
                </span>
                <span className={styles.surfaceStyleCopy}><strong>{option.title}</strong><small>{option.description}</small></span>
                <span className={styles.surfaceStyleCheck}>{isActive ? '✓' : ''}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className={styles.settingsCard}>
        <div className={styles.cardTitle}>纹理</div>
        <div className={`${styles.textureSectionWrapper} ${!isDefaultTheme && !wallpaper ? styles.textureSectionWrapperOpen : ''}`}>
          <div className={styles.textureSection}>
            <button className={`${styles.textureOption} ${texture === 'none' ? styles.textureOptionActive : ''}`} onClick={() => handleTextureSelect('none')} title={t.settings.noTexture}>
              <div className={styles.texturePreviewNone}><img src={slashIcon} alt="No Texture" width={24} height={24} /></div>
            </button>
            {(['point', 'cross'] as const).map((textureId) => {
              const pattern = TEXTURE_PATTERNS[textureId];
              const icon = textureId === 'point' ? circleIcon : crossIcon;
              return (
                <button key={textureId} className={`${styles.textureOption} ${texture === textureId ? styles.textureOptionActive : ''}`} onClick={() => handleTextureSelect(textureId)} title={language === 'zh' ? pattern.nameZh : pattern.name}>
                  <div className={styles.texturePreviewNone}><img src={icon} alt={pattern.name} width={24} height={24} /></div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className={styles.settingsCard}>
        <div className={styles.cardTitle}>颜色</div>
        <div className={styles.colorOptionsContainer}>
          {GRADIENT_PRESETS.map((preset) => {
            const isThemeDefault = preset.id === 'theme-default';
            const isDarkTheme = theme === 'dark' || (followSystem && systemTheme === 'dark');
            const displayColor = isThemeDefault
              ? 'var(--color-bg-secondary)'
              : isDefaultTheme
                ? preset.gradient
                : isDarkTheme && 'solidDark' in preset ? preset.solidDark : preset.solid;
            const currentActiveId = isDefaultTheme ? gradientId : (solidId || gradientId);
            const isActive = !wallpaper && currentActiveId === preset.id;
            return (
              <button key={preset.id} className={`${styles.colorOption} ${isActive ? styles.colorOptionActive : ''}`} onClick={() => handleGradientSelect(preset.id)} title={language === 'en' ? preset.nameEn : preset.name} style={{ background: displayColor }}>
                {isThemeDefault && <img src={asteriskIcon} alt="Default" width={24} height={24} style={{ filter: isDarkTheme ? 'invert(1)' : 'none' }} />}
              </button>
            );
          })}
        </div>
      </div>
      <div className={styles.settingsCard}>
        <div className={styles.cardTitle}>壁纸</div>
        <div className={styles.wallpaperSection}>
          <WallpaperGallery wallpaperId={wallpaperId} onWallpaperIdChange={setWallpaperId} onWallpaperClear={() => setWallpaper(null)} onWallpaperUpload={uploadWallpaper} />
        </div>
      </div>
    </section>
  );
};
