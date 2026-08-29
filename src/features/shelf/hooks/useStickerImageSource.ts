import { useEffect, useState } from 'react';
import type { Sticker } from '@/shared/types';
import { db } from '@/shared/utils/db';
import { useThemeData } from '@/features/theme/context/ThemeContext';
import { adaptSvgPaintForDarkBackground, ensureVisibleSvgPaint } from '@/features/vector-icons/utils/svgSanitizer';
import { acquireStickerImageUrl, releaseStickerImageUrl } from '@/features/shelf/services/stickerImageUrlCache';
import { useVisibleSessionMount } from '@/shared/hooks/useVisibleSessionMount';
import { rasterizeSvgStickerPreview } from '@/features/theme/utils/imageCompression';
import { getComplexSvgStickerPreviewSpec } from '@/features/shelf/utils/svgStickerPreview';

interface StickerImageSource {
    resolvedImageUrl: string | null;
    isSvgImage: boolean;
    svgText: string | null;
}

const EMPTY_SOURCE: StickerImageSource = {
    resolvedImageUrl: null,
    isSvgImage: false,
    svgText: null,
};

const isSvgDataUrl = (value: string) => value.startsWith('data:image/svg+xml');

/**
 * 解析图片贴纸的数据源。
 *
 * 新格式只在贴纸中保存 IndexedDB key；旧格式 data URL 仍然可以直接展示。
 * Blob URL 使用可见会话缓存：新标签页可见时快速翻页直接复用 URL/解码缓存；
 * 一旦切到后台，图片贴纸释放引用，零引用 Blob URL 会立即回收。
 */
export const useStickerImageSource = (sticker: Sticker, contentOverride?: string): StickerImageSource => {
    const { theme } = useThemeData();
    const documentVisible = useVisibleSessionMount(true);
    const [source, setSource] = useState<StickerImageSource>(EMPTY_SOURCE);
    const sourceContent = contentOverride === undefined ? sticker.content : contentOverride;

    useEffect(() => {
        if (sticker.type !== 'image' || !sourceContent) {
            setSource(EMPTY_SOURCE);
            return;
        }

        const isDarkBackground = theme === 'dark' || document.documentElement.getAttribute('data-background-brightness') === 'dark';
        const prepareVectorSvg = (svg: string) => {
            const visibleSvg = ensureVisibleSvgPaint(svg);
            return isDarkBackground ? adaptSvgPaintForDarkBackground(visibleSvg) : visibleSvg;
        };

        if (sourceContent.startsWith('data:')) {
            const isSvg = isSvgDataUrl(sourceContent);
            const rawSvg = isSvg && sticker.imagePresentation === 'vectorIcon'
                ? decodeURIComponent(sourceContent.slice(sourceContent.indexOf(',') + 1))
                : null;
            setSource({
                resolvedImageUrl: sourceContent,
                isSvgImage: isSvg,
                svgText: rawSvg === null ? null : prepareVectorSvg(rawSvg),
            });
            return;
        }

        if (!documentVisible) {
            setSource(EMPTY_SOURCE);
            return;
        }

        const cacheKey = `${sourceContent}\u0000${sticker.imagePresentation ?? ''}\u0000${isDarkBackground ? 'dark' : 'light'}`;
        let cancelled = false;
        let acquired = false;
        setSource(EMPTY_SOURCE);

        void acquireStickerImageUrl(cacheKey, async () => {
            const item = await db.getStickerImage(sourceContent);
            if (!item) return null;
            const originalIsSvg = item.data.type === 'image/svg+xml';
            const rawSvg = originalIsSvg ? await item.data.text() : null;
            const sourceSvg = rawSvg !== null && sticker.imagePresentation === 'vectorIcon'
                ? prepareVectorSvg(rawSvg)
                : null;
            let sourceBlob = sourceSvg !== null
                ? new Blob([sourceSvg], { type: 'image/svg+xml' })
                : item.data;

            // Bitmap-traced artwork (for example ImageTracer output with
            // thousands of paths) is cheap to store as SVG but expensive to
            // repaint/raster during scroll. Preserve the original DB blob and
            // create only a visible-session PNG preview for rendering.
            if (rawSvg !== null && sticker.imagePresentation !== 'vectorIcon') {
                const previewSpec = getComplexSvgStickerPreviewSpec(rawSvg);
                if (previewSpec) {
                    const previewBlob = await rasterizeSvgStickerPreview(
                        item.data,
                        previewSpec.width,
                        previewSpec.height,
                    );
                    if (previewBlob) sourceBlob = previewBlob;
                }
            }

            return {
                resolvedImageUrl: URL.createObjectURL(sourceBlob),
                // Preserve SVG presentation semantics (alpha-based outline) even
                // when the actual session render source is a PNG preview.
                isSvgImage: originalIsSvg,
                svgText: sourceSvg,
            };
        }).then((resolved) => {
            if (!resolved) return;
            acquired = true;
            if (cancelled) {
                releaseStickerImageUrl(cacheKey);
                return;
            }
            setSource(resolved);
        }).catch((error) => {
            if (!cancelled) console.error('Failed to resolve sticker image:', error);
        });

        return () => {
            cancelled = true;
            if (acquired) releaseStickerImageUrl(cacheKey);
        };
    }, [documentVisible, sourceContent, sticker.imagePresentation, sticker.type, theme]);

    return source;
};
