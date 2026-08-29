import { db, isWeSceneWallpaperItem, type WeSceneResourceItem, type WeSceneWallpaperItem } from '@/shared/utils/db';
import { getWallpaperEngineSceneResources, saveWallpaperEngineScenePackage } from './wallpaperEngineSceneDb';

export type WeSceneResourceAssetRef = {
  path: string;
  type: string;
  relativePath: string;
  byteLength: number;
};

export type WeSceneWallpaperAssetRef = {
  id: string;
  createdAt: number;
  sourceFileName: string;
  sourceDescriptorPath: string;
  scene: unknown;
  resourceCount: number;
  totalResourceBytes: number;
  thumbnailPath?: string;
  thumbnailType?: string;
  resources: WeSceneResourceAssetRef[];
};

export type SnapshotBlobAsset = { path: string; blob: Blob };

const extensionFromType = (type: string, fallback = 'bin'): string => {
  if (type.includes('png')) return 'png';
  if (type.includes('jpeg') || type.includes('jpg')) return 'jpg';
  if (type.includes('webp')) return 'webp';
  if (type.includes('gif')) return 'gif';
  if (type.includes('svg')) return 'svg';
  if (type.includes('ttf')) return 'ttf';
  if (type.includes('otf')) return 'otf';
  if (type.includes('woff2')) return 'woff2';
  if (type.includes('woff')) return 'woff';
  return fallback;
};

const safeName = (value: string): string => value.replace(/[^a-zA-Z0-9._-]/g, '_');

export const collectWeSceneSnapshot = async (
  item: WeSceneWallpaperItem,
): Promise<{ manifest: WeSceneWallpaperAssetRef; assets: SnapshotBlobAsset[] }> => {
  const sceneResources = await getWallpaperEngineSceneResources(item.id);
  const assets: SnapshotBlobAsset[] = [];
  const resources: WeSceneResourceAssetRef[] = [];

  for (const [index, resource] of sceneResources.entries()) {
    const ext = extensionFromType(resource.mimeType || resource.data.type);
    const path = `assets/wallpapers/we-scenes/${safeName(item.id)}/resource-${String(index).padStart(4, '0')}.${ext}`;
    assets.push({ path, blob: resource.data });
    resources.push({
      path,
      relativePath: resource.path,
      type: resource.mimeType || resource.data.type || 'application/octet-stream',
      byteLength: resource.byteLength || resource.data.size,
    });
  }

  let thumbnailPath: string | undefined;
  let thumbnailType: string | undefined;
  if (item.thumbnail) {
    thumbnailType = item.thumbnail.type || 'image/png';
    thumbnailPath = `assets/wallpapers/we-scenes/${safeName(item.id)}/thumbnail.${extensionFromType(thumbnailType, 'png')}`;
    assets.push({ path: thumbnailPath, blob: item.thumbnail });
  }

  return {
    manifest: {
      id: item.id,
      createdAt: item.createdAt,
      sourceFileName: item.sourceFileName,
      sourceDescriptorPath: item.sourceDescriptorPath,
      scene: item.scene,
      resourceCount: resources.length,
      totalResourceBytes: resources.reduce((sum, resource) => sum + resource.byteLength, 0),
      thumbnailPath,
      thumbnailType,
      resources,
    },
    assets,
  };
};

export const getWeSceneSnapshotAssetRefs = (
  scenes: readonly WeSceneWallpaperAssetRef[] = [],
): Array<{ path: string; type: string }> => scenes.flatMap((scene) => [
  ...scene.resources.map((resource) => ({ path: resource.path, type: resource.type })),
  ...(scene.thumbnailPath ? [{ path: scene.thumbnailPath, type: scene.thumbnailType || 'image/png' }] : []),
]);

export const restoreWeSceneSnapshot = async (
  asset: WeSceneWallpaperAssetRef,
  blobs: ReadonlyMap<string, Blob>,
): Promise<boolean> => {
  const resources: WeSceneResourceItem[] = asset.resources.flatMap((resource) => {
    const blob = blobs.get(resource.path);
    if (!blob) return [];
    return [{
      key: `${asset.id}::${resource.relativePath}`,
      wallpaperId: asset.id,
      path: resource.relativePath,
      data: blob,
      mimeType: resource.type || blob.type || 'application/octet-stream',
      byteLength: resource.byteLength || blob.size,
    }];
  });
  if (resources.length !== asset.resources.length) return false;

  const item: WeSceneWallpaperItem = {
    id: asset.id,
    type: 'weScene',
    thumbnail: asset.thumbnailPath ? blobs.get(asset.thumbnailPath) : undefined,
    createdAt: asset.createdAt || Date.now(),
    sourceFileName: asset.sourceFileName,
    sourceDescriptorPath: asset.sourceDescriptorPath,
    scene: asset.scene,
    resourceCount: resources.length,
    totalResourceBytes: resources.reduce((sum, resource) => sum + resource.byteLength, 0),
  };
  await saveWallpaperEngineScenePackage(item, resources);
  return true;
};

export const readExistingWeScenePackage = async (
  wallpaperId: string,
): Promise<{ item: WeSceneWallpaperItem; resources: WeSceneResourceItem[] } | null> => {
  const item = await db.get(wallpaperId);
  if (!item || !isWeSceneWallpaperItem(item)) return null;
  return { item, resources: await getWallpaperEngineSceneResources(item.id) };
};

export const restoreExistingWeScenePackage = async (
  preserved: { item: WeSceneWallpaperItem; resources: WeSceneResourceItem[] },
): Promise<void> => {
  await saveWallpaperEngineScenePackage(preserved.item, preserved.resources);
};
