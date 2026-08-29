import type { ImportedWeColorRgb, ImportedWeCompositionEffect, ImportedWeLayer, ImportedWePuppetMesh, ImportedWeScene, ImportedWeSize, ImportedWeTextureEffect, ImportedWeWaterWavesEffect } from './wallpaperEngineImportedScene';
import { isImportedWeScene } from './wallpaperEngineSceneRuntime';
import { convertWePerspectiveQuadToRenderer } from './wallpaperEnginePerspectiveRenderer';

export { isImportedWeScene } from './wallpaperEngineSceneRuntime';

export interface WeStaticRenderLayer {
  id: string;
  name?: string;
  zIndex: number;
  sourcePath: string | null;
  solidColor: ImportedWeColorRgb | null;
  text: Extract<ImportedWeLayer['source'], { kind: 'text' }> | null;
  puppetMesh: ImportedWePuppetMesh | null;
  compositionEffects: ImportedWeCompositionEffect[] | null;
  /** True when a frameAnimation is intentionally frozen on its first frame. */
  frozenAnimation: boolean;
  center: { x: number; y: number };
  size: ImportedWeSize;
  scale: { x: number; y: number };
  rotationDeg: number;
  opacity: number;
  opacityMaskPaths: string[];
  waterWavesEffects: ImportedWeWaterWavesEffect[];
  textureEffects: ImportedWeTextureEffect[];
}

export interface WeStaticRenderPlan {
  canvas: ImportedWeSize;
  layers: WeStaticRenderLayer[];
  resourcePaths: string[];
  frozenAnimationLayerCount: number;
}

const finitePositive = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value) && value > 0
);

const finiteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const cloneTextureEffects = (layer: ImportedWeLayer): ImportedWeTextureEffect[] => (
  layer.textureEffects
    ? layer.textureEffects.map((effect) => {
        if (effect.kind === 'scroll') {
          return {
            ...effect,
            // WE's authored scroll Y is expressed in its texture-space convention.
            // The renderer stage uses the opposite vertical UV direction, so
            // convert only at this renderer-facing boundary. Keeping persisted
            // metadata unchanged also fixes already-imported Step-3 scenes.
            speedY: effect.speedY === 0 ? 0 : -effect.speedY,
            repeat: { ...effect.repeat },
          };
        }
        if (effect.kind === 'transform') {
          return {
            ...effect,
            // Persist authored WE UV semantics. Reflect the vertical offset at
            // the renderer boundary; the canonical WE vertex shader uses
            // rotate(-angle), whose reflection becomes rotate(+angle), so the
            // numeric authored angle itself stays unchanged here.
            offset: { x: effect.offset.x, y: effect.offset.y === 0 ? 0 : -effect.offset.y },
            scale: { ...effect.scale },
          };
        }
        if (effect.kind === 'spin') {
          return {
            ...effect,
            // Reflect authored WE UVs into the renderer's opposite vertical
            // texture convention. A reflection reverses rotation handedness,
            // therefore center Y, axis, angular speed and phase all transform.
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
            // Like spin/scroll, WE's authored direction is expressed in the
            // opposite vertical UV convention. Reflection reverses its angle.
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
            // Reflection of WE's vertical UV convention reverses ray angle
            // handedness, including time-driven angular motion.
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
                  // `position:true` God Rays centers use the same authored
                  // top-origin texture convention as other WE position UVs.
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
            // Ripple scroll direction is authored in WE texture space. Keep
            // persisted metadata engine-neutral and reflect the angle only at
            // the renderer-facing boundary.
            direction: effect.direction === 0 ? 0 : -effect.direction,
          };
        }
        return { ...effect };
      })
    : (layer.waterWavesEffects ?? []).map((effect) => ({ kind: 'waterWaves' as const, ...effect }))
);

const staticSource = (layer: ImportedWeLayer): {
  path: string | null;
  solidColor: ImportedWeColorRgb | null;
  text: Extract<ImportedWeLayer['source'], { kind: 'text' }> | null;
  puppetMesh: ImportedWePuppetMesh | null;
  compositionEffects: ImportedWeCompositionEffect[] | null;
  frozenAnimation: boolean;
} | null => {
  if (layer.source.kind === 'solidColor') {
    return { path: null, solidColor: { ...layer.source.color }, text: null, puppetMesh: null, compositionEffects: null, frozenAnimation: false };
  }
  if (layer.source.kind === 'text') {
    return {
      path: null,
      solidColor: null,
      text: { ...layer.source, color: { ...layer.source.color } },
      puppetMesh: null,
      compositionEffects: null,
      frozenAnimation: false,
    };
  }
  if (layer.source.kind === 'image') {
    return layer.source.path
      ? { path: layer.source.path, solidColor: null, text: null, puppetMesh: null, compositionEffects: null, frozenAnimation: false }
      : null;
  }
  if (layer.source.kind === 'puppetMesh') {
    return layer.source.path
      ? {
          path: layer.source.path,
          solidColor: null,
          text: null,
          puppetMesh: {
            positions: [...layer.source.mesh.positions],
            positions3d: layer.source.mesh.positions3d ? [...layer.source.mesh.positions3d] : undefined,
            uvs: [...layer.source.mesh.uvs],
            indices: [...layer.source.mesh.indices],
            bounds: { ...layer.source.mesh.bounds },
          },
          compositionEffects: null,
          frozenAnimation: false,
        }
      : null;
  }
  if (layer.source.kind === 'composition') {
    return {
      path: null,
      solidColor: null,
      text: null,
      puppetMesh: null,
      compositionEffects: layer.source.effects.map((effect) => {
        if (effect.kind === 'tint') return { ...effect, color: { ...effect.color } };
        if (effect.kind === 'transform') return { ...effect, offset: { ...effect.offset }, scale: { ...effect.scale } };
        if (effect.kind === 'fisheye') return { ...effect, center: { ...effect.center } };
        return { ...effect };
      }),
      frozenAnimation: false,
    };
  }
  const firstFrame = layer.source.frames[0];
  return firstFrame
    ? { path: firstFrame, solidColor: null, text: null, puppetMesh: null, compositionEffects: null, frozenAnimation: true }
    : null;
};

/**
 * Build the phase-4 render plan. Frame animations deliberately use only frame 0;
 * no timing/FPS/RAF behavior belongs in this phase.
 *
 * The input is unknown on purpose: persisted metadata is a runtime trust
 * boundary. Invalid/stale version-1 data returns null instead of reaching nested
 * layer/source dereferences.
 */
export const createWeStaticRenderPlan = (value: unknown): WeStaticRenderPlan | null => {
  if (!isImportedWeScene(value)) return null;
  const scene: ImportedWeScene = value;
  const paths = new Set<string>();
  let frozenAnimationLayerCount = 0;
  const layers: WeStaticRenderLayer[] = [];

  for (const layer of scene.layers) {
    if (!layer.visible || layer.opacity <= 0) continue;
    const source = staticSource(layer);
    if (!source) continue;
    if (
      !finiteNumber(layer.center.x)
      || !finiteNumber(layer.center.y)
      || !finitePositive(layer.size.width)
      || !finitePositive(layer.size.height)
      || !finiteNumber(layer.scale.x)
      || !finiteNumber(layer.scale.y)
      || !finiteNumber(layer.rotationDeg)
      || !finiteNumber(layer.opacity)
    ) continue;

    if (source.path) paths.add(source.path);
    if (source.text?.fontPath) paths.add(source.text.fontPath);
    for (const effect of source.compositionEffects ?? []) {
      if (effect.kind === 'blend') {
        paths.add(effect.texturePath);
        if (effect.maskPath) paths.add(effect.maskPath);
      } else if (effect.kind === 'opacity' && effect.maskPath) {
        paths.add(effect.maskPath);
      }
    }
    const opacityEffects = layer.opacityEffects ?? [];
    const opacityMaskPaths = opacityEffects
      .map((effect) => effect.maskPath)
      .filter((path): path is string => path !== null);
    opacityMaskPaths.forEach((path) => paths.add(path));
    const effectAlpha = opacityEffects.reduce((value, effect) => value * effect.alpha, 1);
    const textureEffects = cloneTextureEffects(layer);
    const waterWavesEffects = textureEffects
      .filter((effect): effect is Extract<ImportedWeTextureEffect, { kind: 'waterWaves' }> => effect.kind === 'waterWaves')
      .map(({ kind: _kind, ...effect }) => effect);
    for (const effect of textureEffects) {
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
    }
    if (source.frozenAnimation) frozenAnimationLayerCount += 1;
    layers.push({
      id: layer.id,
      name: layer.name,
      zIndex: layer.zIndex,
      sourcePath: source.path,
      solidColor: source.solidColor,
      text: source.text,
      puppetMesh: source.puppetMesh,
      compositionEffects: source.compositionEffects,
      frozenAnimation: source.frozenAnimation,
      center: { ...layer.center },
      size: { ...layer.size },
      scale: { ...layer.scale },
      rotationDeg: layer.rotationDeg,
      opacity: Math.min(1, Math.max(0, layer.opacity * effectAlpha)),
      opacityMaskPaths,
      waterWavesEffects,
      textureEffects,
    });
  }

  layers.sort((a, b) => a.zIndex - b.zIndex);
  return {
    canvas: { width: scene.canvas.width, height: scene.canvas.height },
    layers,
    resourcePaths: [...paths],
    frozenAnimationLayerCount,
  };
};

/** Match ordinary wallpaper object-fit: cover semantics for the logical WE canvas. */
export const getWeSceneCoverScale = (canvas: ImportedWeSize, viewport: ImportedWeSize): number => {
  if (!finitePositive(canvas.width) || !finitePositive(canvas.height)) return 1;
  if (!finitePositive(viewport.width) || !finitePositive(viewport.height)) return 1;
  return Math.max(viewport.width / canvas.width, viewport.height / canvas.height);
};
