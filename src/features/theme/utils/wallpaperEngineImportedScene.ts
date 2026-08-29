/**
 * TabLab-owned intermediate format for Wallpaper Engine scene imports.
 *
 * This is deliberately renderer-agnostic. Wallpaper Engine paths and numeric
 * compatibility hints are preserved, but consumers do not need to understand
 * WE model/material JSON in order to render the base image layers.
 */

export interface ImportedWePoint {
  x: number;
  y: number;
}

export interface ImportedWeSize {
  width: number;
  height: number;
}

export interface ImportedWeColorRgb {
  r: number;
  g: number;
  b: number;
}

export interface ImportedWeCameraParallax {
  enabled: boolean;
  amount: number;
  delay: number;
  mouseInfluence: number;
}

export interface ImportedWeChromaticAberrationEffect {
  kind: 'chromaticAberration';
  center: ImportedWePoint;
  centerFalloff: number;
  strength: number;
  direction: number;
  mode: 0 | 1 | 2 | 3;
  variation: 0 | 1 | 2;
}

export type ImportedWePostProcessEffect = ImportedWeChromaticAberrationEffect;

export interface ImportedWeAnimationKeyframe {
  frame: number;
  value: number;
}

export interface ImportedWePointAnimation {
  fps: number;
  lengthFrames: number;
  mode: 'single' | 'loop' | 'mirror';
  /** Scene-space offsets added to the layer's authored center. */
  x: ImportedWeAnimationKeyframe[];
  y: ImportedWeAnimationKeyframe[];
}


export interface ImportedWePuppetAnimationLayer {
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

export interface ImportedWePuppetMesh {
  /** Local reference-pose coordinates in Wallpaper Engine's Y-up space. */
  positions: number[];
  /** Optional full XYZ reference positions retained for orthographic 3D puppet playback. */
  positions3d?: number[];
  /** Texture coordinates matching the source atlas. */
  uvs: number[];
  /** Uint16 triangle indices expanded to JSON-safe numbers. */
  indices: number[];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

export type ImportedWeCompositionEffect =
  | {
      kind: 'tint';
      color: ImportedWeColorRgb;
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
      offset: ImportedWePoint;
      scale: ImportedWePoint;
      angle: number;
    }
  | {
      kind: 'fisheye';
      center: ImportedWePoint;
      distortion: number;
      size: number;
      transparentOutside: boolean;
    }
  | {
      kind: 'opacity';
      maskPath: string | null;
      alpha: number;
    };


export type ImportedWeDynamicTextPart =
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

export interface ImportedWeDynamicText {
  kind: 'dateTime';
  refresh: 'second' | 'minute' | 'day';
  parts: ImportedWeDynamicTextPart[];
}

export type ImportedWeSource =
  | {
      kind: 'solidColor';
      color: ImportedWeColorRgb;
    }
  | {
      kind: 'text';
      text: string;
      /** Authored WE font reference, retained so install-level fonts can resolve at runtime. */
      fontReference?: string;
      /** Wallpaper-local font resource path, when the archive actually embeds the font. */
      fontPath: string | null;
      pointSize: number;
      color: ImportedWeColorRgb;
      horizontalAlign: 'left' | 'center' | 'right';
      verticalAlign: 'top' | 'center' | 'bottom';
      padding: number;
      /** WE text does not wrap unless its authored width limiter is enabled. */
      limitWidth?: boolean;
      maxWidth?: number | null;
      limitRows?: boolean;
      maxRows?: number | null;
      useEllipsis?: boolean;
      spacing?: ImportedWePoint;
      textShadow?: {
        offset: ImportedWePoint;
        color: ImportedWeColorRgb;
        alpha: number;
        drawBorder: boolean;
      };
      /** Optional safe Date/time semantic compiled from WE SceneScript. */
      dynamicText?: ImportedWeDynamicText;
    }
  | {
      kind: 'image';
      path: string;
      pixelSize: ImportedWeSize | null;
    }
  | {
      kind: 'puppetMesh';
      path: string;
      pixelSize: ImportedWeSize | null;
      mesh: ImportedWePuppetMesh;
      /** Raw MDLV0023 resource retained for runtime skeletal playback. */
      modelPath?: string;
      /** Optional for backward compatibility with scenes persisted before Step 16. */
      animationLayers?: ImportedWePuppetAnimationLayer[];
      /** Renderer path selected from authored animation semantics at import time. */
      animationMode?: '2d' | 'orthographic3d';
    }
  | {
      kind: 'composition';
      effects: ImportedWeCompositionEffect[];
    }
  | {
      kind: 'frameAnimation';
      frames: string[];
      pixelSize: ImportedWeSize | null;
      /** RePKG samples do not consistently retain animation timing metadata. */
      fps: number | null;
    };

export interface ImportedWeOpacityEffect {
  maskPath: string | null;
  alpha: number;
}

export interface ImportedWeWaterWavesEffect {
  maskPath: string | null;
  timeOffsetPath: string | null;
  direction: number;
  speed: number;
  scale: number;
  exponent: number;
  strength: number;
}

export interface ImportedWeScrollEffect {
  speedX: number;
  speedY: number;
  repeat: ImportedWePoint;
}

export interface ImportedWeTransformEffect {
  offset: ImportedWePoint;
  scale: ImportedWePoint;
  angle: number;
  repeat: boolean;
}

export interface ImportedWeSpinEffect {
  center: ImportedWePoint;
  speed: number;
  ratio: number;
  axis: number;
  phase: number;
  size: number;
  feather: number;
  repeat: boolean;
  elliptical: boolean;
  aspectCorrect: boolean;
  softMask: boolean;
}

export interface ImportedWePerspectiveEffect {
  points: [ImportedWePoint, ImportedWePoint, ImportedWePoint, ImportedWePoint];
  repeat: boolean;
}

export interface ImportedWeFoliageSwayEffect {
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

export interface ImportedWeWaterFlowEffect {
  flowMapPath: string | null;
  phasePath: string;
  speed: number;
  strength: number;
  phaseScale: number;
  phaseMode: 'legacy' | 'dual';
  feather: number | null;
}

export interface ImportedWeShakeEffect {
  directionMapPath: string | null;
  speed: number;
  strength: number;
  friction: ImportedWePoint;
  bounds: ImportedWePoint;
  directionMode: 0 | 1 | 2;
}


export interface ImportedWeShineEffect {
  maskPath: string | null;
  noisePath: string | null;
  threshold: number;
  noiseAmount: number;
  noiseScale: number;
  noiseSpeed: number;
  rayColor: ImportedWeColorRgb;
  rayDirection: number;
  raySpeed: number;
  rayIntensity: number;
  rayLength: number;
  edges: 2 | 3 | 4 | 5;
  sampleMode: 0 | 1 | 2 | 3 | 4;
  blurScale: ImportedWePoint;
  kernel: 0 | 1 | 2;
  blendMode: number;
  copyBackground: boolean;
  noiseEnabled: boolean;
}

export interface ImportedWeShimmerEffect {
  brightness: number;
  color: ImportedWeColorRgb;
  delay: number;
  direction: number;
  granularity: number;
  offset: number;
  speed: number;
}

export type ImportedWeGodRaysCaster =
  | { mode: 'radial'; center: ImportedWePoint }
  | { mode: 'directional'; direction: number };

export interface ImportedWeGodRaysEffect {
  maskPath: string | null;
  threshold: number;
  caster: ImportedWeGodRaysCaster;
  rayLength: number;
  rayIntensity: number;
  colorStart: ImportedWeColorRgb;
  colorEnd: ImportedWeColorRgb;
  sampleMode: 0 | 1 | 2;
  blurScale: ImportedWePoint;
  kernel: 0 | 1 | 2;
  blendMode: number;
}

export interface ImportedWeBlurPreciseEffect {
  maskPath: string | null;
  scale: ImportedWePoint;
  horizontalKernel: 0 | 1 | 2;
  verticalKernel: 0 | 1 | 2;
  blurAlpha: boolean;
}

export interface ImportedWeWaterRippleEffect {
  maskPath: string | null;
  normalPath: string;
  animationSpeed: number;
  scale: number;
  scrollSpeed: number;
  direction: number;
  ratio: number;
  strength: number;
}

/**
 * Ordered surface/image-space effects. New passes should extend this renderer-neutral
 * union instead of adding sample-specific component branches.
 */
export type ImportedWeTextureEffect =
  | ({ kind: 'opacity' } & ImportedWeOpacityEffect)
  | ({ kind: 'scroll' } & ImportedWeScrollEffect)
  | ({ kind: 'transform' } & ImportedWeTransformEffect)
  | ({ kind: 'spin' } & ImportedWeSpinEffect)
  | ({ kind: 'perspective' } & ImportedWePerspectiveEffect)
  | ({ kind: 'foliageSway' } & ImportedWeFoliageSwayEffect)
  | ({ kind: 'waterFlow' } & ImportedWeWaterFlowEffect)
  | ({ kind: 'shake' } & ImportedWeShakeEffect)
  | ({ kind: 'blurPrecise' } & ImportedWeBlurPreciseEffect)
  | ({ kind: 'shimmer' } & ImportedWeShimmerEffect)
  | ({ kind: 'shine' } & ImportedWeShineEffect)
  | ({ kind: 'godRays' } & ImportedWeGodRaysEffect)
  | ({ kind: 'waterRipple' } & ImportedWeWaterRippleEffect)
  | ({ kind: 'waterWaves' } & ImportedWeWaterWavesEffect);

export interface ImportedWeAffine2d {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}

/**
 * Binding for a scene layer authored against a named MDAT Puppet attachment.
 * Optional on v1 so older persisted scenes remain valid.
 */
export interface ImportedWePuppetAttachmentBinding {
  name: string;
  parentLayerId: string;
  parentModelPath: string;
  parentAnimationLayers: ImportedWePuppetAnimationLayer[];
  parentAnimationMode?: '2d' | 'orthographic3d';
  parentOrigin: ImportedWePoint;
  parentScale: ImportedWePoint;
  parentRotationDeg: number;
  boneIndex: number;
  /** Attachment-local affine transform in WE model/Y-up coordinates. */
  localMatrix: ImportedWeAffine2d;
  /** Reference-pose attachment transform converted to browser/Y-down coordinates. */
  bindTransform: ImportedWeAffine2d;
  /** Child visual center in attachment-local browser coordinates. */
  localCenter: ImportedWePoint;
  localScale: ImportedWePoint;
  localRotationDeg: number;
}

export interface ImportedWeLayer {
  id: string;
  name?: string;
  /** Preserves Wallpaper Engine object array order. */
  zIndex: number;
  source: ImportedWeSource;
  /** Center point in TabLab scene-canvas coordinates. */
  center: ImportedWePoint;
  /** Unscaled logical layer size. */
  size: ImportedWeSize;
  scale: ImportedWePoint;
  /** Wallpaper Engine Z angle converted from radians to degrees. */
  rotationDeg: number;
  opacity: number;
  /** Optional so scenes persisted before opacity-effect support remain valid. */
  opacityEffects?: ImportedWeOpacityEffect[];
  /** Optional so scenes persisted before water-waves support remain valid. */
  waterWavesEffects?: ImportedWeWaterWavesEffect[];
  /**
   * Ordered surface-effect pass chain. Optional keeps persisted v1 scenes from
   * earlier builds valid; the runtime reconstructs legacy side-list metadata.
   */
  textureEffects?: ImportedWeTextureEffect[];
  visible: boolean;
  parallax: ImportedWePoint | null;
  /** Named Puppet-bone attachment relation, when authored by the scene. */
  puppetAttachment?: ImportedWePuppetAttachmentBinding;
  /** Optional in v1 so previously persisted scenes remain valid. */
  centerAnimations?: ImportedWePointAnimation[];
  blendMode: 'normal' | 'screen' | null;
  compatibility: {
    weObjectIndex: number;
    weModelPath: string;
    weMaterialPath: string;
    weColorBlendMode: number | null;
    ignoredEffects: boolean;
  };
}

export type ImportedWeDiagnosticCode =
  | 'MULTIPLE_TEXTURES_PRIMARY_ONLY'
  | 'UNKNOWN_SOURCE_SIZE'
  | 'FRAME_SIZE_MISMATCH'
  | 'SCENE_SIZE_INFERRED'
  | 'SCENE_SIZE_FALLBACK'
  | 'UNSUPPORTED_PUPPET_MODEL'
  | 'UNSUPPORTED_PUPPET_ANIMATION';

export interface ImportedWeDiagnostic {
  level: 'warning' | 'info';
  code: ImportedWeDiagnosticCode;
  message: string;
  layerId?: string;
  path?: string;
}

export interface ImportedWeScene {
  format: 'tablab-we-scene';
  version: 1;
  sourceDescriptorPath: string;
  canvas: {
    width: number;
    height: number;
    sizing: 'explicit' | 'inferred' | 'fallback';
    /** Offset applied to WE X coordinates when an auto-sized scene is normalized. */
    coordinateOffsetX: number;
    /** Offset applied to WE Y coordinates when an auto-sized scene is normalized. */
    coordinateOffsetY: number;
  };
  /** Optional in v1 so scenes persisted before parallax support remain loadable. */
  cameraParallax?: ImportedWeCameraParallax;
  /** Optional scene-wide post-process passes retained from supported WE fullscreen layers. */
  postProcessEffects?: ImportedWePostProcessEffect[];
  layers: ImportedWeLayer[];
  diagnostics: ImportedWeDiagnostic[];
  /** Warnings produced while following WE scene -> model -> material -> texture references. */
  resourceDiagnostics: Array<{
    code: string;
    message: string;
    objectIndex?: number;
    path?: string;
  }>;
  unsupported: {
    particleCount: number;
    otherObjectCount: number;
    unresolvedImageCount: number;
    effectLayerCount: number;
  };
}

export interface ImportedWeArchive {
  format: 'tablab-we-archive';
  version: 1;
  scenes: ImportedWeScene[];
}
