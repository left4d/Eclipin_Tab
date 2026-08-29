import { readZip } from '@/shared/utils/zip';
import type { ImportedWeArchive } from './wallpaperEngineImportedScene';
import { analyzeWallpaperEngineCapabilities, type WeArchiveCapabilityReport } from './wallpaperEngineCapabilityAnalyzer';
import { parseWallpaperEngineResourceGraph } from './wallpaperEngineResourceGraph';
import { convertWallpaperEngineResourceGraph } from './wallpaperEngineSceneConverter';

export interface WallpaperEngineZipImportResult {
  entries: Map<string, Uint8Array>;
  archive: ImportedWeArchive;
  capabilities: WeArchiveCapabilityReport;
}

/**
 * Phase-2 ZIP import entry point.
 *
 * The ZIP is treated as a Wallpaper Engine resource archive, never as a web
 * package: unzip -> discover scene JSON by structure -> follow references ->
 * convert into TabLab's intermediate scene model.
 */
export const importWallpaperEngineZip = async (file: File): Promise<WallpaperEngineZipImportResult> => {
  const entries = await readZip(file);
  const graph = parseWallpaperEngineResourceGraph(entries);
  if (!graph.scenes.length) {
    throw new Error('ZIP 中没有识别到可解析的 Wallpaper Engine scene/gifscene 场景描述。');
  }

  const capabilities = analyzeWallpaperEngineCapabilities(entries, graph);
  const archive = convertWallpaperEngineResourceGraph(entries, graph);
  if (!archive.scenes.some((scene) => scene.layers.length > 0)) {
    throw new Error('识别到了 Wallpaper Engine 场景，但没有解析出可显示的图片或帧动画图层。');
  }

  return { entries, archive, capabilities };
};
