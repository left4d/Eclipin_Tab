import {
  decodeWallpaperEngineTexImage,
  isWallpaperEnginePkg,
  parseWallpaperEnginePkg,
  parseWallpaperEngineTex,
  readWallpaperEnginePkgEntry,
  type WePkgEntry,
} from './wallpaperEnginePkgReader';

/**
 * Wallpaper Engine `scene.pkg` -> RePKG-equivalent entry map.
 *
 * The rest of the Wallpaper Engine pipeline (resource graph, capability
 * analyzer, scene converter, storage) consumes a plain
 * `Map<path, Uint8Array>` of browser-ready resources. This module produces
 * exactly that shape straight from a packed `scene.pkg`, so a user no longer
 * has to unpack the archive with RePKG and re-zip it by hand.
 *
 * `.tex` containers are decoded into virtual image entries that the reference
 * graph can match by stem, mirroring RePKG's extraction layout:
 *
 *   materials/foo/bar.tex          -> materials/foo/bar.png       (or .jpg)
 *   materials/foo/anim.tex (N imgs)-> materials/foo/anim_0.png ... _N-1.png
 *
 * Embedded JPEG / PNG payloads are passed through byte-for-byte; only DXT and
 * raw textures are actually decoded, then re-encoded with the native canvas
 * PNG encoder.
 */

/** Refuse absurd inputs before allocating a single big buffer. */
const MAX_PKG_FILE_BYTES = 512 * 1024 * 1024;
/** Soft ceiling on the decoded entry map, to fail loudly instead of OOM-ing. */
const MAX_TOTAL_OUTPUT_BYTES = 512 * 1024 * 1024;

export interface WallpaperEnginePkgTextureIssue {
  path: string;
  reason: string;
}

export interface WallpaperEnginePkgImportResult {
  entries: Map<string, Uint8Array>;
  /** Textures that could not be turned into a browser image. */
  textureIssues: WallpaperEnginePkgTextureIssue[];
  stats: {
    entryCount: number;
    textureCount: number;
    passthroughTextures: number;
    decodedTextures: number;
    videoTextures: number;
  };
}

const normalizeEntryPath = (path: string): string => (
  path.replace(/\\/g, '/').replace(/^\.\//, '')
);

const isTexPath = (path: string): boolean => /\.tex$/i.test(path);

const virtualTexturePath = (
  pkgPath: string,
  extension: string,
  frameIndex: number | null,
): string => {
  const withoutExtension = pkgPath.replace(/\.tex$/i, '');
  return frameIndex === null
    ? `${withoutExtension}${extension}`
    : `${withoutExtension}_${frameIndex}${extension}`;
};

/**
 * Encode raw RGBA8888 pixels as PNG using the platform encoder.
 *
 * `OffscreenCanvas` is preferred (no DOM attachment, works off the main
 * document); the HTML canvas path covers browsers that predate it.
 */
const encodeRgbaToPng = async (
  width: number,
  height: number,
  rgba: Uint8Array,
): Promise<Uint8Array> => {
  // `rgba` is always backed by a plain ArrayBuffer (freshly allocated by the
  // decoder), so narrowing the lib's ArrayBufferLike view is safe and avoids a
  // full pixel-buffer copy for multi-megapixel textures.
  const clamped = new Uint8ClampedArray(
    rgba.buffer as ArrayBuffer,
    rgba.byteOffset,
    rgba.byteLength,
  );
  const imageData = new ImageData(clamped, width, height);

  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('无法创建 OffscreenCanvas 2D 上下文');
    context.putImageData(imageData, 0, 0);
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    return new Uint8Array(await blob.arrayBuffer());
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('无法创建 Canvas 2D 上下文');
  context.putImageData(imageData, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), 'image/png');
  });
  if (!blob) throw new Error('Canvas 无法导出 PNG');
  return new Uint8Array(await blob.arrayBuffer());
};

/**
 * Materialize one `.tex` entry into the virtual image entry (or frame
 * sequence) the reference graph expects.
 */
const materializeTexture = async (
  pkgPath: string,
  bytes: Uint8Array,
  entries: Map<string, Uint8Array>,
  issues: WallpaperEnginePkgTextureIssue[],
  stats: WallpaperEnginePkgImportResult['stats'],
): Promise<number> => {
  let container;
  try {
    container = parseWallpaperEngineTex(bytes);
  } catch (error) {
    issues.push({ path: pkgPath, reason: error instanceof Error ? error.message : String(error) });
    return 0;
  }

  if (container.isVideoMp4) {
    stats.videoTextures += 1;
    issues.push({ path: pkgPath, reason: '视频纹理（内嵌 MP4）暂不支持' });
    return 0;
  }

  const frameCount = container.images.length;
  let writtenBytes = 0;

  for (let index = 0; index < frameCount; index += 1) {
    let payload;
    try {
      payload = decodeWallpaperEngineTexImage(container, index);
    } catch (error) {
      issues.push({
        path: frameCount > 1 ? `${pkgPath}#${index}` : pkgPath,
        reason: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    const frameIndex = frameCount > 1 ? index : null;

    if (payload.kind === 'passThrough') {
      // Already a complete image file: keep the original bytes untouched.
      entries.set(
        virtualTexturePath(pkgPath, payload.extension, frameIndex),
        payload.bytes,
      );
      writtenBytes += payload.bytes.byteLength;
      stats.passthroughTextures += 1;
      continue;
    }

    let pngBytes: Uint8Array;
    try {
      pngBytes = await encodeRgbaToPng(payload.width, payload.height, payload.rgba);
    } catch (error) {
      issues.push({
        path: pkgPath,
        reason: `PNG 编码失败：${error instanceof Error ? error.message : String(error)}`,
      });
      continue;
    }
    entries.set(virtualTexturePath(pkgPath, '.png', frameIndex), pngBytes);
    writtenBytes += pngBytes.byteLength;
    stats.decodedTextures += 1;
  }

  return writtenBytes;
};

/**
 * Read a packed `scene.pkg` into the browser-entry map used by the existing
 * Wallpaper Engine import pipeline.
 *
 * Non-texture entries (JSON, MDL, fonts, preview images, ...) are passed
 * through verbatim; `.tex` containers become virtual image entries.
 */
export const readWallpaperEnginePkgEntries = async (
  file: File,
): Promise<WallpaperEnginePkgImportResult> => {
  if (file.size > MAX_PKG_FILE_BYTES) {
    throw new Error(
      `scene.pkg 过大（${Math.round(file.size / 1024 / 1024)} MB），超过 ${MAX_PKG_FILE_BYTES / 1024 / 1024} MB 上限。`,
    );
  }

  const data = new Uint8Array(await file.arrayBuffer());
  if (!isWallpaperEnginePkg(data)) {
    throw new Error('这不是有效的 Wallpaper Engine scene.pkg（缺少 PKGV 容器标记）。');
  }

  const index: WePkgEntry[] = parseWallpaperEnginePkg(data);

  const entries = new Map<string, Uint8Array>();
  const issues: WallpaperEnginePkgTextureIssue[] = [];
  const stats: WallpaperEnginePkgImportResult['stats'] = {
    entryCount: index.length,
    textureCount: 0,
    passthroughTextures: 0,
    decodedTextures: 0,
    videoTextures: 0,
  };

  let totalOutputBytes = 0;

  // Textures first would interleave badly with memory spikes, so walk the
  // archive in order and keep the virtual paths stable.
  for (const entry of index) {
    const path = normalizeEntryPath(entry.path);
    if (!path || path.endsWith('/')) continue;

    if (!isTexPath(path)) {
      try {
        const bytes = readWallpaperEnginePkgEntry(data, entry);
        entries.set(path, bytes);
        totalOutputBytes += bytes.byteLength;
      } catch (error) {
        issues.push({ path, reason: error instanceof Error ? error.message : String(error) });
      }
      continue;
    }

    stats.textureCount += 1;
    let bytes: Uint8Array;
    try {
      bytes = readWallpaperEnginePkgEntry(data, entry);
    } catch (error) {
      issues.push({ path, reason: error instanceof Error ? error.message : String(error) });
      continue;
    }

    const written = await materializeTexture(path, bytes, entries, issues, stats);
    totalOutputBytes += written;

    if (totalOutputBytes > MAX_TOTAL_OUTPUT_BYTES) {
      throw new Error(
        `场景解包后的资源总量超过 ${MAX_TOTAL_OUTPUT_BYTES / 1024 / 1024} MB，已中止导入以避免内存耗尽。`,
      );
    }
  }

  return { entries, textureIssues: issues, stats };
};
