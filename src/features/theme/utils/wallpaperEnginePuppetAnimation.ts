import type {
  ParsedWePuppetAnimation,
  ParsedWePuppetAttachment,
  ParsedWePuppetModel,
} from './wallpaperEnginePuppetModel';

export interface WePuppetAnimationLayerLike {
  animationId: number;
  additive: boolean;
  blend: number;
  blendIn: boolean;
  blendOut: boolean;
  rate: number;
  visible: boolean;
}

export interface WePuppet2dPlaybackLayer {
  layer: WePuppetAnimationLayerLike;
  animation: ParsedWePuppetAnimation;
}

export type WePuppetAnimationSupportResult =
  | {
      supported: true;
      mode: '2d' | 'orthographic3d';
      layers: WePuppet2dPlaybackLayer[];
    }
  | {
      supported: false;
      reason:
        | 'no-active-animation'
        | 'multiple-non-additive-animations'
        | 'partial-blend'
        | 'blend-transition'
        | 'missing-animation-id'
        | 'unsupported-loop-mode'
        | 'unsupported-3d-transform';
    };

interface Trs2d {
  tx: number;
  ty: number;
  rotation: number;
  sx: number;
  sy: number;
}

export interface WePuppet2dSkinningState {
  model: ParsedWePuppetModel;
  playbackLayers: WePuppet2dPlaybackLayer[];
  /** Reference/bind local TRS, five values per bone: tx, ty, rz, sx, sy. */
  bindLocalTrs: Float64Array;
  bindWorldInverse: Float64Array;
  localPose: Float64Array;
  worldPose: Float64Array;
  worldPoseState: Uint8Array;
  skinMatrices: Float64Array;
  layerFrames: Float64Array;
  sampleScratch: Float64Array;
}

export interface WePuppet3dSkinningState {
  model: ParsedWePuppetModel;
  playback: WePuppet2dPlaybackLayer;
  /** Inverse reference-pose world matrices, column-major 4x4 per bone. */
  bindWorldInverse: Float64Array;
  localPose: Float64Array;
  worldPose: Float64Array;
  worldPoseState: Uint8Array;
  skinMatrices: Float64Array;
  sampleScratch: Float64Array;
}


export interface WePuppetAttachmentTransform2d {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}

export interface WePuppetOrthographicBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const EPSILON = 0.0001;
const MATRIX_EPSILON = 0.001;
const BONE_INFLUENCE_COUNT = 4;
const TRANSFORM_FLOAT_COUNT = 9;
const TRS_FLOAT_COUNT = 5;
const MAT4_FLOAT_COUNT = 16;
const TWO_PI = Math.PI * 2;

const near = (value: number, expected: number, tolerance = MATRIX_EPSILON): boolean => (
  Number.isFinite(value) && Math.abs(value - expected) <= tolerance
);

const wrapAngleDelta = (delta: number): number => {
  let wrapped = (delta + Math.PI) % TWO_PI;
  if (wrapped < 0) wrapped += TWO_PI;
  return wrapped - Math.PI;
};

const decompose2dBindMatrix = (matrix: number[]): Trs2d | null => {
  if (
    matrix.length !== 16
    // Column-major 4x4. A 2D puppet may translate/rotate/scale in XY, but must
    // not couple XY into Z/perspective. This deliberately excludes the supplied
    // wing/wind puppets whose animations use X/Y-axis 3D rotations.
    || !near(matrix[2], 0)
    || !near(matrix[3], 0)
    || !near(matrix[6], 0)
    || !near(matrix[7], 0)
    || !near(matrix[8], 0)
    || !near(matrix[9], 0)
    || !near(matrix[10], 1)
    || !near(matrix[11], 0)
    || !near(matrix[14], 0)
    || !near(matrix[15], 1)
  ) return null;

  const a = matrix[0];
  const b = matrix[1];
  const c = matrix[4];
  const d = matrix[5];
  const sx = Math.hypot(a, b);
  if (!Number.isFinite(sx) || sx <= EPSILON) return null;
  const rotation = Math.atan2(b, a);
  const determinant = a * d - b * c;
  const sy = determinant / sx;
  if (!Number.isFinite(sy) || Math.abs(sy) <= EPSILON) return null;

  // The animation records are TRS channels, so reject bind matrices with shear
  // instead of silently decomposing them into a different transform model.
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  if (
    !near(a, cosine * sx)
    || !near(b, sine * sx)
    || !near(c, -sine * sy)
    || !near(d, cosine * sy)
  ) return null;

  return {
    tx: matrix[12],
    ty: matrix[13],
    rotation,
    sx,
    sy,
  };
};

const is2dAnimation = (animation: ParsedWePuppetAnimation): boolean => {
  for (const track of animation.tracks) {
    const values = track.values;
    if (values.length !== (animation.frameCount + 1) * TRANSFORM_FLOAT_COUNT) return false;
    for (let offset = 0; offset < values.length; offset += TRANSFORM_FLOAT_COUNT) {
      if (
        // Orthographic XY skinning is unaffected by a local Z translation as
        // long as neither the bind pose nor animation rotates X/Y or scales Z.
        // Some MDLV0023 puppets use Z only for depth ordering between parts.
        !Number.isFinite(values[offset + 2])
        || !near(values[offset + 3], 0)
        || !near(values[offset + 4], 0)
        || !near(values[offset + 8], 1)
      ) return false;
    }
  }
  return true;
};

const isAffine3dBindMatrix = (matrix: number[]): boolean => (
  matrix.length === MAT4_FLOAT_COUNT
  && matrix.every(Number.isFinite)
  && near(matrix[3], 0)
  && near(matrix[7], 0)
  && near(matrix[11], 0)
  && near(matrix[15], 1)
);

/**
 * Step-18 support boundary for the proven MDLV0023 animation subsets.
 *
 * Supported authored stacks contain at most one ordinary/non-additive layer,
 * followed or surrounded by any number of additive layers. All active layers
 * must currently use full blend with no automatic blend-in/out transition.
 * Both `loop` and `single` model timelines are supported. The full authored
 * layer order is retained; additive layers are not re-sorted by the renderer.
 *
 * Multiple ordinary layers remain outside this checkpoint because their exact
 * per-bone/channel merge semantics depend on animation track metadata that is
 * not yet decoded. Partial blend and blend transitions are likewise retained
 * in the IR but are not approximated. A single ordinary 3D layer may additionally
 * use full XYZ TRS with orthographic XY projection; 3D additive stacks are not.
 */
export const classifyWallpaperEnginePuppetAnimation = (
  model: ParsedWePuppetModel,
  layers: WePuppetAnimationLayerLike[],
): WePuppetAnimationSupportResult => {
  const activeLayers = layers.filter((layer) => layer.visible);
  if (activeLayers.length === 0) return { supported: false, reason: 'no-active-animation' };
  if (activeLayers.filter((layer) => !layer.additive).length > 1) {
    return { supported: false, reason: 'multiple-non-additive-animations' };
  }
  if (activeLayers.some((layer) => !near(layer.blend, 1, EPSILON))) {
    return { supported: false, reason: 'partial-blend' };
  }
  if (activeLayers.some((layer) => layer.blendIn || layer.blendOut)) {
    return { supported: false, reason: 'blend-transition' };
  }

  const playbackLayers: WePuppet2dPlaybackLayer[] = [];
  for (const layer of activeLayers) {
    const animation = model.animations.find((candidate) => candidate.id === layer.animationId);
    if (!animation) return { supported: false, reason: 'missing-animation-id' };
    if (animation.loopMode !== 'loop' && animation.loopMode !== 'single') {
      return { supported: false, reason: 'unsupported-loop-mode' };
    }
    playbackLayers.push({ layer, animation });
  }

  const bindIs2d = model.bones.every((bone) => decompose2dBindMatrix(bone.bindMatrix) !== null);
  const animationIs2d = playbackLayers.every((playback) => is2dAnimation(playback.animation));
  if (bindIs2d && animationIs2d) {
    return { supported: true, mode: '2d', layers: playbackLayers };
  }

  // Step 18 adds the corpus-validated orthographic 3D subset used by the
  // rotating HighWind puppet parts: one full-blend ordinary MDLA layer, a
  // standard affine 4x4 bind hierarchy, and absolute XYZ TRS tracks. Additive
  // 3D composition remains deliberately unsupported until its authored Euler/
  // quaternion merge semantics are proven independently.
  if (
    playbackLayers.length === 1
    && !playbackLayers[0].layer.additive
    && model.bones.every((bone) => isAffine3dBindMatrix(bone.bindMatrix))
  ) {
    return { supported: true, mode: 'orthographic3d', layers: playbackLayers };
  }

  return { supported: false, reason: 'unsupported-3d-transform' };
};

const setAffineFromTrs = (
  target: Float64Array,
  offset: number,
  tx: number,
  ty: number,
  rotation: number,
  sx: number,
  sy: number,
): void => {
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  target[offset] = cosine * sx;
  target[offset + 1] = sine * sx;
  target[offset + 2] = -sine * sy;
  target[offset + 3] = cosine * sy;
  target[offset + 4] = tx;
  target[offset + 5] = ty;
};

const multiplyAffine = (
  left: Float64Array,
  leftOffset: number,
  right: Float64Array,
  rightOffset: number,
  target: Float64Array,
  targetOffset: number,
): void => {
  const a0 = left[leftOffset];
  const b0 = left[leftOffset + 1];
  const c0 = left[leftOffset + 2];
  const d0 = left[leftOffset + 3];
  const tx0 = left[leftOffset + 4];
  const ty0 = left[leftOffset + 5];
  const a1 = right[rightOffset];
  const b1 = right[rightOffset + 1];
  const c1 = right[rightOffset + 2];
  const d1 = right[rightOffset + 3];
  const tx1 = right[rightOffset + 4];
  const ty1 = right[rightOffset + 5];
  target[targetOffset] = a0 * a1 + c0 * b1;
  target[targetOffset + 1] = b0 * a1 + d0 * b1;
  target[targetOffset + 2] = a0 * c1 + c0 * d1;
  target[targetOffset + 3] = b0 * c1 + d0 * d1;
  target[targetOffset + 4] = a0 * tx1 + c0 * ty1 + tx0;
  target[targetOffset + 5] = b0 * tx1 + d0 * ty1 + ty0;
};

const invertAffine = (
  source: Float64Array,
  sourceOffset: number,
  target: Float64Array,
  targetOffset: number,
): boolean => {
  const a = source[sourceOffset];
  const b = source[sourceOffset + 1];
  const c = source[sourceOffset + 2];
  const d = source[sourceOffset + 3];
  const tx = source[sourceOffset + 4];
  const ty = source[sourceOffset + 5];
  const determinant = a * d - b * c;
  if (!Number.isFinite(determinant) || Math.abs(determinant) <= 0.00000001) return false;
  const inverseDeterminant = 1 / determinant;
  const inverseA = d * inverseDeterminant;
  const inverseB = -b * inverseDeterminant;
  const inverseC = -c * inverseDeterminant;
  const inverseD = a * inverseDeterminant;
  target[targetOffset] = inverseA;
  target[targetOffset + 1] = inverseB;
  target[targetOffset + 2] = inverseC;
  target[targetOffset + 3] = inverseD;
  target[targetOffset + 4] = -(inverseA * tx + inverseC * ty);
  target[targetOffset + 5] = -(inverseB * tx + inverseD * ty);
  return true;
};

const setMat4FromTrs = (
  target: Float64Array,
  offset: number,
  tx: number,
  ty: number,
  tz: number,
  rx: number,
  ry: number,
  rz: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
): void => {
  const cx = Math.cos(rx);
  const sx = Math.sin(rx);
  const cy = Math.cos(ry);
  const sy = Math.sin(ry);
  const cz = Math.cos(rz);
  const sz = Math.sin(rz);

  // Wallpaper Engine's sampled MDLA Euler channels match a column-major
  // T * Rz * Ry * Rx * S composition in the supplied MDLV0023 corpus. In
  // particular the HighWind blades vary Rx while keeping Ry tilted, which
  // projects the authored vertical strip into the rotating XY fan.
  const r00 = cz * cy;
  const r01 = cz * sy * sx - sz * cx;
  const r02 = cz * sy * cx + sz * sx;
  const r10 = sz * cy;
  const r11 = sz * sy * sx + cz * cx;
  const r12 = sz * sy * cx - cz * sx;
  const r20 = -sy;
  const r21 = cy * sx;
  const r22 = cy * cx;

  target[offset] = r00 * scaleX;
  target[offset + 1] = r10 * scaleX;
  target[offset + 2] = r20 * scaleX;
  target[offset + 3] = 0;
  target[offset + 4] = r01 * scaleY;
  target[offset + 5] = r11 * scaleY;
  target[offset + 6] = r21 * scaleY;
  target[offset + 7] = 0;
  target[offset + 8] = r02 * scaleZ;
  target[offset + 9] = r12 * scaleZ;
  target[offset + 10] = r22 * scaleZ;
  target[offset + 11] = 0;
  target[offset + 12] = tx;
  target[offset + 13] = ty;
  target[offset + 14] = tz;
  target[offset + 15] = 1;
};

const multiplyMat4 = (
  left: Float64Array,
  leftOffset: number,
  right: Float64Array,
  rightOffset: number,
  target: Float64Array,
  targetOffset: number,
): void => {
  for (let column = 0; column < 4; column += 1) {
    const rightColumn = rightOffset + column * 4;
    for (let row = 0; row < 4; row += 1) {
      target[targetOffset + column * 4 + row] =
        left[leftOffset + row] * right[rightColumn]
        + left[leftOffset + 4 + row] * right[rightColumn + 1]
        + left[leftOffset + 8 + row] * right[rightColumn + 2]
        + left[leftOffset + 12 + row] * right[rightColumn + 3];
    }
  }
};

const invertAffine3d = (
  source: Float64Array,
  sourceOffset: number,
  target: Float64Array,
  targetOffset: number,
): boolean => {
  const a00 = source[sourceOffset];
  const a01 = source[sourceOffset + 4];
  const a02 = source[sourceOffset + 8];
  const a10 = source[sourceOffset + 1];
  const a11 = source[sourceOffset + 5];
  const a12 = source[sourceOffset + 9];
  const a20 = source[sourceOffset + 2];
  const a21 = source[sourceOffset + 6];
  const a22 = source[sourceOffset + 10];
  const tx = source[sourceOffset + 12];
  const ty = source[sourceOffset + 13];
  const tz = source[sourceOffset + 14];

  const b01 = a22 * a11 - a12 * a21;
  const b11 = -a22 * a10 + a12 * a20;
  const b21 = a21 * a10 - a11 * a20;
  const determinant = a00 * b01 + a01 * b11 + a02 * b21;
  if (!Number.isFinite(determinant) || Math.abs(determinant) <= 0.00000001) return false;
  const inverseDeterminant = 1 / determinant;

  const i00 = b01 * inverseDeterminant;
  const i01 = (-a22 * a01 + a02 * a21) * inverseDeterminant;
  const i02 = (a12 * a01 - a02 * a11) * inverseDeterminant;
  const i10 = b11 * inverseDeterminant;
  const i11 = (a22 * a00 - a02 * a20) * inverseDeterminant;
  const i12 = (-a12 * a00 + a02 * a10) * inverseDeterminant;
  const i20 = b21 * inverseDeterminant;
  const i21 = (-a21 * a00 + a01 * a20) * inverseDeterminant;
  const i22 = (a11 * a00 - a01 * a10) * inverseDeterminant;

  target[targetOffset] = i00;
  target[targetOffset + 1] = i10;
  target[targetOffset + 2] = i20;
  target[targetOffset + 3] = 0;
  target[targetOffset + 4] = i01;
  target[targetOffset + 5] = i11;
  target[targetOffset + 6] = i21;
  target[targetOffset + 7] = 0;
  target[targetOffset + 8] = i02;
  target[targetOffset + 9] = i12;
  target[targetOffset + 10] = i22;
  target[targetOffset + 11] = 0;
  target[targetOffset + 12] = -(i00 * tx + i01 * ty + i02 * tz);
  target[targetOffset + 13] = -(i10 * tx + i11 * ty + i12 * tz);
  target[targetOffset + 14] = -(i20 * tx + i21 * ty + i22 * tz);
  target[targetOffset + 15] = 1;
  return true;
};

const build3dBindWorldInverse = (model: ParsedWePuppetModel): Float64Array | null => {
  const boneCount = model.bones.length;
  const localBind = new Float64Array(boneCount * MAT4_FLOAT_COUNT);
  const worldBind = new Float64Array(boneCount * MAT4_FLOAT_COUNT);
  const inverse = new Float64Array(boneCount * MAT4_FLOAT_COUNT);
  const state = new Uint8Array(boneCount);

  for (let boneIndex = 0; boneIndex < boneCount; boneIndex += 1) {
    const matrix = model.bones[boneIndex].bindMatrix;
    if (!isAffine3dBindMatrix(matrix)) return null;
    for (let offset = 0; offset < MAT4_FLOAT_COUNT; offset += 1) {
      localBind[boneIndex * MAT4_FLOAT_COUNT + offset] = matrix[offset];
    }
  }

  const resolve = (boneIndex: number): boolean => {
    if (state[boneIndex] === 2) return true;
    if (state[boneIndex] === 1) return false;
    state[boneIndex] = 1;
    const parentIndex = model.bones[boneIndex].parentIndex;
    if (parentIndex < 0) {
      for (let offset = 0; offset < MAT4_FLOAT_COUNT; offset += 1) {
        worldBind[boneIndex * MAT4_FLOAT_COUNT + offset] = localBind[boneIndex * MAT4_FLOAT_COUNT + offset];
      }
    } else {
      if (parentIndex >= boneCount || !resolve(parentIndex)) return false;
      multiplyMat4(
        worldBind,
        parentIndex * MAT4_FLOAT_COUNT,
        localBind,
        boneIndex * MAT4_FLOAT_COUNT,
        worldBind,
        boneIndex * MAT4_FLOAT_COUNT,
      );
    }
    state[boneIndex] = 2;
    return true;
  };

  for (let boneIndex = 0; boneIndex < boneCount; boneIndex += 1) {
    if (!resolve(boneIndex)) return null;
  }
  for (let boneIndex = 0; boneIndex < boneCount; boneIndex += 1) {
    if (!invertAffine3d(worldBind, boneIndex * MAT4_FLOAT_COUNT, inverse, boneIndex * MAT4_FLOAT_COUNT)) return null;
  }
  return inverse;
};

const buildBindData = (model: ParsedWePuppetModel): {
  bindLocalTrs: Float64Array;
  bindWorld: Float64Array;
} | null => {
  const boneCount = model.bones.length;
  const bindLocalTrs = new Float64Array(boneCount * TRS_FLOAT_COUNT);
  const localBind = new Float64Array(boneCount * 6);
  const worldBind = new Float64Array(boneCount * 6);
  const state = new Uint8Array(boneCount);

  for (let boneIndex = 0; boneIndex < boneCount; boneIndex += 1) {
    const trs = decompose2dBindMatrix(model.bones[boneIndex].bindMatrix);
    if (!trs) return null;
    const trsOffset = boneIndex * TRS_FLOAT_COUNT;
    bindLocalTrs[trsOffset] = trs.tx;
    bindLocalTrs[trsOffset + 1] = trs.ty;
    bindLocalTrs[trsOffset + 2] = trs.rotation;
    bindLocalTrs[trsOffset + 3] = trs.sx;
    bindLocalTrs[trsOffset + 4] = trs.sy;
    setAffineFromTrs(localBind, boneIndex * 6, trs.tx, trs.ty, trs.rotation, trs.sx, trs.sy);
  }

  const resolve = (boneIndex: number): boolean => {
    if (state[boneIndex] === 2) return true;
    if (state[boneIndex] === 1) return false;
    state[boneIndex] = 1;
    const parentIndex = model.bones[boneIndex].parentIndex;
    if (parentIndex < 0) {
      for (let offset = 0; offset < 6; offset += 1) {
        worldBind[boneIndex * 6 + offset] = localBind[boneIndex * 6 + offset];
      }
    } else {
      if (parentIndex >= boneCount || !resolve(parentIndex)) return false;
      multiplyAffine(worldBind, parentIndex * 6, localBind, boneIndex * 6, worldBind, boneIndex * 6);
    }
    state[boneIndex] = 2;
    return true;
  };

  for (let boneIndex = 0; boneIndex < boneCount; boneIndex += 1) {
    if (!resolve(boneIndex)) return null;
  }
  return { bindLocalTrs, bindWorld: worldBind };
};

const interpolate = (from: number, to: number, amount: number): number => from + (to - from) * amount;

const sampleTrackTrs = (
  animation: ParsedWePuppetAnimation,
  boneIndex: number,
  frame: number,
  target: Float64Array,
): void => {
  const frame0 = Math.max(0, Math.min(animation.frameCount, Math.floor(frame)));
  const frame1 = Math.min(animation.frameCount, frame0 + 1);
  const amount = Math.max(0, Math.min(1, frame - frame0));
  const values = animation.tracks[boneIndex].values;
  const offset0 = frame0 * TRANSFORM_FLOAT_COUNT;
  const offset1 = frame1 * TRANSFORM_FLOAT_COUNT;
  target[0] = interpolate(values[offset0], values[offset1], amount);
  target[1] = interpolate(values[offset0 + 1], values[offset1 + 1], amount);
  const rotation0 = values[offset0 + 5];
  target[2] = rotation0 + wrapAngleDelta(values[offset1 + 5] - rotation0) * amount;
  target[3] = interpolate(values[offset0 + 6], values[offset1 + 6], amount);
  target[4] = interpolate(values[offset0 + 7], values[offset1 + 7], amount);
};

const animationFrame = (
  playback: WePuppet2dPlaybackLayer,
  elapsedMs: number,
): number => {
  const { animation, layer } = playback;
  const rate = Number.isFinite(layer.rate) ? layer.rate : 1;
  if (!Number.isFinite(elapsedMs) || animation.frameCount <= 0) return 0;
  const rawFrame = (Math.max(0, elapsedMs) * animation.fps * rate) / 1000;
  if (animation.loopMode === 'single') {
    return Math.max(0, Math.min(animation.frameCount, rawFrame));
  }
  const wrapped = ((rawFrame % animation.frameCount) + animation.frameCount) % animation.frameCount;
  return wrapped;
};

export const createWallpaperEnginePuppet2dSkinningState = (
  model: ParsedWePuppetModel,
  layers: WePuppetAnimationLayerLike[],
): WePuppet2dSkinningState | null => {
  const support = classifyWallpaperEnginePuppetAnimation(model, layers);
  if (!support.supported || support.mode !== '2d') return null;
  const bindData = buildBindData(model);
  if (!bindData) return null;
  const bindWorldInverse = new Float64Array(bindData.bindWorld.length);
  for (let boneIndex = 0; boneIndex < model.bones.length; boneIndex += 1) {
    if (!invertAffine(bindData.bindWorld, boneIndex * 6, bindWorldInverse, boneIndex * 6)) return null;
  }
  return {
    model,
    playbackLayers: support.layers,
    bindLocalTrs: bindData.bindLocalTrs,
    bindWorldInverse,
    localPose: new Float64Array(model.bones.length * 6),
    worldPose: new Float64Array(model.bones.length * 6),
    worldPoseState: new Uint8Array(model.bones.length),
    skinMatrices: new Float64Array(model.bones.length * 6),
    layerFrames: new Float64Array(support.layers.length),
    sampleScratch: new Float64Array(TRS_FLOAT_COUNT),
  };
};

const buildPoseWorld = (state: WePuppet2dSkinningState, elapsedMs: number): boolean => {
  const {
    model,
    playbackLayers,
    bindLocalTrs,
    localPose,
    worldPose,
    worldPoseState,
    layerFrames,
    sampleScratch,
  } = state;
  worldPoseState.fill(0);

  for (let layerIndex = 0; layerIndex < playbackLayers.length; layerIndex += 1) {
    layerFrames[layerIndex] = animationFrame(playbackLayers[layerIndex], elapsedMs);
  }

  for (let boneIndex = 0; boneIndex < model.bones.length; boneIndex += 1) {
    const trsOffset = boneIndex * TRS_FLOAT_COUNT;
    const bindTx = bindLocalTrs[trsOffset];
    const bindTy = bindLocalTrs[trsOffset + 1];
    const bindRotation = bindLocalTrs[trsOffset + 2];
    const bindSx = bindLocalTrs[trsOffset + 3];
    const bindSy = bindLocalTrs[trsOffset + 4];

    let tx = bindTx;
    let ty = bindTy;
    let rotation = bindRotation;
    let sx = bindSx;
    let sy = bindSy;

    for (let layerIndex = 0; layerIndex < playbackLayers.length; layerIndex += 1) {
      const playback = playbackLayers[layerIndex];
      sampleTrackTrs(playback.animation, boneIndex, layerFrames[layerIndex], sampleScratch);
      if (playback.layer.additive) {
        // MDLA tracks contain absolute local TRS. Additive layer semantics are
        // expressed as a delta from the model's reference/bind local pose.
        tx += sampleScratch[0] - bindTx;
        ty += sampleScratch[1] - bindTy;
        rotation += wrapAngleDelta(sampleScratch[2] - bindRotation);
        sx *= sampleScratch[3] / bindSx;
        sy *= sampleScratch[4] / bindSy;
      } else {
        // A full-blend ordinary layer replaces the current local pose. Step 17
        // intentionally supports at most one such layer until track/channel
        // contribution metadata is decoded for true multi-opaque mixing.
        tx = sampleScratch[0];
        ty = sampleScratch[1];
        rotation = sampleScratch[2];
        sx = sampleScratch[3];
        sy = sampleScratch[4];
      }
    }

    setAffineFromTrs(localPose, boneIndex * 6, tx, ty, rotation, sx, sy);
  }

  const resolve = (boneIndex: number): boolean => {
    if (worldPoseState[boneIndex] === 2) return true;
    if (worldPoseState[boneIndex] === 1) return false;
    worldPoseState[boneIndex] = 1;
    const parentIndex = model.bones[boneIndex].parentIndex;
    if (parentIndex < 0) {
      for (let offset = 0; offset < 6; offset += 1) {
        worldPose[boneIndex * 6 + offset] = localPose[boneIndex * 6 + offset];
      }
    } else {
      if (parentIndex >= model.bones.length || !resolve(parentIndex)) return false;
      multiplyAffine(worldPose, parentIndex * 6, localPose, boneIndex * 6, worldPose, boneIndex * 6);
    }
    worldPoseState[boneIndex] = 2;
    return true;
  };

  for (let boneIndex = 0; boneIndex < model.bones.length; boneIndex += 1) {
    if (!resolve(boneIndex)) return false;
  }
  return true;
};

const attachmentLocalAffine = (
  attachment: ParsedWePuppetAttachment,
): Float64Array | null => {
  const matrix = attachment.localMatrix;
  if (matrix.length !== MAT4_FLOAT_COUNT) return null;
  // Attachment slots used by 2D Puppet layers must remain in the XY affine
  // plane. Reject perspective/XYZ coupling instead of flattening it silently.
  if (
    !near(matrix[2], 0) || !near(matrix[3], 0)
    || !near(matrix[6], 0) || !near(matrix[7], 0)
    || !near(matrix[8], 0) || !near(matrix[9], 0)
    || !near(matrix[10], 1) || !near(matrix[11], 0)
    || !near(matrix[14], 0) || !near(matrix[15], 1)
  ) return null;
  return new Float64Array([
    matrix[0], matrix[1], matrix[4], matrix[5], matrix[12], matrix[13],
  ]);
};

const affineToAttachmentTransform = (
  matrix: Float64Array,
  offset = 0,
): WePuppetAttachmentTransform2d => ({
  a: matrix[offset],
  b: matrix[offset + 1],
  c: matrix[offset + 2],
  d: matrix[offset + 3],
  tx: matrix[offset + 4],
  ty: matrix[offset + 5],
});

/**
 * Resolve a named MDAT attachment in the Puppet reference pose. The result is
 * model-local / Y-up and includes both the owning bone's world bind transform
 * and the authored attachment-local matrix.
 */
export const getWallpaperEnginePuppetAttachmentBindTransform2d = (
  model: ParsedWePuppetModel,
  attachment: ParsedWePuppetAttachment,
): WePuppetAttachmentTransform2d | null => {
  if (attachment.boneIndex < 0 || attachment.boneIndex >= model.bones.length) return null;
  const bindData = buildBindData(model);
  const localAttachment = attachmentLocalAffine(attachment);
  if (!bindData || !localAttachment) return null;
  const result = new Float64Array(6);
  multiplyAffine(
    bindData.bindWorld,
    attachment.boneIndex * 6,
    localAttachment,
    0,
    result,
    0,
  );
  return affineToAttachmentTransform(result);
};

/**
 * Sample the same attachment against the current 2D Puppet pose. This is what
 * lets separately-authored scene layers follow a named Puppet bone instead of
 * remaining frozen at the parent object's static transform.
 */
export const sampleWallpaperEnginePuppetAttachmentTransform2d = (
  state: WePuppet2dSkinningState,
  attachment: ParsedWePuppetAttachment,
  elapsedMs: number,
): WePuppetAttachmentTransform2d | null => {
  if (attachment.boneIndex < 0 || attachment.boneIndex >= state.model.bones.length) return null;
  const localAttachment = attachmentLocalAffine(attachment);
  if (!localAttachment || !buildPoseWorld(state, elapsedMs)) return null;
  const result = new Float64Array(6);
  multiplyAffine(
    state.worldPose,
    attachment.boneIndex * 6,
    localAttachment,
    0,
    result,
    0,
  );
  return affineToAttachmentTransform(result);
};

/** Reflect a WE Y-up affine transform into the browser's Y-down coordinates. */
export const convertWallpaperEnginePuppetAttachmentTransformToBrowser = (
  transform: WePuppetAttachmentTransform2d,
): WePuppetAttachmentTransform2d => ({
  a: transform.a,
  b: transform.b === 0 ? 0 : -transform.b,
  c: transform.c === 0 ? 0 : -transform.c,
  d: transform.d,
  tx: transform.tx,
  ty: transform.ty === 0 ? 0 : -transform.ty,
});

/**
 * CPU linear-blend skinning for the validated Step-17 2D animation stack.
 * `output` contains model-space XY positions and may be reused every frame.
 */
export const sampleWallpaperEnginePuppet2dPositions = (
  state: WePuppet2dSkinningState,
  elapsedMs: number,
  output = new Float32Array(state.model.positions.length),
): Float32Array | null => {
  const { model, worldPose, bindWorldInverse, skinMatrices } = state;
  if (output.length !== model.positions.length || !buildPoseWorld(state, elapsedMs)) return null;

  for (let boneIndex = 0; boneIndex < model.bones.length; boneIndex += 1) {
    multiplyAffine(worldPose, boneIndex * 6, bindWorldInverse, boneIndex * 6, skinMatrices, boneIndex * 6);
  }

  const vertexCount = model.positions.length / 2;
  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    const sourceX = model.positions[vertex * 2];
    const sourceY = model.positions[vertex * 2 + 1];
    let x = 0;
    let y = 0;
    let totalWeight = 0;
    for (let influence = 0; influence < BONE_INFLUENCE_COUNT; influence += 1) {
      const influenceOffset = vertex * BONE_INFLUENCE_COUNT + influence;
      const weight = model.boneWeights[influenceOffset];
      if (Math.abs(weight) <= 0.000001) continue;
      const boneIndex = model.boneIndices[influenceOffset];
      if (boneIndex >= model.bones.length) return null;
      const matrixOffset = boneIndex * 6;
      const transformedX = skinMatrices[matrixOffset] * sourceX
        + skinMatrices[matrixOffset + 2] * sourceY
        + skinMatrices[matrixOffset + 4];
      const transformedY = skinMatrices[matrixOffset + 1] * sourceX
        + skinMatrices[matrixOffset + 3] * sourceY
        + skinMatrices[matrixOffset + 5];
      x += transformedX * weight;
      y += transformedY * weight;
      totalWeight += weight;
    }
    if (Math.abs(totalWeight) <= 0.000001) {
      output[vertex * 2] = sourceX;
      output[vertex * 2 + 1] = sourceY;
    } else {
      output[vertex * 2] = x;
      output[vertex * 2 + 1] = y;
    }
  }
  return output;
};

const sampleTrackTrs3d = (
  animation: ParsedWePuppetAnimation,
  boneIndex: number,
  frame: number,
  target: Float64Array,
): void => {
  const frame0 = Math.max(0, Math.min(animation.frameCount, Math.floor(frame)));
  const frame1 = Math.min(animation.frameCount, frame0 + 1);
  const amount = Math.max(0, Math.min(1, frame - frame0));
  const values = animation.tracks[boneIndex].values;
  const offset0 = frame0 * TRANSFORM_FLOAT_COUNT;
  const offset1 = frame1 * TRANSFORM_FLOAT_COUNT;
  target[0] = interpolate(values[offset0], values[offset1], amount);
  target[1] = interpolate(values[offset0 + 1], values[offset1 + 1], amount);
  target[2] = interpolate(values[offset0 + 2], values[offset1 + 2], amount);
  for (let axis = 0; axis < 3; axis += 1) {
    const rotation0 = values[offset0 + 3 + axis];
    target[3 + axis] = rotation0 + wrapAngleDelta(values[offset1 + 3 + axis] - rotation0) * amount;
  }
  target[6] = interpolate(values[offset0 + 6], values[offset1 + 6], amount);
  target[7] = interpolate(values[offset0 + 7], values[offset1 + 7], amount);
  target[8] = interpolate(values[offset0 + 8], values[offset1 + 8], amount);
};

/**
 * Create the Step-18 orthographic 3D skinning path. This deliberately accepts
 * only the single ordinary/full-blend layer subset returned by the classifier;
 * 3D additive composition is not approximated.
 */
export const createWallpaperEnginePuppet3dSkinningState = (
  model: ParsedWePuppetModel,
  layers: WePuppetAnimationLayerLike[],
): WePuppet3dSkinningState | null => {
  const support = classifyWallpaperEnginePuppetAnimation(model, layers);
  if (!support.supported || support.mode !== 'orthographic3d' || support.layers.length !== 1) return null;
  if (!model.positions3d || model.positions3d.length !== (model.positions.length / 2) * 3) return null;
  const bindWorldInverse = build3dBindWorldInverse(model);
  if (!bindWorldInverse) return null;
  return {
    model,
    playback: support.layers[0],
    bindWorldInverse,
    localPose: new Float64Array(model.bones.length * MAT4_FLOAT_COUNT),
    worldPose: new Float64Array(model.bones.length * MAT4_FLOAT_COUNT),
    worldPoseState: new Uint8Array(model.bones.length),
    skinMatrices: new Float64Array(model.bones.length * MAT4_FLOAT_COUNT),
    sampleScratch: new Float64Array(TRANSFORM_FLOAT_COUNT),
  };
};

const buildPoseWorld3d = (state: WePuppet3dSkinningState, elapsedMs: number): boolean => {
  const {
    model,
    playback,
    localPose,
    worldPose,
    worldPoseState,
    sampleScratch,
  } = state;
  worldPoseState.fill(0);
  const frame = animationFrame(playback, elapsedMs);

  for (let boneIndex = 0; boneIndex < model.bones.length; boneIndex += 1) {
    sampleTrackTrs3d(playback.animation, boneIndex, frame, sampleScratch);
    setMat4FromTrs(
      localPose,
      boneIndex * MAT4_FLOAT_COUNT,
      sampleScratch[0],
      sampleScratch[1],
      sampleScratch[2],
      sampleScratch[3],
      sampleScratch[4],
      sampleScratch[5],
      sampleScratch[6],
      sampleScratch[7],
      sampleScratch[8],
    );
  }

  const resolve = (boneIndex: number): boolean => {
    if (worldPoseState[boneIndex] === 2) return true;
    if (worldPoseState[boneIndex] === 1) return false;
    worldPoseState[boneIndex] = 1;
    const parentIndex = model.bones[boneIndex].parentIndex;
    if (parentIndex < 0) {
      for (let offset = 0; offset < MAT4_FLOAT_COUNT; offset += 1) {
        worldPose[boneIndex * MAT4_FLOAT_COUNT + offset] = localPose[boneIndex * MAT4_FLOAT_COUNT + offset];
      }
    } else {
      if (parentIndex >= model.bones.length || !resolve(parentIndex)) return false;
      multiplyMat4(
        worldPose,
        parentIndex * MAT4_FLOAT_COUNT,
        localPose,
        boneIndex * MAT4_FLOAT_COUNT,
        worldPose,
        boneIndex * MAT4_FLOAT_COUNT,
      );
    }
    worldPoseState[boneIndex] = 2;
    return true;
  };

  for (let boneIndex = 0; boneIndex < model.bones.length; boneIndex += 1) {
    if (!resolve(boneIndex)) return false;
  }
  return true;
};

/**
 * CPU linear-blend skinning in the full WE XYZ model space. The renderer then
 * performs the scene's orthographic projection by taking the skinned X/Y pair
 * and applying the existing single Y-up -> browser Y-down boundary reflection.
 */
export const sampleWallpaperEnginePuppet3dPositions = (
  state: WePuppet3dSkinningState,
  elapsedMs: number,
  output = new Float32Array((state.model.positions.length / 2) * 3),
): Float32Array | null => {
  const { model, worldPose, bindWorldInverse, skinMatrices } = state;
  const sourcePositions = model.positions3d;
  if (!sourcePositions || output.length !== sourcePositions.length || !buildPoseWorld3d(state, elapsedMs)) return null;

  for (let boneIndex = 0; boneIndex < model.bones.length; boneIndex += 1) {
    multiplyMat4(
      worldPose,
      boneIndex * MAT4_FLOAT_COUNT,
      bindWorldInverse,
      boneIndex * MAT4_FLOAT_COUNT,
      skinMatrices,
      boneIndex * MAT4_FLOAT_COUNT,
    );
  }

  const vertexCount = sourcePositions.length / 3;
  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    const sourceX = sourcePositions[vertex * 3];
    const sourceY = sourcePositions[vertex * 3 + 1];
    const sourceZ = sourcePositions[vertex * 3 + 2];
    let x = 0;
    let y = 0;
    let z = 0;
    let totalWeight = 0;
    for (let influence = 0; influence < BONE_INFLUENCE_COUNT; influence += 1) {
      const influenceOffset = vertex * BONE_INFLUENCE_COUNT + influence;
      const weight = model.boneWeights[influenceOffset];
      if (Math.abs(weight) <= 0.000001) continue;
      const boneIndex = model.boneIndices[influenceOffset];
      if (boneIndex >= model.bones.length) return null;
      const matrixOffset = boneIndex * MAT4_FLOAT_COUNT;
      const transformedX = skinMatrices[matrixOffset] * sourceX
        + skinMatrices[matrixOffset + 4] * sourceY
        + skinMatrices[matrixOffset + 8] * sourceZ
        + skinMatrices[matrixOffset + 12];
      const transformedY = skinMatrices[matrixOffset + 1] * sourceX
        + skinMatrices[matrixOffset + 5] * sourceY
        + skinMatrices[matrixOffset + 9] * sourceZ
        + skinMatrices[matrixOffset + 13];
      const transformedZ = skinMatrices[matrixOffset + 2] * sourceX
        + skinMatrices[matrixOffset + 6] * sourceY
        + skinMatrices[matrixOffset + 10] * sourceZ
        + skinMatrices[matrixOffset + 14];
      x += transformedX * weight;
      y += transformedY * weight;
      z += transformedZ * weight;
      totalWeight += weight;
    }
    if (Math.abs(totalWeight) <= 0.000001) {
      output[vertex * 3] = sourceX;
      output[vertex * 3 + 1] = sourceY;
      output[vertex * 3 + 2] = sourceZ;
    } else {
      output[vertex * 3] = x;
      output[vertex * 3 + 1] = y;
      output[vertex * 3 + 2] = z;
    }
  }
  return output;
};

/**
 * Conservative transparent canvas bounds for an orthographically projected
 * puppet. The box stays centered on the existing reference XY bounds so the
 * scene converter's authored layer center remains valid, while a 3D radius
 * prevents X/Y rotations from being clipped by the narrow reference rectangle.
 */
export const getWallpaperEnginePuppetOrthographicBounds = (
  model: Pick<ParsedWePuppetModel, 'positions' | 'positions3d' | 'bounds'>,
): WePuppetOrthographicBounds | null => {
  const positions3d = model.positions3d;
  if (!positions3d || positions3d.length !== (model.positions.length / 2) * 3) return null;
  const centerX = (model.bounds.minX + model.bounds.maxX) / 2;
  const centerY = (model.bounds.minY + model.bounds.maxY) / 2;
  const centerRadius = Math.hypot(centerX, centerY);
  let originRadius = 0;
  for (let offset = 0; offset < positions3d.length; offset += 3) {
    originRadius = Math.max(originRadius, Math.hypot(
      positions3d[offset],
      positions3d[offset + 1],
      positions3d[offset + 2],
    ));
  }
  const radius = Math.max(1, originRadius + centerRadius + 1);
  return {
    minX: centerX - radius,
    minY: centerY - radius,
    maxX: centerX + radius,
    maxY: centerY + radius,
  };
};
