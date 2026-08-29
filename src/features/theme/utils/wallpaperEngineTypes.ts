export type WeVec2 = readonly [number, number];
export type WeVec3 = readonly [number, number, number];
export type WeColorRgb = readonly [number, number, number];
export type WeLayerAlignment =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'topleft'
  | 'topright'
  | 'bottomleft'
  | 'bottomright';

export interface WeSceneSize {
  width: number | null;
  height: number | null;
  auto: boolean;
}

export interface WeCameraParallaxSettings {
  enabled: boolean;
  amount: number;
  delay: number;
  mouseInfluence: number;
}

export interface WeResolvedChromaticAberrationEffect {
  kind: 'chromaticAberration';
  center: WeVec2;
  centerFalloff: number;
  strength: number;
  direction: number;
  mode: 0 | 1 | 2 | 3;
  variation: 0 | 1 | 2;
}

export type WeResolvedPostProcessEffect = WeResolvedChromaticAberrationEffect;

export interface WeLayerTransform {
  origin: WeVec3;
  /** Pivot/alignment authored by Wallpaper Engine for the layer rectangle. */
  alignment: WeLayerAlignment;
  scale: WeVec3;
  angles: WeVec3;
  size: WeVec2 | null;
  parallaxDepth: WeVec2 | null;
  opacity: number;
  visible: boolean;
}

export interface WeAnimationKeyframe {
  frame: number;
  value: number;
}

export interface WePointAnimation {
  fps: number;
  lengthFrames: number;
  mode: 'single' | 'loop' | 'mirror';
  x: WeAnimationKeyframe[];
  y: WeAnimationKeyframe[];
}

export interface WeResolvedOpacityEffect {
  /** Resolved grayscale/opacity mask asset. Null means a global alpha-only pass. */
  maskPath: string | null;
  alpha: number;
}

export interface WeResolvedWaterWavesEffect {
  /** Optional WE opacity mask controlling where the displacement is applied. */
  maskPath: string | null;
  /** Optional WE time-offset mask used to phase-shift the wave. */
  timeOffsetPath: string | null;
  direction: number;
  speed: number;
  scale: number;
  exponent: number;
  strength: number;
}

export type WeResolvedEffectBaseValue = number | string | boolean | number[] | null;

/**
 * Normalized WE effect parameter. Dynamic metadata is recorded without
 * executing arbitrary SceneScript at import time.
 */
export interface WeResolvedEffectParameter {
  value: WeResolvedEffectBaseValue;
  hasAnimation: boolean;
  hasScript: boolean;
}

export interface WeResolvedEffectPass {
  index: number;
  /** Material declared by the effect descriptor for the corresponding pass. */
  materialReference: string | null;
  combos: Record<string, number | string | boolean>;
  constants: Record<string, WeResolvedEffectParameter>;
  /** Texture slots are positional in WE; null preserves an intentionally empty slot. */
  textures: Array<string | null>;
}

/**
 * Renderer-neutral effect chain entry. `key` is a normalized semantic identity
 * and never depends on a workshop id or a sample-specific resource path.
 */
export interface WeResolvedEffect {
  key: string;
  /** Authored replacement/UI semantic before normalization, when available. */
  sourceKey: string | null;
  reference: string;
  descriptorPath: string | null;
  descriptorVersion: number | null;
  passes: WeResolvedEffectPass[];
}

export interface WeResolvedBlurPreciseEffect {
  maskPath: string | null;
  scale: WeVec2;
  horizontalKernel: 0 | 1 | 2;
  verticalKernel: 0 | 1 | 2;
  blurAlpha: boolean;
}

export interface WeResolvedFoliageSwayEffect {
  maskPath: string | null;
  noisePath: string | null;
  speed: number;
  strength: number;
  phase: number;
  power: number;
  noiseScale: number;
  ratio: number;
  direction: number;
}

export interface WeResolvedShakeEffect {
  directionMapPath: string | null;
  speed: number;
  strength: number;
  friction: WeVec2;
  bounds: WeVec2;
  directionMode: 0 | 1 | 2;
}

export interface WeResolvedShineEffect {
  maskPath: string | null;
  noisePath: string | null;
  threshold: number;
  noiseAmount: number;
  noiseScale: number;
  noiseSpeed: number;
  rayColor: WeColorRgb;
  rayDirection: number;
  raySpeed: number;
  rayIntensity: number;
  rayLength: number;
  edges: 2 | 3 | 4 | 5;
  sampleMode: 0 | 1 | 2 | 3 | 4;
  blurScale: WeVec2;
  kernel: 0 | 1 | 2;
  blendMode: number;
  copyBackground: boolean;
  noiseEnabled: boolean;
}

export interface WeResolvedShimmerEffect {
  brightness: number;
  color: WeColorRgb;
  delay: number;
  direction: number;
  granularity: number;
  offset: number;
  speed: number;
}

export type WeResolvedGodRaysCaster =
  | { mode: 'radial'; center: WeVec2 }
  | { mode: 'directional'; direction: number };

export interface WeResolvedGodRaysEffect {
  maskPath: string | null;
  threshold: number;
  caster: WeResolvedGodRaysCaster;
  rayLength: number;
  rayIntensity: number;
  colorStart: WeColorRgb;
  colorEnd: WeColorRgb;
  sampleMode: 0 | 1 | 2;
  blurScale: WeVec2;
  kernel: 0 | 1 | 2;
  blendMode: number;
}

export interface WeResolvedWaterFlowEffect {
  flowMapPath: string | null;
  phasePath: string;
  speed: number;
  strength: number;
  phaseScale: number;
  phaseMode: 'legacy' | 'dual';
  feather: number | null;
}

export type WeResolvedTextureEffect =
  | ({ kind: 'opacity' } & WeResolvedOpacityEffect)
  | ({ kind: 'scroll'; speedX: number; speedY: number; repeat: WeVec2 })
  | ({ kind: 'transform'; offset: WeVec2; scale: WeVec2; angle: number; repeat: boolean })
  | ({ kind: 'spin'; center: WeVec2; speed: number; ratio: number; axis: number; phase: number; size: number; feather: number; repeat: boolean; elliptical: boolean; aspectCorrect: boolean; softMask: boolean })
  | ({ kind: 'perspective'; points: [WeVec2, WeVec2, WeVec2, WeVec2]; repeat: boolean })
  | ({ kind: 'foliageSway' } & WeResolvedFoliageSwayEffect)
  | ({ kind: 'waterFlow' } & WeResolvedWaterFlowEffect)
  | ({ kind: 'shake' } & WeResolvedShakeEffect)
  | ({ kind: 'blurPrecise' } & WeResolvedBlurPreciseEffect)
  | ({ kind: 'shimmer' } & WeResolvedShimmerEffect)
  | ({ kind: 'shine' } & WeResolvedShineEffect)
  | ({ kind: 'godRays' } & WeResolvedGodRaysEffect)
  | ({ kind: 'waterRipple'; maskPath: string | null; normalPath: string; animationSpeed: number; scale: number; scrollSpeed: number; direction: number; ratio: number; strength: number })
  | ({ kind: 'waterWaves' } & WeResolvedWaterWavesEffect);

export type WeResolvedCompositionEffect =
  | {
      kind: 'tint';
      color: WeColorRgb;
      alpha: number;
    }
  | {
      kind: 'blend';
      texturePath: string;
      maskPath: string | null;
      multiply: number;
    }
  | {
      kind: 'transform';
      offset: WeVec2;
      scale: WeVec2;
      angle: number;
    }
  | {
      kind: 'fisheye';
      center: WeVec2;
      distortion: number;
      size: number;
      transparentOutside: boolean;
    }
  | {
      kind: 'opacity';
      maskPath: string | null;
      alpha: number;
    };

export interface WeResolvedTexture {
  /** Logical texture reference stored by Wallpaper Engine material JSON. */
  reference: string;
  /** Static image or RePKG-extracted numbered frame sequence. */
  kind: 'image' | 'frameSequence';
  /** ZIP paths, always ordered; sequences use numeric frame order. */
  paths: string[];
  /** Whether the material pass explicitly marks this texture as a spritesheet. */
  spritesheet: boolean;
}

export interface WeResolvedSolidLayer {
  objectIndex: number;
  id: string;
  name?: string;
  builtinModelReference: string;
  color: WeColorRgb;
  transform: WeLayerTransform;
  centerAnimations: WePointAnimation[];
  colorBlendMode?: number;
  hasEffects: boolean;
  textureEffects: WeResolvedTextureEffect[];
  effectChain: WeResolvedEffect[];
}


export type WeResolvedDynamicTextPart =
  | { kind: 'literal'; value: string }
  | { kind: 'hour'; use24Hour: boolean; twoDigit: boolean }
  | { kind: 'minute'; twoDigit: boolean }
  | { kind: 'second'; twoDigit: boolean }
  | { kind: 'dayPeriod'; am: string; pm: string }
  | {
      kind: 'number';
      field: 'dayOfMonth' | 'month' | 'year';
      twoDigit: boolean;
      digitSeparator: string;
    }
  | {
      kind: 'lookup';
      field: 'dayOfMonth' | 'month' | 'weekday';
      values: string[];
    };

export interface WeResolvedDynamicText {
  kind: 'dateTime';
  refresh: 'second' | 'minute' | 'day';
  parts: WeResolvedDynamicTextPart[];
}

export interface WeResolvedTextLayer {
  objectIndex: number;
  id: string;
  name?: string;
  text: string;
  fontReference?: string;
  fontPath?: string;
  pointSize: number;
  color: WeColorRgb;
  horizontalAlign: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'center' | 'bottom';
  padding: number;
  /** WE only wraps/clamps text when the authored width limiter is enabled. */
  limitWidth: boolean;
  maxWidth: number | null;
  limitRows: boolean;
  maxRows: number | null;
  useEllipsis: boolean;
  spacing: WeVec2;
  textShadow?: {
    offset: WeVec2;
    color: WeColorRgb;
    alpha: number;
    drawBorder: boolean;
  };
  transform: WeLayerTransform;
  centerAnimations: WePointAnimation[];
  colorBlendMode?: number;
  hasEffects: boolean;
  usesDynamicText: boolean;
  /** Safe semantic subset recognized from Date-driven SceneScript. */
  dynamicText?: WeResolvedDynamicText;
  textureEffects: WeResolvedTextureEffect[];
  effectChain: WeResolvedEffect[];
}

export interface WeResolvedCompositionLayer {
  objectIndex: number;
  id: string;
  name?: string;
  builtinModelReference: string;
  effects: WeResolvedCompositionEffect[];
  transform: WeLayerTransform;
  centerAnimations: WePointAnimation[];
  colorBlendMode?: number;
  hasEffects: boolean;
  textureEffects: WeResolvedTextureEffect[];
  effectChain: WeResolvedEffect[];
}

export interface WeResolvedPuppetAnimationLayer {
  id: string;
  name?: string;
  animationId: number;
  additive: boolean;
  blend: number;
  blendIn: boolean;
  blendOut: boolean;
  blendTime: number;
  rate: number;
  visible: boolean;
}

export interface WeResolvedImageLayer {
  objectIndex: number;
  id: string;
  name?: string;
  /** Raw scene parent id retained for Puppet attachment resolution. */
  parentId?: string;
  /** Named Puppet attachment slot authored on this object, if any. */
  attachmentName?: string;
  /** Object-local transform before ordinary parent flattening. */
  localTransform: WeLayerTransform;
  modelPath: string;
  materialPath: string;
  textures: WeResolvedTexture[];
  /** Optional Wallpaper Engine puppet model containing static reference-pose mesh data. */
  puppetPath?: string;
  puppetAnimationLayers: WeResolvedPuppetAnimationLayer[];
  opacityEffects: WeResolvedOpacityEffect[];
  waterWavesEffects: WeResolvedWaterWavesEffect[];
  transform: WeLayerTransform;
  centerAnimations: WePointAnimation[];
  colorBlendMode?: number;
  hasEffects: boolean;
  textureEffects: WeResolvedTextureEffect[];
  effectChain: WeResolvedEffect[];
}

export interface WeSkippedObject {
  objectIndex: number;
  id: string;
  name?: string;
  reason: 'particle' | 'textOrScript' | 'unsupportedObject' | 'unresolvedImageChain';
  reference?: string;
}

export interface WeSceneDiagnostic {
  level: 'warning';
  code:
    | 'MISSING_MODEL'
    | 'MISSING_MATERIAL'
    | 'NO_MATERIAL_TEXTURES'
    | 'MISSING_TEXTURE_ASSET'
    | 'UNSUPPORTED_IMAGE_CHAIN'
    | 'UNSUPPORTED_BUILTIN_LAYER'
    | 'MISSING_FONT_ASSET'
    | 'TEXT_SCRIPT_BASE_VALUE_ONLY'
    | 'MISSING_PUPPET_MODEL';
  message: string;
  objectIndex?: number;
  path?: string;
}

export interface WeSceneResourceGraph {
  /** Path of the scene-like JSON found by structure, not by a fixed filename. */
  descriptorPath: string;
  basePath: string;
  size: WeSceneSize;
  cameraParallax: WeCameraParallaxSettings;
  postProcessEffects: WeResolvedPostProcessEffect[];
  imageLayers: WeResolvedImageLayer[];
  solidLayers: WeResolvedSolidLayer[];
  textLayers: WeResolvedTextLayer[];
  compositionLayers: WeResolvedCompositionLayer[];
  skippedObjects: WeSkippedObject[];
  diagnostics: WeSceneDiagnostic[];
}

export interface WeArchiveResourceGraph {
  scenes: WeSceneResourceGraph[];
}
