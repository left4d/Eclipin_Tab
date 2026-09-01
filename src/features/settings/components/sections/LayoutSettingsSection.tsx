import { useEffect, useState } from 'react';
import { useTheme } from '@/features/theme/context/ThemeContext';
import { useLanguage } from '@/shared/context/LanguageContext';
import { useSpaces } from '@/features/spaces/context/SpacesContext';
import {
  loadNavigationBarConfig,
  NAVIGATION_BAR_CHANGED_EVENT,
  NAVIGATION_BAR_STORAGE_KEY,
  saveNavigationBarConfig,
} from '@/features/navigation/services/navigationBarStorage';
import type { NavigationBarConfig, NavigationBarPosition } from '@/features/navigation/types/navigationBar';
import { repairDockItemIcons } from '../../services/iconRepairService';
import { PermissionToggle } from '../permissions/PermissionToggle';
import styles from '../Modal/SettingsModal.module.css';

export const LayoutSettingsSection = () => {
  const {
    dockPosition,
    setDockPosition,
    quickLinksBarEnabled,
    setQuickLinksBarEnabled,
    iconSize,
    setIconSize,
    openInNewTab,
    setOpenInNewTab,
    pageScrollMode,
    setPageScrollMode,
    pageSlideDirection,
    setPageSlideDirection,
  } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { currentSpace, updateSpaceApps } = useSpaces();
  const [isFixingIcons, setIsFixingIcons] = useState(false);
  const [navigationBar, setNavigationBar] = useState<NavigationBarConfig>(loadNavigationBarConfig);
  const zh = language === 'zh';

  useEffect(() => {
    const handleNavigationBarChange = (event: Event) => {
      const detail = (event as CustomEvent<NavigationBarConfig>).detail;
      setNavigationBar(detail ?? loadNavigationBarConfig());
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === NAVIGATION_BAR_STORAGE_KEY) {
        setNavigationBar(loadNavigationBarConfig());
      }
    };
    window.addEventListener(NAVIGATION_BAR_CHANGED_EVENT, handleNavigationBarChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(NAVIGATION_BAR_CHANGED_EVENT, handleNavigationBarChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const updateNavigationBar = (updates: Partial<NavigationBarConfig>) => {
    const next = { ...navigationBar, ...updates };
    setNavigationBar(next);
    saveNavigationBarConfig(next);
  };

  const setNavigationBarPosition = (position: NavigationBarPosition) => {
    updateNavigationBar({ position });
  };

  const handleFixIcons = async () => {
    if (isFixingIcons) return;
    setIsFixingIcons(true);
    const targetSpaceId = currentSpace.id;
    const targetApps = currentSpace.apps;
    try {
      updateSpaceApps(targetSpaceId, await repairDockItemIcons(targetApps));
    } finally {
      setIsFixingIcons(false);
    }
  };

  return (
    <section className={styles.settingsSection}>
      <div className={styles.sectionHeader}>
        <h2>{zh ? '布局' : 'Layout'}</h2>
        <p>{zh ? '控制 Dock、导航栏、语言、页面滚动、搜索建议和打开方式。' : 'Control the Dock, navigation bar, language, page scrolling, search suggestions, and link-opening behavior.'}</p>
      </div>
      <div className={styles.layoutSection}>
        <div className={styles.layoutRow}>
          <span className={styles.layoutLabel}>{t.settings.language}</span>
          <div className={`segmented ${styles.layoutToggleGroup}`}>
            <div className={styles.layoutHighlight} style={{ transform: `translateX(${language === 'zh' ? 0 : 100}%)` }} />
            <button className={`segmented__item ${styles.layoutToggleOption}`} aria-pressed={language === 'zh'} onClick={() => setLanguage('zh')} title="中文">中文</button>
            <button className={`segmented__item ${styles.layoutToggleOption}`} aria-pressed={language === 'en'} onClick={() => setLanguage('en')} title="EN">EN</button>
          </div>
        </div>

        <div className={styles.layoutRow}>
          <span className={styles.layoutLabel}>{t.settings.position}</span>
          <div className={`segmented ${styles.layoutToggleGroup}`}>
            <div
              className={styles.layoutHighlight}
              style={{
                width: '33.3333%',
                transform: `translateX(${dockPosition === 'top' ? 0 : dockPosition === 'center' ? 100 : 200}%)`,
              }}
            />
            <button className={`segmented__item ${styles.layoutToggleOption}`} aria-pressed={dockPosition === 'top'} onClick={() => setDockPosition('top')} title={zh ? '顶部' : 'Top'}>{zh ? '顶部' : 'Top'}</button>
            <button className={`segmented__item ${styles.layoutToggleOption}`} aria-pressed={dockPosition === 'center'} onClick={() => setDockPosition('center')} title={t.settings.center}>{t.settings.center}</button>
            <button className={`segmented__item ${styles.layoutToggleOption}`} aria-pressed={dockPosition === 'bottom'} onClick={() => setDockPosition('bottom')} title={t.settings.bottom}>{t.settings.bottom}</button>
          </div>
        </div>

        <div className={styles.layoutRow}>
          <span className={styles.layoutLabel}>{zh ? '快捷网址栏' : 'Quick links bar'}</span>
          <div className={`segmented ${styles.layoutToggleGroup}`}>
            <div className={styles.layoutHighlight} style={{ transform: `translateX(${quickLinksBarEnabled ? 0 : 100}%)` }} />
            <button
              className={`segmented__item ${styles.layoutToggleOption}`}
              aria-pressed={quickLinksBarEnabled}
              onClick={() => setQuickLinksBarEnabled(true)}
              title={zh ? '显示搜索框下方的快捷网址栏' : 'Show the website shortcuts below the search box'}
            >
              {zh ? '打开' : 'On'}
            </button>
            <button
              className={`segmented__item ${styles.layoutToggleOption}`}
              aria-pressed={!quickLinksBarEnabled}
              onClick={() => setQuickLinksBarEnabled(false)}
              title={zh ? '隐藏快捷网址栏，保留搜索框' : 'Hide the quick links bar and keep the search box'}
            >
              {zh ? '关闭' : 'Off'}
            </button>
          </div>
        </div>

        <div className={styles.layoutRow}>
          <span className={styles.layoutLabel}>{t.settings.iconSize}</span>
          <div className={`segmented ${styles.layoutToggleGroup}`}>
            <div className={styles.layoutHighlight} style={{ transform: `translateX(${iconSize === 'large' ? 0 : 100}%)` }} />
            <button className={`segmented__item ${styles.layoutToggleOption}`} aria-pressed={iconSize === 'large'} onClick={() => setIconSize('large')} title={t.settings.large}>{t.settings.large}</button>
            <button className={`segmented__item ${styles.layoutToggleOption}`} aria-pressed={iconSize === 'small'} onClick={() => setIconSize('small')} title={t.settings.small}>{t.settings.small}</button>
          </div>
        </div>

        <div className={styles.layoutRow}>
          <span className={styles.layoutLabel}>{t.settings.tabOpeningBehavior}</span>
          <div className={`segmented ${styles.layoutToggleGroup}`}>
            <div className={styles.layoutHighlight} style={{ transform: `translateX(${openInNewTab ? 0 : 100}%)` }} />
            <button className={`segmented__item ${styles.layoutToggleOption}`} aria-pressed={openInNewTab} onClick={() => setOpenInNewTab(true)} title={t.settings.openInNewTab}>{t.settings.openInNewTab}</button>
            <button className={`segmented__item ${styles.layoutToggleOption}`} aria-pressed={!openInNewTab} onClick={() => setOpenInNewTab(false)} title={t.settings.openInCurrentTab}>{t.settings.openInCurrentTab}</button>
          </div>
        </div>

        <div className={styles.layoutRow}>
          <span className={styles.layoutLabel}>{zh ? '页面切换' : 'Page transition'}</span>
          <div className={`segmented ${styles.layoutToggleGroup}`}>
            <div className={styles.layoutHighlight} style={{ transform: `translateX(${pageSlideDirection === 'vertical' ? 0 : 100}%)` }} />
            <button className={`segmented__item ${styles.layoutToggleOption}`} aria-pressed={pageSlideDirection === 'vertical'} onClick={() => setPageSlideDirection('vertical')} title={zh ? '页面上下切换' : 'Switch pages vertically'}>{zh ? '上下' : 'Vertical'}</button>
            <button className={`segmented__item ${styles.layoutToggleOption}`} aria-pressed={pageSlideDirection === 'horizontal'} onClick={() => setPageSlideDirection('horizontal')} title={zh ? '页面左右切换；滚动固定整页' : 'Switch pages horizontally with full-page scrolling'}>{zh ? '左右' : 'Horizontal'}</button>
          </div>
        </div>

        <div className={styles.layoutRow}>
          <span className={styles.layoutLabel}>{zh ? '页面滚动' : 'Page scrolling'}</span>
          <div className={`segmented ${styles.layoutToggleGroup}`}>
            <div className={styles.layoutHighlight} style={{ transform: `translateX(${pageScrollMode === 'continuous' ? 0 : 100}%)` }} />
            <button
              className={`segmented__item ${styles.layoutToggleOption}`}
              aria-pressed={pageScrollMode === 'continuous'}
              onClick={() => setPageScrollMode('continuous')}
              disabled={pageSlideDirection === 'horizontal'}
              title={pageSlideDirection === 'horizontal'
                ? (zh ? '左右滑动页面模式固定为整页' : 'Horizontal page mode always uses full-page paging')
                : (zh ? '滚轮连续移动页面' : 'Scroll continuously between pages')}
            >
              {zh ? '连续' : 'Continuous'}
            </button>
            <button className={`segmented__item ${styles.layoutToggleOption}`} aria-pressed={pageScrollMode === 'paged'} onClick={() => setPageScrollMode('paged')} title={zh ? '每次滚轮固定移动一整页' : 'Move exactly one page per wheel gesture'}>{zh ? '整页' : 'Paged'}</button>
          </div>
        </div>

        <div className={styles.layoutRow}>
          <span className={styles.layoutLabel}>{zh ? '导航栏' : 'Navigation bar'}</span>
          <div className={`segmented ${styles.layoutToggleGroup}`}>
            <div className={styles.layoutHighlight} style={{ transform: `translateX(${navigationBar.enabled ? 0 : 100}%)` }} />
            <button className={`segmented__item ${styles.layoutToggleOption}`} aria-pressed={navigationBar.enabled} onClick={() => updateNavigationBar({ enabled: true })} title={zh ? '显示导航栏' : 'Show navigation bar'}>{zh ? '打开' : 'On'}</button>
            <button className={`segmented__item ${styles.layoutToggleOption}`} aria-pressed={!navigationBar.enabled} onClick={() => updateNavigationBar({ enabled: false })} title={zh ? '隐藏导航栏' : 'Hide navigation bar'}>{zh ? '关闭' : 'Off'}</button>
          </div>
        </div>

        <div className={styles.layoutRow}>
          <span className={styles.layoutLabel}>{zh ? '导航栏位置' : 'Navigation position'}</span>
          <div className={`segmented ${styles.layoutToggleGroup}`}>
            <div
              className={styles.layoutHighlight}
              style={{
                width: '33.3333%',
                transform: `translateX(${navigationBar.position === 'left' ? 0 : navigationBar.position === 'right' ? 100 : 200}%)`,
              }}
            />
            <button className={`segmented__item ${styles.layoutToggleOption}`} aria-pressed={navigationBar.position === 'left'} onClick={() => setNavigationBarPosition('left')} title={zh ? '导航栏放在左侧' : 'Place navigation bar on the left'}>{zh ? '左边' : 'Left'}</button>
            <button className={`segmented__item ${styles.layoutToggleOption}`} aria-pressed={navigationBar.position === 'right'} onClick={() => setNavigationBarPosition('right')} title={zh ? '导航栏放在右侧' : 'Place navigation bar on the right'}>{zh ? '右边' : 'Right'}</button>
            <button className={`segmented__item ${styles.layoutToggleOption}`} aria-pressed={navigationBar.position === 'bottom'} onClick={() => setNavigationBarPosition('bottom')} title={zh ? '导航栏放在底部' : 'Place navigation bar at the bottom'}>{zh ? '下方' : 'Bottom'}</button>
          </div>
        </div>

        <div className={styles.layoutRow}><span className={styles.layoutLabel}>{t.settings.suggestions}</span><PermissionToggle /></div>
        <div className={styles.layoutRow}>
          <button className={`${styles.layoutToggleOption} ${styles.fixButton}`} onClick={() => void handleFixIcons()} disabled={isFixingIcons} title={t.settings.fixIconsTooltip}>
            {isFixingIcons ? '...' : t.settings.fixIcons}
          </button>
        </div>
      </div>
    </section>
  );
};
