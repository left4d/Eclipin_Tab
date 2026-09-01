import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Sticker } from '@/shared/types';
import { useThemeData } from '@/features/theme/context/ThemeContext';
import styles from './ZenShelf.module.css';
import { executeNavigationAction } from '@/shared/navigation';
import {
    normalizeStickerRotation,
    resolveStickerZIndex,
    STICKER_DRAGGING_Z_INDEX,
} from '@/features/shelf/utils/stickerPresentation';
import { isPointInsideRect, resolveStickerReleasePosition } from '@/features/shelf/utils/stickerPositioning';
import { useStickerImageSource } from '@/features/shelf/hooks/useStickerImageSource';
import { StickerContent } from './StickerContent';
import { useStickerResize } from '@/features/shelf/hooks/useStickerResize';
import { getStickerAction, getStickerLinkTarget } from '@/features/shelf/utils/stickerNavigation';
import { VECTOR_ICON_CANONICAL_SIZE } from '@/features/vector-icons/utils/vectorIconSizing';
import { clampStickerScale } from '@/features/shelf/utils/stickerSizing';
import { getStickerCornerRadius, getStickerInteractionEffect, getStickerStrokeWidth } from '@/features/shelf/utils/stickerAppearance';

// StickerItem Component - 单个贴纸渲染

interface StickerItemProps {
    sticker: Sticker;
    isSelected: boolean;
    isBatchSelected?: boolean;
    isCreativeMode: boolean;
    onSelect: () => void;
    onToggleBatchSelect?: () => void;
    onDelete: () => void;
    onPositionChange: (x: number, y: number) => void;
    onBatchPositionPreview?: (activeStickerId: string, dx: number, dy: number) => void;
    onBatchPositionCommit?: (activeStickerId: string, dx: number, dy: number) => void;
    onBatchPositionCancel?: (activeStickerId: string) => void;
    onBatchDelete?: (activeStickerId: string) => void;
    onBringToTop: () => void;
    onScaleChange: (scale: number) => void;
    isEditMode?: boolean;
    viewportScale: number;
    viewportWidth: number;
    infiniteY?: boolean;
    onDoubleClick?: () => void;
    onDragStart?: () => void;
    onDragEnd?: () => void;
    onToggleCheckbox?: () => void;
}

const StickerItemComponent: React.FC<StickerItemProps> = ({
    sticker,
    isSelected,
    isBatchSelected = false,
    isCreativeMode,
    onSelect,
    onToggleBatchSelect,
    onDelete,
    onPositionChange,
    onBatchPositionPreview,
    onBatchPositionCommit,
    onBatchPositionCancel,
    onBatchDelete,
    onBringToTop,
    onScaleChange,
    isEditMode,
    viewportScale,
    viewportWidth,
    infiniteY = false,
    onDoubleClick,
    onDragStart,
    onDragEnd,
    onToggleCheckbox,
}) => {
    const { openInNewTab } = useThemeData();
    const elementRef = useRef<HTMLDivElement>(null);
    const visualRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isBouncing, setIsBouncing] = useState(false);
    const [isDropDeleting, setIsDropDeleting] = useState(false);
    const dragStartRef = useRef<{ x: number; y: number; stickerX: number; stickerY: number } | null>(null);
    const dragMovedRef = useRef(false);
    const [imageNaturalWidth, setImageNaturalWidth] = useState<number>(
        sticker.imagePresentation === 'vectorIcon' ? VECTOR_ICON_CANONICAL_SIZE : 300
    );
    const { resolvedImageUrl, isSvgImage, svgText } = useStickerImageSource(sticker);
    const { svgText: alternateSvgText } = useStickerImageSource(sticker, sticker.iconSwapContent ?? '');
    const [showAlternateIcon, setShowAlternateIcon] = useState(false);
    useEffect(() => {
        if (sticker.interactionEffect !== 'iconSwap' || !sticker.iconSwapContent) {
            setShowAlternateIcon(false);
        }
    }, [sticker.iconSwapContent, sticker.interactionEffect]);

    const { handleResizeStart } = useStickerResize({
        disabled: Boolean(sticker.isPinned),
        scale: sticker.scale || 1,
        onScaleChange,
    });
    const isViewportFixed = sticker.positionMode === 'viewport';
    const readEffectiveScrollY = useCallback(() => {
        if (!infiniteY || isViewportFixed) return 0;
        return document.querySelector<HTMLElement>('[data-widget-scroll-page="1"]')?.scrollTop ?? 0;
    }, [infiniteY, isViewportFixed]);
    const baseRotation = normalizeStickerRotation(sticker.rotation);
    // 物理效果 Refs
    const physicsRef = useRef({
        rotation: 0,
        targetRotation: 0,
        lastX: 0,
    });
    const isDraggingRef = useRef(false);
    const rafRef = useRef<number>();
    const cleaningTimerRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        if (!visualRef.current) return;
        visualRef.current.style.setProperty('--sticker-base-rotation', `${baseRotation}deg`);
        if (!isDraggingRef.current) {
            visualRef.current.style.transform = `rotate(${baseRotation}deg)`;
        }
    }, [baseRotation]);

    // 物理动画循环
    const updatePhysics = useCallback(() => {
        const { rotation, targetRotation } = physicsRef.current;

        // 平滑插值旋转（弹簧效果）
        const diff = targetRotation - rotation;
        const nextRotation = rotation + diff * 0.15;

        physicsRef.current.rotation = nextRotation;

        if (visualRef.current) {
            visualRef.current.style.transform = `rotate(${(baseRotation + nextRotation).toFixed(2)}deg)`;
        }

        // 如果正在拖拽或旋转尚未稳定，则继续循环
        if (isDraggingRef.current || Math.abs(diff) > 0.05 || Math.abs(nextRotation) > 0.05) {
            rafRef.current = requestAnimationFrame(updatePhysics);
        } else {
            // 稳定后恢复持久化的基础角度
            if (visualRef.current) {
                visualRef.current.style.transform = `rotate(${baseRotation}deg)`;
            }
            physicsRef.current.rotation = 0;
            physicsRef.current.targetRotation = 0;
        }
    }, [baseRotation]);

    const handleMouseDown = (e: React.MouseEvent) => {
        dragMovedRef.current = false;
        // Prevent if clicking delete button or resize handle
        if ((e.target as HTMLElement).closest(`.${styles.deleteButton}`)) {
            return;
        }
        if ((e.target as HTMLElement).closest(`.${styles.resizeHandle}`)) {
            return;
        }
        if ((e.target as HTMLElement).closest(`.${styles.textStickerCheckbox}`)) {
            return;
        }

        if (isEditMode && (e.ctrlKey || e.metaKey || e.shiftKey)) {
            onToggleBatchSelect?.();
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        // 编辑模式点击即选中对象，后续属性修改统一交给对象检查器。
        if (isEditMode) {
            onSelect();
        }

        // 点击/按下时置顶
        onBringToTop();

        // 如果贴纸已固定，且不是在删除或调整尺寸按钮上（上面已过滤），则不允许拖拽
        if (sticker.isPinned) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        // 开始拖拽
        setIsDragging(true);
        isDraggingRef.current = true;
        onDragStart?.();

        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            stickerX: sticker.x,
            stickerY: sticker.y,
        };

        // 重置物理效果
        physicsRef.current.lastX = e.clientX;
        physicsRef.current.targetRotation = 0;

        // 开始动画循环
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(updatePhysics);

        e.preventDefault();
        e.stopPropagation();
    };

    // 具有 RAF 节流的拖拽效果
    useEffect(() => {
        if (!isDragging) return;

        let positionRafId: number | null = null;
        let pendingPosition: { x: number; y: number } | null = null;

        const handleMouseMove = (e: MouseEvent) => {
            if (!dragStartRef.current) return;

            const dx = e.clientX - dragStartRef.current.x;
            const dy = e.clientY - dragStartRef.current.y;
            if (Math.hypot(dx, dy) > 4) {
                dragMovedRef.current = true;
            }

            // RAF 节流 - 保存待处理的位置更新
            // 将屏幕像素位移转换为原始坐标系
            pendingPosition = {
                x: dragStartRef.current.stickerX + dx / viewportScale,
                y: dragStartRef.current.stickerY + dy / viewportScale,
            };
            onBatchPositionPreview?.(sticker.id, dx / viewportScale, dy / viewportScale);

            if (positionRafId === null) {
                positionRafId = requestAnimationFrame(() => {
                    positionRafId = null;
                    if (pendingPosition && elementRef.current) {
                        elementRef.current.style.left = `${pendingPosition.x}px`;
                        elementRef.current.style.top = `${pendingPosition.y}px`;
                    }
                });
            }

            // 物理计算（立即执行，不影响物理动画流畅度）
            const moveDx = e.clientX - physicsRef.current.lastX;
            physicsRef.current.lastX = e.clientX;

            // 根据移动速度计算目标旋转角度
            const SENSITIVITY = 0.4;
            const MAX_ROTATION = 12;
            let target = -moveDx * SENSITIVITY;
            target = Math.max(-MAX_ROTATION, Math.min(MAX_ROTATION, target));
            physicsRef.current.targetRotation = target;
            // Check mouse position against Recycle Bin for visual feedback
            const recycleBin = document.getElementById('sticker-recycle-bin');
            if (recycleBin && pendingPosition) {
                const binRect = recycleBin.getBoundingClientRect();

                const isOverBin = isPointInsideRect(e.clientX, e.clientY, binRect);

                if (isOverBin) {
                    recycleBin.classList.add(styles.dragOver);
                    if (elementRef.current) {
                        elementRef.current.classList.add(styles.deleting);
                        elementRef.current.classList.remove(styles.returningFromDelete);
                        if (cleaningTimerRef.current) clearTimeout(cleaningTimerRef.current);
                    }
                } else {
                    // 如果之前是 deleting 状态，则添加返回动画 class
                    if (elementRef.current && elementRef.current.classList.contains(styles.deleting)) {
                        elementRef.current.classList.remove(styles.deleting);
                        elementRef.current.classList.add(styles.returningFromDelete);

                        if (cleaningTimerRef.current) clearTimeout(cleaningTimerRef.current);
                        cleaningTimerRef.current = setTimeout(() => {
                            if (elementRef.current) {
                                elementRef.current.classList.remove(styles.returningFromDelete);
                            }
                        }, 300);
                    }

                    recycleBin.classList.remove(styles.dragOver);
                }
            }

        };

        const handleMouseUp = (e: MouseEvent) => {
            // 确保最终位置被更新
            if (positionRafId !== null) {
                cancelAnimationFrame(positionRafId);
            }

            // 获取贴纸元素边界以便进行重叠检测
            const stickerEl = elementRef.current;
            if (!stickerEl) {
                setIsDragging(false);
                isDraggingRef.current = false;
                dragStartRef.current = null;
                onDragEnd?.();
                return;
            }

            // 检查鼠标位置是否在垃圾桶内
            const recycleBin = document.getElementById('sticker-recycle-bin');
            if (recycleBin) {
                const binRect = recycleBin.getBoundingClientRect();
                const isOverBin = isPointInsideRect(e.clientX, e.clientY, binRect);

                if (isOverBin) {
                    // Stop physics animation immediately to freeze rotation
                    if (rafRef.current) cancelAnimationFrame(rafRef.current);

                    // Trigger fade-out animation
                    setIsDropDeleting(true);
                    setIsDragging(false);
                    isDraggingRef.current = false;
                    dragStartRef.current = null;
                    onBatchPositionCancel?.(sticker.id);
                    onDragEnd?.();

                    // Actual delete after animation
                    setTimeout(() => {
                        if (isBatchSelected) {
                            onBatchDelete?.(sticker.id);
                        } else {
                            onDelete();
                        }
                    }, 300);
                    return;
                }
            }

            const stickerRect = visualRef.current?.getBoundingClientRect() ?? stickerEl.getBoundingClientRect();
            const effectiveScrollY = readEffectiveScrollY();
            const bottomZone = document.querySelector('[data-ui-zone="bottom"]');
            const resolvedPosition = resolveStickerReleasePosition({
                stickerType: sticker.type,
                isPinned: Boolean(sticker.isPinned),
                infiniteY: infiniteY && !isViewportFixed,
                proposedPosition: {
                    x: pendingPosition?.x ?? sticker.x,
                    y: pendingPosition?.y ?? sticker.y,
                },
                stickerRect,
                viewportScale,
                viewportWidth,
                viewportHeight: window.innerHeight,
                effectiveScrollY,
                bottomZoneRect: bottomZone?.getBoundingClientRect(),
            });
            const finalX = resolvedPosition.x;
            const finalY = resolvedPosition.y;
            const needsAdjustment = resolvedPosition.adjusted;

            // 如果需要调整（文字/图片的底部避让或屏幕边缘限制），则应用弹回动画
            if (needsAdjustment) {
                // 手动触发动画开始，以处理 React 属性未更改的情况
                // （例如，拖走后又弹回同一位置）
                if (elementRef.current) {
                    elementRef.current.classList.add(styles.bounceBack);
                    elementRef.current.style.left = `${finalX}px`;
                    elementRef.current.style.top = `${finalY}px`;
                }

                setIsBouncing(true);
                // 动画完成后移除 bounce 类
                setTimeout(() => setIsBouncing(false), 350);
            }

            if (needsAdjustment || pendingPosition) {
                onPositionChange(finalX, finalY);
                const dragStart = dragStartRef.current;
                if (pendingPosition && dragStart) {
                    onBatchPositionCommit?.(
                        sticker.id,
                        finalX - dragStart.stickerX,
                        finalY - dragStart.stickerY
                    );
                }
            }

            setIsDragging(false);
            isDraggingRef.current = false;
            dragStartRef.current = null;
            onDragEnd?.();

            // Clear dragOver state
            const cleanupRecycleBin = document.getElementById('sticker-recycle-bin');
            if (cleanupRecycleBin) {
                cleanupRecycleBin.classList.remove(styles.dragOver);
            }
            if (elementRef.current) {
                elementRef.current.classList.remove(styles.deleting);
                elementRef.current.classList.remove(styles.returningFromDelete);
                if (cleaningTimerRef.current) clearTimeout(cleaningTimerRef.current);
            }

            // 将目标旋转重置为 0 以便动画返回
            physicsRef.current.targetRotation = 0;
        };

        // 使用捕获阶段确保拖拽事件通过所有 UI 层正常工作
        document.addEventListener('mousemove', handleMouseMove, { capture: true });
        // 使用捕获阶段进行 mouseup，以确保即使鼠标在可能停止传播的 Searcher/Dock 上方松开时，我们也能收到事件
        document.addEventListener('mouseup', handleMouseUp, { capture: true });

        return () => {
            document.removeEventListener('mousemove', handleMouseMove, { capture: true });
            document.removeEventListener('mouseup', handleMouseUp, { capture: true });
            if (positionRafId !== null) {
                cancelAnimationFrame(positionRafId);
            }
        };
    }, [infiniteY, isBatchSelected, isDragging, isViewportFixed, onBatchDelete, onBatchPositionCommit, onBatchPositionPreview, onDelete, onDragEnd, onPositionChange, readEffectiveScrollY, sticker.id, sticker.isPinned, sticker.type, sticker.x, sticker.y, updatePhysics, viewportScale, viewportWidth]);

    // 卸载时清理 RAF
    useEffect(() => {
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            if (cleaningTimerRef.current) clearTimeout(cleaningTimerRef.current);
        };
    }, []);

    // 获取图片原始宽度以进行缩放计算
    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const naturalWidth = e.currentTarget.naturalWidth || e.currentTarget.width;
        // 某些 SVG（尤其 blob URL / 百分比尺寸）在 Chromium 中会短暂返回 0。
        // 不能把 0 写进状态，否则 StickerContent 会把最终宽度直接算成 0。
        if (Number.isFinite(naturalWidth) && naturalWidth > 0) {
            setImageNaturalWidth(naturalWidth);
        }
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (getStickerLinkTarget(sticker)) return;
        if (sticker.linkCard) {
            executeNavigationAction({ type: 'url', url: sticker.linkCard.url }, { openInNewTab });
            return;
        }
        onDoubleClick?.();
    };

    const handleStickerLinkClick = (e: React.MouseEvent) => {
        if (dragMovedRef.current) return;
        const canSwapIcon = sticker.interactionEffect === 'iconSwap'
            && sticker.imagePresentation === 'vectorIcon'
            && Boolean(sticker.iconSwapContent)
            && Boolean(alternateSvgText);
        const action = getStickerAction(sticker);
        if (!canSwapIcon && !action) return;
        e.preventDefault();
        e.stopPropagation();
        if (canSwapIcon) setShowAlternateIcon((current) => !current);
        if (action) executeNavigationAction(action, { openInNewTab });
    };

    const classNames = [
        styles.sticker,
        sticker.type === 'text' && styles.stickerText,
        isDragging && styles.dragging,
        isBouncing && styles.bounceBack,
        isDropDeleting && styles.dropDelete,
        isBatchSelected && styles.batchSelected,
        isCreativeMode && styles.creativeHover,
        isViewportFixed && styles.screenFixed,
    ].filter(Boolean).join(' ');

    const { priority, zIndex: resolvedZIndex } = resolveStickerZIndex(sticker);
    const stickerScale = clampStickerScale(sticker.scale ?? 1);
    const inverseStickerScale = 1 / stickerScale;
    const strokeWidth = getStickerStrokeWidth(sticker, isSvgImage);
    const cornerRadius = sticker.type === 'image' ? getStickerCornerRadius(sticker) : 0;
    const interactionEffect = getStickerInteractionEffect(sticker);
    const interactionClassName = interactionEffect === 'lift'
        ? 'sticker--lift'
        : interactionEffect === 'scale'
            ? styles.stickerInteractionScale
            : interactionEffect === 'button'
                ? styles.stickerInteractionButton
                : '';

    return (
        <>
            <div
                ref={elementRef}
                className={classNames}
                data-selected={isSelected ? 'true' : undefined}
                style={{
                    left: sticker.x,
                    top: sticker.y,
                    // 拖拽时临时置顶；松开后恢复由 priority + 局部顺序决定的层级。
                    zIndex: isDragging ? STICKER_DRAGGING_Z_INDEX : resolvedZIndex,
                    transform: `scale(${stickerScale})`,
                    transformOrigin: 'top left',
                    '--sticker-inverse-scale': inverseStickerScale,
                    '--sticker-stroke-render-width': `${strokeWidth * inverseStickerScale}px`,
                    '--sticker-corner-radius-render': `${cornerRadius * inverseStickerScale}px`,
                    '--sticker-hover-lift': `${-4 * inverseStickerScale}px`,
                    '--sticker-button-lift': `${-2 * inverseStickerScale}px`,
                    '--sticker-shadow-y-light': `${6 * inverseStickerScale}px`,
                    '--sticker-shadow-y': `${8 * inverseStickerScale}px`,
                    '--sticker-shadow-y-pressed': `${2 * inverseStickerScale}px`,
                    '--sticker-shadow-blur-light': `${12 * inverseStickerScale}px`,
                    '--sticker-shadow-blur': `${16 * inverseStickerScale}px`,
                    '--sticker-shadow-blur-pressed': `${6 * inverseStickerScale}px`,
                } as React.CSSProperties}
                data-sticker-id={sticker.id}
                data-sticker-svg={isSvgImage ? 'true' : undefined}
                onMouseDown={handleMouseDown}
                onDoubleClick={handleDoubleClick}
            >
                <div className={`${styles.stickerInteraction} sticker ${interactionClassName}`.trim()}>
                    <div
                        ref={visualRef}
                        className={styles.stickerVisual}
                        data-sticker-visual="true"
                        style={{ transform: `rotate(${baseRotation}deg)` }}
                    >
                        <StickerContent
                        sticker={sticker}
                        isDragging={isDragging}
                        isCreativeMode={isCreativeMode}
                        imageNaturalWidth={imageNaturalWidth}
                        resolvedImageUrl={resolvedImageUrl}
                        isSvgImage={isSvgImage}
                        svgText={svgText}
                        alternateSvgText={sticker.interactionEffect === 'iconSwap' ? alternateSvgText : null}
                        showAlternateIcon={showAlternateIcon}
                        onToggleCheckbox={onToggleCheckbox}
                        onImageClick={handleStickerLinkClick}
                        onTextClick={handleStickerLinkClick}
                        onImageLoad={handleImageLoad}
                        onResizeStart={handleResizeStart}
                    />

                    {isEditMode && (
                        <div className={styles.stickerPriorityBadge} title={`层叠优先级：${priority}`}>
                            P{priority}
                        </div>
                    )}

                    {isEditMode && sticker.anchorId && (
                        <div className={styles.stickerAnchorBadge} title={`内部标签：#${sticker.anchorId}`}>
                            #{sticker.anchorId}
                        </div>
                    )}

                    {/* 删除按钮 - 在创意模式下悬停时可见 */}
                        {isCreativeMode && !isEditMode && (
                            <button
                                className={styles.deleteButton}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete();
                                }}
                            >
                                ×
                            </button>
                        )}
                    </div>
                </div>
            </div>

        </>
    );
};

// ============================================================================
// 具有自定义比较的 React.memo
// ============================================================================

const arePropsEqual = (prev: StickerItemProps, next: StickerItemProps) => {
    return (
        prev.sticker.id === next.sticker.id &&
        prev.sticker.x === next.sticker.x &&
        prev.sticker.y === next.sticker.y &&
        prev.sticker.content === next.sticker.content &&
        prev.sticker.zIndex === next.sticker.zIndex &&
        prev.sticker.priority === next.sticker.priority &&
        prev.sticker.scale === next.sticker.scale &&
        prev.sticker.imagePresentation === next.sticker.imagePresentation &&
        prev.sticker.iconSwapContent === next.sticker.iconSwapContent &&
        prev.sticker.rotation === next.sticker.rotation &&
        prev.sticker.type === next.sticker.type &&
        prev.sticker.isPinned === next.sticker.isPinned &&
        prev.sticker.positionMode === next.sticker.positionMode &&
        prev.sticker.hasCheckbox === next.sticker.hasCheckbox &&
        prev.sticker.isChecked === next.sticker.isChecked &&
        prev.sticker.hideStroke === next.sticker.hideStroke &&
        prev.sticker.strokeWidth === next.sticker.strokeWidth &&
        prev.sticker.cornerRadius === next.sticker.cornerRadius &&
        prev.sticker.interactionEffect === next.sticker.interactionEffect &&
        prev.sticker.linkCard?.url === next.sticker.linkCard?.url &&
        prev.sticker.linkCard?.title === next.sticker.linkCard?.title &&
        prev.sticker.linkCard?.subtitle === next.sticker.linkCard?.subtitle &&
        prev.sticker.linkCard?.imageUrl === next.sticker.linkCard?.imageUrl &&
        prev.sticker.imageLinkUrl === next.sticker.imageLinkUrl &&
        prev.sticker.action === next.sticker.action &&
        prev.sticker.linkTarget === next.sticker.linkTarget &&
        prev.sticker.anchorId === next.sticker.anchorId &&
        prev.sticker.style?.color === next.sticker.style?.color &&
        prev.sticker.style?.textAlign === next.sticker.style?.textAlign &&
        prev.sticker.style?.fontSize === next.sticker.style?.fontSize &&
        prev.sticker.style?.fontFamily === next.sticker.style?.fontFamily &&
        prev.isSelected === next.isSelected &&
        prev.isBatchSelected === next.isBatchSelected &&
        prev.isCreativeMode === next.isCreativeMode &&
        prev.isEditMode === next.isEditMode &&
        prev.viewportScale === next.viewportScale &&
        prev.viewportWidth === next.viewportWidth &&
        prev.infiniteY === next.infiniteY
    );
};

export const StickerItem = React.memo(StickerItemComponent, arePropsEqual);
