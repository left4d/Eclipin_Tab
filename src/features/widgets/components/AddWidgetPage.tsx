import { useEffect } from 'react';
import { useSpaces } from '@/features/spaces/context/SpacesContext';
import { WIDGET_OPTIONS } from '@/features/settings/components/sections/WidgetsSettingsSection';
import { useWidgetSettingsController } from '@/features/settings/hooks/useWidgetSettingsController';
import type { WidgetPageId } from '../types/widget';
import styles from './AddWidgetPage.module.css';

interface AddWidgetPageProps {
  isOpen: boolean;
  currentPage: WidgetPageId;
  onClose: () => void;
}

export const AddWidgetPage = ({ isOpen, currentPage, onClose }: AddWidgetPageProps) => {
  const { spaces } = useSpaces();
  const controller = useWidgetSettingsController(currentPage, isOpen);
  const {
    widgetTargetPage,
    setWidgetTargetPage,
    widgetLayouts,
    widgetNotice,
    addWidget,
    pageSlideDirection,
  } = controller;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const horizontalSecondaryPage = currentPage > 0 ? currentPage : 1;
  const pageOptions = pageSlideDirection === 'horizontal'
    ? [0, horizontalSecondaryPage]
    : [0, 1];

  return (
    <>
      <div className={styles.backdrop} data-page-scroll-lock="true" onClick={onClose} />
      <section
        className={styles.page}
        role="dialog"
        aria-modal="true"
        aria-label="添加组件"
        data-modal="true"
        data-page-scroll-lock="true"
        onDoubleClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>WIDGET LIBRARY</span>
            <h1>添加组件</h1>
            <p>选择一个组件，它会直接添加到目标页面。可以连续添加多个。</p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="关闭添加组件页面" title="关闭">×</button>
        </header>

        <div className={styles.toolbar}>
          <div className={styles.pageSelector} aria-label="目标页面">
            {pageOptions.map((pageId) => {
              const count = widgetLayouts.filter((widget) => Math.max(0, Math.trunc(widget.pageId ?? 1)) === pageId).length;
              const active = widgetTargetPage === pageId;
              return (
                <button
                  key={pageId}
                  type="button"
                  className={active ? styles.pageChoiceActive : styles.pageChoice}
                  onClick={() => setWidgetTargetPage(pageId)}
                >
                  <span>{pageId === 0 ? '⌂' : pageSlideDirection === 'horizontal' ? '→' : '↧'}</span>
                  <strong>第 {pageId + 1} 页</strong>
                  <small>{count} 个组件</small>
                </button>
              );
            })}
          </div>
          <div className={styles.notice} aria-live="polite">{widgetNotice || `将添加到第 ${widgetTargetPage + 1} 页`}</div>
        </div>

        <div className={styles.scrollArea} data-settings-scroll-container="true">
          <div className={styles.sectionHeading}>
            <div>
              <h2>基础组件</h2>
              <p>时间、效率、信息与网页工具。</p>
            </div>
          </div>
          <div className={styles.widgetGrid}>
            {WIDGET_OPTIONS.map((option) => (
              <button key={option.type} type="button" className={styles.widgetCard} onClick={() => addWidget(option.type)}>
                <span className={styles.widgetIcon}>{option.icon}</span>
                <span className={styles.widgetCopy}>
                  <strong>{option.title}</strong>
                  <small>{option.description}</small>
                </span>
                <span className={styles.addMark}>＋</span>
              </button>
            ))}
          </div>

          {spaces.length > 0 && (
            <>
              <div className={styles.sectionHeading}>
                <div>
                  <h2>空间组件</h2>
                  <p>把 Focus Space 里的站点作为一组入口放到桌面。</p>
                </div>
              </div>
              <div className={styles.spaceGrid}>
                {spaces.map((space) => {
                  const existingWidget = widgetLayouts.find((widget) => widget.type === 'space' && widget.spaceId === space.id);
                  const existingPage = existingWidget ? Math.max(0, Math.trunc(existingWidget.pageId ?? 1)) : null;
                  return (
                    <button
                      key={space.id}
                      type="button"
                      className={`${styles.spaceCard} ${existingWidget ? styles.spaceCardAdded : ''}`}
                      disabled={Boolean(existingWidget)}
                      onClick={() => !existingWidget && addWidget('space', space.id)}
                    >
                      <span className={styles.spaceIcon}>▦</span>
                      <span className={styles.widgetCopy}>
                        <strong>{space.name}</strong>
                        <small>{existingWidget ? `已在第 ${(existingPage ?? 0) + 1} 页` : `${space.apps.length} 个项目`}</small>
                      </span>
                      <span className={styles.addMark}>{existingWidget ? '✓' : '＋'}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
};
