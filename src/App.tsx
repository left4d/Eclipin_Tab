import { useState, useMemo, useCallback, lazy, Suspense, useEffect, useRef } from 'react';
import { DockItem } from './shared/types';
import { SEARCH_ENGINES } from './features/search/constants/searchEngines';
import { useDockData, useDockUI, useDockDrag } from './features/dock/context/DockContext';
import { DockLayoutContainer } from './features/dock/components/DockLayoutContainer';
import { Editor } from './features/editor/components/Editor/Editor';
import { Settings } from './features/settings/components/Settings/Settings';
import { SyncButton } from './features/sync/components/SyncButton/SyncButton';
import { Background } from './features/theme/components/Background/Background';
import { ZenShelf } from './features/shelf/components/ZenShelf';
import { useAutoSync } from './features/sync/hooks/useAutoSync';
import styles from './App.module.css';
import type { WidgetPageId } from './features/widgets/utils/layoutAlgorithm';
import { useDelayedUnmount } from './shared/hooks/useDelayedUnmount';
import { executeNavigationAction } from './shared/navigation';
import { useThemeData } from './features/theme/context/ThemeContext';
import { usePageWheelNavigation } from './features/navigation/hooks/usePageWheelNavigation';
import { PageNavigationBar } from './features/navigation/components/PageNavigationBar';
import type { StickerNavigationRequest } from './features/shelf/utils/stickerNavigation';

// ============================================================================
// 性能优化: 懒加载非核心组件，减少初始包大小
// ============================================================================
const FolderView = lazy(() => import('./features/dock/components/FolderView/FolderView').then(m => ({ default: m.FolderView })));
const AddEditModal = lazy(() => import('./features/dock/components/Modal/AddEditModal').then(m => ({ default: m.AddEditModal })));
const SearchEngineModal = lazy(() => import('./features/search/components/Modal/SearchEngineModal').then(m => ({ default: m.SearchEngineModal })));
const SettingsModal = lazy(() => import('./features/settings/components/Modal/SettingsModal').then(m => ({ default: m.SettingsModal })));
const SyncModal = lazy(() => import('./features/sync/components/Modal/SyncModal').then(m => ({ default: m.SyncModal })));
const BatchImportView = lazy(() => import('./features/dock/components/BatchImport/BatchImportView').then(m => ({ default: m.BatchImportView })));
const WidgetPanel = lazy(() => import('./features/widgets/components/WidgetPanel').then(m => ({ default: m.WidgetPanel })));
const AddWidgetPage = lazy(() => import('./features/widgets/components/AddWidgetPage').then(m => ({ default: m.AddWidgetPage })));


function App() {
  // ============================================================================
  // 性能优化: 使用细粒度 Context Hooks 减少不必要的重渲染
  // ============================================================================

  // 数据层 (低频变化) - 仅在 dockItems/searchEngine 变化时重渲染
  const {
    dockItems,
    selectedSearchEngine,
    setSelectedSearchEngine,
    handleItemSave,
    handleFolderItemsReorder,
    handleFolderItemDelete,
    handleDragFromFolder,
  } = useDockData();

  // UI 层 (中频变化) - 仅在 editMode/openFolder 变化时重渲染
  const {
    isEditMode,
    openFolderId,
    folderAnchor,
    setIsEditMode,
    setOpenFolderId,
    setFolderAnchor,
  } = useDockUI();

  // 拖拽层 (高频变化) - 仅在拖拽状态变化时重渲染
  const { draggingItem, setDraggingItem, setFolderPlaceholderActive } = useDockDrag();
  const { openInNewTab, pageScrollMode, pageSlideDirection } = useThemeData();

  // 计算派生状态
  const openFolder = useMemo(
    () => dockItems.find((item) => item.id === openFolderId),
    [dockItems, openFolderId]
  );

  // 本地 UI 状态 (Modal 相关)
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isSearchEngineModalOpen, setIsSearchEngineModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAddWidgetPageOpen, setIsAddWidgetPageOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [searchEngineAnchor, setSearchEngineAnchor] = useState<DOMRect | null>(null);
  const [settingsAnchor, setSettingsAnchor] = useState<{ rect: DOMRect, source?: 'button' | 'contextMenu' } | null>(null);
  const [syncAnchor, setSyncAnchor] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [addIconAnchor, setAddIconAnchor] = useState<DOMRect | null>(null);
  const [editingItem, setEditingItem] = useState<DockItem | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isTouchUI, setIsTouchUI] = useState(false);
  const [isBatchImportOpen, setIsBatchImportOpen] = useState(false);
  const [pageIndex, setPageIndex] = useState<WidgetPageId>(0);

  // 跟踪拖拽来源，用于区分内部拖拽和外部拖拽
  const [draggingFromFolder, setDraggingFromFolder] = useState(false);

  // 用于检测悬停区域的 Refs
  const settingsAreaRef = useRef<HTMLDivElement>(null);
  const editorAreaRef = useRef<HTMLDivElement>(null);

  // 只在退出动画期间保留懒加载弹窗，动画结束后真正卸载。
  const renderAddEditModal = useDelayedUnmount(isAddEditModalOpen);
  const renderSearchEngineModal = useDelayedUnmount(isSearchEngineModalOpen);
  const renderSettingsModal = useDelayedUnmount(isSettingsModalOpen);
  const renderSyncModal = useDelayedUnmount(isSyncModalOpen);
  const renderBatchImport = useDelayedUnmount(isBatchImportOpen);

  // 自动同步：每次新标签页打开时检测云端更新
  useAutoSync();

  // ============================================================================
  // 性能优化: 缓存悬停热区尺寸，mousemove 只做数字比较
  // ============================================================================
  const lastSettingsState = useRef(false);
  const lastEditorState = useRef(false);
  const hoverZoneRectsRef = useRef<{ settings: DOMRect | null; editor: DOMRect | null }>({ settings: null, editor: null });
  const pageTouchGestureRef = useRef<{ startX: number; lastX: number; startY: number; lastY: number; startScrollTop: number; blocked: boolean } | null>(null);

  useEffect(() => {
    const media = window.matchMedia('(hover: none), (pointer: coarse)');
    const updateTouchUI = () => {
      const nextIsTouchUI = media.matches;
      setIsTouchUI(nextIsTouchUI);
      setShowSettings(nextIsTouchUI);
      setShowEditor(nextIsTouchUI);
      if (!nextIsTouchUI) {
        lastSettingsState.current = false;
        lastEditorState.current = false;
      }
    };

    updateTouchUI();
    media.addEventListener('change', updateTouchUI);
    return () => media.removeEventListener('change', updateTouchUI);
  }, []);

  useEffect(() => {
    if (isTouchUI) return;

    const cacheHoverZoneRects = () => {
      hoverZoneRectsRef.current = {
        settings: settingsAreaRef.current?.getBoundingClientRect() ?? null,
        editor: editorAreaRef.current?.getBoundingClientRect() ?? null,
      };
    };
    cacheHoverZoneRects();

    const handleMouseMove = (e: MouseEvent) => {
      const settingsRect = hoverZoneRectsRef.current.settings;
      if (settingsRect) {
        const inSettingsZone = e.clientX >= settingsRect.left && e.clientX <= settingsRect.right &&
          e.clientY >= settingsRect.top && e.clientY <= settingsRect.bottom;
        if (inSettingsZone !== lastSettingsState.current) {
          lastSettingsState.current = inSettingsZone;
          setShowSettings(inSettingsZone);
        }
      }

      const editorRect = hoverZoneRectsRef.current.editor;
      if (editorRect) {
        const inEditorZone = e.clientX >= editorRect.left && e.clientX <= editorRect.right &&
          e.clientY >= editorRect.top && e.clientY <= editorRect.bottom;
        if (inEditorZone !== lastEditorState.current) {
          lastEditorState.current = inEditorZone;
          setShowEditor(inEditorZone);
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', cacheHoverZoneRects);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', cacheHoverZoneRects);
    };
  }, [isTouchUI]);

  usePageWheelNavigation({ pageIndex, scrollMode: pageScrollMode, pageSlideDirection, onPageChange: setPageIndex });

  useEffect(() => {
    const isInteractiveTouchTarget = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      return !!target.closest('[data-widget-type], [data-sticker-id], [data-widget-scrollable="true"], [data-page-scroll-lock="true"], [data-modal="true"], [role="dialog"], [data-ui-zone], button, input, textarea, a, iframe');
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      const scroller = document.querySelector<HTMLElement>('[data-widget-scroll-page="1"]');
      pageTouchGestureRef.current = {
        startX: touch.clientX,
        lastX: touch.clientX,
        startY: touch.clientY,
        lastY: touch.clientY,
        startScrollTop: scroller?.scrollTop ?? 0,
        blocked: isInteractiveTouchTarget(event.target),
      };
    };

    const handleTouchMove = (event: TouchEvent) => {
      const gesture = pageTouchGestureRef.current;
      if (!gesture || gesture.blocked || event.touches.length !== 1) return;
      const touch = event.touches[0];
      gesture.lastX = touch.clientX;
      gesture.lastY = touch.clientY;

      if (pageSlideDirection === 'horizontal') {
        const dx = gesture.startX - touch.clientX;
        const dy = gesture.startY - touch.clientY;
        if (Math.max(Math.abs(dx), Math.abs(dy)) > 12) event.preventDefault();
        return;
      }

      if (pageIndex === 1) {
        const scroller = document.querySelector<HTMLElement>('[data-widget-scroll-page="1"]');
        if (!scroller) return;
        scroller.scrollTop = Math.max(0, gesture.startScrollTop + gesture.startY - touch.clientY);
        event.preventDefault();
      } else if (gesture.startY - touch.clientY > 12) {
        event.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      const gesture = pageTouchGestureRef.current;
      pageTouchGestureRef.current = null;
      if (!gesture || gesture.blocked) return;
      if (pageSlideDirection === 'horizontal') {
        const distanceX = gesture.startX - gesture.lastX;
        const distanceY = gesture.startY - gesture.lastY;
        if (Math.abs(distanceX) > Math.abs(distanceY) && Math.abs(distanceX) > 72) {
          setPageIndex((current) => Math.max(0, current + (distanceX > 0 ? 1 : -1)));
        }
        return;
      }

      const distance = gesture.startY - gesture.lastY;

      if (pageIndex === 0 && distance > 72) {
        setPageIndex(1);
        return;
      }

      const scroller = document.querySelector<HTMLElement>('[data-widget-scroll-page="1"]');
      if (pageIndex === 1 && distance < -72 && (scroller?.scrollTop ?? 0) <= 2) {
        setPageIndex(0);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [pageIndex, pageSlideDirection]);



  const handleItemEdit = useCallback((item: DockItem, rect?: DOMRect) => {
    setEditingItem(item);
    setAddIconAnchor(rect ?? null);
    setIsAddEditModalOpen(true);
  }, []);

  const handleItemAdd = useCallback(() => {
    setEditingItem(null);
    setIsAddEditModalOpen(true);
  }, []);

  const handleDockItemAdd = useCallback((rect?: DOMRect | null) => {
    setAddIconAnchor(rect ?? null);
    handleItemAdd();
  }, [handleItemAdd]);

  const handleSearchEngineClick = useCallback((rect: DOMRect) => {
    setSearchEngineAnchor(rect);
    setIsSearchEngineModalOpen(true);
  }, []);

  const handlePageDown = useCallback(() => setPageIndex(1), []);

  const handleStickerInternalNavigation = useCallback((request: StickerNavigationRequest) => {
    setPageIndex(request.pageIndex);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const scroller = document.querySelector<HTMLElement>('[data-widget-scroll-page="1"]');
        if (pageSlideDirection === 'vertical' && request.pageIndex === 1 && scroller) {
          scroller.scrollTo({ top: request.scrollTop, behavior: 'smooth' });
        }

        window.setTimeout(() => {
          if (request.focusStickerId) {
            const target = document.querySelector<HTMLElement>(`[data-sticker-id="${request.focusStickerId}"]`);
            if (target) {
              target.classList.add(styles.internalNavigationPulse);
              window.setTimeout(() => target.classList.remove(styles.internalNavigationPulse), 1100);
            }
          }

          if (request.focusWidgetId) {
            const target = document.querySelector<HTMLElement>(`[data-widget-id="${request.focusWidgetId}"]`);
            if (target) {
              target.classList.add(styles.internalNavigationPulse);
              window.setTimeout(() => target.classList.remove(styles.internalNavigationPulse), 1100);
            }
          }

          if (request.coordinate) {
            const marker = document.createElement('div');
            marker.className = styles.internalNavigationMarker;
            marker.style.left = `${Math.max(8, Math.min(window.innerWidth - 8, request.coordinate.x))}px`;
            marker.style.top = `${Math.max(8, Math.min(window.innerHeight - 8, request.coordinate.y))}px`;
            document.body.appendChild(marker);
            window.setTimeout(() => marker.remove(), 1100);
          }
        }, pageSlideDirection === 'vertical' && request.pageIndex === 1 ? 560 : 120);
      });
    });
  }, [pageSlideDirection]);

  const handleModalSave = useCallback((data: Partial<DockItem>) => {
    handleItemSave(data, editingItem);
    setIsAddEditModalOpen(false);
  }, [handleItemSave, editingItem]);

  const handleFolderItemClick = useCallback((item: DockItem) => {
    if (item.action) executeNavigationAction(item.action, { openInNewTab });
  }, [openInNewTab]);

  const handleFolderItemEdit = useCallback((item: DockItem, rect?: DOMRect) => {
    handleItemEdit(item, rect);
  }, []);

  // 根据 CSS 变量更新 SVG 滤镜的描边颜色
  useEffect(() => {
    const updateStrokeColor = () => {
      const strokeColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-sticker-stroke').trim();

      const floodElements = document.querySelectorAll('#text-sticker-stroke feFlood, #vector-icon-sticker-stroke feFlood');
      if (strokeColor) {
        floodElements.forEach((element) => element.setAttribute('flood-color', strokeColor));
      }
    };

    // 组件挂载时更新
    updateStrokeColor();

    // 当主题或默认背景明暗变化时更新
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && (mutation.attributeName === 'data-theme' || mutation.attributeName === 'data-background-brightness')) {
          updateStrokeColor();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-background-brightness']
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.app}>
      {/* SVG 滤镜定义 - 用于文字贴纸的平滑描边效果 */}
      <svg width="0" height="0" style={{ position: 'absolute', visibility: 'hidden' }}>
        <defs>
          {/* 圆角描边滤镜：使用 feMorphology dilate + 模糊 + 锐化实现圆角效果 */}
          <filter id="text-sticker-stroke" x="-30%" y="-30%" width="160%" height="160%">
            {/* 步骤1: 扩展原始图形轮廓 */}
            <feMorphology in="SourceAlpha" operator="dilate" radius="4.5" result="dilated" />
            {/* 步骤2: 轻微模糊使边缘变圆滑 */}
            <feGaussianBlur in="dilated" stdDeviation="2" result="blurred" />
            {/* 步骤3: 使用 feComponentTransfer 锐化边缘, 将模糊重新变成实心硬边缘 */}
            <feComponentTransfer in="blurred" result="rounded">
              <feFuncA type="discrete" tableValues="0 1" />
            </feComponentTransfer>
            {/* 步骤4: 将圆角轮廓填充为 --color-sticker-stroke (动态更新) */}
            <feFlood floodColor="white" result="white" />
            <feComposite in="white" in2="rounded" operator="in" result="stroke" />
            {/* 步骤5: 将描边放在原始图形下方 */}
            <feMerge>
              <feMergeNode in="stroke" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* SVG 图标库贴纸使用更轻的圆润描边，不影响普通图片贴纸。 */}
          <filter id="vector-icon-sticker-stroke" x="-18%" y="-18%" width="136%" height="136%">
            <feMorphology in="SourceAlpha" operator="dilate" radius="2" result="dilated" />
            <feGaussianBlur in="dilated" stdDeviation="0.8" result="blurred" />
            <feComponentTransfer in="blurred" result="rounded">
              <feFuncA type="discrete" tableValues="0 1" />
            </feComponentTransfer>
            <feFlood floodColor="white" result="white" />
            <feComposite in="white" in2="rounded" operator="in" result="stroke" />
            <feMerge>
              <feMergeNode in="stroke" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
      <Background />
      <ZenShelf pageIndex={pageIndex} onNavigateInternal={handleStickerInternalNavigation} onOpenAddWidget={() => setIsAddWidgetPageOpen(true)} onOpenSettings={(pos) => {
        // 直接使用传入的位置，不需要为了抵消 SettingsModal 的内部偏移而做运算
        const pseudoRect = { left: pos.x, top: pos.y, right: pos.x, bottom: pos.y, width: 0, height: 0, x: pos.x, y: pos.y, toJSON: () => ({}) } as DOMRect;
        setSettingsAnchor({ rect: pseudoRect, source: 'contextMenu' });
        setIsSettingsModalOpen(true);
      }} />
      <Suspense fallback={null}>
        <WidgetPanel activePage={pageIndex} onPageChange={setPageIndex} />
      </Suspense>
      <PageNavigationBar currentPageIndex={pageIndex} />
      <div
        className={`${styles.pageSlider} ${pageSlideDirection === 'horizontal' ? styles.pageSliderHorizontal : ''} ${pageSlideDirection === 'vertical' && pageIndex === 1 ? styles.secondPageActive : ''}`}
        style={pageSlideDirection === 'horizontal' ? { transform: `translateX(-${Math.max(0, pageIndex) * 100}vw)` } : undefined}
      >
        <section className={styles.page}>
          <DockLayoutContainer
            onSearchEngineClick={handleSearchEngineClick}
            onItemEdit={handleItemEdit}
            onItemAdd={handleDockItemAdd}
            onPageDown={handlePageDown}
          />
        </section>
        <section className={styles.page} aria-label="Widget page" />
      </div>
      {/* 左上角触发热点：悬停显示设置按钮 */}
      <div
        ref={settingsAreaRef}
        className={styles.settingsArea}
        data-ui-zone="top-left"
      >
        <Settings
          visible={showSettings || isTouchUI}
          onClick={(e: React.MouseEvent<HTMLElement>) => {
            e.stopPropagation();
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setSettingsAnchor({ rect, source: 'button' });
            setIsSettingsModalOpen(true);
          }}
        />
        <SyncButton 
          visible={showSettings || isTouchUI}
          onClick={(e: React.MouseEvent<HTMLElement>) => {
            e.stopPropagation();
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            // SyncModal is centered or offset. Since SettingsModal offsets based on rect, let's just place sync modal roughly next to button.
            setSyncAnchor({ x: rect.left, y: rect.bottom + 12 });
            setIsSyncModalOpen(true);
          }}
        />
      </div>
      {/* 右上角触发热点：悬停显示编辑按钮 */}
      <div
        ref={editorAreaRef}
        className={styles.editorArea}
        data-ui-zone="top-right"
      >
        <Editor
          visible={showEditor || isEditMode || isTouchUI}
          isEditMode={isEditMode}
          onClick={() => setIsEditMode(!isEditMode)}
        />
      </div>
      {openFolder && openFolder.type === 'folder' && (
        <Suspense fallback={null}>
          <FolderView
            folder={openFolder}
            isEditMode={isEditMode}
            onItemClick={handleFolderItemClick}
            onItemEdit={handleFolderItemEdit}
            onItemDelete={(item) => handleFolderItemDelete(openFolder.id, item)}
            onClose={() => { setOpenFolderId(null); setFolderAnchor(null); }}
            onItemsReorder={(items) => handleFolderItemsReorder(openFolder.id, items)}
            onItemDragOut={handleDragFromFolder}
            anchorRect={folderAnchor}
            onDragStart={(item) => { setDraggingItem(item); setDraggingFromFolder(true); }}
            onDragEnd={() => { setDraggingItem(null); setDraggingFromFolder(false); }}
            externalDragItem={draggingFromFolder ? null : draggingItem}
            onFolderPlaceholderChange={setFolderPlaceholderActive}
            onToggleEditMode={() => setIsEditMode(!isEditMode)}
          />
        </Suspense>
      )}
      {renderAddEditModal && (
        <Suspense fallback={null}>
          <AddEditModal
            isOpen={isAddEditModalOpen}
            item={editingItem}
            onClose={() => {
              setIsAddEditModalOpen(false);
            }}
            onSave={handleModalSave}
            anchorRect={addIconAnchor}
            hideHeader
            onBatchImport={() => setIsBatchImportOpen(true)}
          />
        </Suspense>
      )}
      {renderSearchEngineModal && (
        <Suspense fallback={null}>
          <SearchEngineModal
            isOpen={isSearchEngineModalOpen}
            selectedEngine={selectedSearchEngine}
            engines={SEARCH_ENGINES}
            onClose={() => setIsSearchEngineModalOpen(false)}
            onSelect={setSelectedSearchEngine}
            anchorRect={searchEngineAnchor}
          />
        </Suspense>
      )}
      {isAddWidgetPageOpen && (
        <Suspense fallback={null}>
          <AddWidgetPage
            isOpen={isAddWidgetPageOpen}
            currentPage={pageIndex}
            onClose={() => setIsAddWidgetPageOpen(false)}
          />
        </Suspense>
      )}

      {renderSettingsModal && (
        <Suspense fallback={null}>
          <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            // 显式添加偏移量：ZenShelf 右键菜单不需要偏移（anchorPosition 已经是鼠标位置），
            // 从左上角按钮触发时，需要加上偏移量避开按钮。
            anchorPosition={settingsAnchor ? {
              x: settingsAnchor.rect.left,
              y: settingsAnchor.source === 'button' ? settingsAnchor.rect.top + 60 : settingsAnchor.rect.top
            } : { x: 0, y: 0 }}
            currentPage={pageIndex}
          />
        </Suspense>
      )}

      {renderSyncModal && (
        <Suspense fallback={null}>
          <SyncModal
            isOpen={isSyncModalOpen}
            onClose={() => setIsSyncModalOpen(false)}
            anchorPosition={syncAnchor}
          />
        </Suspense>
      )}

      {renderBatchImport && (
        <Suspense fallback={null}>
          <BatchImportView
            isOpen={isBatchImportOpen}
            onClose={() => setIsBatchImportOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}

export default App;
