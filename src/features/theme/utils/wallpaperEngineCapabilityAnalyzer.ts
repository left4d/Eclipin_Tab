import type { WeArchiveResourceGraph, WeSceneResourceGraph } from './wallpaperEngineTypes';
import { canonicalWallpaperEngineEffectParameterKey, deriveWallpaperEngineEffectIdentity } from './wallpaperEngineEffectIr';

type JsonObject = Record<string, unknown>;

export type WeCapabilitySupport = 'supported' | 'partial' | 'unsupported' | 'unknown';
export type WeCapabilityLayerKind =
  | 'image'
  | 'solid'
  | 'text'
  | 'composition'
  | 'project'
  | 'fullscreen'
  | 'particle'
  | 'other';
export type WeCapabilityEffectContext = Exclude<WeCapabilityLayerKind, 'particle' | 'other'> | 'puppet' | 'other';

export interface WeEffectCapabilityUsage {
  /** Stable semantic identity when one can be derived from a WE descriptor. */
  key: string;
  support: WeCapabilitySupport;
  effectCount: number;
  passCount: number;
  supportedPassCount: number;
  unsupportedPassCount: number;
  contexts: WeCapabilityEffectContext[];
  /** Useful for diagnosis only; never use these paths as renderer feature switches. */
  references: string[];
  descriptorPaths: string[];
}

export interface WeBlendModeCapabilityUsage {
  mode: number;
  count: number;
  support: WeCapabilitySupport;
}

export interface WeScriptCapabilitySummary {
  total: number;
  perFrameUpdate: number;
  userPropertyCallback: number;
  engineRuntime: number;
  sceneLookup: number;
  dateTime: number;
  audio: number;
}

export interface WeSceneCapabilityReport {
  descriptorPath: string;
  objectCount: number;
  layerKinds: Record<WeCapabilityLayerKind, number>;
  puppetLayerCount: number;
  frameAnimationLayerCount: number;
  relativeOriginAnimationCount: number;
  scripts: WeScriptCapabilitySummary;
  layerBlendModes: WeBlendModeCapabilityUsage[];
  effects: WeEffectCapabilityUsage[];
  diagnosticsByCode: Record<string, number>;
  unsupported: {
    projectLayerCount: number;
    fullscreenLayerCount: number;
    particleCount: number;
    otherObjectCount: number;
    unresolvedImageCount: number;
    unknownEffectCount: number;
    unsupportedEffectCount: number;
  };
}

export interface WeArchiveCapabilityReport {
  format: 'tablab-we-capability-report';
  version: 1;
  scenes: WeSceneCapabilityReport[];
  totals: {
    sceneCount: number;
    objectCount: number;
    layerKinds: Record<WeCapabilityLayerKind, number>;
    puppetLayerCount: number;
    frameAnimationLayerCount: number;
    relativeOriginAnimationCount: number;
    scripts: WeScriptCapabilitySummary;
    effects: WeEffectCapabilityUsage[];
    layerBlendModes: WeBlendModeCapabilityUsage[];
    diagnosticsByCode: Record<string, number>;
  };
}

const decoder = new TextDecoder();

const isObject = (value: unknown): value is JsonObject => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const propertyBaseValue = (value: unknown): unknown => (
  isObject(value) && Object.prototype.hasOwnProperty.call(value, 'value')
    ? value.value
    : value
);

const parseNumber = (value: unknown): number | null => {
  const base = propertyBaseValue(value);
  return typeof base === 'number' && Number.isFinite(base) ? base : null;
};

const stringValue = (value: unknown): string | null => (
  typeof value === 'string' && value.trim() ? value : null
);

const resolveVisible = (value: unknown): boolean => {
  const base = propertyBaseValue(value);
  return typeof base === 'boolean' ? base : true;
};

const normalizePath = (value: string): string => {
  const parts: string[] = [];
  for (const part of value.replace(/\\/g, '/').split('/')) {
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

const joinPath = (base: string, reference: string): string => normalizePath(
  base ? `${base}/${reference}` : reference,
);

const decodeRepkgUnicodeEscapes = (value: string): string => value.replace(
  /#U([0-9a-fA-F]{4})/g,
  (_match, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)),
);

class EntryLookup {
  private readonly entries = new Map<string, Uint8Array>();
  private readonly lowerPath = new Map<string, string>();
  private readonly jsonCache = new Map<string, JsonObject | null>();

  constructor(input: Map<string, Uint8Array>) {
    for (const [rawPath, bytes] of input) {
      const path = normalizePath(rawPath);
      if (!path || path.endsWith('/')) continue;
      this.entries.set(path, bytes);
      this.lowerPath.set(path.toLowerCase(), path);
      const decoded = decodeRepkgUnicodeEscapes(path);
      if (!this.lowerPath.has(decoded.toLowerCase())) this.lowerPath.set(decoded.toLowerCase(), path);
    }
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

const BUILTIN_SOLID_LAYER = 'models/util/solidlayer.json';
const BUILTIN_COMPOSITION_LAYER = 'models/util/composelayer.json';
const BUILTIN_PROJECT_LAYER = 'models/util/projectlayer.json';
const BUILTIN_FULLSCREEN_LAYER = 'models/util/fullscreenlayer.json';

const normalizeBuiltin = (value: string): string => decodeRepkgUnicodeEscapes(normalizePath(value)).toLowerCase();

const layerKind = (object: JsonObject): WeCapabilityLayerKind => {
  const image = stringValue(object.image);
  if (image) {
    const builtin = normalizeBuiltin(image);
    if (builtin === BUILTIN_SOLID_LAYER) return 'solid';
    if (builtin === BUILTIN_COMPOSITION_LAYER) return 'composition';
    if (builtin === BUILTIN_PROJECT_LAYER) return 'project';
    if (builtin === BUILTIN_FULLSCREEN_LAYER) return 'fullscreen';
    return 'image';
  }
  if (stringValue(object.particle)) return 'particle';
  if (typeof propertyBaseValue(object.text) === 'string') return 'text';
  return 'other';
};

const emptyLayerKinds = (): Record<WeCapabilityLayerKind, number> => ({
  image: 0,
  solid: 0,
  text: 0,
  composition: 0,
  project: 0,
  fullscreen: 0,
  particle: 0,
  other: 0,
});

const emptyScripts = (): WeScriptCapabilitySummary => ({
  total: 0,
  perFrameUpdate: 0,
  userPropertyCallback: 0,
  engineRuntime: 0,
  sceneLookup: 0,
  dateTime: 0,
  audio: 0,
});

const collectScripts = (value: unknown, summary: WeScriptCapabilitySummary): void => {
  if (Array.isArray(value)) {
    for (const item of value) collectScripts(item, summary);
    return;
  }
  if (!isObject(value)) return;

  if (typeof value.script === 'string') {
    const script = value.script;
    summary.total += 1;
    if (/\b(?:export\s+)?function\s+update\s*\(/.test(script)) summary.perFrameUpdate += 1;
    if (/\b(?:export\s+)?function\s+applyUserProperties\s*\(/.test(script)) summary.userPropertyCallback += 1;
    if (/\bengine\.runtime\b/.test(script)) summary.engineRuntime += 1;
    if (/\bthisScene\.(?:getLayer|getObject|getCamera)\b/.test(script)) summary.sceneLookup += 1;
    if (/\b(?:new\s+Date\s*\(|Date\s*\()/.test(script)) summary.dateTime += 1;
    if (/\b(?:audio|registerAudio|audioBuffers?|frequency|fft)\b/i.test(script)) summary.audio += 1;
  }

  for (const child of Object.values(value)) collectScripts(child, summary);
};

const countRelativeOriginAnimations = (objects: JsonObject[]): number => objects.reduce((count, object) => {
  if (!isObject(object.origin) || !isObject(object.origin.animation)) return count;
  return count + (object.origin.animation.relative === true ? 1 : 0);
}, 0);

const PUPPET_ATLAS_TEXTURE_EFFECTS = new Set([
  'opacity',
  'scroll',
  'transform',
  'spin',
  'perspective',
  'foliagesway',
  'waterflow',
  'shake',
  'blurprecise',
  'shine',
  'godrays',
  'waterripple',
  'waterwaves',
]);

const knownCapabilitySupport = (key: string, context: WeCapabilityEffectContext): WeCapabilitySupport => {
  if ((context === 'puppet' || context === 'text') && PUPPET_ATLAS_TEXTURE_EFFECTS.has(key)) return 'partial';
  if (key === 'opacity' && (context === 'image' || context === 'composition')) return 'supported';
  if (key === 'scroll' && context === 'image') return 'supported';
  if (key === 'transform' && context === 'image') return 'partial';
  if (key === 'spin' && context === 'image') return 'partial';
  if (key === 'perspective' && context === 'image') return 'partial';
  if (key === 'foliagesway' && context === 'image') return 'partial';
  if (key === 'waterflow' && context === 'image') return 'partial';
  if (key === 'shake' && context === 'image') return 'partial';
  if (key === 'blurprecise' && context === 'image') return 'partial';
  if (key === 'shine' && context === 'image') return 'partial';
  if (key === 'godrays' && context === 'image') return 'partial';
  if (key === 'waterripple' && context === 'image') return 'partial';
  if (key === 'waterwaves' && context === 'image') return 'partial';
  if (key === 'chromaticaberration' && context === 'fullscreen') return 'partial';
  if (context === 'composition' && (key === 'tint' || key === 'blend' || key === 'transform')) return 'partial';
  if (context === 'composition' && key === 'fisheye') return 'supported';
  return 'unsupported';
};

const passIsSupported = (
  key: string,
  context: WeCapabilityEffectContext,
  pass: JsonObject,
  descriptor: JsonObject | null,
): boolean => {
  const surfaceContext: WeCapabilityEffectContext = context === 'puppet' || context === 'text' ? 'image' : context;
  if (key === 'chromaticaberration' && context === 'fullscreen') {
    const shaderValues = isObject(pass.constantshadervalues) ? pass.constantshadervalues : {};
    const canonicalValues = new Map(Object.entries(shaderValues).map(([name, value]) => [
      canonicalWallpaperEngineEffectParameterKey(name),
      value,
    ]));
    const dynamic = [...canonicalValues.values()].some((value) => (
      isObject(value) && (isObject(value.animation) || (typeof value.script === 'string' && value.script.length > 0))
    ));
    const textures = Array.isArray(pass.textures) ? pass.textures : [];
    const hasMask = typeof textures[1] === 'string' && textures[1].trim().length > 0;
    return !dynamic && !hasMask;
  }
  if (key === 'opacity') return surfaceContext === 'image' || context === 'composition';
  if (key === 'scroll' && surfaceContext === 'image') {
    const shaderValues = isObject(pass.constantshadervalues) ? pass.constantshadervalues : {};
    return !Object.values(shaderValues).some((value) => (
      isObject(value) && (isObject(value.animation) || (typeof value.script === 'string' && value.script.length > 0))
    ));
  }
  if (key === 'transform' && surfaceContext === 'image') {
    const shaderValues = isObject(pass.constantshadervalues) ? pass.constantshadervalues : {};
    const canonicalValues = new Map(Object.entries(shaderValues).map(([name, value]) => [
      canonicalWallpaperEngineEffectParameterKey(name),
      value,
    ]));
    const combos = isObject(pass.combos) ? pass.combos : {};
    const modeEntry = Object.entries(combos).find(([name]) => (
      canonicalWallpaperEngineEffectParameterKey(name) === 'mode'
    ));
    const mode = parseNumber(modeEntry ? propertyBaseValue(modeEntry[1]) : null) ?? 0;
    const version = descriptor ? parseNumber(descriptor.version) : null;
    const dynamic = ['offset', 'scale', 'angle'].some((name) => {
      const value = canonicalValues.get(name);
      return isObject(value) && (isObject(value.animation) || (typeof value.script === 'string' && value.script.length > 0));
    });
    return (version === null || version === 1) && mode === 0 && !dynamic;
  }
  if (key === 'spin' && surfaceContext === 'image') {
    const shaderValues = isObject(pass.constantshadervalues) ? pass.constantshadervalues : {};
    const combos = isObject(pass.combos) ? pass.combos : {};
    const textures = Array.isArray(pass.textures) ? pass.textures : [];
    const dynamic = Object.values(shaderValues).some((value) => (
      isObject(value) && (isObject(value.animation) || (typeof value.script === 'string' && value.script.length > 0))
    ));
    const comboEnabled = (name: string, fallback = false): boolean => {
      const entry = Object.entries(combos).find(([key]) => key.toLowerCase() === name.toLowerCase());
      if (!entry) return fallback;
      const value = propertyBaseValue(entry[1]);
      if (typeof value === 'boolean') return value;
      const number = parseNumber(value);
      return number === null ? fallback : number !== 0;
    };
    const version = descriptor ? parseNumber(descriptor.version) : null;
    const hasLegacyCombos = Object.keys(combos).some((key) => {
      const normalized = key.toLowerCase();
      return normalized === 'mode' || normalized === 'perspective';
    });
    const hasModernParameters = ['phase', 'size', 'feather'].some((key) => shaderValues[key] !== undefined);
    const generation = version !== null ? (version <= 1 ? 1 : 2) : hasLegacyCombos ? 1 : hasModernParameters ? 2 : null;
    const hasMask = typeof textures[1] === 'string' && textures[1].trim().length > 0;
    const ratio = parseNumber(shaderValues.ratio);
    if (generation === null || dynamic || hasMask || comboEnabled('MASK', hasMask)) return false;
    if (ratio !== null && Math.abs(ratio) < 0.000001) return false;
    if (generation === 1) return !comboEnabled('MODE');
    return !comboEnabled('NOISE');
  }
  if (key === 'perspective' && surfaceContext === 'image') {
    const shaderValues = isObject(pass.constantshadervalues) ? pass.constantshadervalues : {};
    const dynamic = ['point0', 'point1', 'point2', 'point3'].some((key) => {
      const value = shaderValues[key];
      return isObject(value) && (isObject(value.animation) || (typeof value.script === 'string' && value.script.length > 0));
    });
    const version = descriptor ? parseNumber(descriptor.version) : null;
    return !dynamic && (version === null || version === 2);
  }
  if (key === 'foliagesway' && surfaceContext === 'image') {
    const shaderValues = isObject(pass.constantshadervalues) ? pass.constantshadervalues : {};
    const canonicalValues = new Map(Object.entries(shaderValues).map(([name, value]) => [
      canonicalWallpaperEngineEffectParameterKey(name),
      value,
    ]));
    const combos = isObject(pass.combos) ? pass.combos : {};
    const modeEntry = Object.entries(combos).find(([name]) => (
      canonicalWallpaperEngineEffectParameterKey(name) === 'mode'
    ));
    const mode = parseNumber(modeEntry ? propertyBaseValue(modeEntry[1]) : null) ?? 0;
    const version = descriptor ? parseNumber(descriptor.version) : null;
    const hasUvParameterSet = ['speeduv', 'scale', 'ratio', 'scrolldirection'].some((name) => canonicalValues.has(name));
    const version2UvGeneration = version === 2 || (version === null && hasUvParameterSet);
    const dynamic = [...canonicalValues.values()].some((value) => (
      isObject(value) && (isObject(value.animation) || (typeof value.script === 'string' && value.script.length > 0))
    ));
    const ratioValue = canonicalValues.get('ratio');
    const ratio = ratioValue === undefined ? 0.3 : parseNumber(propertyBaseValue(ratioValue));
    return version2UvGeneration && mode === 0 && !dynamic && ratio !== null && ratio > 0;
  }
  if (key === 'waterflow' && surfaceContext === 'image') {
    const shaderValues = isObject(pass.constantshadervalues) ? pass.constantshadervalues : {};
    const canonicalValues = new Map(Object.entries(shaderValues).map(([name, value]) => [
      canonicalWallpaperEngineEffectParameterKey(name),
      value,
    ]));
    const dynamic = [...canonicalValues.values()].some((value) => (
      isObject(value) && (isObject(value.animation) || (typeof value.script === 'string' && value.script.length > 0))
    ));
    const phaseScaleValue = canonicalValues.get('phasescale');
    const phaseScale = phaseScaleValue === undefined ? 1 : parseNumber(propertyBaseValue(phaseScaleValue));
    const featherValue = canonicalValues.get('feather');
    const feather = featherValue === undefined ? null : parseNumber(propertyBaseValue(featherValue));
    return !dynamic
      && phaseScale !== null && phaseScale > 0
      && (feather === null || (feather >= 0 && feather <= 0.5));
  }
  if (key === 'shake' && surfaceContext === 'image') {
    const shaderValues = isObject(pass.constantshadervalues) ? pass.constantshadervalues : {};
    const canonicalValues = new Map(Object.entries(shaderValues).map(([name, value]) => [
      canonicalWallpaperEngineEffectParameterKey(name),
      value,
    ]));
    const combos = isObject(pass.combos) ? pass.combos : {};
    const textures = Array.isArray(pass.textures) ? pass.textures : [];
    const comboValue = (semanticKey: string): number => {
      const entry = Object.entries(combos).find(([name]) => (
        canonicalWallpaperEngineEffectParameterKey(name) === semanticKey
      ));
      return parseNumber(entry ? propertyBaseValue(entry[1]) : null) ?? 0;
    };
    const dynamic = ['speed', 'strength', 'friction', 'bounds'].some((name) => {
      const value = canonicalValues.get(name);
      return isObject(value) && (isObject(value.animation) || (typeof value.script === 'string' && value.script.length > 0));
    });
    const speedValue = canonicalValues.get('speed');
    const strengthValue = canonicalValues.get('strength');
    const frictionValue = canonicalValues.get('friction');
    const boundsValue = canonicalValues.get('bounds');
    const speed = speedValue === undefined ? 1 : parseNumber(propertyBaseValue(speedValue));
    const strength = strengthValue === undefined ? 0.1 : parseNumber(propertyBaseValue(strengthValue));
    const vec2Value = (value: unknown, fallback: [number, number]): [number, number] | null => {
      const base = propertyBaseValue(value);
      if (typeof base === 'string') {
        const parts = base.trim().split(/\s+/).map(Number);
        return parts.length >= 2 && parts.slice(0, 2).every(Number.isFinite)
          ? [parts[0], parts[1]]
          : null;
      }
      if (Array.isArray(base) && base.length >= 2) {
        const values = base.slice(0, 2).map(Number);
        return values.every(Number.isFinite) ? [values[0], values[1]] : null;
      }
      return value === undefined ? fallback : null;
    };
    const friction = vec2Value(frictionValue, [1, 1]);
    const bounds = vec2Value(boundsValue, [0, 1]);
    const directionMode = comboValue('direction');
    const version = descriptor ? parseNumber(descriptor.version) : null;
    return (version === null || version === 1)
      && !dynamic
      && speed !== null && speed >= 0
      && strength !== null && strength >= 0
      && friction !== null && friction[0] > 0 && friction[1] > 0
      && bounds !== null && bounds[1] > bounds[0]
      && Number.isInteger(directionMode) && directionMode >= 0 && directionMode <= 2
      && comboValue('audioprocessing') === 0
      && comboValue('noise') === 0
      && comboValue('timeoffset') === 0
      && comboValue('mask') === 0
      && !(typeof textures[2] === 'string' && textures[2].trim())
      && !(typeof textures[3] === 'string' && textures[3].trim());
  }
  if (key === 'shine' && surfaceContext === 'image') {
    const shaderValues = isObject(pass.constantshadervalues) ? pass.constantshadervalues : {};
    const dynamic = Object.values(shaderValues).some((value) => (
      isObject(value) && (isObject(value.animation) || (typeof value.script === 'string' && value.script.length > 0))
    ));
    if (dynamic) return false;

    const combos = isObject(pass.combos) ? pass.combos : {};
    const comboEntry = (semanticKey: string) => Object.entries(combos).find(([name]) => (
      canonicalWallpaperEngineEffectParameterKey(name) === semanticKey
    ));
    const optionalCombo = (semanticKey: string): number | null => {
      const entry = comboEntry(semanticKey);
      return entry ? parseNumber(propertyBaseValue(entry[1])) : null;
    };

    const version = descriptor ? parseNumber(descriptor.version) : null;
    if (version !== null && version !== 1) return false;

    const noise = optionalCombo('noise');
    const edges = optionalCombo('edges');
    const samples = optionalCombo('samples');
    const kernel = optionalCombo('kernel');
    const vertical = optionalCombo('vertical');
    const blendMode = optionalCombo('blendmode');
    const copyBackground = optionalCombo('copybg');

    return (noise === null || noise === 0 || noise === 1)
      && (edges === null || (Number.isInteger(edges) && edges >= 2 && edges <= 5))
      && (samples === null || (Number.isInteger(samples) && samples >= 0 && samples <= 3))
      && (kernel === null || kernel === 0)
      && (vertical === null || vertical === 0 || vertical === 1)
      && (blendMode === null || (Number.isInteger(blendMode) && blendMode >= 0 && blendMode <= 32))
      && (copyBackground === null || copyBackground === 0);
  }

  if (key === 'godrays' && surfaceContext === 'image') {
    const shaderValues = isObject(pass.constantshadervalues) ? pass.constantshadervalues : {};
    const dynamic = Object.values(shaderValues).some((value) => (
      isObject(value) && (isObject(value.animation) || (typeof value.script === 'string' && value.script.length > 0))
    ));
    if (dynamic) return false;

    const combos = isObject(pass.combos) ? pass.combos : {};
    const optionalCombo = (semanticKey: string): number | null => {
      const entry = Object.entries(combos).find(([name]) => (
        canonicalWallpaperEngineEffectParameterKey(name) === semanticKey
      ));
      return entry ? parseNumber(propertyBaseValue(entry[1])) : null;
    };
    const version = descriptor ? parseNumber(descriptor.version) : null;
    if (version !== null && version !== 1) return false;

    const caster = optionalCombo('caster');
    const samples = optionalCombo('samples');
    const kernel = optionalCombo('kernel');
    const vertical = optionalCombo('vertical');
    const blendMode = optionalCombo('blendmode');

    return (caster === null || caster === 0 || caster === 1)
      && (samples === null || (Number.isInteger(samples) && samples >= 0 && samples <= 2))
      && (kernel === null || (Number.isInteger(kernel) && kernel >= 0 && kernel <= 2))
      && (vertical === null || vertical === 0 || vertical === 1)
      && (blendMode === null || (Number.isInteger(blendMode) && blendMode >= 0 && blendMode <= 32));
  }

  if (key === 'blurprecise' && surfaceContext === 'image') {
    const shaderValues = isObject(pass.constantshadervalues) ? pass.constantshadervalues : {};
    const canonicalValues = new Map(Object.entries(shaderValues).map(([name, value]) => [
      canonicalWallpaperEngineEffectParameterKey(name),
      value,
    ]));
    const combos = isObject(pass.combos) ? pass.combos : {};
    const comboValue = (semanticKey: string, fallback: number): number => {
      const entry = Object.entries(combos).find(([name]) => (
        canonicalWallpaperEngineEffectParameterKey(name) === semanticKey
      ));
      return parseNumber(entry ? propertyBaseValue(entry[1]) : null) ?? fallback;
    };
    const scaleValue = canonicalValues.get('scale');
    const dynamic = isObject(scaleValue)
      && (isObject(scaleValue.animation) || (typeof scaleValue.script === 'string' && scaleValue.script.length > 0));
    const scaleBase = propertyBaseValue(scaleValue);
    let scaleValid = true;
    if (scaleValue !== undefined) {
      if (typeof scaleBase === 'string') {
        const values = scaleBase.trim().split(/\s+/).map(Number);
        scaleValid = values.length >= 2 && values[0] > 0 && values[1] > 0;
      } else if (Array.isArray(scaleBase)) {
        scaleValid = scaleBase.length >= 2 && Number(scaleBase[0]) > 0 && Number(scaleBase[1]) > 0;
      } else {
        scaleValid = false;
      }
    }
    const kernel = comboValue('kernel', 0);
    const vertical = comboValue('vertical', 0);
    const blurAlpha = comboValue('bluralpha', 1);
    const version = descriptor ? parseNumber(descriptor.version) : null;
    return (version === null || version === 1)
      && !dynamic
      && scaleValid
      && kernel === 0
      && (vertical === 0 || vertical === 1)
      && (blurAlpha === 0 || blurAlpha === 1);
  }
  if (key === 'waterripple' && surfaceContext === 'image') {
    const shaderValues = isObject(pass.constantshadervalues) ? pass.constantshadervalues : {};
    const canonicalValues = new Map(Object.entries(shaderValues).map(([name, value]) => [
      canonicalWallpaperEngineEffectParameterKey(name),
      value,
    ]));
    const combos = isObject(pass.combos) ? pass.combos : {};
    const comboValue = (semanticKey: string): number => {
      const entry = Object.entries(combos).find(([name]) => (
        canonicalWallpaperEngineEffectParameterKey(name) === semanticKey
      ));
      return parseNumber(entry ? propertyBaseValue(entry[1]) : null) ?? 0;
    };
    const dynamic = [
      'animationspeed',
      'scale',
      'scrollspeed',
      'scrolldirection',
      'ratio',
      'ripplestrength',
    ].some((name) => {
      const value = canonicalValues.get(name);
      return isObject(value) && (isObject(value.animation) || (typeof value.script === 'string' && value.script.length > 0));
    });
    const perspectivePoints = ['point0', 'point1', 'point2', 'point3'].some((name) => canonicalValues.has(name));
    const version = descriptor ? parseNumber(descriptor.version) : null;
    return (version === null || version === 1)
      && comboValue('perspective') === 0
      && comboValue('specular') === 0
      && !perspectivePoints
      && !dynamic;
  }
  if (key === 'waterwaves' && surfaceContext === 'image') {
    const shaderValues = isObject(pass.constantshadervalues) ? pass.constantshadervalues : {};
    const perspective = ['point0', 'point1', 'point2', 'point3'].some((name) => shaderValues[name] !== undefined);
    const dual = ['direction2', 'speed2', 'scale2', 'offset2', 'exponent2'].some((name) => shaderValues[name] !== undefined);
    return !perspective && !dual;
  }
  if (context !== 'composition') return false;
  const combos = isObject(pass.combos) ? pass.combos : {};
  const textures = Array.isArray(pass.textures) ? pass.textures : [];
  if (key === 'tint') {
    return (parseNumber(combos.BLENDMODE) ?? 30) === 0
      && !textures.some((item) => typeof item === 'string' && item.trim());
  }
  if (key === 'blend') return (parseNumber(combos.BLENDMODE) ?? 2) === 0;
  if (key === 'transform') return (parseNumber(combos.MODE) ?? 0) === 0;
  if (key === 'fisheye') return true;
  return false;
};

type EffectAccumulator = {
  key: string;
  support: WeCapabilitySupport;
  effectCount: number;
  passCount: number;
  supportedPassCount: number;
  unsupportedPassCount: number;
  contexts: Set<WeCapabilityEffectContext>;
  references: Set<string>;
  descriptorPaths: Set<string>;
};

const supportRank: Record<WeCapabilitySupport, number> = {
  supported: 0,
  partial: 1,
  unsupported: 2,
  unknown: 3,
};

const mergeSupport = (a: WeCapabilitySupport, b: WeCapabilitySupport): WeCapabilitySupport => (
  supportRank[a] >= supportRank[b] ? a : b
);

const finalizeEffects = (map: Map<string, EffectAccumulator>): WeEffectCapabilityUsage[] => [...map.values()]
  .map((item) => ({
    key: item.key,
    support: item.support,
    effectCount: item.effectCount,
    passCount: item.passCount,
    supportedPassCount: item.supportedPassCount,
    unsupportedPassCount: item.unsupportedPassCount,
    contexts: [...item.contexts].sort(),
    references: [...item.references].sort(),
    descriptorPaths: [...item.descriptorPaths].sort(),
  }))
  .sort((a, b) => b.effectCount - a.effectCount || a.key.localeCompare(b.key));

const layerBlendSupport = (mode: number): WeCapabilitySupport => (
  mode === 0 || mode === 7 ? 'supported' : 'unsupported'
);

const blendUsages = (counts: Map<number, number>): WeBlendModeCapabilityUsage[] => [...counts.entries()]
  .map(([mode, count]) => ({ mode, count, support: layerBlendSupport(mode) }))
  .sort((a, b) => b.count - a.count || a.mode - b.mode);

const effectKey = (
  descriptor: JsonObject | null,
  reference: string,
): { key: string; semanticKnown: boolean } => {
  const identity = deriveWallpaperEngineEffectIdentity(descriptor, reference);
  if (identity.semanticKnown) return { key: identity.key, semanticKnown: true };
  const name = descriptor ? stringValue(descriptor.name) : null;
  return {
    key: name ? `unknown:${name}` : `unknown:${normalizePath(reference)}`,
    semanticKnown: false,
  };
};

const analyzeScene = (
  lookup: EntryLookup,
  graphScene: WeSceneResourceGraph,
): WeSceneCapabilityReport => {
  const scene = lookup.readJson(graphScene.descriptorPath) ?? {};
  const objects = Array.isArray(scene.objects) ? scene.objects.filter((item): item is JsonObject => isObject(item)) : [];
  const kinds = emptyLayerKinds();
  const scripts = emptyScripts();
  const layerBlendCounts = new Map<number, number>();
  const effects = new Map<string, EffectAccumulator>();
  const basePath = dirname(graphScene.descriptorPath);
  const puppetObjectIds = new Set(graphScene.imageLayers
    .filter((layer) => Boolean(layer.puppetPath))
    .map((layer) => layer.id));

  collectScripts(scene, scripts);

  for (const object of objects) {
    const context = layerKind(object);
    const rawObjectId = propertyBaseValue(object.id);
    const objectId = typeof rawObjectId === 'string' || typeof rawObjectId === 'number'
      ? String(rawObjectId)
      : null;
    const effectContext: WeCapabilityEffectContext = context === 'image' && objectId && puppetObjectIds.has(objectId)
      ? 'puppet'
      : context === 'particle' || context === 'other' ? 'other' : context;
    kinds[context] += 1;
    const blend = parseNumber(object.colorBlendMode);
    if (blend !== null) layerBlendCounts.set(blend, (layerBlendCounts.get(blend) ?? 0) + 1);

    if (!Array.isArray(object.effects)) continue;
    for (const rawEffect of object.effects) {
      if (!isObject(rawEffect) || !resolveVisible(rawEffect.visible)) continue;
      const reference = stringValue(rawEffect.file);
      if (!reference) {
        const key = 'unknown:<missing-effect-reference>';
        const item = effects.get(key) ?? {
          key,
          support: 'unknown' as const,
          effectCount: 0,
          passCount: 0,
          supportedPassCount: 0,
          unsupportedPassCount: 0,
          contexts: new Set<WeCapabilityEffectContext>(),
          references: new Set<string>(),
          descriptorPaths: new Set<string>(),
        };
        item.effectCount += 1;
        item.contexts.add(effectContext);
        effects.set(key, item);
        continue;
      }

      const descriptorPath = lookup.resolvePath(joinPath(basePath, reference));
      const descriptor = descriptorPath ? lookup.readJson(descriptorPath) : null;
      const identity = effectKey(descriptor, reference);
      const support = identity.semanticKnown ? knownCapabilitySupport(identity.key, effectContext) : 'unknown';
      const item = effects.get(identity.key) ?? {
        key: identity.key,
        support,
        effectCount: 0,
        passCount: 0,
        supportedPassCount: 0,
        unsupportedPassCount: 0,
        contexts: new Set<WeCapabilityEffectContext>(),
        references: new Set<string>(),
        descriptorPaths: new Set<string>(),
      };
      item.support = mergeSupport(item.support, support);
      item.effectCount += 1;
      item.contexts.add(effectContext);
      item.references.add(reference);
      if (descriptorPath) item.descriptorPaths.add(descriptorPath);

      const passes = Array.isArray(rawEffect.passes)
        ? rawEffect.passes.filter((pass): pass is JsonObject => isObject(pass))
        : [];
      item.passCount += passes.length;
      for (const pass of passes) {
        if (identity.semanticKnown && passIsSupported(identity.key, effectContext, pass, descriptor)) item.supportedPassCount += 1;
        else item.unsupportedPassCount += 1;
      }
      if (!passes.length) item.unsupportedPassCount += 1;
      effects.set(identity.key, item);
    }
  }

  const finalizedEffects = finalizeEffects(effects);
  const diagnosticsByCode: Record<string, number> = {};
  for (const diagnostic of graphScene.diagnostics) {
    diagnosticsByCode[diagnostic.code] = (diagnosticsByCode[diagnostic.code] ?? 0) + 1;
  }

  const puppetLayerCount = graphScene.imageLayers.filter((layer) => Boolean(layer.puppetPath)).length;
  const frameAnimationLayerCount = graphScene.imageLayers.filter((layer) => (
    layer.textures.some((texture) => texture.kind === 'frameSequence')
  )).length;
  const unknownEffectCount = finalizedEffects
    .filter((effect) => effect.support === 'unknown')
    .reduce((sum, effect) => sum + effect.effectCount, 0);
  const unsupportedEffectCount = finalizedEffects
    .filter((effect) => effect.support === 'unsupported' || effect.unsupportedPassCount > 0)
    .reduce((sum, effect) => sum + effect.effectCount, 0);

  return {
    descriptorPath: graphScene.descriptorPath,
    objectCount: objects.length,
    layerKinds: kinds,
    puppetLayerCount,
    frameAnimationLayerCount,
    relativeOriginAnimationCount: countRelativeOriginAnimations(objects),
    scripts,
    layerBlendModes: blendUsages(layerBlendCounts),
    effects: finalizedEffects,
    diagnosticsByCode,
    unsupported: {
      projectLayerCount: kinds.project,
      fullscreenLayerCount: kinds.fullscreen,
      particleCount: kinds.particle,
      otherObjectCount: graphScene.skippedObjects.filter((item) => item.reason === 'unsupportedObject' || item.reason === 'textOrScript').length,
      unresolvedImageCount: graphScene.skippedObjects.filter((item) => item.reason === 'unresolvedImageChain').length,
      unknownEffectCount,
      unsupportedEffectCount,
    },
  };
};

const mergeNumberRecord = (target: Record<string, number>, source: Record<string, number>): void => {
  for (const [key, value] of Object.entries(source)) target[key] = (target[key] ?? 0) + value;
};

const mergeScriptSummary = (target: WeScriptCapabilitySummary, source: WeScriptCapabilitySummary): void => {
  target.total += source.total;
  target.perFrameUpdate += source.perFrameUpdate;
  target.userPropertyCallback += source.userPropertyCallback;
  target.engineRuntime += source.engineRuntime;
  target.sceneLookup += source.sceneLookup;
  target.dateTime += source.dateTime;
  target.audio += source.audio;
};

const mergeEffectUsage = (target: Map<string, EffectAccumulator>, source: WeEffectCapabilityUsage): void => {
  const current = target.get(source.key) ?? {
    key: source.key,
    support: source.support,
    effectCount: 0,
    passCount: 0,
    supportedPassCount: 0,
    unsupportedPassCount: 0,
    contexts: new Set<WeCapabilityEffectContext>(),
    references: new Set<string>(),
    descriptorPaths: new Set<string>(),
  };
  current.support = mergeSupport(current.support, source.support);
  current.effectCount += source.effectCount;
  current.passCount += source.passCount;
  current.supportedPassCount += source.supportedPassCount;
  current.unsupportedPassCount += source.unsupportedPassCount;
  source.contexts.forEach((value) => current.contexts.add(value));
  source.references.forEach((value) => current.references.add(value));
  source.descriptorPaths.forEach((value) => current.descriptorPaths.add(value));
  target.set(source.key, current);
};

/**
 * Inspect the WE semantics present in an archive without changing import or
 * renderer behavior. The report is intentionally path-agnostic for support
 * decisions: resource paths are retained only as diagnostics.
 */
export const analyzeWallpaperEngineCapabilities = (
  entries: Map<string, Uint8Array>,
  graph: WeArchiveResourceGraph,
): WeArchiveCapabilityReport => {
  const lookup = new EntryLookup(entries);
  const scenes = graph.scenes.map((scene) => analyzeScene(lookup, scene));
  const layerKinds = emptyLayerKinds();
  const scripts = emptyScripts();
  const effects = new Map<string, EffectAccumulator>();
  const layerBlendCounts = new Map<number, number>();
  const diagnosticsByCode: Record<string, number> = {};
  let objectCount = 0;
  let puppetLayerCount = 0;
  let frameAnimationLayerCount = 0;
  let relativeOriginAnimationCount = 0;

  for (const scene of scenes) {
    objectCount += scene.objectCount;
    puppetLayerCount += scene.puppetLayerCount;
    frameAnimationLayerCount += scene.frameAnimationLayerCount;
    relativeOriginAnimationCount += scene.relativeOriginAnimationCount;
    for (const kind of Object.keys(layerKinds) as WeCapabilityLayerKind[]) layerKinds[kind] += scene.layerKinds[kind];
    mergeScriptSummary(scripts, scene.scripts);
    mergeNumberRecord(diagnosticsByCode, scene.diagnosticsByCode);
    scene.effects.forEach((effect) => mergeEffectUsage(effects, effect));
    for (const blend of scene.layerBlendModes) {
      layerBlendCounts.set(blend.mode, (layerBlendCounts.get(blend.mode) ?? 0) + blend.count);
    }
  }

  return {
    format: 'tablab-we-capability-report',
    version: 1,
    scenes,
    totals: {
      sceneCount: scenes.length,
      objectCount,
      layerKinds,
      puppetLayerCount,
      frameAnimationLayerCount,
      relativeOriginAnimationCount,
      scripts,
      effects: finalizeEffects(effects),
      layerBlendModes: blendUsages(layerBlendCounts),
      diagnosticsByCode,
    },
  };
};

export const formatWallpaperEngineCapabilityReport = (report: WeArchiveCapabilityReport): string => {
  const effectSummary = report.totals.effects.length
    ? report.totals.effects.map((effect) => (
      `${effect.key}:${effect.support} x${effect.effectCount} (${effect.supportedPassCount}/${effect.passCount} passes supported)`
    )).join(', ')
    : 'none';
  const blends = report.totals.layerBlendModes.length
    ? report.totals.layerBlendModes.map((item) => `${item.mode}:${item.support} x${item.count}`).join(', ')
    : 'none';
  return [
    `WE scenes: ${report.totals.sceneCount}, objects: ${report.totals.objectCount}`,
    `layers: ${Object.entries(report.totals.layerKinds).map(([key, value]) => `${key}=${value}`).join(', ')}`,
    `puppet=${report.totals.puppetLayerCount}, frameAnimation=${report.totals.frameAnimationLayerCount}, relativeOriginAnimation=${report.totals.relativeOriginAnimationCount}`,
    `scripts: total=${report.totals.scripts.total}, update=${report.totals.scripts.perFrameUpdate}, userProperties=${report.totals.scripts.userPropertyCallback}, runtime=${report.totals.scripts.engineRuntime}, sceneLookup=${report.totals.scripts.sceneLookup}, dateTime=${report.totals.scripts.dateTime}, audio=${report.totals.scripts.audio}`,
    `layer blend modes: ${blends}`,
    `effects: ${effectSummary}`,
  ].join('\n');
};
