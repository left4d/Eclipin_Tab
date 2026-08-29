import type {
  ImportedWeCameraParallax,
  ImportedWeDiagnostic,
  ImportedWeLayer,
  ImportedWePoint,
  ImportedWePostProcessEffect,
  ImportedWeScene,
  ImportedWeSize,
  ImportedWeSource,
} from './wallpaperEngineImportedScene';

type UnknownRecord = Record<string, unknown>;

const DIAGNOSTIC_CODES = new Set<ImportedWeDiagnostic['code']>([
  'MULTIPLE_TEXTURES_PRIMARY_ONLY',
  'UNKNOWN_SOURCE_SIZE',
  'FRAME_SIZE_MISMATCH',
  'SCENE_SIZE_INFERRED',
  'SCENE_SIZE_FALLBACK',
  'UNSUPPORTED_PUPPET_MODEL',
  'UNSUPPORTED_PUPPET_ANIMATION',
]);

const isRecord = (value: unknown): value is UnknownRecord => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const isFinitePositive = (value: unknown): value is number => (
  isFiniteNumber(value) && value > 0
);

const isNonNegativeInteger = (value: unknown): value is number => (
  Number.isSafeInteger(value) && (value as number) >= 0
);

const isString = (value: unknown): value is string => typeof value === 'string';
const isNonEmptyString = (value: unknown): value is string => isString(value) && value.length > 0;
const isOptionalString = (value: unknown): value is string | undefined => value === undefined || isString(value);

const isFiniteNumberArray = (value: unknown): value is number[] => (
  Array.isArray(value) && value.every(isFiniteNumber)
);

const isPuppetAnimationLayer = (value: unknown): boolean => (
  isRecord(value)
  && isNonEmptyString(value.id)
  && isOptionalString(value.name)
  && isNonNegativeInteger(value.animationId)
  && typeof value.additive === 'boolean'
  && isFiniteNumber(value.blend)
  && typeof value.blendIn === 'boolean'
  && typeof value.blendOut === 'boolean'
  && isFiniteNumber(value.blendTime)
  && value.blendTime >= 0
  && isFiniteNumber(value.rate)
  && typeof value.visible === 'boolean'
);

const isPuppetMesh = (value: unknown): boolean => {
  if (!isRecord(value)
    || !isFiniteNumberArray(value.positions)
    || (value.positions3d !== undefined && !isFiniteNumberArray(value.positions3d))
    || !isFiniteNumberArray(value.uvs)
    || !Array.isArray(value.indices)
    || !value.indices.every(isNonNegativeInteger)
    || !isRecord(value.bounds)
    || !isFiniteNumber(value.bounds.minX)
    || !isFiniteNumber(value.bounds.minY)
    || !isFiniteNumber(value.bounds.maxX)
    || !isFiniteNumber(value.bounds.maxY)
  ) return false;
  const vertexCount = value.positions.length / 2;
  return value.positions.length >= 6
    && value.positions.length % 2 === 0
    && (value.positions3d === undefined || value.positions3d.length === vertexCount * 3)
    && value.uvs.length === value.positions.length
    && value.indices.length >= 3
    && value.indices.length % 3 === 0
    && value.indices.every((index) => index < vertexCount)
    && value.bounds.maxX > value.bounds.minX
    && value.bounds.maxY > value.bounds.minY;
};

const isPoint = (value: unknown): value is ImportedWePoint => (
  isRecord(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y)
);

const isSize = (value: unknown): value is ImportedWeSize => (
  isRecord(value) && isFinitePositive(value.width) && isFinitePositive(value.height)
);

const isAffine2d = (value: unknown): boolean => (
  isRecord(value)
  && isFiniteNumber(value.a)
  && isFiniteNumber(value.b)
  && isFiniteNumber(value.c)
  && isFiniteNumber(value.d)
  && isFiniteNumber(value.tx)
  && isFiniteNumber(value.ty)
);

const isPuppetAttachmentBinding = (value: unknown): boolean => (
  isRecord(value)
  && isNonEmptyString(value.name)
  && isNonEmptyString(value.parentLayerId)
  && isNonEmptyString(value.parentModelPath)
  && Array.isArray(value.parentAnimationLayers)
  && value.parentAnimationLayers.every(isPuppetAnimationLayer)
  && (value.parentAnimationMode === undefined || value.parentAnimationMode === '2d' || value.parentAnimationMode === 'orthographic3d')
  && isPoint(value.parentOrigin)
  && isPoint(value.parentScale)
  && isFiniteNumber(value.parentRotationDeg)
  && isNonNegativeInteger(value.boneIndex)
  && isAffine2d(value.localMatrix)
  && isAffine2d(value.bindTransform)
  && isPoint(value.localCenter)
  && isPoint(value.localScale)
  && isFiniteNumber(value.localRotationDeg)
);

const isNullableSize = (value: unknown): value is ImportedWeSize | null => (
  value === null || isSize(value)
);

const isColorRgb = (value: unknown): boolean => (
  isRecord(value)
  && isFiniteNumber(value.r) && value.r >= 0 && value.r <= 1
  && isFiniteNumber(value.g) && value.g >= 0 && value.g <= 1
  && isFiniteNumber(value.b) && value.b >= 0 && value.b <= 1
);


const isDynamicTextPart = (value: unknown): boolean => {
  if (!isRecord(value) || !isString(value.kind)) return false;
  if (value.kind === 'literal') return isString(value.value);
  if (value.kind === 'hour') {
    return typeof value.use24Hour === 'boolean' && typeof value.twoDigit === 'boolean';
  }
  if (value.kind === 'minute' || value.kind === 'second') {
    return typeof value.twoDigit === 'boolean';
  }
  if (value.kind === 'dayPeriod') return isString(value.am) && isString(value.pm);
  if (value.kind === 'number') {
    return (value.field === 'dayOfMonth' || value.field === 'month' || value.field === 'year')
      && typeof value.twoDigit === 'boolean'
      && isString(value.digitSeparator);
  }
  if (value.kind === 'lookup') {
    if (!Array.isArray(value.values) || !value.values.every(isString)) return false;
    if (value.field === 'month') return value.values.length >= 12;
    if (value.field === 'weekday') return value.values.length >= 7;
    if (value.field === 'dayOfMonth') return value.values.length >= 32;
    return false;
  }
  return false;
};

const isDynamicText = (value: unknown): boolean => (
  isRecord(value)
  && value.kind === 'dateTime'
  && (value.refresh === 'second' || value.refresh === 'minute' || value.refresh === 'day')
  && Array.isArray(value.parts)
  && value.parts.length > 0
  && value.parts.every(isDynamicTextPart)
);

const isTextShadow = (value: unknown): boolean => (
  isRecord(value)
  && isPoint(value.offset)
  && isColorRgb(value.color)
  && isFiniteNumber(value.alpha)
  && value.alpha >= 0
  && value.alpha <= 1
  && typeof value.drawBorder === 'boolean'
);

const isCompositionEffect = (value: unknown): boolean => {
  if (!isRecord(value) || !isString(value.kind)) return false;
  if (value.kind === 'tint') {
    return isColorRgb(value.color)
      && isFiniteNumber(value.alpha) && value.alpha >= 0 && value.alpha <= 1;
  }
  if (value.kind === 'blend') {
    return isNonEmptyString(value.texturePath)
      && (value.maskPath === null || isNonEmptyString(value.maskPath))
      && isFiniteNumber(value.multiply) && value.multiply >= 0;
  }
  if (value.kind === 'transform') {
    return isPoint(value.offset) && isPoint(value.scale) && isFiniteNumber(value.angle);
  }
  if (value.kind === 'fisheye') {
    return isPoint(value.center)
      && isFiniteNumber(value.distortion) && value.distortion >= 0
      && isFinitePositive(value.size)
      && typeof value.transparentOutside === 'boolean';
  }
  if (value.kind === 'opacity') {
    return (value.maskPath === null || isNonEmptyString(value.maskPath))
      && isFiniteNumber(value.alpha) && value.alpha >= 0 && value.alpha <= 1;
  }
  return false;
};

const isSource = (value: unknown): value is ImportedWeSource => {
  if (!isRecord(value) || !isString(value.kind)) return false;

  if (value.kind === 'solidColor') {
    return isColorRgb(value.color);
  }

  if (value.kind === 'text') {
    return isString(value.text)
      && (value.fontReference === undefined || isNonEmptyString(value.fontReference))
      && (value.fontPath === null || isNonEmptyString(value.fontPath))
      && isFinitePositive(value.pointSize)
      && isColorRgb(value.color)
      && (value.horizontalAlign === 'left' || value.horizontalAlign === 'center' || value.horizontalAlign === 'right')
      && (value.verticalAlign === 'top' || value.verticalAlign === 'center' || value.verticalAlign === 'bottom')
      && isFiniteNumber(value.padding)
      && value.padding >= 0
      && (value.limitWidth === undefined || typeof value.limitWidth === 'boolean')
      && (value.maxWidth === undefined || value.maxWidth === null || isFiniteNumber(value.maxWidth))
      && (value.limitRows === undefined || typeof value.limitRows === 'boolean')
      && (value.maxRows === undefined || value.maxRows === null || isFiniteNumber(value.maxRows))
      && (value.useEllipsis === undefined || typeof value.useEllipsis === 'boolean')
      && (value.spacing === undefined || isPoint(value.spacing))
      && (value.textShadow === undefined || isTextShadow(value.textShadow))
      && (value.dynamicText === undefined || isDynamicText(value.dynamicText));
  }

  if (value.kind === 'composition') {
    return Array.isArray(value.effects)
      && value.effects.length > 0
      && value.effects.every(isCompositionEffect);
  }

  if (!isNullableSize(value.pixelSize)) return false;

  if (value.kind === 'image') {
    return isNonEmptyString(value.path);
  }

  if (value.kind === 'puppetMesh') {
    return isNonEmptyString(value.path)
      && isPuppetMesh(value.mesh)
      && (value.modelPath === undefined || isNonEmptyString(value.modelPath))
      && (value.animationLayers === undefined
        || (Array.isArray(value.animationLayers) && value.animationLayers.every(isPuppetAnimationLayer)))
      && (value.animationMode === undefined || value.animationMode === '2d' || value.animationMode === 'orthographic3d');
  }

  if (value.kind === 'frameAnimation') {
    return Array.isArray(value.frames)
      && value.frames.every(isNonEmptyString)
      && (value.fps === null || isFinitePositive(value.fps));
  }

  return false;
};

const isCompatibility = (value: unknown): value is ImportedWeLayer['compatibility'] => (
  isRecord(value)
  && isNonNegativeInteger(value.weObjectIndex)
  && isNonEmptyString(value.weModelPath)
  && isNonEmptyString(value.weMaterialPath)
  && (value.weColorBlendMode === null || isFiniteNumber(value.weColorBlendMode))
  && typeof value.ignoredEffects === 'boolean'
);

const isAnimationKeyframe = (value: unknown): boolean => (
  isRecord(value)
  && isFiniteNumber(value.frame)
  && value.frame >= 0
  && isFiniteNumber(value.value)
);

const isPointAnimation = (value: unknown): boolean => (
  isRecord(value)
  && isFinitePositive(value.fps)
  && isFinitePositive(value.lengthFrames)
  && (value.mode === 'single' || value.mode === 'loop' || value.mode === 'mirror')
  && Array.isArray(value.x)
  && value.x.length > 0
  && value.x.every(isAnimationKeyframe)
  && Array.isArray(value.y)
  && value.y.length > 0
  && value.y.every(isAnimationKeyframe)
);

const isOpacityEffect = (value: unknown): boolean => (
  isRecord(value)
  && (value.maskPath === null || isNonEmptyString(value.maskPath))
  && isFiniteNumber(value.alpha)
  && value.alpha >= 0
  && value.alpha <= 1
);

const isWaterWavesEffect = (value: unknown): boolean => (
  isRecord(value)
  && (value.maskPath === null || isNonEmptyString(value.maskPath))
  && (value.timeOffsetPath === null || isNonEmptyString(value.timeOffsetPath))
  && isFiniteNumber(value.direction)
  && isFiniteNumber(value.speed)
  && value.speed >= 0
  && isFiniteNumber(value.scale)
  && value.scale >= 0
  && isFiniteNumber(value.exponent)
  && value.exponent > 0
  && isFiniteNumber(value.strength)
  && value.strength >= 0
);

const isScrollEffect = (value: unknown): boolean => (
  isRecord(value)
  && value.kind === 'scroll'
  && isFiniteNumber(value.speedX)
  && isFiniteNumber(value.speedY)
  && isPoint(value.repeat)
  && value.repeat.x > 0
  && value.repeat.y > 0
);

const isTransformEffect = (value: unknown): boolean => (
  isRecord(value)
  && value.kind === 'transform'
  && isPoint(value.offset)
  && isPoint(value.scale)
  && isFiniteNumber(value.angle)
  && typeof value.repeat === 'boolean'
);

const isSpinEffect = (value: unknown): boolean => (
  isRecord(value)
  && value.kind === 'spin'
  && isPoint(value.center)
  && isFiniteNumber(value.speed)
  && isFiniteNumber(value.ratio)
  && Math.abs(value.ratio) >= 0.000001
  && isFiniteNumber(value.axis)
  && isFiniteNumber(value.phase)
  && isFiniteNumber(value.size)
  && value.size >= 0
  && isFiniteNumber(value.feather)
  && value.feather >= 0
  && typeof value.repeat === 'boolean'
  && typeof value.elliptical === 'boolean'
  && typeof value.aspectCorrect === 'boolean'
  && typeof value.softMask === 'boolean'
);

const isPerspectiveEffect = (value: unknown): boolean => (
  isRecord(value)
  && value.kind === 'perspective'
  && Array.isArray(value.points)
  && value.points.length === 4
  && value.points.every(isPoint)
  && typeof value.repeat === 'boolean'
);

const isFoliageSwayEffect = (value: unknown): boolean => (
  isRecord(value)
  && value.kind === 'foliageSway'
  && (value.maskPath === null || isNonEmptyString(value.maskPath))
  && (value.noisePath === null || isNonEmptyString(value.noisePath))
  && isFiniteNumber(value.speed)
  && isFiniteNumber(value.strength)
  && value.strength >= 0
  && isFiniteNumber(value.phase)
  && isFiniteNumber(value.power)
  && value.power > 0
  && isFiniteNumber(value.noiseScale)
  && value.noiseScale >= 0
  && isFiniteNumber(value.ratio)
  && value.ratio > 0
  && isFiniteNumber(value.direction)
);

const isWaterFlowEffect = (value: unknown): boolean => (
  isRecord(value)
  && value.kind === 'waterFlow'
  && (value.flowMapPath === null || isNonEmptyString(value.flowMapPath))
  && isNonEmptyString(value.phasePath)
  && isFiniteNumber(value.speed)
  && value.speed >= 0
  && isFiniteNumber(value.strength)
  && value.strength >= 0
  && isFiniteNumber(value.phaseScale)
  && value.phaseScale > 0
  && (value.phaseMode === 'legacy' || value.phaseMode === 'dual')
  && (value.feather === null || (isFiniteNumber(value.feather) && value.feather >= 0 && value.feather <= 0.5))
);

const isShakeEffect = (value: unknown): boolean => (
  isRecord(value)
  && value.kind === 'shake'
  && (value.directionMapPath === null || isNonEmptyString(value.directionMapPath))
  && isFiniteNumber(value.speed)
  && value.speed >= 0
  && isFiniteNumber(value.strength)
  && value.strength >= 0
  && isPoint(value.friction)
  && value.friction.x > 0
  && value.friction.y > 0
  && isPoint(value.bounds)
  && value.bounds.y > value.bounds.x
  && (value.directionMode === 0 || value.directionMode === 1 || value.directionMode === 2)
);

const isBlurPreciseEffect = (value: unknown): boolean => (
  isRecord(value)
  && value.kind === 'blurPrecise'
  && (value.maskPath === null || isNonEmptyString(value.maskPath))
  && isPoint(value.scale)
  && value.scale.x > 0
  && value.scale.y > 0
  && value.horizontalKernel === 0
  && value.verticalKernel === 0
  && typeof value.blurAlpha === 'boolean'
);

const isShimmerEffect = (value: unknown): boolean => (
  isRecord(value)
  && value.kind === 'shimmer'
  && isFiniteNumber(value.brightness)
  && value.brightness >= 0
  && isColorRgb(value.color)
  && isFiniteNumber(value.delay)
  && value.delay >= 0
  && isFiniteNumber(value.direction)
  && isFiniteNumber(value.granularity)
  && value.granularity > 0
  && isFiniteNumber(value.offset)
  && isFiniteNumber(value.speed)
);

const isShineEffect = (value: unknown): boolean => (
  isRecord(value)
  && value.kind === 'shine'
  && (value.maskPath === null || isNonEmptyString(value.maskPath))
  && (value.noisePath === null || isNonEmptyString(value.noisePath))
  && isFiniteNumber(value.threshold)
  && value.threshold >= 0
  && value.threshold <= 1
  && isFiniteNumber(value.noiseAmount)
  && value.noiseAmount >= 0
  && isFiniteNumber(value.noiseScale)
  && value.noiseScale > 0
  && isFiniteNumber(value.noiseSpeed)
  && isColorRgb(value.rayColor)
  && isFiniteNumber(value.rayDirection)
  && isFiniteNumber(value.raySpeed)
  && isFiniteNumber(value.rayIntensity)
  && value.rayIntensity >= 0
  && isFiniteNumber(value.rayLength)
  && value.rayLength >= 0
  && (value.edges === 2 || value.edges === 3 || value.edges === 4 || value.edges === 5)
  && (value.sampleMode === 0 || value.sampleMode === 1 || value.sampleMode === 2 || value.sampleMode === 3 || value.sampleMode === 4)
  && isPoint(value.blurScale)
  && value.blurScale.x > 0
  && value.blurScale.y > 0
  && value.kernel === 0
  && isFiniteNumber(value.blendMode)
  && Number.isInteger(value.blendMode)
  && value.blendMode >= 0
  && value.blendMode <= 32
  && value.copyBackground === false
  && typeof value.noiseEnabled === 'boolean'
);

const isGodRaysEffect = (value: unknown): boolean => (
  isRecord(value)
  && value.kind === 'godRays'
  && (value.maskPath === null || isNonEmptyString(value.maskPath))
  && isFiniteNumber(value.threshold)
  && value.threshold >= 0
  && value.threshold <= 1
  && isRecord(value.caster)
  && (
    (value.caster.mode === 'radial' && isPoint(value.caster.center))
    || (value.caster.mode === 'directional' && isFiniteNumber(value.caster.direction))
  )
  && isFiniteNumber(value.rayLength)
  && value.rayLength > 0
  && value.rayLength <= 1
  && isFiniteNumber(value.rayIntensity)
  && value.rayIntensity >= 0
  && value.rayIntensity <= 2
  && isColorRgb(value.colorStart)
  && isColorRgb(value.colorEnd)
  && (value.sampleMode === 0 || value.sampleMode === 1 || value.sampleMode === 2)
  && isPoint(value.blurScale)
  && value.blurScale.x > 0
  && value.blurScale.y > 0
  && (value.kernel === 0 || value.kernel === 1 || value.kernel === 2)
  && isFiniteNumber(value.blendMode)
  && Number.isInteger(value.blendMode)
  && value.blendMode >= 0
  && value.blendMode <= 32
);

const isWaterRippleEffect = (value: unknown): boolean => (
  isRecord(value)
  && value.kind === 'waterRipple'
  && (value.maskPath === null || isNonEmptyString(value.maskPath))
  && isNonEmptyString(value.normalPath)
  && isFiniteNumber(value.animationSpeed)
  && isFiniteNumber(value.scale)
  && value.scale >= 0
  && isFiniteNumber(value.scrollSpeed)
  && isFiniteNumber(value.direction)
  && isFiniteNumber(value.ratio)
  && value.ratio >= 0
  && isFiniteNumber(value.strength)
  && value.strength >= 0
);

const isTextureEffect = (value: unknown): boolean => (
  (isRecord(value) && value.kind === 'opacity' && isOpacityEffect(value))
  || isScrollEffect(value)
  || isTransformEffect(value)
  || isSpinEffect(value)
  || isPerspectiveEffect(value)
  || isFoliageSwayEffect(value)
  || isWaterFlowEffect(value)
  || isShakeEffect(value)
  || isBlurPreciseEffect(value)
  || isShimmerEffect(value)
  || isShineEffect(value)
  || isGodRaysEffect(value)
  || isWaterRippleEffect(value)
  || (isRecord(value) && value.kind === 'waterWaves' && isWaterWavesEffect(value))
);

export const isImportedWeLayer = (value: unknown): value is ImportedWeLayer => {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.id)
    && isOptionalString(value.name)
    && isFiniteNumber(value.zIndex)
    && isSource(value.source)
    && isPoint(value.center)
    && isSize(value.size)
    && isPoint(value.scale)
    && isFiniteNumber(value.rotationDeg)
    && isFiniteNumber(value.opacity)
    && value.opacity >= 0
    && value.opacity <= 1
    && (value.opacityEffects === undefined || (
      Array.isArray(value.opacityEffects) && value.opacityEffects.every(isOpacityEffect)
    ))
    && (value.waterWavesEffects === undefined || (
      Array.isArray(value.waterWavesEffects) && value.waterWavesEffects.every(isWaterWavesEffect)
    ))
    && (value.textureEffects === undefined || (
      Array.isArray(value.textureEffects) && value.textureEffects.every(isTextureEffect)
    ))
    && typeof value.visible === 'boolean'
    && (value.parallax === null || isPoint(value.parallax))
    && (value.puppetAttachment === undefined || isPuppetAttachmentBinding(value.puppetAttachment))
    && (value.centerAnimations === undefined || (
      Array.isArray(value.centerAnimations) && value.centerAnimations.every(isPointAnimation)
    ))
    && (value.blendMode === null || value.blendMode === 'normal' || value.blendMode === 'screen')
    && isCompatibility(value.compatibility);
};

const isCanvas = (value: unknown): value is ImportedWeScene['canvas'] => (
  isRecord(value)
  && isFinitePositive(value.width)
  && isFinitePositive(value.height)
  && (value.sizing === 'explicit' || value.sizing === 'inferred' || value.sizing === 'fallback')
  && isFiniteNumber(value.coordinateOffsetX)
  && isFiniteNumber(value.coordinateOffsetY)
);

const isCameraParallax = (value: unknown): value is ImportedWeCameraParallax => (
  isRecord(value)
  && typeof value.enabled === 'boolean'
  && isFiniteNumber(value.amount)
  && value.amount >= 0
  && isFiniteNumber(value.delay)
  && value.delay >= 0
  && isFiniteNumber(value.mouseInfluence)
  && value.mouseInfluence >= 0
);

const isPostProcessEffect = (value: unknown): value is ImportedWePostProcessEffect => {
  if (!isRecord(value) || value.kind !== 'chromaticAberration') return false;
  return isPoint(value.center)
    && isFiniteNumber(value.centerFalloff)
    && value.centerFalloff >= 0
    && value.centerFalloff <= 1
    && isFiniteNumber(value.strength)
    && value.strength >= 0
    && isFiniteNumber(value.direction)
    && (value.mode === 0 || value.mode === 1 || value.mode === 2 || value.mode === 3)
    && (value.variation === 0 || value.variation === 1 || value.variation === 2);
};

const isDiagnostic = (value: unknown): value is ImportedWeDiagnostic => (
  isRecord(value)
  && (value.level === 'warning' || value.level === 'info')
  && typeof value.code === 'string'
  && DIAGNOSTIC_CODES.has(value.code as ImportedWeDiagnostic['code'])
  && isString(value.message)
  && isOptionalString(value.layerId)
  && isOptionalString(value.path)
);

const isResourceDiagnostic = (value: unknown): value is ImportedWeScene['resourceDiagnostics'][number] => (
  isRecord(value)
  && isString(value.code)
  && isString(value.message)
  && (value.objectIndex === undefined || isNonNegativeInteger(value.objectIndex))
  && isOptionalString(value.path)
);

const isUnsupported = (value: unknown): value is ImportedWeScene['unsupported'] => (
  isRecord(value)
  && isNonNegativeInteger(value.particleCount)
  && isNonNegativeInteger(value.otherObjectCount)
  && isNonNegativeInteger(value.unresolvedImageCount)
  && isNonNegativeInteger(value.effectLayerCount)
);

/**
 * Runtime boundary for scene metadata read from IndexedDB.
 *
 * Version 1 is fully checked rather than only checking the outer discriminants.
 * This keeps the type predicate sound and prevents stale/corrupted persisted
 * data from reaching renderer code that dereferences nested layer/source fields.
 */
export const isImportedWeScene = (value: unknown): value is ImportedWeScene => {
  if (!isRecord(value)) return false;
  return value.format === 'tablab-we-scene'
    && value.version === 1
    && isNonEmptyString(value.sourceDescriptorPath)
    && isCanvas(value.canvas)
    && (value.cameraParallax === undefined || isCameraParallax(value.cameraParallax))
    && (value.postProcessEffects === undefined
      || (Array.isArray(value.postProcessEffects) && value.postProcessEffects.every(isPostProcessEffect)))
    && Array.isArray(value.layers)
    && value.layers.every(isImportedWeLayer)
    && Array.isArray(value.diagnostics)
    && value.diagnostics.every(isDiagnostic)
    && Array.isArray(value.resourceDiagnostics)
    && value.resourceDiagnostics.every(isResourceDiagnostic)
    && isUnsupported(value.unsupported);
};
