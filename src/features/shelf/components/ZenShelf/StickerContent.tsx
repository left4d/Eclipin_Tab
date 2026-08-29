import React, { useEffect } from 'react';
import type { Sticker } from '@/shared/types';
import { IMAGE_MAX_WIDTH } from '@/shared/types';
import { useThemeData } from '@/features/theme/context/ThemeContext';
import { ensureBuiltInFontLoaded, getBuiltInFontFamily } from '@/shared/constants/builtInFonts';
import { hasMarkdownLinks, splitTextWithLinks } from '@/shared/utils/markdownLinks';
import checkIcon from '@/assets/icons/for-checkbox.svg';
import { getThemeAwareStickerColor } from '@/features/shelf/utils/stickerPresentation';
import { DrawingShape } from './DrawingShape';
import { getStickerLinkTarget } from '@/features/shelf/utils/stickerNavigation';
import styles from './ZenShelf.module.css';

interface StickerContentProps {
    sticker: Sticker;
    isDragging: boolean;
    isCreativeMode: boolean;
    imageNaturalWidth: number;
    resolvedImageUrl: string | null;
    isSvgImage: boolean;
    svgText: string | null;
    alternateSvgText?: string | null;
    showAlternateIcon?: boolean;
    onImageLoad: (event: React.SyntheticEvent<HTMLImageElement>) => void;
    onImageClick: (event: React.MouseEvent) => void;
    onTextClick: (event: React.MouseEvent) => void;
    onResizeStart: (event: React.MouseEvent) => void;
    onToggleCheckbox?: () => void;
}

const TextStickerContent: React.FC<Pick<StickerContentProps,
    'sticker' | 'isDragging' | 'isCreativeMode' | 'onToggleCheckbox' | 'onTextClick'
>> = ({ sticker, isDragging, isCreativeMode, onToggleCheckbox, onTextClick }) => {
    const { theme, openInNewTab } = useThemeData();
    const fontFamily = getBuiltInFontFamily(sticker.style?.fontFamily);

    useEffect(() => {
        void ensureBuiltInFontLoaded(sticker.style?.fontFamily);
    }, [sticker.style?.fontFamily]);

    return (
        <div
            className={[
                sticker.hasCheckbox ? styles.textStickerContainer : '',
                sticker.linkCard ? styles.hasLinkCard : '',
                getStickerLinkTarget(sticker) ? styles.linkedStickerContent : '',
            ].filter(Boolean).join(' ')}
            style={{ fontFamily }}
            onClick={onTextClick}
            title={getStickerLinkTarget(sticker) || undefined}
        >
            {sticker.hasCheckbox && (
                <button
                    className={`${styles.textStickerCheckbox} ${sticker.isChecked ? styles.textStickerCheckboxChecked : ''}`}
                    onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onToggleCheckbox?.();
                    }}
                    onDoubleClick={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                    title={sticker.isChecked ? 'Uncheck' : 'Check'}
                >
                    {sticker.isChecked && (
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

            {sticker.linkCard ? (
                <article
                    className={`${styles.linkCardSticker} ${!sticker.linkCard.imageUrl ? styles.noImage : ''}`}
                    style={{ fontFamily }}
                >
                    {sticker.linkCard.imageUrl && (
                        <img
                            src={sticker.linkCard.imageUrl}
                            alt=""
                            className={styles.linkCardImage}
                            draggable={false}
                        />
                    )}
                    <div className={styles.linkCardContent}>
                        <div className={styles.linkCardTitle} style={{ fontFamily }}>{sticker.linkCard.title}</div>
                        <div className={styles.linkCardSubtitle} style={{ fontFamily }}>{sticker.linkCard.subtitle}</div>
                    </div>
                </article>
            ) : (
                <div
                    className={[
                        styles.textSticker,
                        isDragging && styles.dragging,
                        isCreativeMode && styles.creativeHover,
                        sticker.isChecked && styles.textStickerCrossedOut,
                        sticker.hideStroke && styles.noStickerStroke,
                    ].filter(Boolean).join(' ')}
                    style={{
                        color: getThemeAwareStickerColor(sticker.style?.color || '#1C1C1E', theme),
                        textAlign: sticker.style?.textAlign || 'left',
                        fontSize: sticker.style?.fontSize || 40,
                        fontFamily,
                    }}
                >
                    {sticker.drawings && sticker.drawings.length > 0 && (
                        <svg className={styles.textStickerDrawingLayer}>
                            {sticker.drawings.map((drawing) => (
                                <DrawingShape key={drawing.id} drawing={drawing} />
                            ))}
                        </svg>
                    )}
                    <span className={styles.textStickerContent}>
                        {hasMarkdownLinks(sticker.content)
                            ? splitTextWithLinks(sticker.content).map((fragment, index) => (
                                fragment.type === 'link' ? (
                                    <a
                                        key={index}
                                        href={fragment.url}
                                        className={styles.stickerLink}
                                        target={openInNewTab ? '_blank' : '_self'}
                                        rel={openInNewTab ? 'noopener noreferrer' : undefined}
                                        onMouseDown={(event) => event.stopPropagation()}
                                        onPointerDown={(event) => event.stopPropagation()}
                                        onClick={(event) => event.stopPropagation()}
                                    >
                                        {fragment.content}
                                    </a>
                                ) : (
                                    <span key={index}>{fragment.content}</span>
                                )
                            ))
                            : sticker.content}
                    </span>
                </div>
            )}
        </div>
    );
};

export const StickerContent: React.FC<StickerContentProps> = ({
    sticker,
    isDragging,
    isCreativeMode,
    imageNaturalWidth,
    resolvedImageUrl,
    isSvgImage,
    svgText,
    alternateSvgText = null,
    showAlternateIcon = false,
    onImageLoad,
    onImageClick,
    onTextClick,
    onResizeStart,
    onToggleCheckbox,
}) => {

    if (sticker.type === 'drawing' && sticker.drawing) {
        const width = sticker.drawingSize?.width || 1;
        const height = sticker.drawingSize?.height || 1;
        return (
            <svg
                className={[
                    styles.drawingSticker,
                    isDragging && styles.dragging,
                    isCreativeMode && styles.creativeHover,
                ].filter(Boolean).join(' ')}
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
            >
                <DrawingShape drawing={sticker.drawing} />
            </svg>
        );
    }

    if (sticker.type === 'text') {
        return (
            <TextStickerContent
                sticker={sticker}
                isDragging={isDragging}
                isCreativeMode={isCreativeMode}
                onToggleCheckbox={onToggleCheckbox}
                onTextClick={onTextClick}
            />
        );
    }

    const imageWidth = Math.min(imageNaturalWidth, IMAGE_MAX_WIDTH);
    // The whole sticker visual is uniformly scaled. Keep the resize affordance at a
    // stable screen size so large/small stickers do not make the handle unwieldy.
    const inverseStickerScale = 1 / Math.max(0.1, sticker.scale || 1);
    const resizeHandleStyle: React.CSSProperties = {
        transform: `scale(${inverseStickerScale})`,
        transformOrigin: 'bottom right',
    };
    if (sticker.imagePresentation === 'vectorIcon' && svgText) {
        return (
            <div
                className={[
                    styles.imageContainer,
                    getStickerLinkTarget(sticker) && styles.linkedImageContainer,
                    styles.svgStickerWrapper,
                    isDragging && styles.dragging,
                    isCreativeMode && styles.creativeHover,
                ].filter(Boolean).join(' ')}
                onClick={onImageClick}
                title={getStickerLinkTarget(sticker) || undefined}
            >
                <div
                    className={[
                        styles.imageSticker,
                        styles.svgSticker,
                        styles.vectorIconSticker,
                        styles.inlineVectorIconSticker,
                        alternateSvgText && styles.iconSwapSticker,
                    ].filter(Boolean).join(' ')}
                    style={{ width: imageWidth }}
                >
                    {alternateSvgText ? (
                        <>
                            <div
                                className={`${styles.iconSwapLayer} ${!showAlternateIcon ? styles.iconSwapLayerActive : ''}`}
                                dangerouslySetInnerHTML={{ __html: svgText }}
                            />
                            <div
                                className={`${styles.iconSwapLayer} ${showAlternateIcon ? styles.iconSwapLayerActive : ''}`}
                                dangerouslySetInnerHTML={{ __html: alternateSvgText }}
                            />
                        </>
                    ) : (
                        <div className={`${styles.iconSwapLayer} ${styles.iconSwapLayerActive}`} dangerouslySetInnerHTML={{ __html: svgText }} />
                    )}
                </div>
                <div className={styles.resizeHandle} style={resizeHandleStyle} onMouseDown={onResizeStart} />
            </div>
        );
    }

    return (
        <div
            className={[
                styles.imageContainer,
                getStickerLinkTarget(sticker) && styles.linkedImageContainer,
                isSvgImage && styles.svgStickerWrapper,
                isSvgImage && isDragging && styles.dragging,
                isSvgImage && isCreativeMode && styles.creativeHover,
            ].filter(Boolean).join(' ')}
            onClick={onImageClick}
            title={getStickerLinkTarget(sticker) || undefined}
        >
            <img
                src={resolvedImageUrl || ''}
                alt="sticker"
                className={[
                    styles.imageSticker,
                    isSvgImage && styles.svgSticker,
                    isSvgImage && sticker.imagePresentation === 'vectorIcon' && styles.vectorIconSticker,
                    !isSvgImage && isDragging && styles.dragging,
                    !isSvgImage && isCreativeMode && styles.creativeHover,
                    sticker.hideStroke && styles.noStickerStroke,
                ].filter(Boolean).join(' ')}
                style={{ width: imageWidth }}
                data-vector-sticker-id={sticker.imagePresentation === 'vectorIcon' ? sticker.id : undefined}
                draggable={false}
                decoding="async"
                onLoad={(event) => {
                    onImageLoad(event);
                    // The visibility window mounts stickers several screens early.
                    // Ask Chromium to finish decode while the image is still offscreen
                    // instead of paying that worker/raster cost as it becomes visible.
                    void event.currentTarget.decode().catch(() => undefined);
                }}
            />
            <div className={styles.resizeHandle} style={resizeHandleStyle} onMouseDown={onResizeStart} />
        </div>
    );
};
