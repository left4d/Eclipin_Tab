import React, { useRef, useCallback, useEffect } from 'react';
import type { StickerInteractionEffect } from '@/shared/types';
import { createPortal } from 'react-dom';
import { scaleFadeIn, scaleFadeOut } from '@/shared/utils/animations';
import { useLanguage } from '@/shared/context/LanguageContext';
import styles from './ZenShelf.module.css';
import plusIcon from '@/assets/icons/plus.svg';
import writeIcon from '@/assets/icons/write.svg';
import trashIcon from '@/assets/icons/trash.svg';
import uploadIcon from '@/assets/icons/upload.svg';
import editIcon from '@/assets/icons/edit.svg';
import copyIcon from '@/assets/icons/copy.svg';
import settingsIcon from '@/assets/icons/setting2.svg';
import pinIcon from '@/assets/icons/pin.svg';
import priorityIcon from '@/assets/icons/star3.svg';
import fontIcon from '@/assets/icons/font.svg';
import rotateIcon from '@/assets/icons/rotate.svg';
import linkIcon from '@/assets/icons/link.svg';
import vectorIcon from '@/assets/icons/asterisk.svg';
import monitorIcon from '@/assets/icons/monitor.svg';
import slashIcon from '@/assets/icons/slash.svg';

// ============================================================================
// ContextMenu Component - Right-click context menu
// ============================================================================

interface ContextMenuProps {
    x: number;
    y: number;
    type: 'background' | 'sticker';
    stickerId?: string;
    isImageSticker?: boolean;
    isTextSticker?: boolean;
    onClose: () => void;
    onAddSticker: () => void;
    onOpenAddWidget?: () => void;
    onStartDrawing: () => void;
    onUploadImage: () => void;
    onOpenSvgLibrary?: () => void;
    onToggleEditMode: () => void;
    isEditMode: boolean;
    onEditSticker?: () => void;
    onDeleteSticker?: () => void;
    onCopyImage?: () => void;
    onCopyText?: () => void;
    onExportImage?: () => void;
    onExportImageSticker?: () => void;
    onOpenSettings?: () => void;
    onClearAllStickers?: () => void;
    isPinned?: boolean;
    onTogglePin?: () => void;
    priority?: number;
    onSetPriority?: () => void;
    onChangeFont?: () => void;
    onRotateSticker?: () => void;
    onSetStickerLink?: () => void;
    linkTarget?: string;
    anchorId?: string;
    isScreenFixed?: boolean;
    onToggleScreenFixed?: () => void;
    rotation?: number;
    hideStroke?: boolean;
    onToggleStroke?: () => void;
    sizeLabel?: string;
    canPasteSize?: boolean;
    onEditSize?: () => void;
    onPasteSize?: () => void;
    onCopySize?: () => void;
    interactionEffect?: StickerInteractionEffect;
    onSetInteractionEffect?: (effect: StickerInteractionEffect) => void;
    canIconSwap?: boolean;
    hasIconSwapContent?: boolean;
    onEnableIconSwap?: () => void;
    onChooseIconSwap?: () => void;
    strokeWidth?: number;
    onEditStroke?: () => void;
    cornerRadius?: number;
    isDefaultCornerRadius?: boolean;
    onEditCornerRadius?: () => void;
    onResetCornerRadius?: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
    x,
    y,
    type,
    isImageSticker,
    isTextSticker,
    onClose,
    onAddSticker,
    onOpenAddWidget,
    onStartDrawing,
    onUploadImage,
    onOpenSvgLibrary,
    onToggleEditMode,
    isEditMode,
    onEditSticker,
    onDeleteSticker,
    onCopyImage,
    onCopyText,
    onExportImage,
    onExportImageSticker,
    onOpenSettings,
    onClearAllStickers,
    isPinned,
    onTogglePin,
    priority = 0,
    onSetPriority,
    onChangeFont,
    onRotateSticker,
    onSetStickerLink,
    linkTarget,
    anchorId,
    isScreenFixed,
    onToggleScreenFixed,
    rotation = 0,
    hideStroke = false,
    onToggleStroke,
    sizeLabel,
    canPasteSize = false,
    onEditSize,
    onPasteSize,
    onCopySize,
    interactionEffect = 'none',
    onSetInteractionEffect,
    canIconSwap = false,
    hasIconSwapContent = false,
    onEnableIconSwap,
    onChooseIconSwap,
    strokeWidth = 6,
    onEditStroke,
    cornerRadius = 0,
    isDefaultCornerRadius = true,
    onEditCornerRadius,
    onResetCornerRadius,
}) => {
    const { t } = useLanguage();
    const menuRef = useRef<HTMLDivElement>(null);
    const isClosingRef = useRef(false);

    // Close with animation
    const handleClose = useCallback(() => {
        if (isClosingRef.current) return;
        isClosingRef.current = true;

        if (menuRef.current) {
            scaleFadeOut(menuRef.current, 200, () => {
                onClose();
            });
        } else {
            onClose();
        }
    }, [onClose]);

    // Animation on mount and when position changes
    useEffect(() => {
        isClosingRef.current = false;
        if (menuRef.current) {
            scaleFadeIn(menuRef.current);
        }
    }, [x, y]);

    // Click outside to close (ignore right-clicks to prevent race condition with new context menu)
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            // Ignore right-clicks - they will trigger a new context menu via contextmenu event
            if (e.button === 2) return;

            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                handleClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [handleClose]);

    // Prevent default context menu
    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => e.preventDefault();
        document.addEventListener('contextmenu', handleContextMenu);
        return () => document.removeEventListener('contextmenu', handleContextMenu);
    }, []);

    // Adjust position to stay within viewport
    const menuWidth = 180;
    const menuHeight = type === 'background' ? 430 : (isTextSticker ? 500 : (isImageSticker ? 510 : 330)); // Root items are compact; secondary actions live in submenus.
    const padding = 10;
    const submenuWidth = 188;

    // Calculate adjusted position, ensuring menu stays within viewport on all edges
    let adjustedX = x;
    let adjustedY = y;

    // Right edge
    if (x + menuWidth + padding > window.innerWidth) {
        adjustedX = window.innerWidth - menuWidth - padding;
    }
    // Left edge
    if (adjustedX < padding) {
        adjustedX = padding;
    }
    // Bottom edge  
    if (y + menuHeight + padding > window.innerHeight) {
        adjustedY = window.innerHeight - menuHeight - padding;
    }
    // Top edge
    if (adjustedY < padding) {
        adjustedY = padding;
    }
    const submenuOpensLeft = adjustedX + menuWidth + 8 + submenuWidth + padding > window.innerWidth;

    return createPortal(
        <>
            <div
                className={styles.contextMenuClickAway}
                onMouseDown={(e) => {
                    e.preventDefault();
                    handleClose();
                }}
                onContextMenu={(e) => {
                    e.preventDefault();
                    handleClose();
                }}
            />
            <div
                ref={menuRef}
                className={styles.contextMenu}
                style={{ left: adjustedX, top: adjustedY }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles.menuLabel}>Eclipin</div>
                <div className={styles.menuDivider} />
                <div className={styles.menuOptions}>
                    {type === 'background' ? (
                        <>
                            <button className={styles.menuItem} onClick={() => { onAddSticker(); onClose(); }}>
                                <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${plusIcon})`, maskImage: `url(${plusIcon})` }} />
                                <span>{t.contextMenu.addSticker}</span>
                            </button>
                            <button className={styles.menuItem} onClick={() => { onOpenAddWidget?.(); onClose(); }}>
                                <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${plusIcon})`, maskImage: `url(${plusIcon})` }} />
                                <span>添加组件</span>
                            </button>
                            <button className={styles.menuItem} onClick={() => { onStartDrawing(); onClose(); }}>
                                <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${writeIcon})`, maskImage: `url(${writeIcon})` }} />
                                <span>{t.contextMenu.drawing}</span>
                            </button>
                            <button className={styles.menuItem} onClick={() => { onUploadImage(); onClose(); }}>
                                <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${uploadIcon})`, maskImage: `url(${uploadIcon})` }} />
                                <span>{t.contextMenu.uploadImage}</span>
                            </button>
                            <button className={styles.menuItem} onClick={() => { onOpenSvgLibrary?.(); onClose(); }}>
                                <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${vectorIcon})`, maskImage: `url(${vectorIcon})` }} />
                                <span>{t.contextMenu.svgLibrary}</span>
                            </button>
                            <button className={styles.menuItem} onClick={() => { onToggleEditMode(); onClose(); }}>
                                <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${editIcon})`, maskImage: `url(${editIcon})` }} />
                                <span>{isEditMode ? t.contextMenu.exitEditMode : t.contextMenu.editMode}</span>
                            </button>
                            <button className={styles.menuItem} onClick={() => { onOpenSettings?.(); onClose(); }}>
                                <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${settingsIcon})`, maskImage: `url(${settingsIcon})` }} />
                                <span>{t.contextMenu.settings}</span>
                            </button>
                            <button className={`${styles.menuItem} ${styles.danger}`} onClick={() => { onClose(); onClearAllStickers?.(); }}>
                                <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${trashIcon})`, maskImage: `url(${trashIcon})` }} />
                                <span>{t.contextMenu.clearAllStickers}</span>
                            </button>
                        </>
                    ) : (
                        <>
                            {isImageSticker ? (
                                <>
                                    <button className={styles.menuItem} onClick={() => { onCopyImage?.(); onClose(); }}>
                                        <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${copyIcon})`, maskImage: `url(${copyIcon})` }} />
                                        <span>{t.contextMenu.copyImage}</span>
                                    </button>
                                    <button className={styles.menuItem} onClick={() => { onExportImageSticker?.(); onClose(); }}>
                                        <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${uploadIcon})`, maskImage: `url(${uploadIcon})` }} />
                                        <span>{t.contextMenu.exportImage}</span>
                                    </button>
                                    <button className={styles.menuItem} onClick={() => { onOpenSvgLibrary?.(); onClose(); }}>
                                        <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${vectorIcon})`, maskImage: `url(${vectorIcon})` }} />
                                        <span>{t.contextMenu.svgLibrary}</span>
                                    </button>
                                    <button className={styles.menuItem} onClick={() => { onSetStickerLink?.(); onClose(); }}>
                                        <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${linkIcon})`, maskImage: `url(${linkIcon})` }} />
                                        <span className={styles.menuItemContent}>
                                            <span>链接与标签</span>
                                            {(linkTarget || anchorId) ? <small>已设置</small> : null}
                                        </span>
                                    </button>
                                </>
                            ) : isTextSticker ? (
                                <>
                                    <button className={styles.menuItem} onClick={() => { onCopyText?.(); onClose(); }}>
                                        <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${copyIcon})`, maskImage: `url(${copyIcon})` }} />
                                        <span>{t.contextMenu.copyText}</span>
                                    </button>
                                    <button className={styles.menuItem} onClick={() => { onEditSticker?.(); onClose(); }}>
                                        <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${writeIcon})`, maskImage: `url(${writeIcon})` }} />
                                        <span>{t.contextMenu.editSticker}</span>
                                    </button>
                                    <button className={styles.menuItem} onClick={() => { onExportImage?.(); onClose(); }}>
                                        <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${uploadIcon})`, maskImage: `url(${uploadIcon})` }} />
                                        <span>{t.contextMenu.exportAsImage}</span>
                                    </button>
                                    <button className={styles.menuItem} onClick={() => { onChangeFont?.(); onClose(); }}>
                                        <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${fontIcon})`, maskImage: `url(${fontIcon})` }} />
                                        <span>{t.contextMenu.changeFont}</span>
                                    </button>
                                    <button className={styles.menuItem} onClick={() => { onSetStickerLink?.(); onClose(); }}>
                                        <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${linkIcon})`, maskImage: `url(${linkIcon})` }} />
                                        <span className={styles.menuItemContent}>
                                            <span>链接与标签</span>
                                            {(linkTarget || anchorId) ? <small>已设置</small> : null}
                                        </span>
                                    </button>
                                </>
                            ) : null}
                            <div className={styles.submenuWrap}>
                                <button type="button" className={styles.menuItem}>
                                    <span className={styles.menuSizeIcon}>↔</span>
                                    <span className={styles.menuItemContent}>
                                        <span>尺寸</span>
                                        {sizeLabel ? <small>{sizeLabel}</small> : null}
                                    </span>
                                    <span className={styles.menuChevron}>›</span>
                                </button>
                                <div className={`${styles.submenu} ${submenuOpensLeft ? styles.submenuLeft : ''}`}>
                                    <button type="button" className={styles.menuItem} onClick={() => { onEditSize?.(); onClose(); }}>
                                        <span className={styles.menuSizeIcon}>✎</span><span>编辑</span>
                                    </button>
                                    <button type="button" className={styles.menuItem} disabled={!canPasteSize} onClick={() => { if (canPasteSize) { onPasteSize?.(); onClose(); } }}>
                                        <span className={styles.menuSizeIcon}>⎘</span><span>粘贴尺寸</span>
                                    </button>
                                    <button type="button" className={styles.menuItem} onClick={() => { onCopySize?.(); onClose(); }}>
                                        <span className={styles.menuSizeIcon}>⧉</span><span>复制尺寸</span>
                                    </button>
                                </div>
                            </div>

                            <div className={styles.submenuWrap}>
                                <button type="button" className={styles.menuItem}>
                                    <span className={styles.menuSizeIcon}>✦</span>
                                    <span className={styles.menuItemContent}>
                                        <span>交互效果</span>
                                        <small>{interactionEffect === 'lift' ? '轻微浮起' : interactionEffect === 'scale' ? '放大' : interactionEffect === 'button' ? '按钮' : interactionEffect === 'iconSwap' ? '图标转换' : '无'}</small>
                                    </span>
                                    <span className={styles.menuChevron}>›</span>
                                </button>
                                <div className={`${styles.submenu} ${submenuOpensLeft ? styles.submenuLeft : ''}`}>
                                    {([
                                        ['none', '无'],
                                        ['lift', '轻微浮起'],
                                        ['scale', '放大'],
                                        ['button', '按钮'],
                                    ] as Array<[StickerInteractionEffect, string]>).map(([effect, label]) => (
                                        <button
                                            key={effect}
                                            type="button"
                                            className={styles.menuItem}
                                            onClick={() => { onSetInteractionEffect?.(effect); onClose(); }}
                                        >
                                            <span className={`${styles.menuRadioIcon} ${interactionEffect === effect ? styles.menuRadioIconActive : ''}`}>
                                                {interactionEffect === effect ? '●' : '○'}
                                            </span>
                                            <span>{label}</span>
                                        </button>
                                    ))}
                                    {canIconSwap && (
                                        <>
                                            <button
                                                type="button"
                                                className={styles.menuItem}
                                                onClick={() => { onEnableIconSwap?.(); onClose(); }}
                                            >
                                                <span className={`${styles.menuRadioIcon} ${interactionEffect === 'iconSwap' ? styles.menuRadioIconActive : ''}`}>
                                                    {interactionEffect === 'iconSwap' ? '●' : '○'}
                                                </span>
                                                <span>图标转换</span>
                                            </button>
                                            {hasIconSwapContent && (
                                                <button type="button" className={styles.menuItem} onClick={() => { onChooseIconSwap?.(); onClose(); }}>
                                                    <span className={styles.menuSizeIcon}>↻</span>
                                                    <span>更换图标</span>
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {(isImageSticker || isTextSticker) && (
                                <div className={styles.submenuWrap}>
                                    <button type="button" className={styles.menuItem}>
                                        <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${slashIcon})`, maskImage: `url(${slashIcon})` }} />
                                        <span className={styles.menuItemContent}>
                                            <span>描边</span>
                                            <small>{hideStroke ? '已关闭' : `${Math.round(strokeWidth)}px`}</small>
                                        </span>
                                        <span className={styles.menuChevron}>›</span>
                                    </button>
                                    <div className={`${styles.submenu} ${submenuOpensLeft ? styles.submenuLeft : ''}`}>
                                        <button type="button" className={styles.menuItem} onClick={() => { onToggleStroke?.(); onClose(); }}>
                                            <span className={styles.menuSizeIcon}>{hideStroke ? '◉' : '⊘'}</span>
                                            <span>{hideStroke ? '恢复描边' : '去除描边'}</span>
                                        </button>
                                        <button type="button" className={styles.menuItem} onClick={() => { onEditStroke?.(); onClose(); }}>
                                            <span className={styles.menuSizeIcon}>↔</span>
                                            <span className={styles.menuItemContent}>
                                                <span>描边边距</span>
                                                <small>{Math.round(strokeWidth)}px</small>
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {isImageSticker && (
                                <div className={styles.submenuWrap}>
                                    <button type="button" className={styles.menuItem}>
                                        <span className={styles.menuSizeIcon}>◜</span>
                                        <span className={styles.menuItemContent}>
                                            <span>圆角</span>
                                            <small>{isDefaultCornerRadius ? `默认 · ${Math.round(cornerRadius)}px` : `${Math.round(cornerRadius)}px`}</small>
                                        </span>
                                        <span className={styles.menuChevron}>›</span>
                                    </button>
                                    <div className={`${styles.submenu} ${submenuOpensLeft ? styles.submenuLeft : ''}`}>
                                        <button type="button" className={styles.menuItem} onClick={() => { onEditCornerRadius?.(); onClose(); }}>
                                            <span className={styles.menuSizeIcon}>↔</span>
                                            <span className={styles.menuItemContent}>
                                                <span>圆角大小</span>
                                                <small>{Math.round(cornerRadius)}px</small>
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.menuItem}
                                            disabled={isDefaultCornerRadius}
                                            onClick={() => { if (!isDefaultCornerRadius) { onResetCornerRadius?.(); onClose(); } }}
                                        >
                                            <span className={styles.menuSizeIcon}>↺</span>
                                            <span>恢复默认圆角</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className={styles.submenuWrap}>
                                <button type="button" className={styles.menuItem}>
                                    <span className={styles.menuSizeIcon}>▤</span>
                                    <span>布局</span>
                                    <span className={styles.menuChevron}>›</span>
                                </button>
                                <div className={`${styles.submenu} ${submenuOpensLeft ? styles.submenuLeft : ''}`}>
                                    <button className={styles.menuItem} onClick={() => { onRotateSticker?.(); onClose(); }}>
                                        <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${rotateIcon})`, maskImage: `url(${rotateIcon})` }} />
                                        <span className={styles.menuItemContent}>
                                            <span>{t.contextMenu.rotateSticker}</span>
                                            <small>{Math.round(rotation)}°</small>
                                        </span>
                                    </button>
                                    <button className={styles.menuItem} onClick={() => { onSetPriority?.(); onClose(); }}>
                                        <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${priorityIcon})`, maskImage: `url(${priorityIcon})` }} />
                                        <span className={styles.menuItemContent}>
                                            <span>设置优先级</span>
                                            <small>P{Math.max(-999, Math.min(999, Math.trunc(priority)))}</small>
                                        </span>
                                    </button>
                                    <button className={styles.menuItem} onClick={() => { onToggleScreenFixed?.(); onClose(); }}>
                                        <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${monitorIcon})`, maskImage: `url(${monitorIcon})` }} />
                                        <span>{isScreenFixed ? '恢复随页面滚动' : '相对屏幕固定'}</span>
                                    </button>
                                    <button className={styles.menuItem} onClick={() => { onTogglePin?.(); onClose(); }}>
                                        <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${pinIcon})`, maskImage: `url(${pinIcon})` }} />
                                        <span>{isPinned ? t.contextMenu.unpinSticker : t.contextMenu.pinSticker}</span>
                                    </button>
                                </div>
                            </div>
                            <button className={`${styles.menuItem} ${styles.danger}`} onClick={() => { onDeleteSticker?.(); onClose(); }}>
                                <span className={styles.menuIcon} style={{ WebkitMaskImage: `url(${trashIcon})`, maskImage: `url(${trashIcon})` }} />
                                <span>{t.contextMenu.deleteSticker}</span>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </>,
        document.body
    );
};
