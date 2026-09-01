import React, { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { scaleFadeIn, scaleFadeOut } from '@/shared/utils/animations';
import { useThemeData } from '@/features/theme/context/ThemeContext';
import { useLanguage } from '@/shared/context/LanguageContext';
import plusIcon from '@/assets/icons/sticker-plus.svg';
import minusIcon from '@/assets/icons/sticker-minus.svg';
import checkCircleIcon from '@/assets/icons/sticker-todo.svg';
import checkIcon from '@/assets/icons/for-checkbox.svg';
import linkIcon from '@/assets/icons/sticker-link.svg';
import { LinkCardMetadata, StickerDrawing } from '@/shared/types';
import { fetchLinkPreview } from '@/shared/utils/linkPreview';
import { getSinglePlainUrl, markdownToEditableText, markdownToPlainText, rebuildMarkdownFromEditText } from '@/shared/utils/markdownLinks';
import type { BuiltInFontId } from '@/shared/constants/builtInFonts';
import { ensureBuiltInFontLoaded, getBuiltInFontFamily } from '@/shared/constants/builtInFonts';
import { areStickerColorsEquivalent, DEFAULT_STICKER_COLOR, STICKER_COLOR_PRESETS } from '@/features/shelf/constants/colorPresets';
import { getThemeAwareStickerColor } from '@/features/shelf/utils/stickerPresentation';
import { getLastStickerFontSize, saveLastStickerFontSize } from './textInputPreferences';
import { DrawingShape } from './DrawingShape';
import styles from './ZenShelf.module.css';

// ============================================================================
// TextInput 组件 - 带有样式选项的增强弹出窗口
// ============================================================================

interface TextInputPresentation {
    rotation?: number;
    scale?: number;
    hideStroke?: boolean;
    strokeWidth?: number;
}

interface TextInputProps {
    x: number;
    y: number;
    initialText?: string;
    initialStyle?: { color: string; textAlign: 'left' | 'center' | 'right'; fontSize?: number; fontFamily?: BuiltInFontId };
    initialHasCheckbox?: boolean;
    initialIsChecked?: boolean;
    initialLinkCard?: LinkCardMetadata;
    initialDrawings?: StickerDrawing[];
    initialPresentation?: TextInputPresentation;
    onSubmit: (content: string, style?: { color: string; textAlign: 'left' | 'center' | 'right'; fontSize: number }, hasCheckbox?: boolean, linkCard?: LinkCardMetadata, positionOffset?: { x: number; y: number }) => void;
    onCancel: () => void;
    viewportScale: number;
}

export interface TextInputHandle {
    /** 立即保存当前编辑内容（不播放动画） */
    saveNow: () => void;
}

export const TextInput = forwardRef<TextInputHandle, TextInputProps>(({ x, y, initialText = '', initialStyle, initialHasCheckbox = false, initialIsChecked = false, initialLinkCard, initialDrawings, initialPresentation, onSubmit, onCancel, viewportScale }, ref) => {
    const { t } = useLanguage();
    const { theme } = useThemeData();
    const inputRef = useRef<HTMLDivElement>(null);
    const inputWrapperRef = useRef<HTMLDivElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const originalMarkdownRef = useRef(initialText);
    const toolbarAnchorTopRef = useRef<number | null>(null);
    const submitPositionOffsetRef = useRef({ x: 0, y: 0 });
    // 始终使用左对齐
    const textAlign = 'left' as const;
    const [textColor, setTextColor] = useState(initialStyle?.color || DEFAULT_STICKER_COLOR);
    const [fontSize, setFontSize] = useState<number>(
        (initialStyle?.fontSize as number) || getLastStickerFontSize()
    );
    const [hasCheckbox, setHasCheckbox] = useState<boolean>(initialHasCheckbox);
    const [isExiting, setIsExiting] = useState(false);
    const [editText, setEditText] = useState(() => markdownToEditableText(initialText));
    const [linkCard, setLinkCard] = useState<LinkCardMetadata | undefined>(initialLinkCard);
    const [isFetchingLinkCard, setIsFetchingLinkCard] = useState(false);
    const previewFontFamily = getBuiltInFontFamily(initialStyle?.fontFamily);
    const isEditingExistingSticker = initialPresentation !== undefined;
    const previewStickerScale = Math.max(0.1, initialPresentation?.scale ?? 1);
    const previewViewportScale = isEditingExistingSticker ? viewportScale : 1;
    const previewCombinedScale = previewStickerScale * previewViewportScale;
    const previewRotation = initialPresentation?.rotation ?? 0;
    const previewStrokeWidth = Math.max(0, initialPresentation?.strokeWidth ?? 6);
    const previewStrokeRenderWidth = previewStrokeWidth / previewStickerScale;
    const previewHideStroke = initialPresentation?.hideStroke ?? false;
    const trimmedEditText = editText.trim();
    const hasContent = !!markdownToPlainText(editText).trim();
    const detectedUrl = getSinglePlainUrl(trimmedEditText);

    // 用 ref 保存最新的编辑状态，避免闭包捕获过时值
    const latestStateRef = useRef({ textColor, fontSize, hasCheckbox });
    latestStateRef.current = { textColor, fontSize, hasCheckbox };

    // 标记是否已经提交过（避免重复提交）
    const hasSubmittedRef = useRef(false);

    const getSubmittedContent = useCallback((editText: string) => {
        return rebuildMarkdownFromEditText(editText, originalMarkdownRef.current);
    }, []);

    const getCurrentEditText = useCallback(() => {
        return (inputRef.current?.innerText || editText).trim();
    }, [editText]);

    // 暴露 saveNow 方法，供父组件在切换编辑时调用
    useImperativeHandle(ref, () => ({
        saveNow: () => {
            if (hasSubmittedRef.current) return;
            hasSubmittedRef.current = true;
            const text = getCurrentEditText();
            if (text) {
                const { textColor: c, fontSize: f, hasCheckbox: cb } = latestStateRef.current;
                onSubmit(getSubmittedContent(text), { color: c, textAlign: 'left', fontSize: f }, cb, linkCard, submitPositionOffsetRef.current);
            } else {
                onCancel();
            }
        }
    }), [getCurrentEditText, getSubmittedContent, linkCard, onCancel, onSubmit]);

    useEffect(() => {
        void ensureBuiltInFontLoaded(initialStyle?.fontFamily);
    }, [initialStyle?.fontFamily]);

    // 持久化字体大小到 localStorage
    useEffect(() => {
        saveLastStickerFontSize(fontSize);
    }, [fontSize]);

    useEffect(() => {
        originalMarkdownRef.current = initialText;
        setEditText(markdownToEditableText(initialText));
        setLinkCard(initialLinkCard);
    }, [initialLinkCard, initialText]);

    // 挂载时聚焦并仅对工具栏播放入场动画
    useEffect(() => {
        if (toolbarRef.current) {
            scaleFadeIn(toolbarRef.current, 200);
        }
        if (inputWrapperRef.current) {
            // 仅在添加新文本（初始 text 为空）时播放输入框入场动画
            // 如果是编辑，文本已经显示在画布上，因此输入框本身不需要入场动画。
            if (!initialText) {
                scaleFadeIn(inputWrapperRef.current, 200);
            }
        }
        if (inputRef.current) {
            inputRef.current.focus();
            // 如果是编辑，设置初始文本（可往返的链接编辑格式）
            if (initialText) {
                inputRef.current.innerText = markdownToEditableText(initialText);
                // 将光标移动到末尾
                const range = document.createRange();
                range.selectNodeContents(inputRef.current);
                range.collapse(false);
                const selection = window.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);
            }
        }
    }, [initialText]);

    // 字体大小更改时更新它
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.fontSize = `${fontSize}px`;
        }
    }, [fontSize]);

    // 触发工具栏和输入框的出场动画
    const triggerExit = useCallback((callback: () => void, animateInput: boolean = true) => {
        if (isExiting) return;
        setIsExiting(true);

        if (animateInput && inputWrapperRef.current) {
            scaleFadeOut(inputWrapperRef.current, 150);
        }

        if (toolbarRef.current) {
            scaleFadeOut(toolbarRef.current, 150, callback);
        } else {
            callback();
        }
    }, [isExiting]);

    const handleSubmitContent = useCallback((editText: string) => {
        const contentWithLinks = getSubmittedContent(editText);
        triggerExit(() => onSubmit(contentWithLinks, { color: textColor, textAlign, fontSize }, hasCheckbox, linkCard, submitPositionOffsetRef.current), false);
    }, [fontSize, getSubmittedContent, hasCheckbox, linkCard, onSubmit, textColor, textAlign, triggerExit]);

    // 点击外部关闭 - 等待出场动画结束后再保存，避免父组件提前卸载
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (isExiting || hasSubmittedRef.current) return;
            const target = e.target as HTMLElement;
            // 检查是否点击了输入框或工具栏
            if (inputWrapperRef.current?.contains(target) || toolbarRef.current?.contains(target)) {
                return;
            }
            // 从 ref 读取最新状态，避免闭包过时值
            const { textColor: currentColor, fontSize: currentSize, hasCheckbox: currentCheckbox } = latestStateRef.current;
            const text = getCurrentEditText();
            hasSubmittedRef.current = true;

            if (text) {
                triggerExit(() => {
                    onSubmit(getSubmittedContent(text), { color: currentColor, textAlign, fontSize: currentSize }, currentCheckbox, linkCard, submitPositionOffsetRef.current);
                }, false);
            } else {
                triggerExit(onCancel, !initialText);
            }
        };
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 100);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [getCurrentEditText, getSubmittedContent, initialText, isExiting, linkCard, onCancel, onSubmit, triggerExit]);

    // 字体大小调整常量
    const FONT_SIZE_STEP = 2; // 每次调整的步长（px）
    const FONT_SIZE_STEP_LARGE = 12; // 按住 Shift 时的大步长（px）
    const MIN_FONT_SIZE = 12; // 最小字体大小（px）
    const MAX_FONT_SIZE = 120; // 最大字体大小（px）

    const handleKeyDown = (e: React.KeyboardEvent) => {
        const isModifierPressed = e.ctrlKey || e.metaKey;

        if (isModifierPressed) {
            // 字体大小快捷键：Ctrl/Cmd + 上下方向键
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                const step = e.shiftKey ? FONT_SIZE_STEP_LARGE : FONT_SIZE_STEP;
                setFontSize(prev => Math.min(prev + step, MAX_FONT_SIZE));
                return;
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const step = e.shiftKey ? FONT_SIZE_STEP_LARGE : FONT_SIZE_STEP;
                setFontSize(prev => Math.max(prev - step, MIN_FONT_SIZE));
                return;
            }

            // 颜色快捷键：Ctrl/Cmd + 1~9，0 对应第 10 个颜色。
            if (/^[0-9]$/.test(e.key)) {
                const colorIndex = e.key === '0' ? 9 : Number(e.key) - 1;
                const preset = STICKER_COLOR_PRESETS[colorIndex];
                if (preset) {
                    e.preventDefault();
                    setTextColor(preset.value);
                    return;
                }
            }
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
        // Shift+Enter 允许换行（默认行为）
    };

    const syncInputState = () => {
        if (inputRef.current) {
            const text = inputRef.current.innerText.trim();
            const nextDetectedUrl = getSinglePlainUrl(text);

            setEditText(text);
            if (linkCard && linkCard.url !== nextDetectedUrl) {
                setLinkCard(undefined);
            }
        }
    };

    // 处理粘贴 - 确保仅粘贴纯文本以避免格式问题
    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
        window.setTimeout(syncInputState, 0);
    };

    const handleSubmit = () => {
        const trimmed = getCurrentEditText();
        if (trimmed) {
            hasSubmittedRef.current = true;
            handleSubmitContent(trimmed);
        } else {
            handleCancel();
        }
    };

    const handleCancel = () => {
        hasSubmittedRef.current = true;
        // 编辑已有贴纸时（initialText 非空），不播放输入框消失动画
        // 因为贴纸会重新出现在画布上，播放动画会导致视觉闪烁
        triggerExit(onCancel, !initialText);
    };

    const [localFontSize, setLocalFontSize] = useState<string>(fontSize.toString());

    // 当 fontSize 外部变更（例如快捷键）时同步更新输入框
    useEffect(() => {
        setLocalFontSize(fontSize.toString());
    }, [fontSize]);

    const commitFontSize = (val: string) => {
        let num = parseInt(val, 10);
        if (isNaN(num)) {
            num = fontSize; // 恢复旧值
        } else {
            // 范围限制
            if (num < MIN_FONT_SIZE) num = MIN_FONT_SIZE;
            if (num > MAX_FONT_SIZE) num = MAX_FONT_SIZE;
        }
        setFontSize(num);
        setLocalFontSize(num.toString());
    };

    const handleCreateLinkCard = async () => {
        if (linkCard) {
            toolbarAnchorTopRef.current = toolbarRef.current?.getBoundingClientRect().top ?? null;
            setLinkCard(undefined);
            window.setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.innerText = editText;
                    inputRef.current.focus();
                }
            }, 0);
            return;
        }

        const url = detectedUrl || getSinglePlainUrl(inputRef.current?.innerText || '');
        if (!url || isFetchingLinkCard) return;

        setIsFetchingLinkCard(true);
        try {
            const preview = await fetchLinkPreview(url);
            toolbarAnchorTopRef.current = toolbarRef.current?.getBoundingClientRect().top ?? null;
            setLinkCard(preview);
        } finally {
            setIsFetchingLinkCard(false);
            inputRef.current?.focus();
        }
    };

    // State for visual position, initially matching props
    const [position, setPosition] = useState({ x, y });
    const previousOriginRef = useRef({ x, y });

    // 父级坐标变化时保留当前的内部锚点偏移。
    React.useLayoutEffect(() => {
        const previous = previousOriginRef.current;
        const deltaX = x - previous.x;
        const deltaY = y - previous.y;

        if (deltaX || deltaY) {
            setPosition(current => ({ x: current.x + deltaX, y: current.y + deltaY }));
            previousOriginRef.current = { x, y };
        }
    }, [x, y]);

    // 卡片尺寸变化时锁定工具栏位置，并处理视口边缘溢出。
    React.useLayoutEffect(() => {
        if (containerRef.current && toolbarRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const PADDING = 20;

            let newX = position.x;
            let newY = position.y;
            let projectedLeft = rect.left;
            let projectedRight = rect.right;
            let projectedTop = rect.top;
            let projectedBottom = rect.bottom;

            const toolbarAnchorTop = toolbarAnchorTopRef.current;
            const isAnchoringCard = toolbarAnchorTop !== null;
            if (toolbarAnchorTop !== null) {
                const toolbarTop = toolbarRef.current.getBoundingClientRect().top;
                const anchorOffset = toolbarAnchorTop - toolbarTop;
                newY += anchorOffset;
                projectedTop += anchorOffset;
                projectedBottom += anchorOffset;
                toolbarAnchorTopRef.current = null;
            }

            // Check right edge
            if (projectedRight > viewportWidth - PADDING) {
                const offset = viewportWidth - PADDING - projectedRight;
                newX += offset;
                projectedLeft += offset;
                projectedRight += offset;
            }
            // Check left edge
            if (projectedLeft < PADDING) {
                newX += PADDING - projectedLeft;
            }

            // Check bottom edge
            if (projectedBottom > viewportHeight - PADDING) {
                const offset = viewportHeight - PADDING - projectedBottom;
                newY += offset;
                projectedTop += offset;
            }
            // Check top edge
            if (projectedTop < PADDING) {
                newY += PADDING - projectedTop;
            }

            if (isAnchoringCard) {
                submitPositionOffsetRef.current = {
                    x: submitPositionOffsetRef.current.x,
                    y: submitPositionOffsetRef.current.y + (newY - position.y),
                };
            }

            // Only update if changed significantly to avoid loops
            if (Math.abs(newX - position.x) > 1 || Math.abs(newY - position.y) > 1) {
                setPosition({ x: newX, y: newY });
            }
        }
    }, [detectedUrl, fontSize, linkCard, position.x, position.y, viewportScale]);

    return createPortal(
        <div
            ref={containerRef}
            className={`${styles.stickerPreviewContainer} ${isExiting ? styles.exiting : ''}`}
            style={{ left: position.x, top: position.y }}
        >
            {/*
             * 编辑已有贴纸时，预览层完整继承正式贴纸的几何与描边参数。
             * 外层缩放、内层旋转的顺序与 StickerItem 保持一致；工具栏不参与变换。
             */}
            <div
                className={styles.stickerPreviewScaleLayer}
                style={{
                    transform: `scale(${previewCombinedScale})`,
                    transformOrigin: 'top left',
                    '--sticker-stroke-render-width': `${previewStrokeRenderWidth}px`,
                } as React.CSSProperties}
            >
                <div
                    className={styles.stickerPreviewRotationLayer}
                    style={{ transform: `rotate(${previewRotation}deg)` }}
                >
                    {/* 实时预览贴纸 - 直接在背景上显示 */}
                    <div
                        ref={inputWrapperRef}
                        className={[!linkCard ? styles.stickerText : '', hasCheckbox ? styles.textStickerContainer : '', linkCard ? styles.hasLinkCard : ''].filter(Boolean).join(' ')}
                        style={{ fontFamily: previewFontFamily }}
                    >
                {hasCheckbox && (
                    <button
                        className={`${styles.textStickerCheckbox} ${initialIsChecked ? styles.textStickerCheckboxChecked : ''}`}
                        style={{ cursor: 'default', pointerEvents: 'none' }}
                        disabled
                    >
                        {initialIsChecked && (
                            <span
                                className={styles.toolbarIcon}
                                style={{
                                    WebkitMaskImage: `url(${checkIcon})`,
                                    maskImage: `url(${checkIcon})`,
                                    backgroundColor: '#000000',
                                    width: '20px',
                                    height: '20px',
                                    position: 'absolute',
                                    left: '50%',
                                    top: '50%',
                                    transform: 'translate(-50%, -50%)',
                                }}
                            />
                        )}
                    </button>
                )}
                {linkCard ? (
                    <article className={`card card--sticker ${styles.linkCardSticker} ${!linkCard.imageUrl ? styles.noImage : ''}`} style={{ fontFamily: previewFontFamily }}>
                        {linkCard.imageUrl && (
                            <img
                                src={linkCard.imageUrl}
                                alt=""
                                className={styles.linkCardImage}
                                draggable={false}
                            />
                        )}
                        <div className={styles.linkCardContent}>
                            <div className={`card__title ${styles.linkCardTitle}`} style={{ fontFamily: previewFontFamily }}>{linkCard.title}</div>
                            <div className={`card__subtitle ${styles.linkCardSubtitle}`} style={{ fontFamily: previewFontFamily }}>{linkCard.subtitle}</div>
                        </div>
                    </article>
                ) : (
                    <div className={styles.stickerPreviewDrawingHost}>
                        {initialDrawings && initialDrawings.length > 0 && (
                            <svg className={styles.textStickerDrawingLayer}>
                                {initialDrawings.map((drawing) => (
                                    <DrawingShape key={drawing.id} drawing={drawing} />
                                ))}
                            </svg>
                        )}
                        <div
                            ref={inputRef}
                            className={['sticker__text', styles.textSticker, styles.stickerPreviewInput, previewHideStroke ? 'sticker__text--plain' : '', previewHideStroke ? styles.noStickerStroke : ''].filter(Boolean).join(' ')}
                            contentEditable
                            suppressContentEditableWarning
                            style={{
                                color: getThemeAwareStickerColor(textColor, theme),
                                textAlign: textAlign,
                                fontSize: `${fontSize}px`,
                                fontFamily: previewFontFamily,
                            }}
                            onInput={syncInputState}
                            onKeyUp={syncInputState}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            onClick={(e) => e.stopPropagation()}
                            data-placeholder={t.textInput.placeholder}
                        />
                    </div>
                )}
                    </div>
                </div>
            </div>

            {/* 工具栏 - 跟随在输入区域下方 */}
            <div
                ref={toolbarRef}
                className={styles.stickerToolbar}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`${styles.toolbarPanel} ${styles.toolbarSettings} ${detectedUrl ? styles.withLinkAction : ''}`}>
                    <div className={styles.toolbarStylePanel}>
                        {/* 字体大小控制 */}
                        <div className={styles.toolbarControlSection}>
                            <span className={styles.toolbarControlLabel}>字号</span>
                            <div className={styles.toolbarFontSizeControl}>
                            <button
                                className={styles.toolbarFontSizeBtn}
                                onClick={(e) => {
                                    const step = e.shiftKey ? FONT_SIZE_STEP_LARGE : FONT_SIZE_STEP;
                                    setFontSize(prev => Math.max(prev - step, MIN_FONT_SIZE));
                                }}
                                title={t.textInput.fontSizeDecrease}
                            >
                                <span className={styles.toolbarIcon} style={{ WebkitMaskImage: `url(${minusIcon})`, maskImage: `url(${minusIcon})` }} />
                            </button>
                            <input
                                className={styles.toolbarFontSizeInput}
                                value={localFontSize}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    // 仅允许输入数字
                                    if (val === '' || /^\d*$/.test(val)) {
                                        setLocalFontSize(val);
                                    }
                                }}
                                onBlur={() => commitFontSize(localFontSize)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        commitFontSize(localFontSize);
                                        (e.target as HTMLInputElement).blur();
                                        // 将焦点还给文本编辑器
                                        inputRef.current?.focus();
                                    }
                                }}
                                // 防止事件冒泡导致贴纸提交
                                onClick={(e) => e.stopPropagation()}
                                title={t.textInput.fontSizeIncrease}
                            />
                            <button
                                className={styles.toolbarFontSizeBtn}
                                onClick={(e) => {
                                    const step = e.shiftKey ? FONT_SIZE_STEP_LARGE : FONT_SIZE_STEP;
                                    setFontSize(prev => Math.min(prev + step, MAX_FONT_SIZE));
                                }}
                                title={t.textInput.fontSizeIncrease}
                            >
                                <span className={styles.toolbarIcon} style={{ WebkitMaskImage: `url(${plusIcon})`, maskImage: `url(${plusIcon})` }} />
                            </button>
                            </div>
                        </div>

                        <div className={styles.toolbarControlDivider} />

                        {/* 颜色选项 */}
                        <div className={`${styles.toolbarControlSection} ${styles.toolbarColorSection}`}>
                            <span className={styles.toolbarControlLabel}>颜色</span>
                            <div className={styles.toolbarColorGroup} role="group" aria-label="文字颜色预设">
                            {STICKER_COLOR_PRESETS.map((preset) => (
                                <button
                                    key={preset.value}
                                    type="button"
                                    className={`${styles.toolbarColorBtn} ${areStickerColorsEquivalent(textColor, preset.value) ? styles.active : ''}`}
                                    style={{ backgroundColor: preset.value }}
                                    onClick={() => setTextColor(preset.value)}
                                    title={`${preset.label}${preset.shortcut ? `（⌘/Ctrl + ${preset.shortcut}）` : ''}`}
                                    aria-label={`文字颜色：${preset.label}`}
                                    aria-pressed={areStickerColorsEquivalent(textColor, preset.value)}
                                />
                            ))}
                            </div>
                        </div>
                    </div>

                    {/* 复选框切换按钮 */}
                    <button
                        className={`icon-btn ${styles.toolbarCheckboxBtn} ${hasCheckbox ? styles.active : ''}`}
                        aria-pressed={hasCheckbox}
                        onClick={() => setHasCheckbox(!hasCheckbox)}
                        title={hasCheckbox ? 'Remove Checkbox' : 'Add Checkbox'}
                    >
                        <span className={`${styles.toolbarIcon} ${styles.toolbarTodoIcon}`} style={{ WebkitMaskImage: `url(${checkCircleIcon})`, maskImage: `url(${checkCircleIcon})` }} />
                    </button>

                    {detectedUrl && (
                        <button
                            className={`icon-btn ${styles.toolbarLinkCardBtn} ${linkCard ? styles.active : ''}`}
                            aria-pressed={Boolean(linkCard)}
                            onClick={handleCreateLinkCard}
                            disabled={isFetchingLinkCard}
                            title={linkCard ? 'Back to text' : 'Create link card'}
                        >
                            <span className={styles.toolbarIcon} style={{ WebkitMaskImage: `url(${linkIcon})`, maskImage: `url(${linkIcon})` }} />
                        </button>
                    )}
                </div>

                {/* 操作按钮 */}
                <div className={`${styles.toolbarPanel} ${styles.toolbarActions}`}>
                    <button className="btn" onClick={handleCancel}>
                        {t.textInput.cancel}
                    </button>
                    <button
                        className="btn btn--primary"
                        onClick={handleSubmit}
                        disabled={!hasContent}
                    >
                        {t.textInput.confirm}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
});
