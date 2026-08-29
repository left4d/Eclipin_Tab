/**
 * Wallpaper Engine (RePKG extract) resource-graph parser.
 *
 * Discover scene descriptors and resolve image resources through
 * scene object -> model -> material -> texture/frame assets, while preserving
 * scene-level controls that the TabLab intermediate format can safely model.
 *
 * This intentionally does NOT render the scene, execute scripts/effects, or
 * emulate particles. The result is a stable graph that a later conversion
 * layer can translate into TabLab's own render model.
 */

import type {
  WeAnimationKeyframe,
  WeArchiveResourceGraph,
  WeCameraParallaxSettings,
  WeColorRgb,
  WeLayerAlignment,
  WeLayerTransform,
  WePointAnimation,
  WeResolvedCompositionEffect,
  WeResolvedCompositionLayer,
  WeResolvedEffect,
  WeResolvedBlurPreciseEffect,
  WeResolvedFoliageSwayEffect,
  WeResolvedGodRaysEffect,
  WeResolvedImageLayer,
  WeResolvedPuppetAnimationLayer,
  WeResolvedOpacityEffect,
  WeResolvedPostProcessEffect,
  WeResolvedShakeEffect,
  WeResolvedShineEffect,
  WeResolvedWaterFlowEffect,
  WeResolvedWaterWavesEffect,
  WeResolvedSolidLayer,
  WeResolvedTextLayer,
  WeResolvedTextureEffect,
  WeResolvedTexture,
  WeSceneDiagnostic,
  WeSceneResourceGraph,
  WeSceneSize,
  WeSkippedObject,
  WeVec2,
  WeVec3,
} from './wallpaperEngineTypes';
import {
  buildWallpaperEngineEffectIr,
  canonicalWallpaperEngineEffectParameterKey,
} from './wallpaperEngineEffectIr';
import { resolveWallpaperEngineDateTimeText } from './wallpaperEngineTextScript';
import { getWallpaperEngineBuiltinFontFile } from './wallpaperEngineBuiltinFonts';

export type {
  WeAnimationKeyframe,
  WeArchiveResourceGraph,
  WeCameraParallaxSettings,
  WeColorRgb,
  WeLayerAlignment,
  WeLayerTransform,
  WePointAnimation,
  WeResolvedCompositionEffect,
  WeResolvedCompositionLayer,
  WeResolvedEffect,
  WeResolvedBlurPreciseEffect,
  WeResolvedFoliageSwayEffect,
  WeResolvedGodRaysEffect,
  WeResolvedImageLayer,
  WeResolvedPuppetAnimationLayer,
  WeResolvedOpacityEffect,
  WeResolvedPostProcessEffect,
  WeResolvedShakeEffect,
  WeResolvedShineEffect,
  WeResolvedWaterFlowEffect,
  WeResolvedWaterWavesEffect,
  WeResolvedSolidLayer,
  WeResolvedTextLayer,
  WeResolvedTextureEffect,
  WeResolvedTexture,
  WeSceneDiagnostic,
  WeSceneResourceGraph,
  WeSceneSize,
  WeSkippedObject,
  WeVec2,
  WeVec3,
} from './wallpaperEngineTypes';

type JsonObject = Record<string, unknown>;

type IndexedEntry = {
  path: string;
  relativePath: string;
};

type TextureCandidate = IndexedEntry & {
  extension: string;
  stem: string;
  frameIndex: number | null;
};

const decoder = new TextDecoder();
const BROWSER_IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.bmp',
  '.avif',
]);

const isObject = (value: unknown): value is JsonObject => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const decodeRepkgUnicodeEscapes = (value: string): string => value.replace(
  /#U([0-9a-fA-F]{4})/g,
  (_match, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)),
);

const normalizePath = (value: string): string => {
  const parts: string[] = [];
  for (const rawPart of value.replace(/\\/g, '/').split('/')) {
    const part = rawPart.trim() === '' ? rawPart : rawPart;
    if (!part || part === '.') continue;
    if (part === '..') {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.join('/');
};

const dirname = (path: string): string => {
  const normalized = normalizePath(path);
  const index = normalized.lastIndexOf('/');
  return index >= 0 ? normalized.slice(0, index) : '';
};

const basename = (path: string): string => {
  const normalized = normalizePath(path);
  const index = normalized.lastIndexOf('/');
  return index >= 0 ? normalized.slice(index + 1) : normalized;
};

const extname = (path: string): string => {
  const name = basename(path);
  const index = name.lastIndexOf('.');
  return index > 0 ? name.slice(index).toLowerCase() : '';
};

const stripExtension = (path: string): string => {
  const extension = extname(path);
  return extension ? path.slice(0, -extension.length) : path;
};

const joinPath = (base: string, reference: string): string => normalizePath(
  base ? `${base}/${reference}` : reference,
);

const pathIsWithin = (path: string, base: string): boolean => (
  !base || path === base || path.startsWith(`${base}/`)
);

const relativeTo = (path: string, base: string): string => {
  if (!base) return path;
  if (path === base) return '';
  return path.startsWith(`${base}/`) ? path.slice(base.length + 1) : path;
};

const commonPrefixSegmentCount = (a: string, b: string): number => {
  const aa = normalizePath(a).split('/').filter(Boolean);
  const bb = normalizePath(b).split('/').filter(Boolean);
  let count = 0;
  while (count < aa.length && count < bb.length && aa[count] === bb[count]) count += 1;
  return count;
};

/**
 * Wallpaper Engine properties can be wrapped with script/animation metadata
 * while retaining a serialized base value in `value`. The importer does not
 * execute that dynamic metadata here, but the static scene must still start
 * from the authored base value instead of falling back to transform defaults.
 */
const propertyBaseValue = (value: unknown): unknown => (
  isObject(value) && Object.prototype.hasOwnProperty.call(value, 'value')
    ? value.value
    : value
);

const parseNumber = (value: unknown): number | null => {
  const baseValue = propertyBaseValue(value);
  return typeof baseValue === 'number' && Number.isFinite(baseValue) ? baseValue : null;
};

const parseVector = (value: unknown, length: 2 | 3): number[] | null => {
  const baseValue = propertyBaseValue(value);
  if (Array.isArray(baseValue)) {
    const parsed = baseValue.slice(0, length).map(parseNumber);
    return parsed.length === length && parsed.every((item): item is number => item !== null)
      ? parsed
      : null;
  }
  if (typeof baseValue !== 'string') return null;
  const parsed = baseValue.trim().split(/\s+/).slice(0, length).map((part) => Number(part));
  return parsed.length === length && parsed.every(Number.isFinite) ? parsed : null;
};

const vec2 = (value: unknown): WeVec2 | null => {
  const parsed = parseVector(value, 2);
  return parsed ? [parsed[0], parsed[1]] : null;
};

const vec3 = (value: unknown, fallback: WeVec3): WeVec3 => {
  const parsed = parseVector(value, 3);
  return parsed ? [parsed[0], parsed[1], parsed[2]] : fallback;
};

const booleanValue = (value: unknown, fallback: boolean): boolean => {
  const baseValue = propertyBaseValue(value);
  return typeof baseValue === 'boolean' ? baseValue : fallback;
};

const resolveVisible = (value: unknown): boolean => booleanValue(value, true);

const stringValue = (value: unknown): string | null => (
  typeof value === 'string' && value.trim() ? value : null
);

const propertyStringValue = (value: unknown): string | null => (
  typeof propertyBaseValue(value) === 'string' ? propertyBaseValue(value) as string : null
);

const horizontalTextAlign = (value: unknown): WeResolvedTextLayer['horizontalAlign'] => {
  const parsed = stringValue(propertyBaseValue(value));
  return parsed === 'right' || parsed === 'center' ? parsed : 'left';
};

const verticalTextAlign = (value: unknown): WeResolvedTextLayer['verticalAlign'] => {
  const parsed = stringValue(propertyBaseValue(value));
  return parsed === 'bottom' || parsed === 'center' ? parsed : 'top';
};

const resolveTextShadow = (effects: WeResolvedEffect[]): WeResolvedTextLayer['textShadow'] => {
  const effect = effects.find((candidate) => candidate.key === 'textshadow');
  const pass = effect?.passes[0];
  if (!pass) return undefined;

  const parameterValue = (semanticKey: string): unknown => {
    const entry = Object.entries(pass.constants).find(([key]) => (
      canonicalWallpaperEngineEffectParameterKey(key) === semanticKey
    ));
    return entry?.[1].value;
  };

  const offset = parseVector(parameterValue('shadowoffset'), 2) ?? [0, 0];
  const color = colorRgb(parameterValue('shadowcolor'));
  const alpha = Math.min(1, Math.max(0, parseNumber(parameterValue('alpha')) ?? 1));
  const drawBorderValue = parseNumber(parameterValue('shadowdrawborder'));
  return {
    offset: [offset[0], offset[1]],
    color,
    alpha,
    drawBorder: drawBorderValue !== null ? drawBorderValue !== 0 : booleanValue(parameterValue('shadowdrawborder'), false),
  };
};

const layerAlignment = (value: unknown): WeLayerAlignment => {
  const parsed = stringValue(propertyBaseValue(value));
  if (!parsed) return 'center';
  const normalized = parsed.toLowerCase().replace(/[^a-z]/g, '');
  switch (normalized) {
    case 'top':
    case 'bottom':
    case 'left':
    case 'right':
    case 'topleft':
    case 'topright':
    case 'bottomleft':
    case 'bottomright':
      return normalized;
    default:
      return 'center';
  }
};

const BUILTIN_SOLID_LAYER = 'models/util/solidlayer.json';
const BUILTIN_COMPOSITION_LAYER = 'models/util/composelayer.json';
const BUILTIN_FULLSCREEN_LAYER = 'models/util/fullscreenlayer.json';
const BUILTIN_UTILITY_LAYERS = new Set([
  BUILTIN_SOLID_LAYER,
  BUILTIN_COMPOSITION_LAYER,
  BUILTIN_FULLSCREEN_LAYER,
  'models/util/projectlayer.json',
]);

const normalizedBuiltinReference = (value: string): string => (
  decodeRepkgUnicodeEscapes(normalizePath(value)).toLowerCase()
);

const isBuiltinSolidLayerReference = (value: string): boolean => (
  normalizedBuiltinReference(value) === BUILTIN_SOLID_LAYER
);

const isBuiltinCompositionLayerReference = (value: string): boolean => (
  normalizedBuiltinReference(value) === BUILTIN_COMPOSITION_LAYER
);

const isBuiltinFullscreenLayerReference = (value: string): boolean => (
  normalizedBuiltinReference(value) === BUILTIN_FULLSCREEN_LAYER
);

const isBuiltinUtilityLayerReference = (value: string): boolean => (
  BUILTIN_UTILITY_LAYERS.has(normalizedBuiltinReference(value))
);

const colorRgb = (value: unknown): WeColorRgb => {
  const parsed = parseVector(value, 3);
  if (!parsed) return [1, 1, 1];
  return [
    Math.min(1, Math.max(0, parsed[0])),
    Math.min(1, Math.max(0, parsed[1])),
    Math.min(1, Math.max(0, parsed[2])),
  ];
};

const objectId = (value: unknown, fallbackIndex: number): string => {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return `object-${fallbackIndex}`;
};

const resolvePuppetAnimationLayers = (value: unknown): WeResolvedPuppetAnimationLayer[] => {
  if (!Array.isArray(value)) return [];
  const layers: WeResolvedPuppetAnimationLayer[] = [];
  value.forEach((entry, index) => {
    if (!isObject(entry)) return;
    const animationId = parseNumber(entry.animation);
    if (animationId === null || !Number.isSafeInteger(animationId) || animationId < 0) return;
    layers.push({
      id: objectId(entry.id, index),
      name: stringValue(entry.name) ?? undefined,
      animationId,
      additive: booleanValue(entry.additive, false),
      blend: parseNumber(entry.blend) ?? 1,
      blendIn: booleanValue(entry.blendin, false),
      blendOut: booleanValue(entry.blendout, false),
      blendTime: Math.max(0, parseNumber(entry.blendtime) ?? 0),
      rate: parseNumber(entry.rate) ?? 1,
      visible: resolveVisible(entry.visible),
    });
  });
  return layers;
};

class ArchiveIndex {
  private readonly entries = new Map<string, Uint8Array>();
  private readonly lowerPath = new Map<string, string>();
  private readonly jsonCache = new Map<string, JsonObject | null>();

  constructor(input: Map<string, Uint8Array>) {
    for (const [rawPath, data] of input) {
      const path = normalizePath(rawPath);
      if (!path || path.endsWith('/')) continue;
      this.entries.set(path, data);
      if (!this.lowerPath.has(path.toLowerCase())) this.lowerPath.set(path.toLowerCase(), path);
      const decodedRepkgPath = decodeRepkgUnicodeEscapes(path);
      if (!this.lowerPath.has(decodedRepkgPath.toLowerCase())) {
        this.lowerPath.set(decodedRepkgPath.toLowerCase(), path);
      }
    }
  }

  paths(): string[] {
    return [...this.entries.keys()];
  }

  resolvePath(path: string): string | null {
    const normalized = normalizePath(path);
    if (this.entries.has(normalized)) return normalized;
    return this.lowerPath.get(normalized.toLowerCase()) ?? null;
  }

  readJson(path: string): JsonObject | null {
    const resolved = this.resolvePath(path);
    if (!resolved) return null;
    if (this.jsonCache.has(resolved)) return this.jsonCache.get(resolved) ?? null;
    try {
      const value: unknown = JSON.parse(decoder.decode(this.entries.get(resolved)));
      const parsed = isObject(value) ? value : null;
      this.jsonCache.set(resolved, parsed);
      return parsed;
    } catch {
      this.jsonCache.set(resolved, null);
      return null;
    }
  }
}

const scoreSceneDescriptor = (value: JsonObject): number => {
  const objects = value.objects;
  if (!Array.isArray(objects) || !isObject(value.general)) return -1;

  let score = 4;
  if (isObject(value.camera)) score += 2;
  const projection = value.general.orthogonalprojection;
  if (isObject(projection)) score += 2;

  for (const object of objects) {
    if (!isObject(object)) continue;
    if (typeof object.image === 'string') score += 3;
    else if (typeof object.particle === 'string') score += 1;
    else if (typeof propertyBaseValue(object.text) === 'string' || typeof object.script === 'string') score += 1;
  }
  return score;
};

const findSceneDescriptors = (index: ArchiveIndex): string[] => {
  return index.paths()
    .filter((path) => extname(path) === '.json')
    .map((path) => ({ path, value: index.readJson(path) }))
    .filter((item): item is { path: string; value: JsonObject } => item.value !== null)
    .map((item) => ({ ...item, score: scoreSceneDescriptor(item.value) }))
    .filter((item) => item.score >= 6)
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((item) => item.path);
};

const getSceneSize = (scene: JsonObject): WeSceneSize => {
  const general = isObject(scene.general) ? scene.general : {};
  const projection = isObject(general.orthogonalprojection) ? general.orthogonalprojection : {};
  const width = parseNumber(projection.width);
  const height = parseNumber(projection.height);
  const auto = projection.auto === true || width === null || height === null;
  return { width, height, auto };
};

const nonNegativeNumber = (value: unknown, fallback = 0): number => {
  const parsed = parseNumber(value);
  return parsed !== null && parsed >= 0 ? parsed : fallback;
};

const getCameraParallaxSettings = (scene: JsonObject): WeCameraParallaxSettings => {
  const general = isObject(scene.general) ? scene.general : {};
  return {
    enabled: booleanValue(general.cameraparallax, false),
    amount: nonNegativeNumber(general.cameraparallaxamount),
    delay: nonNegativeNumber(general.cameraparallaxdelay),
    mouseInfluence: nonNegativeNumber(general.cameraparallaxmouseinfluence),
  };
};

const materialUsesSpritesheet = (material: JsonObject): boolean => {
  if (!Array.isArray(material.passes)) return false;
  return material.passes.some((pass) => {
    if (!isObject(pass) || !isObject(pass.combos)) return false;
    const value = pass.combos.spritesheet;
    return value === true || value === 1 || value === '1';
  });
};

const materialTextureReferences = (material: JsonObject): string[] => {
  if (!Array.isArray(material.passes)) return [];
  const refs: string[] = [];
  for (const pass of material.passes) {
    if (!isObject(pass) || !Array.isArray(pass.textures)) continue;
    for (const texture of pass.textures) {
      if (typeof texture === 'string' && texture.trim() && !refs.includes(texture)) refs.push(texture);
    }
  }
  return refs;
};

const parseTextureCandidate = (
  path: string,
  basePath: string,
  reference: string,
): TextureCandidate | null => {
  if (!pathIsWithin(path, basePath)) return null;
  const extension = extname(path);
  if (!BROWSER_IMAGE_EXTENSIONS.has(extension)) return null;

  const relativePath = relativeTo(path, basePath);
  const semanticRelativePath = decodeRepkgUnicodeEscapes(relativePath);
  const stem = stripExtension(semanticRelativePath);
  const normalizedReference = normalizePath(reference);
  const exact = stem === normalizedReference || stem.endsWith(`/${normalizedReference}`);
  if (exact) return { path, relativePath, extension, stem, frameIndex: null };

  const leaf = basename(stem);
  const refLeaf = basename(normalizedReference);
  if (!leaf.startsWith(`${refLeaf}_`)) return null;
  const suffix = leaf.slice(refLeaf.length + 1);
  if (!/^\d+$/.test(suffix)) return null;

  const stemPrefix = stem.slice(0, -(suffix.length + 1));
  const sequenceMatches = stemPrefix === normalizedReference || stemPrefix.endsWith(`/${normalizedReference}`);
  if (!sequenceMatches) return null;

  return {
    path,
    relativePath,
    extension,
    stem,
    frameIndex: Number(suffix),
  };
};

const chooseTextureGroup = (
  candidates: TextureCandidate[],
  materialPath: string,
  basePath: string,
  spritesheet: boolean,
): TextureCandidate[] => {
  if (!candidates.length) return [];
  const materialDir = dirname(relativeTo(materialPath, basePath));
  const staticCandidates = candidates.filter((item) => item.frameIndex === null);
  const frameCandidates = candidates.filter((item) => item.frameIndex !== null);

  const rank = (item: TextureCandidate): readonly [number, number] => [
    commonPrefixSegmentCount(dirname(item.relativePath), materialDir),
    -item.relativePath.length,
  ];
  const compareRank = (a: TextureCandidate, b: TextureCandidate): number => {
    const ar = rank(a);
    const br = rank(b);
    return br[0] - ar[0] || br[1] - ar[1];
  };

  if (!spritesheet && staticCandidates.length) {
    return [staticCandidates.sort(compareRank)[0]];
  }

  if (frameCandidates.length) {
    const best = [...frameCandidates].sort(compareRank)[0];
    const bestDir = dirname(best.relativePath);
    return frameCandidates
      .filter((item) => dirname(item.relativePath) === bestDir)
      .sort((a, b) => (a.frameIndex ?? 0) - (b.frameIndex ?? 0));
  }

  if (staticCandidates.length) return [staticCandidates.sort(compareRank)[0]];
  return [];
};

const resolveTexture = (
  index: ArchiveIndex,
  basePath: string,
  materialPath: string,
  reference: string,
  spritesheet: boolean,
): WeResolvedTexture | null => {
  const candidates = index.paths()
    .map((path) => parseTextureCandidate(path, basePath, reference))
    .filter((item): item is TextureCandidate => item !== null);
  const chosen = chooseTextureGroup(candidates, materialPath, basePath, spritesheet);
  if (!chosen.length) return null;

  const isSequence = chosen.length > 1 || chosen[0].frameIndex !== null;
  return {
    reference,
    kind: isSequence ? 'frameSequence' : 'image',
    paths: chosen.map((item) => item.path),
    spritesheet,
  };
};

const parseEffectChain = (
  index: ArchiveIndex,
  basePath: string,
  object: JsonObject,
): WeResolvedEffect[] => {
  if (!Array.isArray(object.effects)) return [];
  const effects: WeResolvedEffect[] = [];
  for (const rawEffect of object.effects) {
    if (!isObject(rawEffect) || !resolveVisible(rawEffect.visible)) continue;
    const reference = stringValue(rawEffect.file);
    if (!reference) continue;
    const descriptorPath = index.resolvePath(joinPath(basePath, reference));
    const descriptor = descriptorPath ? index.readJson(descriptorPath) : null;
    const effect = buildWallpaperEngineEffectIr(rawEffect, descriptor, reference, descriptorPath);
    if (effect) effects.push(effect);
  }
  return effects;
};

const parseFullscreenPostProcessEffects = (
  effectChain: WeResolvedEffect[],
): WeResolvedPostProcessEffect[] => {
  const effects: WeResolvedPostProcessEffect[] = [];
  for (const effect of effectChain) {
    if (effect.key !== 'chromaticaberration') continue;
    const pass = effect.passes[0];
    if (!pass) continue;
    // The stage-level approximation cannot preserve an authored per-pixel
    // opacity mask yet. Keep masked variants outside the supported subset
    // rather than applying an unmasked global effect.
    if (pass.textures[1]) continue;

    const parameterValue = (semanticKey: string): unknown => {
      const entry = Object.entries(pass.constants).find(([key]) => (
        canonicalWallpaperEngineEffectParameterKey(key) === semanticKey
      ));
      return entry?.[1].value;
    };
    const comboNumber = (semanticKey: string, fallback: number): number => {
      const entry = Object.entries(pass.combos).find(([key]) => (
        canonicalWallpaperEngineEffectParameterKey(key) === semanticKey
      ));
      return parseNumber(entry?.[1]) ?? fallback;
    };
    const center = parseVector(parameterValue('center'), 2) ?? [0.5, 0.5];
    const modeValue = Math.round(comboNumber('mode', 0));
    const variationValue = Math.round(comboNumber('variation', 0));
    const mode = modeValue === 1 || modeValue === 2 || modeValue === 3 ? modeValue : 0;
    const variation = variationValue === 1 || variationValue === 2 ? variationValue : 0;
    effects.push({
      kind: 'chromaticAberration',
      center: [center[0], center[1]],
      centerFalloff: Math.min(1, Math.max(0, parseNumber(parameterValue('centerfalloff')) ?? 1)),
      strength: Math.max(0, parseNumber(parameterValue('strength')) ?? 1),
      direction: parseNumber(parameterValue('direction')) ?? Math.PI / 2,
      mode,
      variation,
    });
  }
  return effects;
};

interface ParsedImageEffects {
  opacityEffects: WeResolvedOpacityEffect[];
  waterWavesEffects: WeResolvedWaterWavesEffect[];
  textureEffects: WeResolvedTextureEffect[];
  hasUnsupportedEffects: boolean;
}

const renderTargetLayerId = (reference: string): string | null => {
  const match = /^_rt_imageLayerComposite_(.+?)_a$/i.exec(reference.trim());
  return match?.[1] ?? null;
};

const resolveCompositionTextureReference = (
  index: ArchiveIndex,
  basePath: string,
  effectPath: string,
  reference: unknown,
  imageLayersById: Map<string, WeResolvedImageLayer>,
): string | null | undefined => {
  if (reference === null || reference === undefined || reference === '') return null;
  if (typeof reference !== 'string') return undefined;

  const layerId = renderTargetLayerId(reference);
  if (layerId !== null) {
    const sourceLayer = imageLayersById.get(layerId);
    return sourceLayer?.textures[0]?.paths[0];
  }

  const texture = resolveTexture(index, basePath, effectPath, reference, false);
  return texture?.paths[0];
};

const parseCompositionEffects = (
  index: ArchiveIndex,
  basePath: string,
  effectChain: WeResolvedEffect[],
  imageLayersById: Map<string, WeResolvedImageLayer>,
): { effects: WeResolvedCompositionEffect[]; hasUnsupportedEffects: boolean } => {
  if (!effectChain.length) return { effects: [], hasUnsupportedEffects: false };

  const effects: WeResolvedCompositionEffect[] = [];
  let hasUnsupportedEffects = false;

  for (const rawEffect of effectChain) {
    const kind = rawEffect.key;
    if (kind !== 'tint' && kind !== 'blend' && kind !== 'transform' && kind !== 'fisheye' && kind !== 'opacity') {
      hasUnsupportedEffects = true;
      continue;
    }
    if (!rawEffect.passes.length) {
      hasUnsupportedEffects = true;
      continue;
    }

    for (const pass of rawEffect.passes) {
      const shaderValues = Object.fromEntries(Object.entries(pass.constants).map(([key, parameter]) => [key, parameter.value]));
      const combos = pass.combos;
      const textures = pass.textures;
      const effectReference = rawEffect.reference;
      const effectPath = rawEffect.descriptorPath;

      if (kind === 'tint') {
        // Phase 1 composition support intentionally implements the normal
        // replacement blend only. Other WE image blend modes remain explicit
        // unsupported work rather than being approximated incorrectly.
        if ((parseNumber(combos.BLENDMODE) ?? 30) !== 0 || textures.some((item) => typeof item === 'string' && item.trim())) {
          hasUnsupportedEffects = true;
          continue;
        }
        effects.push({
          kind,
          color: colorRgb(shaderValues.color),
          alpha: Math.min(1, Math.max(0, parseNumber(shaderValues.alpha) ?? 1)),
        });
        continue;
      }

      if (kind === 'blend') {
        if ((parseNumber(combos.BLENDMODE) ?? 2) !== 0) {
          hasUnsupportedEffects = true;
          continue;
        }
        const texturePath = resolveCompositionTextureReference(index, basePath, effectPath ?? effectReference, textures[1], imageLayersById);
        const maskPath = resolveCompositionTextureReference(index, basePath, effectPath ?? effectReference, textures[2], imageLayersById);
        if (!texturePath || maskPath === undefined) {
          hasUnsupportedEffects = true;
          continue;
        }
        effects.push({
          kind,
          texturePath,
          maskPath,
          multiply: Math.max(0, parseNumber(shaderValues.multiply) ?? 1),
        });
        continue;
      }

      if (kind === 'transform') {
        if ((parseNumber(combos.MODE) ?? 0) !== 0) {
          hasUnsupportedEffects = true;
          continue;
        }
        effects.push({
          kind,
          offset: vec2(shaderValues.offset) ?? [0, 0],
          scale: vec2(shaderValues.scale) ?? [1, 1],
          angle: parseNumber(shaderValues.angle) ?? 0,
        });
        continue;
      }

      if (kind === 'fisheye') {
        effects.push({
          kind,
          center: vec2(shaderValues.center) ?? [0.5, 0.5],
          distortion: Math.max(0, parseNumber(shaderValues.distortion) ?? 1),
          size: Math.max(0.01, parseNumber(shaderValues.size) ?? 1),
          transparentOutside: (parseNumber(combos.BACKGROUND) ?? 1) === 0,
        });
        continue;
      }

      const alpha = Math.min(1, Math.max(0, parseNumber(shaderValues.alpha) ?? 1));
      const maskPath = resolveCompositionTextureReference(index, basePath, effectPath ?? effectReference, textures[1], imageLayersById);
      if (maskPath === undefined) {
        hasUnsupportedEffects = true;
        continue;
      }
      effects.push({ kind: 'opacity', maskPath, alpha });
    }
  }

  return { effects, hasUnsupportedEffects };
};

/**
 * Normalize supported Wallpaper Engine image/surface effects in authored order.
 * Opacity is retained both in its historical parser side-list and in the ordered
 * surface chain; the converter chooses the ordered representation for new imports
 * while the old side-list remains loadable for persisted v1 scenes.
 */
const parseImageEffects = (
  index: ArchiveIndex,
  basePath: string,
  materialPath: string,
  effectChain: WeResolvedEffect[],
): ParsedImageEffects => {
  if (!effectChain.length) {
    return { opacityEffects: [], waterWavesEffects: [], textureEffects: [], hasUnsupportedEffects: false };
  }

  const opacityEffects: WeResolvedOpacityEffect[] = [];
  const waterWavesEffects: WeResolvedWaterWavesEffect[] = [];
  const textureEffects: WeResolvedTextureEffect[] = [];
  let hasUnsupportedEffects = false;

  const parameterFor = (pass: WeResolvedEffect['passes'][number], semanticKey: string) => (
    Object.entries(pass.constants).find(([key]) => (
      canonicalWallpaperEngineEffectParameterKey(key) === semanticKey
    ))?.[1] ?? null
  );

  const effectTextureReferenceFor = (
    effect: WeResolvedEffect,
    pass: WeResolvedEffect['passes'][number],
    textureSlot: number,
  ): string | null => {
    const direct = pass.textures[textureSlot];
    if (typeof direct === 'string' && direct.trim()) return direct;

    // Effect instances can omit a texture when the descriptor material keeps a
    // canonical default. Resolve that default structurally through the
    // descriptor pass's material reference instead of assuming a built-in path.
    if (!pass.materialReference) return null;
    const materialCandidates = [
      index.resolvePath(joinPath(basePath, pass.materialReference)),
      effect.descriptorPath
        ? index.resolvePath(joinPath(dirname(effect.descriptorPath), pass.materialReference))
        : null,
    ].filter((value): value is string => value !== null);
    for (const materialPath of materialCandidates) {
      const material = index.readJson(materialPath);
      if (!material || !Array.isArray(material.passes)) continue;
      const materialPass = material.passes.find((item): item is JsonObject => isObject(item));
      if (!materialPass || !Array.isArray(materialPass.textures)) continue;
      const fallback = materialPass.textures[textureSlot];
      if (typeof fallback === 'string' && fallback.trim()) return fallback;
    }
    return null;
  };

  for (const rawEffect of effectChain) {
    const replacementKey = rawEffect.key;
    const passes = rawEffect.passes;
    if (!passes.length) {
      hasUnsupportedEffects = true;
      continue;
    }

    if (replacementKey === 'opacity') {
      for (const pass of passes) {
        const shaderValues = Object.fromEntries(Object.entries(pass.constants).map(([key, parameter]) => [key, parameter.value]));
        const alpha = Math.min(1, Math.max(0, parseNumber(shaderValues.alpha) ?? 1));
        const textures = pass.textures;
        const maskReference = typeof textures[1] === 'string' && textures[1].trim()
          ? textures[1]
          : null;

        if (!maskReference) {
          const opacityEffect: WeResolvedOpacityEffect = { maskPath: null, alpha };
          opacityEffects.push(opacityEffect);
          textureEffects.push({ kind: 'opacity', ...opacityEffect });
          continue;
        }

        const maskTexture = resolveTexture(index, basePath, materialPath, maskReference, false);
        const maskPath = maskTexture?.paths[0] ?? null;
        if (!maskPath) {
          hasUnsupportedEffects = true;
          continue;
        }
        const opacityEffect: WeResolvedOpacityEffect = { maskPath, alpha };
        opacityEffects.push(opacityEffect);
        textureEffects.push({ kind: 'opacity', ...opacityEffect });
      }
      continue;
    }

    if (replacementKey === 'scroll') {
      for (const pass of passes) {
        const speedXParameter = parameterFor(pass, 'speedx');
        const speedYParameter = parameterFor(pass, 'speedy');
        const repeatParameter = parameterFor(pass, 'repeat');

        // The two canonical WE scroll shader generations in the regression
        // corpus use different persisted material keys, but the same uniforms
        // and equation. Parameter-key normalization above collapses both forms.
        const speedX = parseNumber(speedXParameter?.value) ?? 0.2;
        const speedY = parseNumber(speedYParameter?.value) ?? 0.2;
        const repeatValue = vec2(repeatParameter?.value) ?? [1, 1];
        const repeat: WeVec2 = [
          repeatValue[0] > 0 ? repeatValue[0] : 1,
          repeatValue[1] > 0 ? repeatValue[1] : 1,
        ];

        textureEffects.push({ kind: 'scroll', speedX, speedY, repeat });

        // Base values are rendered, but animated/scripted scroll parameters are
        // still dynamic semantics that this phase does not execute. Keep the
        // compatibility flag honest rather than claiming full support.
        if ([speedXParameter, speedYParameter, repeatParameter].some((parameter) => (
          parameter && (parameter.hasAnimation || parameter.hasScript)
        ))) {
          hasUnsupportedEffects = true;
        }
      }
      continue;
    }

    if (replacementKey === 'transform') {
      // The 12-sample corpus exposes the canonical version-1 transform as a
      // UV pass (MODE=0). MODE=1 mutates geometry in the vertex shader and is
      // deliberately kept outside the image-space effect pipeline.
      if (rawEffect.descriptorVersion !== null && rawEffect.descriptorVersion !== 1) {
        hasUnsupportedEffects = true;
        continue;
      }

      for (const pass of passes) {
        const offsetParameter = parameterFor(pass, 'offset');
        const scaleParameter = parameterFor(pass, 'scale');
        const angleParameter = parameterFor(pass, 'angle');
        const comboFor = (semanticKey: string): number | string | boolean | undefined => (
          Object.entries(pass.combos).find(([key]) => (
            canonicalWallpaperEngineEffectParameterKey(key) === semanticKey
          ))?.[1]
        );
        const mode = parseNumber(comboFor('mode')) ?? 0;
        if (mode !== 0) {
          hasUnsupportedEffects = true;
          continue;
        }

        // WE calls this combo CLAMP, but the canonical fragment shader applies
        // frac() when it is enabled, so semantically it means repeated UVs.
        const repeatValue = comboFor('clamp');
        const repeatNumber = parseNumber(repeatValue);
        const repeat = typeof repeatValue === 'boolean'
          ? repeatValue
          : repeatNumber === null ? true : repeatNumber !== 0;

        textureEffects.push({
          kind: 'transform',
          offset: vec2(offsetParameter?.value) ?? [0, 0],
          scale: vec2(scaleParameter?.value) ?? [1, 1],
          angle: parseNumber(angleParameter?.value) ?? 0,
          repeat,
        });

        // As with other normalized effects, authored base values are retained
        // but animation/SceneScript on these uniforms is not executed yet.
        if ([offsetParameter, scaleParameter, angleParameter].some((parameter) => (
          parameter && (parameter.hasAnimation || parameter.hasScript)
        ))) {
          hasUnsupportedEffects = true;
        }
      }
      continue;
    }

    if (replacementKey === 'spin') {
      for (const pass of passes) {
        const centerParameter = parameterFor(pass, 'center');
        const speedParameter = parameterFor(pass, 'speed');
        const ratioParameter = parameterFor(pass, 'ratio');
        const axisParameter = parameterFor(pass, 'angle');
        const phaseParameter = parameterFor(pass, 'phase');
        const sizeParameter = parameterFor(pass, 'size');
        const featherParameter = parameterFor(pass, 'feather');
        const comboFor = (semanticKey: string): number | string | boolean | undefined => (
          Object.entries(pass.combos).find(([key]) => (
            canonicalWallpaperEngineEffectParameterKey(key) === semanticKey
          ))?.[1]
        );
        const comboEnabled = (semanticKey: string, fallback: boolean): boolean => {
          const value = comboFor(semanticKey);
          if (typeof value === 'boolean') return value;
          const numeric = parseNumber(value);
          return numeric === null ? fallback : numeric !== 0;
        };

        const descriptorVersion = rawEffect.descriptorVersion;
        const hasLegacyCombos = comboFor('mode') !== undefined || comboFor('perspective') !== undefined;
        const hasModernParameters = phaseParameter !== null || sizeParameter !== null || featherParameter !== null;
        const generation = descriptorVersion !== null
          ? (descriptorVersion <= 1 ? 1 : 2)
          : hasLegacyCombos ? 1 : hasModernParameters ? 2 : null;
        if (generation === null) {
          hasUnsupportedEffects = true;
          continue;
        }

        const maskReference = typeof pass.textures[1] === 'string' && pass.textures[1]?.trim()
          ? pass.textures[1]
          : null;
        if (comboEnabled('mask', Boolean(maskReference)) || maskReference) {
          hasUnsupportedEffects = true;
          continue;
        }

        // Version 1 can rotate geometry (MODE=1). That is not a UV effect and
        // belongs in a later transform/render-target phase, so only MODE=0 is
        // normalized here. Version 2 instead adds optional procedural noise.
        if ((generation === 1 && comboEnabled('mode', false))
          || (generation === 2 && comboEnabled('noise', false))) {
          hasUnsupportedEffects = true;
          continue;
        }

        const ratio = parseNumber(ratioParameter?.value) ?? 1;
        if (Math.abs(ratio) < 0.000001) {
          hasUnsupportedEffects = true;
          continue;
        }

        const aspectCorrect = generation === 1
          ? comboEnabled('perspective', true)
          : true;
        const elliptical = aspectCorrect && comboEnabled('elliptical', generation === 2);
        const spinEffect = {
          kind: 'spin' as const,
          center: vec2(centerParameter?.value) ?? [0.5, 0.5] as WeVec2,
          speed: parseNumber(speedParameter?.value) ?? 1,
          ratio,
          axis: parseNumber(axisParameter?.value) ?? 0,
          phase: generation === 2 ? (parseNumber(phaseParameter?.value) ?? 0) : 0,
          size: generation === 2 ? Math.max(0, parseNumber(sizeParameter?.value) ?? 0.1) : 1,
          feather: generation === 2 ? Math.max(0, parseNumber(featherParameter?.value) ?? 0.002) : 0,
          repeat: comboEnabled('repeat', true),
          elliptical,
          aspectCorrect,
          softMask: generation === 2,
        };
        textureEffects.push(spinEffect);

        const dynamicParameters = generation === 2
          ? [centerParameter, speedParameter, ratioParameter, axisParameter, phaseParameter, sizeParameter, featherParameter]
          : [centerParameter, speedParameter, ratioParameter, axisParameter];
        if (dynamicParameters.some((parameter) => parameter && (parameter.hasAnimation || parameter.hasScript))) {
          hasUnsupportedEffects = true;
        }
      }
      continue;
    }

    if (replacementKey === 'perspective') {
      // The currently observed built-in perspective descriptor is version 2.
      // Keep unknown generations unsupported rather than assuming identical
      // homography semantics.
      if (rawEffect.descriptorVersion !== null && rawEffect.descriptorVersion !== 2) {
        hasUnsupportedEffects = true;
        continue;
      }

      for (const pass of passes) {
        const point0Parameter = parameterFor(pass, 'point0');
        const point1Parameter = parameterFor(pass, 'point1');
        const point2Parameter = parameterFor(pass, 'point2');
        const point3Parameter = parameterFor(pass, 'point3');
        const points: [WeVec2, WeVec2, WeVec2, WeVec2] = [
          vec2(point0Parameter?.value) ?? [0, 0],
          vec2(point1Parameter?.value) ?? [1, 0],
          vec2(point2Parameter?.value) ?? [1, 1],
          vec2(point3Parameter?.value) ?? [0, 1],
        ];
        const comboEntry = Object.entries(pass.combos).find(([key]) => (
          canonicalWallpaperEngineEffectParameterKey(key) === 'repeat'
        ));
        const comboValue = comboEntry?.[1];
        const comboNumber = parseNumber(comboValue);
        const repeat = typeof comboValue === 'boolean'
          ? comboValue
          : comboNumber !== null ? comboNumber !== 0 : false;

        textureEffects.push({ kind: 'perspective', points, repeat });

        if ([point0Parameter, point1Parameter, point2Parameter, point3Parameter].some((parameter) => (
          parameter && (parameter.hasAnimation || parameter.hasScript)
        ))) {
          hasUnsupportedEffects = true;
        }
      }
      continue;
    }

    if (replacementKey === 'foliagesway') {
      for (const pass of passes) {
        const uvParameterFor = (rawKey: string, semanticKey: string) => (
          pass.constants[rawKey] ?? parameterFor(pass, semanticKey)
        );
        // Version-2 foliage sway can retain legacy vertex parameters with the
        // same case-insensitive names (Phase/Power/Strength) alongside the UV
        // values (phase/power/strength). Prefer the actual v2 material keys so
        // normalization never mixes the two shader modes.
        const speedParameter = uvParameterFor('speeduv', 'speeduv');
        const strengthParameter = uvParameterFor('strength', 'strength');
        const phaseParameter = uvParameterFor('phase', 'phase');
        const powerParameter = uvParameterFor('power', 'power');
        const noiseScaleParameter = uvParameterFor('scale', 'scale');
        const ratioParameter = uvParameterFor('ratio', 'ratio');
        const directionParameter = uvParameterFor('scrolldirection', 'scrolldirection');
        const comboFor = (semanticKey: string): number | string | boolean | undefined => (
          Object.entries(pass.combos).find(([key]) => (
            canonicalWallpaperEngineEffectParameterKey(key) === semanticKey
          ))?.[1]
        );

        // WE's legacy foliage-sway shader (the no-version descriptor in sample
        // 3) is vertex deformation only. Version 2 introduced MODE=0 UV sway.
        // A missing descriptor version is accepted only when the persisted pass
        // itself exposes the version-2 UV parameter set, avoiding path/sample
        // special-cases while keeping unknown shader generations conservative.
        const hasUvParameterSet = [speedParameter, noiseScaleParameter, ratioParameter, directionParameter]
          .some((parameter) => parameter !== null);
        const isVersion2UvGeneration = rawEffect.descriptorVersion === 2
          || (rawEffect.descriptorVersion === null && hasUvParameterSet);
        const modeValue = parseNumber(comboFor('mode')) ?? 0;
        if (!isVersion2UvGeneration || modeValue !== 0) {
          hasUnsupportedEffects = true;
          continue;
        }

        const ratio = parseNumber(ratioParameter?.value) ?? 0.3;
        if (ratio <= 0) {
          hasUnsupportedEffects = true;
          continue;
        }

        const resolveOptionalEffectTexture = (value: unknown): string | null | undefined => {
          if (typeof value !== 'string' || !value.trim()) return null;
          const texture = resolveTexture(index, basePath, materialPath, value, false);
          return texture?.paths[0];
        };
        const maskReference = pass.textures[1];
        const noiseReference = pass.textures[2];
        const maskPath = resolveOptionalEffectTexture(maskReference);
        if (maskPath === undefined) {
          hasUnsupportedEffects = true;
          continue;
        }

        // The canonical version-2 descriptor defaults slot 2 to WE's built-in
        // `util/noise`, which RePKG scene archives do not contain. A null slot
        // therefore means "use the built-in noise" and is represented by a null
        // path. Explicit custom noise textures are resolved/persisted normally.
        let noisePath: string | null = null;
        if (typeof noiseReference === 'string' && noiseReference.trim()) {
          const normalizedNoiseReference = normalizePath(noiseReference)
            .toLowerCase()
            .replace(/\.[^/.]+$/, '');
          if (normalizedNoiseReference !== 'util/noise') {
            const resolvedNoisePath = resolveOptionalEffectTexture(noiseReference);
            if (resolvedNoisePath === undefined) {
              hasUnsupportedEffects = true;
              continue;
            }
            noisePath = resolvedNoisePath;
          }
        }

        const foliageSwayEffect: WeResolvedFoliageSwayEffect = {
          maskPath,
          noisePath,
          speed: parseNumber(speedParameter?.value) ?? 5,
          strength: Math.max(0, parseNumber(strengthParameter?.value) ?? 0.4),
          phase: parseNumber(phaseParameter?.value) ?? 0.5,
          power: Math.max(0.0001, parseNumber(powerParameter?.value) ?? 1),
          noiseScale: Math.max(0, parseNumber(noiseScaleParameter?.value) ?? 0.05),
          ratio,
          direction: parseNumber(directionParameter?.value) ?? 0,
        };
        textureEffects.push({ kind: 'foliageSway', ...foliageSwayEffect });

        if ([
          speedParameter,
          strengthParameter,
          phaseParameter,
          powerParameter,
          noiseScaleParameter,
          ratioParameter,
          directionParameter,
        ].some((parameter) => parameter && (parameter.hasAnimation || parameter.hasScript))) {
          hasUnsupportedEffects = true;
        }
      }
      continue;
    }

    if (replacementKey === 'waterflow') {
      for (const pass of passes) {
        const speedParameter = parameterFor(pass, 'speed');
        const strengthParameter = parameterFor(pass, 'strength');
        const phaseScaleParameter = parameterFor(pass, 'phasescale');
        const featherParameter = parameterFor(pass, 'feather');
        const rawConstantKeys = Object.keys(pass.constants);
        const hasLegacyUiKeys = rawConstantKeys.some((key) => key.toLowerCase().startsWith('ui_editor_properties_'));

        // Three canonical generations are present in the regression corpus:
        // old no-version descriptors use UI-prefixed material keys and a
        // single two-sample phase cycle; newer descriptors use the dual-cycle
        // equation, optionally with a feathered cross-fade. Classify by
        // descriptor/parameter structure rather than sample or resource path.
        const phaseMode: WeResolvedWaterFlowEffect['phaseMode'] = (
          rawEffect.descriptorVersion === null && hasLegacyUiKeys
        ) ? 'legacy' : 'dual';

        const resolveOptionalEffectTexture = (value: unknown): string | null | undefined => {
          if (typeof value !== 'string' || !value.trim()) return null;
          const normalized = normalizePath(value).toLowerCase().replace(/\.[^/.]+$/, '');
          if (normalized === 'util/noflow') return null;
          const texture = resolveTexture(index, basePath, materialPath, value, false);
          return texture?.paths[0];
        };
        const flowMapPath = resolveOptionalEffectTexture(pass.textures[1]);
        if (flowMapPath === undefined) {
          hasUnsupportedEffects = true;
          continue;
        }

        const phaseReference = pass.textures[2];
        if (typeof phaseReference !== 'string' || !phaseReference.trim()) {
          hasUnsupportedEffects = true;
          continue;
        }
        const phaseTexture = resolveTexture(index, basePath, materialPath, phaseReference, false);
        const phasePath = phaseTexture?.paths[0] ?? null;
        if (!phasePath) {
          hasUnsupportedEffects = true;
          continue;
        }

        const phaseScale = parseNumber(phaseScaleParameter?.value) ?? (phaseMode === 'legacy' ? 1 : 2);
        const featherValue = featherParameter ? parseNumber(featherParameter.value) : null;
        if (phaseScale <= 0 || (featherValue !== null && (featherValue < 0 || featherValue > 0.5))) {
          hasUnsupportedEffects = true;
          continue;
        }

        const waterFlowEffect: WeResolvedWaterFlowEffect = {
          flowMapPath,
          phasePath,
          speed: Math.max(0, parseNumber(speedParameter?.value) ?? 1),
          strength: Math.max(0, parseNumber(strengthParameter?.value) ?? 1),
          phaseScale,
          phaseMode,
          feather: featherValue,
        };
        textureEffects.push({ kind: 'waterFlow', ...waterFlowEffect });

        if ([speedParameter, strengthParameter, phaseScaleParameter, featherParameter].some((parameter) => (
          parameter && (parameter.hasAnimation || parameter.hasScript)
        ))) {
          hasUnsupportedEffects = true;
        }
      }
      continue;
    }


    if (replacementKey === 'shine') {
      // Samples 1/5/6 expose the same version-1 five-pass shine graph:
      // downsample/threshold -> ray cast -> Gaussian X -> Gaussian Y -> combine.
      // Ordinary-image instances all use the canonical additive combine path.
      if ((rawEffect.descriptorVersion !== null && rawEffect.descriptorVersion !== 1) || passes.length !== 5) {
        hasUnsupportedEffects = true;
        continue;
      }

      const downsamplePass = passes[0];
      const castPass = passes[1];
      const gaussianXPass = passes[2];
      const gaussianYPass = passes[3];
      const combinePass = passes[4];
      const comboFor = (
        pass: WeResolvedEffect['passes'][number],
        semanticKey: string,
      ): number | string | boolean | undefined => (
        Object.entries(pass.combos).find(([key]) => (
          canonicalWallpaperEngineEffectParameterKey(key) === semanticKey
        ))?.[1]
      );
      const comboNumber = (
        pass: WeResolvedEffect['passes'][number],
        semanticKey: string,
        fallback: number,
      ): number => parseNumber(comboFor(pass, semanticKey)) ?? fallback;

      const noiseEnabled = comboNumber(downsamplePass, 'noise', 1) !== 0;
      const edgesValue = comboNumber(castPass, 'edges', 4);
      const sampleModeValue = comboNumber(castPass, 'samples', 1);
      const kernelX = comboNumber(gaussianXPass, 'kernel', 0);
      const kernelY = comboNumber(gaussianYPass, 'kernel', 0);
      const verticalX = comboNumber(gaussianXPass, 'vertical', 0);
      const verticalY = comboNumber(gaussianYPass, 'vertical', 1);
      const blendMode = comboNumber(combinePass, 'blendmode', 9);
      const copyBackground = comboNumber(combinePass, 'copybg', 0) !== 0;

      if (
        !Number.isInteger(edgesValue) || edgesValue < 2 || edgesValue > 5
        || !Number.isInteger(sampleModeValue) || sampleModeValue < 0 || sampleModeValue > 3
        || kernelX !== 0 || kernelY !== 0
        || verticalX !== 0 || verticalY !== 1
        // common_blending.h defines the canonical numeric image blend modes
        // from 0 (replace) through 32. COPYBG remains a separate compositor
        // dependency and is deliberately kept unsupported here.
        || !Number.isInteger(blendMode) || blendMode < 0 || blendMode > 32
        || copyBackground
      ) {
        hasUnsupportedEffects = true;
        continue;
      }

      const thresholdParameter = parameterFor(downsamplePass, 'raythreshold');
      const noiseAmountParameter = parameterFor(downsamplePass, 'noiseamount');
      const noiseScaleParameter = parameterFor(downsamplePass, 'noisescale');
      const noiseSpeedParameter = parameterFor(downsamplePass, 'noisespeed');
      const colorParameter = parameterFor(castPass, 'color');
      const directionParameter = parameterFor(castPass, 'direction');
      const intensityParameter = parameterFor(castPass, 'rayintensity');
      const lengthParameter = parameterFor(castPass, 'raylength');
      const speedParameter = parameterFor(castPass, 'speed');
      const scaleXParameter = parameterFor(gaussianXPass, 'scale');
      const scaleYParameter = parameterFor(gaussianYPass, 'scale');

      const threshold = parseNumber(thresholdParameter?.value) ?? 0.5;
      const noiseAmount = parseNumber(noiseAmountParameter?.value) ?? 0.4;
      const noiseScale = parseNumber(noiseScaleParameter?.value) ?? 3;
      const noiseSpeed = parseNumber(noiseSpeedParameter?.value) ?? 0.15;
      const rayIntensity = parseNumber(intensityParameter?.value) ?? 1;
      const rayLength = parseNumber(lengthParameter?.value) ?? 0.1;
      const blurScaleX = vec2(scaleXParameter?.value) ?? [1, 1];
      const blurScaleY = vec2(scaleYParameter?.value) ?? [1, 1];

      if (
        threshold < 0 || threshold > 1
        || noiseAmount < 0
        || noiseScale <= 0
        || !Number.isFinite(noiseSpeed)
        || rayIntensity < 0
        || rayLength < 0
        || blurScaleX[0] <= 0
        || blurScaleY[1] <= 0
      ) {
        hasUnsupportedEffects = true;
        continue;
      }

      const maskReference = effectTextureReferenceFor(rawEffect, downsamplePass, 1);
      let maskPath: string | null = null;
      if (maskReference) {
        const maskTexture = resolveTexture(index, basePath, materialPath, maskReference, false);
        maskPath = maskTexture?.paths[0] ?? null;
        if (!maskPath) {
          hasUnsupportedEffects = true;
          continue;
        }
      }

      // The canonical shader defaults slot 2 to WE's engine-owned
      // `util/clouds_256`, which RePKG archives generally do not contain.
      // Null therefore means use the renderer's deterministic built-in-noise
      // compatibility texture. Explicit non-built-in textures are persisted.
      const noiseReference = effectTextureReferenceFor(rawEffect, downsamplePass, 2);
      let noisePath: string | null = null;
      if (noiseReference) {
        const normalizedNoiseReference = normalizePath(noiseReference)
          .toLowerCase()
          .replace(/\.[^/.]+$/, '');
        if (normalizedNoiseReference !== 'util/clouds_256') {
          const noiseTexture = resolveTexture(index, basePath, materialPath, noiseReference, false);
          noisePath = noiseTexture?.paths[0] ?? null;
          if (!noisePath) {
            hasUnsupportedEffects = true;
            continue;
          }
        }
      }

      const shineEffect: WeResolvedShineEffect = {
        maskPath,
        noisePath,
        threshold,
        noiseAmount,
        noiseScale,
        noiseSpeed,
        rayColor: vec3(colorParameter?.value, [1, 1, 1]),
        rayDirection: parseNumber(directionParameter?.value) ?? 0,
        raySpeed: parseNumber(speedParameter?.value) ?? 0,
        rayIntensity,
        rayLength,
        edges: edgesValue as 2 | 3 | 4 | 5,
        sampleMode: sampleModeValue as 0 | 1 | 2 | 3,
        blurScale: [blurScaleX[0], blurScaleY[1]],
        kernel: 0,
        blendMode,
        copyBackground,
        noiseEnabled,
      };
      textureEffects.push({ kind: 'shine', ...shineEffect });

      if ([
        thresholdParameter,
        noiseAmountParameter,
        noiseScaleParameter,
        noiseSpeedParameter,
        colorParameter,
        directionParameter,
        intensityParameter,
        lengthParameter,
        speedParameter,
        scaleXParameter,
        scaleYParameter,
      ].some((parameter) => parameter && (parameter.hasAnimation || parameter.hasScript))) {
        hasUnsupportedEffects = true;
      }
      continue;
    }

    if (replacementKey === 'godrays') {
      // Sample 2 exposes Wallpaper Engine's canonical five-pass God Rays graph:
      // threshold extraction -> ray cast -> Gaussian X -> Gaussian Y -> combine,
      // using the same two half-resolution named FBOs as Shine. Normalize the
      // semantic parameters rather than persisting sample/material paths.
      if ((rawEffect.descriptorVersion !== null && rawEffect.descriptorVersion !== 1) || passes.length !== 5) {
        hasUnsupportedEffects = true;
        continue;
      }

      const downsamplePass = passes[0];
      const castPass = passes[1];
      const gaussianXPass = passes[2];
      const gaussianYPass = passes[3];
      const combinePass = passes[4];
      const comboFor = (
        pass: WeResolvedEffect['passes'][number],
        semanticKey: string,
      ): number | string | boolean | undefined => (
        Object.entries(pass.combos).find(([key]) => (
          canonicalWallpaperEngineEffectParameterKey(key) === semanticKey
        ))?.[1]
      );
      const comboNumber = (
        pass: WeResolvedEffect['passes'][number],
        semanticKey: string,
        fallback: number,
      ): number => parseNumber(comboFor(pass, semanticKey)) ?? fallback;

      const casterValue = comboNumber(castPass, 'caster', 0);
      const sampleModeValue = comboNumber(castPass, 'samples', 0);
      const kernelX = comboNumber(gaussianXPass, 'kernel', 1);
      const kernelY = comboNumber(gaussianYPass, 'kernel', 1);
      const verticalX = comboNumber(gaussianXPass, 'vertical', 0);
      const verticalY = comboNumber(gaussianYPass, 'vertical', 1);
      const blendMode = comboNumber(combinePass, 'blendmode', 9);

      if (
        !Number.isInteger(casterValue) || casterValue < 0 || casterValue > 1
        || !Number.isInteger(sampleModeValue) || sampleModeValue < 0 || sampleModeValue > 2
        || !Number.isInteger(kernelX) || kernelX < 0 || kernelX > 2
        || kernelY !== kernelX
        || verticalX !== 0 || verticalY !== 1
        || !Number.isInteger(blendMode) || blendMode < 0 || blendMode > 32
      ) {
        hasUnsupportedEffects = true;
        continue;
      }

      const thresholdParameter = parameterFor(downsamplePass, 'raythreshold');
      const centerParameter = parameterFor(castPass, 'center');
      const directionParameter = parameterFor(castPass, 'direction');
      const lengthParameter = parameterFor(castPass, 'raylength');
      const intensityParameter = parameterFor(castPass, 'rayintensity');
      const colorStartParameter = parameterFor(castPass, 'colorstart');
      const colorEndParameter = parameterFor(castPass, 'colorend');
      const scaleXParameter = parameterFor(gaussianXPass, 'blurscale') ?? parameterFor(gaussianXPass, 'scale');
      const scaleYParameter = parameterFor(gaussianYPass, 'blurscale') ?? parameterFor(gaussianYPass, 'scale');

      const threshold = parseNumber(thresholdParameter?.value) ?? 0.5;
      const rayLength = parseNumber(lengthParameter?.value) ?? 0.5;
      const rayIntensity = parseNumber(intensityParameter?.value) ?? 1;
      const blurScaleX = vec2(scaleXParameter?.value) ?? [1, 1];
      const blurScaleY = vec2(scaleYParameter?.value) ?? [1, 1];

      if (
        threshold < 0 || threshold > 1
        || rayLength <= 0 || rayLength > 1
        || rayIntensity < 0 || rayIntensity > 2
        || blurScaleX[0] <= 0 || blurScaleY[1] <= 0
      ) {
        hasUnsupportedEffects = true;
        continue;
      }

      const maskReference = effectTextureReferenceFor(rawEffect, downsamplePass, 1);
      let maskPath: string | null = null;
      if (maskReference) {
        const normalizedMaskReference = normalizePath(maskReference)
          .toLowerCase()
          .replace(/\.[^/.]+$/, '');
        // WE's canonical default is engine-owned `util/white`, semantically no mask.
        if (normalizedMaskReference !== 'util/white') {
          const maskTexture = resolveTexture(index, basePath, materialPath, maskReference, false);
          maskPath = maskTexture?.paths[0] ?? null;
          if (!maskPath) {
            hasUnsupportedEffects = true;
            continue;
          }
        }
      }

      const caster = casterValue === 0
        ? {
            mode: 'radial' as const,
            center: vec2(centerParameter?.value) ?? [0.5, 0.5] as WeVec2,
          }
        : {
            mode: 'directional' as const,
            direction: parseNumber(directionParameter?.value) ?? 0,
          };

      const godRaysEffect: WeResolvedGodRaysEffect = {
        maskPath,
        threshold,
        caster,
        rayLength,
        rayIntensity,
        colorStart: vec3(colorStartParameter?.value, [1, 1, 1]),
        colorEnd: vec3(colorEndParameter?.value, [1, 1, 1]),
        sampleMode: sampleModeValue as 0 | 1 | 2,
        blurScale: [blurScaleX[0], blurScaleY[1]],
        kernel: kernelX as 0 | 1 | 2,
        blendMode,
      };
      textureEffects.push({ kind: 'godRays', ...godRaysEffect });

      if ([
        thresholdParameter,
        centerParameter,
        directionParameter,
        lengthParameter,
        intensityParameter,
        colorStartParameter,
        colorEndParameter,
        scaleXParameter,
        scaleYParameter,
      ].some((parameter) => parameter && (parameter.hasAnimation || parameter.hasScript))) {
        hasUnsupportedEffects = true;
      }
      continue;
    }

    if (replacementKey === 'blurprecise') {
      // The supplied canonical version-1 precise blur is a two-pass full-size
      // Gaussian: horizontal pass -> named FBO -> vertical/final pass. Normalize
      // that structure into one renderer-neutral image effect rather than
      // retaining sample/material paths in the renderer.
      if ((rawEffect.descriptorVersion !== null && rawEffect.descriptorVersion !== 1) || passes.length !== 2) {
        hasUnsupportedEffects = true;
        continue;
      }

      const horizontalPass = passes[0];
      const verticalPass = passes[1];
      const comboNumber = (
        pass: WeResolvedEffect['passes'][number],
        semanticKey: string,
        fallback: number,
      ): number => {
        const entry = Object.entries(pass.combos).find(([key]) => (
          canonicalWallpaperEngineEffectParameterKey(key) === semanticKey
        ));
        return parseNumber(entry?.[1]) ?? fallback;
      };
      const kernelFor = (pass: WeResolvedEffect['passes'][number]): 0 | 1 | 2 | null => {
        const value = comboNumber(pass, 'kernel', 0);
        return Number.isInteger(value) && value >= 0 && value <= 2 ? value as 0 | 1 | 2 : null;
      };

      const horizontalScaleParameter = parameterFor(horizontalPass, 'scale');
      const verticalScaleParameter = parameterFor(verticalPass, 'scale');
      const horizontalScale = vec2(horizontalScaleParameter?.value) ?? [1, 1];
      const verticalScale = vec2(verticalScaleParameter?.value) ?? [1, 1];
      const horizontalKernel = kernelFor(horizontalPass);
      const verticalKernel = kernelFor(verticalPass);
      const horizontalVerticalCombo = comboNumber(horizontalPass, 'vertical', 0);
      const verticalVerticalCombo = comboNumber(verticalPass, 'vertical', 1);
      const horizontalBlurAlpha = comboNumber(horizontalPass, 'bluralpha', 1);
      const verticalBlurAlpha = comboNumber(verticalPass, 'bluralpha', 1);
      const maskReference = effectTextureReferenceFor(rawEffect, verticalPass, 2);
      let maskPath: string | null = null;
      if (maskReference) {
        const maskTexture = resolveTexture(index, basePath, materialPath, maskReference, false);
        maskPath = maskTexture?.paths[0] ?? null;
        if (!maskPath) {
          hasUnsupportedEffects = true;
          continue;
        }
      }

      if (
        horizontalKernel !== 0
        || verticalKernel !== 0
        || horizontalVerticalCombo !== 0
        || verticalVerticalCombo !== 1
        || horizontalBlurAlpha !== 1
        || (verticalBlurAlpha !== 0 && verticalBlurAlpha !== 1)
        || horizontalScale[0] <= 0
        || verticalScale[1] <= 0
      ) {
        hasUnsupportedEffects = true;
        continue;
      }

      const blurPreciseEffect: WeResolvedBlurPreciseEffect = {
        maskPath,
        scale: [horizontalScale[0], verticalScale[1]],
        horizontalKernel,
        verticalKernel,
        blurAlpha: verticalBlurAlpha !== 0,
      };
      textureEffects.push({ kind: 'blurPrecise', ...blurPreciseEffect });

      if ([horizontalScaleParameter, verticalScaleParameter].some((parameter) => (
        parameter && (parameter.hasAnimation || parameter.hasScript)
      ))) {
        hasUnsupportedEffects = true;
      }
      continue;
    }

    if (replacementKey === 'shimmer') {
      for (const pass of passes) {
        const brightness = Math.max(0, parseNumber(parameterFor(pass, 'brightness')?.value) ?? 0.75);
        const color = colorRgb(parameterFor(pass, 'color')?.value) ?? [1, 1, 1];
        const delay = Math.max(0, parseNumber(parameterFor(pass, 'delay')?.value) ?? 0);
        const direction = parseNumber(parameterFor(pass, 'direction')?.value) ?? 0;
        const granularity = Math.max(0.01, parseNumber(parameterFor(pass, 'granularity')?.value) ?? 1);
        const offset = parseNumber(parameterFor(pass, 'offset')?.value) ?? 0;
        const speed = parseNumber(parameterFor(pass, 'speed')?.value) ?? 1;
        textureEffects.push({
          kind: 'shimmer',
          brightness,
          color,
          delay,
          direction,
          granularity,
          offset,
          speed,
        });
      }
      continue;
    }

    if (replacementKey === 'shake') {
      // Samples 6/10/11 expose one byte-identical version-1 shake shader. This
      // phase implements its deterministic flow-map path only: no audio
      // response, procedural NOISE mode, time-offset texture, or opacity mask.
      if (rawEffect.descriptorVersion !== null && rawEffect.descriptorVersion !== 1) {
        hasUnsupportedEffects = true;
        continue;
      }

      for (const pass of passes) {
        const comboFor = (semanticKey: string): number | string | boolean | undefined => (
          Object.entries(pass.combos).find(([key]) => (
            canonicalWallpaperEngineEffectParameterKey(key) === semanticKey
          ))?.[1]
        );
        const comboNumber = (semanticKey: string, fallback = 0): number => (
          parseNumber(comboFor(semanticKey)) ?? fallback
        );
        const audioProcessing = comboNumber('audioprocessing');
        const noise = comboNumber('noise');
        const directionModeValue = comboNumber('direction');
        const timeOffsetEnabled = comboNumber('timeoffset') !== 0;
        const maskEnabled = comboNumber('mask') !== 0;
        if (
          audioProcessing !== 0
          || noise !== 0
          || timeOffsetEnabled
          || maskEnabled
          || !Number.isInteger(directionModeValue)
          || directionModeValue < 0
          || directionModeValue > 2
          || (typeof pass.textures[2] === 'string' && pass.textures[2].trim().length > 0)
          || (typeof pass.textures[3] === 'string' && pass.textures[3].trim().length > 0)
        ) {
          hasUnsupportedEffects = true;
          continue;
        }

        const speedParameter = parameterFor(pass, 'speed');
        const strengthParameter = parameterFor(pass, 'strength');
        const frictionParameter = parameterFor(pass, 'friction');
        const boundsParameter = parameterFor(pass, 'bounds');
        const friction = vec2(frictionParameter?.value) ?? [1, 1];
        const bounds = vec2(boundsParameter?.value) ?? [0, 1];
        const speed = parseNumber(speedParameter?.value) ?? 1;
        const strength = parseNumber(strengthParameter?.value) ?? 0.1;
        if (
          speed < 0
          || strength < 0
          || friction[0] <= 0
          || friction[1] <= 0
          || bounds[1] <= bounds[0]
        ) {
          hasUnsupportedEffects = true;
          continue;
        }

        const directionReference = pass.textures[1];
        let directionMapPath: string | null = null;
        if (typeof directionReference === 'string' && directionReference.trim()) {
          const normalized = normalizePath(directionReference).toLowerCase().replace(/\.[^/.]+$/, '');
          if (normalized !== 'util/noflow') {
            const directionTexture = resolveTexture(index, basePath, materialPath, directionReference, false);
            directionMapPath = directionTexture?.paths[0] ?? null;
            if (!directionMapPath) {
              hasUnsupportedEffects = true;
              continue;
            }
          }
        }

        const shakeEffect: WeResolvedShakeEffect = {
          directionMapPath,
          speed,
          strength,
          friction,
          bounds,
          directionMode: directionModeValue as 0 | 1 | 2,
        };
        textureEffects.push({ kind: 'shake', ...shakeEffect });

        if ([speedParameter, strengthParameter, frictionParameter, boundsParameter].some((parameter) => (
          parameter && (parameter.hasAnimation || parameter.hasScript)
        ))) {
          hasUnsupportedEffects = true;
        }
      }
      continue;
    }

    if (replacementKey === 'waterripple') {
      // The current corpus exposes one canonical version-1 image-space ripple
      // generation. Perspective projection and specular lighting are separate
      // shader variants and stay explicitly unsupported in this phase.
      if (rawEffect.descriptorVersion !== null && rawEffect.descriptorVersion !== 1) {
        hasUnsupportedEffects = true;
        continue;
      }

      for (const pass of passes) {
        const comboFor = (semanticKey: string): number | string | boolean | undefined => (
          Object.entries(pass.combos).find(([key]) => (
            canonicalWallpaperEngineEffectParameterKey(key) === semanticKey
          ))?.[1]
        );
        const perspective = parseNumber(comboFor('perspective')) ?? 0;
        const specular = parseNumber(comboFor('specular')) ?? 0;
        const hasPerspectivePoints = ['point0', 'point1', 'point2', 'point3'].some((semanticKey) => (
          parameterFor(pass, semanticKey) !== null
        ));
        if (perspective !== 0 || specular !== 0 || hasPerspectivePoints) {
          hasUnsupportedEffects = true;
          continue;
        }

        const animationSpeedParameter = parameterFor(pass, 'animationspeed');
        const scaleParameter = parameterFor(pass, 'scale');
        const scrollSpeedParameter = parameterFor(pass, 'scrollspeed');
        const directionParameter = parameterFor(pass, 'scrolldirection');
        const ratioParameter = parameterFor(pass, 'ratio');
        const strengthParameter = parameterFor(pass, 'ripplestrength');

        const normalReference = effectTextureReferenceFor(rawEffect, pass, 2);
        if (!normalReference) {
          hasUnsupportedEffects = true;
          continue;
        }
        const normalTexture = resolveTexture(index, basePath, materialPath, normalReference, false);
        const normalPath = normalTexture?.paths[0] ?? null;
        if (!normalPath) {
          hasUnsupportedEffects = true;
          continue;
        }

        const maskReference = effectTextureReferenceFor(rawEffect, pass, 1);
        let maskPath: string | null = null;
        if (maskReference) {
          const maskTexture = resolveTexture(index, basePath, materialPath, maskReference, false);
          maskPath = maskTexture?.paths[0] ?? null;
          if (!maskPath) {
            hasUnsupportedEffects = true;
            continue;
          }
        }

        textureEffects.push({
          kind: 'waterRipple',
          maskPath,
          normalPath,
          animationSpeed: parseNumber(animationSpeedParameter?.value) ?? 0.15,
          scale: Math.max(0, parseNumber(scaleParameter?.value) ?? 1),
          scrollSpeed: parseNumber(scrollSpeedParameter?.value) ?? 0,
          direction: parseNumber(directionParameter?.value) ?? 0,
          ratio: Math.max(0, parseNumber(ratioParameter?.value) ?? 1),
          strength: Math.max(0, parseNumber(strengthParameter?.value) ?? 0.1),
        });

        if ([
          animationSpeedParameter,
          scaleParameter,
          scrollSpeedParameter,
          directionParameter,
          ratioParameter,
          strengthParameter,
        ].some((parameter) => parameter && (parameter.hasAnimation || parameter.hasScript))) {
          hasUnsupportedEffects = true;
        }
      }
      continue;
    }

    if (replacementKey === 'waterwaves') {
      for (const pass of passes) {
        const shaderValues = Object.fromEntries(Object.entries(pass.constants).map(([key, parameter]) => [key, parameter.value]));
        // The first implementation intentionally matches WE's base single-wave
        // shader path. Perspective and dual-wave combos are retained as
        // unsupported instead of silently approximating different semantics.
        const hasPerspective = ['point0', 'point1', 'point2', 'point3'].some((key) => shaderValues[key] !== undefined);
        const hasDualWaves = ['direction2', 'speed2', 'scale2', 'offset2', 'exponent2'].some((key) => shaderValues[key] !== undefined);
        if (hasPerspective || hasDualWaves) {
          hasUnsupportedEffects = true;
          continue;
        }

        const textures = pass.textures;
        const resolveOptionalEffectTexture = (value: unknown): string | null | undefined => {
          if (typeof value !== 'string' || !value.trim()) return null;
          const texture = resolveTexture(index, basePath, materialPath, value, false);
          return texture?.paths[0];
        };
        const maskPath = resolveOptionalEffectTexture(textures[1]);
        const timeOffsetPath = resolveOptionalEffectTexture(textures[2]);
        if (maskPath === undefined || timeOffsetPath === undefined) {
          hasUnsupportedEffects = true;
          continue;
        }

        const waterWavesEffect: WeResolvedWaterWavesEffect = {
          maskPath,
          timeOffsetPath,
          direction: parseNumber(shaderValues.direction) ?? 0,
          speed: Math.max(0, parseNumber(shaderValues.speed) ?? 5),
          scale: Math.max(0, parseNumber(shaderValues.scale) ?? 200),
          exponent: Math.max(0.0001, parseNumber(shaderValues.exponent) ?? 1),
          strength: Math.max(0, parseNumber(shaderValues.strength) ?? 0.1),
        };
        waterWavesEffects.push(waterWavesEffect);
        textureEffects.push({ kind: 'waterWaves', ...waterWavesEffect });
      }
      continue;
    }

    hasUnsupportedEffects = true;
  }

  return { opacityEffects, waterWavesEffects, textureEffects, hasUnsupportedEffects };
};

const transformFromObject = (object: JsonObject): WeLayerTransform => {
  const angles = vec3(object.angles, [0, 0, 0]);
  return {
    origin: vec3(object.origin, [0, 0, 0]),
    alignment: layerAlignment(object.alignment),
    scale: vec3(object.scale, [1, 1, 1]),
    // The browser renderer uses a Y-down stage. Reflecting WE's Y-up 2D
    // coordinate system changes the handedness, so Z rotation must reverse
    // direction as well. Keep X/Y untouched because the current renderer only
    // applies the 2D Z angle.
    angles: [angles[0], angles[1], angles[2] === 0 ? 0 : -angles[2]],
    size: vec2(object.size),
    parallaxDepth: vec2(object.parallaxDepth),
    opacity: Math.min(1, Math.max(0, parseNumber(object.alpha) ?? 1)),
    visible: resolveVisible(object.visible),
  };
};

const parseAnimationKeyframes = (value: unknown): WeAnimationKeyframe[] => {
  if (!Array.isArray(value)) return [];
  const keyframes: WeAnimationKeyframe[] = [];
  for (const item of value) {
    if (!isObject(item)) continue;
    const frame = parseNumber(item.frame);
    const keyframeValue = parseNumber(item.value);
    if (frame === null || keyframeValue === null || frame < 0) continue;
    keyframes.push({ frame, value: keyframeValue });
  }
  return keyframes.sort((a, b) => a.frame - b.frame);
};

const parseRelativeOriginAnimation = (object: JsonObject): WePointAnimation | null => {
  if (!isObject(object.origin) || !isObject(object.origin.animation)) return null;
  const animation = object.origin.animation;
  if (animation.relative !== true) return null;
  const options = isObject(animation.options) ? animation.options : {};
  const fps = parseNumber(options.fps);
  const lengthFrames = parseNumber(options.length);
  if (fps === null || fps <= 0 || lengthFrames === null || lengthFrames <= 0) return null;

  const rawMode = stringValue(options.mode);
  const mode: WePointAnimation['mode'] = (
    rawMode === 'loop' || rawMode === 'mirror' || rawMode === 'single' ? rawMode : 'single'
  );
  const x = parseAnimationKeyframes(animation.c0);
  const y = parseAnimationKeyframes(animation.c1);
  if (!x.length && !y.length) return null;

  return {
    fps,
    lengthFrames,
    mode,
    x: x.length ? x : [{ frame: 0, value: 0 }],
    y: y.length ? y : [{ frame: 0, value: 0 }],
  };
};

const sampleAnimationCurveAtFrame = (keyframes: WeAnimationKeyframe[], frame: number): number => {
  if (!keyframes.length) return 0;
  if (frame <= keyframes[0].frame) return keyframes[0].value;
  for (let index = 1; index < keyframes.length; index += 1) {
    const next = keyframes[index];
    if (frame > next.frame) continue;
    const previous = keyframes[index - 1];
    const span = next.frame - previous.frame;
    if (span <= 0) return next.value;
    const progress = (frame - previous.frame) / span;
    return previous.value + (next.value - previous.value) * progress;
  }
  return keyframes[keyframes.length - 1].value;
};

const transformPointAnimation = (
  animation: WePointAnimation,
  parentTransform: WeLayerTransform | null,
  invertRootY: boolean,
): WePointAnimation => {
  if (!parentTransform) {
    if (!invertRootY) return animation;
    return {
      ...animation,
      y: animation.y.map((keyframe) => ({ ...keyframe, value: keyframe.value === 0 ? 0 : -keyframe.value })),
    };
  }
  const frames = [...new Set([
    ...animation.x.map((item) => item.frame),
    ...animation.y.map((item) => item.frame),
  ])].sort((a, b) => a - b);
  const radians = parentTransform.angles[2];
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const x: WeAnimationKeyframe[] = [];
  const y: WeAnimationKeyframe[] = [];

  for (const frame of frames) {
    const localX = sampleAnimationCurveAtFrame(animation.x, frame) * parentTransform.scale[0];
    // Wallpaper Engine parent-local 2D transforms use the opposite Y direction
    // from the browser stage. Flip local Y before applying the parent's
    // rotation so animated children follow the same transform as static ones.
    const localY = -sampleAnimationCurveAtFrame(animation.y, frame) * parentTransform.scale[1];
    x.push({ frame, value: localX * cos - localY * sin });
    y.push({ frame, value: localX * sin + localY * cos });
  }
  return { ...animation, x, y };
};

const explicitObjectId = (object: JsonObject): string | null => (
  typeof object.id === 'string' || typeof object.id === 'number' ? String(object.id) : null
);

const parentObjectId = (object: JsonObject): string | null => (
  typeof object.parent === 'string' || typeof object.parent === 'number' ? String(object.parent) : null
);

const composeParallaxDepth = (
  parent: WeVec2 | null,
  child: WeVec2 | null,
): WeVec2 | null => {
  if (!parent) return child;
  if (!child) return parent;
  return [parent[0] + child[0], parent[1] + child[1]];
};

/**
 * Resolve Wallpaper Engine parent transforms into scene-space transforms.
 * Child origins are local to the parent; parent scale/rotation affect that
 * local offset, while opacity/visibility/parallax propagate down the tree.
 */
const composeLayerTransform = (
  parent: WeLayerTransform,
  child: WeLayerTransform,
): WeLayerTransform => {
  const radians = parent.angles[2];
  const localX = child.origin[0] * parent.scale[0];
  // WE stores child-local vertical offsets in the opposite direction from the
  // browser stage. This matters for cropped/puppet companion layers: sample 10
  // stores the eye at Y=-297 relative to its group, which is visually below the
  // group origin rather than above it.
  const localY = -child.origin[1] * parent.scale[1];
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    origin: [
      parent.origin[0] + localX * cos - localY * sin,
      parent.origin[1] + localX * sin + localY * cos,
      parent.origin[2] + child.origin[2] * parent.scale[2],
    ],
    alignment: child.alignment,
    scale: [
      parent.scale[0] * child.scale[0],
      parent.scale[1] * child.scale[1],
      parent.scale[2] * child.scale[2],
    ],
    angles: [
      parent.angles[0] + child.angles[0],
      parent.angles[1] + child.angles[1],
      parent.angles[2] + child.angles[2],
    ],
    size: child.size,
    parallaxDepth: composeParallaxDepth(parent.parallaxDepth, child.parallaxDepth),
    opacity: parent.opacity * child.opacity,
    visible: parent.visible && child.visible,
  };
};

const buildSceneTransformResolver = (objects: JsonObject[], sceneHeight: number | null) => {
  const objectsById = new Map<string, JsonObject>();
  for (const object of objects) {
    const id = explicitObjectId(object);
    if (id !== null && !objectsById.has(id)) objectsById.set(id, object);
  }

  const transformCache = new Map<JsonObject, WeLayerTransform>();
  const transformResolving = new Set<JsonObject>();

  const resolveTransform = (object: JsonObject): WeLayerTransform => {
    const cached = transformCache.get(object);
    if (cached) return cached;

    const local = transformFromObject(object);
    const parentId = parentObjectId(object);
    if (parentId === null || transformResolving.has(object)) {
      // Wallpaper Engine's 2D scene/world Y axis points upward, while the
      // browser stage is top-left / Y-down. Convert root/world origins here;
      // child-local Y is converted separately by composeLayerTransform.
      const rootTransform = sceneHeight === null
        ? local
        : { ...local, origin: [local.origin[0], sceneHeight - local.origin[1], local.origin[2]] as WeVec3 };
      transformCache.set(object, rootTransform);
      return rootTransform;
    }

    const parent = objectsById.get(parentId);
    if (!parent || parent === object) {
      const rootTransform = sceneHeight === null
        ? local
        : { ...local, origin: [local.origin[0], sceneHeight - local.origin[1], local.origin[2]] as WeVec3 };
      transformCache.set(object, rootTransform);
      return rootTransform;
    }

    transformResolving.add(object);
    const world = composeLayerTransform(resolveTransform(parent), local);
    transformResolving.delete(object);
    transformCache.set(object, world);
    return world;
  };

  const animationCache = new Map<JsonObject, WePointAnimation[]>();
  const animationResolving = new Set<JsonObject>();
  const resolveCenterAnimations = (object: JsonObject): WePointAnimation[] => {
    const cached = animationCache.get(object);
    if (cached) return cached;
    if (animationResolving.has(object)) return [];

    animationResolving.add(object);
    const parentId = parentObjectId(object);
    const parent = parentId === null ? null : objectsById.get(parentId) ?? null;
    const inherited = parent && parent !== object ? resolveCenterAnimations(parent) : [];
    const localAnimation = parseRelativeOriginAnimation(object);
    const own = localAnimation
      ? [transformPointAnimation(
        localAnimation,
        parent ? resolveTransform(parent) : null,
        parent === null && sceneHeight !== null,
      )]
      : [];
    const resolved = [...inherited, ...own];
    animationResolving.delete(object);
    animationCache.set(object, resolved);
    return resolved;
  };

  return { resolveTransform, resolveCenterAnimations };
};

const parseScene = (index: ArchiveIndex, descriptorPath: string): WeSceneResourceGraph => {
  const scene = index.readJson(descriptorPath);
  if (!scene) throw new Error(`Invalid Wallpaper Engine scene descriptor: ${descriptorPath}`);

  const basePath = dirname(descriptorPath);
  const imageLayers: WeResolvedImageLayer[] = [];
  const solidLayers: WeResolvedSolidLayer[] = [];
  const textLayers: WeResolvedTextLayer[] = [];
  const compositionLayers: WeResolvedCompositionLayer[] = [];
  const postProcessEffects: WeResolvedPostProcessEffect[] = [];
  const pendingCompositionLayers: Array<{
    objectIndex: number;
    id: string;
    name?: string;
    imageRef: string;
    object: JsonObject;
  }> = [];
  const skippedObjects: WeSkippedObject[] = [];
  const diagnostics: WeSceneDiagnostic[] = [];
  const objects = Array.isArray(scene.objects) ? scene.objects : [];
  const sceneObjects = objects.filter((object): object is JsonObject => isObject(object));
  const sceneSize = getSceneSize(scene);
  const { resolveTransform, resolveCenterAnimations } = buildSceneTransformResolver(sceneObjects, sceneSize.height);

  objects.forEach((rawObject, objectIndex) => {
    if (!isObject(rawObject)) return;
    const id = objectId(rawObject.id, objectIndex);
    const name = stringValue(rawObject.name) ?? undefined;
    const imageRef = stringValue(rawObject.image);
    const particleRef = stringValue(rawObject.particle);

    if (imageRef && isBuiltinSolidLayerReference(imageRef)) {
      solidLayers.push({
        objectIndex,
        id,
        name,
        builtinModelReference: imageRef,
        color: colorRgb(rawObject.color),
        transform: resolveTransform(rawObject),
        centerAnimations: resolveCenterAnimations(rawObject),
        colorBlendMode: parseNumber(rawObject.colorBlendMode) ?? undefined,
        hasEffects: Array.isArray(rawObject.effects) && rawObject.effects.length > 0,
        textureEffects: [],
        effectChain: parseEffectChain(index, basePath, rawObject),
      });
      return;
    }

    if (imageRef && isBuiltinCompositionLayerReference(imageRef)) {
      pendingCompositionLayers.push({ objectIndex, id, name, imageRef, object: rawObject });
      return;
    }

    if (imageRef && isBuiltinFullscreenLayerReference(imageRef)) {
      const effectChain = parseEffectChain(index, basePath, rawObject);
      const supportedEffects = parseFullscreenPostProcessEffects(effectChain);
      postProcessEffects.push(...supportedEffects);
      if (supportedEffects.length === 0) {
        diagnostics.push({
          level: 'warning',
          code: 'UNSUPPORTED_BUILTIN_LAYER',
          message: `Wallpaper Engine fullscreen layer has no currently supported post-process passes: ${imageRef}`,
          objectIndex,
          path: imageRef,
        });
        skippedObjects.push({ objectIndex, id, name, reason: 'unsupportedObject', reference: imageRef });
      } else if (supportedEffects.length < effectChain.length) {
        diagnostics.push({
          level: 'warning',
          code: 'UNSUPPORTED_BUILTIN_LAYER',
          message: `Wallpaper Engine fullscreen layer contains additional unsupported post-process passes; supported passes were retained: ${imageRef}`,
          objectIndex,
          path: imageRef,
        });
      }
      return;
    }

    if (imageRef && isBuiltinUtilityLayerReference(imageRef)) {
      diagnostics.push({
        level: 'warning',
        code: 'UNSUPPORTED_BUILTIN_LAYER',
        message: `Wallpaper Engine built-in layer is not rendered yet: ${imageRef}`,
        objectIndex,
        path: imageRef,
      });
      skippedObjects.push({ objectIndex, id, name, reason: 'unsupportedObject', reference: imageRef });
      return;
    }

    if (!imageRef) {
      if (particleRef) {
        skippedObjects.push({ objectIndex, id, name, reason: 'particle', reference: particleRef });
        return;
      }

      const text = propertyStringValue(rawObject.text);
      if (text !== null) {
        const fontReference = stringValue(rawObject.font) ?? undefined;
        const fontPath = fontReference ? index.resolvePath(joinPath(basePath, fontReference)) ?? undefined : undefined;
        const builtinFontFile = !fontPath ? getWallpaperEngineBuiltinFontFile(fontReference) : null;
        const textProperty = isObject(rawObject.text) ? rawObject.text : null;
        const textScript = textProperty && typeof textProperty.script === 'string' ? textProperty.script : null;
        const dynamicText = textScript
          ? resolveWallpaperEngineDateTimeText(textScript, textProperty?.scriptproperties)
          : null;
        const usesDynamicText = textScript !== null;
        if (fontReference && !fontPath && !builtinFontFile) {
          diagnostics.push({
            level: 'warning',
            code: 'MISSING_FONT_ASSET',
            message: `Text layer references a font file that is neither present in the ZIP nor a known Wallpaper Engine built-in font: ${fontReference}`,
            objectIndex,
            path: fontReference,
          });
        }
        if (usesDynamicText && !dynamicText) {
          diagnostics.push({
            level: 'warning',
            code: 'TEXT_SCRIPT_BASE_VALUE_ONLY',
            message: 'Text layer contains Wallpaper Engine script logic outside the supported Date/time subset; the importer renders its authored base text without executing the script.',
            objectIndex,
          });
        }
        const effectChain = parseEffectChain(index, basePath, rawObject);
        // Text layers are surfaces too. Parse their authored effect chain through
        // the same renderer-neutral texture-effect normalizer used by images.
        // The effect descriptor path is a better ranking anchor than a font
        // material because text layers do not own an image material JSON.
        const textEffectAnchor = effectChain[0]?.descriptorPath ?? joinPath(basePath, 'materials/fonts/basefont.json');
        const parsedTextEffects = parseImageEffects(index, basePath, textEffectAnchor, effectChain);
        const textShadow = resolveTextShadow(effectChain);
        textLayers.push({
          objectIndex,
          id,
          name,
          text,
          fontReference,
          fontPath,
          pointSize: Math.max(0.1, parseNumber(rawObject.pointsize) ?? 12),
          color: colorRgb(rawObject.color),
          horizontalAlign: horizontalTextAlign(rawObject.horizontalalign),
          verticalAlign: verticalTextAlign(rawObject.verticalalign),
          padding: Math.max(0, parseNumber(rawObject.padding) ?? 0),
          limitWidth: booleanValue(rawObject.limitwidth, false),
          maxWidth: parseNumber(rawObject.maxwidth),
          limitRows: booleanValue(rawObject.limitrows, false),
          maxRows: parseNumber(rawObject.maxrows),
          useEllipsis: booleanValue(rawObject.limituseellipsis, false),
          spacing: vec2(rawObject.spacing) ?? [0, 0],
          ...(textShadow ? { textShadow } : {}),
          transform: resolveTransform(rawObject),
          centerAnimations: resolveCenterAnimations(rawObject),
          colorBlendMode: parseNumber(rawObject.colorBlendMode) ?? undefined,
          // `hasEffects` tracks only effects that remain unsupported after
          // normalization; supported text surface effects are retained below.
          hasEffects: parsedTextEffects.hasUnsupportedEffects,
          usesDynamicText,
          dynamicText: dynamicText ?? undefined,
          textureEffects: parsedTextEffects.textureEffects,
          effectChain,
        });
        return;
      }

      const likelyTextOrScript = 'text' in rawObject || 'font' in rawObject || 'script' in rawObject;
      skippedObjects.push({
        objectIndex,
        id,
        name,
        reason: likelyTextOrScript ? 'textOrScript' : 'unsupportedObject',
      });
      return;
    }

    const modelPath = index.resolvePath(joinPath(basePath, imageRef));
    if (!modelPath) {
      diagnostics.push({
        level: 'warning',
        code: 'MISSING_MODEL',
        message: `Image object references a model JSON that is not present in the ZIP: ${imageRef}`,
        objectIndex,
        path: imageRef,
      });
      skippedObjects.push({ objectIndex, id, name, reason: 'unresolvedImageChain', reference: imageRef });
      return;
    }

    const model = index.readJson(modelPath);
    const materialRef = model ? stringValue(model.material) : null;
    const puppetRef = model ? stringValue(model.puppet) : null;
    const puppetPath = puppetRef ? index.resolvePath(joinPath(basePath, puppetRef)) ?? undefined : undefined;
    if (puppetRef && !puppetPath) {
      diagnostics.push({
        level: 'warning',
        code: 'MISSING_PUPPET_MODEL',
        message: `Model references a puppet MDL that is not present in the ZIP: ${puppetRef}`,
        objectIndex,
        path: puppetRef,
      });
    }
    if (!model || !materialRef) {
      diagnostics.push({
        level: 'warning',
        code: 'UNSUPPORTED_IMAGE_CHAIN',
        message: `Model JSON does not contain a material reference: ${modelPath}`,
        objectIndex,
        path: modelPath,
      });
      skippedObjects.push({ objectIndex, id, name, reason: 'unresolvedImageChain', reference: modelPath });
      return;
    }

    const materialPath = index.resolvePath(joinPath(basePath, materialRef));
    if (!materialPath) {
      diagnostics.push({
        level: 'warning',
        code: 'MISSING_MATERIAL',
        message: `Model references a material JSON that is not present in the ZIP: ${materialRef}`,
        objectIndex,
        path: materialRef,
      });
      skippedObjects.push({ objectIndex, id, name, reason: 'unresolvedImageChain', reference: materialRef });
      return;
    }

    const material = index.readJson(materialPath);
    if (!material) {
      diagnostics.push({
        level: 'warning',
        code: 'MISSING_MATERIAL',
        message: `Material JSON could not be parsed: ${materialPath}`,
        objectIndex,
        path: materialPath,
      });
      skippedObjects.push({ objectIndex, id, name, reason: 'unresolvedImageChain', reference: materialPath });
      return;
    }

    const textureReferences = materialTextureReferences(material);
    if (!textureReferences.length) {
      diagnostics.push({
        level: 'warning',
        code: 'NO_MATERIAL_TEXTURES',
        message: `Material contains no texture references: ${materialPath}`,
        objectIndex,
        path: materialPath,
      });
      skippedObjects.push({ objectIndex, id, name, reason: 'unresolvedImageChain', reference: materialPath });
      return;
    }

    const spritesheet = materialUsesSpritesheet(material);
    const textures: WeResolvedTexture[] = [];
    for (const textureReference of textureReferences) {
      const texture = resolveTexture(index, basePath, materialPath, textureReference, spritesheet);
      if (texture) textures.push(texture);
      else diagnostics.push({
        level: 'warning',
        code: 'MISSING_TEXTURE_ASSET',
        message: `Could not resolve texture asset from material reference: ${textureReference}`,
        objectIndex,
        path: textureReference,
      });
    }

    if (!textures.length) {
      skippedObjects.push({ objectIndex, id, name, reason: 'unresolvedImageChain', reference: materialPath });
      return;
    }

    const effectChain = parseEffectChain(index, basePath, rawObject);
    const parsedEffects = parseImageEffects(index, basePath, materialPath, effectChain);
    imageLayers.push({
      objectIndex,
      id,
      name,
      parentId: parentObjectId(rawObject) ?? undefined,
      attachmentName: stringValue(rawObject.attachment) ?? undefined,
      localTransform: transformFromObject(rawObject),
      modelPath,
      materialPath,
      textures,
      puppetPath,
      puppetAnimationLayers: resolvePuppetAnimationLayers(rawObject.animationlayers),
      opacityEffects: parsedEffects.opacityEffects,
      waterWavesEffects: parsedEffects.waterWavesEffects,
      textureEffects: parsedEffects.textureEffects,
      transform: resolveTransform(rawObject),
      centerAnimations: resolveCenterAnimations(rawObject),
      colorBlendMode: parseNumber(rawObject.colorBlendMode) ?? undefined,
      hasEffects: parsedEffects.hasUnsupportedEffects,
      effectChain,
    });
  });

  const imageLayersById = new Map(imageLayers.map((layer) => [layer.id, layer]));
  for (const pending of pendingCompositionLayers) {
    const effectChain = parseEffectChain(index, basePath, pending.object);
    const parsed = parseCompositionEffects(index, basePath, effectChain, imageLayersById);
    if (!parsed.effects.length) {
      diagnostics.push({
        level: 'warning',
        code: 'UNSUPPORTED_BUILTIN_LAYER',
        message: `Wallpaper Engine composition layer has no currently supported static effect passes: ${pending.imageRef}`,
        objectIndex: pending.objectIndex,
        path: pending.imageRef,
      });
      skippedObjects.push({
        objectIndex: pending.objectIndex,
        id: pending.id,
        name: pending.name,
        reason: 'unsupportedObject',
        reference: pending.imageRef,
      });
      continue;
    }

    compositionLayers.push({
      objectIndex: pending.objectIndex,
      id: pending.id,
      name: pending.name,
      builtinModelReference: pending.imageRef,
      effects: parsed.effects,
      transform: resolveTransform(pending.object),
      centerAnimations: resolveCenterAnimations(pending.object),
      colorBlendMode: parseNumber(pending.object.colorBlendMode) ?? undefined,
      hasEffects: parsed.hasUnsupportedEffects,
      textureEffects: [],
      effectChain,
    });
  }

  return {
    descriptorPath,
    basePath,
    size: sceneSize,
    cameraParallax: getCameraParallaxSettings(scene),
    postProcessEffects,
    imageLayers,
    solidLayers,
    textLayers,
    compositionLayers,
    skippedObjects,
    diagnostics,
  };
};

/**
 * Parse one or more RePKG-extracted Wallpaper Engine scenes from a ZIP entry map.
 *
 * Important: scene descriptors are detected by JSON structure. Resource names are
 * never hard-coded; image assets are resolved only after following WE references.
 */
export const parseWallpaperEngineResourceGraph = (
  entries: Map<string, Uint8Array>,
): WeArchiveResourceGraph => {
  const index = new ArchiveIndex(entries);
  const descriptors = findSceneDescriptors(index);
  return {
    scenes: descriptors.map((path) => parseScene(index, path)),
  };
};
