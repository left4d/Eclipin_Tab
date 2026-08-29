import React from 'react';
import { db, isWeSceneWallpaperItem } from '@/shared/utils/db';
import { getWallpaperEngineSceneResourcesByPaths } from '@/features/theme/services/wallpaperEngineSceneDb';
import {
    createWeAnimationRenderPlan,
    getWeAnimatedLayerCenter,
    getWeAnimationFrameIndex,
    getWeAnimationLayerSourceCandidates,
    getWeAnimationLayerSourcePath,
    getWeAnimationResourceWindow,
    getWePointAnimationFramePosition,
    type WeAnimationRenderLayer,
    type WeAnimationRenderPlan,
} from '@/features/theme/utils/wallpaperEngineAnimationRenderer';
import { getWeSceneCoverScale } from '@/features/theme/utils/wallpaperEngineStaticRenderer';
import { formatWallpaperEngineDynamicText } from '@/features/theme/utils/wallpaperEngineDynamicText';
import { getWallpaperEngineBuiltinFontPublicPath } from '@/features/theme/utils/wallpaperEngineBuiltinFonts';
import { getWeChromaticAberrationChannelOffsets } from '@/features/theme/utils/wallpaperEnginePostProcessRenderer';
import { getWeTextAnchorCenterOffset, wePointSizeToScenePixels } from '@/features/theme/utils/wallpaperEngineTextMetrics';
import {
    getWeParallaxCameraOffset,
    getWeParallaxCameraOverscan,
    getWeNormalizedPointer,
    getWeParallaxLayerOffset,
    isWeParallaxActive,
    stepWeParallaxPointer,
    type WeNormalizedPointer,
} from '@/features/theme/utils/wallpaperEngineParallaxRenderer';
import { WePuppetMeshLayer } from './WePuppetMeshLayer';
import { WePuppetAttachmentFrame } from './WePuppetAttachmentFrame';
import { WePuppetTextureEffectLayer } from './WePuppetTextureEffectLayer';
import { WeCompositionLayer } from './WeCompositionLayer';
import { WeImageEffectLayer, type RuntimeTextureEffect } from './WeImageEffectLayer';
import { WeTextEffectLayer } from './WeTextEffectLayer';
import styles from './WeSceneRenderer.module.css';

const viewportSize = () => ({
    width: typeof window === 'undefined' ? 1 : Math.max(1, window.innerWidth),
    height: typeof window === 'undefined' ? 1 : Math.max(1, window.innerHeight),
});

const weFontFamilyForPath = (path: string): string => {
    let hash = 2166136261;
    for (let index = 0; index < path.length; index += 1) {
        hash ^= path.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return `tablab-we-font-${(hash >>> 0).toString(36)}`;
};



const useViewportSize = () => {
    const [size, setSize] = React.useState(viewportSize);

    React.useEffect(() => {
        const update = () => setSize(viewportSize());
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    return size;
};

const frameSignature = (plan: WeAnimationRenderPlan, elapsedMs: number): string => {
    const parts: string[] = [];
    for (const layer of plan.layers) {
        if (layer.source.kind === 'frameAnimation') {
            parts.push(`${layer.id}:f${getWeAnimationFrameIndex(elapsedMs, layer.source.fps, layer.source.frames.length)}`);
        }
        layer.centerAnimations.forEach((animation, index) => {
            parts.push(`${layer.id}:p${index}:${Math.floor(getWePointAnimationFramePosition(animation, elapsedMs))}`);
        });
    }
    return parts.join('|');
};

/**
 * Animation time excludes periods where the tab is hidden. requestAnimationFrame
 * is used as the browser-facing clock, but React state only updates when at
 * least one animation layer actually changes frame.
 */
const useWeAnimationElapsedMs = (plan: WeAnimationRenderPlan | null, resetKey: string): number => {
    const [elapsedMs, setElapsedMs] = React.useState(0);

    React.useEffect(() => {
        setElapsedMs(0);
        if (
            !plan
            || (plan.animationLayerCount === 0 && plan.propertyAnimationLayerCount === 0)
            || typeof document === 'undefined'
        ) return undefined;

        let rafId = 0;
        let accumulatedMs = 0;
        let visibleStartedAt: number | null = null;
        let lastSignature = frameSignature(plan, 0);
        let disposed = false;

        const cancelFrame = () => {
            if (rafId) window.cancelAnimationFrame(rafId);
            rafId = 0;
        };

        const tick = (now: number) => {
            rafId = 0;
            if (disposed || document.hidden) return;
            if (visibleStartedAt === null) visibleStartedAt = now;
            const nextElapsedMs = accumulatedMs + (now - visibleStartedAt);
            const signature = frameSignature(plan, nextElapsedMs);
            if (signature !== lastSignature) {
                lastSignature = signature;
                setElapsedMs(nextElapsedMs);
            }
            rafId = window.requestAnimationFrame(tick);
        };

        const startFrame = () => {
            if (!disposed && !document.hidden && !rafId) {
                rafId = window.requestAnimationFrame(tick);
            }
        };

        const onVisibilityChange = () => {
            const now = window.performance.now();
            if (document.hidden) {
                if (visibleStartedAt !== null) accumulatedMs += now - visibleStartedAt;
                visibleStartedAt = null;
                cancelFrame();
                return;
            }
            visibleStartedAt = null;
            startFrame();
        };

        document.addEventListener('visibilitychange', onVisibilityChange);
        startFrame();
        return () => {
            disposed = true;
            cancelFrame();
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [plan, resetKey]);

    return elapsedMs;
};


type WeDynamicTextRefresh = 'second' | 'minute' | 'day';

const getWeDynamicTextRefresh = (plan: WeAnimationRenderPlan | null): WeDynamicTextRefresh | null => {
    if (!plan) return null;
    let refresh: WeDynamicTextRefresh | null = null;
    const rank: Record<WeDynamicTextRefresh, number> = { day: 0, minute: 1, second: 2 };
    for (const layer of plan.layers) {
        if (layer.source.kind !== 'text' || !layer.source.dynamicText) continue;
        const next = layer.source.dynamicText.refresh;
        if (!refresh || rank[next] > rank[refresh]) refresh = next;
    }
    return refresh;
};

const getNextWeDynamicTextDelay = (refresh: WeDynamicTextRefresh, timestamp: number): number => {
    const date = new Date(timestamp);
    if (refresh === 'second') return Math.max(25, 1000 - date.getMilliseconds() + 25);
    if (refresh === 'minute') {
        return Math.max(25, (60 - date.getSeconds()) * 1000 - date.getMilliseconds() + 25);
    }
    const nextDay = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + 1,
        0,
        0,
        0,
        25,
    );
    return Math.max(25, nextDay.getTime() - timestamp);
};

const useWeDynamicTextTimestamp = (plan: WeAnimationRenderPlan | null, resetKey: string): number => {
    const [timestamp, setTimestamp] = React.useState(() => Date.now());
    const refresh = getWeDynamicTextRefresh(plan);

    React.useEffect(() => {
        setTimestamp(Date.now());
        if (!refresh || typeof document === 'undefined' || typeof window === 'undefined') return undefined;

        let timeoutId = 0;
        let disposed = false;
        const cancel = () => {
            if (timeoutId) window.clearTimeout(timeoutId);
            timeoutId = 0;
        };
        const schedule = () => {
            cancel();
            if (disposed || document.hidden) return;
            const now = Date.now();
            timeoutId = window.setTimeout(() => {
                timeoutId = 0;
                if (disposed || document.hidden) return;
                setTimestamp(Date.now());
                schedule();
            }, getNextWeDynamicTextDelay(refresh, now));
        };
        const onVisibilityChange = () => {
            cancel();
            if (document.hidden) return;
            setTimestamp(Date.now());
            schedule();
        };

        document.addEventListener('visibilitychange', onVisibilityChange);
        schedule();
        return () => {
            disposed = true;
            cancel();
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [refresh, resetKey]);

    return timestamp;
};

const useWeParallaxPointer = (plan: WeAnimationRenderPlan | null, resetKey: string): WeNormalizedPointer => {
    const [pointer, setPointer] = React.useState<WeNormalizedPointer>({ x: 0, y: 0 });

    React.useEffect(() => {
        setPointer({ x: 0, y: 0 });
        if (!plan || !isWeParallaxActive(plan.cameraParallax) || typeof window === 'undefined') return undefined;

        let current: WeNormalizedPointer = { x: 0, y: 0 };
        let target: WeNormalizedPointer = { x: 0, y: 0 };
        let rafId = 0;
        let lastTime = window.performance.now();
        let disposed = false;

        const cancelFrame = () => {
            if (rafId) window.cancelAnimationFrame(rafId);
            rafId = 0;
        };

        const tick = (now: number) => {
            rafId = 0;
            if (disposed) return;
            const next = stepWeParallaxPointer(current, target, plan.cameraParallax.delay, now - lastTime);
            lastTime = now;
            const moved = Math.abs(next.x - current.x) > 0.0001 || Math.abs(next.y - current.y) > 0.0001;
            const unsettled = Math.abs(target.x - next.x) > 0.0005 || Math.abs(target.y - next.y) > 0.0005;
            current = next;
            if (moved) setPointer(next);
            if (unsettled) rafId = window.requestAnimationFrame(tick);
        };

        const isUnsettled = () => (
            Math.abs(target.x - current.x) > 0.0005 || Math.abs(target.y - current.y) > 0.0005
        );

        const startFrame = () => {
            if (!rafId && !disposed && !document.hidden && isUnsettled()) {
                lastTime = window.performance.now();
                rafId = window.requestAnimationFrame(tick);
            }
        };

        const onPointerMove = (event: PointerEvent) => {
            target = getWeNormalizedPointer(event.clientX, event.clientY, viewportSize());
            startFrame();
        };

        const resetTarget = () => {
            target = { x: 0, y: 0 };
            startFrame();
        };

        const onVisibilityChange = () => {
            if (document.hidden) {
                cancelFrame();
                return;
            }
            lastTime = window.performance.now();
            startFrame();
        };

        window.addEventListener('pointermove', onPointerMove, { passive: true });
        window.addEventListener('blur', resetTarget);
        document.addEventListener('mouseleave', resetTarget);
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            disposed = true;
            cancelFrame();
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('blur', resetTarget);
            document.removeEventListener('mouseleave', resetTarget);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [plan, resetKey]);

    return pointer;
};

const useWeSceneResourceUrls = (
    wallpaperId: string,
    resourcePaths: string[],
): Map<string, string> => {
    const cacheRef = React.useRef(new Map<string, string>());
    const desiredRef = React.useRef(new Set<string>());
    const [urls, setUrls] = React.useState<Map<string, string>>(() => new Map());
    const resourceKey = resourcePaths.join('\u0000');

    React.useEffect(() => {
        desiredRef.current = new Set(resourcePaths);
        let cancelled = false;

        const releaseCachedUrls = () => {
            for (const url of cacheRef.current.values()) URL.revokeObjectURL(url);
            cacheRef.current.clear();

            // Keep the last displayed URL strings in React state while hidden.
            // Revoking the object URLs releases the backing Blob registrations,
            // but leaving the mounted DOM/WebGL layers untouched preserves the
            // already-decoded last frame until the visible resource window has
            // been rebuilt. Clearing state here guaranteed a white frame on
            // resume because every image layer disappeared before IndexedDB
            // could create replacement URLs.
        };

        const synchronize = async () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
            const missingPaths = resourcePaths.filter((path) => !cacheRef.current.has(path));
            const resources = await getWallpaperEngineSceneResourcesByPaths(wallpaperId, missingPaths);
            if (cancelled || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) return;
            for (const path of missingPaths) {
                if (cancelled || !desiredRef.current.has(path) || cacheRef.current.has(path)) continue;
                const resource = resources.get(path);
                if (!resource) continue;
                cacheRef.current.set(path, URL.createObjectURL(resource.data));
            }

            if (cancelled) return;
            // Keep the previous frame alive until the replacement window is ready.
            // The visible-session cache stays bounded to static + the forward frame window.
            for (const [path, url] of cacheRef.current) {
                if (desiredRef.current.has(path)) continue;
                URL.revokeObjectURL(url);
                cacheRef.current.delete(path);
            }
            setUrls(new Map(cacheRef.current));
        };

        const loadVisibleWindow = () => {
            void synchronize().catch((error) => {
                if (!cancelled) console.error('Failed to load Wallpaper Engine scene resource window:', error);
            });
        };
        const onVisibilityChange = () => {
            if (document.visibilityState === 'hidden') releaseCachedUrls();
            else loadVisibleWindow();
        };

        document.addEventListener('visibilitychange', onVisibilityChange);
        loadVisibleWindow();
        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [resourceKey, wallpaperId]);

    React.useEffect(() => () => {
        for (const url of cacheRef.current.values()) URL.revokeObjectURL(url);
        cacheRef.current.clear();
        desiredRef.current.clear();
    }, [wallpaperId]);

    return urls;
};

const withWeOpacityMasks = (
    style: React.CSSProperties,
    maskPaths: string[],
    urls: Map<string, string>,
): React.CSSProperties => {
    if (!maskPaths.length) return style;
    const maskUrls = maskPaths.map((path) => urls.get(path)).filter((url): url is string => Boolean(url));
    if (maskUrls.length !== maskPaths.length) return style;

    const images = maskUrls.map((url) => `url("${url}")`).join(', ');
    const modes = maskUrls.map(() => 'luminance').join(', ');
    const sizes = maskUrls.map(() => '100% 100%').join(', ');
    const repeats = maskUrls.map(() => 'no-repeat').join(', ');
    const composites = maskUrls.map(() => 'intersect').join(', ');
    return {
        ...style,
        maskImage: images,
        maskMode: modes,
        maskSize: sizes,
        maskRepeat: repeats,
        maskComposite: composites,
    };
};

const resolveRuntimeTextureEffects = (
    effects: WeAnimationRenderLayer['textureEffects'],
    resourceUrls: Map<string, string>,
): RuntimeTextureEffect[] => effects.map((effect) => {
    if (effect.kind === 'opacity') {
        return {
            ...effect,
            maskUrl: effect.maskPath ? resourceUrls.get(effect.maskPath) ?? null : null,
        };
    }
    if (effect.kind === 'waterWaves') {
        return {
            ...effect,
            maskUrl: effect.maskPath ? resourceUrls.get(effect.maskPath) ?? null : null,
            timeOffsetUrl: effect.timeOffsetPath ? resourceUrls.get(effect.timeOffsetPath) ?? null : null,
        };
    }
    if (effect.kind === 'foliageSway') {
        return {
            ...effect,
            maskUrl: effect.maskPath ? resourceUrls.get(effect.maskPath) ?? null : null,
            noiseUrl: effect.noisePath ? resourceUrls.get(effect.noisePath) ?? null : null,
        };
    }
    if (effect.kind === 'waterFlow') {
        return {
            ...effect,
            flowMapUrl: effect.flowMapPath ? resourceUrls.get(effect.flowMapPath) ?? null : null,
            phaseUrl: resourceUrls.get(effect.phasePath) ?? null,
        };
    }
    if (effect.kind === 'shake') {
        return {
            ...effect,
            directionMapUrl: effect.directionMapPath ? resourceUrls.get(effect.directionMapPath) ?? null : null,
        };
    }
    if (effect.kind === 'blurPrecise') {
        return {
            ...effect,
            maskUrl: effect.maskPath ? resourceUrls.get(effect.maskPath) ?? null : null,
        };
    }
    if (effect.kind === 'shine') {
        return {
            ...effect,
            maskUrl: effect.maskPath ? resourceUrls.get(effect.maskPath) ?? null : null,
            noiseUrl: effect.noisePath ? resourceUrls.get(effect.noisePath) ?? null : null,
        };
    }
    if (effect.kind === 'godRays') {
        return {
            ...effect,
            maskUrl: effect.maskPath ? resourceUrls.get(effect.maskPath) ?? null : null,
        };
    }
    if (effect.kind === 'waterRipple') {
        return {
            ...effect,
            maskUrl: effect.maskPath ? resourceUrls.get(effect.maskPath) ?? null : null,
            normalUrl: resourceUrls.get(effect.normalPath) ?? null,
        };
    }
    return effect;
});

const areRuntimeTextureEffectResourcesReady = (effects: RuntimeTextureEffect[]): boolean => effects.every((effect) => {
    if (effect.kind === 'opacity') return !effect.maskPath || Boolean(effect.maskUrl);
    if (effect.kind === 'waterWaves') {
        return (!effect.maskPath || Boolean(effect.maskUrl))
            && (!effect.timeOffsetPath || Boolean(effect.timeOffsetUrl));
    }
    if (effect.kind === 'foliageSway') {
        return (!effect.maskPath || Boolean(effect.maskUrl))
            && (!effect.noisePath || Boolean(effect.noiseUrl));
    }
    if (effect.kind === 'waterFlow') {
        return (!effect.flowMapPath || Boolean(effect.flowMapUrl)) && Boolean(effect.phaseUrl);
    }
    if (effect.kind === 'shake') return !effect.directionMapPath || Boolean(effect.directionMapUrl);
    if (effect.kind === 'blurPrecise') return !effect.maskPath || Boolean(effect.maskUrl);
    if (effect.kind === 'shine') {
        return (!effect.maskPath || Boolean(effect.maskUrl))
            && (!effect.noisePath || Boolean(effect.noiseUrl));
    }
    if (effect.kind === 'godRays') return !effect.maskPath || Boolean(effect.maskUrl);
    if (effect.kind === 'waterRipple') {
        return (!effect.maskPath || Boolean(effect.maskUrl)) && Boolean(effect.normalUrl);
    }
    return true;
});

const resolveLayerUrl = (
    layer: WeAnimationRenderLayer,
    elapsedMs: number,
    urls: Map<string, string>,
    retainedFramePaths: Map<string, string>,
): string | null => {
    if (layer.source.kind === 'solidColor' || layer.source.kind === 'text' || layer.source.kind === 'composition') return null;

    const retainedPath = layer.source.kind === 'frameAnimation'
        ? retainedFramePaths.get(layer.id) ?? null
        : null;
    const candidates = getWeAnimationLayerSourceCandidates(layer, elapsedMs, retainedPath);
    for (const path of candidates) {
        const url = urls.get(path);
        if (!url) continue;
        if (layer.source.kind === 'frameAnimation') retainedFramePaths.set(layer.id, path);
        return url;
    }
    return null;
};

export const WeSceneRenderer: React.FC<{ wallpaperId: string }> = ({ wallpaperId }) => {
    const [plan, setPlan] = React.useState<WeAnimationRenderPlan | null>(null);
    const retainedFramePathsRef = React.useRef(new Map<string, string>());
    const postProcessIdBase = React.useId().replace(/[^a-zA-Z0-9_-]/g, '');
    const viewport = useViewportSize();
    const effectTimeOriginMs = React.useMemo(
        () => (typeof performance === 'undefined' ? 0 : performance.now()),
        [wallpaperId],
    );

    React.useEffect(() => {
        let cancelled = false;

        const load = async () => {
            const item = await db.get(wallpaperId);
            if (cancelled || !item || !isWeSceneWallpaperItem(item)) return;

            const nextPlan = createWeAnimationRenderPlan(item.scene);
            if (!nextPlan) {
                console.warn('Ignored invalid Wallpaper Engine scene metadata:', wallpaperId);
                return;
            }
            if (nextPlan.fallbackTimingLayerCount > 0) {
                console.warn(
                    `Wallpaper Engine scene ${wallpaperId} has ${nextPlan.fallbackTimingLayerCount} frame animation layer(s) without retained FPS metadata; using the TabLab fallback.`,
                );
            }
            if (!cancelled) setPlan(nextPlan);
        };

        retainedFramePathsRef.current.clear();
        setPlan(null);
        void load().catch((error) => {
            if (!cancelled) console.error('Failed to load Wallpaper Engine scene:', error);
        });
        return () => {
            cancelled = true;
        };
    }, [wallpaperId]);

    const elapsedMs = useWeAnimationElapsedMs(plan, wallpaperId);
    const dynamicTextTimestamp = useWeDynamicTextTimestamp(plan, wallpaperId);
    const parallaxPointer = useWeParallaxPointer(plan, wallpaperId);
    const resourcePaths = React.useMemo(
        () => plan ? getWeAnimationResourceWindow(plan, elapsedMs) : [],
        [elapsedMs, plan],
    );
    const resourceUrls = useWeSceneResourceUrls(wallpaperId, resourcePaths);

    if (!plan) return null;

    const coverScale = getWeSceneCoverScale(plan.canvas, viewport);
    const cameraOffset = getWeParallaxCameraOffset(
        plan.canvas,
        plan.cameraParallax,
        plan.cameraParallaxSceneMotion,
        parallaxPointer,
    );
    const cameraOverscan = getWeParallaxCameraOverscan(
        plan.canvas,
        plan.cameraParallax,
        plan.cameraParallaxSceneMotion,
    );
    const chromaticFilters = plan.postProcessEffects
        .filter((effect) => effect.kind === 'chromaticAberration' && effect.strength > 0)
        .map((effect, index) => ({
            id: `we-chromatic-${postProcessIdBase}-${index}`,
            offsets: getWeChromaticAberrationChannelOffsets(plan.canvas, effect),
        }));
    const stageFilter = chromaticFilters.length > 0
        ? chromaticFilters.map((item) => `url(#${item.id})`).join(' ')
        : undefined;
    const currentAnimationPaths = new Set<string>();
    for (const layer of plan.layers) {
        if (layer.source.kind !== 'frameAnimation') continue;
        const path = getWeAnimationLayerSourcePath(layer, elapsedMs);
        if (path) currentAnimationPaths.add(path);
    }
    const preloadFrameUrls = new Set<string>();
    for (const path of resourcePaths) {
        if (currentAnimationPaths.has(path) || plan.staticResourcePaths.includes(path)) continue;
        const url = resourceUrls.get(path);
        if (url) preloadFrameUrls.add(url);
    }

    const fontFaces = new Map<string, string>();
    for (const layer of plan.layers) {
        if (layer.source.kind !== 'text') continue;

        if (layer.source.fontPath) {
            const url = resourceUrls.get(layer.source.fontPath);
            if (url) fontFaces.set(layer.source.fontPath, url);
            continue;
        }

        const builtinPath = getWallpaperEngineBuiltinFontPublicPath(layer.source.fontReference);
        if (!builtinPath || typeof document === 'undefined') continue;
        fontFaces.set(
            layer.source.fontReference!,
            new URL(builtinPath, document.baseURI).href,
        );
    }

    return (
        <div className={styles.root} data-we-renderer="frame-animation">
            {chromaticFilters.length > 0 && (
                <svg
                    aria-hidden="true"
                    width="0"
                    height="0"
                    className={styles.postProcessDefinitions}
                >
                    <defs>
                        {chromaticFilters.map(({ id, offsets }) => (
                            <filter
                                key={id}
                                id={id}
                                x={-plan.canvas.width * 0.05}
                                y={-plan.canvas.height * 0.05}
                                width={plan.canvas.width * 1.1}
                                height={plan.canvas.height * 1.1}
                                filterUnits="userSpaceOnUse"
                                primitiveUnits="userSpaceOnUse"
                                colorInterpolationFilters="sRGB"
                            >
                                <feColorMatrix
                                    in="SourceGraphic"
                                    type="matrix"
                                    values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
                                    result="red"
                                />
                                <feColorMatrix
                                    in="SourceGraphic"
                                    type="matrix"
                                    values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
                                    result="green"
                                />
                                <feColorMatrix
                                    in="SourceGraphic"
                                    type="matrix"
                                    values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
                                    result="blue"
                                />
                                <feOffset in="red" dx={offsets.red.x} dy={offsets.red.y} result="redShift" />
                                <feOffset in="green" dx={offsets.green.x} dy={offsets.green.y} result="greenShift" />
                                <feOffset in="blue" dx={offsets.blue.x} dy={offsets.blue.y} result="blueShift" />
                                <feComposite
                                    in="redShift"
                                    in2="greenShift"
                                    operator="arithmetic"
                                    k1="0"
                                    k2="1"
                                    k3="1"
                                    k4="0"
                                    result="redGreen"
                                />
                                <feComposite
                                    in="redGreen"
                                    in2="blueShift"
                                    operator="arithmetic"
                                    k1="0"
                                    k2="1"
                                    k3="1"
                                    k4="0"
                                />
                            </filter>
                        ))}
                    </defs>
                </svg>
            )}
            <div
                className={styles.stage}
                style={{
                    width: `${plan.canvas.width}px`,
                    height: `${plan.canvas.height}px`,
                    transform: `translate(-50%, -50%) scale(${coverScale * cameraOverscan}) translate(${cameraOffset.x}px, ${cameraOffset.y}px)`,
                    filter: stageFilter,
                }}
            >
                {[...fontFaces].map(([path, url]) => (
                    <style key={`font:${path}`}>
                        {`@font-face{font-family:"${weFontFamilyForPath(path)}";src:url("${url}");font-display:swap;}`}
                    </style>
                ))}
                {plan.layers.map((layer) => {
                    const animatedCenter = getWeAnimatedLayerCenter(layer, elapsedMs);
                    const parallaxOffset = getWeParallaxLayerOffset(
                        plan.canvas,
                        plan.cameraParallax,
                        layer.parallax,
                        parallaxPointer,
                        plan.cameraParallaxSceneMotion,
                    );
                    const textAnchorOffset = layer.source.kind === 'text'
                        ? getWeTextAnchorCenterOffset({
                            width: layer.size.width,
                            height: layer.size.height,
                            scaleX: layer.scale.x,
                            scaleY: layer.scale.y,
                            rotationDeg: layer.rotationDeg,
                            horizontalAlign: layer.source.horizontalAlign,
                            verticalAlign: layer.source.verticalAlign,
                        })
                        : { x: 0, y: 0 };
                    const puppetAttachment = layer.puppetAttachment;
                    const layerStyle = withWeOpacityMasks({
                        left: puppetAttachment
                            ? `${puppetAttachment.localCenter.x}px`
                            : `${animatedCenter.x + parallaxOffset.x + textAnchorOffset.x}px`,
                        top: puppetAttachment
                            ? `${puppetAttachment.localCenter.y}px`
                            : `${animatedCenter.y + parallaxOffset.y + textAnchorOffset.y}px`,
                        width: `${layer.size.width}px`,
                        height: `${layer.size.height}px`,
                        opacity: layer.opacity,
                        zIndex: puppetAttachment ? undefined : layer.zIndex,
                        mixBlendMode: layer.blendMode === 'screen' ? 'screen' : undefined,
                        transform: puppetAttachment
                            ? `translate(-50%, -50%) rotate(${puppetAttachment.localRotationDeg}deg) scale(${puppetAttachment.localScale.x}, ${puppetAttachment.localScale.y})`
                            : `translate(-50%, -50%) rotate(${layer.rotationDeg}deg) scale(${layer.scale.x}, ${layer.scale.y})`,
                    }, layer.opacityMaskPaths, resourceUrls);

                    if (layer.source.kind === 'solidColor') {
                        const { r, g, b } = layer.source.color;
                        return (
                            <div
                                key={layer.id}
                                className={styles.layer}
                                data-we-source={layer.source.kind}
                                style={{
                                    ...layerStyle,
                                    backgroundColor: `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`,
                                }}
                            />
                        );
                    }

                    if (layer.source.kind === 'text') {
                        const { r, g, b } = layer.source.color;
                        const renderedText = layer.source.dynamicText
                            ? formatWallpaperEngineDynamicText(layer.source.dynamicText, new Date(dynamicTextTimestamp))
                            : layer.source.text;
                        const fontFaceKey = layer.source.fontPath
                            ?? (layer.source.fontReference && fontFaces.has(layer.source.fontReference)
                                ? layer.source.fontReference
                                : null);
                        const fontFamilyName = fontFaceKey ? weFontFamilyForPath(fontFaceKey) : 'sans-serif';
                        const fontFamily = fontFaceKey ? `"${fontFamilyName}"` : fontFamilyName;
                        const fontSize = wePointSizeToScenePixels(layer.source.pointSize);
                        const color = `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;
                        const shadow = layer.source.textShadow;
                        const textShadow = shadow
                            ? (() => {
                                const { r: sr, g: sg, b: sb } = shadow.color;
                                const shadowColor = `rgba(${Math.round(sr * 255)}, ${Math.round(sg * 255)}, ${Math.round(sb * 255)}, ${shadow.alpha})`;
                                const base = `${shadow.offset.x}px ${shadow.offset.y}px 0 ${shadowColor}`;
                                if (!shadow.drawBorder) return base;
                                return [
                                    base,
                                    `1px 0 0 ${shadowColor}`,
                                    `-1px 0 0 ${shadowColor}`,
                                    `0 1px 0 ${shadowColor}`,
                                    `0 -1px 0 ${shadowColor}`,
                                ].join(', ');
                            })()
                            : undefined;
                        const justifyContent = layer.source.horizontalAlign === 'center'
                            ? 'center'
                            : layer.source.horizontalAlign === 'right' ? 'flex-end' : 'flex-start';
                        const alignItems = layer.source.verticalAlign === 'center'
                            ? 'center'
                            : layer.source.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start';
                        const textStyle: React.CSSProperties = {
                            ...layerStyle,
                            color,
                            fontFamily,
                            fontSize: `${fontSize}px`,
                            letterSpacing: layer.source.spacing.x !== 0 ? `${layer.source.spacing.x}px` : undefined,
                            justifyContent,
                            alignItems,
                            textAlign: layer.source.horizontalAlign,
                            textShadow,
                        };
                        const textContentStyle: React.CSSProperties = {
                            // WE Text Layers only wrap when `limitwidth` is
                            // explicitly enabled. More importantly, the
                            // authored layer size is only an alignment frame
                            // when limiting is disabled: glyphs are allowed to
                            // extend past it instead of being cropped.
                            width: layer.source.limitWidth ? '100%' : 'max-content',
                            height: layer.source.limitRows ? '100%' : 'max-content',
                            whiteSpace: layer.source.limitWidth ? 'pre-wrap' : 'pre',
                            overflowWrap: layer.source.limitWidth ? 'break-word' : 'normal',
                            overflow: layer.source.limitWidth || layer.source.limitRows ? 'hidden' : 'visible',
                            textOverflow: layer.source.limitWidth && layer.source.useEllipsis ? 'ellipsis' : undefined,
                        };
                        const textureEffects = resolveRuntimeTextureEffects(layer.textureEffects, resourceUrls);
                        const textureEffectResourcesReady = areRuntimeTextureEffectResourcesReady(textureEffects);
                        if (textureEffects.length > 0 && textureEffectResourcesReady) {
                            return (
                                <WeTextEffectLayer
                                    key={layer.id}
                                    text={renderedText}
                                    logicalSize={layer.size}
                                    fontFamily={fontFamily}
                                    fontSize={fontSize}
                                    color={color}
                                    horizontalAlign={layer.source.horizontalAlign}
                                    verticalAlign={layer.source.verticalAlign}
                                    effects={textureEffects}
                                    className={styles.layer}
                                    fallbackClassName={`${styles.layer} ${styles.textLayer}`}
                                    style={layerStyle}
                                    fallbackStyle={textStyle}
                                    dataSource={layer.source.kind}
                                    timeOriginMs={effectTimeOriginMs}
                                />
                            );
                        }
                        return (
                            <div
                                key={layer.id}
                                className={`${styles.layer} ${styles.textLayer}`}
                                data-we-source={layer.source.kind}
                                style={textStyle}
                            >
                                <span className={styles.textContent} style={textContentStyle}>
                                    {renderedText}
                                </span>
                            </div>
                        );
                    }

                    if (layer.source.kind === 'composition') {
                        const compositionEffects = layer.source.effects.map((effect) => {
                            if (effect.kind === 'blend') {
                                return {
                                    ...effect,
                                    textureUrl: resourceUrls.get(effect.texturePath) ?? '',
                                    maskUrl: effect.maskPath ? resourceUrls.get(effect.maskPath) ?? null : null,
                                };
                            }
                            if (effect.kind === 'opacity') {
                                return {
                                    ...effect,
                                    maskUrl: effect.maskPath ? resourceUrls.get(effect.maskPath) ?? null : null,
                                };
                            }
                            return effect;
                        });
                        const compositionResourcesReady = compositionEffects.every((effect) => {
                            if (effect.kind === 'blend') {
                                return Boolean(effect.textureUrl) && (!effect.maskPath || Boolean(effect.maskUrl));
                            }
                            if (effect.kind === 'opacity') return !effect.maskPath || Boolean(effect.maskUrl);
                            return true;
                        });
                        if (!compositionResourcesReady) return null;
                        return (
                            <WeCompositionLayer
                                key={layer.id}
                                effects={compositionEffects}
                                logicalSize={layer.size}
                                className={styles.layer}
                                dataSource={layer.source.kind}
                                style={layerStyle}
                            />
                        );
                    }

                    const src = resolveLayerUrl(layer, elapsedMs, resourceUrls, retainedFramePathsRef.current);
                    if (!src) return null;
                    const textureEffects = resolveRuntimeTextureEffects(layer.textureEffects, resourceUrls);
                    const textureEffectResourcesReady = areRuntimeTextureEffectResourcesReady(textureEffects);
                    const wrapPuppetAttachment = (content: React.ReactNode): React.ReactNode => {
                        if (!puppetAttachment) return content;
                        return (
                            <WePuppetAttachmentFrame
                                key={`attachment:${layer.id}`}
                                binding={puppetAttachment}
                                modelSrc={resourceUrls.get(puppetAttachment.parentModelPath) ?? null}
                                timeOriginMs={effectTimeOriginMs}
                                parallaxOffset={parallaxOffset}
                                zIndex={layer.zIndex}
                            >
                                {content}
                            </WePuppetAttachmentFrame>
                        );
                    };
                    if (layer.source.kind === 'puppetMesh') {
                        if (textureEffects.length > 0 && textureEffectResourcesReady) {
                            return wrapPuppetAttachment(
                                <WePuppetTextureEffectLayer
                                    key={layer.id}
                                    src={src}
                                    mesh={layer.source.mesh}
                                    modelSrc={layer.source.modelPath ? resourceUrls.get(layer.source.modelPath) ?? null : null}
                                    animationLayers={layer.source.animationLayers}
                                    animationMode={layer.source.animationMode}
                                    effects={textureEffects}
                                    className={styles.layer}
                                    dataSource={layer.source.kind}
                                    timeOriginMs={effectTimeOriginMs}
                                    style={layerStyle}
                                />,
                            );
                        }
                        return wrapPuppetAttachment(
                            <WePuppetMeshLayer
                                key={layer.id}
                                src={src}
                                mesh={layer.source.mesh}
                                modelSrc={layer.source.modelPath ? resourceUrls.get(layer.source.modelPath) ?? null : null}
                                animationLayers={layer.source.animationLayers}
                                animationMode={layer.source.animationMode}
                                timeOriginMs={effectTimeOriginMs}
                                className={styles.layer}
                                dataSource={layer.source.kind}
                                style={layerStyle}
                            />,
                        );
                    }
                    if (textureEffects.length > 0 && textureEffectResourcesReady) {
                        return wrapPuppetAttachment(
                            <WeImageEffectLayer
                                key={layer.id}
                                src={src}
                                effects={textureEffects}
                                className={styles.layer}
                                dataSource={layer.source.kind}
                                dataTiming={layer.source.kind === 'frameAnimation' ? layer.source.timingSource : undefined}
                                timeOriginMs={effectTimeOriginMs}
                                style={layerStyle}
                            />,
                        );
                    }
                    return wrapPuppetAttachment(
                        <img
                            key={layer.id}
                            src={src}
                            alt=""
                            draggable={false}
                            className={styles.layer}
                            data-we-source={layer.source.kind}
                            data-we-timing={layer.source.kind === 'frameAnimation' ? layer.source.timingSource : undefined}
                            style={layerStyle}
                        />,
                    );
                })}
                {[...preloadFrameUrls].map((src) => (
                    <img
                        key={src}
                        src={src}
                        alt=""
                        aria-hidden="true"
                        draggable={false}
                        className={styles.preload}
                    />
                ))}
            </div>
        </div>
    );
};
