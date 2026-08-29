import React from 'react';
import type { ImportedWePuppetAttachmentBinding, ImportedWePoint } from '@/features/theme/utils/wallpaperEngineImportedScene';
import {
    convertWallpaperEnginePuppetAttachmentTransformToBrowser,
    createWallpaperEnginePuppet2dSkinningState,
    sampleWallpaperEnginePuppetAttachmentTransform2d,
} from '@/features/theme/utils/wallpaperEnginePuppetAnimation';
import { parseWallpaperEnginePuppetModel } from '@/features/theme/utils/wallpaperEnginePuppetModel';

interface WePuppetAttachmentFrameProps {
    binding: ImportedWePuppetAttachmentBinding;
    modelSrc: string | null;
    timeOriginMs: number;
    parallaxOffset: ImportedWePoint;
    zIndex: number;
    children: React.ReactNode;
}

const matrixCss = (matrix: { a: number; b: number; c: number; d: number; tx: number; ty: number }): string => (
    `matrix(${matrix.a}, ${matrix.b}, ${matrix.c}, ${matrix.d}, ${matrix.tx}, ${matrix.ty})`
);

const parsedModelByUrl = new Map<string, Promise<ReturnType<typeof parseWallpaperEnginePuppetModel>>>();

const loadParsedPuppetModel = (url: string) => {
    const cached = parsedModelByUrl.get(url);
    if (cached) return cached;
    const pending = fetch(url)
        .then((response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.arrayBuffer();
        })
        .then((buffer) => parseWallpaperEnginePuppetModel(new Uint8Array(buffer)))
        .catch((error) => {
            parsedModelByUrl.delete(url);
            throw error;
        });
    parsedModelByUrl.set(url, pending);
    return pending;
};

/**
 * Preserve Wallpaper Engine's named Puppet attachment hierarchy without
 * flattening the child into a static parent transform. The outer node applies
 * the parent scene transform; the inner node tracks the named MDAT attachment
 * bone in parent-model coordinates. Child content stays in attachment-local
 * coordinates and therefore follows the Puppet while keeping normal z-order.
 */
export const WePuppetAttachmentFrame: React.FC<WePuppetAttachmentFrameProps> = ({
    binding,
    modelSrc,
    timeOriginMs,
    parallaxOffset,
    zIndex,
    children,
}) => {
    const attachmentRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        const element = attachmentRef.current;
        if (!element) return undefined;
        element.style.transform = matrixCss(binding.bindTransform);
        if (!modelSrc || binding.parentAnimationMode !== '2d') return undefined;

        let disposed = false;
        let rafId = 0;
        const cancelFrame = () => {
            if (rafId) window.cancelAnimationFrame(rafId);
            rafId = 0;
        };

        void loadParsedPuppetModel(modelSrc)
            .then((model) => {
                if (disposed || !model) return;
                const attachment = model.attachments.find((candidate) => (
                    candidate.name === binding.name && candidate.boneIndex === binding.boneIndex
                ));
                if (!attachment) return;
                const state = createWallpaperEnginePuppet2dSkinningState(model, binding.parentAnimationLayers);
                if (!state) return;

                const tick = (now: number) => {
                    rafId = 0;
                    if (disposed) return;
                    if (!document.hidden) {
                        const sampled = sampleWallpaperEnginePuppetAttachmentTransform2d(
                            state,
                            attachment,
                            Math.max(0, now - timeOriginMs),
                        );
                        if (sampled) {
                            element.style.transform = matrixCss(
                                convertWallpaperEnginePuppetAttachmentTransformToBrowser(sampled),
                            );
                        }
                    }
                    rafId = window.requestAnimationFrame(tick);
                };
                rafId = window.requestAnimationFrame(tick);
            })
            .catch((error) => {
                if (!disposed) console.warn('Wallpaper Engine Puppet attachment retained its reference pose:', error);
            });

        return () => {
            disposed = true;
            cancelFrame();
        };
    }, [binding, modelSrc, timeOriginMs]);

    return (
        <div
            style={{
                position: 'absolute',
                left: `${binding.parentOrigin.x + parallaxOffset.x}px`,
                top: `${binding.parentOrigin.y + parallaxOffset.y}px`,
                zIndex,
                transformOrigin: '0 0',
                transform: `rotate(${binding.parentRotationDeg}deg) scale(${binding.parentScale.x}, ${binding.parentScale.y})`,
                pointerEvents: 'none',
            }}
        >
            <div
                ref={attachmentRef}
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    transformOrigin: '0 0',
                    transform: matrixCss(binding.bindTransform),
                }}
            >
                {children}
            </div>
        </div>
    );
};
