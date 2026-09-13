/**
 * Wallpaper Engine `scene.pkg` binary reader (browser port).
 *
 * Ported from dsh-wallpaper-engine `lib/pkg-extract.js` (MIT), which in turn
 * follows the public RePKG / linux-wallpaperengine reverse engineering of the
 * Wallpaper Engine container formats.
 *
 * This module is deliberately dependency-free and synchronous: it only reads
 * bytes and never touches the DOM. The async materialization step lives in
 * `wallpaperEnginePkgImport`.
 *
 * Formats handled here:
 *
 * - **PKGV0001 container** (`scene.pkg`): int32-length-prefixed magic, int32
 *   entry count, then per entry a length-prefixed path plus uint32
 *   offset/length relative to the end of the index. Some packers store entries
 *   as LZ4 block chains (int64 original size, then repeated
 *   [int32 uncompressed][int32 compressed][LZ4 block]); `parseWallpaperEnginePkg`
 *   probes for a perfectly-fitting chain and flags those entries.
 * - **TEX container** (`.tex`): `TEXV0005` -> `TEXI0001` image info ->
 *   `TEXB0001..4` mipmap data -> `TEXS0001..3` frame table (animated textures).
 * - **Payloads**: RGBA8888 / R8 / RG88 / DXT1 / DXT3 / DXT5, plus embedded
 *   JPEG / PNG / MP4 payloads (WE stores photographic art as a complete image
 *   file inside the mip data).
 *
 * Only the first mipmap of each image is retained. WE pads mipmaps to
 * power-of-two sizes, so decoded pixels are cropped back to the `TEXI` image
 * rect (top-left anchored) — otherwise a 1920x1080 layer would be reported as
 * 2048x2048 and every downstream size calculation would be wrong.
 */

/** Hard ceilings driven by untrusted Workshop file content. */
const MAX_PKG_ENTRY_COUNT = 0x100000;
const MAX_PKG_ENTRY_BYTES = 512 * 1024 * 1024;
const MAX_DECOMPRESSED_BYTES = 256 * 1024 * 1024;
const MAX_TEX_DIMENSION = 16384;
const MAX_TEX_IMAGE_COUNT = 256;
const MAX_TEX_MIPMAP_COUNT = 32;
const MAX_TEX_FRAME_COUNT = 4096;

/** `PkgEntry.flags` bit marking LZ4 block-chain storage. */
export const WE_PKG_ENTRY_FLAG_LZ4 = 1;

/** Wallpaper Engine texture format ids (`TEXI0001` header), per RePKG/lwe. */
export const WeTexFormat = {
  RGBA8888: 0,
  RGB888: 1,
  RGB565: 2,
  DXT5: 4,
  DXT3: 6,
  DXT1: 7,
  RG88: 8,
  R8: 9,
  RG1616F: 10,
  R16F: 11,
  BC7: 12,
  RGBA1010102: 13,
  RGBA16161616F: 14,
  RGB161616F: 15,
} as const;

const TEX_FORMAT_NAMES: Record<number, string> = {
  0: 'RGBA8888',
  1: 'RGB888',
  2: 'RGB565',
  4: 'DXT5',
  6: 'DXT3',
  7: 'DXT1',
  8: 'RG88',
  9: 'R8',
  10: 'RG1616F',
  11: 'R16F',
  12: 'BC7',
  13: 'RGBA1010102',
  14: 'RGBA16161616F',
  15: 'RGB161616F',
};

/** `TEXI0001` flags bit marking an animated (sprite-sheet / gif) texture. */
const TEX_FLAG_IS_GIF = 4;

const textDecoder = new TextDecoder('utf-8');

/**
 * Raised when a texture uses a format this build recognizes but cannot decode
 * (BC7, 16-bit float). Callers treat it as "not supported here" rather than a
 * corrupt file, so a scene never renders a partially decoded frame for it.
 */
export class WeTexUnsupportedError extends Error {
  readonly format: number;
  readonly formatName: string;
  constructor(format: number) {
    super(`tex: unsupported format ${format}`);
    this.name = 'WeTexUnsupportedError';
    this.format = format;
    this.formatName = TEX_FORMAT_NAMES[format] ?? `unknown(${format})`;
  }
}

/** Bounds-checked little-endian binary reader. */
class Reader {
  private readonly data: Uint8Array;
  private readonly label: string;
  private readonly view: DataView;
  private pos = 0;

  constructor(data: Uint8Array, label: string) {
    this.data = data;
    this.label = label;
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }

  get remaining(): number {
    return this.view.byteLength - this.pos;
  }

  /** Current read cursor; used to locate the payload area after the index. */
  get position(): number {
    return this.pos;
  }

  private need(n: number): void {
    if (n < 0 || this.pos + n > this.view.byteLength) {
      throw new Error(`${this.label}: unexpected end of data`);
    }
  }

  i32(): number {
    this.need(4);
    const value = this.view.getInt32(this.pos, true);
    this.pos += 4;
    return value;
  }

  u32(): number {
    this.need(4);
    const value = this.view.getUint32(this.pos, true);
    this.pos += 4;
    return value;
  }

  f32(): number {
    this.need(4);
    const value = this.view.getFloat32(this.pos, true);
    this.pos += 4;
    return value;
  }

  /** Unsigned 64-bit integer; exact up to 2^53. */
  u64(): number {
    const low = this.u32();
    return this.u32() * 0x100000000 + low;
  }

  bytes(n: number): Uint8Array {
    this.need(n);
    const out = this.data.subarray(this.pos, this.pos + n);
    this.pos += n;
    return out;
  }

  /** Skip `n` bytes without materializing them. */
  skip(n: number): void {
    this.need(n);
    this.pos += n;
  }

  /** int32-length-prefixed UTF-8 string (PKG magic and entry paths). */
  sizedString(maxLength: number): string {
    const length = this.i32();
    if (length < 0 || length > maxLength) {
      throw new Error(`${this.label}: invalid string length ${length}`);
    }
    return textDecoder.decode(this.bytes(length));
  }

  /** NUL-terminated string (all TEX magics and the TEXB0004 condition blob). */
  nstring(maxLength: number): string {
    const start = this.pos;
    const limit = Math.min(this.view.byteLength, start + maxLength);
    let end = start;
    while (end < limit && this.view.getUint8(end) !== 0) end += 1;
    if (end >= limit) throw new Error(`${this.label}: unterminated string`);
    const out = textDecoder.decode(this.data.subarray(start, end));
    this.pos = end + 1;
    return out;
  }
}

/**
 * Decompress one raw LZ4 block (the format inside PKG entry chains and TEXB
 * mipmaps) following the official lz4 block format specification.
 *
 * @param src compressed block bytes
 * @param dstSize exact expected decompressed size
 */
export const decompressLz4Block = (src: Uint8Array, dstSize: number): Uint8Array => {
  if (dstSize < 0 || dstSize > MAX_DECOMPRESSED_BYTES) {
    throw new Error(`lz4: decompressed size out of bounds (${dstSize})`);
  }
  const dst = new Uint8Array(dstSize);
  let ip = 0;
  let op = 0;

  while (ip < src.length) {
    const token = src[ip++];

    let literalLength = token >> 4;
    if (literalLength === 15) {
      let step = 0;
      do {
        if (ip >= src.length) throw new Error('lz4: truncated literal length');
        step = src[ip++];
        literalLength += step;
      } while (step === 255);
    }
    if (ip + literalLength > src.length || op + literalLength > dstSize) {
      throw new Error('lz4: literal run out of bounds');
    }
    dst.set(src.subarray(ip, ip + literalLength), op);
    ip += literalLength;
    op += literalLength;

    // Last sequence carries literals only.
    if (ip >= src.length) break;

    if (ip + 2 > src.length) throw new Error('lz4: truncated match offset');
    const offset = src[ip] | (src[ip + 1] << 8);
    ip += 2;
    if (offset === 0 || offset > op) throw new Error(`lz4: invalid match offset ${offset}`);

    let matchLength = token & 0x0f;
    if (matchLength === 15) {
      let step = 0;
      do {
        if (ip >= src.length) throw new Error('lz4: truncated match length');
        step = src[ip++];
        matchLength += step;
      } while (step === 255);
    }
    matchLength += 4;
    if (op + matchLength > dstSize) throw new Error('lz4: match run out of bounds');
    for (let i = 0; i < matchLength; i += 1) {
      dst[op] = dst[op - offset];
      op += 1;
    }
  }

  if (op !== dstSize) {
    throw new Error(`lz4: decompressed size mismatch (got ${op}, expected ${dstSize})`);
  }
  return dst;
};

// ── PKGV container ───────────────────────────────────────────────────────────

export interface WePkgEntry {
  path: string;
  /** Absolute offset of the entry payload inside the pkg buffer. */
  offset: number;
  /** Stored byte length (compressed when `flags` has WE_PKG_ENTRY_FLAG_LZ4). */
  compressedSize: number;
  /** Decompressed byte length; equals `compressedSize` for raw entries. */
  size: number;
  flags: number;
}

/**
 * Probe whether the entry data at [abs, abs+length) is an LZ4 block chain:
 * int64 original size followed by [int32 uncompressed][int32 compressed][block]
 * records that reconstruct exactly `originalSize` bytes while consuming the
 * entry to the byte. Returns the original size when the chain fits perfectly.
 */
const probeCompressedEntry = (data: Uint8Array, abs: number, length: number): number | null => {
  if (length < 8) return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const originalSize = view.getUint32(abs, true) + view.getUint32(abs + 4, true) * 0x100000000;
  // Compression only ever wins space, so a larger "original" is raw data.
  if (originalSize <= length || originalSize > 0x7fffffff) return null;

  let pos = abs + 8;
  let total = 0;
  while (total < originalSize) {
    if (pos + 8 > abs + length) return null;
    const uncompressed = view.getInt32(pos, true);
    const compressed = view.getInt32(pos + 4, true);
    if (uncompressed <= 0 || compressed <= 0 || pos + 8 + compressed > abs + length) return null;
    total += uncompressed;
    pos += 8 + compressed;
  }
  return total === originalSize && pos === abs + length ? originalSize : null;
};

/** True when the buffer starts with a PKGV container magic. */
export const isWallpaperEnginePkg = (data: Uint8Array): boolean => {
  if (data.length < 12) return false;
  try {
    const probe = new Reader(data, 'pkg');
    return /^PKGV\d{4}$/.test(probe.sizedString(32));
  } catch {
    return false;
  }
};

/** Parse a PKGV container and return its entry index. */
export const parseWallpaperEnginePkg = (data: Uint8Array): WePkgEntry[] => {
  const reader = new Reader(data, 'pkg');
  const magic = reader.sizedString(32);
  if (!/^PKGV\d{4}$/.test(magic)) throw new Error(`pkg: bad magic '${magic}'`);

  const count = reader.i32();
  if (count < 0 || count > MAX_PKG_ENTRY_COUNT) throw new Error(`pkg: invalid entry count ${count}`);

  const index: Array<{ path: string; offset: number; length: number }> = [];
  for (let i = 0; i < count; i += 1) {
    index.push({
      path: reader.sizedString(1024),
      offset: reader.u32(),
      length: reader.u32(),
    });
  }

  const dataStart = reader.position;
  return index.map(({ path, offset, length }) => {
    const abs = dataStart + offset;
    if (abs + length > data.byteLength) throw new Error(`pkg: entry '${path}' out of bounds`);
    const originalSize = probeCompressedEntry(data, abs, length);
    return originalSize === null
      ? { path, offset: abs, compressedSize: length, size: length, flags: 0 }
      : {
        path,
        offset: abs,
        compressedSize: length,
        size: originalSize,
        flags: WE_PKG_ENTRY_FLAG_LZ4,
      };
  });
};

/** Extract (and decompress when needed) one package entry. */
export const readWallpaperEnginePkgEntry = (data: Uint8Array, entry: WePkgEntry): Uint8Array => {
  const abs = entry.offset;
  if (abs < 0 || abs + entry.compressedSize > data.byteLength) {
    throw new Error(`pkg: entry '${entry.path}' out of bounds`);
  }
  if ((entry.flags & WE_PKG_ENTRY_FLAG_LZ4) === 0) {
    return data.slice(abs, abs + entry.compressedSize);
  }
  if (entry.size > MAX_PKG_ENTRY_BYTES) {
    throw new Error(`pkg: entry '${entry.path}' too large (${entry.size} bytes)`);
  }

  const reader = new Reader(data.subarray(abs, abs + entry.compressedSize), 'pkg');
  if (reader.u64() !== entry.size) throw new Error(`pkg: entry '${entry.path}' size mismatch`);

  const out = new Uint8Array(entry.size);
  let written = 0;
  while (written < entry.size) {
    const uncompressed = reader.i32();
    const compressed = reader.i32();
    if (uncompressed <= 0 || compressed <= 0 || written + uncompressed > entry.size) {
      throw new Error(`pkg: corrupt compressed entry '${entry.path}'`);
    }
    out.set(decompressLz4Block(reader.bytes(compressed), uncompressed), written);
    written += uncompressed;
  }
  if (reader.remaining !== 0) throw new Error(`pkg: corrupt compressed entry '${entry.path}'`);
  return out;
};

// ── TEX container ────────────────────────────────────────────────────────────

export interface WeTexMipmap {
  width: number;
  height: number;
  bytes: Uint8Array;
}

export interface WeTexFrame {
  /** Index into `images` that this frame displays. */
  imageId: number;
  frametime: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WeTexContainer {
  /** Raw `TEXI0001` format id. */
  format: number;
  flags: number;
  /** Declared image rect — the real content size, padding already excluded. */
  width: number;
  height: number;
  isAnimatedGif: boolean;
  isVideoMp4: boolean;
  frames: WeTexFrame[];
  /** First (largest) mipmap of every stored image, in container order. */
  images: WeTexMipmap[];
}

/**
 * Read one mipmap record, advancing past it.
 *
 * `keep` false still parses the header (the mipmap chain is variable-length and
 * must be walked to reach the next image) but skips decompression entirely —
 * mip levels below the first are never rendered here.
 */
const readMipmap = (reader: Reader, containerVersion: number, keep: boolean): WeTexMipmap | null => {
  if (containerVersion === 4) {
    // TEXB0004 mipmap preamble (editor-only metadata, per RePKG).
    const param1 = reader.i32();
    const param2 = reader.i32();
    reader.nstring(1 << 20);
    const param3 = reader.i32();
    if (param1 !== 1 || param2 !== 2 || param3 !== 1) {
      throw new Error('tex: bad TEXB0004 mipmap params');
    }
  }

  const width = reader.i32();
  const height = reader.i32();
  if (width <= 0 || height <= 0 || width > MAX_TEX_DIMENSION || height > MAX_TEX_DIMENSION) {
    throw new Error(`tex: invalid mipmap dimensions ${width}x${height}`);
  }

  if (containerVersion === 1) {
    const byteLength = reader.i32();
    if (!keep) {
      reader.skip(byteLength);
      return null;
    }
    return { width, height, bytes: reader.bytes(byteLength) };
  }

  const isLz4 = reader.i32() === 1;
  const decompressedCount = reader.i32();
  const storedLength = reader.i32();
  if (!keep) {
    reader.skip(storedLength);
    return null;
  }

  const stored = reader.bytes(storedLength);
  return isLz4
    ? { width, height, bytes: decompressLz4Block(stored, decompressedCount) }
    : { width, height, bytes: stored };
};

const readTexFrames = (reader: Reader): WeTexFrame[] => {
  const frameMagic = reader.nstring(16);
  const frameMatch = /^TEXS000([1-3])$/.exec(frameMagic);
  if (!frameMatch) throw new Error(`tex: bad frame container magic '${frameMagic}'`);
  const frameVersion = Number(frameMatch[1]);

  const frameCount = reader.i32();
  if (frameCount < 0 || frameCount > MAX_TEX_FRAME_COUNT) {
    throw new Error(`tex: invalid frame count ${frameCount}`);
  }
  if (frameVersion === 3) {
    reader.i32(); // gif width
    reader.i32(); // gif height
  }

  const frames: WeTexFrame[] = [];
  for (let i = 0; i < frameCount; i += 1) {
    const imageId = reader.i32();
    const frametime = reader.f32();
    if (frameVersion === 1) {
      const x = reader.i32();
      const y = reader.i32();
      const width = reader.i32();
      reader.i32(); // widthY
      reader.i32(); // heightX
      const height = reader.i32();
      frames.push({ imageId, frametime, x, y, width, height });
    } else {
      const x = reader.f32();
      const y = reader.f32();
      const width = reader.f32();
      reader.f32(); // widthY
      reader.f32(); // heightX
      const height = reader.f32();
      frames.push({ imageId, frametime, x, y, width, height });
    }
  }
  return frames;
};

/** Parse a TEX container, retaining the first mipmap of every image. */
export const parseWallpaperEngineTex = (data: Uint8Array): WeTexContainer => {
  const reader = new Reader(data, 'tex');

  const magic1 = reader.nstring(16);
  if (magic1 !== 'TEXV0005') throw new Error(`tex: bad magic '${magic1}'`);
  const magic2 = reader.nstring(16);
  if (magic2 !== 'TEXI0001') throw new Error(`tex: bad image-info magic '${magic2}'`);

  const format = reader.i32();
  const flags = reader.i32();
  const textureWidth = reader.i32();
  const textureHeight = reader.i32();
  const imageWidth = reader.i32();
  const imageHeight = reader.i32();
  reader.u32(); // unknown

  if (TEX_FORMAT_NAMES[format] === undefined) throw new WeTexUnsupportedError(format);

  const containerMagic = reader.nstring(16);
  const containerMatch = /^TEXB000([1-4])$/.exec(containerMagic);
  if (!containerMatch) throw new Error(`tex: bad mipmap container magic '${containerMagic}'`);

  let containerVersion = Number(containerMatch[1]);
  const imageCount = reader.i32();
  if (imageCount <= 0 || imageCount > MAX_TEX_IMAGE_COUNT) {
    throw new Error(`tex: invalid image count ${imageCount}`);
  }

  let isVideoMp4 = false;
  if (containerVersion === 3) {
    reader.i32(); // FreeImage format of the embedded payload
  } else if (containerVersion === 4) {
    const freeImageFormat = reader.i32();
    isVideoMp4 = reader.i32() === 1;
    // Only an unknown FreeImage format plus the video flag keeps the TEXB0004
    // mipmap layout; everything else falls back to TEXB0003 (per RePKG).
    if (!(freeImageFormat === -1 && isVideoMp4)) containerVersion = 3;
  }

  const images: WeTexMipmap[] = [];
  for (let i = 0; i < imageCount; i += 1) {
    const mipmapCount = reader.i32();
    if (mipmapCount <= 0 || mipmapCount > MAX_TEX_MIPMAP_COUNT) {
      throw new Error(`tex: invalid mipmap count ${mipmapCount}`);
    }
    for (let j = 0; j < mipmapCount; j += 1) {
      const mipmap = readMipmap(reader, containerVersion, j === 0);
      if (mipmap) images.push(mipmap);
    }
  }

  const isAnimatedGif = (flags & TEX_FLAG_IS_GIF) !== 0;
  const frames = isAnimatedGif ? readTexFrames(reader) : [];

  const first = images[0];
  const width = imageWidth > 0 ? imageWidth : textureWidth > 0 ? textureWidth : first.width;
  const height = imageHeight > 0 ? imageHeight : textureHeight > 0 ? textureHeight : first.height;

  return {
    format,
    flags,
    width,
    height,
    isAnimatedGif,
    isVideoMp4,
    frames,
    images,
  };
};

// ── Payload decoding ─────────────────────────────────────────────────────────

export type WeDecodedTexPayload =
  /** Complete image file stored inside the mip data — handed back untouched. */
  | { kind: 'passThrough'; bytes: Uint8Array; extension: '.jpg' | '.png' }
  | { kind: 'rgba'; width: number; height: number; rgba: Uint8Array };

/** Matches the two-byte SOI check the reference pipeline already uses. */
const isJpegPayload = (bytes: Uint8Array): boolean => (
  bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8
);

const isPngPayload = (bytes: Uint8Array): boolean => (
  bytes.length >= 8
  && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
);

/**
 * Detect an embedded MP4 payload. MP4 boxes start with a big-endian u32 length
 * followed by 'ftyp'; the size sanity check matters because raw RGBA pixels can
 * coincidentally spell 'ftyp'.
 */
const isMp4Payload = (bytes: Uint8Array): boolean => {
  if (bytes.length < 12) return false;
  const boxSize = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
  return boxSize >= 12 && boxSize <= bytes.length
    && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
};

const rgb565 = (value: number): [number, number, number] => {
  const r = (value >> 11) & 31;
  const g = (value >> 5) & 63;
  const b = value & 31;
  return [(r << 3) | (r >> 2), (g << 2) | (g >> 4), (b << 3) | (b >> 2)];
};

/** Build the 4-colour BC palette; three-colour + transparent when c0 <= c1. */
const buildColorPalette = (c0: number, c1: number, fourColor: boolean): Uint8Array => {
  const palette = new Uint8Array(16);
  const [r0, g0, b0] = rgb565(c0);
  const [r1, g1, b1] = rgb565(c1);
  palette.set([r0, g0, b0, 255], 0);
  palette.set([r1, g1, b1, 255], 4);
  if (fourColor) {
    palette.set([((2 * r0 + r1) / 3) | 0, ((2 * g0 + g1) / 3) | 0, ((2 * b0 + b1) / 3) | 0, 255], 8);
    palette.set([((r0 + 2 * r1) / 3) | 0, ((g0 + 2 * g1) / 3) | 0, ((b0 + 2 * b1) / 3) | 0, 255], 12);
  } else {
    palette.set([((r0 + r1) / 2) | 0, ((g0 + g1) / 2) | 0, ((b0 + b1) / 2) | 0, 255], 8);
    palette.set([0, 0, 0, 0], 12);
  }
  return palette;
};

/** Shared BC1/BC2/BC3 block walker (blockStride 8 for BC1, 16 for BC2/BC3). */
const decodeColorBlocks = (
  src: Uint8Array,
  out: Uint8Array,
  width: number,
  height: number,
  blockStride: number,
  colorOffset: number,
  dxt1Alpha: boolean,
): void => {
  const view = new DataView(src.buffer, src.byteOffset, src.byteLength);
  const blocksX = Math.ceil(width / 4);
  const blocksY = Math.ceil(height / 4);
  for (let by = 0; by < blocksY; by += 1) {
    for (let bx = 0; bx < blocksX; bx += 1) {
      const base = (by * blocksX + bx) * blockStride;
      const c0 = view.getUint16(base + colorOffset, true);
      const c1 = view.getUint16(base + colorOffset + 2, true);
      const palette = buildColorPalette(c0, c1, dxt1Alpha ? c0 > c1 : true);
      const indices = view.getUint32(base + colorOffset + 4, true);
      for (let py = 0; py < 4; py += 1) {
        for (let px = 0; px < 4; px += 1) {
          const x = bx * 4 + px;
          const y = by * 4 + py;
          if (x >= width || y >= height) continue;
          const selector = (indices >> (2 * (py * 4 + px))) & 3;
          const dst = (y * width + x) * 4;
          out[dst] = palette[selector * 4];
          out[dst + 1] = palette[selector * 4 + 1];
          out[dst + 2] = palette[selector * 4 + 2];
          out[dst + 3] = palette[selector * 4 + 3];
        }
      }
    }
  }
};

/** BC1 (DXT1): 8-byte blocks, 4x4 pixels, optional 1-bit alpha. */
const decodeDxt1 = (src: Uint8Array, width: number, height: number): Uint8Array => {
  const out = new Uint8Array(width * height * 4);
  decodeColorBlocks(src, out, width, height, 8, 0, true);
  return out;
};

/** BC2 (DXT3): 16-byte blocks, 4-bit explicit alpha + BC1-style colour. */
const decodeDxt3 = (src: Uint8Array, width: number, height: number): Uint8Array => {
  const out = new Uint8Array(width * height * 4);
  decodeColorBlocks(src, out, width, height, 16, 8, false);
  const view = new DataView(src.buffer, src.byteOffset, src.byteLength);
  const blocksX = Math.ceil(width / 4);
  const blocksY = Math.ceil(height / 4);
  for (let by = 0; by < blocksY; by += 1) {
    for (let bx = 0; bx < blocksX; bx += 1) {
      const base = (by * blocksX + bx) * 16;
      const alphaLo = view.getUint32(base, true);
      const alphaHi = view.getUint32(base + 4, true);
      for (let i = 0; i < 16; i += 1) {
        const x = bx * 4 + (i % 4);
        const y = by * 4 + ((i / 4) | 0);
        if (x >= width || y >= height) continue;
        const nibble = i < 8 ? (alphaLo >>> (4 * i)) & 15 : (alphaHi >>> (4 * (i - 8))) & 15;
        out[(y * width + x) * 4 + 3] = nibble * 17;
      }
    }
  }
  return out;
};

/** BC3 (DXT5): 16-byte blocks, interpolated 3-bit alpha + BC1-style colour. */
const decodeDxt5 = (src: Uint8Array, width: number, height: number): Uint8Array => {
  const out = new Uint8Array(width * height * 4);
  decodeColorBlocks(src, out, width, height, 16, 8, false);
  const blocksX = Math.ceil(width / 4);
  const blocksY = Math.ceil(height / 4);
  for (let by = 0; by < blocksY; by += 1) {
    for (let bx = 0; bx < blocksX; bx += 1) {
      const base = (by * blocksX + bx) * 16;
      const a0 = src[base];
      const a1 = src[base + 1];
      const alphas = new Uint8Array(8);
      alphas[0] = a0;
      alphas[1] = a1;
      if (a0 > a1) {
        for (let k = 2; k < 8; k += 1) alphas[k] = (((8 - k) * a0 + (k - 1) * a1) / 7) | 0;
      } else {
        for (let k = 2; k < 6; k += 1) alphas[k] = (((6 - k) * a0 + (k - 2) * a1) / 5) | 0;
        alphas[6] = 0;
        alphas[7] = 255;
      }
      // 48-bit little-endian index stream, 3 bits per pixel (exact in doubles).
      let bits = src[base + 2]
        + src[base + 3] * 0x100
        + src[base + 4] * 0x10000
        + src[base + 5] * 0x1000000
        + src[base + 6] * 0x100000000
        + src[base + 7] * 0x10000000000;
      for (let i = 0; i < 16; i += 1) {
        const x = bx * 4 + (i % 4);
        const y = by * 4 + ((i / 4) | 0);
        const index = bits % 8;
        bits = Math.floor(bits / 8);
        if (x >= width || y >= height) continue;
        out[(y * width + x) * 4 + 3] = alphas[index];
      }
    }
  }
  return out;
};

/**
 * When the declared mipmap size does not match the stored byte count, Wallpaper
 * Engine occasionally stores a downscaled mip while the header keeps the
 * original dimensions. Derive the real size from the data length when a clean
 * factorization exists; otherwise null.
 */
const deriveDimensions = (
  storedBytes: number,
  width: number,
  height: number,
  bytesPerPixel: number,
): { width: number; height: number } | null => {
  for (let w = width; w >= 16; w = Math.floor(w / 2)) {
    const bytesPerRow = w * bytesPerPixel;
    if (storedBytes % bytesPerRow !== 0) continue;
    const h = storedBytes / bytesPerRow;
    if (Number.isInteger(h) && h > 0 && h <= height * 2) return { width: w, height: h };
  }
  return null;
};

/** Crop the power-of-two padding: the TEXI image rect sits top-left. */
const cropToImageRect = (
  decoded: { width: number; height: number; rgba: Uint8Array },
  imageWidth: number,
  imageHeight: number,
): { width: number; height: number; rgba: Uint8Array } => {
  const cropWidth = Math.min(imageWidth, decoded.width);
  const cropHeight = Math.min(imageHeight, decoded.height);
  if (cropWidth <= 0 || cropHeight <= 0) return decoded;
  if (cropWidth === decoded.width && cropHeight === decoded.height) return decoded;

  const cropped = new Uint8Array(cropWidth * cropHeight * 4);
  for (let y = 0; y < cropHeight; y += 1) {
    const srcStart = y * decoded.width * 4;
    cropped.set(decoded.rgba.subarray(srcStart, srcStart + cropWidth * 4), y * cropWidth * 4);
  }
  return { width: cropWidth, height: cropHeight, rgba: cropped };
};

/**
 * Decode one stored image of a TEX container.
 *
 * Embedded JPEG / PNG payloads are returned untouched — zero decode, best
 * fidelity, and the existing reference pipeline already reads their dimensions.
 * Everything else is decoded to RGBA8888 and cropped to the declared image rect.
 *
 * @param imageIndex index into `container.images`
 */
export const decodeWallpaperEngineTexImage = (
  container: WeTexContainer,
  imageIndex: number,
): WeDecodedTexPayload => {
  if (container.isVideoMp4) {
    throw new Error('tex: embedded mp4 video textures cannot be decoded');
  }
  const mipmap = container.images[imageIndex];
  if (!mipmap) throw new Error(`tex: missing image ${imageIndex}`);

  if (isJpegPayload(mipmap.bytes)) {
    return { kind: 'passThrough', bytes: mipmap.bytes, extension: '.jpg' };
  }
  if (isPngPayload(mipmap.bytes)) {
    return { kind: 'passThrough', bytes: mipmap.bytes, extension: '.png' };
  }
  if (isMp4Payload(mipmap.bytes)) {
    throw new Error('tex: embedded mp4 video texture cannot be decoded');
  }

  let { width, height, bytes } = mipmap;
  let rgba: Uint8Array;

  switch (container.format) {
    case WeTexFormat.RGBA8888: {
      if (bytes.length < width * height * 4) {
        const derived = deriveDimensions(bytes.length, width, height, 4);
        if (!derived) throw new Error('tex: mipmap size mismatch for RGBA8888');
        width = derived.width;
        height = derived.height;
      }
      rgba = bytes.slice(0, width * height * 4);
      break;
    }
    case WeTexFormat.R8: {
      if (bytes.length < width * height) {
        const derived = deriveDimensions(bytes.length, width, height, 1);
        if (!derived) throw new Error('tex: mipmap size mismatch for R8');
        width = derived.width;
        height = derived.height;
      }
      rgba = new Uint8Array(width * height * 4);
      for (let i = 0; i < width * height; i += 1) {
        rgba[i * 4] = bytes[i];
        rgba[i * 4 + 1] = bytes[i];
        rgba[i * 4 + 2] = bytes[i];
        rgba[i * 4 + 3] = 255;
      }
      break;
    }
    case WeTexFormat.RG88: {
      if (bytes.length < width * height * 2) {
        const derived = deriveDimensions(bytes.length, width, height, 2);
        if (!derived) throw new Error('tex: mipmap size mismatch for RG88');
        width = derived.width;
        height = derived.height;
      }
      rgba = new Uint8Array(width * height * 4);
      for (let i = 0; i < width * height; i += 1) {
        rgba[i * 4] = bytes[i * 2];
        rgba[i * 4 + 1] = bytes[i * 2 + 1];
        rgba[i * 4 + 2] = 0;
        rgba[i * 4 + 3] = 255;
      }
      break;
    }
    case WeTexFormat.DXT1: {
      if (bytes.length < Math.ceil(width / 4) * Math.ceil(height / 4) * 8) {
        throw new Error('tex: mipmap size mismatch for DXT1');
      }
      rgba = decodeDxt1(bytes, width, height);
      break;
    }
    case WeTexFormat.DXT3: {
      if (bytes.length < Math.ceil(width / 4) * Math.ceil(height / 4) * 16) {
        throw new Error('tex: mipmap size mismatch for DXT3');
      }
      rgba = decodeDxt3(bytes, width, height);
      break;
    }
    case WeTexFormat.DXT5: {
      if (bytes.length < Math.ceil(width / 4) * Math.ceil(height / 4) * 16) {
        throw new Error('tex: mipmap size mismatch for DXT5');
      }
      rgba = decodeDxt5(bytes, width, height);
      break;
    }
    default:
      throw new WeTexUnsupportedError(container.format);
  }

  return {
    kind: 'rgba',
    ...cropToImageRect({ width, height, rgba }, container.width, container.height),
  };
};
