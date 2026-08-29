import { db, STORE_NAME, WE_SCENE_RESOURCES_STORE } from '@/shared/utils/db';
import type { WeSceneResourceItem, WeSceneWallpaperItem } from '@/shared/types/wallpaper';

/** Save WE scene metadata and all referenced render resources atomically. */
export const saveWallpaperEngineScenePackage = async (
  item: WeSceneWallpaperItem,
  resources: WeSceneResourceItem[],
): Promise<string> => {
  const rawDb = await db.getRawDatabase();
  return new Promise((resolve, reject) => {
    const transaction = rawDb.transaction([STORE_NAME, WE_SCENE_RESOURCES_STORE], 'readwrite');
    transaction.objectStore(STORE_NAME).put(item);
    const resourceStore = transaction.objectStore(WE_SCENE_RESOURCES_STORE);
    for (const resource of resources) resourceStore.put(resource);

    transaction.oncomplete = () => resolve(item.id);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('Failed to save Wallpaper Engine scene'));
  });
};

export const getWallpaperEngineSceneResource = async (
  wallpaperId: string,
  path: string,
): Promise<WeSceneResourceItem | null> => {
  const rawDb = await db.getRawDatabase();
  return new Promise((resolve, reject) => {
    const transaction = rawDb.transaction(WE_SCENE_RESOURCES_STORE, 'readonly');
    const request = transaction.objectStore(WE_SCENE_RESOURCES_STORE).get(`${wallpaperId}::${path}`);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};


export const getWallpaperEngineSceneResourcesByPaths = async (
  wallpaperId: string,
  paths: readonly string[],
): Promise<Map<string, WeSceneResourceItem>> => {
  const uniquePaths = [...new Set(paths)];
  if (uniquePaths.length === 0) return new Map();
  const rawDb = await db.getRawDatabase();
  return new Promise((resolve, reject) => {
    const transaction = rawDb.transaction(WE_SCENE_RESOURCES_STORE, 'readonly');
    const store = transaction.objectStore(WE_SCENE_RESOURCES_STORE);
    const results = new Map<string, WeSceneResourceItem>();
    let failed = false;

    for (const path of uniquePaths) {
      const request = store.get(`${wallpaperId}::${path}`);
      request.onsuccess = () => {
        const item = request.result as WeSceneResourceItem | undefined;
        if (item) results.set(path, item);
      };
      request.onerror = () => {
        failed = true;
        try { transaction.abort(); } catch { /* transaction may already be finished */ }
        reject(request.error || new Error(`Failed to load Wallpaper Engine resource: ${path}`));
      };
    }

    transaction.oncomplete = () => {
      if (!failed) resolve(results);
    };
    transaction.onerror = () => {
      if (!failed) reject(transaction.error || new Error('Failed to load Wallpaper Engine resources'));
    };
    transaction.onabort = () => {
      if (!failed) reject(transaction.error || new Error('Failed to load Wallpaper Engine resources'));
    };
  });
};

export const getWallpaperEngineSceneResources = async (
  wallpaperId: string,
): Promise<WeSceneResourceItem[]> => {
  const rawDb = await db.getRawDatabase();
  return new Promise((resolve, reject) => {
    const transaction = rawDb.transaction(WE_SCENE_RESOURCES_STORE, 'readonly');
    const index = transaction.objectStore(WE_SCENE_RESOURCES_STORE).index('wallpaperId');
    const request = index.getAll(IDBKeyRange.only(wallpaperId));
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};
