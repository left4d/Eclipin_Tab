/**
 * Wallpaper Engine `scene.pkg` reader / importer tests.
 *
 * Covers the binary layer that lets the extension import a packed scene.pkg
 * without a RePKG round-trip:
 *   - PKGV container index, raw and LZ4 block-chain entries
 *   - LZ4 block decoding
 *   - TEX header parsing, mipmap/padding cropping, frame tables
 *   - payload decoding: RGBA8888 / R8 / RG88 / DXT1 / DXT3 / DXT5, embedded
 *     JPEG/PNG pass-through, embedded MP4 rejection, unsupported formats
 *   - materialization: virtual image entries, frame expansion, canvas encoding
 *
 * `OffscreenCanvas` is stubbed with a real zlib PNG encoder, so the decoded
 * (DXT/raw) path is exercised end to end; every produced file is a valid PNG,
 * which is what the reference pipeline downstream actually parses.
 *
 * Run from the project root or from src/: `node src/tools/run-wallpaper-engine-pkg-tests.mjs`
 */
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';

import {
  createCanvasStub,
  createPngEncoder,
  createTsLoader,
  resolveSourceRoot,
} from './lib/load-ts-module.mjs';

const sourceRoot = resolveSourceRoot();
const load = createTsLoader(sourceRoot);

const encodePng = createPngEncoder(deflateSync);
let canvasEncodeCalls = 0;
const canvasGlobals = createCanvasStub(encodePng, () => { canvasEncodeCalls += 1; });

const reader = load('features/theme/utils/wallpaperEnginePkgReader.ts');
const pkgImport = load('features/theme/utils/wallpaperEnginePkgImport.ts', canvasGlobals);

// ── tiny counting harness ────────────────────────────────────────────────────
let passed = 0;
const failures = [];
let currentSection = '';

const section = (name) => {
  currentSection = name;
  console.log(`\n${name}`);
};

const test = (name, fn) => {
  try {
    fn();
    passed += 1;
  } catch (error) {
    failures.push(`${currentSection} :: ${name}\n      ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`);
  }
};

const testAsync = async (name, fn) => {
  try {
    await fn();
    passed += 1;
  } catch (error) {
    failures.push(`${currentSection} :: ${name}\n      ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`);
  }
};

// ── binary fixture builders ──────────────────────────────────────────────────
const encoder = new TextEncoder();

const concat = (parts) => {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
};

const i32 = (value) => {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setInt32(0, value, true);
  return b;
};

const u32 = (value) => {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, value, true);
  return b;
};

const u64 = (value) => {
  const b = new Uint8Array(8);
  const view = new DataView(b.buffer);
  view.setUint32(0, value % 0x100000000, true);
  view.setUint32(4, Math.floor(value / 0x100000000), true);
  return b;
};

const sizedString = (value) => concat([i32(encoder.encode(value).length), encoder.encode(value)]);
const nstring = (value) => concat([encoder.encode(value), new Uint8Array([0])]);

/** PKGV container from `{ path, stored }` records. */
const buildPkg = (entries) => {
  const header = concat([sizedString('PKGV0001'), i32(entries.length)]);
  const indexParts = [];
  let offset = 0;
  for (const entry of entries) {
    indexParts.push(concat([sizedString(entry.path), u32(offset), u32(entry.stored.length)]));
    offset += entry.stored.length;
  }
  return concat([header, ...indexParts, ...entries.map((e) => e.stored)]);
};

/** Valid LZ4 block: one literal byte then a match covering the remainder. */
const lz4RunBlock = (byte, totalLength) => {
  const encoded = totalLength - 1 - 4;
  const out = [];
  if (encoded >= 15) {
    out.push((1 << 4) | 15, byte, 1, 0);
    let rest = encoded - 15;
    while (rest >= 255) { out.push(255); rest -= 255; }
    out.push(rest);
  } else {
    out.push((1 << 4) | encoded, byte, 1, 0);
  }
  return new Uint8Array(out);
};

/** Wrap an LZ4 block in the int64-size + [uncompressed][compressed][block] chain. */
const wrapCompressedEntry = (originalLength, lz4Block) => concat([
  u64(originalLength),
  i32(originalLength),
  i32(lz4Block.length),
  lz4Block,
]);

/** TEXB0001 container; one mipmap per image. */
const buildTex = ({ format, flags = 0, textureWidth, textureHeight, imageWidth, imageHeight, images, frames = null }) => {
  const parts = [
    nstring('TEXV0005'),
    nstring('TEXI0001'),
    i32(format),
    i32(flags),
    i32(textureWidth),
    i32(textureHeight),
    i32(imageWidth),
    i32(imageHeight),
    u32(0),
    nstring('TEXB0001'),
    i32(images.length),
  ];
  for (const mipmaps of images) {
    parts.push(i32(mipmaps.length));
    for (const mip of mipmaps) {
      parts.push(i32(mip.width), i32(mip.height), i32(mip.bytes.length), mip.bytes);
    }
  }
  if (frames) {
    // TEXS0003: frame count, then gif width/height, then the frame records.
    parts.push(nstring('TEXS0003'), i32(frames.items.length), i32(frames.width), i32(frames.height));
    for (const frame of frames.items) {
      parts.push(i32(frame.imageId));
      const time = new Uint8Array(4);
      new DataView(time.buffer).setFloat32(0, frame.frametime, true);
      parts.push(time);
      for (const value of [frame.x, frame.y, frame.width, 0, 0, frame.height]) {
        const f = new Uint8Array(4);
        new DataView(f.buffer).setFloat32(0, value, true);
        parts.push(f);
      }
    }
  }
  return concat(parts);
};

const solidRgba = (width, height, r, g, b, a) => {
  const out = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    out[i * 4] = r; out[i * 4 + 1] = g; out[i * 4 + 2] = b; out[i * 4 + 3] = a;
  }
  return out;
};

const readPngSize = (png) => {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return { width: view.getUint32(16, false), height: view.getUint32(20, false) };
};

const isPng = (bytes) => bytes && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;

// ── 1. LZ4 ───────────────────────────────────────────────────────────────────
section('[1] LZ4 block decoding');

test('literal-only last sequence', () => {
  const block = new Uint8Array([0x30, 0x41, 0x42, 0x43]);
  assert.deepEqual(Array.from(reader.decompressLz4Block(block, 3)), [0x41, 0x42, 0x43]);
});

test('literal run followed by a match', () => {
  const literals = encoder.encode('abcdefghij');
  const block = concat([new Uint8Array([10 << 4]), literals, new Uint8Array([10, 0])]);
  assert.deepEqual(
    Array.from(reader.decompressLz4Block(block, 14)),
    [97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 97, 98, 99, 100],
  );
});

test('run-length match with 4-bit length', () => {
  const out = reader.decompressLz4Block(lz4RunBlock(0x41, 18), 18);
  assert.equal(out.length, 18);
  assert.ok(out.every((b) => b === 0x41));
});

test('extended match length via 255-chained bytes', () => {
  const out = reader.decompressLz4Block(lz4RunBlock(0x5a, 5000), 5000);
  assert.equal(out.length, 5000);
  assert.ok(out.every((b) => b === 0x5a));
});

test('size mismatch is rejected', () => {
  assert.throws(() => reader.decompressLz4Block(lz4RunBlock(0x41, 18), 20));
});

// ── 2. PKGV ──────────────────────────────────────────────────────────────────
section('[2] PKGV container');

const rawJson = encoder.encode('{"hello":"world"}');
const rawSmall = Uint8Array.of(1, 2, 3, 4, 5);
const packedPkg = buildPkg([
  { path: 'scene.json', stored: rawJson },
  { path: 'materials/a.bin', stored: rawSmall },
  { path: 'materials/big.bin', stored: wrapCompressedEntry(1000, lz4RunBlock(0x41, 1000)) },
]);
const packedIndex = reader.parseWallpaperEnginePkg(packedPkg);

test('magic detection accepts PKGV', () => {
  assert.equal(reader.isWallpaperEnginePkg(packedPkg), true);
});

test('magic detection accepts an unfamiliar version number', () => {
  // The permissive check is deliberate: newer WE builds bump this field and
  // third-party packers emit values like PKGV0022.
  const pkg = buildPkg([{ path: 'scene.json', stored: rawJson }]);
  pkg.set(encoder.encode('0022'), 8);
  assert.equal(reader.isWallpaperEnginePkg(pkg), true);
});

test('magic detection rejects a ZIP', () => {
  assert.equal(reader.isWallpaperEnginePkg(encoder.encode('PK\x03\x04not-a-pkg')), false);
});

test('entry index preserves order and offsets', () => {
  assert.equal(packedIndex.length, 3);
  // `Array.from` also normalizes across the vm realm boundary, where arrays do
  // not share a prototype with the host and therefore fail deepStrictEqual.
  assert.deepEqual(Array.from(packedIndex, (e) => e.path), ['scene.json', 'materials/a.bin', 'materials/big.bin']);
  assert.equal(packedIndex[0].flags, 0);
  assert.equal(packedIndex[2].flags, reader.WE_PKG_ENTRY_FLAG_LZ4);
  assert.equal(packedIndex[2].size, 1000);
});

test('raw entries read back byte-identical', () => {
  assert.deepEqual(Array.from(reader.readWallpaperEnginePkgEntry(packedPkg, packedIndex[0])), Array.from(rawJson));
  assert.deepEqual(Array.from(reader.readWallpaperEnginePkgEntry(packedPkg, packedIndex[1])), Array.from(rawSmall));
});

test('LZ4-chained entry is decompressed', () => {
  const restored = reader.readWallpaperEnginePkgEntry(packedPkg, packedIndex[2]);
  assert.equal(restored.length, 1000);
  assert.ok(restored.every((b) => b === 0x41));
});

test('bad magic is rejected', () => {
  const bad = buildPkg([{ path: 'a', stored: rawSmall }]);
  bad.set(encoder.encode('XXXX'), 4);
  assert.throws(() => reader.parseWallpaperEnginePkg(bad), /bad magic/);
});

// ── 3. TEX parsing and payload decoding ──────────────────────────────────────
section('[3] TEX container + payload decoding');

test('RGBA8888 decodes to the declared pixels', () => {
  const tex = buildTex({ format: 0, textureWidth: 4, textureHeight: 4, imageWidth: 4, imageHeight: 4, images: [[{ width: 4, height: 4, bytes: solidRgba(4, 4, 0, 255, 0, 255) }]] });
  const decoded = reader.decodeWallpaperEngineTexImage(reader.parseWallpaperEngineTex(tex), 0);
  assert.equal(decoded.kind, 'rgba');
  assert.deepEqual([decoded.width, decoded.height], [4, 4]);
  assert.deepEqual(Array.from(decoded.rgba.subarray(0, 4)), [0, 255, 0, 255]);
});

test('power-of-two padding is cropped to the TEXI image rect', () => {
  const tex = buildTex({ format: 0, textureWidth: 8, textureHeight: 8, imageWidth: 4, imageHeight: 4, images: [[{ width: 8, height: 8, bytes: solidRgba(8, 8, 9, 9, 9, 255) }]] });
  const decoded = reader.decodeWallpaperEngineTexImage(reader.parseWallpaperEngineTex(tex), 0);
  assert.deepEqual([decoded.width, decoded.height], [4, 4]);
});

test('R8 expands luminance into RGB with opaque alpha', () => {
  const bytes = new Uint8Array(16).fill(128);
  const tex = buildTex({ format: 9, textureWidth: 4, textureHeight: 4, imageWidth: 4, imageHeight: 4, images: [[{ width: 4, height: 4, bytes }]] });
  const decoded = reader.decodeWallpaperEngineTexImage(reader.parseWallpaperEngineTex(tex), 0);
  assert.deepEqual(Array.from(decoded.rgba.subarray(0, 4)), [128, 128, 128, 255]);
});

test('RG88 maps two channels and leaves blue empty', () => {
  const bytes = new Uint8Array(32);
  bytes[0] = 10; bytes[1] = 20;
  const tex = buildTex({ format: 8, textureWidth: 4, textureHeight: 4, imageWidth: 4, imageHeight: 4, images: [[{ width: 4, height: 4, bytes }]] });
  const decoded = reader.decodeWallpaperEngineTexImage(reader.parseWallpaperEngineTex(tex), 0);
  assert.deepEqual(Array.from(decoded.rgba.subarray(0, 4)), [10, 20, 0, 255]);
});

test('DXT1 palette: both endpoints and both interpolants', () => {
  const selectors = [0, 1, 2, 3];
  const block = new Uint8Array(8);
  block[0] = 0x00; block[1] = 0xf8; // c0 = red
  block[2] = 0x1f; block[3] = 0x00; // c1 = blue
  let indices = 0;
  for (let i = 0; i < 16; i += 1) indices |= selectors[i % 4] << (2 * i);
  block[4] = indices & 0xff;
  block[5] = (indices >>> 8) & 0xff;
  block[6] = (indices >>> 16) & 0xff;
  block[7] = (indices >>> 24) & 0xff;

  const tex = buildTex({ format: 7, textureWidth: 4, textureHeight: 4, imageWidth: 4, imageHeight: 4, images: [[{ width: 4, height: 4, bytes: block }]] });
  const { rgba } = reader.decodeWallpaperEngineTexImage(reader.parseWallpaperEngineTex(tex), 0);
  const pixel = (x, y) => Array.from(rgba.subarray((y * 4 + x) * 4, (y * 4 + x) * 4 + 4));
  assert.deepEqual(pixel(0, 0), [255, 0, 0, 255]);
  assert.deepEqual(pixel(1, 0), [0, 0, 255, 255]);
  assert.deepEqual(pixel(2, 0), [170, 0, 85, 255]);
  assert.deepEqual(pixel(3, 0), [85, 0, 170, 255]);
  assert.deepEqual(pixel(0, 1), [255, 0, 0, 255]);
});

test('DXT3 uses the 4-bit explicit alpha', () => {
  const block = new Uint8Array(16).fill(0xff);
  const tex = buildTex({ format: 6, textureWidth: 4, textureHeight: 4, imageWidth: 4, imageHeight: 4, images: [[{ width: 4, height: 4, bytes: block }]] });
  const { rgba } = reader.decodeWallpaperEngineTexImage(reader.parseWallpaperEngineTex(tex), 0);
  assert.equal(rgba[3], 255);
  assert.equal(rgba[15], 255);
});

/** Build a DXT5 block whose alpha indices run 0..7 repeatedly. */
const buildDxt5AlphaBlock = (a0, a1) => {
  let bits = 0n;
  const indices = [];
  for (let i = 0; i < 16; i += 1) {
    const index = i % 8;
    indices.push(index);
    bits |= BigInt(index) << BigInt(3 * i);
  }
  const block = new Uint8Array(16);
  block[0] = a0;
  block[1] = a1;
  for (let b = 0; b < 6; b += 1) block[2 + b] = Number((bits >> BigInt(8 * b)) & 0xffn);
  return { block, indices };
};

test('DXT5 alpha, 8-value mode (a0 > a1)', () => {
  const a0 = 200;
  const a1 = 50;
  const alphas = [200, 50];
  for (let k = 2; k < 8; k += 1) alphas[k] = (((8 - k) * a0 + (k - 1) * a1) / 7) | 0;

  const { block, indices } = buildDxt5AlphaBlock(a0, a1);
  const tex = buildTex({ format: 4, textureWidth: 4, textureHeight: 4, imageWidth: 4, imageHeight: 4, images: [[{ width: 4, height: 4, bytes: block }]] });
  const { rgba } = reader.decodeWallpaperEngineTexImage(reader.parseWallpaperEngineTex(tex), 0);
  const actual = [];
  for (let i = 0; i < 16; i += 1) actual.push(rgba[i * 4 + 3]);
  assert.deepEqual(actual, indices.map((index) => alphas[index]));
});

test('DXT5 alpha, 6-value mode (a0 <= a1) including 0 and 255 endpoints', () => {
  const a0 = 50;
  const a1 = 200;
  const alphas = [50, 200, 40, 70, 100, 130, 0, 255];

  const { block, indices } = buildDxt5AlphaBlock(a0, a1);
  const tex = buildTex({ format: 4, textureWidth: 4, textureHeight: 4, imageWidth: 4, imageHeight: 4, images: [[{ width: 4, height: 4, bytes: block }]] });
  const { rgba } = reader.decodeWallpaperEngineTexImage(reader.parseWallpaperEngineTex(tex), 0);
  const actual = [];
  for (let i = 0; i < 16; i += 1) actual.push(rgba[i * 4 + 3]);
  assert.deepEqual(actual, indices.map((index) => alphas[index]));
});

test('embedded JPEG payload is passed through untouched', () => {
  const jpeg = Uint8Array.of(0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 0xff, 0xd9);
  const tex = buildTex({ format: 0, textureWidth: 2, textureHeight: 2, imageWidth: 2, imageHeight: 2, images: [[{ width: 2, height: 2, bytes: jpeg }]] });
  const decoded = reader.decodeWallpaperEngineTexImage(reader.parseWallpaperEngineTex(tex), 0);
  assert.equal(decoded.kind, 'passThrough');
  assert.equal(decoded.extension, '.jpg');
  assert.deepEqual(Array.from(decoded.bytes), Array.from(jpeg));
});

test('embedded PNG payload is passed through untouched', () => {
  const png = encodePng(2, 2, solidRgba(2, 2, 1, 2, 3, 255));
  const tex = buildTex({ format: 0, textureWidth: 2, textureHeight: 2, imageWidth: 2, imageHeight: 2, images: [[{ width: 2, height: 2, bytes: png }]] });
  const decoded = reader.decodeWallpaperEngineTexImage(reader.parseWallpaperEngineTex(tex), 0);
  assert.equal(decoded.kind, 'passThrough');
  assert.equal(decoded.extension, '.png');
  assert.deepEqual(Array.from(decoded.bytes), Array.from(png));
});

test('embedded MP4 video texture is rejected, not decoded as pixels', () => {
  const mp4 = Uint8Array.of(0, 0, 0, 12, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d);
  const tex = buildTex({ format: 0, textureWidth: 2, textureHeight: 2, imageWidth: 2, imageHeight: 2, images: [[{ width: 2, height: 2, bytes: mp4 }]] });
  assert.throws(() => reader.decodeWallpaperEngineTexImage(reader.parseWallpaperEngineTex(tex), 0), /mp4/i);
});

test('unsupported format parses but fails to decode with a typed error', () => {
  const tex = buildTex({ format: 12, textureWidth: 4, textureHeight: 4, imageWidth: 4, imageHeight: 4, images: [[{ width: 4, height: 4, bytes: new Uint8Array(16) }]] });
  const container = reader.parseWallpaperEngineTex(tex);
  assert.equal(container.format, 12);
  assert.throws(
    () => reader.decodeWallpaperEngineTexImage(container, 0),
    (error) => error instanceof reader.WeTexUnsupportedError && error.formatName === 'BC7',
  );
});

test('multi-image texture keeps every image and its frame table', () => {
  const tex = buildTex({
    format: 0,
    flags: 4,
    textureWidth: 4,
    textureHeight: 4,
    imageWidth: 4,
    imageHeight: 4,
    images: [
      [{ width: 4, height: 4, bytes: solidRgba(4, 4, 255, 0, 0, 255) }],
      [{ width: 4, height: 4, bytes: solidRgba(4, 4, 0, 0, 255, 255) }],
    ],
    frames: {
      width: 4,
      height: 4,
      items: [
        { imageId: 0, frametime: 0.1, x: 0, y: 0, width: 4, height: 4 },
        { imageId: 1, frametime: 0.1, x: 0, y: 0, width: 4, height: 4 },
      ],
    },
  });
  const container = reader.parseWallpaperEngineTex(tex);
  assert.equal(container.isAnimatedGif, true);
  assert.equal(container.images.length, 2);
  assert.deepEqual(Array.from(container.frames, (f) => f.imageId), [0, 1]);
  const second = reader.decodeWallpaperEngineTexImage(container, 1);
  assert.deepEqual(Array.from(second.rgba.subarray(0, 4)), [0, 0, 255, 255]);
});

// ── 4. materialization into browser entries ──────────────────────────────────
section('[4] scene.pkg -> browser entry map');

const importPkg = buildPkg([
  { path: 'scene.json', stored: encoder.encode('{"general":{}}') },
  { path: 'materials/solid.tex', stored: buildTex({ format: 0, textureWidth: 4, textureHeight: 4, imageWidth: 4, imageHeight: 4, images: [[{ width: 4, height: 4, bytes: solidRgba(4, 4, 0, 255, 0, 255) }]] }) },
  { path: 'materials/dxt.tex', stored: buildTex({ format: 7, textureWidth: 4, textureHeight: 4, imageWidth: 4, imageHeight: 4, images: [[{ width: 4, height: 4, bytes: Uint8Array.of(0x00, 0xf8, 0x1f, 0x00, 0, 0, 0, 0) }]] }) },
  { path: 'materials/padded.tex', stored: buildTex({ format: 0, textureWidth: 8, textureHeight: 8, imageWidth: 4, imageHeight: 4, images: [[{ width: 8, height: 8, bytes: solidRgba(8, 8, 0, 0, 255, 255) }]] }) },
  {
    path: 'materials/anim.tex',
    stored: buildTex({
      format: 0,
      textureWidth: 4,
      textureHeight: 4,
      imageWidth: 4,
      imageHeight: 4,
      images: [
        [{ width: 4, height: 4, bytes: solidRgba(4, 4, 255, 0, 0, 255) }],
        [{ width: 4, height: 4, bytes: solidRgba(4, 4, 0, 255, 0, 255) }],
      ],
    }),
  },
  { path: 'materials/photo.tex', stored: buildTex({ format: 0, textureWidth: 2, textureHeight: 2, imageWidth: 2, imageHeight: 2, images: [[{ width: 2, height: 2, bytes: Uint8Array.of(0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 0xff, 0xd9) }]] }) },
]);

const importResult = await pkgImport.readWallpaperEnginePkgEntries(new File([importPkg], 'scene.pkg'));

test('textures become virtual image entries and frame sequences', () => {
  assert.deepEqual([...importResult.entries.keys()].sort(), [
    'materials/anim_0.png',
    'materials/anim_1.png',
    'materials/dxt.png',
    'materials/padded.png',
    'materials/photo.jpg',
    'materials/solid.png',
    'scene.json',
  ]);
});

test('non-texture entries are passed through verbatim', () => {
  assert.equal(new TextDecoder().decode(importResult.entries.get('scene.json')), '{"general":{}}');
});

test('embedded JPEG keeps its original bytes', () => {
  assert.deepEqual(
    Array.from(importResult.entries.get('materials/photo.jpg')),
    [0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 0xff, 0xd9],
  );
});

test('decoded textures are real PNGs with the declared dimensions', () => {
  for (const [path, expected] of [
    ['materials/solid.png', { width: 4, height: 4 }],
    ['materials/dxt.png', { width: 4, height: 4 }],
    ['materials/padded.png', { width: 4, height: 4 }],
    ['materials/anim_0.png', { width: 4, height: 4 }],
    ['materials/anim_1.png', { width: 4, height: 4 }],
  ]) {
    const bytes = importResult.entries.get(path);
    assert.ok(isPng(bytes), `${path} should be a PNG`);
    assert.deepEqual(readPngSize(bytes), expected, `${path} dimensions`);
  }
});

test('canvas encoder runs once per decoded image', () => {
  assert.equal(canvasEncodeCalls, 5);
});

test('import stats report the split between passthrough and decoded', () => {
  assert.equal(importResult.stats.entryCount, 6);
  assert.equal(importResult.stats.textureCount, 5);
  assert.equal(importResult.stats.passthroughTextures, 1);
  assert.equal(importResult.stats.decodedTextures, 5);
  assert.equal(importResult.stats.videoTextures, 0);
  assert.equal(importResult.textureIssues.length, 0);
});

await testAsync('a non-PKGV file is rejected with a clear message', async () => {
  await assert.rejects(
    () => pkgImport.readWallpaperEnginePkgEntries(new File([encoder.encode('PK\x03\x04zip')], 'x.zip')),
    /PKGV/,
  );
});

await testAsync('an unsupported texture is reported instead of breaking the import', async () => {
  const pkg = buildPkg([
    { path: 'scene.json', stored: encoder.encode('{}') },
    { path: 'materials/bc7.tex', stored: buildTex({ format: 12, textureWidth: 4, textureHeight: 4, imageWidth: 4, imageHeight: 4, images: [[{ width: 4, height: 4, bytes: new Uint8Array(16) }]] }) },
  ]);
  const result = await pkgImport.readWallpaperEnginePkgEntries(new File([pkg], 'scene.pkg'));
  assert.equal(result.entries.has('materials/bc7.png'), false);
  assert.equal(result.textureIssues.length, 1);
  assert.match(result.textureIssues[0].reason, /unsupported format/);
});

await testAsync('an embedded MP4 texture is counted as a video texture', async () => {
  const pkg = buildPkg([
    { path: 'scene.json', stored: encoder.encode('{}') },
    { path: 'materials/video.tex', stored: buildTex({ format: 0, textureWidth: 2, textureHeight: 2, imageWidth: 2, imageHeight: 2, images: [[{ width: 2, height: 2, bytes: Uint8Array.of(0, 0, 0, 12, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d) }]] }) },
  ]);
  const result = await pkgImport.readWallpaperEnginePkgEntries(new File([pkg], 'scene.pkg'));
  assert.equal(result.stats.videoTextures, 1);
  assert.equal(result.textureIssues.length, 1);
});

// ── summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'='.repeat(64)}`);
console.log(`passed: ${passed}   failed: ${failures.length}`);
if (failures.length) {
  console.log('\nFAILURES:');
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exitCode = 1;
}
