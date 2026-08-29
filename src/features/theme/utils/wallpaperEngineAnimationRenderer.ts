import type {
  ImportedWeAnimationKeyframe,
  ImportedWeCameraParallax,
  ImportedWeColorRgb,
  ImportedWeCompositionEffect,
  ImportedWeDynamicText,
  ImportedWePoint,
  ImportedWePointAnimation,
  ImportedWePostProcessEffect,
  ImportedWePuppetAnimationLayer,
  ImportedWePuppetAttachmentBinding,
  ImportedWePuppetMesh,
  ImportedWeScene,
  ImportedWeSize,
  ImportedWeTextureEffect,
  ImportedWeWaterWavesEffect,
} from './wallpaperEngineImportedScene';
import { isImportedWeScene } from './wallpaperEngineSceneRuntime';
import { convertWePerspectiveQuadToRenderer } from './wallpaperEnginePerspectiveRenderer';
import type { WeParallaxSceneMotion } from './wallpaperEngineParallaxRenderer';

/**
 * RePKG samples do not consistently preserve timing metadata for image sequences.
 * Keep the fallback explicit so it can be changed independently from parsing.
 */
export const DEFAULT_WE_FRAME_ANIMATION_FPS = 30;
export const WE_FRAME_PREFETCH_COUNT = 6;

export type WeAnimationRenderSource =
  | {
      kind: 'solidColor';
      color: ImportedWeColorRgb;
    }
  | {
      kind: 'text';
      text: string;
      fontReference?: string;
      fontPath: string | null;
      pointSize: number;
      color: ImportedWeColorRgb;
      horizontalAlign: 'left' | 'center' | 'right';
      verticalAlign: 'top' | 'center' | 'bottom';
      padding: number;
      limitWidth: boolean;
      maxWidth: number | null;
      limitRows: boolean;
      maxRows: number | null;
      useEllipsis: boolean;
      spacing: ImportedWePoint;
      textShadow?: {
        offset: ImportedWePoint;
        color: ImportedWeColorRgb;
        alpha: number;
        drawBorder: boolean;
      };
      dynamicText?: ImportedWeDynamicText;
    }
  | {
      kind: 'image';
      path: string;
    }
  | {
      kind: 'puppetMesh';
      path: string;
      mesh: ImportedWePuppetMesh;
      modelPath: string | null;
      animationLayers: ImportedWePuppetAnimationLayer[];
      animationMode?: '2d' | 'orthographic3d';
    }
  | {
      kind: 'composition';
      effects: ImportedWeCompositionEffect[];
    }
  | {
      kind: 'frameAnimation';
      frames: string[];
      fps: number;
      timingSource: 'metadata' | 'fallback';
    };

export interface WeAnimationRenderLayer {
  id: string;
  name?: string;
  zIndex: number;
  source: WeAnimationRenderSource;
  center: { x: number; y: number };
  size: ImportedWeSize;
  scale: { x: number; y: number };
  rotationDeg: number;
  opacity: number;
  blendMode?: 'normal' | 'screen';
  opacityMaskPaths: string[];
  waterWavesEffects: ImportedWeWaterWavesEffect[];
  textureEffects: ImportedWeTextureEffect[];
  parallax: ImportedWePoint | null;
  puppetAttachment?: ImportedWePuppetAttachmentBinding;
  centerAnimations: ImportedWePointAnimation[];
}

export interface WeAnimationRenderPlan {
  canvas: ImportedWeSize;
  cameraParallax: ImportedWeCameraParallax;
  /**
   * Mixed zero/non-zero WE parallax scenes need a shared camera component in
   * addition to layer-relative depth. Without it, zero-depth backdrops lock to
   * the viewport while foreground cutouts move independently. This runtime-only
   * plan keeps the camera component separate from authored layer depth.
   */
  cameraParallaxSceneMotion: WeParallaxSceneMotion | null;
  postProcessEffects: ImportedWePostProcessEffect[];
  layers: WeAnimationRenderLayer[];
  animationLayerCount: number;
  propertyAnimationLayerCount: number;
  fallbackTimingLayerCount: number;
  staticResourcePaths: string[];
}

export interface WeAnimationFrameWindow {
  currentIndex: number;
  nextIndex: number;
  currentPath: string;
  nextPath: string;
}

const resolvedFps = (fps: number | null): { fps: number; timingSource: 'metadata' | 'fallback' } => (
  typeof fps === 'number' && Number.isFinite(fps) && fps > 0
    ? { fps, timingSource: 'metadata' }
    : { fps: DEFAULT_WE_FRAME_ANIMATION_FPS, timingSource: 'fallback' }
);

const PARALLAX_CAMERA_DEPTH_FROM_MAX = 0.85;
const PARALLAX_CAMERA_DEPTH_CAP = 0.15;
const PARALLAX_RELATIVE_SCALE = 0.25;
const PARALLAX_RELATIVE_DEPTH_CAP = 0.05;

const resolveParallaxSceneMotion = (
  layers: WeAnimationRenderLayer[],
): WeAnimationRenderPlan['cameraParallaxSceneMotion'] => {
  const positiveX: number[] = [];
  const positiveY: number[] = [];
  let hasZeroishX = false;
  let hasZeroishY = false;

  for (const layer of layers) {
    if (layer.opacity <= 0 || layer.size.width <= 0 || layer.size.height <= 0) continue;
    const x = Math.abs(layer.parallax?.x ?? 0);
    const y = Math.abs(layer.parallax?.y ?? 0);
    if (x > 0) positiveX.push(x);
    else hasZeroishX = true;
    if (y > 0) positiveY.push(y);
    else hasZeroishY = true;
  }

  const cameraDepthX = hasZeroishX && positiveX.length > 0
    ? Math.min(PARALLAX_CAMERA_DEPTH_CAP, Math.max(...positiveX) * PARALLAX_CAMERA_DEPTH_FROM_MAX)
    : 0;
  const cameraDepthY = hasZeroishY && positiveY.length > 0
    ? Math.min(PARALLAX_CAMERA_DEPTH_CAP, Math.max(...positiveY) * PARALLAX_CAMERA_DEPTH_FROM_MAX)
    : 0;

  return cameraDepthX > 0 || cameraDepthY > 0
    ? {
        cameraDepth: { x: cameraDepthX, y: cameraDepthY },
        relativeScale: PARALLAX_RELATIVE_SCALE,
        relativeDepthCap: PARALLAX_RELATIVE_DEPTH_CAP,
      }
    : null;
};

const cloneTextureEffects = (layer: ImportedWeScene['layers'][number]): ImportedWeTextureEffect[] => (
  layer.textureEffects
    ? layer.textureEffects.map((effect) => {
        if (effect.kind === 'scroll') {
          return {
            ...effect,
            speedY: effect.speedY === 0 ? 0 : -effect.speedY,
            repeat: { ...effect.repeat },
          };
        }
        if (effect.kind === 'transform') {
          return {
            ...effect,
            offset: { x: effect.offset.x, y: effect.offset.y === 0 ? 0 : -effect.offset.y },
            scale: { ...effect.scale },
          };
        }
        if (effect.kind === 'spin') {
          return {
            ...effect,
            center: { x: effect.center.x, y: 1 - effect.center.y },
            speed: effect.speed === 0 ? 0 : -effect.speed,
            axis: effect.axis === 0 ? 0 : -effect.axis,
            phase: effect.phase === 0 ? 0 : -effect.phase,
          };
        }
        if (effect.kind === 'perspective') {
          return {
            ...effect,
            points: convertWePerspectiveQuadToRenderer(effect.points),
          };
        }
        if (effect.kind === 'foliageSway') {
          return {
            ...effect,
            direction: effect.direction === 0 ? 0 : -effect.direction,
          };
        }
        if (effect.kind === 'shake') {
          return {
            ...effect,
            friction: { ...effect.friction },
            bounds: { ...effect.bounds },
          };
        }
        if (effect.kind === 'blurPrecise') {
          return {
            ...effect,
            scale: { ...effect.scale },
          };
        }
        if (effect.kind === 'shine') {
          return {
            ...effect,
            rayColor: { ...effect.rayColor },
            blurScale: { ...effect.blurScale },
            rayDirection: effect.rayDirection === 0 ? 0 : -effect.rayDirection,
            raySpeed: effect.raySpeed === 0 ? 0 : -effect.raySpeed,
          };
        }
        if (effect.kind === 'godRays') {
          return {
            ...effect,
            caster: effect.caster.mode === 'radial'
              ? {
                  mode: 'radial' as const,
                  center: { x: effect.caster.center.x, y: 1 - effect.caster.center.y },
                }
              : {
                  mode: 'directional' as const,
                  direction: effect.caster.direction === 0 ? 0 : -effect.caster.direction,
                },
            colorStart: { ...effect.colorStart },
            colorEnd: { ...effect.colorEnd },
            blurScale: { ...effect.blurScale },
          };
        }
        if (effect.kind === 'waterRipple') {
          return {
            ...effect,
            direction: effect.direction === 0 ? 0 : -effect.direction,
          };
        }
        return { ...effect };
      })
    : (layer.waterWavesEffects ?? []).map((effect) => ({ kind: 'waterWaves' as const, ...effect }))
);

const addTextureEffectResourcePaths = (effect: ImportedWeTextureEffect, paths: Set<string>): void => {
  if (effect.kind === 'opacity') {
    if (effect.maskPath) paths.add(effect.maskPath);
  } else if (effect.kind === 'waterWaves') {
    if (effect.maskPath) paths.add(effect.maskPath);
    if (effect.timeOffsetPath) paths.add(effect.timeOffsetPath);
  } else if (effect.kind === 'foliageSway') {
    if (effect.maskPath) paths.add(effect.maskPath);
    if (effect.noisePath) paths.add(effect.noisePath);
  } else if (effect.kind === 'waterFlow') {
    if (effect.flowMapPath) paths.add(effect.flowMapPath);
    paths.add(effect.phasePath);
  } else if (effect.kind === 'shake') {
    if (effect.directionMapPath) paths.add(effect.directionMapPath);
  } else if (effect.kind === 'blurPrecise') {
    if (effect.maskPath) paths.add(effect.maskPath);
  } else if (effect.kind === 'shine') {
    if (effect.maskPath) paths.add(effect.maskPath);
    if (effect.noisePath) paths.add(effect.noisePath);
  } else if (effect.kind === 'godRays') {
    if (effect.maskPath) paths.add(effect.maskPath);
  } else if (effect.kind === 'waterRipple') {
    if (effect.maskPath) paths.add(effect.maskPath);
    paths.add(effect.normalPath);
  }
};

/**
 * Convert persisted scene metadata into a renderer-facing plan. The input is
 * unknown because IndexedDB is a runtime trust boundary.
 */
export const createWeAnimationRenderPlan = (value: unknown): WeAnimationRenderPlan | null => {
  if (!isImportedWeScene(value)) return null;
  const scene: ImportedWeScene = value;
  const layers: WeAnimationRenderLayer[] = [];
  const staticPaths = new Set<string>();
  let animationLayerCount = 0;
  let propertyAnimationLayerCount = 0;
  let fallbackTimingLayerCount = 0;

  for (const layer of scene.layers) {
    if (!layer.visible || layer.opacity <= 0) continue;

    let source: WeAnimationRenderSource;
    if (layer.source.kind === 'solidColor') {
      source = { kind: 'solidColor', color: { ...layer.source.color } };
    } else if (layer.source.kind === 'text') {
      if (layer.source.fontPath) staticPaths.add(layer.source.fontPath);
      const fontReference = layer.source.fontReference
        ?? (
          layer.source.fontPath === null
          && layer.compatibility.weMaterialPath !== 'builtin:font-fallback'
            ? layer.compatibility.weMaterialPath
            : undefined
        );
      source = {
        kind: 'text',
        text: layer.source.text,
        fontReference,
        fontPath: layer.source.fontPath,
        pointSize: layer.source.pointSize,
        color: { ...layer.source.color },
        horizontalAlign: layer.source.horizontalAlign,
        verticalAlign: layer.source.verticalAlign,
        padding: layer.source.padding,
        limitWidth: layer.source.limitWidth ?? false,
        maxWidth: layer.source.maxWidth ?? null,
        limitRows: layer.source.limitRows ?? false,
        maxRows: layer.source.maxRows ?? null,
        useEllipsis: layer.source.useEllipsis ?? false,
        spacing: layer.source.spacing ? { ...layer.source.spacing } : { x: 0, y: 0 },
        textShadow: layer.source.textShadow
          ? {
              offset: { ...layer.source.textShadow.offset },
              color: { ...layer.source.textShadow.color },
              alpha: layer.source.textShadow.alpha,
              drawBorder: layer.source.textShadow.drawBorder,
            }
          : undefined,
        dynamicText: layer.source.dynamicText
          ? {
              kind: layer.source.dynamicText.kind,
              refresh: layer.source.dynamicText.refresh,
              parts: layer.source.dynamicText.parts.map((part) => (
                part.kind === 'lookup' ? { ...part, values: [...part.values] } : { ...part }
              )),
            }
          : undefined,
      };
    } else if (layer.source.kind === 'image') {
      staticPaths.add(layer.source.path);
      source = { kind: 'image', path: layer.source.path };
    } else if (layer.source.kind === 'puppetMesh') {
      staticPaths.add(layer.source.path);
      if (layer.source.modelPath) staticPaths.add(layer.source.modelPath);
      source = {
        kind: 'puppetMesh',
        path: layer.source.path,
        mesh: {
          positions: [...layer.source.mesh.positions],
          positions3d: layer.source.mesh.positions3d ? [...layer.source.mesh.positions3d] : undefined,
          uvs: [...layer.source.mesh.uvs],
          indices: [...layer.source.mesh.indices],
          bounds: { ...layer.source.mesh.bounds },
        },
        modelPath: layer.source.modelPath ?? null,
        animationLayers: (layer.source.animationLayers ?? []).map((animationLayer) => ({ ...animationLayer })),
        animationMode: layer.source.animationMode,
      };
    } else if (layer.source.kind === 'composition') {
      for (const effect of layer.source.effects) {
        if (effect.kind === 'blend') {
          staticPaths.add(effect.texturePath);
          if (effect.maskPath) staticPaths.add(effect.maskPath);
        } else if (effect.kind === 'opacity' && effect.maskPath) {
          staticPaths.add(effect.maskPath);
        }
      }
      source = {
        kind: 'composition',
        effects: layer.source.effects.map((effect) => {
          if (effect.kind === 'tint') return { ...effect, color: { ...effect.color } };
          if (effect.kind === 'transform') return { ...effect, offset: { ...effect.offset }, scale: { ...effect.scale } };
          if (effect.kind === 'fisheye') return { ...effect, center: { ...effect.center } };
          return { ...effect };
        }),
      };
    } else {
      if (layer.source.frames.length === 0) continue;
      const timing = resolvedFps(layer.source.fps);
      animationLayerCount += 1;
      if (timing.timingSource === 'fallback') fallbackTimingLayerCount += 1;
      source = {
        kind: 'frameAnimation',
        frames: [...layer.source.frames],
        fps: timing.fps,
        timingSource: timing.timingSource,
      };
    }

    const opacityEffects = layer.opacityEffects ?? [];
    const opacityMaskPaths = opacityEffects
      .map((effect) => effect.maskPath)
      .filter((path): path is string => path !== null);
    opacityMaskPaths.forEach((path) => staticPaths.add(path));
    const effectAlpha = opacityEffects.reduce((value, effect) => value * effect.alpha, 1);
    const waterWavesEffects = (layer.waterWavesEffects ?? []).map((effect) => ({ ...effect }));
    for (const effect of waterWavesEffects) {
      if (effect.maskPath) staticPaths.add(effect.maskPath);
      if (effect.timeOffsetPath) staticPaths.add(effect.timeOffsetPath);
    }
    const textureEffects = cloneTextureEffects(layer);
    textureEffects.forEach((effect) => addTextureEffectResourcePaths(effect, staticPaths));

    const puppetAttachment = layer.puppetAttachment
      ? {
          ...layer.puppetAttachment,
          parentAnimationLayers: layer.puppetAttachment.parentAnimationLayers.map((animationLayer) => ({ ...animationLayer })),
          parentOrigin: { ...layer.puppetAttachment.parentOrigin },
          parentScale: { ...layer.puppetAttachment.parentScale },
          localMatrix: { ...layer.puppetAttachment.localMatrix },
          bindTransform: { ...layer.puppetAttachment.bindTransform },
          localCenter: { ...layer.puppetAttachment.localCenter },
          localScale: { ...layer.puppetAttachment.localScale },
        }
      : undefined;
    if (puppetAttachment) staticPaths.add(puppetAttachment.parentModelPath);

    const centerAnimations = (layer.centerAnimations ?? []).map((animation) => ({
      fps: animation.fps,
      lengthFrames: animation.lengthFrames,
      mode: animation.mode,
      x: animation.x.map((keyframe) => ({ ...keyframe })),
      y: animation.y.map((keyframe) => ({ ...keyframe })),
    }));
    if (centerAnimations.length > 0) propertyAnimationLayerCount += 1;

    layers.push({
      id: layer.id,
      name: layer.name,
      zIndex: layer.zIndex,
      source,
      center: { ...layer.center },
      size: { ...layer.size },
      scale: { ...layer.scale },
      rotationDeg: layer.rotationDeg,
      opacity: Math.min(1, Math.max(0, layer.opacity * effectAlpha)),
      // Preserve the imported blend semantic into the renderer-facing plan.
      // Older persisted v1 scenes may still have blendMode=null even though the
      // raw WE value was retained in compatibility.weColorBlendMode. Promote the
      // one validated mapping here as a runtime compatibility fallback so users
      // do not have to delete/re-import those wallpapers after this fix.
      blendMode: layer.blendMode === 'screen' || (layer.blendMode === null && layer.compatibility.weColorBlendMode === 7)
        ? 'screen'
        : layer.blendMode === 'normal' ? 'normal' : undefined,
      opacityMaskPaths,
      waterWavesEffects,
      textureEffects,
      parallax: layer.parallax ? { ...layer.parallax } : null,
      ...(puppetAttachment ? { puppetAttachment } : {}),
      centerAnimations,
    });
  }

  layers.sort((a, b) => a.zIndex - b.zIndex);
  const cameraParallaxSceneMotion = resolveParallaxSceneMotion(layers);
  return {
    canvas: { width: scene.canvas.width, height: scene.canvas.height },
    cameraParallax: scene.cameraParallax
      ? { ...scene.cameraParallax }
      : { enabled: false, amount: 0, delay: 0, mouseInfluence: 0 },
    cameraParallaxSceneMotion,
    postProcessEffects: (scene.postProcessEffects ?? []).map((effect) => ({
      ...effect,
      center: { ...effect.center },
    })),
    layers,
    animationLayerCount,
    propertyAnimationLayerCount,
    fallbackTimingLayerCount,
    staticResourcePaths: [...staticPaths],
  };
};

export const getWePointAnimationFramePosition = (
  animation: ImportedWePointAnimation,
  elapsedMs: number,
): number => {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  if (!Number.isFinite(animation.fps) || animation.fps <= 0) return 0;
  if (!Number.isFinite(animation.lengthFrames) || animation.lengthFrames <= 0) return 0;

  const rawFrame = (elapsedMs * animation.fps) / 1000;
  if (animation.mode === 'single') return Math.min(rawFrame, animation.lengthFrames);
  if (animation.mode === 'loop') return rawFrame % animation.lengthFrames;

  const period = animation.lengthFrames * 2;
  const wrapped = rawFrame % period;
  return wrapped <= animation.lengthFrames ? wrapped : period - wrapped;
};

const interpolateKeyframes = (
  keyframes: ImportedWeAnimationKeyframe[],
  frame: number,
  animation: ImportedWePointAnimation,
): number => {
  const first = keyframes[0];
  const last = keyframes[keyframes.length - 1];
  if (!first || !last) return 0;

  if (animation.mode === 'loop' && keyframes.length > 1) {
    if (frame < first.frame) {
      const previousFrame = last.frame - animation.lengthFrames;
      const span = first.frame - previousFrame;
      const progress = span > 0 ? (frame - previousFrame) / span : 1;
      return last.value + (first.value - last.value) * progress;
    }
    if (frame > last.frame && animation.lengthFrames > last.frame) {
      const nextFrame = first.frame + animation.lengthFrames;
      const span = nextFrame - last.frame;
      const progress = span > 0 ? (frame - last.frame) / span : 0;
      return last.value + (first.value - last.value) * progress;
    }
  }

  if (frame <= first.frame) return first.value;
  for (let index = 1; index < keyframes.length; index += 1) {
    const next = keyframes[index];
    if (frame > next.frame) continue;
    const previous = keyframes[index - 1];
    const span = next.frame - previous.frame;
    if (span <= 0) return next.value;
    const progress = (frame - previous.frame) / span;
    return previous.value + (next.value - previous.value) * progress;
  }
  return last.value;
};

export const getWePointAnimationOffset = (
  animation: ImportedWePointAnimation,
  elapsedMs: number,
): ImportedWePoint => {
  const frame = getWePointAnimationFramePosition(animation, elapsedMs);
  return {
    x: interpolateKeyframes(animation.x, frame, animation),
    y: interpolateKeyframes(animation.y, frame, animation),
  };
};

export const getWeAnimatedLayerCenter = (
  layer: WeAnimationRenderLayer,
  elapsedMs: number,
): ImportedWePoint => {
  let x = layer.center.x;
  let y = layer.center.y;
  for (const animation of layer.centerAnimations) {
    const offset = getWePointAnimationOffset(animation, elapsedMs);
    x += offset.x;
    y += offset.y;
  }
  return { x, y };
};

export const getWeAnimationFrameIndex = (
  elapsedMs: number,
  fps: number,
  frameCount: number,
): number => {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  if (!Number.isFinite(fps) || fps <= 0) return 0;
  if (!Number.isSafeInteger(frameCount) || frameCount <= 1) return 0;
  return Math.floor((elapsedMs * fps) / 1000) % frameCount;
};

export const getWeAnimationFrameWindow = (
  source: Extract<WeAnimationRenderSource, { kind: 'frameAnimation' }>,
  elapsedMs: number,
): WeAnimationFrameWindow => {
  const currentIndex = getWeAnimationFrameIndex(elapsedMs, source.fps, source.frames.length);
  const nextIndex = source.frames.length > 1 ? (currentIndex + 1) % source.frames.length : currentIndex;
  return {
    currentIndex,
    nextIndex,
    currentPath: source.frames[currentIndex],
    nextPath: source.frames[nextIndex],
  };
};

/**
 * Renderer memory window: all static resources plus a small forward frame
 * window for each animation layer. Prefetching a few frames keeps IndexedDB
 * reads and image decode work ahead of the visible frame without retaining an
 * entire 64/241-frame sequence in memory.
 */
export const getWeAnimationResourceWindow = (
  plan: WeAnimationRenderPlan,
  elapsedMs: number,
): string[] => {
  const paths = new Set(plan.staticResourcePaths);
  for (const layer of plan.layers) {
    if (layer.source.kind !== 'frameAnimation') continue;
    const frameCount = layer.source.frames.length;
    const currentIndex = getWeAnimationFrameIndex(elapsedMs, layer.source.fps, frameCount);
    const retainCount = Math.min(frameCount, WE_FRAME_PREFETCH_COUNT);
    for (let offset = 0; offset < retainCount; offset += 1) {
      paths.add(layer.source.frames[(currentIndex + offset) % frameCount]);
    }
  }
  return [...paths];
};

export const getWeAnimationLayerSourcePath = (
  layer: WeAnimationRenderLayer,
  elapsedMs: number,
): string | null => {
  if (layer.source.kind === 'solidColor' || layer.source.kind === 'text' || layer.source.kind === 'composition') return null;
  if (layer.source.kind === 'image' || layer.source.kind === 'puppetMesh') return layer.source.path;
  return getWeAnimationFrameWindow(layer.source, elapsedMs).currentPath;
};

/**
 * Ordered resource candidates for a renderer-facing layer.
 *
 * Frame animations can jump farther than the forward-prefetch window after a
 * long main-thread task, resize, focus transition, or tab resume. The retained
 * path lets the renderer keep the last fully displayed frame visible while the
 * new IndexedDB/resource window catches up instead of temporarily dropping the
 * whole layer.
 */
export const getWeAnimationLayerSourceCandidates = (
  layer: WeAnimationRenderLayer,
  elapsedMs: number,
  retainedFramePath: string | null = null,
): string[] => {
  if (layer.source.kind === 'solidColor' || layer.source.kind === 'text' || layer.source.kind === 'composition') return [];
  if (layer.source.kind === 'image' || layer.source.kind === 'puppetMesh') return [layer.source.path];

  const frameCount = layer.source.frames.length;
  if (frameCount === 0) return [];
  const currentIndex = getWeAnimationFrameIndex(elapsedMs, layer.source.fps, frameCount);
  const candidates = [
    layer.source.frames[currentIndex],
    layer.source.frames[(currentIndex - 1 + frameCount) % frameCount],
    layer.source.frames[(currentIndex + 1) % frameCount],
  ];
  if (retainedFramePath) candidates.push(retainedFramePath);
  return [...new Set(candidates)];
};
