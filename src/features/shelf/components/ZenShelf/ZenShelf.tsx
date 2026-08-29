import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDockUI } from '@/features/dock/context/DockContext';
import { useThemeActions, useThemeData } from '@/features/theme/context/ThemeContext';
import { useZenShelf } from '@/features/shelf/context/ZenShelfContext';
import { LinkCardMetadata, Sticker, DEFAULT_TEXT_STYLE } from '@/shared/types';
import { useLanguage } from '@/shared/context/LanguageContext';
import type { BuiltInFontId } from '@/shared/constants/builtInFonts';
import { ensureBuiltInFontLoaded } from '@/shared/constants/builtInFonts';
import { StickerItem } from './StickerItem';
import { TextInput, TextInputHandle } from './TextInput';
import { DrawingInput } from './DrawingInput';
import { RecycleBin } from './RecycleBin';
import { RecycleBinModal } from './RecycleBinModal';
import {
    UI_SELECTORS,
    isEditableElement,
    normalizeStickerPriority,
    normalizeStickerRotation,
} from '@/features/shelf/utils/zenShelfUtils';
import { SHELF_REFERENCE_WIDTH, useShelfViewport } from '@/features/shelf/hooks/useShelfViewport';
import { useStickerBatchSelection } from '@/features/shelf/hooks/useStickerBatchSelection';
import { useStickerImageImport } from '@/features/shelf/hooks/useStickerImageImport';
import { useStickerVectorIconPicker } from '@/features/shelf/hooks/useStickerVectorIconPicker';
import { VectorIconPickerModal } from '@/features/vector-icons/components/VectorIconPickerModal';
import { StickerContextMenuLayer } from './StickerContextMenuLayer';
import { StickerOptionEditors, type StickerEditorAnchor } from './StickerOptionEditors';
import { StickerLinkEditor } from './StickerLinkEditor';
import { resolveStickerNavigationAction } from '@/features/shelf/utils/stickerNavigation';
import { NAVIGATION_ACTION_EVENT, type NavigationActionEventDetail } from '@/shared/navigation';
import { scaleStickerDrawing } from '@/features/shelf/utils/stickerDrawingScale';
import { useVisibleStickerWindow } from '@/features/shelf/hooks/useVisibleStickerWindow';
import { SizeEditorPopover } from '@/shared/components/SizeEditorPopover/SizeEditorPopover';
import { fitSizeToAspectRatio, readElementSizeClipboard, type ElementSize } from '@/shared/utils/elementSizeClipboard';
import { getStickerLogicalSize, getStickerVisualRect, resizeStickerToWidth } from '@/features/shelf/utils/stickerSizing';
import type { StickerContextMenuState, ZenShelfProps } from './zenShelfTypes';
import { normalizeStickerCornerRadius, normalizeStickerStrokeWidth } from '@/features/shelf/utils/stickerAppearance';
import { announceObjectGroupDrag, announceObjectSelection, OBJECT_GROUP_DRAG_EVENT, OBJECT_SELECTION_EVENT, type ObjectGroupDragEventDetail, type ObjectSelectionEventDetail } from '@/shared/utils/objectSelection';
import styles from './ZenShelf.module.css';


// ============================================================================
// ZenShelf 主组件
// ============================================================================

export const ZenShelf: React.FC<ZenShelfProps> = ({ onOpenSettings, onOpenAddWidget, onNavigateInternal, pageIndex = 0 }) => {
    const { stickers, allStickers, selectedStickerId, addSticker, updateSticker, deleteSticker, selectSticker, setCurrentPageIndex, bringToTop } = useZenShelf();
    const { isEditMode, setIsEditMode } = useDockUI();
    const { pageSlideDirection } = useThemeData();
    const { setPageSlideDirection } = useThemeActions();
    const { t } = useLanguage();
    const [textInputPos, setTextInputPos] = useState<{ x: number; y: number } | null>(null);
    const [isDrawingInputOpen, setIsDrawingInputOpen] = useState(false);
    const [drawingSessionIds, setDrawingSessionIds] = useState<string[]>([]);
    const [contextMenu, setContextMenu] = useState<StickerContextMenuState | null>(null);
    const [priorityEditor, setPriorityEditor] = useState<StickerEditorAnchor | null>(null);
    const [priorityDraft, setPriorityDraft] = useState('0');
    const [fontEditor, setFontEditor] = useState<StickerEditorAnchor | null>(null);
    const [linkEditor, setLinkEditor] = useState<StickerEditorAnchor | null>(null);
    const [rotationEditor, setRotationEditor] = useState<StickerEditorAnchor | null>(null);
    const [rotationDraft, setRotationDraft] = useState(0);
    const [rotationInputDraft, setRotationInputDraft] = useState('0');
    const [sizeEditor, setSizeEditor] = useState<{
        stickerId: string;
        anchorRect: DOMRect;
        size: ElementSize;
    } | null>(null);
    const [strokeEditor, setStrokeEditor] = useState<StickerEditorAnchor | null>(null);
    const [strokeDraft, setStrokeDraft] = useState(6);
    const [strokeInputDraft, setStrokeInputDraft] = useState('6');
    const [cornerRadiusEditor, setCornerRadiusEditor] = useState<StickerEditorAnchor | null>(null);
    const [cornerRadiusDraft, setCornerRadiusDraft] = useState(12);
    const [cornerRadiusInputDraft, setCornerRadiusInputDraft] = useState('12');

    const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false);
    const [editingSticker, setEditingSticker] = useState<Sticker | null>(null);
    const textInputRef = useRef<TextInputHandle>(null);
    const pageStickerLayerRef = useRef<HTMLDivElement>(null);
    const {
        viewportScale,
        viewportHeight,
        stableViewportWidth,
        currentPageScrollY,
        pageTransitionDirection,
    } = useShelfViewport(pageIndex);

    const getLivePageScrollY = useCallback(() => {
        if (pageIndex !== 1) return 0;
        return document.querySelector<HTMLElement>('[data-widget-scroll-page="1"]')?.scrollTop ?? 0;
    }, [pageIndex]);

    useEffect(() => {
        const layer = pageStickerLayerRef.current;
        if (!layer) return;
        const applyScroll = (scrollTop: number) => {
            const logicalTop = pageSlideDirection === 'vertical' && pageIndex === 1
                ? -scrollTop / viewportScale
                : 0;
            layer.style.top = `${logicalTop}px`;
        };
        const handleScroll = (event: Event) => {
            const detail = (event as CustomEvent<{ scrollTop?: number }>).detail;
            applyScroll(detail?.scrollTop ?? 0);
        };

        applyScroll(getLivePageScrollY());
        window.addEventListener('eclipin:second-page-scroll', handleScroll);
        return () => window.removeEventListener('eclipin:second-page-scroll', handleScroll);
    }, [getLivePageScrollY, pageIndex, pageSlideDirection, viewportScale]);

    const {
        batchSelectedStickerIds,
        selectedStickerIds,
        setBatchSelectedStickerIds,
        isAnyDragging,
        handleStickerDragStart,
        handleStickerDragEnd,
        toggleBatchSelect,
        previewBatchPosition,
        commitBatchPosition,
        previewExternalBatchPosition,
        commitExternalBatchPosition,
        cancelExternalBatchPosition,
        deleteBatchSelection,
    } = useStickerBatchSelection({
        stickers,
        selectedStickerId,
        pageIndex,
        viewportScale,
        viewportWidth: stableViewportWidth,
        bounceBackClassName: styles.bounceBack,
        selectSticker,
        updateSticker,
        deleteSticker,
    });

    const renderableStickers = useVisibleStickerWindow({
        stickers, pageIndex, scrollY: currentPageScrollY, viewportHeight, viewportScale,
        batchSelectedStickerIds, selectedStickerId, editingStickerId: editingSticker?.id,
    });

    const { fileInputRef, handleFileChange, addImageBlob } = useStickerImageImport({
        addSticker,
        currentPageScrollY,
        viewportScale,
    });

    const handleSetSwapIcon = useCallback((stickerId: string, imageId: string) => {
        updateSticker(stickerId, { iconSwapContent: imageId, interactionEffect: 'iconSwap' });
    }, [updateSticker]);
    const vectorIconPicker = useStickerVectorIconPicker({ addImageBlob, onSetSwapIcon: handleSetSwapIcon });

    useEffect(() => {
        const handleObjectSelection = (event: Event) => {
            const detail = (event as CustomEvent<ObjectSelectionEventDetail>).detail;
            if (detail?.additive) return;
            if (detail?.kind !== 'sticker') {
                if (selectedStickerId) selectSticker(null);
                setBatchSelectedStickerIds([]);
            }
        };
        window.addEventListener(OBJECT_SELECTION_EVENT, handleObjectSelection);
        return () => window.removeEventListener(OBJECT_SELECTION_EVENT, handleObjectSelection);
    }, [selectSticker, selectedStickerId, setBatchSelectedStickerIds]);

    useEffect(() => {
        const handleGroupDrag = (event: Event) => {
            const detail = (event as CustomEvent<ObjectGroupDragEventDetail>).detail;
            if (!detail || detail.activeKind !== 'widget' || selectedStickerIds.length === 0) return;
            if (detail.phase === 'preview') previewExternalBatchPosition(detail.dx, detail.dy);
            else if (detail.phase === 'commit') commitExternalBatchPosition(detail.dx, detail.dy);
            else cancelExternalBatchPosition();
        };
        window.addEventListener(OBJECT_GROUP_DRAG_EVENT, handleGroupDrag);
        return () => window.removeEventListener(OBJECT_GROUP_DRAG_EVENT, handleGroupDrag);
    }, [cancelExternalBatchPosition, commitExternalBatchPosition, previewExternalBatchPosition, selectedStickerIds]);

    useEffect(() => {
        if (!isEditMode) {
            if (selectedStickerId) selectSticker(null);
            setBatchSelectedStickerIds([]);
        }
    }, [isEditMode, selectSticker, selectedStickerId, setBatchSelectedStickerIds]);

    useEffect(() => {
        setCurrentPageIndex(pageIndex);
        setBatchSelectedStickerIds([]);
        setEditingSticker(null);
        setTextInputPos(null);
        setIsDrawingInputOpen(false);
        setDrawingSessionIds([]);
        setContextMenu(null);
        setPriorityEditor(null);
        setFontEditor(null);
        setLinkEditor(null);
        setRotationEditor(null);
        setSizeEditor(null);
        setStrokeEditor(null);
        setCornerRadiusEditor(null);
        setIsRecycleBinOpen(false);
        vectorIconPicker.close();
    }, [pageIndex, setBatchSelectedStickerIds, setCurrentPageIndex, vectorIconPicker.close]);

    const clearAllStickers = useCallback(() => {
        if (stickers.length === 0) return;
        if (!window.confirm(t.contextMenu.clearAllStickersConfirm)) return;

        stickers.forEach(sticker => deleteSticker(sticker.id));
        setBatchSelectedStickerIds([]);
        selectSticker(null);
        setEditingSticker(null);
        setTextInputPos(null);
        setIsDrawingInputOpen(false);
    }, [deleteSticker, selectSticker, stickers, t.contextMenu.clearAllStickersConfirm]);



    // 上下文菜单的全局右键处理程序
    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // 不在 UI 元素上显示
            if (target.closest(UI_SELECTORS)) {
                return;
            }

            setPriorityEditor(null);
            setFontEditor(null);
            setRotationEditor(null);
            setSizeEditor(null);
            setStrokeEditor(null);
            setCornerRadiusEditor(null);

            // 事件委托优化: 使用 data-sticker-id 属性检测贴纸
            const stickerEl = target.closest('[data-sticker-id]') as HTMLElement;
            if (stickerEl) {
                e.preventDefault();
                const stickerId = stickerEl.dataset.stickerId;
                if (stickerId) {
                    setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        type: 'sticker',
                        stickerId,
                    });
                }
                return;
            }

            // 在背景上右键单击
            e.preventDefault();
            setContextMenu({
                x: e.clientX,
                y: e.clientY,
                type: 'background',
            });
        };

        document.addEventListener('contextmenu', handleContextMenu);
        return () => document.removeEventListener('contextmenu', handleContextMenu);
    }, []);

    useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (e.shiftKey || e.ctrlKey || e.metaKey || target.closest(UI_SELECTORS) || target.closest('[data-sticker-id]')) {
                return;
            }

            setBatchSelectedStickerIds([]);
            if (isEditMode && selectedStickerId) {
                selectSticker(null);
                announceObjectSelection(null);
            }
        };

        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [isEditMode, selectSticker, selectedStickerId, setBatchSelectedStickerIds]);

    // 仅双击真正的页面空白区域时快速添加文字贴纸。
    // 小组件、Dock、弹窗、贴纸及所有交互控件上的双击都必须被忽略。
    useEffect(() => {
        const handleDoubleClick = (e: MouseEvent) => {
            if (e.button !== 0 || e.defaultPrevented || textInputPos) return;
            const target = e.target;
            if (!(target instanceof HTMLElement)) return;

            const blockedSelector = `${UI_SELECTORS}, [data-sticker-id], button, input, textarea, select, a, iframe, [contenteditable="true"]`;
            if (target.closest(blockedSelector)) return;

            // 某些透明容器会把事件目标透传到底层，因此再按坐标检查一次实际覆盖元素。
            const coveredByInteractiveElement = document.elementsFromPoint(e.clientX, e.clientY).some((element) => (
                element instanceof HTMLElement && !!element.closest(blockedSelector)
            ));
            if (coveredByInteractiveElement) return;

            setTextInputPos({ x: e.clientX, y: e.clientY });
        };

        document.addEventListener('dblclick', handleDoubleClick);
        return () => document.removeEventListener('dblclick', handleDoubleClick);
    }, [textInputPos]);

    // 热键：Delete 键删除贴纸
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                // contenteditable 文本贴纸同样属于输入区，不能触发画布删除快捷键。
                if (isEditableElement(document.activeElement)) return;

                if (batchSelectedStickerIds.length > 0) {
                    e.preventDefault();
                    batchSelectedStickerIds.forEach(id => deleteSticker(id));
                    setBatchSelectedStickerIds([]);
                    return;
                }

                if (selectedStickerId) {
                    e.preventDefault();
                    deleteSticker(selectedStickerId);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [batchSelectedStickerIds, selectedStickerId, deleteSticker]);

    // 处理文本输入提交
    const handleTextSubmit = useCallback((content: string, style?: { color: string; textAlign: 'left' | 'center' | 'right'; fontSize: number }, hasCheckbox?: boolean, linkCard?: LinkCardMetadata, positionOffset = { x: 0, y: 0 }, drawings?: Sticker['drawings']) => {
        if (editingSticker) {
            updateSticker(editingSticker.id, {
                content,
                x: editingSticker.x + positionOffset.x / viewportScale,
                y: editingSticker.y + positionOffset.y / viewportScale,
                style: style ? {
                    color: style.color,
                    textAlign: style.textAlign,
                    fontSize: style.fontSize,
                    fontFamily: editingSticker.style?.fontFamily ?? 'system',
                } : editingSticker.style,
                hasCheckbox: hasCheckbox !== undefined ? hasCheckbox : editingSticker.hasCheckbox,
                linkCard,
                ...(drawings !== undefined ? { drawings } : {}),
            });
        } else if (textInputPos) {
            addSticker({
                type: 'text',
                content,
                x: (textInputPos.x + positionOffset.x) / viewportScale,
                y: (textInputPos.y + positionOffset.y + currentPageScrollY) / viewportScale,
                style: style ? {
                    color: style.color,
                    textAlign: style.textAlign,
                    fontSize: style.fontSize,
                    fontFamily: 'system',
                } : undefined,
                hasCheckbox,
                isChecked: false,
                linkCard,
                drawings,
            });
        }
        setTextInputPos(null);
        setEditingSticker(null);
    }, [textInputPos, editingSticker, addSticker, updateSticker, currentPageScrollY, viewportScale]);

    const openPriorityEditor = useCallback((sticker: Sticker, x: number, y: number) => {
        setPriorityDraft(String(normalizeStickerPriority(sticker.priority ?? 0)));
        setPriorityEditor({ stickerId: sticker.id, x, y });
    }, []);

    const saveStickerPriority = useCallback(() => {
        if (!priorityEditor) return;
        const parsed = Number(priorityDraft.trim());
        const priority = Number.isFinite(parsed) ? normalizeStickerPriority(parsed) : 0;
        updateSticker(priorityEditor.stickerId, { priority });
        setPriorityEditor(null);
    }, [priorityDraft, priorityEditor, updateSticker]);

    const openFontEditor = useCallback((sticker: Sticker, x: number, y: number) => {
        if (sticker.type !== 'text') return;
        void ensureBuiltInFontLoaded(sticker.style?.fontFamily);
        setFontEditor({ stickerId: sticker.id, x, y });
    }, []);

    const changeStickerFont = useCallback((stickerId: string, fontFamily: BuiltInFontId) => {
        const sticker = stickers.find((item) => item.id === stickerId);
        if (!sticker || sticker.type !== 'text') return;
        void ensureBuiltInFontLoaded(fontFamily);
        updateSticker(stickerId, {
            style: {
                ...DEFAULT_TEXT_STYLE,
                ...sticker.style,
                fontFamily,
            },
        });
        setFontEditor(null);
    }, [stickers, updateSticker]);

    const openStickerLinkEditor = useCallback((sticker: Sticker, x: number, y: number) => {
        if (sticker.type === 'drawing') return;
        setLinkEditor({ stickerId: sticker.id, x, y });
    }, []);

    const toggleStickerPositionMode = useCallback((sticker: Sticker) => {
        const scrollOffset = getLivePageScrollY() / viewportScale;
        const isViewportFixed = sticker.positionMode === 'viewport';
        updateSticker(sticker.id, {
            positionMode: isViewportFixed ? 'page' : 'viewport',
            pageId: isViewportFixed ? `page-${pageIndex}` : sticker.pageId,
            y: isViewportFixed ? sticker.y + scrollOffset : sticker.y - scrollOffset,
        });
    }, [getLivePageScrollY, updateSticker, viewportScale]);

    useEffect(() => {
        const handleNavigationAction = (event: Event) => {
            const action = (event as CustomEvent<NavigationActionEventDetail>).detail?.action;
            if (!action) return;
            if (action.type === 'layout') {
                const nextDirection = action.direction === 'toggle'
                    ? (pageSlideDirection === 'horizontal' ? 'vertical' : 'horizontal')
                    : action.direction;
                if (nextDirection !== pageSlideDirection) setPageSlideDirection(nextDirection);
                return;
            }
            const request = resolveStickerNavigationAction(action, allStickers, {
                height: window.innerHeight,
                scale: viewportScale,
                currentPageIndex: pageIndex,
                currentScrollTop: getLivePageScrollY(),
                layoutMode: pageSlideDirection,
            });
            if (request) onNavigateInternal?.(request);
        };
        window.addEventListener(NAVIGATION_ACTION_EVENT, handleNavigationAction);
        return () => window.removeEventListener(NAVIGATION_ACTION_EVENT, handleNavigationAction);
    }, [allStickers, getLivePageScrollY, onNavigateInternal, pageIndex, pageSlideDirection, setPageSlideDirection, viewportScale]);

    const openRotationEditor = useCallback((sticker: Sticker, x: number, y: number) => {
        const rotation = normalizeStickerRotation(sticker.rotation ?? 0);
        setRotationDraft(rotation);
        setRotationInputDraft(String(rotation));
        setRotationEditor({ stickerId: sticker.id, x, y });
    }, []);

    const updateStickerRotation = useCallback((value: number) => {
        if (!rotationEditor) return;
        const rotation = normalizeStickerRotation(value);
        setRotationDraft(rotation);
        setRotationInputDraft(String(rotation));
        updateSticker(rotationEditor.stickerId, { rotation });
    }, [rotationEditor, updateSticker]);

    const openStickerSizeEditor = useCallback((sticker: Sticker) => {
        const size = getStickerLogicalSize(sticker);
        const anchorRect = getStickerVisualRect(sticker);
        if (!size || !anchorRect) return;
        setSizeEditor({ stickerId: sticker.id, anchorRect, size });
    }, []);

    const applyStickerSize = useCallback((sticker: Sticker, currentSize: ElementSize, targetSize: ElementSize) => {
        const nextScale = resizeStickerToWidth(sticker, currentSize, targetSize.width);
        updateSticker(sticker.id, { scale: nextScale });
    }, [updateSticker]);

    const pasteStickerSize = useCallback((sticker: Sticker) => {
        const copiedSize = readElementSizeClipboard();
        const currentSize = getStickerLogicalSize(sticker);
        if (!copiedSize || !currentSize) return;
        const fittedSize = fitSizeToAspectRatio(copiedSize, currentSize.width / Math.max(1, currentSize.height));
        applyStickerSize(sticker, currentSize, fittedSize);
    }, [applyStickerSize]);

    const openStrokeEditor = useCallback((sticker: Sticker, x: number, y: number, currentWidth: number) => {
        const width = normalizeStickerStrokeWidth(currentWidth);
        setStrokeDraft(width);
        setStrokeInputDraft(String(width));
        setStrokeEditor({ stickerId: sticker.id, x, y });
    }, []);

    const updateStickerStrokeWidth = useCallback((value: number) => {
        if (!strokeEditor) return;
        const strokeWidth = normalizeStickerStrokeWidth(value);
        setStrokeDraft(strokeWidth);
        setStrokeInputDraft(String(strokeWidth));
        updateSticker(strokeEditor.stickerId, { strokeWidth, hideStroke: false });
    }, [strokeEditor, updateSticker]);

    const openCornerRadiusEditor = useCallback((sticker: Sticker, x: number, y: number, currentRadius: number) => {
        if (sticker.type !== 'image') return;
        const cornerRadius = normalizeStickerCornerRadius(currentRadius);
        setCornerRadiusDraft(cornerRadius);
        setCornerRadiusInputDraft(String(cornerRadius));
        setCornerRadiusEditor({ stickerId: sticker.id, x, y });
    }, []);

    const updateStickerCornerRadius = useCallback((value: number) => {
        if (!cornerRadiusEditor) return;
        const cornerRadius = normalizeStickerCornerRadius(value);
        setCornerRadiusDraft(cornerRadius);
        setCornerRadiusInputDraft(String(cornerRadius));
        updateSticker(cornerRadiusEditor.stickerId, { cornerRadius });
    }, [cornerRadiusEditor, updateSticker]);

    const handleTextCancel = useCallback(() => {
        setTextInputPos(null);
        setEditingSticker(null);
    }, []);

    const handleEditSticker = useCallback((sticker: Sticker) => {
        // 如果当前有编辑中的 TextInput，先保存它的内容
        if (textInputRef.current) {
            textInputRef.current.saveNow();
        }
        // 切换到新贴纸的编辑状态
        setEditingSticker(sticker);
        const stickerScrollY = sticker.positionMode === 'viewport' ? 0 : getLivePageScrollY();
        setTextInputPos({ x: sticker.x * viewportScale, y: sticker.y * viewportScale - stickerScrollY });
    }, [getLivePageScrollY, viewportScale]);

    const renderStickerItem = (sticker: Sticker, stickerInfiniteY: boolean) => (
        <StickerItem
            key={sticker.id}
            sticker={sticker}
            isSelected={selectedStickerId === sticker.id}
            isBatchSelected={batchSelectedStickerIds.includes(sticker.id)}
            isCreativeMode={isEditMode}
            onSelect={() => {
                const alreadySelected = selectedStickerIds.includes(sticker.id);
                selectSticker(sticker.id);
                announceObjectSelection('sticker', sticker.id, { additive: alreadySelected });
            }}
            onToggleBatchSelect={() => {
                if (batchSelectedStickerIds.length === 0 && selectedStickerId === sticker.id) {
                    selectSticker(null);
                    return;
                }
                toggleBatchSelect(sticker, selectedStickerId);
                announceObjectSelection('sticker', sticker.id, { additive: true });
            }}
            onDelete={() => deleteSticker(sticker.id)}
            onPositionChange={(x, y) => updateSticker(sticker.id, { x, y })}
            onBatchPositionPreview={(activeStickerId, dx, dy) => {
                previewBatchPosition(activeStickerId, dx, dy);
                announceObjectGroupDrag({ activeKind: 'sticker', activeId: activeStickerId, phase: 'preview', dx, dy });
            }}
            onBatchPositionCommit={(activeStickerId, dx, dy) => {
                commitBatchPosition(activeStickerId, dx, dy);
                announceObjectGroupDrag({ activeKind: 'sticker', activeId: activeStickerId, phase: 'commit', dx, dy });
            }}
            onBatchPositionCancel={(activeStickerId) => {
                announceObjectGroupDrag({ activeKind: 'sticker', activeId: activeStickerId, phase: 'cancel', dx: 0, dy: 0 });
            }}
            onBatchDelete={deleteBatchSelection}
            onBringToTop={() => bringToTop(sticker.id)}
            onScaleChange={(scale) => updateSticker(sticker.id, { scale })}
            onToggleCheckbox={() => updateSticker(sticker.id, { isChecked: !sticker.isChecked })}
            isEditMode={isEditMode}
            viewportScale={viewportScale}
            viewportWidth={stableViewportWidth}
            infiniteY={stickerInfiniteY}
            onDoubleClick={() => {
                if (sticker.type === 'text') handleEditSticker(sticker);
            }}
            onDragStart={handleStickerDragStart}
            onDragEnd={handleStickerDragEnd}
        />
    );

    return (
        <div
            className={`${styles.canvas} ${pageTransitionDirection === 'up' ? (pageSlideDirection === 'horizontal' ? styles.pageSlideLeft : styles.pageSlideUp) : ''} ${pageTransitionDirection === 'down' ? (pageSlideDirection === 'horizontal' ? styles.pageSlideRight : styles.pageSlideDown) : ''} ${isEditMode ? styles.creativeMode : ''} ${isAnyDragging ? styles.dragging : ''}`}
            style={{
                '--shelf-logical-viewport-width': `${stableViewportWidth / viewportScale}px`,
                '--shelf-logical-viewport-height': `${viewportHeight / viewportScale}px`,
            } as React.CSSProperties}
        >
            <div
                className={styles.logicalStickerLayer}
                style={{
                    width: SHELF_REFERENCE_WIDTH,
                    '--shelf-logical-scale': Math.abs(viewportScale - 1) < 0.001 ? 1 : viewportScale,
                } as React.CSSProperties}
            >
                <div
                    ref={pageStickerLayerRef}
                    className={styles.pageStickerLayer}
                >
                    {renderableStickers
                        .filter((sticker) => sticker.positionMode !== 'viewport' && (!editingSticker || sticker.id !== editingSticker.id))
                        .map((sticker) => renderStickerItem(sticker, pageSlideDirection === 'vertical' && pageIndex === 1))}
                </div>
                <div className={styles.viewportStickerLayer}>
                    {renderableStickers
                        .filter((sticker) => sticker.positionMode === 'viewport' && (!editingSticker || sticker.id !== editingSticker.id))
                        .map((sticker) => renderStickerItem(sticker, false))}
                </div>
            </div>

            {textInputPos && (
                <TextInput
                    ref={textInputRef}
                    key={editingSticker?.id || 'new'}
                    x={textInputPos.x}
                    y={textInputPos.y}
                    initialText={editingSticker?.content || ''}
                    initialStyle={editingSticker?.style}
                    initialHasCheckbox={editingSticker?.hasCheckbox}
                    initialIsChecked={editingSticker?.isChecked}
                    initialLinkCard={editingSticker?.linkCard}
                    initialDrawings={editingSticker?.drawings}
                    initialPresentation={editingSticker ? {
                        rotation: normalizeStickerRotation(editingSticker.rotation ?? 0),
                        scale: editingSticker.scale ?? 1,
                        hideStroke: editingSticker.hideStroke ?? false,
                        strokeWidth: normalizeStickerStrokeWidth(editingSticker.strokeWidth ?? 6),
                    } : undefined}
                    onSubmit={handleTextSubmit}
                    onCancel={handleTextCancel}
                    viewportScale={viewportScale}
                />
            )}

            {isDrawingInputOpen && (
                <DrawingInput
                    canUndo={drawingSessionIds.length > 0}
                    onCreateDrawing={(drawing, position, size) => {
                        const logicalFactor = 1 / viewportScale;
                        const newId = addSticker({
                            type: 'drawing',
                            content: '',
                            x: position.x * logicalFactor,
                            y: (position.y + currentPageScrollY) * logicalFactor,
                            drawing: scaleStickerDrawing(drawing, logicalFactor),
                            drawingSize: {
                                width: size.width * logicalFactor,
                                height: size.height * logicalFactor,
                            },
                        });
                        setDrawingSessionIds(prev => [...prev, newId]);
                    }}
                    onUndo={() => {
                        setDrawingSessionIds(prev => {
                            const lastId = prev[prev.length - 1];
                            if (lastId) deleteSticker(lastId);
                            return prev.slice(0, -1);
                        });
                    }}
                    onCancel={() => {
                        setIsDrawingInputOpen(false);
                        setDrawingSessionIds([]);
                    }}
                />
            )}

            <RecycleBin
                isVisible={isAnyDragging}
                allowProximityReveal={isEditMode}
                onClick={() => setIsRecycleBinOpen(true)}
            />

            <RecycleBinModal
                isOpen={isRecycleBinOpen}
                onClose={() => setIsRecycleBinOpen(false)}
            />

            {contextMenu && (
                <StickerContextMenuLayer
                    contextMenu={contextMenu}
                    stickers={stickers}
                    isEditMode={isEditMode}
                    onClose={() => setContextMenu(null)}
                    onAddSticker={(x, y) => setTextInputPos({ x, y })}
                    onStartDrawing={() => {
                        setTextInputPos(null);
                        setEditingSticker(null);
                        setIsDrawingInputOpen(true);
                    }}
                    onUploadImage={() => fileInputRef.current?.click()}
                    onOpenSvgLibrary={vectorIconPicker.openAt}
                    onChooseIconSwap={(sticker) => vectorIconPicker.openSwapFor(sticker.id)}
                    onToggleEditMode={() => setIsEditMode(!isEditMode)}
                    onEditSticker={handleEditSticker}
                    onDeleteSticker={deleteSticker}
                    onOpenSettings={onOpenSettings}
                    onOpenAddWidget={onOpenAddWidget}
                    onClearAllStickers={clearAllStickers}
                    onChangeFont={openFontEditor}
                    onRotateSticker={openRotationEditor}
                    onSetStickerLink={openStickerLinkEditor}
                    onToggleScreenFixed={toggleStickerPositionMode}
                    onSetPriority={openPriorityEditor}
                    onEditSize={openStickerSizeEditor}
                    onPasteSize={pasteStickerSize}
                    onEditStroke={openStrokeEditor}
                    onEditCornerRadius={openCornerRadiusEditor}
                    onUpdateSticker={updateSticker}
                />
            )}

            <VectorIconPickerModal
                isOpen={vectorIconPicker.isOpen}
                purpose="sticker"
                onClose={vectorIconPicker.close}
                onChoose={vectorIconPicker.choose}
            />

            {linkEditor && (() => {
                const sticker = allStickers.find(item => item.id === linkEditor.stickerId);
                if (!sticker || sticker.type === 'drawing') return null;
                return (
                    <StickerLinkEditor
                        sticker={sticker}
                        stickers={allStickers}
                        onClose={() => setLinkEditor(null)}
                        onSave={(updates) => {
                            updateSticker(sticker.id, updates);
                            setLinkEditor(null);
                        }}
                    />
                );
            })()}

            {sizeEditor && (() => {
                const sticker = allStickers.find((item) => item.id === sizeEditor.stickerId);
                if (!sticker) return null;
                return (
                    <SizeEditorPopover
                        key={sizeEditor.stickerId}
                        title="贴纸尺寸"
                        anchorRect={sizeEditor.anchorRect}
                        width={sizeEditor.size.width}
                        height={sizeEditor.size.height}
                        lockAspectRatio
                        lockAspectRatioDisabled
                        onClose={() => setSizeEditor(null)}
                        onApply={(targetSize) => {
                            const currentSize = getStickerLogicalSize(sticker) ?? sizeEditor.size;
                            applyStickerSize(sticker, currentSize, targetSize);
                        }}
                    />
                );
            })()}

            <StickerOptionEditors
                stickers={stickers}
                fontEditor={fontEditor}
                setFontEditor={setFontEditor}
                changeStickerFont={changeStickerFont}
                rotationEditor={rotationEditor}
                setRotationEditor={setRotationEditor}
                rotationDraft={rotationDraft}
                rotationInputDraft={rotationInputDraft}
                setRotationInputDraft={setRotationInputDraft}
                updateStickerRotation={updateStickerRotation}
                priorityEditor={priorityEditor}
                setPriorityEditor={setPriorityEditor}
                priorityDraft={priorityDraft}
                setPriorityDraft={setPriorityDraft}
                saveStickerPriority={saveStickerPriority}
                strokeEditor={strokeEditor}
                setStrokeEditor={setStrokeEditor}
                strokeDraft={strokeDraft}
                strokeInputDraft={strokeInputDraft}
                setStrokeInputDraft={setStrokeInputDraft}
                updateStickerStrokeWidth={updateStickerStrokeWidth}
                cornerRadiusEditor={cornerRadiusEditor}
                setCornerRadiusEditor={setCornerRadiusEditor}
                cornerRadiusDraft={cornerRadiusDraft}
                cornerRadiusInputDraft={cornerRadiusInputDraft}
                setCornerRadiusInputDraft={setCornerRadiusInputDraft}
                updateStickerCornerRadius={updateStickerCornerRadius}
            />

            {/* 用于图片上传的隐藏文件输入框 */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.svg"
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />
        </div>
    );
};
