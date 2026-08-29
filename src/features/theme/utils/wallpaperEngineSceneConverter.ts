import type {
  ImportedWeArchive,
  ImportedWeDiagnostic,
  ImportedWeLayer,
  ImportedWePostProcessEffect,
  ImportedWePuppetAttachmentBinding,
  ImportedWeScene,
  ImportedWeSize,
  ImportedWeSource,
  ImportedWeTextureEffect,
} from './wallpaperEngineImportedScene';
import {
  classifyWallpaperEnginePuppetAnimation,
  convertWallpaperEnginePuppetAttachmentTransformToBrowser,
  getWallpaperEnginePuppetAttachmentBindTransform2d,
} from './wallpaperEnginePuppetAnimation';
import {
  parseWallpaperEnginePuppetMesh,
  parseWallpaperEnginePuppetModel,
  type ParsedWePuppetModel,
} from './wallpaperEnginePuppetModel';
import type {
  WeArchiveResourceGraph,
  WeLayerAlignment,
  WeResolvedCompositionLayer,
  WeResolvedImageLayer,
  WeResolvedSolidLayer,
  WeResolvedTextLayer,
  WeResolvedTextureEffect,
  WeResolvedTexture,
  WeSceneResourceGraph,
} from './wallpaperEngineTypes';

type JsonObject = Record<string, unknown>;

const decoder = new TextDecoder();

const isObject = (value: unknown): value is JsonObject => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

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

class EntryLookup {
  private readonly entries = new Map<string, Uint8Array>();

  constructor(input: Map<string, Uint8Array>) {
    for (const [path, data] of input) this.entries.set(normalizePath(path), data);
  }

  get(path: string): Uint8Array | null {
    return this.entries.get(normalizePath(path)) ?? null;
  }

  readJson(path: string): JsonObject | null {
    const bytes = this.get(path);
    if (!bytes) return null;
    try {
      const value: unknown = JSON.parse(decoder.decode(bytes));
      return isObject(value) ? value : null;
    } catch {
      return null;
    }
  }
}

const positiveNumber = (value: unknown): number | null => (
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
);

const weColorBlendModeToImported = (value: number | undefined): ImportedWeLayer['blendMode'] => {
  if (value === undefined || value === 0) return 'normal';
  // WE colorBlendMode 7 is used for screen/light compositing. In particular,
  // opaque-black glow atlases rely on this mode so black preserves the backdrop.
  if (value === 7) return 'screen';
  return null;
};

const makeSize = (width: number | null, height: number | null): ImportedWeSize | null => (
  width !== null && height !== null ? { width, height } : null
);

const u24le = (data: Uint8Array, offset: number): number => (
  data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16)
);

const readPngSize = (data: Uint8Array): ImportedWeSize | null => {
  if (data.length < 24) return null;
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!signature.every((value, index) => data[index] === value)) return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return makeSize(view.getUint32(16, false), view.getUint32(20, false));
};

const readGifSize = (data: Uint8Array): ImportedWeSize | null => {
  if (data.length < 10) return null;
  const header = String.fromCharCode(...data.slice(0, 6));
  if (header !== 'GIF87a' && header !== 'GIF89a') return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return makeSize(view.getUint16(6, true), view.getUint16(8, true));
};

const readBmpSize = (data: Uint8Array): ImportedWeSize | null => {
  if (data.length < 26 || data[0] !== 0x42 || data[1] !== 0x4d) return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const width = Math.abs(view.getInt32(18, true));
  const height = Math.abs(view.getInt32(22, true));
  return makeSize(width, height);
};

const readJpegSize = (data: Uint8Array): ImportedWeSize | null => {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 8 < data.length) {
    if (data[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (offset < data.length && data[offset] === 0xff) offset += 1;
    if (offset >= data.length) break;
    const marker = data[offset++];
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (marker === 0xda) break;
    if (offset + 2 > data.length) break;
    const length = (data[offset] << 8) | data[offset + 1];
    if (length < 2 || offset + length > data.length) break;
    const isSof = (
      marker >= 0xc0 && marker <= 0xcf
      && ![0xc4, 0xc8, 0xcc].includes(marker)
    );
    if (isSof && length >= 7) {
      const height = (data[offset + 3] << 8) | data[offset + 4];
      const width = (data[offset + 5] << 8) | data[offset + 6];
      return makeSize(width, height);
    }
    offset += length;
  }
  return null;
};

const readWebpSize = (data: Uint8Array): ImportedWeSize | null => {
  if (data.length < 30) return null;
  const ascii = (start: number, length: number) => String.fromCharCode(...data.slice(start, start + length));
  if (ascii(0, 4) !== 'RIFF' || ascii(8, 4) !== 'WEBP') return null;
  const chunk = ascii(12, 4);
  if (chunk === 'VP8X' && data.length >= 30) {
    return makeSize(1 + u24le(data, 24), 1 + u24le(data, 27));
  }
  if (chunk === 'VP8 ' && data.length >= 30 && data[23] === 0x9d && data[24] === 0x01 && data[25] === 0x2a) {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    return makeSize(view.getUint16(26, true) & 0x3fff, view.getUint16(28, true) & 0x3fff);
  }
  if (chunk === 'VP8L' && data.length >= 25 && data[20] === 0x2f) {
    const b0 = data[21];
    const b1 = data[22];
    const b2 = data[23];
    const b3 = data[24];
    const bits = b0 | (b1 << 8) | (b2 << 16) | (b3 << 24);
    const width = 1 + (bits & 0x3fff);
    const height = 1 + ((bits >>> 14) & 0x3fff);
    return makeSize(width, height);
  }
  return null;
};

export const readBrowserImagePixelSize = (data: Uint8Array): ImportedWeSize | null => (
  readPngSize(data)
  ?? readGifSize(data)
  ?? readBmpSize(data)
  ?? readJpegSize(data)
  ?? readWebpSize(data)
);

const sameSize = (a: ImportedWeSize, b: ImportedWeSize): boolean => (
  a.width === b.width && a.height === b.height
);

const sourceFromTexture = (
  lookup: EntryLookup,
  layer: WeResolvedImageLayer,
  texture: WeResolvedTexture,
  diagnostics: ImportedWeDiagnostic[],
): ImportedWeSource => {
  const firstBytes = texture.paths.length ? lookup.get(texture.paths[0]) : null;
  const pixelSize = firstBytes ? readBrowserImagePixelSize(firstBytes) : null;

  if (texture.kind === 'frameSequence') {
    if (pixelSize) {
      for (const path of texture.paths.slice(1)) {
        const bytes = lookup.get(path);
        const frameSize = bytes ? readBrowserImagePixelSize(bytes) : null;
        if (frameSize && !sameSize(frameSize, pixelSize)) {
          diagnostics.push({
            level: 'warning',
            code: 'FRAME_SIZE_MISMATCH',
            message: `Frame sequence contains a frame with a different pixel size: ${path}`,
            layerId: layer.id,
            path,
          });
          break;
        }
      }
    }
    return {
      kind: 'frameAnimation',
      frames: [...texture.paths],
      pixelSize,
      fps: null,
    };
  }

  return {
    kind: 'image',
    path: texture.paths[0],
    pixelSize,
  };
};

const modelLogicalSize = (lookup: EntryLookup, modelPath: string): ImportedWeSize | null => {
  const model = lookup.readJson(modelPath);
  if (!model) return null;
  return makeSize(positiveNumber(model.width), positiveNumber(model.height));
};

const sourcePixelSize = (source: ImportedWeSource): ImportedWeSize | null => (
  source.kind === 'solidColor' || source.kind === 'text' || source.kind === 'composition' ? null : source.pixelSize
);

const centerAnimationsFromLayer = (
  layer:
    | Pick<WeResolvedImageLayer, 'centerAnimations'>
    | Pick<WeResolvedSolidLayer, 'centerAnimations'>
    | Pick<WeResolvedTextLayer, 'centerAnimations'>
    | Pick<WeResolvedCompositionLayer, 'centerAnimations'>,
) => layer.centerAnimations.map((animation) => ({
  fps: animation.fps,
  lengthFrames: animation.lengthFrames,
  mode: animation.mode,
  x: animation.x.map((keyframe) => ({ ...keyframe })),
  y: animation.y.map((keyframe) => ({ ...keyframe })),
}));

const centerFromAlignment = (
  origin: readonly [number, number, number],
  size: ImportedWeSize,
  scale: readonly [number, number, number],
  rotationRadians: number,
  alignment: WeLayerAlignment,
): { x: number; y: number } => {
  let offsetX = 0;
  let offsetY = 0;

  if (alignment.includes('left')) offsetX = size.width / 2;
  else if (alignment.includes('right')) offsetX = -size.width / 2;

  // The transform resolver has already reflected WE's Y-up world into the
  // browser's Y-down stage. A WE top pivot therefore places the rectangle's
  // visual center below the pivot; bottom does the opposite.
  if (alignment.includes('top')) offsetY = size.height / 2;
  else if (alignment.includes('bottom')) offsetY = -size.height / 2;

  const scaledX = offsetX * scale[0];
  const scaledY = offsetY * scale[1];
  const cos = Math.cos(rotationRadians);
  const sin = Math.sin(rotationRadians);
  return {
    x: origin[0] + scaledX * cos - scaledY * sin,
    y: origin[1] + scaledX * sin + scaledY * cos,
  };
};

const puppetCenterFromBounds = (
  origin: readonly [number, number, number],
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  scale: readonly [number, number, number],
  rotationRadians: number,
): { x: number; y: number } => {
  // Puppet vertex positions are local to the WE layer origin and use Y-up.
  // The browser stage is Y-down, so reflect the local mesh-center Y before
  // applying the already-converted browser-space layer rotation.
  const localX = (bounds.minX + bounds.maxX) / 2;
  const localY = -(bounds.minY + bounds.maxY) / 2;
  const scaledX = localX * scale[0];
  const scaledY = localY * scale[1];
  const cos = Math.cos(rotationRadians);
  const sin = Math.sin(rotationRadians);
  return {
    x: origin[0] + scaledX * cos - scaledY * sin,
    y: origin[1] + scaledX * sin + scaledY * cos,
  };
};

const toImportedTextureEffects = (effects: WeResolvedTextureEffect[]): ImportedWeTextureEffect[] => effects.map((effect) => {
  if (effect.kind === 'scroll') {
    return { ...effect, repeat: { x: effect.repeat[0], y: effect.repeat[1] } };
  }
  if (effect.kind === 'transform') {
    return {
      ...effect,
      offset: { x: effect.offset[0], y: effect.offset[1] },
      scale: { x: effect.scale[0], y: effect.scale[1] },
    };
  }
  if (effect.kind === 'spin') {
    return { ...effect, center: { x: effect.center[0], y: effect.center[1] } };
  }
  if (effect.kind === 'perspective') {
    return {
      ...effect,
      points: effect.points.map(([x, y]) => ({ x, y })) as [
        { x: number; y: number },
        { x: number; y: number },
        { x: number; y: number },
        { x: number; y: number },
      ],
    };
  }
  if (effect.kind === 'shake') {
    return {
      ...effect,
      friction: { x: effect.friction[0], y: effect.friction[1] },
      bounds: { x: effect.bounds[0], y: effect.bounds[1] },
    };
  }
  if (effect.kind === 'blurPrecise') {
    return {
      ...effect,
      scale: { x: effect.scale[0], y: effect.scale[1] },
    };
  }
  if (effect.kind === 'shimmer') {
    return {
      ...effect,
      color: { r: effect.color[0], g: effect.color[1], b: effect.color[2] },
    };
  }
  if (effect.kind === 'shine') {
    return {
      ...effect,
      rayColor: { r: effect.rayColor[0], g: effect.rayColor[1], b: effect.rayColor[2] },
      blurScale: { x: effect.blurScale[0], y: effect.blurScale[1] },
    };
  }
  if (effect.kind === 'godRays') {
    return {
      ...effect,
      caster: effect.caster.mode === 'radial'
        ? { mode: 'radial' as const, center: { x: effect.caster.center[0], y: effect.caster.center[1] } }
        : { mode: 'directional' as const, direction: effect.caster.direction },
      colorStart: { r: effect.colorStart[0], g: effect.colorStart[1], b: effect.colorStart[2] },
      colorEnd: { r: effect.colorEnd[0], g: effect.colorEnd[1], b: effect.colorEnd[2] },
      blurScale: { x: effect.blurScale[0], y: effect.blurScale[1] },
    };
  }
  return { ...effect };
});

interface WeLayerBuildContext {
  imageLayersById: Map<string, WeResolvedImageLayer>;
  puppetModels: Map<string, ParsedWePuppetModel | null>;
}

const getCachedPuppetModel = (
  lookup: EntryLookup,
  path: string,
  cache: Map<string, ParsedWePuppetModel | null>,
): ParsedWePuppetModel | null => {
  if (cache.has(path)) return cache.get(path) ?? null;
  const bytes = lookup.get(path);
  const model = bytes ? parseWallpaperEnginePuppetModel(bytes) : null;
  cache.set(path, model);
  return model;
};

const attachmentLocalAffine = (matrix: number[]) => ({
  a: matrix[0],
  b: matrix[1],
  c: matrix[4],
  d: matrix[5],
  tx: matrix[12],
  ty: matrix[13],
});

const buildPuppetAttachmentBinding = (
  lookup: EntryLookup,
  layer: WeResolvedImageLayer,
  size: ImportedWeSize,
  puppetMesh: ReturnType<typeof parseWallpaperEnginePuppetMesh>,
  context: WeLayerBuildContext,
): ImportedWePuppetAttachmentBinding | null => {
  if (!layer.parentId || !layer.attachmentName) return null;
  const parentLayer = context.imageLayersById.get(layer.parentId);
  if (!parentLayer?.puppetPath) return null;
  const parentModel = getCachedPuppetModel(lookup, parentLayer.puppetPath, context.puppetModels);
  if (!parentModel) return null;
  const attachment = parentModel.attachments.find((candidate) => candidate.name === layer.attachmentName);
  if (!attachment) return null;
  const bindTransformWe = getWallpaperEnginePuppetAttachmentBindTransform2d(parentModel, attachment);
  if (!bindTransformWe) return null;
  const bindTransform = convertWallpaperEnginePuppetAttachmentTransformToBrowser(bindTransformWe);
  const parentSupport = classifyWallpaperEnginePuppetAnimation(parentModel, parentLayer.puppetAnimationLayers);
  const local = layer.localTransform;
  const localOrigin: readonly [number, number, number] = [local.origin[0], local.origin[1] === 0 ? 0 : -local.origin[1], local.origin[2]];
  const localCenter = puppetMesh
    ? puppetCenterFromBounds(localOrigin, puppetMesh.bounds, local.scale, local.angles[2])
    : centerFromAlignment(localOrigin, size, local.scale, local.angles[2], local.alignment);

  return {
    name: attachment.name,
    parentLayerId: parentLayer.id,
    parentModelPath: parentLayer.puppetPath,
    parentAnimationLayers: parentLayer.puppetAnimationLayers.map((animationLayer) => ({ ...animationLayer })),
    parentAnimationMode: parentSupport.supported ? parentSupport.mode : undefined,
    parentOrigin: { x: parentLayer.transform.origin[0], y: parentLayer.transform.origin[1] },
    parentScale: { x: parentLayer.transform.scale[0], y: parentLayer.transform.scale[1] },
    parentRotationDeg: parentLayer.transform.angles[2] * (180 / Math.PI),
    boneIndex: attachment.boneIndex,
    localMatrix: attachmentLocalAffine(attachment.localMatrix),
    bindTransform,
    localCenter,
    localScale: { x: local.scale[0], y: local.scale[1] },
    localRotationDeg: local.angles[2] * (180 / Math.PI),
  };
};

const buildLayer = (
  lookup: EntryLookup,
  layer: WeResolvedImageLayer,
  diagnostics: ImportedWeDiagnostic[],
  context: WeLayerBuildContext,
): ImportedWeLayer | null => {
  const primaryTexture = layer.textures[0];
  if (!primaryTexture) return null;

  if (layer.textures.length > 1) {
    diagnostics.push({
      level: 'warning',
      code: 'MULTIPLE_TEXTURES_PRIMARY_ONLY',
      message: `Material resolved ${layer.textures.length} textures; phase 2 keeps only the primary texture for base-layer rendering.`,
      layerId: layer.id,
      path: layer.materialPath,
    });
  }

  const baseSource = sourceFromTexture(lookup, layer, primaryTexture, diagnostics);
  const puppetBytes = layer.puppetPath ? lookup.get(layer.puppetPath) : null;
  const puppetModel = puppetBytes && layer.puppetAnimationLayers.length > 0
    ? parseWallpaperEnginePuppetModel(puppetBytes)
    : null;
  const puppetMesh = puppetModel ?? (puppetBytes ? parseWallpaperEnginePuppetMesh(puppetBytes) : null);
  if (layer.puppetPath && !puppetMesh) {
    diagnostics.push({
      level: 'warning',
      code: 'UNSUPPORTED_PUPPET_MODEL',
      message: 'Wallpaper Engine puppet model could not be decoded as supported MDLV0023 static geometry; the atlas image is used as a fallback.',
      layerId: layer.id,
      path: layer.puppetPath,
    });
  }

  const activePuppetAnimations = layer.puppetAnimationLayers.filter((animationLayer) => animationLayer.visible);
  let puppetAnimationPlayable = false;
  let puppetAnimationMode: '2d' | 'orthographic3d' | undefined;
  if (puppetMesh && activePuppetAnimations.length > 0) {
    const support = puppetModel
      ? classifyWallpaperEnginePuppetAnimation(puppetModel, layer.puppetAnimationLayers)
      : { supported: false as const, reason: 'missing-animation-id' as const };
    puppetAnimationPlayable = support.supported;
    if (support.supported) puppetAnimationMode = support.mode;
    if (!support.supported) {
      diagnostics.push({
        level: 'warning',
        code: 'UNSUPPORTED_PUPPET_ANIMATION',
        message: `Puppet animation metadata is retained, but Step 18 keeps this layer in its reference pose because the authored playback is outside the validated 2D/layered or single-layer orthographic-3D subsets (${'reason' in support ? support.reason : 'unsupported'}).`,
        layerId: layer.id,
        path: layer.puppetPath,
      });
    }
  }

  const source: ImportedWeSource = puppetMesh && baseSource.kind === 'image'
    ? {
        kind: 'puppetMesh',
        path: baseSource.path,
        pixelSize: baseSource.pixelSize,
        mesh: {
          positions: puppetMesh.positions,
          positions3d: puppetMesh.positions3d,
          uvs: puppetMesh.uvs,
          indices: puppetMesh.indices,
          bounds: { ...puppetMesh.bounds },
        },
        modelPath: puppetAnimationPlayable ? layer.puppetPath : undefined,
        animationLayers: layer.puppetAnimationLayers.map((animationLayer) => ({ ...animationLayer })),
        animationMode: puppetAnimationMode,
      }
    : baseSource;

  const objectSize = layer.transform.size
    ? makeSize(positiveNumber(layer.transform.size[0]), positiveNumber(layer.transform.size[1]))
    : null;
  const size = puppetMesh
    ? makeSize(puppetMesh.bounds.maxX - puppetMesh.bounds.minX, puppetMesh.bounds.maxY - puppetMesh.bounds.minY)
    : objectSize ?? modelLogicalSize(lookup, layer.modelPath) ?? sourcePixelSize(source);
  if (!size) {
    diagnostics.push({
      level: 'warning',
      code: 'UNKNOWN_SOURCE_SIZE',
      message: 'Layer size is absent from the scene/model and could not be read from the resolved image asset.',
      layerId: layer.id,
      path: primaryTexture.paths[0],
    });
    return null;
  }

  const center = puppetMesh
    ? puppetCenterFromBounds(
        layer.transform.origin,
        puppetMesh.bounds,
        layer.transform.scale,
        layer.transform.angles[2],
      )
    : centerFromAlignment(
        layer.transform.origin,
        size,
        layer.transform.scale,
        layer.transform.angles[2],
        layer.transform.alignment,
      );

  const puppetAttachment = buildPuppetAttachmentBinding(lookup, layer, size, puppetMesh, context);

  // Puppet masks in the corpus are atlas-UV authored. Step 15 keeps Opacity in
  // the same ordered surface-effect list as UV/displacement/ray passes, so a
  // puppet no longer needs a side-list ordering barrier before mesh sampling.
  const orderedTextureEffects = toImportedTextureEffects(layer.textureEffects);
  const persistOrderedTextureEffects = orderedTextureEffects.some((effect) => effect.kind !== 'waterWaves')
    || Boolean(puppetMesh && orderedTextureEffects.length > 0);
  const hasOrderedOpacity = orderedTextureEffects.some((effect) => effect.kind === 'opacity');

  return {
    id: layer.id,
    name: layer.name,
    zIndex: layer.objectIndex,
    source,
    center,
    size,
    scale: { x: layer.transform.scale[0], y: layer.transform.scale[1] },
    rotationDeg: layer.transform.angles[2] * (180 / Math.PI),
    opacity: layer.transform.opacity,
    // New imports keep opacity in the exact ordered surface chain. The legacy
    // side-list remains in the schema/runtime only for scenes persisted by older builds.
    opacityEffects: hasOrderedOpacity ? [] : layer.opacityEffects.map((effect) => ({ ...effect })),
    // Keep the legacy waterWavesEffects field for persisted-v1 compatibility.
    // `textureEffects` is now the exact ordered surface chain for newly imported
    // layers whenever ordering-sensitive effects (including Opacity) are present.
    // Waterwaves-only scenes remain byte-compatible with older v1 metadata.
    waterWavesEffects: layer.waterWavesEffects.map((effect) => ({ ...effect })),
    ...(persistOrderedTextureEffects ? { textureEffects: orderedTextureEffects } : {}),
    visible: layer.transform.visible,
    parallax: layer.transform.parallaxDepth
      ? { x: layer.transform.parallaxDepth[0], y: layer.transform.parallaxDepth[1] }
      : null,
    ...(puppetAttachment ? { puppetAttachment } : {}),
    centerAnimations: centerAnimationsFromLayer(layer),
    blendMode: weColorBlendModeToImported(layer.colorBlendMode),
    compatibility: {
      weObjectIndex: layer.objectIndex,
      weModelPath: layer.modelPath,
      weMaterialPath: layer.materialPath,
      weColorBlendMode: layer.colorBlendMode ?? null,
      ignoredEffects: layer.hasEffects,
    },
  };
};

const buildSolidLayer = (
  layer: WeResolvedSolidLayer,
  diagnostics: ImportedWeDiagnostic[],
): ImportedWeLayer | null => {
  const size = layer.transform.size
    ? makeSize(positiveNumber(layer.transform.size[0]), positiveNumber(layer.transform.size[1]))
    : null;
  if (!size) {
    diagnostics.push({
      level: 'warning',
      code: 'UNKNOWN_SOURCE_SIZE',
      message: 'Solid layer has no positive logical size and cannot be rendered.',
      layerId: layer.id,
      path: layer.builtinModelReference,
    });
    return null;
  }

  const center = centerFromAlignment(
    layer.transform.origin,
    size,
    layer.transform.scale,
    layer.transform.angles[2],
    layer.transform.alignment,
  );

  return {
    id: layer.id,
    name: layer.name,
    zIndex: layer.objectIndex,
    source: {
      kind: 'solidColor',
      color: { r: layer.color[0], g: layer.color[1], b: layer.color[2] },
    },
    center,
    size,
    scale: { x: layer.transform.scale[0], y: layer.transform.scale[1] },
    rotationDeg: layer.transform.angles[2] * (180 / Math.PI),
    opacity: layer.transform.opacity,
    visible: layer.transform.visible,
    parallax: layer.transform.parallaxDepth
      ? { x: layer.transform.parallaxDepth[0], y: layer.transform.parallaxDepth[1] }
      : null,
    centerAnimations: centerAnimationsFromLayer(layer),
    blendMode: weColorBlendModeToImported(layer.colorBlendMode),
    compatibility: {
      weObjectIndex: layer.objectIndex,
      weModelPath: layer.builtinModelReference,
      weMaterialPath: 'builtin:solid-color',
      weColorBlendMode: layer.colorBlendMode ?? null,
      ignoredEffects: layer.hasEffects,
    },
  };
};

const buildTextLayer = (
  layer: WeResolvedTextLayer,
  diagnostics: ImportedWeDiagnostic[],
): ImportedWeLayer | null => {
  const size = layer.transform.size
    ? makeSize(positiveNumber(layer.transform.size[0]), positiveNumber(layer.transform.size[1]))
    : null;
  if (!size) {
    diagnostics.push({
      level: 'warning',
      code: 'UNKNOWN_SOURCE_SIZE',
      message: 'Text layer has no positive logical size and cannot be rendered.',
      layerId: layer.id,
      path: layer.fontReference,
    });
    return null;
  }

  const center = centerFromAlignment(
    layer.transform.origin,
    size,
    layer.transform.scale,
    layer.transform.angles[2],
    layer.transform.alignment,
  );
  const orderedTextureEffects = toImportedTextureEffects(layer.textureEffects);

  return {
    id: layer.id,
    name: layer.name,
    zIndex: layer.objectIndex,
    source: {
      kind: 'text',
      text: layer.text,
      fontReference: layer.fontReference,
      fontPath: layer.fontPath ?? null,
      pointSize: layer.pointSize,
      color: { r: layer.color[0], g: layer.color[1], b: layer.color[2] },
      horizontalAlign: layer.horizontalAlign,
      verticalAlign: layer.verticalAlign,
      padding: layer.padding,
      limitWidth: layer.limitWidth,
      maxWidth: layer.maxWidth,
      limitRows: layer.limitRows,
      maxRows: layer.maxRows,
      useEllipsis: layer.useEllipsis,
      spacing: { x: layer.spacing[0], y: layer.spacing[1] },
      textShadow: layer.textShadow
        ? {
            offset: { x: layer.textShadow.offset[0], y: layer.textShadow.offset[1] },
            color: {
              r: layer.textShadow.color[0],
              g: layer.textShadow.color[1],
              b: layer.textShadow.color[2],
            },
            alpha: layer.textShadow.alpha,
            drawBorder: layer.textShadow.drawBorder,
          }
        : undefined,
      dynamicText: layer.dynamicText
        ? {
            kind: layer.dynamicText.kind,
            refresh: layer.dynamicText.refresh,
            parts: layer.dynamicText.parts.map((part) => (
              part.kind === 'lookup' ? { ...part, values: [...part.values] } : { ...part }
            )),
          }
        : undefined,
    },
    center,
    size,
    scale: { x: layer.transform.scale[0], y: layer.transform.scale[1] },
    rotationDeg: layer.transform.angles[2] * (180 / Math.PI),
    opacity: layer.transform.opacity,
    ...(orderedTextureEffects.length > 0 ? { textureEffects: orderedTextureEffects } : {}),
    visible: layer.transform.visible,
    parallax: layer.transform.parallaxDepth
      ? { x: layer.transform.parallaxDepth[0], y: layer.transform.parallaxDepth[1] }
      : null,
    centerAnimations: centerAnimationsFromLayer(layer),
    blendMode: weColorBlendModeToImported(layer.colorBlendMode),
    compatibility: {
      weObjectIndex: layer.objectIndex,
      weModelPath: 'builtin:text-layer',
      weMaterialPath: layer.fontPath ?? layer.fontReference ?? 'builtin:font-fallback',
      weColorBlendMode: layer.colorBlendMode ?? null,
      ignoredEffects: layer.hasEffects || (layer.usesDynamicText && !layer.dynamicText),
    },
  };
};

const buildCompositionLayer = (
  layer: WeResolvedCompositionLayer,
  diagnostics: ImportedWeDiagnostic[],
): ImportedWeLayer | null => {
  const size = layer.transform.size
    ? makeSize(positiveNumber(layer.transform.size[0]), positiveNumber(layer.transform.size[1]))
    : null;
  if (!size) {
    diagnostics.push({
      level: 'warning',
      code: 'UNKNOWN_SOURCE_SIZE',
      message: 'Composition layer has no positive logical size and cannot be rendered.',
      layerId: layer.id,
      path: layer.builtinModelReference,
    });
    return null;
  }

  const center = centerFromAlignment(
    layer.transform.origin,
    size,
    layer.transform.scale,
    layer.transform.angles[2],
    layer.transform.alignment,
  );

  return {
    id: layer.id,
    name: layer.name,
    zIndex: layer.objectIndex,
    source: {
      kind: 'composition',
      effects: layer.effects.map((effect) => {
        if (effect.kind === 'tint') {
          return {
            kind: effect.kind,
            color: { r: effect.color[0], g: effect.color[1], b: effect.color[2] },
            alpha: effect.alpha,
          };
        }
        if (effect.kind === 'blend') return { ...effect };
        if (effect.kind === 'transform') {
          return {
            kind: effect.kind,
            offset: { x: effect.offset[0], y: effect.offset[1] },
            scale: { x: effect.scale[0], y: effect.scale[1] },
            angle: effect.angle,
          };
        }
        if (effect.kind === 'fisheye') {
          return {
            kind: effect.kind,
            center: { x: effect.center[0], y: effect.center[1] },
            distortion: effect.distortion,
            size: effect.size,
            transparentOutside: effect.transparentOutside,
          };
        }
        return { ...effect };
      }),
    },
    center,
    size,
    scale: { x: layer.transform.scale[0], y: layer.transform.scale[1] },
    rotationDeg: layer.transform.angles[2] * (180 / Math.PI),
    opacity: layer.transform.opacity,
    visible: layer.transform.visible,
    parallax: layer.transform.parallaxDepth
      ? { x: layer.transform.parallaxDepth[0], y: layer.transform.parallaxDepth[1] }
      : null,
    centerAnimations: centerAnimationsFromLayer(layer),
    blendMode: weColorBlendModeToImported(layer.colorBlendMode),
    compatibility: {
      weObjectIndex: layer.objectIndex,
      weModelPath: layer.builtinModelReference,
      weMaterialPath: 'builtin:composition',
      weColorBlendMode: layer.colorBlendMode ?? null,
      ignoredEffects: layer.hasEffects,
    },
  };
};

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const layerBounds = (layer: ImportedWeLayer): Bounds => {
  const halfWidth = Math.abs(layer.size.width * layer.scale.x) / 2;
  const halfHeight = Math.abs(layer.size.height * layer.scale.y) / 2;
  const radians = layer.rotationDeg * (Math.PI / 180);
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const boundHalfWidth = cos * halfWidth + sin * halfHeight;
  const boundHalfHeight = sin * halfWidth + cos * halfHeight;
  return {
    minX: layer.center.x - boundHalfWidth,
    minY: layer.center.y - boundHalfHeight,
    maxX: layer.center.x + boundHalfWidth,
    maxY: layer.center.y + boundHalfHeight,
  };
};

const unionBounds = (layers: ImportedWeLayer[]): Bounds | null => {
  if (!layers.length) return null;
  const first = layerBounds(layers[0]);
  return layers.slice(1).reduce((bounds, layer) => {
    const next = layerBounds(layer);
    return {
      minX: Math.min(bounds.minX, next.minX),
      minY: Math.min(bounds.minY, next.minY),
      maxX: Math.max(bounds.maxX, next.maxX),
      maxY: Math.max(bounds.maxY, next.maxY),
    };
  }, first);
};

const convertScene = (lookup: EntryLookup, scene: WeSceneResourceGraph): ImportedWeScene => {
  const diagnostics: ImportedWeDiagnostic[] = [];
  const buildContext: WeLayerBuildContext = {
    imageLayersById: new Map(scene.imageLayers.map((layer) => [layer.id, layer])),
    puppetModels: new Map(),
  };
  const layers = [
    ...scene.imageLayers.map((layer) => buildLayer(lookup, layer, diagnostics, buildContext)),
    ...scene.solidLayers.map((layer) => buildSolidLayer(layer, diagnostics)),
    ...scene.textLayers.map((layer) => buildTextLayer(layer, diagnostics)),
    ...scene.compositionLayers.map((layer) => buildCompositionLayer(layer, diagnostics)),
  ]
    .filter((layer): layer is ImportedWeLayer => layer !== null)
    .sort((a, b) => a.zIndex - b.zIndex);

  const explicitWidth = positiveNumber(scene.size.width);
  const explicitHeight = positiveNumber(scene.size.height);
  let width = explicitWidth;
  let height = explicitHeight;
  let sizing: ImportedWeScene['canvas']['sizing'] = 'explicit';
  let coordinateOffsetX = 0;
  let coordinateOffsetY = 0;

  if (width === null || height === null || scene.size.auto) {
    const bounds = unionBounds(layers);
    if (bounds && bounds.maxX > bounds.minX && bounds.maxY > bounds.minY) {
      width = bounds.maxX - bounds.minX;
      height = bounds.maxY - bounds.minY;
      coordinateOffsetX = -bounds.minX;
      coordinateOffsetY = -bounds.minY;
      sizing = 'inferred';
      for (const layer of layers) {
        layer.center.x += coordinateOffsetX;
        layer.center.y += coordinateOffsetY;
      }
      diagnostics.push({
        level: 'info',
        code: 'SCENE_SIZE_INFERRED',
        message: `Auto-sized scene canvas inferred from resolved layer bounds: ${width}×${height}.`,
      });
    } else {
      width = explicitWidth ?? 1;
      height = explicitHeight ?? 1;
      sizing = 'fallback';
      diagnostics.push({
        level: 'warning',
        code: 'SCENE_SIZE_FALLBACK',
        message: 'Scene canvas size could not be inferred from resolved layers; a minimal fallback canvas is used.',
      });
    }
  }

  const particleCount = scene.skippedObjects.filter((item) => item.reason === 'particle').length;
  const unresolvedImageCount = scene.skippedObjects.filter((item) => item.reason === 'unresolvedImageChain').length;
  const otherObjectCount = scene.skippedObjects.length - particleCount - unresolvedImageCount;
  const postProcessEffects: ImportedWePostProcessEffect[] = scene.postProcessEffects.map((effect) => ({
    ...effect,
    center: { x: effect.center[0], y: effect.center[1] },
  }));

  return {
    format: 'tablab-we-scene',
    version: 1,
    sourceDescriptorPath: scene.descriptorPath,
    canvas: {
      width: width ?? 1,
      height: height ?? 1,
      sizing,
      coordinateOffsetX,
      coordinateOffsetY,
    },
    cameraParallax: { ...scene.cameraParallax },
    ...(postProcessEffects.length > 0 ? { postProcessEffects } : {}),
    layers,
    diagnostics,
    resourceDiagnostics: scene.diagnostics.map((item) => ({
      code: item.code,
      message: item.message,
      objectIndex: item.objectIndex,
      path: item.path,
    })),
    unsupported: {
      particleCount,
      otherObjectCount,
      unresolvedImageCount,
      effectLayerCount: [
        ...scene.imageLayers,
        ...scene.solidLayers,
        ...scene.textLayers,
        ...scene.compositionLayers,
      ].filter((layer) => layer.hasEffects).length,
    },
  };
};

/** Convert the resolved Wallpaper Engine resource graph into TabLab's own scene model. */
export const convertWallpaperEngineResourceGraph = (
  entries: Map<string, Uint8Array>,
  graph: WeArchiveResourceGraph,
): ImportedWeArchive => {
  const lookup = new EntryLookup(entries);
  return {
    format: 'tablab-we-archive',
    version: 1,
    scenes: graph.scenes.map((scene) => convertScene(lookup, scene)),
  };
};
