import type { WeSceneResourceItem } from '@/shared/utils/db';
import type { ImportedWeScene } from './wallpaperEngineImportedScene';

const extensionOf = (path: string): string => {
  const clean = path.replace(/\\/g, '/').toLowerCase();
  const index = clean.lastIndexOf('.');
  return index >= 0 ? clean.slice(index) : '';
};

export const wallpaperEngineResourceMimeType = (path: string): string => {
  switch (extensionOf(path)) {
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    case '.gif': return 'image/gif';
    case '.bmp': return 'image/bmp';
    case '.avif': return 'image/avif';
    case '.ttf': return 'font/ttf';
    case '.otf': return 'font/otf';
    case '.woff': return 'font/woff';
    case '.woff2': return 'font/woff2';
    default: return 'application/octet-stream';
  }
};

const bytesToBlob = (data: Uint8Array, type: string): Blob => {
  const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  return new Blob([buffer], { type });
};

/**
 * Only renderer-facing assets are persisted. Model/material JSON is consumed while
 * building the TabLab IR, while raw puppet MDL is retained only when the runtime
 * may need skeletal playback. Paths come from the resolved reference graph, never from a
 * fixed folder/name convention.
 */
export const collectWallpaperEngineSceneResourcePaths = (scene: ImportedWeScene): string[] => {
  const paths = new Set<string>();
  for (const layer of scene.layers) {
    if (layer.source.kind === 'text') {
      if (layer.source.fontPath) paths.add(layer.source.fontPath);
    } else if (layer.source.kind === 'image' || layer.source.kind === 'puppetMesh') {
      paths.add(layer.source.path);
      if (layer.source.kind === 'puppetMesh' && layer.source.modelPath) paths.add(layer.source.modelPath);
    } else if (layer.source.kind === 'composition') {
      for (const effect of layer.source.effects) {
        if (effect.kind === 'blend') {
          paths.add(effect.texturePath);
          if (effect.maskPath) paths.add(effect.maskPath);
        } else if (effect.kind === 'opacity' && effect.maskPath) {
          paths.add(effect.maskPath);
        }
      }
    } else if (layer.source.kind === 'frameAnimation') {
      for (const frame of layer.source.frames) paths.add(frame);
    }

    // Preserve the existing source-first resource order, then append effect
    // resources needed to render that layer.
    for (const effect of layer.opacityEffects ?? []) {
      if (effect.maskPath) paths.add(effect.maskPath);
    }
    const textureEffects = layer.textureEffects ?? (layer.waterWavesEffects ?? []).map((effect) => ({
      kind: 'waterWaves' as const,
      ...effect,
    }));
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
  }
  return [...paths];
};

export const getWallpaperEngineScenePreviewPath = (scene: ImportedWeScene): string | null => {
  // Prefer the bottom-most visible layer: in WE scenes it is most commonly the
  // base/background and therefore gives a useful gallery thumbnail.
  const candidates = [...scene.layers]
    .sort((a, b) => a.zIndex - b.zIndex)
    .filter((layer) => layer.visible && layer.opacity > 0);

  for (const layer of candidates.length ? candidates : scene.layers) {
    if (layer.source.kind === 'solidColor' || layer.source.kind === 'text' || layer.source.kind === 'composition') continue;
    if (layer.source.kind === 'image' || layer.source.kind === 'puppetMesh') return layer.source.path;
    if (layer.source.kind === 'frameAnimation' && layer.source.frames.length) return layer.source.frames[0];
  }
  return null;
};

export interface BuildWeSceneResourcesResult {
  resources: WeSceneResourceItem[];
  totalResourceBytes: number;
}

export const buildWallpaperEngineSceneResources = (
  wallpaperId: string,
  scene: ImportedWeScene,
  entries: Map<string, Uint8Array>,
): BuildWeSceneResourcesResult => {
  const resources: WeSceneResourceItem[] = [];
  let totalResourceBytes = 0;

  for (const path of collectWallpaperEngineSceneResourcePaths(scene)) {
    const data = entries.get(path);
    if (!data) {
      throw new Error(`Wallpaper Engine 场景引用的资源不存在：${path}`);
    }
    const mimeType = wallpaperEngineResourceMimeType(path);
    resources.push({
      key: `${wallpaperId}::${path}`,
      wallpaperId,
      path,
      data: bytesToBlob(data, mimeType),
      mimeType,
      byteLength: data.byteLength,
    });
    totalResourceBytes += data.byteLength;
  }

  return { resources, totalResourceBytes };
};

export const wallpaperEngineBytesToBlob = (path: string, data: Uint8Array): Blob => (
  bytesToBlob(data, wallpaperEngineResourceMimeType(path))
);
