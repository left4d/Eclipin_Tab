import { lazy, Suspense, type WheelEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { scaleFadeIn, scaleFadeOut } from '@/shared/utils/animations';
import type { WidgetPageId } from '@/features/widgets/types/widget';
import { useWidgetSettingsController } from '../../hooks/useWidgetSettingsController';
import { AppearanceSettingsSection } from '../sections/AppearanceSettingsSection';
import { LayoutSettingsSection } from '../sections/LayoutSettingsSection';
import { SpacesSettingsSection } from '../sections/SpacesSettingsSection';
import { WidgetsSettingsSection } from '../sections/WidgetsSettingsSection';
import { ApiSettingsSection } from '../sections/ApiSettingsSection';
import { AboutSettingsSection } from '../sections/AboutSettingsSection';
import type { SettingsNavigationItem, SettingsSectionId } from '../../types/settings';
import styles from './SettingsModal.module.css';

const VectorIconStudio = lazy(() => import('@/features/vector-icons/components/VectorIconStudio')); 

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  anchorPosition: { x: number; y: number };
  currentPage?: WidgetPageId;
}

const NAVIGATION_ITEMS: SettingsNavigationItem[] = [
  { id: 'appearance', icon: '◐', label: '外观', description: '主题与背景' },
  { id: 'layout', icon: '⌘', label: '布局', description: 'Dock 与行为' },
  { id: 'spaces', icon: '▤', label: '空间', description: '显示与网址' },
  { id: 'widgets', icon: '▦', label: '组件', description: '页面与组件' },
  { id: 'vectors', icon: '◇', label: '矢量图标', description: 'SVG 与画布' },
  { id: 'api', icon: '⌁', label: '接口', description: '权限与密钥' },
  { id: 'about', icon: 'i', label: '关于', description: '项目、致谢与许可' },
];

export const SettingsModal = ({ isOpen, onClose, currentPage = 0 }: SettingsModalProps) => {
  const [isVisible, setIsVisible] = useState(isOpen);
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('appearance');
  const modalRef = useRef<HTMLDivElement>(null);
  const contentPaneRef = useRef<HTMLElement>(null);
  const isClosingRef = useRef(false);
  const widgetController = useWidgetSettingsController(currentPage, isOpen);

  useEffect(() => {
    if (isOpen) {
      isClosingRef.current = false;
      setIsVisible(true);
    }
  }, [isOpen]);

  useLayoutEffect(() => {
    if (isOpen && isVisible && modalRef.current) scaleFadeIn(modalRef.current);
  }, [isOpen, isVisible]);

  useEffect(() => {
    if (!isOpen && isVisible && !isClosingRef.current) {
      isClosingRef.current = true;
      if (modalRef.current) {
        scaleFadeOut(modalRef.current, 300, () => setIsVisible(false));
      } else {
        setIsVisible(false);
      }
    }
  }, [isOpen, isVisible]);

  if (!isVisible) return null;

  const handleClose = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    if (modalRef.current) {
      scaleFadeOut(modalRef.current, 300, () => {
        setIsVisible(false);
        onClose();
      });
      return;
    }
    setIsVisible(false);
    onClose();
  };

  const handleSettingsWheelCapture = (event: WheelEvent<HTMLDivElement>) => {
    event.stopPropagation();
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('[data-settings-scroll-container="true"]')) return;

    const pane = contentPaneRef.current;
    if (!pane || Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
    event.preventDefault();
    const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? pane.clientHeight : 1;
    pane.scrollTop += event.deltaY * multiplier;
  };

  const renderSection = () => {
    if (activeSection === 'appearance') return <AppearanceSettingsSection />;
    if (activeSection === 'layout') return <LayoutSettingsSection />;
    if (activeSection === 'spaces') return <SpacesSettingsSection />;
    if (activeSection === 'widgets') return <WidgetsSettingsSection controller={widgetController} />;
    if (activeSection === 'vectors') {
      return (
        <Suspense fallback={<section className={styles.settingsSection}><div className={styles.settingsCard}>正在加载矢量图标工作台…</div></section>}>
          <VectorIconStudio />
        </Suspense>
      );
    }
    if (activeSection === 'api') return <ApiSettingsSection />;
    return <AboutSettingsSection />;
  };

  return (
    <>
      <div
        className={styles.backdrop}
        data-page-scroll-lock="true"
        onClick={handleClose}
        onDoubleClick={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
      />
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="设置"
        data-modal="true"
        data-page-scroll-lock="true"
        onDoubleClick={(event) => event.stopPropagation()}
        onWheel={handleSettingsWheelCapture}
      >
        <div ref={modalRef} className={styles.innerContainer}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarBrand}>
              <span className={styles.sidebarBrandMark}>E</span>
              <div>
                <div className={styles.sidebarTitle}>Eclipin</div>
                <div className={styles.sidebarSubtitle}>Personal workspace</div>
              </div>
            </div>
            <nav className={styles.sidebarNavigation} aria-label="设置分类">
              {NAVIGATION_ITEMS.map((item) => (
                <button
                  key={item.id}
                  className={`${styles.sidebarItem} ${activeSection === item.id ? styles.sidebarItemActive : ''}`}
                  onClick={() => setActiveSection(item.id)}
                >
                  <span className={styles.sidebarItemIcon}>{item.icon}</span>
                  <span className={styles.sidebarItemText}><strong>{item.label}</strong><small>{item.description}</small></span>
                </button>
              ))}
            </nav>
            <div className={styles.sidebarSummary}>
              <span>小组件</span>
              <strong>{widgetController.widgetLayouts.length}</strong>
              <small>{widgetController.pageSlideDirection === 'horizontal' ? `当前第 ${widgetController.currentPage + 1} 页 · ${widgetController.widgetTargetCount} 个` : `首页 ${widgetController.widgetCounts.first} · 第二页 ${widgetController.widgetCounts.second}`}</small>
            </div>
          </aside>
          <main ref={contentPaneRef} className={styles.contentPane} data-widget-scrollable="true" data-settings-scroll-container="true">
            <div className={styles.contentToolbar}>
              <span>SETTINGS</span>
              <button type="button" onClick={handleClose} aria-label="关闭设置" title="关闭设置">×</button>
            </div>
            {renderSection()}
          </main>
        </div>
      </div>
    </>
  );
};
