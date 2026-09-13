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

export interface WeResolvedIrisEffect {
  /** Optional `MASK` texture: displacement is scaled by its red channel. */
  maskPath: string | null;
  scale: WeVec2;
  speed: number;
  rough: number;
  noiseAmount: number;
  phase: number;
  /**
   * `BACKGROUND` combo: mixes the displaced result toward the authored eye
   * colour. Recorded so the capability report stays honest, but only the plain
   * displacement is rendered today.
   */
  background: boolean;
}

export interface WeResolvedCloudMotionEffect {
  maskPath: string | null;
  /** Null selects WE's built-in perlin noise (`util/perlin_256`). */
  noisePath: string | null;
  amount: number;
  direction: number;
  speed: number;
  scale: number;
  scaleX: number;
}

export interface WeResolvedSkewEffect {
  top: number;
  bottom: number;
  left: number;
  right: number;
  repeat: boolean;
}

export interface WeResolvedSwingEffect {
  maskPath: string | null;
  /** Null selects WE's built-in noise. */
  noisePath: string | null;
  point0: WeVec2;
  point1: WeVec2;
  size: number;
  center: number;
  feather: number;
  amount: number;
  speed: number;
  phase: number;
  noiseSpeed: number;
  noiseAmount: number;
  doubleSided: boolean;
  noiseEnabled: boolean;
}

export interface WeResolvedFilmGrainEffect {
  maskPath: string | null;
  /** Null selects WE's built-in noise. */
  noisePath: string | null;
  strength: number;
  power: number;
  scale: number;
  greyscale: boolean;
  blendMode: number;
}

export interface WeResolvedPulseEffect {
  maskPath: string | null;
  speed: number;
  phase: number;
  amount: number;
  bounds: WeVec2;
  noiseSpeed: number;
  noiseAmount: number;
  power: number;
  tintLow: WeColorRgb;
  tintHigh: WeColorRgb;
  blendMode: number;
  pulseAlpha: boolean;
  pulseColor: boolean;
}

export interface WeResolvedCloudsEffect {
  /** Null selects WE's built-in cloud noise (`util/clouds_256`). */
  cloudPath: string | null;
  maskPath: string | null;
  alpha: number;
  threshold: number;
  feather: number;
  colorStart: WeColorRgb;
  colorEnd: WeColorRgb;
  /** Four scroll speeds: layer A (xy) and layer B (zw). */
  speed: number[];
  /** Four tile scales: layer A (xy) and layer B (zw). */
  scale: number[];
  shading: boolean;
  blendMode: number;
  writeAlpha: boolean;
}

export interface WeResolvedBlurRadialEffect {
  maskPath: string | null;
  scale: number;
  center: WeVec2;
  kernel: 0 | 1 | 2;
  /** `BLURALPHA=0`: keep the source alpha instead of the blurred alpha. */
  keepAlpha: boolean;
}

export interface WeResolvedLightShaftsEffect {
  /** Null selects WE's built-in noise. */
  noisePath: string | null;
  /**
   * Column vectors of `inverse(squareToQuad(point0..point3))`, flattened as
   * [c0x,c0y,c0z, c1x,c1y,c1z, c2x,c2y,c2z]. WE applies this in the vertex
   * stage; precomputing it on the CPU keeps the shader to a dot product.
   */
  transform: number[];
  speed: number;
  scale: WeVec2;
  smoothness: number;
  feather: WeVec2;
  exponent: number;
  intensity: number;
  colorStart: WeColorRgb;
  colorEnd: WeColorRgb;
  blendMode: number;
}

export interface WeResolvedGlitterEffect {
  maskPath: string | null;
  speed: number;
  density: number;
  scale: number;
  alpha: number;
  color: WeColorRgb;
  blendMode: number;
}

export interface WeResolvedWaterCausticsEffect {
  maskPath: string | null;
  /** Null selects WE's built-in `pattern/voronoi_local` (cell borders). */
  causticPath: string | null;
  /** Null selects WE's built-in `util/uniform_256`. */
  uniformPath: string | null;
  /** Null selects WE's built-in `util/perlin_256`. */
  perlinPath: string | null;
  /** Null selects WE's built-in `pattern/voronoi` (cell interiors). */
  glowPath: string | null;
  brightness: number;
  glow: number;
  granularity: number;
  speed: number;
  timeOffset: number;
  distortion: number;
  chromatic: number;
  blur: number;
  colorStart: WeColorRgb;
  colorEnd: WeColorRgb;
  mode: 0 | 1;
  blendMode: number;
}

export interface WeResolvedDepthParallaxEffect {
  /** Height/depth map; null renders with a flat depth of zero. */
  depthPath: string | null;
  maskPath: string | null;
  scale: WeVec2;
  sens: number;
  center: number;
  /** 0 = single-tap offset, 1 = 24-layer march, 2 = 64-layer march. */
  quality: 0 | 1 | 2;
}

export interface WeResolvedBlurEffect {
  maskPath: string | null;
  /** Gaussian kernel size: 0 = 13-tap, 1 = 7-tap, 2 = 3-tap. */
  kernel: 0 | 1 | 2;
  scale: WeVec2;
  /** 0 = effect only, 1 = blended, 2 = under, 3 = over. */
  composite: 0 | 1 | 2 | 3;
  blendMode: number;
  compositeMono: boolean;
  compositeAlpha: number;
  /** In blurred-texel units, matching WE's ApplyCompositeOffset. */
  compositeOffset: WeVec2;
  compositeColor: WeColorRgb;
  keepAlpha: boolean;
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
  | ({ kind: 'iris' } & WeResolvedIrisEffect)
  | ({ kind: 'cloudMotion' } & WeResolvedCloudMotionEffect)
  | ({ kind: 'skew' } & WeResolvedSkewEffect)
  | ({ kind: 'swing' } & WeResolvedSwingEffect)
  | ({ kind: 'filmGrain' } & WeResolvedFilmGrainEffect)
  | ({ kind: 'pulse' } & WeResolvedPulseEffect)
  | ({ kind: 'clouds' } & WeResolvedCloudsEffect)
  | ({ kind: 'blurRadial' } & WeResolvedBlurRadialEffect)
  | ({ kind: 'lightShafts' } & WeResolvedLightShaftsEffect)
  | ({ kind: 'glitter' } & WeResolvedGlitterEffect)
  | ({ kind: 'waterCaustics' } & WeResolvedWaterCausticsEffect)
  | ({ kind: 'depthParallax' } & WeResolvedDepthParallaxEffect)
  | ({ kind: 'blur' } & WeResolvedBlurEffect)
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
  /**
   * Scene camera eye from `scene.json`'s `camera` object. Wallpaper Engine uses
   * its X component as a horizontal view shift for every layer except full-
   * viewport backdrops; the Y component is deliberately not applied.
   */
  cameraEye: WeVec3 | null;
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
