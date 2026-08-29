import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useThemeData } from '@/features/theme/context/ThemeContext';
import editIcon from '@/assets/icons/edit.svg';
import fontIcon from '@/assets/icons/font.svg';
import linkIcon from '@/assets/icons/link.svg';
import pinIcon from '@/assets/icons/pin.svg';
import priorityIcon from '@/assets/icons/star3.svg';
import { getValidEmbedUrl } from '@/shared/utils/embedUrl';
import { navigateToUrl } from '@/shared/utils/url';
import { copyElementSize, formatElementSize, readElementSizeClipboard } from '@/shared/utils/elementSizeClipboard';
import { WIDGET_DISPLAY_NAMES } from '../config/widgetLayoutConfig';
import type { WidgetContainerStyle, WidgetLayout } from '../types/widget';
import styles from './WidgetContextMenu.module.css';

interface WidgetContextMenuProps {
  widget: WidgetLayout;
  x: number;
  y: number;
  anchorRect: DOMRect;
  onClose: () => void;
  onEditLink: (id: string, anchorRect: DOMRect) => void;
  onEditLinkText: (id: string, anchorRect: DOMRect) => void;
  onEditFont: (id: string, anchorRect: DOMRect) => void;
  onEditEmbed: (id: string, anchorRect: DOMRect) => void;
  onEditWeatherLocation: (id: string, anchorRect: DOMRect) => void;
  onEditPriority: (id: string, anchorRect: DOMRect) => void;
  onEditSize: (id: string, anchorRect: DOMRect) => void;
  onPasteSize: (id: string) => void;
  onEditAnchor: (id: string) => void;
  onMovePage: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleScreenFixed: (id: string) => void;
  onSetContainerStyle: (id: string, style: WidgetContainerStyle | undefined) => void;
}


const CONTAINER_STYLE_OPTIONS: Array<{ value: WidgetContainerStyle | undefined; label: string }> = [
  { value: undefined, label: '跟随全局' },
  { value: 'classic', label: '经典贴纸' },
  { value: 'frame', label: '柔和面板' },
  { value: 'ambient', label: '环境仓' },
  { value: 'veil', label: '雾面薄片' },
];

const CONTAINER_STYLE_LABELS: Record<WidgetContainerStyle, string> = {
  classic: '经典贴纸',
  frame: '柔和面板',
  ambient: '环境仓',
  veil: '雾面薄片',
};

const MenuIcon = ({ src }: { src: string }) => (
  <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${src})`, maskImage: `url(${src})` }} />
);

export const WidgetContextMenu = ({
  widget,
  x,
  y,
  anchorRect,
  onClose,
  onEditLink,
  onEditLinkText,
  onEditFont,
  onEditEmbed,
  onEditWeatherLocation,
  onEditPriority,
  onEditSize,
  onPasteSize,
  onEditAnchor,
  onMovePage,
  onTogglePin,
  onToggleScreenFixed,
  onSetContainerStyle,
}: WidgetContextMenuProps) => {
  const { pageSlideDirection, containerStyle: globalContainerStyle } = useThemeData();
  const [showContainerStyles, setShowContainerStyles] = useState(false);
  const menuWidth = 196;
  const menuHeight = (widget.type === 'embed' ? 474 : 434) + (showContainerStyles ? 154 : 0);
  const padding = 10;
  const left = Math.max(padding, Math.min(x, window.innerWidth - menuWidth - padding));
  const top = Math.max(padding, Math.min(y, window.innerHeight - menuHeight - padding));
  const embedUrl = widget.type === 'embed' ? getValidEmbedUrl(widget.embedUrl) : null;
  const copiedSize = readElementSizeClipboard();
  const sizeSubmenuOpensLeft = left + menuWidth + 8 + 164 + padding > window.innerWidth;

  const run = (action: () => void) => {
    action();
    onClose();
  };

  return createPortal(
    <div
      className={styles.contextMenu}
      style={{ left, top }}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className={styles.menuLabel}>
        <span>{WIDGET_DISPLAY_NAMES[widget.type]}</span>
        <strong>P{widget.priority ?? 0}</strong>
      </div>
      <div className={styles.menuDivider} />
      <div className={styles.menuOptions}>
        {widget.type === 'link' && (
          <>
            <button className={styles.menuItem} onClick={() => run(() => onEditLink(widget.id, anchorRect))}>
              <MenuIcon src={linkIcon} /><span>更改网址</span>
            </button>
            <button className={styles.menuItem} onClick={() => run(() => onEditLinkText(widget.id, anchorRect))}>
              <MenuIcon src={editIcon} /><span>更改文字</span>
            </button>
          </>
        )}
        {['clock', 'countdown'].includes(widget.type) && (
          <button className={styles.menuItem} onClick={() => run(() => onEditFont(widget.id, anchorRect))}>
            <MenuIcon src={fontIcon} /><span>切换字体</span>
          </button>
        )}
        {widget.type === 'weather' && (
          <button className={styles.menuItem} onClick={() => run(() => onEditWeatherLocation(widget.id, anchorRect))}>
            <span className={styles.textIcon}>⌖</span><span>设置天气位置</span>
          </button>
        )}
        {widget.type === 'embed' && (
          <>
            <button className={styles.menuItem} onClick={() => run(() => onEditEmbed(widget.id, anchorRect))}>
              <MenuIcon src={linkIcon} /><span>设置嵌入网址</span>
            </button>
            {embedUrl && (
              <button className={styles.menuItem} onClick={() => run(() => navigateToUrl(embedUrl, { openInNewTab: true }))}>
                <MenuIcon src={linkIcon} /><span>在新标签页打开</span>
              </button>
            )}
          </>
        )}
        <div className={styles.sizeMenuWrap}>
          <button type="button" className={styles.menuItem}>
            <span className={styles.textIcon}>↔</span>
            <span>尺寸</span>
            <small>{formatElementSize({ width: widget.w, height: widget.h })}</small>
            <span className={styles.menuChevron}>›</span>
          </button>
          <div className={`${styles.sizeSubmenu} ${sizeSubmenuOpensLeft ? styles.sizeSubmenuLeft : ''}`}>
            <button type="button" className={styles.menuItem} onClick={() => run(() => onEditSize(widget.id, anchorRect))}>
              <MenuIcon src={editIcon} /><span>编辑</span>
            </button>
            <button type="button" className={styles.menuItem} disabled={!copiedSize} onClick={() => copiedSize && run(() => onPasteSize(widget.id))}>
              <span className={styles.textIcon}>⎘</span><span>粘贴尺寸</span>
            </button>
            <button type="button" className={styles.menuItem} onClick={() => run(() => { copyElementSize({ width: widget.w, height: widget.h }); })}>
              <span className={styles.textIcon}>⧉</span><span>复制尺寸</span>
            </button>
          </div>
        </div>
        <button className={styles.menuItem} onClick={() => run(() => onEditPriority(widget.id, anchorRect))}>
          <MenuIcon src={priorityIcon} /><span>设置优先级</span>
        </button>
        {widget.type !== 'link' && (
          <>
            <button className={styles.menuItem} onClick={() => setShowContainerStyles((value) => !value)}>
              <span className={styles.textIcon}>▣</span>
              <span>切换容器样式</span>
              <small>{widget.containerStyle ? CONTAINER_STYLE_LABELS[widget.containerStyle] : `跟随·${CONTAINER_STYLE_LABELS[globalContainerStyle]}`}</small>
            </button>
            {showContainerStyles && (
              <div className={styles.containerStyleGrid} aria-label="单个小组件容器样式">
                {CONTAINER_STYLE_OPTIONS.map((option) => {
                  const active = widget.containerStyle === option.value;
                  return (
                    <button
                      key={option.value ?? 'inherit'}
                      type="button"
                      className={`${styles.containerStyleOption} ${active ? styles.containerStyleOptionActive : ''}`}
                      onClick={() => onSetContainerStyle(widget.id, option.value)}
                      title={option.value ? `仅这个组件使用${option.label}` : `恢复跟随全局：${CONTAINER_STYLE_LABELS[globalContainerStyle]}`}
                    >
                      <span className={styles.containerStyleSwatch} data-style={option.value ?? globalContainerStyle} />
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
        <button className={styles.menuItem} onClick={() => run(() => onEditAnchor(widget.id))}>
          <span className={styles.textIcon}>#</span><span>设置标签 ID</span>{widget.anchorId ? <small>#{widget.anchorId}</small> : null}
        </button>
        <div className={styles.menuDivider} />
        {widget.positionMode !== 'viewport' && <button className={styles.menuItem} onClick={() => run(() => onMovePage(widget.id))}>
          <span className={styles.textIcon}>{pageSlideDirection === 'horizontal' ? '→' : (widget.pageId ?? 1) === 0 ? '↓' : '↑'}</span>
          <span>{pageSlideDirection === 'horizontal' ? '移到下一页' : (widget.pageId ?? 1) === 0 ? '移到第二页' : '移到首页'}</span>
        </button>}
        <button className={styles.menuItem} onClick={() => run(() => onToggleScreenFixed(widget.id))}>
          <span className={styles.textIcon}>◎</span><span>{widget.positionMode === 'viewport' ? '恢复随页面滚动' : '相对屏幕固定'}</span>
        </button>
        <button className={styles.menuItem} onClick={() => run(() => onTogglePin(widget.id))}>
          <MenuIcon src={pinIcon} /><span>{widget.isPinned ? '取消固定' : '固定位置'}</span>
        </button>
      </div>
    </div>,
    document.body,
  );
};
