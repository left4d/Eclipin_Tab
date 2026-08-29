import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SCENE_DRAGGING_Z_INDEX, SCENE_WIDGET_LOCAL_LAYER, normalizeScenePriority, resolveSceneZIndex } from '@/shared/utils/sceneStacking';
import { clampFreeLayoutAxis, FREE_LAYOUT_OVERFLOW_RATIO } from '@/shared/utils/freeLayoutBounds';
import { useThemeData } from '@/features/theme/context/ThemeContext';
import { useDockUI } from '@/features/dock/context/DockContext';
import type { DockItem } from '@/features/dock/types/dock';
import { fetchAndProcessIcon } from '@/features/dock/utils/iconFetcher';
import { getBookmarkTree, hasBookmarkPermission, isBookmarkApiAvailable } from '@/features/dock/utils/bookmarks';
import { countWebsiteItems, type DockItemDropPlacement, findDockItemById } from '@/features/spaces/utils/dockItemTree';
import { useResolvedIcon } from './useResolvedIcon';
import { announceObjectGroupDrag } from '@/shared/utils/objectSelection';
import { widgetMeta } from '../config/widgetMeta';
import { bookmarkNodesToDockItems } from '../utils/widgetFormatters';
import type { SortableWidgetProps, SpaceDropMode } from '../components/sortable/SortableWidget.types';
import { useWidgetClockState } from './useWidgetClockState';
import { useWidgetCalculator } from './useWidgetCalculator';
import { useWidgetNotes } from './useWidgetNotes';
import { useWidgetWeather } from './useWidgetWeather';
import { useWidgetTranslation } from './useWidgetTranslation';
import { useWidgetPomodoro } from './useWidgetPomodoro';
import { useWidgetEmbedSession } from './useWidgetEmbedSession';

export const useSortableWidgetController = (props: SortableWidgetProps) => {
  const {
    widget,
    spaces,
    canvasWidth,
    canvasHeight,
    viewportScale,
    infiniteY,
    scrollContainerRef,
    onMove,
    onRemove,
    onUpdate,
  } = props;
  const widgetRef = useRef<HTMLDivElement>(null);
  const suppressLinkClickRef = useRef(false);
  const { openInNewTab, theme } = useThemeData();
  const { isEditMode } = useDockUI();
  const { now, calendarMonth, setCalendarMonth } = useWidgetClockState(widget);
  const notes = useWidgetNotes(widget, onUpdate);
  const calculator = useWidgetCalculator();
  const weather = useWidgetWeather(widget);
  const translation = useWidgetTranslation(widget, onUpdate);
  const embed = useWidgetEmbedSession(widget);
  const [isDragging, setIsDragging] = useState(false);
  const [bookmarkItems, setBookmarkItems] = useState<DockItem[]>([]);
  const [bookmarkStatus, setBookmarkStatus] = useState('正在检查书签权限…');
  const [bookmarkPermissionGranted, setBookmarkPermissionGranted] = useState(false);
  const [bookmarkRefreshKey, setBookmarkRefreshKey] = useState(0);
  const [bookmarkIconRefreshKey, setBookmarkIconRefreshKey] = useState(0);
  const [isFetchingBookmarkIcons, setIsFetchingBookmarkIcons] = useState(false);
  const [bookmarkIconProgress, setBookmarkIconProgress] = useState('');
  const [expandedBookmarkFolderIds, setExpandedBookmarkFolderIds] = useState<Set<string>>(() => new Set());
  const bookmarkFoldersInitializedRef = useRef(false);
  const [draggedSpaceItemId, setDraggedSpaceItemId] = useState<string | null>(null);
  const [spaceDropTarget, setSpaceDropTarget] = useState<{
    id: string;
    mode: SpaceDropMode;
    placement: DockItemDropPlacement;
  } | null>(null);
  const [openSpaceFolder, setOpenSpaceFolder] = useState<{ folderId: string; anchorRect: DOMRect } | null>(null);
  const pomodoro = useWidgetPomodoro(widget, onUpdate, widgetRef);

  useEffect(() => {
    if (widget.type !== 'bookmarks') return;

    let cancelled = false;
    const loadBookmarks = async () => {
      if (!isBookmarkApiAvailable()) {
        setBookmarkPermissionGranted(false);
        setBookmarkItems([]);
        setBookmarkStatus('当前环境不支持浏览器书签 API');
        return;
      }

      const granted = await hasBookmarkPermission();
      if (cancelled) return;
      setBookmarkPermissionGranted(granted);
      if (!granted) {
        setBookmarkItems([]);
        setBookmarkStatus('需要授权后同步浏览器书签');
        return;
      }

      try {
        setBookmarkStatus('正在同步书签…');
        const tree = await getBookmarkTree();
        if (cancelled) return;
        const items = bookmarkNodesToDockItems(tree, widget.bookmarkIcons);
        setBookmarkItems(items);
        if (!bookmarkFoldersInitializedRef.current) {
          bookmarkFoldersInitializedRef.current = true;
          setExpandedBookmarkFolderIds(new Set(
            items.filter((item) => item.type === 'folder').map((item) => item.id),
          ));
        }
        setBookmarkStatus(items.length > 0 ? '' : '没有可显示的书签');
      } catch {
        if (cancelled) return;
        setBookmarkItems([]);
        setBookmarkStatus('书签同步失败，请重新授权或刷新');
      }
    };

    void loadBookmarks();
    return () => { cancelled = true; };
  }, [bookmarkRefreshKey, widget.bookmarkIcons, widget.type]);

  const meta = widgetMeta[widget.type];
  const space = widget.type === 'space' ? spaces.find((item) => item.id === widget.spaceId) : null;
  const spaceItems = space?.apps ?? [];
  const spaceWebsiteCount = useMemo(() => space ? countWebsiteItems(space.apps) : 0, [space]);
  const openSpaceFolderItem = useMemo(() => {
    if (!space || !openSpaceFolder) return null;
    const item = findDockItemById(space.apps, openSpaceFolder.folderId);
    return item?.type === 'folder' ? item : null;
  }, [openSpaceFolder, space]);
  const bookmarkCount = useMemo(() => countWebsiteItems(bookmarkItems), [bookmarkItems]);
  const linkIcon = useResolvedIcon(widget.type === 'link' ? widget.icon : undefined);

  const getSpaceRootDropTarget = useCallback((mousePosition: { x: number; y: number }, excludedIds: string[]) => {
    const root = widgetRef.current;
    if (!root) return null;
    const pointerX = mousePosition.x + 32;
    const pointerY = mousePosition.y + 32;
    let best: { id: string; placement: DockItemDropPlacement; distance: number } | null = null;

    const elements = Array.from(root.querySelectorAll<HTMLElement>('[data-space-item-id]'));
    for (const element of elements) {
      const id = element.dataset.spaceItemId;
      if (!id || excludedIds.includes(id)) continue;
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.hypot(pointerX - centerX, pointerY - centerY);
      if (!best || distance < best.distance) {
        best = { id, placement: pointerX < centerX ? 'before' : 'after', distance };
      }
    }

    return best;
  }, []);

  const fetchBookmarkIcons = useCallback(async () => {
    if (isFetchingBookmarkIcons || !bookmarkPermissionGranted) return;
    const websites: DockItem[] = [];
    const collect = (items: DockItem[]) => items.forEach((item) => {
      if (item.type === 'folder') collect(item.items ?? []);
      else if (item.url) websites.push(item);
    });
    collect(bookmarkItems);
    if (websites.length === 0) {
      setBookmarkIconProgress('没有可获取图标的网站');
      return;
    }

    setIsFetchingBookmarkIcons(true);
    setBookmarkIconProgress(`正在获取 0/${websites.length}`);
    const nextOverrides = { ...(widget.bookmarkIcons ?? {}) };
    let completed = 0;
    let failed = 0;
    let fallbackCount = 0;
    let cursor = 0;

    const worker = async () => {
      while (cursor < websites.length) {
        const currentIndex = cursor++;
        const item = websites[currentIndex];
        try {
          const result = await fetchAndProcessIcon(item.url!, 0, true, true);
          if (result.isFallback) fallbackCount += 1;
          nextOverrides[item.id] = { icon: result.url, iconSmall: result.iconSmall };
        } catch {
          failed += 1;
        } finally {
          completed += 1;
          setBookmarkIconProgress(`正在获取 ${completed}/${websites.length}`);
        }
      }
    };

    try {
      await Promise.all(Array.from({ length: Math.min(4, websites.length) }, () => worker()));
      onUpdate(widget.id, { bookmarkIcons: nextOverrides });
      setBookmarkItems((items) => {
        const apply = (current: DockItem[]): DockItem[] => current.map((item) => {
          if (item.type === 'folder') return { ...item, items: apply(item.items ?? []) };
          const override = nextOverrides[item.id];
          return override ? { ...item, icon: override.icon, iconSmall: override.iconSmall } : item;
        });
        return apply(items);
      });
      setBookmarkIconRefreshKey((value) => value + 1);
      const succeeded = websites.length - failed;
      const details = [
        failed > 0 ? `${failed} 个失败` : '',
        fallbackCount > 0 ? `${fallbackCount} 个使用文字图标` : '',
      ].filter(Boolean).join('，');
      setBookmarkIconProgress(`已更新 ${succeeded}/${websites.length}${details ? `，${details}` : ''}`);
    } finally {
      setIsFetchingBookmarkIcons(false);
    }
  }, [bookmarkItems, bookmarkPermissionGranted, isFetchingBookmarkIcons, onUpdate, widget.bookmarkIcons, widget.id]);

  useEffect(() => {
    if (!bookmarkIconProgress || isFetchingBookmarkIcons) return;
    const timer = window.setTimeout(() => setBookmarkIconProgress(''), 5000);
    return () => window.clearTimeout(timer);
  }, [bookmarkIconProgress, isFetchingBookmarkIcons]);

  useEffect(() => {
    if (openSpaceFolder && !openSpaceFolderItem) setOpenSpaceFolder(null);
  }, [openSpaceFolder, openSpaceFolderItem]);

  const toggleBookmarkFolder = useCallback((folderId: string) => {
    setExpandedBookmarkFolderIds((current) => {
      const next = new Set(current);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  const priority = normalizeScenePriority(widget.priority);
  const widgetStyle = {
    left: widget.x,
    top: widget.y,
    width: widget.w,
    height: widget.h,
    zIndex: isDragging ? SCENE_DRAGGING_Z_INDEX : resolveSceneZIndex(priority, SCENE_WIDGET_LOCAL_LAYER),
  };

  const publishWidgetTrashDrag = (dragging: boolean, over = false) => {
    window.dispatchEvent(new CustomEvent('eclipin:widget-trash-drag', {
      detail: { dragging, over },
    }));
  };

  const startDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || widget.isPinned) return;
    const target = event.target as HTMLElement;
    const isExplicitDragHandle = Boolean(target.closest('[data-widget-drag-handle="true"]'));
    if (widget.type !== 'link' && !isExplicitDragHandle && target.closest('button, input, textarea, select, a, [data-widget-scrollable]')) return;
    event.preventDefault();
    event.stopPropagation();
    const el = widgetRef.current;
    if (!el) return;

    const scrollContainer = scrollContainerRef?.current ?? null;
    const scale = Math.max(0.1, viewportScale);
    const startX = event.clientX;
    const startY = event.clientY;
    const originX = widget.x;
    const originY = widget.y;
    const originScrollTop = scrollContainer?.scrollTop ?? 0;
    let moved = false;
    let frame = 0;
    let latestX = originX;
    let latestY = originY;

    const applyPosition = () => {
      frame = 0;
      el.style.left = `${latestX}px`;
      el.style.top = `${latestY}px`;
    };

    const onPointerMove = (moveEvent: PointerEvent) => {
      const physicalDx = moveEvent.clientX - startX;
      const physicalDy = moveEvent.clientY - startY;
      if (!moved && Math.hypot(physicalDx, physicalDy) < 6) return;
      const dx = physicalDx / scale;
      const dy = physicalDy / scale;
      if (!moved) {
        moved = true;
        setIsDragging(true);
        publishWidgetTrashDrag(true, false);
        if (widget.type === 'link') suppressLinkClickRef.current = true;
        el.style.transition = 'none';
      }

      const recycleBin = document.getElementById('sticker-recycle-bin');
      if (recycleBin) {
        const rect = recycleBin.getBoundingClientRect();
        const overTrash = moveEvent.clientX >= rect.left
          && moveEvent.clientX <= rect.right
          && moveEvent.clientY >= rect.top
          && moveEvent.clientY <= rect.bottom;
        publishWidgetTrashDrag(true, overTrash);
        el.dataset.trashTarget = overTrash ? 'true' : 'false';
      }

      if (infiniteY && scrollContainer) {
        const rect = scrollContainer.getBoundingClientRect();
        const edge = 76;
        if (moveEvent.clientY > rect.bottom - edge) {
          scrollContainer.scrollTop += Math.min(26, Math.max(8, (moveEvent.clientY - (rect.bottom - edge)) / 2));
        } else if (moveEvent.clientY < rect.top + edge) {
          scrollContainer.scrollTop -= Math.min(26, Math.max(8, ((rect.top + edge) - moveEvent.clientY) / 2));
        }
      }

      const scrollDelta = ((scrollContainer?.scrollTop ?? originScrollTop) - originScrollTop) / scale;
      latestX = clampFreeLayoutAxis(originX + dx, canvasWidth, widget.w);
      latestY = infiniteY
        ? Math.max(-widget.h * FREE_LAYOUT_OVERFLOW_RATIO, originY + dy + scrollDelta)
        : clampFreeLayoutAxis(originY + dy, canvasHeight, widget.h);
      announceObjectGroupDrag({
        activeKind: 'widget',
        activeId: widget.id,
        phase: 'preview',
        dx: latestX - originX,
        dy: latestY - originY,
      });
      if (!frame) frame = requestAnimationFrame(applyPosition);
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('pointerup', onPointerUp, true);
      el.style.transition = '';
      setIsDragging(false);

      let droppedInTrash = false;
      if (moved) {
        const recycleBin = document.getElementById('sticker-recycle-bin');
        if (recycleBin) {
          const rect = recycleBin.getBoundingClientRect();
          droppedInTrash = upEvent.clientX >= rect.left
            && upEvent.clientX <= rect.right
            && upEvent.clientY >= rect.top
            && upEvent.clientY <= rect.bottom;
        }
      }

      publishWidgetTrashDrag(false, false);
      delete el.dataset.trashTarget;

      if (droppedInTrash) {
        onRemove(widget.id);
        announceObjectGroupDrag({
          activeKind: 'widget',
          activeId: widget.id,
          phase: 'cancel',
          dx: 0,
          dy: 0,
        });
      } else if (moved) {
        onMove(widget.id, latestX, latestY);
        announceObjectGroupDrag({
          activeKind: 'widget',
          activeId: widget.id,
          phase: 'commit',
          dx: latestX - originX,
          dy: latestY - originY,
        });
      }

      if (moved && widget.type === 'link') {
        window.setTimeout(() => {
          suppressLinkClickRef.current = false;
        }, 0);
      }
    };

    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerup', onPointerUp, true);
  };

  return {
    ...notes,
    ...calculator,
    ...weather,
    ...translation,
    ...embed,
    ...pomodoro,
    bookmarkCount,
    bookmarkIconProgress,
    bookmarkIconRefreshKey,
    bookmarkItems,
    bookmarkPermissionGranted,
    bookmarkStatus,
    calendarMonth,
    draggedSpaceItemId,
    expandedBookmarkFolderIds,
    fetchBookmarkIcons,
    getSpaceRootDropTarget,
    isDragging,
    isEditMode,
    isFetchingBookmarkIcons,
    linkIcon,
    meta,
    now,
    openInNewTab,
    openSpaceFolder,
    openSpaceFolderItem,
    priority,
    setBookmarkPermissionGranted,
    setBookmarkRefreshKey,
    setCalendarMonth,
    setDraggedSpaceItemId,
    setOpenSpaceFolder,
    setSpaceDropTarget,
    space,
    spaceDropTarget,
    spaceItems,
    spaceWebsiteCount,
    startDrag,
    suppressLinkClickRef,
    theme,
    toggleBookmarkFolder,
    widgetRef,
    widgetStyle,
  };
};

export type SortableWidgetController = ReturnType<typeof useSortableWidgetController>;
