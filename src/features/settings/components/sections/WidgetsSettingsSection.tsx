import type { ReactNode } from 'react';
import { useSpaces } from '@/features/spaces/context/SpacesContext';
import { TimerIcon } from '@/shared/components/icons/TimerIcons';
import type { WidgetSettingsController } from '../../hooks/useWidgetSettingsController';
import type { WidgetType } from '@/features/widgets/types/widget';
import styles from '../Modal/SettingsModal.module.css';

export const WIDGET_OPTIONS: Array<{ type: WidgetType; icon: ReactNode; title: string; description: string }> = [
  { type: 'clock', icon: '🕐', title: '时钟', description: '当前时间、日期与年份' },
  { type: 'analogClock', icon: '◷', title: '圆形时钟', description: '由圆形与指针线条组成的模拟时钟' },
  { type: 'weather', icon: '🌤', title: '天气', description: '当前位置天气与基础指标' },
  { type: 'translate', icon: '译', title: '翻译', description: 'Google / 百度翻译与有道词典查询' },
  { type: 'link', icon: '🔗', title: '快捷链接', description: '图标式网站快速入口' },
  { type: 'notes', icon: '📝', title: '便签', description: '支持轻量 Markdown 预览' },
  { type: 'todo', icon: '🧮', title: '计算器', description: '简单四则运算工具' },
  { type: 'pomodoro', icon: <TimerIcon size={20} />, title: '番茄钟', description: '专注完成后自动切换到休息' },
  { type: 'calendar', icon: '▦', title: '月历', description: '查看当月日期并快速切换月份' },
  { type: 'countdown', icon: 'D−', title: '倒数日', description: '记录重要日期和剩余天数' },
  { type: 'gtrend', icon: '□', title: '空白容器', description: '为画板或贴纸提供装饰背景' },
  { type: 'embed', icon: '🧩', title: '网页嵌入', description: '嵌入 NAS、仪表盘或内网页面' },
  { type: 'bookmarks', icon: '★', title: '书签', description: '同步浏览器书签，界面与空间网站一致' },
  { type: 'openTabs', icon: '▤', title: '打开的标签页', description: '按域名整理当前窗口，可加入空间并保存为会话' },
];

export const WidgetsSettingsSection = ({ controller }: { controller: WidgetSettingsController }) => {
  const { spaces } = useSpaces();
  const {
    widgetTargetPage,
    setWidgetTargetPage,
    widgetCounts,
    widgetLayouts,
    widgetNotice,
    addWidget,
    clearWidgetPage,
    resetWidgetPage,
    currentPage,
    pageSlideDirection,
    widgetTargetCount,
  } = controller;
  const horizontalSecondaryPage = currentPage > 0 ? currentPage : 1;
  const targetPageLabel = `第 ${widgetTargetPage + 1} 页`;

  return (
    <section className={styles.settingsSection}>
      <div className={styles.sectionHeader}>
        <h2>组件</h2>
        <p>{pageSlideDirection === 'horizontal' ? '左右模式每一页固定为一屏，滚轮继续向右进入新的页面。' : '选择添加页面。第一页与搜索和 Dock 共存；第二页是会按需向下延伸的自由画布。'}</p>
      </div>

      <div className={styles.widgetPageSelector}>
        <button
          type="button"
          className={`${styles.widgetPageChoice} ${widgetTargetPage === 0 ? styles.widgetPageChoiceActive : ''}`}
          onClick={() => setWidgetTargetPage(0)}
        >
          <span className={styles.widgetPageIcon}>⌂</span>
          <span className={styles.widgetPageCopy}><strong>第一页</strong><small>首页叠加 · {widgetCounts.first} 个组件</small></span>
          <span className={styles.widgetPageCheck}>{widgetTargetPage === 0 ? '✓' : ''}</span>
        </button>
        <button
          type="button"
          className={`${styles.widgetPageChoice} ${widgetTargetPage === horizontalSecondaryPage ? styles.widgetPageChoiceActive : ''}`}
          onClick={() => setWidgetTargetPage(horizontalSecondaryPage)}
        >
          <span className={styles.widgetPageIcon}>{pageSlideDirection === 'horizontal' ? '→' : '↧'}</span>
          <span className={styles.widgetPageCopy}>
            <strong>{pageSlideDirection === 'horizontal' ? `第 ${horizontalSecondaryPage + 1} 页` : '第二页'}</strong>
            <small>{pageSlideDirection === 'horizontal' ? `固定一屏 · ${widgetLayouts.filter((widget) => (widget.pageId ?? 1) === horizontalSecondaryPage).length} 个组件` : `纵向画布 · ${widgetCounts.second} 个组件`}</small>
          </span>
          <span className={styles.widgetPageCheck}>{widgetTargetPage === horizontalSecondaryPage ? '✓' : ''}</span>
        </button>
      </div>

      <div className={styles.widgetSectionTitle}>
        <div><strong>添加组件</strong><span>将添加到{targetPageLabel}</span></div>
        {widgetNotice && <span className={styles.widgetNotice}>{widgetNotice}</span>}
      </div>
      <div className={styles.widgetOptionGrid}>
        {WIDGET_OPTIONS.map((option) => (
          <button key={option.type} className={`card card--interactive ${styles.widgetOptionCard}`} onClick={() => addWidget(option.type)}>
            <span className={styles.widgetOptionIcon}>{option.icon}</span>
            <span className={styles.widgetOptionCopy}><strong className={styles.widgetOptionTitle}>{option.title}</strong><small className={styles.widgetOptionDesc}>{option.description}</small></span>
            <span className={styles.widgetOptionAdd}>＋</span>
          </button>
        ))}
      </div>

      <div className={`card ${styles.settingsCard}`}>
        <div className={styles.widgetCardHeader}>
          <div><div className={styles.cardTitle}>空间网站组件</div><p>把某个 Focus Space 的网站整理成统一入口。</p></div>
          <span>▦</span>
        </div>
        <div className={styles.spaceWidgetList}>
          {spaces.map((space) => {
            const existingWidget = widgetLayouts.find((widget) => widget.type === 'space' && widget.spaceId === space.id);
            const existingPage = existingWidget ? (existingWidget.pageId ?? 1) : null;
            return (
              <button
                key={space.id}
                className={`${styles.spaceWidgetButton} ${existingWidget ? styles.spaceWidgetButtonAdded : ''}`}
                onClick={() => !existingWidget && addWidget('space', space.id)}
                disabled={Boolean(existingWidget)}
              >
                <span className={styles.spaceWidgetButtonIcon}>▦</span>
                <span className={styles.spaceWidgetButtonCopy}><strong>{space.name}</strong><small>{existingWidget ? `已在第 ${(existingPage ?? 0) + 1} 页`  : `${space.apps.length} 个项目`}</small></span>
                <span className={styles.spaceWidgetButtonAdd}>{existingWidget ? '✓' : '＋'}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={`card ${styles.widgetManageCard}`}>
        <div><strong>当前页面管理</strong><span>{targetPageLabel}共有 {widgetTargetCount} 个组件</span></div>
        <div className={styles.widgetManageActions}>
          <button type="button" onClick={resetWidgetPage}>{widgetTargetPage === 1 ? '恢复默认' : '恢复空白'}</button>
          <button type="button" className={styles.dangerButton} onClick={clearWidgetPage}>清空页面</button>
        </div>
      </div>
    </section>
  );
};
