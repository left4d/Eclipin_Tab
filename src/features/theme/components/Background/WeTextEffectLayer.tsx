import React from 'react';
import type { ImportedWeSize } from '@/features/theme/utils/wallpaperEngineImportedScene';
import { WeImageEffectLayer, type RuntimeTextureEffect } from './WeImageEffectLayer';

interface WeTextEffectLayerProps {
    text: string;
    logicalSize: ImportedWeSize;
    fontFamily: string;
    fontSize: number;
    color: string;
    horizontalAlign: 'left' | 'center' | 'right';
    verticalAlign: 'top' | 'center' | 'bottom';
    effects: RuntimeTextureEffect[];
    className: string;
    fallbackClassName: string;
    style: React.CSSProperties;
    fallbackStyle: React.CSSProperties;
    dataSource: string;
    timeOriginMs: number;
}

const normalizeLines = (text: string): string[] => text.replace(/\r\n?/g, '\n').split('\n');

/**
 * Rasterize a WE text surface before sending it through the same ordered
 * WebGL effect pipeline used by image and Puppet surfaces. This intentionally
 * uses browser font shaping instead of reimplementing WE's font renderer.
 */
const rasterizeTextSurface = (
    text: string,
    logicalSize: ImportedWeSize,
    fontFamily: string,
    fontSize: number,
    color: string,
    horizontalAlign: 'left' | 'center' | 'right',
    verticalAlign: 'top' | 'center' | 'bottom',
): string => {
    const width = Math.max(1, Math.round(logicalSize.width));
    const height = Math.max(1, Math.round(logicalSize.height));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D canvas is unavailable for Wallpaper Engine text rasterization.');

    context.clearRect(0, 0, width, height);
    context.font = `${fontSize}px ${fontFamily}`;
    context.fillStyle = color;
    context.textAlign = horizontalAlign;
    context.textBaseline = 'middle';

    const lines = normalizeLines(text);
    const lineHeight = fontSize * 1.2;
    const blockHeight = Math.max(lineHeight, lines.length * lineHeight);
    const blockTop = verticalAlign === 'center'
        ? (height - blockHeight) / 2
        : verticalAlign === 'bottom' ? height - blockHeight : 0;
    const x = horizontalAlign === 'center' ? width / 2 : horizontalAlign === 'right' ? width : 0;

    lines.forEach((line, index) => {
        context.fillText(line, x, blockTop + lineHeight * (index + 0.5));
    });

    return canvas.toDataURL('image/png');
};

export const WeTextEffectLayer: React.FC<WeTextEffectLayerProps> = ({
    text,
    logicalSize,
    fontFamily,
    fontSize,
    color,
    horizontalAlign,
    verticalAlign,
    effects,
    className,
    fallbackClassName,
    style,
    fallbackStyle,
    dataSource,
    timeOriginMs,
}) => {
    const [sourceUrl, setSourceUrl] = React.useState<string | null>(null);

    React.useEffect(() => {
        let cancelled = false;

        const rasterize = async () => {
            // @font-face rules are committed by WeSceneRenderer before this
            // effect runs. Waiting here prevents the first raster from locking
            // in the browser fallback font while the WE font is still loading.
            if (typeof document !== 'undefined' && 'fonts' in document) {
                try {
                    await document.fonts.load(`${fontSize}px ${fontFamily}`, text || '0');
                } catch {
                    // The 2D canvas still has a deterministic browser fallback.
                }
            }
            if (cancelled) return;
            const nextUrl = rasterizeTextSurface(
                text,
                logicalSize,
                fontFamily,
                fontSize,
                color,
                horizontalAlign,
                verticalAlign,
            );
            if (!cancelled) setSourceUrl(nextUrl);
        };

        void rasterize().catch((error) => {
            if (!cancelled) {
                console.warn('Wallpaper Engine text-effect rasterization fell back to DOM text:', error);
                setSourceUrl(null);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [color, fontFamily, fontSize, horizontalAlign, logicalSize.height, logicalSize.width, text, verticalAlign]);

    if (!sourceUrl) {
        return (
            <div
                className={fallbackClassName}
                data-we-source={dataSource}
                data-we-effect-pending="true"
                style={fallbackStyle}
            >
                {text}
            </div>
        );
    }

    return (
        <WeImageEffectLayer
            src={sourceUrl}
            effects={effects}
            className={className}
            style={style}
            dataSource={dataSource}
            timeOriginMs={timeOriginMs}
        />
    );
};
