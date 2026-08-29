export interface ParsedWePuppetMesh {
  /** Local reference-pose XY coordinates retained for the renderer-facing IR. */
  positions: number[];
  /** Optional full XYZ reference positions for orthographic 3D puppet playback. */
  positions3d?: number[];
  uvs: number[];
  indices: number[];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

export interface ParsedWePuppetSkin {
  /** Four authored bone indices per vertex, interleaved vertex-major. */
  boneIndices: number[];
  /** Four authored bone weights per vertex, interleaved vertex-major. */
  boneWeights: number[];
}

export interface ParsedWePuppetBone {
  parentIndex: number;
  /** Column-major 4x4 local reference/bind transform. */
  bindMatrix: number[];
}

export interface ParsedWePuppetAttachment {
  /** Authored attachment slot name referenced by scene object `attachment`. */
  name: string;
  /** Bone index whose animated world transform owns this attachment. */
  boneIndex: number;
  /** Column-major 4x4 attachment-local transform relative to the owning bone. */
  localMatrix: number[];
}

export interface ParsedWePuppetAnimationTrack {
  /** Inclusive frame samples. Every sample contains T.xyz, R.xyz, S.xyz. */
  values: Float32Array;
}

export interface ParsedWePuppetAnimation {
  id: number;
  name: string;
  loopMode: string;
  fps: number;
  /** Number of timeline frames; tracks contain frameCount + 1 samples. */
  frameCount: number;
  tracks: ParsedWePuppetAnimationTrack[];
}

export interface ParsedWePuppetModel extends ParsedWePuppetMesh, ParsedWePuppetSkin {
  bones: ParsedWePuppetBone[];
  /** Optional named bone attachment slots stored by MDAT0001. */
  attachments: ParsedWePuppetAttachment[];
  animations: ParsedWePuppetAnimation[];
}

const MDL_MAGIC = 'MDLV0023';
const SKELETON_MAGIC = 'MDLS0004';
const ANIMATION_MAGIC = 'MDLA0006';
const ANIMATION_DATA_MAGIC = 'MDAT0001';
const PUPPET_VERTEX_FORMAT = 0x0180000f;
const PUPPET_VERTEX_STRIDE_BYTES = 80;
const POSITION_X_OFFSET = 0;
const POSITION_Y_OFFSET = 4;
const POSITION_Z_OFFSET = 8;
const BONE_INDEX_OFFSET = 40;
const BONE_WEIGHT_OFFSET = 56;
const BONE_INFLUENCE_COUNT = 4;
const UV_U_OFFSET = 72;
const UV_V_OFFSET = 76;
const TRANSFORM_FLOAT_COUNT = 9;
const TRANSFORM_BYTE_LENGTH = TRANSFORM_FLOAT_COUNT * 4;
const ANIMATION_FOOTER_BYTES = 35;
const ROOT_BONE_INDEX = 0xffffffff;

const ascii = (data: Uint8Array, start: number, length: number): string => (
  String.fromCharCode(...data.subarray(start, start + length))
);

const findAscii = (data: Uint8Array, value: string, start = 0): number => {
  if (!value.length || data.byteLength < value.length) return -1;
  const first = value.charCodeAt(0);
  const limit = data.byteLength - value.length;
  for (let offset = Math.max(0, start); offset <= limit; offset += 1) {
    if (data[offset] !== first) continue;
    let matches = true;
    for (let index = 1; index < value.length; index += 1) {
      if (data[offset + index] !== value.charCodeAt(index)) {
        matches = false;
        break;
      }
    }
    if (matches) return offset;
  }
  return -1;
};

const findUint32Le = (data: Uint8Array, value: number, start: number, end: number): number => {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const limit = Math.min(end, data.byteLength - 4);
  for (let offset = Math.max(0, start); offset <= limit; offset += 1) {
    if (view.getUint32(offset, true) === value) return offset;
  }
  return -1;
};

const decodeUtf8 = (bytes: Uint8Array): string => {
  if (typeof TextDecoder !== 'undefined') return new TextDecoder().decode(bytes);
  let output = '';
  for (let index = 0; index < bytes.length;) {
    const first = bytes[index];
    if (first < 0x80) {
      output += String.fromCharCode(first);
      index += 1;
      continue;
    }
    const length = first >= 0xf0 ? 4 : first >= 0xe0 ? 3 : 2;
    if (index + length > bytes.length) {
      output += '\ufffd';
      break;
    }
    let codePoint = first & (length === 2 ? 0x1f : length === 3 ? 0x0f : 0x07);
    let valid = true;
    for (let offset = 1; offset < length; offset += 1) {
      const continuation = bytes[index + offset];
      if ((continuation & 0xc0) !== 0x80) {
        valid = false;
        break;
      }
      codePoint = (codePoint << 6) | (continuation & 0x3f);
    }
    if (!valid) {
      output += '\ufffd';
      index += 1;
      continue;
    }
    output += String.fromCodePoint(codePoint);
    index += length;
  }
  return output;
};

const readCString = (data: Uint8Array, start: number, end: number): { value: string; next: number } | null => {
  if (start < 0 || start >= end || end > data.byteLength) return null;
  let cursor = start;
  while (cursor < end && data[cursor] !== 0) cursor += 1;
  if (cursor >= end) return null;
  try {
    return {
      value: decodeUtf8(data.subarray(start, cursor)),
      next: cursor + 1,
    };
  } catch {
    return null;
  }
};

interface ParsedGeometry extends ParsedWePuppetMesh, ParsedWePuppetSkin {
  vertexCount: number;
  endOffset: number;
}

const parseGeometry = (data: Uint8Array): ParsedGeometry | null => {
  if (data.byteLength < 32 || ascii(data, 0, 8) !== MDL_MAGIC) return null;

  const markerOffset = findUint32Le(data, PUPPET_VERTEX_FORMAT, 8, 512);
  if (markerOffset < 0 || markerOffset + 8 > data.byteLength) return null;

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const vertexByteLength = view.getUint32(markerOffset + 4, true);
  if (
    vertexByteLength === 0
    || vertexByteLength % PUPPET_VERTEX_STRIDE_BYTES !== 0
    || markerOffset + 8 + vertexByteLength + 4 > data.byteLength
  ) return null;

  const vertexCount = vertexByteLength / PUPPET_VERTEX_STRIDE_BYTES;
  const vertexStart = markerOffset + 8;
  const indexLengthOffset = vertexStart + vertexByteLength;
  const indexByteLength = view.getUint32(indexLengthOffset, true);
  if (
    indexByteLength === 0
    || indexByteLength % 6 !== 0
    || indexLengthOffset + 4 + indexByteLength > data.byteLength
  ) return null;

  const positions: number[] = new Array(vertexCount * 2);
  const positions3d: number[] = new Array(vertexCount * 3);
  const uvs: number[] = new Array(vertexCount * 2);
  const boneIndices: number[] = new Array(vertexCount * BONE_INFLUENCE_COUNT);
  const boneWeights: number[] = new Array(vertexCount * BONE_INFLUENCE_COUNT);
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < vertexCount; index += 1) {
    const offset = vertexStart + index * PUPPET_VERTEX_STRIDE_BYTES;
    const x = view.getFloat32(offset + POSITION_X_OFFSET, true);
    const y = view.getFloat32(offset + POSITION_Y_OFFSET, true);
    const z = view.getFloat32(offset + POSITION_Z_OFFSET, true);
    const u = view.getFloat32(offset + UV_U_OFFSET, true);
    const v = view.getFloat32(offset + UV_V_OFFSET, true);
    if (![x, y, z, u, v].every(Number.isFinite)) return null;
    positions[index * 2] = x;
    positions[index * 2 + 1] = y;
    positions3d[index * 3] = x;
    positions3d[index * 3 + 1] = y;
    positions3d[index * 3 + 2] = z;
    uvs[index * 2] = u;
    uvs[index * 2 + 1] = v;
    for (let influence = 0; influence < BONE_INFLUENCE_COUNT; influence += 1) {
      const weight = view.getFloat32(offset + BONE_WEIGHT_OFFSET + influence * 4, true);
      if (!Number.isFinite(weight)) return null;
      boneIndices[index * BONE_INFLUENCE_COUNT + influence] = view.getUint32(
        offset + BONE_INDEX_OFFSET + influence * 4,
        true,
      );
      boneWeights[index * BONE_INFLUENCE_COUNT + influence] = weight;
    }
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  if (!(maxX > minX) || !(maxY > minY)) return null;

  const indexCount = indexByteLength / 2;
  const indices: number[] = new Array(indexCount);
  const indexStart = indexLengthOffset + 4;
  for (let index = 0; index < indexCount; index += 1) {
    const vertexIndex = view.getUint16(indexStart + index * 2, true);
    if (vertexIndex >= vertexCount) return null;
    indices[index] = vertexIndex;
  }

  return {
    positions,
    positions3d,
    uvs,
    indices,
    boneIndices,
    boneWeights,
    bounds: { minX, minY, maxX, maxY },
    vertexCount,
    endOffset: indexStart + indexByteLength,
  };
};

const parseSkeleton = (
  data: Uint8Array,
  searchStart: number,
): { bones: ParsedWePuppetBone[]; animationOffset: number } | null => {
  const markerOffset = findAscii(data, SKELETON_MAGIC, searchStart);
  if (markerOffset < 0 || markerOffset + SKELETON_MAGIC.length + 1 + 8 > data.byteLength) return null;
  if (data[markerOffset + SKELETON_MAGIC.length] !== 0) return null;

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let cursor = markerOffset + SKELETON_MAGIC.length + 1;
  const animationOffset = view.getUint32(cursor, true);
  cursor += 4;
  const boneCount = view.getUint32(cursor, true);
  cursor += 4;
  if (boneCount === 0 || boneCount > 4096 || animationOffset <= cursor || animationOffset > data.byteLength) return null;

  const bones: ParsedWePuppetBone[] = [];
  for (let boneIndex = 0; boneIndex < boneCount; boneIndex += 1) {
    if (cursor + 13 > animationOffset) return null;
    // The leading byte and bone type are retained by WE but are not needed for
    // reference-pose skinning. Parent + local bind matrix are the stable fields.
    cursor += 1;
    cursor += 4;
    const rawParentIndex = view.getUint32(cursor, true);
    cursor += 4;
    const matrixByteLength = view.getUint32(cursor, true);
    cursor += 4;
    if (matrixByteLength < 64 || matrixByteLength % 4 !== 0 || cursor + matrixByteLength > animationOffset) return null;

    const bindMatrix: number[] = new Array(16);
    for (let index = 0; index < 16; index += 1) {
      const value = view.getFloat32(cursor + index * 4, true);
      if (!Number.isFinite(value)) return null;
      bindMatrix[index] = value;
    }
    cursor += matrixByteLength;

    const info = readCString(data, cursor, animationOffset);
    if (!info) return null;
    cursor = info.next;

    const parentIndex = rawParentIndex === ROOT_BONE_INDEX ? -1 : rawParentIndex;
    if (parentIndex >= boneCount || parentIndex === boneIndex) return null;
    bones.push({ parentIndex, bindMatrix });
  }

  return { bones, animationOffset };
};

const resolveAnimationSection = (
  data: Uint8Array,
  animationOffset: number,
  boneCount: number,
): { animationOffset: number; attachments: ParsedWePuppetAttachment[] } | null => {
  if (animationOffset < 0 || animationOffset >= data.byteLength) return null;
  if (ascii(data, animationOffset, ANIMATION_MAGIC.length) === ANIMATION_MAGIC) {
    return { animationOffset, attachments: [] };
  }

  // MDAT0001 is a real Puppet attachment container, not merely padding before
  // MDLA. Layout observed in the authored format is:
  //   tag + nested-MDLA absolute offset + uint16 attachment count +
  //   repeated { uint16 bone index, UTF-8 C string name, mat4 local transform }.
  // Scene objects reference these names through their `attachment` property.
  if (
    animationOffset + ANIMATION_DATA_MAGIC.length + 1 + 4 + 2 <= data.byteLength
    && ascii(data, animationOffset, ANIMATION_DATA_MAGIC.length) === ANIMATION_DATA_MAGIC
    && data[animationOffset + ANIMATION_DATA_MAGIC.length] === 0
  ) {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let cursor = animationOffset + ANIMATION_DATA_MAGIC.length + 1;
    const nestedOffset = view.getUint32(cursor, true);
    cursor += 4;
    if (
      nestedOffset <= cursor
      || nestedOffset + ANIMATION_MAGIC.length + 1 > data.byteLength
      || ascii(data, nestedOffset, ANIMATION_MAGIC.length) !== ANIMATION_MAGIC
      || data[nestedOffset + ANIMATION_MAGIC.length] !== 0
    ) return null;

    const attachmentCount = view.getUint16(cursor, true);
    cursor += 2;
    if (attachmentCount > 4096) return null;
    const attachments: ParsedWePuppetAttachment[] = [];
    for (let attachmentIndex = 0; attachmentIndex < attachmentCount; attachmentIndex += 1) {
      if (cursor + 2 > nestedOffset) return null;
      const boneIndex = view.getUint16(cursor, true);
      cursor += 2;
      if (boneIndex >= boneCount) return null;
      const name = readCString(data, cursor, nestedOffset);
      if (!name || !name.value) return null;
      cursor = name.next;
      if (cursor + 64 > nestedOffset) return null;
      const localMatrix: number[] = new Array(16);
      for (let matrixIndex = 0; matrixIndex < 16; matrixIndex += 1) {
        const value = view.getFloat32(cursor + matrixIndex * 4, true);
        if (!Number.isFinite(value)) return null;
        localMatrix[matrixIndex] = value;
      }
      cursor += 64;
      attachments.push({ name: name.value, boneIndex, localMatrix });
    }
    if (cursor !== nestedOffset) return null;
    return { animationOffset: nestedOffset, attachments };
  }

  return null;
};

const parseAnimations = (
  data: Uint8Array,
  animationOffset: number,
  expectedBoneCount: number,
): ParsedWePuppetAnimation[] | null => {
  if (
    animationOffset < 0
    || animationOffset + ANIMATION_MAGIC.length + 1 + 8 > data.byteLength
    || ascii(data, animationOffset, ANIMATION_MAGIC.length) !== ANIMATION_MAGIC
    || data[animationOffset + ANIMATION_MAGIC.length] !== 0
  ) return null;

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let cursor = animationOffset + ANIMATION_MAGIC.length + 1;
  const animationEndOffset = view.getUint32(cursor, true);
  cursor += 4;
  const animationCount = view.getUint32(cursor, true);
  cursor += 4;
  if (
    animationCount > 4096
    || animationEndOffset < cursor
    || animationEndOffset > data.byteLength
  ) return null;

  const animations: ParsedWePuppetAnimation[] = [];
  for (let animationIndex = 0; animationIndex < animationCount; animationIndex += 1) {
    if (cursor + 8 > animationEndOffset) return null;
    const id = view.getUint32(cursor, true);
    cursor += 4;
    cursor += 4; // currently zero in the MDLA0006 corpus

    const name = readCString(data, cursor, animationEndOffset);
    if (!name) return null;
    cursor = name.next;
    const loopMode = readCString(data, cursor, animationEndOffset);
    if (!loopMode) return null;
    cursor = loopMode.next;

    if (cursor + 16 > animationEndOffset) return null;
    const fps = view.getFloat32(cursor, true);
    cursor += 4;
    const frameCount = view.getUint32(cursor, true);
    cursor += 4;
    cursor += 4; // currently zero in the MDLA0006 corpus
    const boneCount = view.getUint32(cursor, true);
    cursor += 4;
    if (!Number.isFinite(fps) || fps <= 0 || frameCount === 0 || boneCount !== expectedBoneCount) return null;

    const sampleCount = frameCount + 1;
    const expectedTrackByteLength = sampleCount * TRANSFORM_BYTE_LENGTH;
    const tracks: ParsedWePuppetAnimationTrack[] = [];
    for (let boneIndex = 0; boneIndex < boneCount; boneIndex += 1) {
      if (cursor + 8 > animationEndOffset) return null;
      cursor += 4; // per-track flag/unknown; zero in the current corpus
      const trackByteLength = view.getUint32(cursor, true);
      cursor += 4;
      if (trackByteLength !== expectedTrackByteLength || cursor + trackByteLength > animationEndOffset) return null;

      const values = new Float32Array(sampleCount * TRANSFORM_FLOAT_COUNT);
      for (let valueIndex = 0; valueIndex < values.length; valueIndex += 1) {
        const value = view.getFloat32(cursor + valueIndex * 4, true);
        if (!Number.isFinite(value)) return null;
        values[valueIndex] = value;
      }
      cursor += trackByteLength;
      tracks.push({ values });
    }

    if (cursor + ANIMATION_FOOTER_BYTES > animationEndOffset) return null;
    for (let index = 0; index < ANIMATION_FOOTER_BYTES; index += 1) {
      if (data[cursor + index] !== 0) return null;
    }
    cursor += ANIMATION_FOOTER_BYTES;

    animations.push({
      id,
      name: name.value,
      loopMode: loopMode.value,
      fps,
      frameCount,
      tracks,
    });
  }

  return cursor === animationEndOffset ? animations : null;
};

/**
 * Parse the static/reference-pose geometry stored in Wallpaper Engine puppet
 * MDLV0023 models.
 *
 * The supported geometry layout has been validated across the supplied corpus:
 * a vertex-format tag, byte-sized 80-byte vertex buffer, followed by a byte-sized
 * Uint16 triangle index buffer. This entry point intentionally remains usable
 * even if a future/older skeleton section cannot yet be decoded.
 */
export const parseWallpaperEnginePuppetMesh = (data: Uint8Array): ParsedWePuppetMesh | null => {
  const geometry = parseGeometry(data);
  if (!geometry) return null;
  return {
    positions: geometry.positions,
    positions3d: geometry.positions3d,
    uvs: geometry.uvs,
    indices: geometry.indices,
    bounds: geometry.bounds,
  };
};

/**
 * Parse the MDLV0023 sections required for CPU reference-pose skinning:
 * geometry + two-bone vertex weights, MDLS0004 hierarchy/bind matrices and
 * MDLA0006 sampled local TRS animation tracks.
 *
 * Animation IDs are retained exactly because scene `animationlayers[].animation`
 * references these IDs; file order/name is not a stable selector.
 */
export const parseWallpaperEnginePuppetModel = (data: Uint8Array): ParsedWePuppetModel | null => {
  const geometry = parseGeometry(data);
  if (!geometry) return null;
  const skeleton = parseSkeleton(data, geometry.endOffset);
  if (!skeleton) return null;
  const animationSection = resolveAnimationSection(data, skeleton.animationOffset, skeleton.bones.length);
  if (!animationSection) return null;
  const animations = parseAnimations(data, animationSection.animationOffset, skeleton.bones.length);
  if (!animations) return null;

  for (let vertex = 0; vertex < geometry.vertexCount; vertex += 1) {
    for (let influence = 0; influence < BONE_INFLUENCE_COUNT; influence += 1) {
      const offset = vertex * BONE_INFLUENCE_COUNT + influence;
      if (Math.abs(geometry.boneWeights[offset]) > 0.000001 && geometry.boneIndices[offset] >= skeleton.bones.length) return null;
    }
  }

  return {
    positions: geometry.positions,
    positions3d: geometry.positions3d,
    uvs: geometry.uvs,
    indices: geometry.indices,
    bounds: geometry.bounds,
    boneIndices: geometry.boneIndices,
    boneWeights: geometry.boneWeights,
    bones: skeleton.bones,
    attachments: animationSection.attachments,
    animations,
  };
};
