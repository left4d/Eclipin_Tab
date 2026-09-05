import { lazy, Suspense, type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { useSpacesActions, useSpacesData } from '@/features/spaces/context/SpacesContext';
import type { DockItem } from '@/features/dock/types/dock';
import { SortableWidget } from './SortableWidget';
import { WidgetLogicalCanvas } from './WidgetLogicalCanvas';
import { WidgetPageRetention } from './WidgetPageRetention';
import { WidgetContextMenu } from './WidgetContextMenu';
import type { WidgetLayout, WidgetPageId } from '../types/widget';
import { DockItemDropPlacement, findDockItemById, mergeRootDockItems, moveFolderItemToRoot, removeDockItemById, reorderRootDockItems, updateDockItemById, updateFolderItemsById } from '@/features/spaces/utils/dockItemTree';
import type { BuiltInFontId } from '@/shared/constants/builtInFonts';
import { ensureBuiltInFontLoaded } from '@/shared/constants/builtInFonts';
import { getValidEmbedUrl, normalizeEmbedUrl } from '@/shared/utils/embedUrl';
import { requestHostPermissionForUrl } from '@/shared/utils/hostPermission';
import { createId } from '@/shared/utils/id';
import { deleteLocalWebPage, saveLocalWebDirectoryFiles, saveLocalWebPackageFile, saveLocalWebPageFile } from '../services/localWebPageService';
import { hasStoredWidgets, loadWidgets } from '../services/widgetStorage';
import { loadDeletedWidgets, recycleWidget } from '../services/widgetRecycleBinService';
import { useThemeData } from '@/features/theme/context/ThemeContext';
import { useDockUI } from '@/features/dock/context/DockContext';
import { useVisibleWarmup } from '@/shared/hooks/useVisibleWarmup';
import { normalizePriority } from '../services/widgetLayoutService';
import { getToggledWidgetPositionMode } from '../utils/widgetPositionMode';
import { useWidgetPanelLayout } from '../hooks/useWidgetPanelLayout';
import { useEmptyDesktopHud } from '../hooks/useEmptyDesktopHud';
import { shouldShowHorizontalEmptyPageHud } from '../utils/pageHudVisibility';
import { SizeEditorPopover } from '@/shared/components/SizeEditorPopover/SizeEditorPopover';
import { fitSizeToAspectRatio, readElementSizeClipboard, type ElementSize } from '@/shared/utils/elementSizeClipboard';
import { announceObjectSelection, OBJECT_GROUP_DRAG_EVENT, OBJECT_SELECTION_EVENT, type ObjectGroupDragEventDetail, type ObjectSelectionEventDetail } from '@/shared/utils/objectSelection';
import { clampFreeLayoutAxis, FREE_LAYOUT_OVERFLOW_RATIO } from '@/shared/utils/freeLayoutBounds';
import styles from './WidgetPanel.module.css';
const LazyAddEditModal = lazy(() => import('@/features/dock/components/Modal/AddEditModal').then((module) => ({ default: module.AddEditModal })));
const LazyWeatherLocationEditor = lazy(() => import('./WeatherLocationEditor').then((module) => ({ default: module.WeatherLocationEditor })));
const LazyWidgetAnchorEditor = lazy(() => import('./WidgetAnchorEditor').then((module) => ({ default: module.WidgetAnchorEditor })));
const LazyWidgetPanelQuickEditors = lazy(() => import('./WidgetPanelQuickEditors'));
interface WidgetPanelProps { activePage: WidgetPageId; onPageChange: (pageId: WidgetPageId) => void; }
interface SpaceItemEditorState { widgetId: string; spaceId: string; itemId: string | null; anchorRect: DOMRect; }
export const WidgetPanel = ({ activePage, onPageChange }: WidgetPanelProps) => {
  const { spaces } = useSpacesData();
  const { pageSlideDirection } = useThemeData();
  const { isEditMode } = useDockUI();
  const { updateSpaceApps } = useSpacesActions();
  const preloadNearbyPages = useVisibleWarmup();
  const {
    bringWidgetToFront,
    firstPageWidgets,
    moveWidget,
    moveWidgetToOtherPage: moveWidgetToOtherPageBase,
    removeWidget: removeWidgetBase,
    resizeWidget,
    secondCanvasHeight,
    secondPageWidgets,
    secondScrollRef,
    setWidgets,
    showSecondBackToTop,
    updateWidget,
    viewport,
    viewportScale,
    viewportFixedWidgets,
    widgets,
  } = useWidgetPanelLayout(activePage, pageSlideDirection, onPageChange);
  const [editingLinkWidgetId, setEditingLinkWidgetId] = useState<string | null>(null);
  const [editingLinkAnchor, setEditingLinkAnchor] = useState<DOMRect | null>(null);
  const [widgetMenu, setWidgetMenu] = useState<{ id: string; x: number; y: number; anchorRect: DOMRect } | null>(null);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [batchSelectedWidgetIds, setBatchSelectedWidgetIds] = useState<string[]>([]);
  const batchWidgetDragStartRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const [sizeEditor, setSizeEditor] = useState<{ id: string; anchorRect: DOMRect; size: ElementSize; lockAspectRatio: boolean } | null>(null);
  const [priorityEditor, setPriorityEditor] = useState<{ id: string; anchorRect: DOMRect } | null>(null);
  const [fontEditor, setFontEditor] = useState<{ id: string; anchorRect: DOMRect } | null>(null);
  const [priorityDraft, setPriorityDraft] = useState('0');
  const [embedEditor, setEmbedEditor] = useState<{ id: string; anchorRect: DOMRect } | null>(null);
  const [embedUrlDraft, setEmbedUrlDraft] = useState('');
  const [embedUrlError, setEmbedUrlError] = useState('');
  const [isSavingEmbed, setIsSavingEmbed] = useState(false);
  const [spaceItemEditor, setSpaceItemEditor] = useState<SpaceItemEditorState | null>(null);
  const [editingLinkTextId, setEditingLinkTextId] = useState<string | null>(null);
  const [editingLinkTextAnchor, setEditingLinkTextAnchor] = useState<DOMRect | null>(null);
  const [weatherLocationEditor, setWeatherLocationEditor] = useState<{ id: string; anchorRect: DOMRect } | null>(null);
  const [anchorEditorId, setAnchorEditorId] = useState<string | null>(null);
  const moveWidgetToOtherPage = (id: string) => {
    moveWidgetToOtherPageBase(id);
    setWidgetMenu(null);
  };
  const deleteLocalPageIfUnused = (localId: string | undefined, excludingWidgetId: string) => {
    if (!localId) return;
    const sharedInCurrent = widgets.some((widget) => widget.id !== excludingWidgetId && widget.embedLocalId === localId);
    const otherMode = pageSlideDirection === 'horizontal' ? 'vertical' : 'horizontal';
    const sharedInOther = hasStoredWidgets(otherMode) && loadWidgets(otherMode).some((widget) => widget.embedLocalId === localId);
    const sharedInRecycleBin = loadDeletedWidgets(pageSlideDirection).some((record) => record.widget.embedLocalId === localId)
      || loadDeletedWidgets(otherMode).some((record) => record.widget.embedLocalId === localId);
    if (!sharedInCurrent && !sharedInOther && !sharedInRecycleBin) void deleteLocalWebPage(localId);
  };
  const removeWidget = (id: string) => {
    const target = widgets.find((widget) => widget.id === id);
    if (!target) return;
    recycleWidget(target, pageSlideDirection);
    removeWidgetBase(id);
    setSelectedWidgetId((current) => current === id ? null : current);
    setBatchSelectedWidgetIds((current) => current.filter((widgetId) => widgetId !== id));
  };
  const editingLinkWidget = useMemo(
    () => widgets.find((widget) => widget.id === editingLinkWidgetId) ?? null,
    [editingLinkWidgetId, widgets],
  );
  const editingLinkTextWidget = useMemo(
    () => widgets.find((widget) => widget.id === editingLinkTextId) ?? null,
    [editingLinkTextId, widgets],
  );
  const editingSpaceItem = useMemo(() => {
    if (!spaceItemEditor?.itemId) return null;
    const targetSpace = spaces.find((space) => space.id === spaceItemEditor.spaceId);
    return targetSpace ? findDockItemById(targetSpace.apps, spaceItemEditor.itemId) : null;
  }, [spaceItemEditor, spaces]);
  const { showEmptyDesktopHud } = useEmptyDesktopHud({
    activePage,
    viewportHeight: viewport.h * viewportScale,
    viewportWidth: viewport.w * viewportScale,
    widgets,
    pageSlideDirection,
  });
  const showHorizontalEmptyPageHud = pageSlideDirection === 'horizontal'
    && shouldShowHorizontalEmptyPageHud(widgets, activePage);
  const horizontalPageIds = useMemo(() => {
    const pages = new Set<number>([0, Math.max(0, Math.trunc(activePage))]);
    widgets.forEach((widget) => {
      if (widget.positionMode !== 'viewport') pages.add(Math.max(0, Math.trunc(widget.pageId ?? 1)));
    });
    return [...pages].sort((a, b) => a - b);
  }, [activePage, widgets]);
  const selectedWidgetIds = useMemo(() => (
    batchSelectedWidgetIds.length > 0
      ? batchSelectedWidgetIds
      : selectedWidgetId ? [selectedWidgetId] : []
  ), [batchSelectedWidgetIds, selectedWidgetId]);
  useEffect(() => {
    const handleObjectSelection = (event: Event) => {
      const detail = (event as CustomEvent<ObjectSelectionEventDetail>).detail;
      if (detail?.additive) return;
      if (detail?.kind !== 'widget') {
        setSelectedWidgetId(null);
        setBatchSelectedWidgetIds([]);
      }
    };
    window.addEventListener(OBJECT_SELECTION_EVENT, handleObjectSelection);
    return () => window.removeEventListener(OBJECT_SELECTION_EVENT, handleObjectSelection);
  }, []);

  useEffect(() => {
    if (!isEditMode) {
      setSelectedWidgetId(null);
      setBatchSelectedWidgetIds([]);
    }
  }, [isEditMode]);

  useEffect(() => {
    const availableIds = new Set(widgets.map((widget) => widget.id));
    setBatchSelectedWidgetIds((previous) => {
      const next = previous.filter((id) => availableIds.has(id));
      return next.length === previous.length ? previous : next;
    });
  }, [widgets]);

  useEffect(() => {
    const resetPreview = (ids: string[], excludedId: string | null) => {
      ids.forEach((id) => {
        if (id === excludedId) return;
        const start = batchWidgetDragStartRef.current.get(id);
        const element = document.querySelector<HTMLElement>(`[data-widget-id="${id}"]`);
        if (!start || !element) return;
        element.style.left = `${start.x}px`;
        element.style.top = `${start.y}px`;
      });
      batchWidgetDragStartRef.current = new Map();
    };

    const handleGroupDrag = (event: Event) => {
      const detail = (event as CustomEvent<ObjectGroupDragEventDetail>).detail;
      if (!detail || selectedWidgetIds.length === 0) return;
      if (detail.activeKind === 'widget' && !selectedWidgetIds.includes(detail.activeId)) return;

      const excludedId = detail.activeKind === 'widget' ? detail.activeId : null;
      const peerIds = selectedWidgetIds.filter((id) => id !== excludedId);
      if (peerIds.length === 0) return;

      if (detail.phase === 'cancel') {
        resetPreview(selectedWidgetIds, excludedId);
        return;
      }

      if (batchWidgetDragStartRef.current.size === 0) {
        batchWidgetDragStartRef.current = new Map(
          widgets
            .filter((widget) => selectedWidgetIds.includes(widget.id))
            .map((widget) => [widget.id, { x: widget.x, y: widget.y }]),
        );
      }

      const resolvePosition = (widget: WidgetLayout, start: { x: number; y: number }) => {
        const x = clampFreeLayoutAxis(start.x + detail.dx, viewport.w, widget.w);
        const pageId = widget.positionMode === 'viewport' ? 0 : Math.max(0, Math.trunc(widget.pageId ?? 1));
        const infiniteWidgetY = pageSlideDirection === 'vertical' && widget.positionMode !== 'viewport' && pageId === 1;
        const y = infiniteWidgetY
          ? Math.max(-widget.h * FREE_LAYOUT_OVERFLOW_RATIO, start.y + detail.dy)
          : clampFreeLayoutAxis(start.y + detail.dy, viewport.h, widget.h);
        return { x, y };
      };

      if (detail.phase === 'preview') {
        peerIds.forEach((id) => {
          const widget = widgets.find((item) => item.id === id);
          const start = batchWidgetDragStartRef.current.get(id);
          const element = document.querySelector<HTMLElement>(`[data-widget-id="${id}"]`);
          if (!widget || !start || !element) return;
          const position = resolvePosition(widget, start);
          element.style.left = `${position.x}px`;
          element.style.top = `${position.y}px`;
        });
        return;
      }

      setWidgets((previous) => previous.map((widget) => {
        if (!peerIds.includes(widget.id)) return widget;
        const start = batchWidgetDragStartRef.current.get(widget.id);
        if (!start) return widget;
        return { ...widget, ...resolvePosition(widget, start) };
      }));
      batchWidgetDragStartRef.current = new Map();
    };

    window.addEventListener(OBJECT_GROUP_DRAG_EVENT, handleGroupDrag);
    return () => window.removeEventListener(OBJECT_GROUP_DRAG_EVENT, handleGroupDrag);
  }, [pageSlideDirection, selectedWidgetIds, setWidgets, viewport.h, viewport.w, widgets]);

  const activateWidget = (id: string, additive = false) => {
    bringWidgetToFront(id);
    if (!isEditMode) return;

    const alreadySelected = selectedWidgetIds.includes(id);
    if (additive) {
      if (batchSelectedWidgetIds.length === 0 && selectedWidgetId === id) {
        setSelectedWidgetId(null);
      } else {
        setBatchSelectedWidgetIds((previous) => {
          const seeded = previous.length === 0 && selectedWidgetId && selectedWidgetId !== id
            ? [selectedWidgetId]
            : previous;
          return seeded.includes(id)
            ? seeded.filter((widgetId) => widgetId !== id)
            : [...seeded, id];
        });
        setSelectedWidgetId(null);
        announceObjectSelection('widget', id, { additive: true });
      }
      return;
    }

    if (!alreadySelected) setBatchSelectedWidgetIds([]);
    setSelectedWidgetId(id);
    announceObjectSelection('widget', id, { additive: alreadySelected });
  };

  const handleOpenWidgetMenu = (id: string, x: number, y: number, anchorRect: DOMRect) => {
    if (isEditMode) {
      const alreadySelected = selectedWidgetIds.includes(id);
      if (!alreadySelected) setBatchSelectedWidgetIds([]);
      setSelectedWidgetId(id);
      announceObjectSelection('widget', id, { additive: alreadySelected });
    }
    setWidgetMenu({ id, x, y, anchorRect });
    setSizeEditor(null);
    setPriorityEditor(null);
    setFontEditor(null);
    setEmbedEditor(null);
    setWeatherLocationEditor(null);
    setAnchorEditorId(null);
  };
  const handleLinkEdit = (id: string, anchorRect: DOMRect) => {
    setEditingLinkWidgetId(id);
    setEditingLinkAnchor(anchorRect);
    setWidgetMenu(null);
  };
  const handleLinkTextEdit = (id: string, anchorRect: DOMRect) => {
    setEditingLinkTextId(id);
    setEditingLinkTextAnchor(anchorRect);
    setWidgetMenu(null);
  };
  const updateLinkTextStyle = (id: string, updates: Pick<Partial<WidgetLayout>, 'linkTextColor' | 'linkTextSize' | 'linkTextStroke' | 'linkTextHidden'>) => {
    setWidgets((prev) => prev.map((widget) => widget.id === id ? { ...widget, ...updates } : widget));
  };
  const toggleWidgetPin = (id: string) => {
    setWidgets((prev) => prev.map((widget) => widget.id === id ? { ...widget, isPinned: !widget.isPinned } : widget));
    setWidgetMenu(null);
  };
  const toggleWidgetScreenFixed = (id: string) => {
    const scrollTop = (secondScrollRef.current?.scrollTop ?? 0) / viewportScale;
    setWidgets((prev) => prev.map((widget) => widget.id === id
      ? { ...widget, ...getToggledWidgetPositionMode(widget, activePage, scrollTop) }
      : widget));
    setWidgetMenu(null);
  };
  const setWidgetContainerStyle = (id: string, containerStyle: WidgetLayout['containerStyle']) =>
    setWidgets((prev) => prev.map((widget) => widget.id === id ? { ...widget, containerStyle } : widget));
  const openAnchorEditor = (id: string) => {
    setAnchorEditorId(id);
    setWidgetMenu(null);
  };
  const openFontEditor = (id: string, anchorRect: DOMRect) => {
    const current = widgets.find((widget) => widget.id === id);
    if (!current || (current.type !== 'clock' && current.type !== 'countdown')) return;
    void ensureBuiltInFontLoaded(current.fontFamily);
    setFontEditor({ id, anchorRect });
    setPriorityEditor(null);
    setWidgetMenu(null);
  };
  const changeWidgetFont = (id: string, fontFamily: BuiltInFontId) => {
    void ensureBuiltInFontLoaded(fontFamily);
    setWidgets((prev) => prev.map((widget) => widget.id === id ? { ...widget, fontFamily } : widget));
    setFontEditor(null);
  };
  const openPriorityEditor = (id: string, anchorRect: DOMRect) => {
    const current = widgets.find((widget) => widget.id === id);
    setPriorityDraft(String(current?.priority ?? 0));
    setPriorityEditor({ id, anchorRect });
    setWidgetMenu(null);
  };
  const openSizeEditor = (id: string, anchorRect: DOMRect) => {
    const current = widgets.find((widget) => widget.id === id);
    if (!current) return;
    setSizeEditor({
      id,
      anchorRect,
      size: { width: current.w, height: current.h },
      lockAspectRatio: Boolean(current.lockAspectRatio),
    });
    setWidgetMenu(null);
  };
  const pasteWidgetSize = (id: string) => {
    const current = widgets.find((widget) => widget.id === id);
    const copied = readElementSizeClipboard();
    if (!current || !copied) return;
    const target = current.lockAspectRatio
      ? fitSizeToAspectRatio(copied, current.w / Math.max(1, current.h))
      : copied;
    resizeWidget(id, target.width, target.height);
    setWidgetMenu(null);
  };
  const openEmbedEditor = (id: string, anchorRect: DOMRect) => {
    const current = widgets.find((widget) => widget.id === id);
    if (!current || current.type !== 'embed') return;
    setEmbedUrlDraft(current.embedUrl ?? '');
    setEmbedUrlError('');
    setEmbedEditor({ id, anchorRect });
    setPriorityEditor(null);
    setFontEditor(null);
    setWidgetMenu(null);
  };

  const openWeatherLocationEditor = (id: string, anchorRect: DOMRect) => {
    const current = widgets.find((widget) => widget.id === id);
    if (!current || current.type !== 'weather') return;
    setWeatherLocationEditor({ id, anchorRect });
    setPriorityEditor(null);
    setFontEditor(null);
    setEmbedEditor(null);
    setWidgetMenu(null);
  };
  const saveEmbedUrl = async () => {
    if (!embedEditor || isSavingEmbed) return;
    const trimmed = embedUrlDraft.trim();
    if (!trimmed) {
      setWidgets((prev) => prev.map((widget) => widget.id === embedEditor.id ? { ...widget, embedUrl: undefined } : widget));
      setEmbedEditor(null);
      setEmbedUrlError('');
      return;
    }

    const validUrl = getValidEmbedUrl(normalizeEmbedUrl(trimmed));
    if (!validUrl) {
      setEmbedUrlError('请输入有效的 HTTP 或 HTTPS 地址。');
      return;
    }

    setIsSavingEmbed(true);
    setEmbedUrlError('');
    try {
      // 权限请求紧跟用户点击，避免异步检查消耗掉浏览器的用户手势。
      // 即使用户拒绝授权，也保留地址：部分 NAS 页面无需额外权限即可嵌入。
      await requestHostPermissionForUrl(validUrl);
      const previousLocalId = widgets.find((widget) => widget.id === embedEditor.id)?.embedLocalId;
      setWidgets((prev) => prev.map((widget) => widget.id === embedEditor.id ? {
        ...widget,
        embedUrl: validUrl,
        embedLocalId: undefined,
        embedLocalName: undefined,
        embedLocalUpdatedAt: undefined,
      } : widget));
      deleteLocalPageIfUnused(previousLocalId, embedEditor.id);
      setEmbedEditor(null);
      setEmbedUrlDraft(validUrl);
    } finally {
      setIsSavingEmbed(false);
    }
  };

  const importLocalEmbed = async (
    load: (storageKey: string) => Promise<{ id: string; name: string; createdAt: number }>,
    fallbackError: string,
  ) => {
    if (!embedEditor || isSavingEmbed) return;
    const editorId = embedEditor.id;
    setIsSavingEmbed(true); setEmbedUrlError('');
    try {
      const previousLocalId = widgets.find((widget) => widget.id === editorId)?.embedLocalId;
      const item = await load(`${pageSlideDirection}-${editorId}`);
      setWidgets((prev) => prev.map((widget) => widget.id === editorId ? {
        ...widget, embedUrl: undefined, embedLocalId: item.id, embedLocalName: item.name, embedLocalUpdatedAt: item.createdAt,
      } : widget));
      setEmbedUrlDraft(''); setEmbedEditor(null);
      if (previousLocalId && previousLocalId !== item.id) deleteLocalPageIfUnused(previousLocalId, editorId);
    } catch (error) {
      setEmbedUrlError(error instanceof Error ? error.message : fallbackError);
    } finally { setIsSavingEmbed(false); }
  };

  const importLocalEmbedFile = (file: File) => importLocalEmbed(
    (key) => /\.zip$/i.test(file.name) ? saveLocalWebPackageFile(key, file) : saveLocalWebPageFile(key, file),
    '导入本地网页失败。',
  );
  const importLocalEmbedDirectory = (files: File[]) => files.length > 0
    ? importLocalEmbed((key) => saveLocalWebDirectoryFiles(key, files), '导入网页文件夹失败。')
    : Promise.resolve();

  const clearEmbed = (id: string) => {
    const localId = widgets.find((widget) => widget.id === id)?.embedLocalId;
    setWidgets((prev) => prev.map((widget) => widget.id === id ? {
      ...widget,
      embedUrl: undefined,
      embedLocalId: undefined,
      embedLocalName: undefined,
      embedLocalUpdatedAt: undefined,
    } : widget));
    deleteLocalPageIfUnused(localId, id);
    setEmbedEditor(null);
    setEmbedUrlDraft('');
    setEmbedUrlError('');
  };

  const savePriority = () => {
    if (!priorityEditor) return;
    const parsed = Number(priorityDraft.trim());
    const nextPriority = Number.isFinite(parsed) ? normalizePriority(parsed) : 0;
    setWidgets((prev) => prev.map((widget) => widget.id === priorityEditor.id ? { ...widget, priority: nextPriority } : widget));
    setPriorityEditor(null);
  };

  const handleEditSpaceItem = (widgetId: string, spaceId: string, item: DockItem, anchorRect: DOMRect) => {
    setSpaceItemEditor({ widgetId, spaceId, itemId: item.id, anchorRect });
  };

  const handleAddSpaceItem = (widgetId: string, spaceId: string, anchorRect: DOMRect) => {
    setSpaceItemEditor({ widgetId, spaceId, itemId: null, anchorRect });
  };

  const handleDeleteSpaceItem = (spaceId: string, itemId: string) => {
    updateSpaceApps(spaceId, (apps) => removeDockItemById(apps, itemId));
  };

  const handleReorderSpaceItem = (
    spaceId: string,
    sourceId: string,
    targetId: string,
    placement: DockItemDropPlacement,
  ) => {
    updateSpaceApps(spaceId, (apps) => reorderRootDockItems(apps, sourceId, targetId, placement));
  };

  const handleMergeSpaceItem = (spaceId: string, sourceId: string, targetId: string) => {
    updateSpaceApps(spaceId, (apps) => mergeRootDockItems(apps, sourceId, targetId));
  };

  const handleUpdateSpaceFolderItems = (spaceId: string, folderId: string, items: DockItem[]) => {
    updateSpaceApps(spaceId, (apps) => updateFolderItemsById(apps, folderId, items));
  };

  const handleMoveSpaceFolderItemToRoot = (
    spaceId: string,
    folderId: string,
    itemId: string,
    targetId?: string,
    placement: DockItemDropPlacement = 'after',
  ) => {
    updateSpaceApps(spaceId, (apps) => moveFolderItemToRoot(apps, folderId, itemId, targetId, placement));
  };

  const handleSpaceItemSave = (item: Partial<DockItem>) => {
    if (!spaceItemEditor) return;
    const name = item.name?.trim();
    if (!name) return;

    if (spaceItemEditor.itemId) {
      const updates: Partial<DockItem> = editingSpaceItem?.type === 'folder'
        ? { name }
        : { name, url: item.url, action: item.action, icon: item.icon, iconSmall: item.iconSmall };
      updateSpaceApps(spaceItemEditor.spaceId, (apps) => updateDockItemById(apps, spaceItemEditor.itemId!, updates));
    } else {
      const newItem: DockItem = {
        id: createId(),
        type: 'app',
        name,
        url: item.url,
        action: item.action,
        icon: item.icon,
        iconSmall: item.iconSmall,
      };
      updateSpaceApps(spaceItemEditor.spaceId, (apps) => [...apps, newItem]);
    }
    setSpaceItemEditor(null);
  };
  const handleLinkSave = (item: Partial<DockItem>) => {
    if (!editingLinkWidgetId) return;
    setWidgets((prev) => prev.map((widget) => widget.id === editingLinkWidgetId ? {
      ...widget,
      name: item.name,
      url: item.url,
      action: item.action,
      icon: item.icon,
      iconSmall: item.iconSmall,
    } : widget));
    setEditingLinkWidgetId(null);
    setEditingLinkAnchor(null);
  };

  useEffect(() => {
    if (!widgetMenu) return;
    const closeMenu = () => setWidgetMenu(null);
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, [widgetMenu]);

  const renderWidget = (widget: WidgetLayout, pageId: WidgetPageId, scrollContainerRef?: RefObject<HTMLDivElement>) => (
    <SortableWidget
      key={widget.id}
      widget={widget}
      isSelected={isEditMode && selectedWidgetIds.includes(widget.id)}
      spaces={spaces}
      canvasWidth={viewport.w}
      canvasHeight={pageSlideDirection === 'horizontal' || pageId === 0 ? viewport.h : secondCanvasHeight}
      viewportScale={viewportScale}
      infiniteY={pageSlideDirection === 'vertical' && pageId === 1}
      scrollContainerRef={scrollContainerRef}
      onMove={moveWidget}
      onActivate={activateWidget}
      onRemove={removeWidget}
      onResize={resizeWidget}
      onUpdate={updateWidget}
      onMovePage={moveWidgetToOtherPage}
      onOpenWidgetMenu={handleOpenWidgetMenu}
      onEditSpaceItem={handleEditSpaceItem}
      onAddSpaceItem={handleAddSpaceItem}
      onDeleteSpaceItem={handleDeleteSpaceItem}
      onReorderSpaceItem={handleReorderSpaceItem}
      onMergeSpaceItem={handleMergeSpaceItem}
      onUpdateSpaceFolderItems={handleUpdateSpaceFolderItems}
      onMoveSpaceFolderItemToRoot={handleMoveSpaceFolderItemToRoot}
      onConfigureEmbed={openEmbedEditor}
    />
  );

  return (
    <div className={styles.panel} data-active-page={activePage}>
      {pageSlideDirection === 'horizontal' ? (
        <div className={`${styles.pageTrack} ${styles.pageTrackHorizontal}`} style={{ transform: `translateX(-${Math.max(0, activePage) * 100}vw)` }}>
          {horizontalPageIds.map((pageId) => (
            <section
              key={pageId}
              className={`${styles.widgetPage} ${styles.horizontalWidgetPage}`}
              style={{ left: `${pageId * 100}vw` }}
              aria-hidden={activePage !== pageId}
            >
              <WidgetLogicalCanvas height={viewport.h} scale={viewportScale}>
                <div className={styles.grid}>
                  <WidgetPageRetention active={activePage === pageId || (preloadNearbyPages && Math.abs(activePage - pageId) <= 1)}>
                    {widgets
                      .filter((widget) => widget.positionMode !== 'viewport' && Math.max(0, Math.trunc(widget.pageId ?? 1)) === pageId)
                      .map((widget) => renderWidget(widget, pageId))}
                  </WidgetPageRetention>
                </div>
              </WidgetLogicalCanvas>
            </section>
          ))}
        </div>
      ) : (
        <div className={`${styles.pageTrack} ${activePage === 1 ? styles.pageTrackSecond : ''}`}>
          <section className={styles.widgetPage} aria-hidden={activePage !== 0}>
            <WidgetLogicalCanvas height={viewport.h} scale={viewportScale}>
              <div className={styles.grid}>
                <WidgetPageRetention active={activePage === 0 || preloadNearbyPages}>
                  {firstPageWidgets.map((widget) => renderWidget(widget, 0))}
                </WidgetPageRetention>
              </div>
            </WidgetLogicalCanvas>
          </section>
          <section className={styles.widgetPage} aria-hidden={activePage !== 1}>
            <div ref={secondScrollRef} className={styles.secondPageScroller} data-widget-scroll-page="1">
              <WidgetLogicalCanvas height={secondCanvasHeight} scale={viewportScale} sizeScrollHeight>
                <WidgetPageRetention active={activePage === 1 || preloadNearbyPages}>
                  {secondPageWidgets.map((widget) => renderWidget(widget, 1, secondScrollRef))}
                  <div className={styles.canvasEnd} style={{ top: secondCanvasHeight - 150 }} aria-hidden="true">
                    <span>继续向下拖放，画布会自动延伸</span>
                  </div>
                </WidgetPageRetention>
              </WidgetLogicalCanvas>
            </div>
          </section>
        </div>
      )}

      {viewportFixedWidgets.length > 0 && (
        <div className={styles.viewportFixedLayer} aria-label="相对屏幕固定组件">
          <WidgetLogicalCanvas height={viewport.h} scale={viewportScale}>
            <WidgetPageRetention active>
              {viewportFixedWidgets.map((widget) => renderWidget(widget, activePage))}
            </WidgetPageRetention>
          </WidgetLogicalCanvas>
        </div>
      )}

      {(showEmptyDesktopHud || showHorizontalEmptyPageHud) && (
        <div className={styles.pageHud}>
          <button
            type="button"
            onClick={() => onPageChange(0)}
            title={pageSlideDirection === 'horizontal' ? '向左返回首页' : '向上返回首页'}
            aria-label="返回首页"
          >
            {pageSlideDirection === 'horizontal' ? '←' : '↑'}
          </button>
          <span>{pageSlideDirection === 'horizontal' ? `第 ${activePage + 1} 页` : `组件桌面 · ${Math.max(1, Math.ceil(secondCanvasHeight / viewport.h))} 屏`}</span>
          <button
            type="button"
            className={pageSlideDirection === 'horizontal' ? styles.pageHudButtonVisible : (showSecondBackToTop ? styles.pageHudButtonVisible : styles.pageHudButtonHidden)}
            onClick={() => pageSlideDirection === 'horizontal' ? onPageChange(activePage + 1) : secondScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            title={pageSlideDirection === 'horizontal' ? '向右进入下一页' : '回到第二页顶部'}
            aria-label={pageSlideDirection === 'horizontal' ? '下一页' : '回到第二页顶部'}
          >
            {pageSlideDirection === 'horizontal' ? '→' : '⇧'}
          </button>
        </div>
      )}

      {widgetMenu && (() => {
        const menuWidget = widgets.find((widget) => widget.id === widgetMenu.id);
        if (!menuWidget) return null;
        return (
          <WidgetContextMenu
            widget={menuWidget}
            x={widgetMenu.x}
            y={widgetMenu.y}
            anchorRect={widgetMenu.anchorRect}
            onClose={() => setWidgetMenu(null)}
            onEditLink={handleLinkEdit}
            onEditLinkText={handleLinkTextEdit}
            onEditFont={openFontEditor}
            onEditEmbed={openEmbedEditor}
            onEditWeatherLocation={openWeatherLocationEditor}
            onEditPriority={openPriorityEditor}
            onEditSize={openSizeEditor}
            onPasteSize={pasteWidgetSize}
            onEditAnchor={openAnchorEditor}
            onMovePage={moveWidgetToOtherPage}
            onTogglePin={toggleWidgetPin}
            onToggleScreenFixed={toggleWidgetScreenFixed}
            onSetContainerStyle={setWidgetContainerStyle}
          />
        );
      })()}

      {sizeEditor && (() => {
        const targetWidget = widgets.find((widget) => widget.id === sizeEditor.id);
        if (!targetWidget) return null;
        return (
          <SizeEditorPopover
            key={sizeEditor.id}
            title="容器尺寸"
            anchorRect={sizeEditor.anchorRect}
            width={sizeEditor.size.width}
            height={sizeEditor.size.height}
            lockAspectRatio={sizeEditor.lockAspectRatio}
            onClose={() => setSizeEditor(null)}
            onApply={(size, lockAspectRatio) => {
              resizeWidget(targetWidget.id, size.width, size.height, lockAspectRatio);
            }}
          />
        );
      })()}

      {anchorEditorId && (() => {
        const targetWidget = widgets.find((widget) => widget.id === anchorEditorId);
        if (!targetWidget) return null;
        return (
          <Suspense fallback={null}>
            <LazyWidgetAnchorEditor
              widget={targetWidget}
              widgets={widgets}
              onClose={() => setAnchorEditorId(null)}
              onSave={(anchorId) => {
                updateWidget(targetWidget.id, { anchorId });
                setAnchorEditorId(null);
              }}
            />
          </Suspense>
        );
      })()}

      {weatherLocationEditor && (() => {
        const weatherWidget = widgets.find((widget) => widget.id === weatherLocationEditor.id);
        if (!weatherWidget || weatherWidget.type !== 'weather') return null;
        return (
          <Suspense fallback={null}>
            <LazyWeatherLocationEditor
              widget={weatherWidget}
              anchorRect={weatherLocationEditor.anchorRect}
              onClose={() => setWeatherLocationEditor(null)}
              onUpdate={updateWidget}
            />
          </Suspense>
        );
      })()}

      {(fontEditor || embedEditor || priorityEditor || (editingLinkTextWidget && editingLinkTextAnchor)) && (
        <Suspense fallback={null}>
          <LazyWidgetPanelQuickEditors
            widgets={widgets}
            fontEditor={fontEditor}
            onCloseFont={() => setFontEditor(null)}
            onChangeFont={changeWidgetFont}
            embedEditor={embedEditor}
            embedUrlDraft={embedUrlDraft}
            embedUrlError={embedUrlError}
            isSavingEmbed={isSavingEmbed}
            onEmbedDraftChange={(value) => { setEmbedUrlDraft(value); setEmbedUrlError(''); }}
            onCloseEmbed={() => setEmbedEditor(null)}
            onSaveEmbed={() => { void saveEmbedUrl(); }}
            onImportEmbedFile={(file) => { void importLocalEmbedFile(file); }}
            onImportEmbedDirectory={(files) => { void importLocalEmbedDirectory(files); }}
            onClearEmbed={clearEmbed}
            priorityEditor={priorityEditor}
            priorityDraft={priorityDraft}
            onPriorityDraftChange={setPriorityDraft}
            onClosePriority={() => setPriorityEditor(null)}
            onSavePriority={savePriority}
            linkTextWidget={editingLinkTextWidget}
            linkTextAnchor={editingLinkTextAnchor}
            onCloseLinkText={() => { setEditingLinkTextId(null); setEditingLinkTextAnchor(null); }}
            onUpdateLinkText={updateLinkTextStyle}
          />
        </Suspense>
      )}

      {spaceItemEditor && (
        <Suspense fallback={null}>
          <LazyAddEditModal
            isOpen
            item={spaceItemEditor.itemId && editingSpaceItem ? editingSpaceItem : null}
            onClose={() => setSpaceItemEditor(null)}
            onSave={handleSpaceItemSave}
            anchorRect={spaceItemEditor.anchorRect}
            hideHeader
            popoverPlacement="side"
            nameOnly={editingSpaceItem?.type === 'folder'}
          />
        </Suspense>
      )}

      {editingLinkWidget && editingLinkAnchor && (
        <Suspense fallback={null}>
          <LazyAddEditModal
            isOpen
            item={{
              id: editingLinkWidget.id,
              name: editingLinkWidget.name ?? '',
              url: editingLinkWidget.url ?? '',
              action: editingLinkWidget.action,
              icon: editingLinkWidget.icon,
              iconSmall: editingLinkWidget.iconSmall,
              type: 'app',
            }}
            onClose={() => { setEditingLinkWidgetId(null); setEditingLinkAnchor(null); }}
            onSave={handleLinkSave}
            anchorRect={editingLinkAnchor}
            hideHeader
            popoverPlacement="side"
          />
        </Suspense>
      )}
    </div>
  );
};
