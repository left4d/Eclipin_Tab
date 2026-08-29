import type { WeSceneWallpaperItem } from '@/shared/utils/db';
import { createId } from '@/shared/utils/id';
import { saveWallpaperEngineScenePackage } from '@/features/theme/services/wallpaperEngineSceneDb';
import { importWallpaperEngineZip } from '@/features/theme/utils/wallpaperEngineZipImport';
import {
  buildWallpaperEngineSceneResources,
  getWallpaperEngineScenePreviewPath,
  wallpaperEngineBytesToBlob,
} from '@/features/theme/utils/wallpaperEngineSceneStorage';

type GenerateThumbnail = (blob: Blob) => Promise<Blob | undefined>;

/**
 * Heavy Wallpaper Engine import path.
 *
 * This module must only be reached through dynamic import from useWallpaperStorage.
 * Keeping the ZIP parser, resource graph, capability analyzer and scene converter
 * behind this boundary prevents them from entering the normal new-tab startup graph.
 */
export const importAndPersistWallpaperEngineZip = async (
  file: File,
  generateThumbnail: GenerateThumbnail,
): Promise<string[]> => {
  const { entries, archive } = await importWallpaperEngineZip(file);
  const importedAt = Date.now();
  const ids: string[] = [];

  for (let index = 0; index < archive.scenes.length; index += 1) {
    const scene = archive.scenes[index];
    if (!scene.layers.length) continue;

    const id = createId('we_scene');
    const { resources, totalResourceBytes } = buildWallpaperEngineSceneResources(id, scene, entries);

    const previewPath = getWallpaperEngineScenePreviewPath(scene);
    let thumbnailBlob: Blob | undefined;
    if (previewPath) {
      const previewBytes = entries.get(previewPath);
      if (previewBytes) {
        const previewBlob = wallpaperEngineBytesToBlob(previewPath, previewBytes);
        thumbnailBlob = await generateThumbnail(previewBlob);
      }
    }

    const item: WeSceneWallpaperItem = {
      id,
      type: 'weScene',
      thumbnail: thumbnailBlob,
      // Keep archive order stable when sorted descending.
      createdAt: importedAt - index,
      sourceFileName: file.name,
      sourceDescriptorPath: scene.sourceDescriptorPath,
      scene,
      resourceCount: resources.length,
      totalResourceBytes,
    };

    await saveWallpaperEngineScenePackage(item, resources);
    ids.push(id);
  }

  if (!ids.length) {
    throw new Error('ZIP 中没有可保存的 Wallpaper Engine 图片图层。');
  }

  return ids;
};
