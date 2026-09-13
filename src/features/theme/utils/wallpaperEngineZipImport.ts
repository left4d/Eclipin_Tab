import { readZip } from '@/shared/utils/zip';
import type { ImportedWeArchive } from './wallpaperEngineImportedScene';
import { analyzeWallpaperEngineCapabilities, type WeArchiveCapabilityReport } from './wallpaperEngineCapabilityAnalyzer';
import { parseWallpaperEngineResourceGraph } from './wallpaperEngineResourceGraph';
import { convertWallpaperEngineResourceGraph } from './wallpaperEngineSceneConverter';
import {
  readWallpaperEnginePkgEntries,
  type WallpaperEnginePkgTextureIssue,
} from './wallpaperEnginePkgImport';
import { isWallpaperEnginePkg } from './wallpaperEnginePkgReader';

export interface WallpaperEngineZipImportResult {
  entries: Map<string, Uint8Array>;
  archive: ImportedWeArchive;
  capabilities: WeArchiveCapabilityReport;
}

export interface WallpaperEngineArchiveImportResult extends WallpaperEngineZipImportResult {
  /** Which container the entries came from. */
  source: 'pkg' | 'zip';
  /** Textures the packed-archive reader could not turn into browser images. */
  textureIssues: WallpaperEnginePkgTextureIssue[];
}

/**
 * Shared back half of the import: a materialized entry map is treated as a
 * Wallpaper Engine resource archive, never as a web package. Which container it
 * came from (packed `scene.pkg` or a RePKG ZIP) no longer matters past here.
 */
const buildArchive = (
  entries: Map<string, Uint8Array>,
  sourceLabel: string,
): { archive: ImportedWeArchive; capabilities: WeArchiveCapabilityReport } => {
  const graph = parseWallpaperEngineResourceGraph(entries);
  if (!graph.scenes.length) {
    throw new Error(`${sourceLabel} 中没有识别到可解析的 Wallpaper Engine scene/gifscene 场景描述。`);
  }

  const capabilities = analyzeWallpaperEngineCapabilities(entries, graph);
  const archive = convertWallpaperEngineResourceGraph(entries, graph);
  if (!archive.scenes.some((scene) => scene.layers.length > 0)) {
    throw new Error('识别到了 Wallpaper Engine 场景，但没有解析出可显示的图片或帧动画图层。');
  }

  return { archive, capabilities };
};

/**
 * RePKG ZIP import entry point.
 *
 * The ZIP is treated as a Wallpaper Engine resource archive, never as a web
 * package: unzip -> discover scene JSON by structure -> follow references ->
 * convert into TabLab's intermediate scene model.
 */
export const importWallpaperEngineZip = async (
  file: File,
): Promise<WallpaperEngineZipImportResult> => {
  const entries = await readZip(file);
  const { archive, capabilities } = buildArchive(entries, 'ZIP');
  return { entries, archive, capabilities };
};

/** Bytes needed to read the PKGV magic (int32 length prefix + 8 ASCII chars). */
const PKG_MAGIC_PROBE_BYTES = 16;

/**
 * Container-aware entry point.
 *
 * A packed `scene.pkg` is decoded in the browser, so the user no longer has to
 * unpack it with RePKG and re-zip it by hand; every other upload keeps the
 * historical ZIP route.
 */
export const importWallpaperEngineArchive = async (
  file: File,
): Promise<WallpaperEngineArchiveImportResult> => {
  const head = new Uint8Array(await file.slice(0, PKG_MAGIC_PROBE_BYTES).arrayBuffer());

  if (!isWallpaperEnginePkg(head)) {
    const zipResult = await importWallpaperEngineZip(file);
    return { ...zipResult, source: 'zip', textureIssues: [] };
  }

  const { entries, textureIssues } = await readWallpaperEnginePkgEntries(file);
  const { archive, capabilities } = buildArchive(entries, 'scene.pkg');
  return { entries, archive, capabilities, source: 'pkg', textureIssues };
};
