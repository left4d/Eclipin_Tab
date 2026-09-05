import { useState } from 'react';
import { requestBookmarkPermission } from '@/features/dock/utils/bookmarks';
import { AddEditModal } from '@/features/dock/components/Modal/AddEditModal';
import type { DockItem } from '@/features/dock/types/dock';
import { BreakModeIcon, FocusModeIcon, PauseIcon, PlayIcon, ResetIcon } from '@/shared/components/icons/TimerIcons';
import { getEmbedHostLabel, getValidEmbedUrl } from '@/shared/utils/embedUrl';
import { executeNavigationAction } from '@/shared/navigation';
import { getThemeAwareLinkColor, openExternalUrl } from '../../utils/widgetFormatters';
import { renderMarkdown } from './MarkdownPreview';
import { BookmarkListItem } from './BookmarkListItem';
import { EmbeddedWebPage } from './EmbeddedWebPage';
import { SpaceAppButton } from './SpaceAppButton';
import { renderTimeWidgetBody } from './TimeWidgetBodies';
import { WeatherWidgetBody } from './WeatherWidgetBody';
import { TranslatorWidgetBody } from './TranslatorWidgetBody';
import { PomodoroDurationMenu } from './PomodoroDurationMenu';
import { OpenTabsWidgetBody } from './OpenTabsWidgetBody';
import { ColorPickerWidgetBody } from './ColorPickerWidgetBody';
import bookmarkStyles from './BookmarkWidget.module.css';
import type { SortableWidgetProps } from './SortableWidget.types';
import type { SortableWidgetController } from '../../hooks/useSortableWidgetController';
import styles from '../WidgetPanel.module.css';

interface SortableWidgetBodyProps {
  props: SortableWidgetProps;
  controller: SortableWidgetController;
}

export const SortableWidgetBody = ({ props, controller }: SortableWidgetBodyProps) => {
  const {
    widget,
    onEditSpaceItem,
    onAddSpaceItem,
    onDeleteSpaceItem,
    onReorderSpaceItem,
    onMergeSpaceItem,
    onConfigureEmbed,
  } = props;
  const {
    activePomodoroMinutes,
    adjustPomodoroMinutes,
    applyNoteInlineFormat,
    authorizeAndReloadEmbed,
    bookmarkCount,
    bookmarkIconProgress,
    bookmarkIconRefreshKey,
    bookmarkItems,
    bookmarkPermissionGranted,
    bookmarkStatus,
    calculatorDisplay,
    commitNote,
    draggedSpaceItemId,
    embedReloadVersion,
    embedSessionIssue,
    expandedBookmarkFolderIds,
    fetchBookmarkIcons,
    handleCalculatorInput,
    handleEmbedLoad,
    isEditMode,
    isEmbedAuthorizing,
    isEmbedPaused,
    isLocalEmbedLoading,
    localEmbedHtml,
    localEmbedUrl,
    localEmbedName,
    localEmbedEntryPath,
    reloadEmbed,
    isFetchingBookmarkIcons,
    isNoteEditing,
    isPomodoroMenuOpen,
    isRunning,
    linkIcon,
    minutes,
    noteDraft,
    noteFontSize,
    noteTextAreaRef,
    openInNewTab,
    openNoteEditor,
    pomodoroHintText,
    pomodoroMenuStyle,
    pomodoroMode,
    pomodoroProgress,
    resetPomodoro,
    seconds,
    setBookmarkPermissionGranted,
    setBookmarkRefreshKey,
    setDraggedSpaceItemId,
    setIsNoteEditing,
    setIsPomodoroMenuOpen,
    setNoteDraft,
    setOpenSpaceFolder,
    setPomodoroMinutes,
    setSpaceDropTarget,
    showNotePreview,
    space,
    spaceDropTarget,
    spaceItems,
    spaceWebsiteCount,
    startDrag,
    suppressLinkClickRef,
    switchPomodoroMode,
    theme,
    toggleBookmarkFolder,
    togglePomodoro,
    updateNoteFontSize,
    widgetRef,
  } = controller;
  const [editingBookmark, setEditingBookmark] = useState<{ item: DockItem; anchorRect: DOMRect } | null>(null);
  const handleBookmarkSave = (updates: Partial<DockItem>) => {
    const current = editingBookmark?.item;
    if (!current || current.type !== 'app') return;

    const nextIcons = { ...(widget.bookmarkIcons ?? {}) };
    if (updates.icon) {
      nextIcons[current.id] = { icon: updates.icon, iconSmall: Boolean(updates.iconSmall) };
      props.onUpdate(widget.id, { bookmarkIcons: nextIcons });
    }

    setEditingBookmark(null);
    setBookmarkRefreshKey((value) => value + 1);
  };

  const renderBody = () => {
    const timeBody = renderTimeWidgetBody(props, controller);
    if (timeBody) return timeBody;

    if (widget.type === 'weather') return <WeatherWidgetBody props={props} controller={controller} />;
    if (widget.type === 'translate') return <TranslatorWidgetBody props={props} controller={controller} />;
    if (widget.type === 'openTabs') return <OpenTabsWidgetBody widget={widget} onUpdate={props.onUpdate} startDrag={startDrag} />;
    if (widget.type === 'colorPicker') return <ColorPickerWidgetBody widget={widget} onUpdate={props.onUpdate} startDrag={startDrag} />;

    if (widget.type === 'link') {
      const name = widget.name || 'GitHub';
      const url = widget.url || 'https://github.com/';
      const scale = Math.max(0.72, Math.min(widget.w / 112, widget.h / 138));
      const fontSize = Math.round((widget.linkTextSize ?? 20) * scale);
      const iconSize = Math.max(52, Math.min(widget.w * 0.86, widget.h - fontSize - 18));
      const linkStrokeWidth = Math.max(0, widget.linkTextStroke ?? 6);
      const linkStrokeDilate = linkStrokeWidth * 0.75;
      const linkStrokeBlur = Math.max(0.5, linkStrokeWidth * 0.33);
      const linkStrokeFilterId = `link-text-stroke-${widget.id}`;
      const linkStrokeFilter = linkStrokeWidth === 0 ? 'none' : `url(#${linkStrokeFilterId})`;
      return (
        <button
          type="button"
          className={styles.linkBody}
          title={`${name} · ${url}`}
          aria-label={`打开 ${name}`}
          onPointerDown={startDrag}
          onClick={(event) => {
            if (suppressLinkClickRef.current) {
              event.preventDefault();
              suppressLinkClickRef.current = false;
              return;
            }
            if (widget.action) executeNavigationAction(widget.action, { openInNewTab });
          }}
        >
          {linkStrokeWidth > 0 && (
            <svg width="0" height="0" style={{ position: 'absolute', visibility: 'hidden' }} aria-hidden="true">
              <defs>
                <filter id={linkStrokeFilterId} x="-40%" y="-40%" width="180%" height="180%">
                  <feMorphology in="SourceAlpha" operator="dilate" radius={linkStrokeDilate} result="dilated" />
                  <feGaussianBlur in="dilated" stdDeviation={linkStrokeBlur} result="blurred" />
                  <feComponentTransfer in="blurred" result="rounded">
                    <feFuncA type="discrete" tableValues="0 1" />
                  </feComponentTransfer>
                  <feFlood style={{ floodColor: 'var(--color-sticker-stroke)' }} result="flood" />
                  <feComposite in="flood" in2="rounded" operator="in" result="stroke" />
                  <feMerge>
                    <feMergeNode in="stroke" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
            </svg>
          )}
          <img className={`${styles.linkIcon} ${widget.iconSmall ? styles.linkIconSmall : ''}`} src={linkIcon} alt="" draggable={false} style={{ width: iconSize }} />
          <div className={styles.linkName} style={{ color: getThemeAwareLinkColor(widget.linkTextColor, theme), fontSize, filter: linkStrokeFilter }}>{name}</div>
        </button>
      );
    }

    if (widget.type === 'notes') {
      return (
        <div className={styles.notesBody}>
          <div className={styles.notesHeader} onPointerDown={startDrag}>
            <div className={`${styles.notesControls} ${isEditMode ? styles.notesControlsEditing : ''}`} onPointerDown={(event) => event.stopPropagation()}>
              <button type="button" onClick={() => updateNoteFontSize(-1)} aria-label="减小字号">A−</button>
              <button type="button" onClick={() => updateNoteFontSize(1)} aria-label="增大字号">A+</button>
              {isNoteEditing && (
                <>
                  <button
                    type="button"
                    className={styles.notesUnderlineButton}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyNoteInlineFormat('underline')}
                    aria-label="下划线"
                    title="下划线"
                  >
                    U
                  </button>
                  <button
                    type="button"
                    className={styles.notesStrikeButton}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyNoteInlineFormat('strike')}
                    aria-label="划掉已完成"
                    title="划掉已完成"
                  >
                    S
                  </button>
                </>
              )}
              <button
                type="button"
                className={styles.notesModeButton}
                onClick={isNoteEditing ? showNotePreview : openNoteEditor}
                aria-label={isNoteEditing ? '预览 Markdown' : '编辑便签'}
              >
                {isNoteEditing ? '预览' : '编辑'}
              </button>
            </div>
          </div>
          <div className={styles.notesContent} style={{ fontSize: noteFontSize }}>
            {isNoteEditing ? (
              <textarea
                ref={noteTextAreaRef}
                className={styles.notesArea}
                data-widget-scrollable="true"
                value={noteDraft}
                placeholder="开始记录…"
                spellCheck
                onChange={(event) => setNoteDraft(event.target.value)}
                onBlur={(event) => {
                  commitNote();
                  const nextTarget = event.relatedTarget;
                  if (!nextTarget || !widgetRef.current?.contains(nextTarget)) {
                    setIsNoteEditing(false);
                  }
                }}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                    event.preventDefault();
                    showNotePreview();
                  } else if (event.key === 'Escape') {
                    event.preventDefault();
                    showNotePreview();
                  }
                }}
              />
            ) : (
              <div
                className={`${styles.notesMarkdown} ${noteDraft.trim() ? '' : styles.notesPlaceholder}`}
                data-widget-scrollable="true"
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest('a')) return;
                  openNoteEditor();
                }}
              >
                {noteDraft.trim() ? renderMarkdown(noteDraft) : '开始记录…'}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (widget.type === 'todo') {
      const calculatorButtons = ['C', '±', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '='];
      return (
        <div className={styles.calculatorBody} onPointerDown={startDrag}>
          <div className={styles.calculatorDisplay} title={calculatorDisplay}>{calculatorDisplay}</div>
          <div className={styles.calculatorKeys} onPointerDown={(event) => event.stopPropagation()}>
            {calculatorButtons.map((button) => (
              <button
                key={button}
                type="button"
                className={`${styles.calculatorKey} ${['÷', '×', '-', '+', '='].includes(button) ? styles.calculatorOperatorKey : ''} ${button === '0' ? styles.calculatorZeroKey : ''}`}
                onClick={() => handleCalculatorInput(button)}
              >
                {button}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (widget.type === 'pomodoro') {
      return (
        <div className={styles.pomodoroBody} onPointerDown={startDrag}>
          <div
            className={styles.pomodoroRing}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pomodoroProgress * 100)}
            style={{ background: `conic-gradient(${pomodoroMode === 'focus' ? 'var(--widget-focus-accent)' : 'var(--widget-break-accent)'} ${Math.round(pomodoroProgress * 360)}deg, var(--widget-ring-track) 0deg)` }}
          >
            <div className={styles.pomodoroRingInner}>
              <button
                type="button"
                className={styles.pomodoroTimeButton}
                disabled={isRunning}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => setIsPomodoroMenuOpen((value) => !value)}
                aria-label={`${pomodoroMode === 'focus' ? '专注' : '休息'}剩余 ${minutes} 分 ${seconds} 秒，点击调整时长`}
                aria-expanded={isPomodoroMenuOpen}
                title={isRunning ? '计时中' : '调整时长'}
              >
                {minutes}:{seconds}
              </button>
            </div>
          </div>
          <PomodoroDurationMenu
            open={isPomodoroMenuOpen && !isRunning}
            title={pomodoroMode === 'focus' ? '专注时长' : '休息时长'}
            value={activePomodoroMinutes}
            presets={pomodoroMode === 'focus' ? [15, 25, 45] : [5, 10, 15]}
            style={pomodoroMenuStyle}
            onClose={() => setIsPomodoroMenuOpen(false)}
            onAdjust={adjustPomodoroMinutes}
            onSelect={setPomodoroMinutes}
          />
          <div className={styles.pomodoroModeLabel}>
            <span className={styles.pomodoroModeIcon}>
              {pomodoroMode === 'focus' ? <FocusModeIcon size={15} /> : <BreakModeIcon size={15} />}
            </span>
            <span>{pomodoroMode === 'focus' ? '专注' : '休息'}</span>
          </div>
          <div className={styles.pomodoroHint} aria-live="polite">{pomodoroHintText}</div>
          <div className={styles.pomodoroButtons} onPointerDown={(event) => event.stopPropagation()}>
            <button
              type="button"
              className={styles.pomodoroCircleButton}
              onClick={switchPomodoroMode}
              aria-label={pomodoroMode === 'focus' ? '切换到休息' : '切换到专注'}
              title={pomodoroMode === 'focus' ? '切换到休息' : '切换到专注'}
            >
              {pomodoroMode === 'focus' ? <BreakModeIcon size={17} /> : <FocusModeIcon size={17} />}
            </button>
            <button
              type="button"
              className={styles.pomodoroPlayButton}
              onClick={togglePomodoro}
              aria-label={isRunning ? '暂停' : '开始'}
              title={isRunning ? '暂停' : '开始'}
            >
              {isRunning ? <PauseIcon size={17} /> : <PlayIcon size={17} />}
            </button>
            <button type="button" className={styles.pomodoroCircleButton} onClick={resetPomodoro} aria-label="重置" title="重置">
              <ResetIcon size={17} />
            </button>
          </div>
        </div>
      );
    }

    if (widget.type === 'gtrend') {
      return <div className={styles.blankBody} onPointerDown={startDrag} />;
    }

    if (widget.type === 'space') {
      if (!space) {
        return <div className={styles.spaceEmpty}>这个空间已经不存在</div>;
      }

      return (
        <div className={styles.spaceBody}>
          <div className={styles.spaceHeader} onPointerDown={startDrag}>
            <div className={styles.spaceTitle}>
              <span className={styles.spaceName}>{space.name}</span>
            </div>
            <div className={styles.spaceHeaderActions}>
              <span className={styles.spaceCount}>{spaceWebsiteCount} 个网站</span>
              {isEditMode && widget.spaceId && (
                <button
                  type="button"
                  className={styles.spaceAddButton}
                  title="向这个空间添加网站"
                  aria-label="向这个空间添加网站"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    onAddSpaceItem(widget.id, widget.spaceId!, event.currentTarget.getBoundingClientRect());
                  }}
                >
                  +
                </button>
              )}
            </div>
          </div>
          <div className={styles.spaceApps} data-widget-scrollable="true">
            {spaceItems.length > 0 ? spaceItems.map((item) => (
              <SpaceAppButton
                key={item.id}
                item={item}
                isEditMode={isEditMode}
                isDragging={draggedSpaceItemId === item.id}
                dropMode={spaceDropTarget?.id === item.id && draggedSpaceItemId !== item.id ? spaceDropTarget.mode : null}
                dropPlacement={spaceDropTarget?.id === item.id ? spaceDropTarget.placement : 'before'}
                onOpen={(target, anchorRect) => {
                  if (target.type === 'folder') {
                    setOpenSpaceFolder({ folderId: target.id, anchorRect });
                    return;
                  }
                  if (target.action) executeNavigationAction(target.action, { openInNewTab });
                }}
                onEdit={(target, anchorRect) => widget.spaceId && onEditSpaceItem(widget.id, widget.spaceId, target, anchorRect)}
                onDelete={(itemId) => widget.spaceId && onDeleteSpaceItem(widget.spaceId, itemId)}
                onDragStart={(itemId) => {
                  setDraggedSpaceItemId(itemId);
                  setSpaceDropTarget(null);
                }}
                onDragHover={(itemId, mode, placement) => {
                  if (draggedSpaceItemId && draggedSpaceItemId !== itemId) {
                    setSpaceDropTarget({ id: itemId, mode, placement });
                  }
                }}
                onDragEnd={() => {
                  setDraggedSpaceItemId(null);
                  setSpaceDropTarget(null);
                }}
                onDrop={(targetId, mode, placement) => {
                  if (widget.spaceId && draggedSpaceItemId && draggedSpaceItemId !== targetId) {
                    if (mode === 'merge') onMergeSpaceItem(widget.spaceId, draggedSpaceItemId, targetId);
                    else onReorderSpaceItem(widget.spaceId, draggedSpaceItemId, targetId, placement);
                  }
                  setDraggedSpaceItemId(null);
                  setSpaceDropTarget(null);
                }}
              />
            )) : (
              <button
                type="button"
                className={styles.spaceEmptyAction}
                disabled={!isEditMode || !widget.spaceId}
                onClick={(event) => widget.spaceId && onAddSpaceItem(widget.id, widget.spaceId, event.currentTarget.getBoundingClientRect())}
              >
                {isEditMode ? '这个空间还没有网站，点击添加' : '这个空间还没有网站'}
              </button>
            )}
          </div>
        </div>
      );
    }

    if (widget.type === 'bookmarks') {
      return (
        <div className={bookmarkStyles.bookmarkBody}>
          <div className={styles.spaceHeader} onPointerDown={startDrag}>
            <div className={styles.spaceTitle}>
              <span className={styles.spaceName}>书签</span>
            </div>
            <div className={styles.spaceHeaderActions}>
              <span className={styles.spaceCount}>{bookmarkIconProgress || (bookmarkPermissionGranted ? `${bookmarkCount} 个书签` : '未授权')}</span>
              {isEditMode && bookmarkPermissionGranted && (
                <button
                  type="button"
                  className={`${styles.spaceAddButton} ${styles.spaceIconFetchButton}`}
                  title="Icon：批量获取书签网站图标"
                  aria-label="Icon：批量获取书签网站图标"
                  disabled={isFetchingBookmarkIcons}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    void fetchBookmarkIcons();
                  }}
                >
                  {isFetchingBookmarkIcons ? '…' : 'i'}
                </button>
              )}
              <button
                type="button"
                className={styles.spaceAddButton}
                title="刷新书签"
                aria-label="刷新书签"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  setBookmarkRefreshKey((value) => value + 1);
                }}
              >
                ↻
              </button>
            </div>
          </div>
          <div className={bookmarkStyles.bookmarkList} data-widget-scrollable="true">
            {!bookmarkPermissionGranted ? (
              <button
                type="button"
                className={styles.spaceEmptyAction}
                onClick={async (event) => {
                  event.stopPropagation();
                  const granted = await requestBookmarkPermission();
                  setBookmarkPermissionGranted(granted);
                  setBookmarkRefreshKey((value) => value + 1);
                }}
              >
                {bookmarkStatus || '授权后同步浏览器书签'}
              </button>
            ) : bookmarkItems.length > 0 ? bookmarkItems.map((item) => (
              <BookmarkListItem
                key={item.id}
                item={item}
                depth={0}
                expandedFolderIds={expandedBookmarkFolderIds}
                onToggleFolder={toggleBookmarkFolder}
                onOpenUrl={(url) => openExternalUrl(url, openInNewTab)}
                onEdit={(target, anchorRect) => setEditingBookmark({ item: target, anchorRect })}
                isEditMode={isEditMode}
                iconRefreshKey={bookmarkIconRefreshKey}
              />
            )) : (
              <button type="button" className={styles.spaceEmptyAction} onClick={() => setBookmarkRefreshKey((value) => value + 1)}>
                {bookmarkStatus || '没有可显示的书签'}
              </button>
            )}
          </div>
        </div>
      );
    }

    const embedUrl = getValidEmbedUrl(widget.embedUrl);
    const embedHost = getEmbedHostLabel(widget.embedUrl);
    const hasLocalEmbed = Boolean(widget.embedLocalId);

    return (
      <div className={styles.embedBody} data-widget-scrollable="true">
        {hasLocalEmbed && localEmbedUrl && !isEmbedPaused ? (
          <EmbeddedWebPage
            key={`${widget.embedLocalId}-${widget.embedLocalUpdatedAt ?? 0}-${embedReloadVersion}`}
            url={localEmbedUrl}
            packageId={widget.embedLocalId}
            packageEntryPath={localEmbedEntryPath ?? undefined}
            title={`本地网页包：${localEmbedName || widget.embedLocalName || 'ZIP'}`}
            onLoad={handleEmbedLoad}
          />
        ) : hasLocalEmbed && localEmbedHtml !== null && !isEmbedPaused ? (
          <EmbeddedWebPage key={`${widget.embedLocalId}-${widget.embedLocalUpdatedAt ?? 0}-${embedReloadVersion}`} html={localEmbedHtml} title={`本地网页：${localEmbedName || widget.embedLocalName || 'HTML'}`} onLoad={handleEmbedLoad} />
        ) : !hasLocalEmbed && embedUrl && !isEmbedPaused ? (
          <EmbeddedWebPage key={`${embedUrl}-${embedReloadVersion}`} url={embedUrl} title={embedHost ? `嵌入网页：${embedHost}` : '嵌入网页'} onLoad={handleEmbedLoad} />
        ) : hasLocalEmbed && isLocalEmbedLoading ? (
          <div className={styles.embedLoading}>正在加载本地网页…</div>
        ) : hasLocalEmbed && localEmbedHtml === null && !localEmbedUrl ? (
          <button type="button" className={styles.embedEmpty} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onConfigureEmbed(widget.id, widgetRef.current?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect()); }}>
            <span className={styles.embedEmptyIcon}>!</span><strong>本地网页文件不可用</strong><small>请重新导入 HTML 或网页包 ZIP。</small>
          </button>
        ) : !embedUrl ? (
          <button type="button" className={styles.embedEmpty} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onConfigureEmbed(widget.id, widgetRef.current?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect()); }}>
            <span className={styles.embedEmptyIcon}>↗</span><strong>设置嵌入网页</strong><small>支持网址、单文件 HTML 或网页包 ZIP</small>
          </button>
        ) : null}
        {!hasLocalEmbed && embedUrl && embedSessionIssue && (
          <div className={styles.embedSessionIssue} role="status">
            <strong>检测到嵌入页面连续刷新</strong>
            <p>主文档能显示但后续 API 返回 401/403 时，通常是嵌入页没有读到登录令牌。若请求中的 Authorization 为 undefined，目标应用可能依赖 localStorage，而不仅是 Cookie。</p>
            <div className={styles.embedSessionActions}>
              <button type="button" onClick={(event) => { event.stopPropagation(); openExternalUrl(embedUrl, true); }}>新标签页登录</button>
              <button type="button" onClick={(event) => { event.stopPropagation(); void authorizeAndReloadEmbed(); }} disabled={isEmbedAuthorizing}>{isEmbedAuthorizing ? '正在授权…' : '授权并重试'}</button>
            </div>
          </div>
        )}
        {isEditMode && (
          <div className={styles.embedEditBar} data-widget-drag-handle="true" onPointerDown={startDrag}>
            <span className={styles.embedDragHint}>{hasLocalEmbed ? (localEmbedName || widget.embedLocalName || '本地网页') : '按住此处拖动'}</span>
            <div className={styles.embedEditActions}>
              {!hasLocalEmbed && embedUrl && <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); openExternalUrl(embedUrl, true); }} title="在新标签页登录或打开" aria-label="在新标签页登录或打开嵌入网页">↗</button>}
              {!hasLocalEmbed && embedUrl && <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); void authorizeAndReloadEmbed(); }} title="授权后重新载入" aria-label="授权后重新载入嵌入网页">↻</button>}
              {hasLocalEmbed && <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); reloadEmbed(); }} title="重新载入本地网页" aria-label="重新载入本地网页">↻</button>}
              <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onConfigureEmbed(widget.id, widgetRef.current?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect()); }}>设置</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {renderBody()}
      <AddEditModal
        isOpen={Boolean(editingBookmark)}
        item={editingBookmark?.item ?? null}
        onClose={() => setEditingBookmark(null)}
        onSave={handleBookmarkSave}
        anchorRect={editingBookmark?.anchorRect ?? null}
        hideHeader
        popoverPlacement="side"
        urlReadOnly
        nameReadOnly
      />
    </>
  );
};
