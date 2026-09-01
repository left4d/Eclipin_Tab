import React, { useLayoutEffect, useRef, useState } from 'react';
import { Sticker } from '@/shared/types';
import alignLeftIcon from '@/assets/icons/align-left.svg';
import alignCenterIcon from '@/assets/icons/align-center.svg';
import alignRightIcon from '@/assets/icons/align-right.svg';
import { areStickerColorsEquivalent, DEFAULT_STICKER_COLOR, STICKER_COLOR_PRESETS } from '@/features/shelf/constants/colorPresets';
import styles from './ZenShelf.module.css';

// ============================================================================
// FloatingToolbar Component - 浮动样式工具栏
// ============================================================================

interface FloatingToolbarProps {
    sticker: Sticker;
    stickerRect: DOMRect;
    onStyleChange: (updates: Partial<Sticker['style']>) => void;
}

const FloatingToolbarComponent: React.FC<FloatingToolbarProps> = ({ sticker, stickerRect, onStyleChange }) => {
    const currentAlign = sticker.style?.textAlign || 'left';
    const currentColor = sticker.style?.color || DEFAULT_STICKER_COLOR;
    const toolbarRef = useRef<HTMLDivElement>(null);
    const desiredCenter = stickerRect.left + stickerRect.width / 2;
    const [toolbarCenter, setToolbarCenter] = useState(desiredCenter);

    // 默认显示在贴纸上方；靠近视口顶部时自动放到下方，避免工具栏被裁掉。
    const toolbarMargin = 10;
    const placeBelow = stickerRect.top < 76;

    useLayoutEffect(() => {
        const toolbarWidth = toolbarRef.current?.getBoundingClientRect().width ?? 0;
        const viewportMargin = 12;
        const halfWidth = Math.min(toolbarWidth, Math.max(0, window.innerWidth - viewportMargin * 2)) / 2;
        const minCenter = viewportMargin + halfWidth;
        const maxCenter = Math.max(minCenter, window.innerWidth - viewportMargin - halfWidth);
        setToolbarCenter(Math.min(maxCenter, Math.max(minCenter, desiredCenter)));
    }, [desiredCenter, stickerRect.height, stickerRect.width]);

    const toolbarStyle: React.CSSProperties = {
        left: toolbarCenter,
        top: placeBelow ? stickerRect.bottom + toolbarMargin : stickerRect.top - toolbarMargin,
        transform: placeBelow ? 'translateX(-50%)' : 'translate(-50%, -100%)',
    };

    return (
        <div ref={toolbarRef} className={styles.floatingToolbar} style={toolbarStyle}>
            {/* Alignment buttons */}
            {([
                { value: 'left', label: '左对齐', icon: alignLeftIcon },
                { value: 'center', label: '居中对齐', icon: alignCenterIcon },
                { value: 'right', label: '右对齐', icon: alignRightIcon },
            ] as const).map((option) => (
                <button
                    key={option.value}
                    type="button"
                    className={`icon-btn icon-btn--ghost ${styles.alignButton} ${currentAlign === option.value ? styles.active : ''}`}
                    onClick={() => onStyleChange({ textAlign: option.value })}
                    title={option.label}
                    aria-label={option.label}
                    aria-pressed={currentAlign === option.value}
                >
                    <span
                        className={styles.floatingToolbarIcon}
                        style={{ WebkitMaskImage: `url(${option.icon})`, maskImage: `url(${option.icon})` }}
                    />
                </button>
            ))}

            <div className={styles.toolbarDivider} />

            {/* Color buttons */}
            <div className={styles.floatingColorGroup} role="group" aria-label="文字颜色预设">
                {STICKER_COLOR_PRESETS.map((preset) => (
                    <button
                        key={preset.value}
                        type="button"
                        className={`${styles.colorButton} ${areStickerColorsEquivalent(currentColor, preset.value) ? styles.active : ''}`}
                        style={{ background: preset.value }}
                        onClick={() => onStyleChange({ color: preset.value })}
                        title={preset.label}
                        aria-label={`文字颜色：${preset.label}`}
                        aria-pressed={areStickerColorsEquivalent(currentColor, preset.value)}
                    />
                ))}
            </div>
        </div>
    );
};

// ============================================================================
// React.memo with custom comparison
// ============================================================================

const arePropsEqual = (prev: FloatingToolbarProps, next: FloatingToolbarProps) => {
    return (
        prev.sticker.id === next.sticker.id &&
        prev.sticker.style?.color === next.sticker.style?.color &&
        prev.sticker.style?.textAlign === next.sticker.style?.textAlign &&
        prev.stickerRect.left === next.stickerRect.left &&
        prev.stickerRect.top === next.stickerRect.top &&
        prev.stickerRect.width === next.stickerRect.width &&
        prev.stickerRect.height === next.stickerRect.height
    );
};

export const FloatingToolbar = React.memo(FloatingToolbarComponent, arePropsEqual);
