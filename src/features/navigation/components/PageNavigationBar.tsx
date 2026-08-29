import { useEffect, useState } from 'react';
import { executeNavigationAction } from '@/shared/navigation';
import { useThemeData } from '@/features/theme/context/ThemeContext';
import { useLanguage } from '@/shared/context/LanguageContext';
import {
  getNavigationBarItemLabel,
  loadNavigationBarConfig,
  NAVIGATION_BAR_CHANGED_EVENT,
  NAVIGATION_BAR_STORAGE_KEY,
  saveNavigationBarConfig,
} from '../services/navigationBarStorage';
import type { NavigationBarConfig, NavigationBarItem } from '../types/navigationBar';
import { EditNavigationIcon, NavigationDefaultIcon } from './NavigationBarIcons';
import { NavigationBarEditor } from './NavigationBarEditor';
import styles from './PageNavigationBar.module.css';

interface PageNavigationBarProps {
  currentPageIndex: number;
}

const pointsToCurrentPage = (item: NavigationBarItem, currentPageIndex: number): boolean => (
  item.action.type === 'page'
  && !item.action.coordinate
  && Math.max(1, Math.trunc(item.action.page)) === Math.max(1, Math.trunc(currentPageIndex) + 1)
);

export const PageNavigationBar = ({ currentPageIndex }: PageNavigationBarProps) => {
  const { openInNewTab } = useThemeData();
  const { language } = useLanguage();
  const [config, setConfig] = useState<NavigationBarConfig>(loadNavigationBarConfig);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    const handleChange = (event: Event) => {
      const detail = (event as CustomEvent<NavigationBarConfig>).detail;
      setConfig(detail ?? loadNavigationBarConfig());
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === NAVIGATION_BAR_STORAGE_KEY) setConfig(loadNavigationBarConfig());
    };
    window.addEventListener(NAVIGATION_BAR_CHANGED_EVENT, handleChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(NAVIGATION_BAR_CHANGED_EVENT, handleChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  if (!config.enabled) return null;

  const zh = language === 'zh';

  return (
    <>
      <nav
        className={`${styles.rail} ${styles[config.position]}`}
        data-position={config.position}
        data-ui-zone="page-navigation"
        aria-label={zh ? '页面导航栏' : 'Page navigation bar'}
        onContextMenu={(event) => {
          event.preventDefault();
          setEditorOpen(true);
        }}
      >
        <div className={styles.items}>
          {config.items.map((item) => {
            const active = pointsToCurrentPage(item, currentPageIndex);
            const label = getNavigationBarItemLabel(item, language);
            return (
              <button
                type="button"
                key={item.id}
                className={`${styles.item} ${active ? styles.active : ''}`}
                title={label}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                onClick={() => executeNavigationAction(item.action, { openInNewTab })}
              >
                <span className={styles.dot} aria-hidden="true" />
                <span className={styles.icon} aria-hidden="true">
                  {item.customIconDataUrl
                    ? <img src={item.customIconDataUrl} alt="" />
                    : <NavigationDefaultIcon icon={item.defaultIcon} />}
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className={styles.editButton}
          onClick={() => setEditorOpen(true)}
          title={zh ? '编辑导航栏' : 'Edit navigation bar'}
          aria-label={zh ? '编辑导航栏' : 'Edit navigation bar'}
        >
          <EditNavigationIcon />
        </button>
      </nav>

      <NavigationBarEditor
        isOpen={editorOpen}
        config={config}
        onClose={() => setEditorOpen(false)}
        onSave={(next) => {
          saveNavigationBarConfig(next);
          setConfig(next);
          setEditorOpen(false);
        }}
      />
    </>
  );
};
