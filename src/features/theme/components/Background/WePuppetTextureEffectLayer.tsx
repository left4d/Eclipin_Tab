import React from 'react';
import type { ImportedWePuppetAnimationLayer, ImportedWePuppetMesh } from '@/features/theme/utils/wallpaperEngineImportedScene';
import { WeImageEffectLayer, type RuntimeTextureEffect } from './WeImageEffectLayer';
import { WePuppetMeshLayer, type WePuppetMeshLayerHandle } from './WePuppetMeshLayer';

interface WePuppetTextureEffectLayerProps {
    src: string;
    mesh: ImportedWePuppetMesh;
    modelSrc?: string | null;
    animationLayers?: ImportedWePuppetAnimationLayer[];
    animationMode?: '2d' | 'orthographic3d';
    effects: RuntimeTextureEffect[];
    className?: string;
    style?: React.CSSProperties;
    dataSource?: string;
    timeOriginMs: number;
}

/**
 * WE puppet effect masks in the regression corpus are authored in atlas UV
 * space (their aspect ratio follows the source atlas, not the assembled mesh).
 * Therefore run the ordinary image-effect chain on the atlas first, then feed
 * the processed atlas into the puppet mesh sampler. This deliberately does not
 * pretend that post-raster rectangular effects are equivalent.
 */
export const WePuppetTextureEffectLayer: React.FC<WePuppetTextureEffectLayerProps> = ({
    src,
    mesh,
    modelSrc = null,
    animationLayers = [],
    animationMode,
    effects,
    className,
    style,
    dataSource,
    timeOriginMs,
}) => {
    const puppetRef = React.useRef<WePuppetMeshLayerHandle | null>(null);
    const handleAtlasFrame = React.useCallback((canvas: HTMLCanvasElement) => {
        puppetRef.current?.updateTexture(canvas);
    }, []);

    return (
        <>
            <WePuppetMeshLayer
                ref={puppetRef}
                src={src}
                mesh={mesh}
                modelSrc={modelSrc}
                animationLayers={animationLayers}
                animationMode={animationMode}
                timeOriginMs={timeOriginMs}
                className={className}
                dataSource={dataSource}
                style={style}
            />
            <WeImageEffectLayer
                src={src}
                effects={effects}
                className=""
                dataSource="puppetAtlas"
                timeOriginMs={timeOriginMs}
                onFrame={handleAtlasFrame}
                style={{ display: 'none' }}
            />
        </>
    );
};
