import type {
  WeResolvedEffect,
  WeResolvedEffectBaseValue,
  WeResolvedEffectParameter,
  WeResolvedEffectPass,
} from './wallpaperEngineTypes';

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const nonEmptyString = (value: unknown): string | null => (
  typeof value === 'string' && value.trim() ? value.trim() : null
);

const normalizeBaseValue = (value: unknown): WeResolvedEffectBaseValue => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    const numbers = value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item));
    return numbers.length === value.length ? numbers : null;
  }
  return null;
};

export const wallpaperEngineEffectParameterBaseValue = (value: unknown): WeResolvedEffectParameter => {
  if (!isObject(value)) {
    return { value: normalizeBaseValue(value), hasAnimation: false, hasScript: false };
  }
  const hasWrappedValue = Object.prototype.hasOwnProperty.call(value, 'value');
  return {
    value: normalizeBaseValue(hasWrappedValue ? value.value : null),
    hasAnimation: isObject(value.animation),
    hasScript: typeof value.script === 'string' && value.script.length > 0,
  };
};

/**
 * Canonical semantic key used for capability grouping and future renderer
 * dispatch. It intentionally removes presentation separators so older WE
 * descriptors such as `foliage_sway` and newer `foliagesway` collapse to the
 * same identity without inspecting workshop ids or sample paths.
 */
export const canonicalWallpaperEngineEffectKey = (value: string): string => value
  .trim()
  .toLowerCase()
  .replace(/^ui_editor_effect_/, '')
  .replace(/_(?:title|description)$/, '')
  .replace(/[^a-z0-9]+/g, '');

export const canonicalWallpaperEngineEffectParameterKey = (value: string): string => value
  .trim()
  .toLowerCase()
  .replace(/^ui_editor_properties_/, '')
  .replace(/[^a-z0-9]+/g, '');

const effectReferenceFallback = (reference: string): string | null => {
  const normalized = reference.replace(/\\/g, '/').replace(/\/+$/, '');
  const parts = normalized.split('/').filter(Boolean);
  if (!parts.length) return null;
  const filename = parts[parts.length - 1]?.toLowerCase() ?? '';
  const candidate = filename === 'effect.json' && parts.length > 1 ? parts[parts.length - 2] : filename.replace(/\.json$/i, '');
  return candidate ? candidate : null;
};

export interface WallpaperEngineEffectIdentity {
  key: string;
  sourceKey: string | null;
  semanticKnown: boolean;
}

export const deriveWallpaperEngineEffectIdentity = (
  descriptor: unknown,
  reference: string,
): WallpaperEngineEffectIdentity => {
  const object = isObject(descriptor) ? descriptor : null;
  const replacementKey = object ? nonEmptyString(object.replacementkey) : null;
  if (replacementKey) {
    const key = canonicalWallpaperEngineEffectKey(replacementKey);
    if (key) return { key, sourceKey: replacementKey, semanticKnown: true };
  }

  const name = object ? nonEmptyString(object.name) : null;
  if (name) {
    const match = /^ui_editor_effect_(.+?)_title$/i.exec(name);
    if (match?.[1]) {
      const key = canonicalWallpaperEngineEffectKey(match[1]);
      if (key) return { key, sourceKey: match[1], semanticKnown: true };
    }
  }

  // Canonical WE effect descriptors normally identify themselves through
  // replacementkey/UI name. A path fallback remains diagnostic-only when that
  // semantic metadata is absent or the descriptor itself is unavailable.
  const fallback = effectReferenceFallback(reference);
  const key = fallback ? canonicalWallpaperEngineEffectKey(fallback) : '';
  return {
    key: key || 'unknown',
    sourceKey: null,
    semanticKnown: false,
  };
};

const normalizeCombos = (value: unknown): Record<string, number | string | boolean> => {
  if (!isObject(value)) return {};
  const result: Record<string, number | string | boolean> = {};
  for (const [key, raw] of Object.entries(value)) {
    const parameter = wallpaperEngineEffectParameterBaseValue(raw).value;
    if (typeof parameter === 'number' || typeof parameter === 'string' || typeof parameter === 'boolean') {
      result[key] = parameter;
    }
  }
  return result;
};

const normalizeConstants = (value: unknown): Record<string, WeResolvedEffectParameter> => {
  if (!isObject(value)) return {};
  const result: Record<string, WeResolvedEffectParameter> = {};
  for (const [key, raw] of Object.entries(value)) result[key] = wallpaperEngineEffectParameterBaseValue(raw);
  return result;
};

const normalizeTextures = (value: unknown): Array<string | null> => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => typeof item === 'string' && item.trim() ? item : null);
};

export const buildWallpaperEngineEffectIr = (
  rawEffect: unknown,
  descriptor: unknown,
  reference: string,
  descriptorPath: string | null,
): WeResolvedEffect | null => {
  if (!isObject(rawEffect)) return null;
  const identity = deriveWallpaperEngineEffectIdentity(descriptor, reference);
  const descriptorPasses = isObject(descriptor) && Array.isArray(descriptor.passes)
    ? descriptor.passes
    : [];
  const rawPasses = Array.isArray(rawEffect.passes) ? rawEffect.passes : [];
  const passes: WeResolvedEffectPass[] = [];

  rawPasses.forEach((rawPass, index) => {
    if (!isObject(rawPass)) return;
    const descriptorPass = isObject(descriptorPasses[index]) ? descriptorPasses[index] : null;
    passes.push({
      index,
      materialReference: descriptorPass ? nonEmptyString(descriptorPass.material) : null,
      combos: normalizeCombos(rawPass.combos),
      constants: normalizeConstants(rawPass.constantshadervalues),
      textures: normalizeTextures(rawPass.textures),
    });
  });

  const descriptorVersion = isObject(descriptor)
    && typeof descriptor.version === 'number'
    && Number.isFinite(descriptor.version)
      ? descriptor.version
      : null;

  return {
    key: identity.key,
    sourceKey: identity.sourceKey,
    reference,
    descriptorPath,
    descriptorVersion,
    passes,
  };
};
