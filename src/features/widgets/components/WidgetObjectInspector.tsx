import { useState } from 'react';
import { ObjectInspector, type ObjectInspectorSection } from '@/shared/components/ObjectInspector/ObjectInspector';
import { useThemeData } from '@/features/theme/context/ThemeContext';
import { WIDGET_DISPLAY_NAMES } from '../config/widgetLayoutConfig';
import { normalizePriority } from '../services/widgetLayoutService';
import type { WidgetContainerStyle, WidgetLayout } from '../types/widget';
import styles from './WidgetPanel.module.css';

interface WidgetObjectInspectorProps {
  widget: WidgetLayout;
  onClose: () => void;
  onEditLink: (id: string, anchorRect: DOMRect) => void;
  onEditLinkText: (id: string, anchorRect: DOMRect) => void;
  onEditFont: (id: string, anchorRect: DOMRect) => void;
  onEditEmbed: (id: string, anchorRect: DOMRect) => void;
  onEditWeatherLocation: (id: string, anchorRect: DOMRect) => void;
  onEditSize: (id: string, anchorRect: DOMRect) => void;
  onEditAnchor: (id: string) => void;
  onMovePage: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleScreenFixed: (id: string) => void;
  onSetContainerStyle: (id: string, style: WidgetContainerStyle | undefined) => void;
  onUpdate: (id: string, updates: Partial<WidgetLayout>) => void;
  onRemove: (id: string) => void;
}

const CONTAINER_STYLES: Array<{ value: WidgetContainerStyle | undefined; label: string }> = [
  { value: undefined, label: '跟随全局' },
  { value: 'classic', label: '经典' },
  { value: 'frame', label: '柔和' },
  { value: 'ambient', label: '环境' },
  { value: 'veil', label: '雾面' },
];

const LINK_COLORS = ['#1C1C1E', '#FFFFFF', '#FF3B30', '#FF9500', '#34C759', 'var(--fusion-accent)', '#AF52DE'];

const getWidgetRect = (id: string) =>
  document.querySelector<HTMLElement>(`[data-widget-id="${id}"]`)?.getBoundingClientRect()
  ?? new DOMRect(Math.max(12, window.innerWidth - 360), 120, 320, 120);

export const WidgetObjectInspector = ({
  widget,
  onClose,
  onEditLink,
  onEditLinkText,
  onEditFont,
  onEditEmbed,
  onEditWeatherLocation,
  onEditSize,
  onEditAnchor,
  onMovePage,
  onTogglePin,
  onToggleScreenFixed,
  onSetContainerStyle,
  onUpdate,
  onRemove,
}: WidgetObjectInspectorProps) => {
  const [section, setSection] = useState<ObjectInspectorSection>('appearance');
  const { pageSlideDirection, containerStyle: globalContainerStyle } = useThemeData();
  const priority = normalizePriority(widget.priority ?? 0);
  const widgetName = widget.name?.trim() || WIDGET_DISPLAY_NAMES[widget.type];
  const pageNumber = Math.max(0, Math.trunc(widget.pageId ?? 1)) + 1;
  const summary = `${Math.round(widget.w)}×${Math.round(widget.h)} · P${priority}${widget.positionMode === 'viewport' ? ' · 屏幕固定' : ` · 第${pageNumber}页`}`;
  const anchorRect = () => getWidgetRect(widget.id);

  const primaryAction = (() => {
    if (widget.type === 'link') return <button type="button" className="btn btn--sm btn--accent" onClick={() => onEditLink(widget.id, anchorRect())}>编辑链接</button>;
    if (widget.type === 'weather') return <button type="button" className="btn btn--sm btn--accent" onClick={() => onEditWeatherLocation(widget.id, anchorRect())}>天气位置</button>;
    if (widget.type === 'embed') return <button type="button" className="btn btn--sm btn--accent" onClick={() => onEditEmbed(widget.id, anchorRect())}>嵌入设置</button>;
    if (widget.type === 'clock' || widget.type === 'countdown') return <button type="button" className="btn btn--sm btn--accent" onClick={() => onEditFont(widget.id, anchorRect())}>字体</button>;
    return null;
  })();

  return (
    <ObjectInspector
      kind="小组件"
      title={widgetName}
      summary={summary}
      activeSection={section}
      onSectionChange={setSection}
      onClose={onClose}
      primaryActions={
        <>
          {primaryAction}
          {widget.type === 'link' && <button type="button" className="btn btn--sm" onClick={() => onEditLinkText(widget.id, anchorRect())}>文字样式</button>}
          <button type="button" className="btn btn--sm" onClick={() => onEditSize(widget.id, anchorRect())}>尺寸</button>
          <button type="button" className="btn btn--sm" onClick={() => onEditAnchor(widget.id)}>标签</button>
          <button type="button" className="btn btn--sm btn--danger" onClick={() => onRemove(widget.id)}>删除</button>
        </>
      }
    >
      {section === 'appearance' ? (
        <>
          {widget.type !== 'link' && (
            <div className={styles.widgetInspectorField}>
              <span>容器材质</span>
              <div className={styles.widgetInspectorStyleGrid}>
                {CONTAINER_STYLES.map((option) => {
                  const active = widget.containerStyle === option.value;
                  return (
                    <button
                      key={option.value ?? 'inherit'}
                      type="button"
                      className={active ? styles.widgetInspectorActive : ''}
                      onClick={() => onSetContainerStyle(widget.id, option.value)}
                      title={option.value ? option.label : `跟随全局：${globalContainerStyle}`}
                    >
                      <span data-style={option.value ?? globalContainerStyle} />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {widget.type === 'link' && (
            <>
              <button
                type="button"
                className={`${styles.widgetInspectorWideButton} ${widget.linkTextHidden ? styles.widgetInspectorActive : ''}`}
                onClick={() => onUpdate(widget.id, { linkTextHidden: !widget.linkTextHidden })}
              >
                {widget.linkTextHidden ? '显示文字' : '不显示文字'}
              </button>
              <div className={styles.widgetInspectorRow}>
                <span>字号</span>
                <input
                  type="range" className="range"
                  min={12}
                  max={48}
                  step={1}
                  value={widget.linkTextSize ?? 20}
                  onChange={(event) => onUpdate(widget.id, { linkTextSize: Number(event.target.value) })}
                />
                <strong>{widget.linkTextSize ?? 20}</strong>
              </div>
              <div className={styles.widgetInspectorColorRow}>
                <button
                  type="button"
                  className={`${styles.widgetInspectorAutoColor} ${!widget.linkTextColor ? styles.widgetInspectorActive : ''}`}
                  onClick={() => onUpdate(widget.id, { linkTextColor: undefined })}
                >
                  自动
                </button>
                {LINK_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`文字颜色 ${color}`}
                    className={widget.linkTextColor === color ? styles.widgetInspectorColorActive : ''}
                    style={{ background: color }}
                    onClick={() => onUpdate(widget.id, { linkTextColor: color })}
                  />
                ))}
              </div>
            </>
          )}

          {(widget.type === 'clock' || widget.type === 'countdown') && (
            <button type="button" className={styles.widgetInspectorWideButton} onClick={() => onEditFont(widget.id, anchorRect())}>
              更换字体
            </button>
          )}

          {widget.type === 'weather' && (
            <button type="button" className={styles.widgetInspectorWideButton} onClick={() => onEditWeatherLocation(widget.id, anchorRect())}>
              修改天气位置
            </button>
          )}

          {widget.type === 'embed' && (
            <button type="button" className={styles.widgetInspectorWideButton} onClick={() => onEditEmbed(widget.id, anchorRect())}>
              修改嵌入内容
            </button>
          )}
        </>
      ) : (
        <>
          <div className={styles.widgetInspectorRow}>
            <span>优先级</span>
            <input
              className={`field ${styles.widgetInspectorNumberInput}`}
              type="number"
              min={-999}
              max={999}
              step={1}
              value={priority}
              onChange={(event) => onUpdate(widget.id, { priority: normalizePriority(Number(event.target.value)) })}
            />
            <small>越大越靠前</small>
          </div>
          <div className={styles.widgetInspectorToggleGrid}>
            <button
              type="button"
              className={widget.lockAspectRatio ? styles.widgetInspectorActive : ''}
              onClick={() => onUpdate(widget.id, { lockAspectRatio: !widget.lockAspectRatio })}
            >
              {widget.lockAspectRatio ? '✓ 锁定宽高比' : '锁定宽高比'}
            </button>
            <button
              type="button"
              className={widget.isPinned ? styles.widgetInspectorActive : ''}
              onClick={() => onTogglePin(widget.id)}
            >
              {widget.isPinned ? '✓ 已锁定位置' : '锁定位置'}
            </button>
            <button
              type="button"
              className={widget.positionMode === 'viewport' ? styles.widgetInspectorActive : ''}
              onClick={() => onToggleScreenFixed(widget.id)}
            >
              {widget.positionMode === 'viewport' ? '✓ 屏幕固定' : '相对屏幕固定'}
            </button>
            {widget.positionMode !== 'viewport' && (
              <button type="button" onClick={() => onMovePage(widget.id)}>
                {pageSlideDirection === 'horizontal' ? '移到下一页' : (widget.pageId ?? 1) === 0 ? '移到第二页' : '移到首页'}
              </button>
            )}
          </div>
          <button type="button" className={styles.widgetInspectorWideButton} onClick={() => onEditSize(widget.id, anchorRect())}>
            精确设置尺寸 · {Math.round(widget.w)} × {Math.round(widget.h)}
          </button>
        </>
      )}
    </ObjectInspector>
  );
};
