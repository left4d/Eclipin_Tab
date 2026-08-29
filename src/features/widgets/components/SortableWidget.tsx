import { Fragment } from 'react';
import { flushSync } from 'react-dom';
import { FREE_LAYOUT_OVERFLOW_RATIO } from '@/shared/utils/freeLayoutBounds';
import { WIDGET_MIN_SIZE } from '../config/widgetLayoutConfig';
import { FolderView } from '@/features/dock/components/FolderView/FolderView';
import { executeNavigationAction } from '@/shared/navigation';
import { useSortableWidgetController } from '../hooks/useSortableWidgetController';
import { SortableWidgetBody } from './sortable/SortableWidgetBody';
import type { SortableWidgetProps } from './sortable/SortableWidget.types';
import styles from './WidgetPanel.module.css';

export const SortableWidget = (props: SortableWidgetProps) => {
  const {
    widget,
    onResize,
    onActivate,
    onOpenWidgetMenu,
    onEditSpaceItem,
    onDeleteSpaceItem,
    onUpdateSpaceFolderItems,
    onMoveSpaceFolderItemToRoot,
  } = props;
  const controller = useSortableWidgetController(props);
  const {
    getSpaceRootDropTarget,
    isDragging,
    isEditMode,
    meta,
    openInNewTab,
    openSpaceFolder,
    openSpaceFolderItem,
    priority,
    setOpenSpaceFolder,
    startDrag,
    widgetRef,
    widgetStyle,
  } = controller;


  const currentPageId = widget.pageId ?? 1;

  return (
    <Fragment>
    <div
      ref={widgetRef}
      data-widget-type={widget.type}
      data-widget-id={widget.id}
      data-widget-anchor={widget.anchorId || undefined}
      data-widget-page={currentPageId}
      data-widget-container-style={widget.containerStyle || undefined}
      data-selected={props.isSelected ? 'true' : undefined}
      className={`${styles.widget} ${widget.type === 'clock' ? styles.clockWidget : ''} ${widget.type === 'analogClock' ? styles.analogClockWidget : ''} ${widget.type === 'weather' ? styles.weatherWidget : ''} ${widget.type === 'translate' ? styles.translateWidget : ''} ${widget.type === 'link' ? styles.linkWidget : ''} ${widget.type === 'space' || widget.type === 'bookmarks' ? styles.spaceWidget : ''} ${widget.type === 'bookmarks' ? styles.bookmarksWidget : ''} ${widget.type === 'openTabs' ? styles.openTabsWidget : ''} ${widget.type === 'notes' ? styles.notesWidget : ''} ${widget.type === 'todo' ? styles.calculatorWidget : ''} ${widget.type === 'pomodoro' ? styles.pomodoroWidget : ''} ${widget.type === 'calendar' ? styles.calendarWidget : ''} ${widget.type === 'countdown' ? styles.countdownWidget : ''} ${widget.type === 'gtrend' ? styles.blankWidget : ''} ${widget.type === 'embed' ? styles.embedWidget : ''} ${isDragging ? styles.dragging : ''} ${isEditMode ? styles.editing : ''} ${widget.isPinned ? styles.pinned : ''} ${widget.positionMode === 'viewport' ? styles.viewportFixed : ''}`}
      style={widgetStyle}
      onPointerDownCapture={(event) => {
        if (isEditMode) onActivate(widget.id, event.ctrlKey || event.metaKey || event.shiftKey);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onOpenWidgetMenu(widget.id, event.clientX, event.clientY, widgetRef.current?.getBoundingClientRect() ?? new DOMRect(event.clientX, event.clientY, 0, 0));
      }}
    >
      <div className={styles.widgetInner}>
        {!['clock', 'analogClock', 'weather', 'translate', 'notes', 'todo', 'pomodoro', 'calendar', 'countdown', 'gtrend', 'embed', 'space', 'bookmarks', 'openTabs'].includes(widget.type) && (
          <div className={styles.widgetHeader} onPointerDown={startDrag}>
            <div className={styles.widgetTitle}>
              <span className={styles.widgetIcon}>{meta.icon}</span>
              <span className={styles.widgetName}>{meta.name}</span>
            </div>
          </div>
        )}
        <div className={styles.body}><SortableWidgetBody props={props} controller={controller} /></div>
      </div>
      {isEditMode && (
        <>
          <div className={styles.priorityBadge} title={`层叠优先级：${priority}`}>P{priority}</div>
          {widget.anchorId && <div className={styles.widgetAnchorBadge} title={`内部标签：#${widget.anchorId}`}>#{widget.anchorId}</div>}
        </>
      )}
      <div
        className={styles.resizeHandle}
        onPointerDown={(event) => {
          if (widget.isPinned || event.button !== 0) return;
          event.preventDefault();
          event.stopPropagation();
          const el = widgetRef.current;
          if (!el) return;
          const startX = event.clientX;
          const startY = event.clientY;
          const startW = widget.w;
          const startH = widget.h;
          const scale = Math.max(0.1, props.viewportScale);
          const min = WIDGET_MIN_SIZE[widget.type];
          const visibleRatio = 1 - FREE_LAYOUT_OVERFLOW_RATIO;
          const maxW = Math.min(props.canvasWidth, Math.max(min.w, (props.canvasWidth - widget.x) / visibleRatio));
          const maxH = props.infiniteY
            ? Number.POSITIVE_INFINITY
            : Math.min(props.canvasHeight, Math.max(min.h, (props.canvasHeight - widget.y) / visibleRatio));
          let latestW = startW;
          let latestH = startH;
          let frame = 0;
          el.dataset.resizing = 'true';
          el.style.transition = 'none';

          const clampSize = (width: number, height: number) => {
            if (widget.lockAspectRatio) {
              const startRatio = startW / Math.max(1, startH);
              const widthScale = width / Math.max(1, startW);
              const heightScale = height / Math.max(1, startH);
              const requestedScale = Math.abs(widthScale - 1) >= Math.abs(heightScale - 1)
                ? widthScale
                : heightScale;
              const minScale = Math.max(min.w / startW, min.h / startH);
              const maxScale = Math.min(maxW / startW, maxH / startH);
              const nextScale = Math.min(maxScale, Math.max(minScale, requestedScale));
              const nextW = startW * nextScale;
              return [nextW, nextW / startRatio] as const;
            }
            return [
              Math.min(maxW, Math.max(min.w, width)),
              Math.min(maxH, Math.max(min.h, height)),
            ] as const;
          };

          const applyPreview = () => {
            frame = 0;
            if (widget.type === 'embed') {
              el.style.transformOrigin = 'top left';
              el.style.willChange = 'transform';
              el.style.transform = `scale(${latestW / startW}, ${latestH / startH})`;
            } else {
              el.style.width = `${latestW}px`;
              el.style.height = `${latestH}px`;
            }
          };

          const onMove = (moveEvent: PointerEvent) => {
            const deltaX = (moveEvent.clientX - startX) / scale;
            const deltaY = (moveEvent.clientY - startY) / scale;
            const requested = [startW + deltaX, startH + deltaY] as const;
            [latestW, latestH] = clampSize(requested[0], requested[1]);
            if (!frame) frame = requestAnimationFrame(applyPreview);
          };

          const finish = () => {
            if (frame) cancelAnimationFrame(frame);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', finish);
            window.removeEventListener('pointercancel', finish);
            // 先同步提交 React 尺寸，再移除仅用于预览的 transform。
            // 旧实现会在 React 提交后下一帧把 width/height 清空，导致 React 认为样式已是最新值
            // 而不再补写，嵌入组件因此可能在松手后塌缩/消失。
            flushSync(() => onResize(widget.id, latestW, latestH));
            el.style.transform = '';
            el.style.transformOrigin = '';
            el.style.willChange = '';
            el.style.transition = '';
            delete el.dataset.resizing;
          };

          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', finish, { once: true });
          window.addEventListener('pointercancel', finish, { once: true });
        }}
      />
    </div>
    {openSpaceFolderItem && openSpaceFolder && widget.spaceId && (
      <FolderView
        folder={openSpaceFolderItem}
        isEditMode={isEditMode}
        anchorRect={openSpaceFolder.anchorRect}
        placement="auto"
        onClose={() => setOpenSpaceFolder(null)}
        onItemClick={(item) => {
          if (item.action) executeNavigationAction(item.action, { openInNewTab });
        }}
        onItemEdit={(item, rect) => onEditSpaceItem(
          widget.id,
          widget.spaceId!,
          item,
          rect ?? openSpaceFolder.anchorRect,
        )}
        onItemDelete={(item) => onDeleteSpaceItem(widget.spaceId!, item.id)}
        onItemsReorder={(items) => onUpdateSpaceFolderItems(widget.spaceId!, openSpaceFolderItem.id, items)}
        onItemDragOut={(item, mousePosition) => {
          const target = getSpaceRootDropTarget(mousePosition, [openSpaceFolderItem.id, item.id]);
          onMoveSpaceFolderItemToRoot(
            widget.spaceId!,
            openSpaceFolderItem.id,
            item.id,
            target?.id,
            target?.placement,
          );
          setOpenSpaceFolder(null);
        }}
      />
    )}
    </Fragment>
  );
};
