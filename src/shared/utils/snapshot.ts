import packageInfo from '../../../package.json';
import { FAVICON_PREFIX, getDomainFromRef } from '@/features/dock/utils/iconCache';
import { DockItem, Sticker } from '@/shared/types';
import { db, CustomFontItem, FaviconItem, LocalWebPageItem, type BlobWallpaperItem, isWeSceneWallpaperItem } from './db';
import { clearAllLocalWebFiles, getLocalWebFiles, saveLocalWebFiles, type LocalWebFileItem } from './localWebFileDb';
import { storage } from './storage';
import { notifyPersistenceRestoreApplied, notifyPersistenceRestoreFailed, notifyPersistenceRestoreStart } from './persistenceLifecycle';
import { exportVectorIconRecords, replaceVectorIconRecords } from '@/features/vector-icons/services/vectorIconStore';
import { loadWidgets } from '@/features/widgets/services/widgetStorage';
import { loadDeletedWidgets } from '@/features/widgets/services/widgetRecycleBinService';
import {
  collectWeSceneSnapshot,
  getWeSceneSnapshotAssetRefs,
  readExistingWeScenePackage,
  restoreExistingWeScenePackage,
  restoreWeSceneSnapshot,
  type WeSceneWallpaperAssetRef,
} from '@/features/theme/services/wallpaperEngineSnapshot';
import type { VectorIconRecord } from '@/features/vector-icons/types/vectorIcon';
import { normalizeLegacyBrandStorageKey } from './brandMigration';

export type SnapshotOptions = {
  includeWallpaper?: boolean;
  includeStickers?: boolean;
  includeFavicons?: boolean;
  /** 本地完整备份专用：额外保存全部应用 localStorage、自定义字体和 SVG 图标库。 */
  includeExtendedState?: boolean;
};

type AssetRef = {
  path: string;
  type: string;
};

export type FaviconAssetRef = AssetRef & {
  domain: string;
  isFallback: boolean;
  iconSmall?: boolean;
  lastUpdated?: number;
};

export type StickerImageAssetRef = AssetRef & {
  id: string;
};

export type WallpaperAssetRef = AssetRef & {
  id: string;
  createdAt: number;
  wallpaperType?: 'image' | 'video';
  thumbnailPath?: string;
  thumbnailType?: string;
};

export type CustomFontAssetRef = AssetRef & {
  id: string;
  name: string;
  fileName: string;
  mimeType: string;
  createdAt: number;
};

export type LocalWebPackageFileAssetRef = AssetRef & {
  relativePath: string;
  size: number;
};

export type LocalWebPageAssetRef = AssetRef & {
  id: string;
  name: string;
  createdAt: number;
  kind?: 'html' | 'package';
  entryPath?: string;
  fileCount?: number;
  totalSize?: number;
  files?: LocalWebPackageFileAssetRef[];
};

export type SnapshotManifest = {
  type: 'eclipin-snapshot' | 'eclipse-tab-snapshot';
  version: 2;
  appVersion: string;
  exportedAt: string;
  lastUpdated: number;
  deviceName: string;
  assets: {
    favicons: FaviconAssetRef[];
    stickerImages: StickerImageAssetRef[];
    wallpapers: WallpaperAssetRef[];
    /** Wallpaper Engine scenes are included by full local backup. */
    weScenes?: WeSceneWallpaperAssetRef[];
    customFonts?: CustomFontAssetRef[];
    localWebPages?: LocalWebPageAssetRef[];
  };
};

export type SnapshotData = {
  spaces: ReturnType<typeof storage.getSpaces>;
  config: ReturnType<typeof storage.getConfig>;
  searchEngine: ReturnType<typeof storage.getSearchEngine>;
  wallpaperId: string | null;
  language: string | null;
  stickers: Sticker[];
  deletedStickers: Sticker[];
  /** 横向布局贴纸；完整本地备份显式保存，旧快照可不存在。 */
  horizontalStickers?: Sticker[];
  horizontalDeletedStickers?: Sticker[];
  stickerImagesMigrated: boolean;
  /** 完整本地备份字段；旧版/云快照可不存在。 */
  localStorageState?: Record<string, string>;
  vectorIcons?: VectorIconRecord[];
};

export type SnapshotPackage = {
  manifest: SnapshotManifest;
  data: SnapshotData;
  assets: { path: string; blob: Blob }[];
};

type LegacySyncData = {
  version: number;
  lastUpdated: number;
  deviceName?: string;
  assets?: {
    wallpapers?: string[];
    stickers?: string[];
  };
  data: {
    config: ReturnType<typeof storage.getConfig>;
    dockItems?: DockItem[];
    searchEngine: ReturnType<typeof storage.getSearchEngine>;
    spaces: ReturnType<typeof storage.getSpaces>;
    stickers: Sticker[];
    deletedStickers: Sticker[];
    wallpaperId: string | null;
  };
};

const extensionFromType = (type: string, fallback = 'bin'): string => {
  if (type.includes('png')) return 'png';
  if (type.includes('jpeg') || type.includes('jpg')) return 'jpg';
  if (type.includes('webp')) return 'webp';
  if (type.includes('gif')) return 'gif';
  if (type.includes('svg')) return 'svg';
  if (type.includes('mp4')) return 'mp4';
  if (type.includes('webm')) return 'webm';
  if (type.includes('icon')) return 'ico';
  if (type.includes('html')) return 'html';
  return fallback;
};

const safeName = (value: string): string => value.replace(/[^a-zA-Z0-9._-]/g, '_');

const isAppLocalStorageKey = (key: string): boolean => (
  key.startsWith('Eclipin_')
  || key.startsWith('eclipin_')
  || key.startsWith('EclipseTab_')
  || key.startsWith('eclipse_')
  || key === 'app_language'
  || key === 'search_suggestions_enabled'
  || key === 'sticker_last_font_size'
);

const collectAppLocalStorage = (): Record<string, string> => {
  const result: Record<string, string> = {};
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !isAppLocalStorageKey(key)) continue;
      const value = localStorage.getItem(key);
      if (value !== null) result[key] = value;
    }
  } catch {
    // ignore unavailable localStorage
  }
  return result;
};

const restoreAppLocalStorage = (state: Record<string, string>): void => {
  try {
    const normalizedState = Object.fromEntries(
      Object.entries(state)
        .filter(([key]) => isAppLocalStorageKey(key))
        .map(([key, value]) => [normalizeLegacyBrandStorageKey(key), value]),
    );
    const staleKeys: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !isAppLocalStorageKey(key)) continue;
      const normalizedKey = normalizeLegacyBrandStorageKey(key);
      if (normalizedKey !== key || !(normalizedKey in normalizedState)) staleKeys.push(key);
    }
    staleKeys.forEach((key) => localStorage.removeItem(key));
    Object.entries(normalizedState).forEach(([key, value]) => localStorage.setItem(key, value));
  } catch {
    // structured snapshot still restores core data when localStorage is unavailable
  }
};

function getDeviceName(): string {
  try {
    const saved = localStorage.getItem('Eclipin_deviceName');
    if (saved) return saved;
  } catch {
    // ignore
  }
  return 'Unknown Device';
}

const collectFaviconDomains = (items: DockItem[], domains = new Set<string>()): Set<string> => {
  for (const item of items) {
    if (item.icon?.startsWith(FAVICON_PREFIX)) domains.add(getDomainFromRef(item.icon));
    if (item.type === 'folder' && item.items) collectFaviconDomains(item.items, domains);
  }
  return domains;
};

const collectWidgetFaviconDomains = (domains = new Set<string>()): Set<string> => {
  for (const mode of ['vertical', 'horizontal'] as const) {
    const widgets = [
      ...loadWidgets(mode),
      ...loadDeletedWidgets(mode).map((record) => record.widget),
    ];
    for (const widget of widgets) {
      if (widget.icon?.startsWith(FAVICON_PREFIX)) domains.add(getDomainFromRef(widget.icon));
      Object.values(widget.bookmarkIcons ?? {}).forEach(({ icon }) => {
        if (icon?.startsWith(FAVICON_PREFIX)) domains.add(getDomainFromRef(icon));
      });
    }
  }
  return domains;
};

const collectLocalWebPageIds = (): Set<string> => {
  const ids = new Set<string>();
  for (const mode of ['vertical', 'horizontal'] as const) {
    const widgets = [
      ...loadWidgets(mode),
      ...loadDeletedWidgets(mode).map((record) => record.widget),
    ];
    for (const widget of widgets) {
      if (widget.embedLocalId) ids.add(widget.embedLocalId);
    }
  }
  return ids;
};

const collectStickerImageIds = (stickers: Sticker[], ids = new Set<string>()): Set<string> => {
  for (const sticker of stickers) {
    if (sticker.type === 'image' && sticker.content && !sticker.content.startsWith('data:')) {
      ids.add(sticker.content);
    }
    if (sticker.type === 'image' && sticker.iconSwapContent && !sticker.iconSwapContent.startsWith('data:')) {
      ids.add(sticker.iconSwapContent);
    }
  }
  return ids;
};

export async function createSnapshot(options: SnapshotOptions = {}): Promise<SnapshotPackage> {
  const includeWallpaper = options.includeWallpaper ?? true;
  const includeStickers = options.includeStickers ?? true;
  const includeFavicons = options.includeFavicons ?? true;
  const includeExtendedState = options.includeExtendedState ?? false;
  const spaces = storage.getSpaces();
  const stickers = storage.getStickers('vertical');
  const deletedStickers = storage.getDeletedStickers('vertical');
  const horizontalStickers = includeExtendedState ? storage.getStickers('horizontal') : [];
  const horizontalDeletedStickers = includeExtendedState ? storage.getDeletedStickers('horizontal') : [];
  const assets: SnapshotPackage['assets'] = [];
  const faviconAssets: FaviconAssetRef[] = [];
  const stickerImageAssets: StickerImageAssetRef[] = [];
  const wallpaperAssets: WallpaperAssetRef[] = [];
  const weSceneAssets: WeSceneWallpaperAssetRef[] = [];
  const customFontAssets: CustomFontAssetRef[] = [];
  const localWebPageAssets: LocalWebPageAssetRef[] = [];

  if (includeFavicons) {
    const domains = new Set<string>();
    for (const space of spaces.spaces) collectFaviconDomains(space.apps, domains);
    if (includeExtendedState) collectWidgetFaviconDomains(domains);
    for (const domain of domains) {
      const item = await db.getFavicon(domain);
      if (!item?.data) continue;
      const path = `assets/favicons/${safeName(domain)}.${extensionFromType(item.data.type, 'ico')}`;
      assets.push({ path, blob: item.data });
      faviconAssets.push({
        path,
        domain,
        type: item.data.type || 'image/png',
        isFallback: item.isFallback,
        iconSmall: item.iconSmall,
        lastUpdated: item.lastUpdated,
      });
    }
  }

  if (includeStickers) {
    const ids = collectStickerImageIds(stickers);
    collectStickerImageIds(deletedStickers, ids);
    collectStickerImageIds(horizontalStickers, ids);
    collectStickerImageIds(horizontalDeletedStickers, ids);
    for (const id of ids) {
      const item = await db.getStickerImage(id);
      if (!item?.data) continue;
      const path = `assets/stickers/${safeName(id)}.${extensionFromType(item.data.type, 'png')}`;
      assets.push({ path, blob: item.data });
      stickerImageAssets.push({ path, id, type: item.data.type || 'image/png' });
    }
  }

  if (includeWallpaper) {
    for (const item of await db.getAll()) {
      if (isWeSceneWallpaperItem(item)) {
        if (!includeExtendedState) continue;
        const sceneSnapshot = await collectWeSceneSnapshot(item);
        weSceneAssets.push(sceneSnapshot.manifest);
        assets.push(...sceneSnapshot.assets);
        continue;
      }

      const path = `assets/wallpapers/${safeName(item.id)}.${extensionFromType(item.data.type, item.type === 'video' ? 'mp4' : 'png')}`;
      assets.push({ path, blob: item.data });
      let thumbnailPath: string | undefined;
      let thumbnailType: string | undefined;
      if (item.thumbnail) {
        thumbnailType = item.thumbnail.type || 'image/png';
        thumbnailPath = `assets/wallpapers/${safeName(item.id)}-thumb.${extensionFromType(thumbnailType, 'png')}`;
        assets.push({ path: thumbnailPath, blob: item.thumbnail });
      }
      wallpaperAssets.push({
        path,
        id: item.id,
        type: item.data.type || 'application/octet-stream',
        createdAt: item.createdAt,
        wallpaperType: item.type,
        thumbnailPath,
        thumbnailType,
      });
    }
  }

  if (includeExtendedState) {
    for (const font of await db.getAllCustomFonts()) {
      if (!font.data) continue;
      const path = `assets/fonts/${safeName(font.id)}.${extensionFromType(font.mimeType || font.data.type, 'font')}`;
      assets.push({ path, blob: font.data });
      customFontAssets.push({
        path,
        id: font.id,
        name: font.name,
        fileName: font.fileName,
        type: font.data.type || font.mimeType || 'application/octet-stream',
        mimeType: font.mimeType,
        createdAt: font.createdAt,
      });
    }

    for (const id of collectLocalWebPageIds()) {
      const page = await db.getLocalWebPage(id);
      if (!page) continue;
      if (page.kind === 'package' && page.entryPath) {
        const files = await getLocalWebFiles(page.id);
        const fileRefs: LocalWebPackageFileAssetRef[] = [];
        for (const file of files) {
          const path = `assets/local-web/${safeName(page.id)}/files/${file.path}`;
          assets.push({ path, blob: file.data });
          fileRefs.push({ path, relativePath: file.path, type: file.mimeType || file.data.type || 'application/octet-stream', size: file.size || file.data.size });
        }
        const entryRef = fileRefs.find((file) => file.relativePath === page.entryPath) ?? fileRefs[0];
        if (!entryRef) continue;
        localWebPageAssets.push({
          path: entryRef.path,
          id: page.id,
          name: page.name,
          type: entryRef.type,
          createdAt: page.createdAt,
          kind: 'package',
          entryPath: page.entryPath,
          fileCount: fileRefs.length,
          totalSize: fileRefs.reduce((sum, file) => sum + file.size, 0),
          files: fileRefs,
        });
        continue;
      }
      if (page.html === undefined) continue;
      const path = `assets/local-web/${safeName(page.id)}.html`;
      assets.push({ path, blob: new Blob([page.html], { type: 'text/html;charset=utf-8' }) });
      localWebPageAssets.push({ path, id: page.id, name: page.name, type: 'text/html', createdAt: page.createdAt, kind: 'html' });
    }
  }

  const lastUpdated = Date.now();
  return {
    manifest: {
      type: 'eclipin-snapshot',
      version: 2,
      appVersion: packageInfo.version,
      exportedAt: new Date(lastUpdated).toISOString(),
      lastUpdated,
      deviceName: getDeviceName(),
      assets: {
        favicons: faviconAssets,
        stickerImages: stickerImageAssets,
        wallpapers: wallpaperAssets,
        weScenes: includeExtendedState ? weSceneAssets : undefined,
        customFonts: includeExtendedState ? customFontAssets : undefined,
        localWebPages: includeExtendedState ? localWebPageAssets : undefined,
      },
    },
    data: {
      spaces,
      config: storage.getConfig(),
      searchEngine: storage.getSearchEngine(),
      wallpaperId: storage.getWallpaperId(),
      language: localStorage.getItem('app_language'),
      stickers,
      deletedStickers,
      horizontalStickers: includeExtendedState ? horizontalStickers : undefined,
      horizontalDeletedStickers: includeExtendedState ? horizontalDeletedStickers : undefined,
      stickerImagesMigrated: storage.isStickerImagesMigrated(),
      localStorageState: includeExtendedState ? collectAppLocalStorage() : undefined,
      vectorIcons: includeExtendedState ? await exportVectorIconRecords() : undefined,
    },
    assets,
  };
}

export async function applySnapshot(snapshot: SnapshotPackage, clearAssets = true): Promise<void> {
  if (!['eclipin-snapshot', 'eclipse-tab-snapshot'].includes(snapshot.manifest.type) || snapshot.manifest.version !== 2) {
    throw new Error('Unsupported snapshot');
  }
  if (!snapshot.data.spaces?.spaces || !Array.isArray(snapshot.data.spaces.spaces)) {
    throw new Error('Invalid snapshot data');
  }

  notifyPersistenceRestoreStart();

  try {
    const blobs = new Map(snapshot.assets.map(asset => [asset.path, asset.blob]));

    // Backward compatibility for full backups created before WE scenes were
    // embedded in the package: when importing over the same browser profile,
    // keep the currently referenced scene instead of deleting it and leaving a
    // dangling wallpaperId. A fresh install still requires a newly exported
    // backup because the old ZIP never contained the scene resources.
    const selectedWallpaperId = snapshot.data.wallpaperId;
    const selectedSceneIsPackaged = Boolean(
      selectedWallpaperId && snapshot.manifest.assets.weScenes?.some((scene) => scene.id === selectedWallpaperId)
    );
    const preservedLegacyWeScene = clearAssets && selectedWallpaperId && !selectedSceneIsPackaged
      ? await readExistingWeScenePackage(selectedWallpaperId)
      : null;

    if (clearAssets) {
      await db.clearAllFavicons();
      await db.clearAllStickerImages();
      const oldWallpapers = await db.getAll();
      if (oldWallpapers.length > 0) await db.removeMultiple(oldWallpapers.map(item => item.id));
    }

    for (const asset of snapshot.manifest.assets.favicons || []) {
      const blob = blobs.get(asset.path);
      if (!blob) continue;
      const item: FaviconItem = {
        domain: asset.domain,
        data: blob,
        isFallback: asset.isFallback,
        iconSmall: asset.iconSmall,
        lastUpdated: asset.lastUpdated,
      };
      await db.saveFavicon(item);
    }

    for (const asset of snapshot.manifest.assets.stickerImages || []) {
      const blob = blobs.get(asset.path);
      if (blob) await db.saveStickerImage({ id: asset.id, data: blob });
    }

    for (const asset of snapshot.manifest.assets.wallpapers || []) {
      const blob = blobs.get(asset.path);
      if (!blob) continue;
      const thumbnail = asset.thumbnailPath ? blobs.get(asset.thumbnailPath) : undefined;
      const item: BlobWallpaperItem = {
        id: asset.id,
        data: blob,
        thumbnail,
        createdAt: asset.createdAt || Date.now(),
        type: asset.wallpaperType,
      };
      await db.save(item);
    }

    for (const asset of snapshot.manifest.assets.weScenes || []) {
      await restoreWeSceneSnapshot(asset, blobs);
    }

    if (preservedLegacyWeScene && !(snapshot.manifest.assets.weScenes || []).some((scene) => scene.id === preservedLegacyWeScene.item.id)) {
      await restoreExistingWeScenePackage(preservedLegacyWeScene);
    }

    if (snapshot.manifest.assets.customFonts) {
      await db.clearAllCustomFonts();
      for (const asset of snapshot.manifest.assets.customFonts) {
        const blob = blobs.get(asset.path);
        if (!blob) continue;
        const item: CustomFontItem = {
          id: asset.id,
          name: asset.name,
          fileName: asset.fileName,
          data: blob,
          mimeType: asset.mimeType || blob.type,
          createdAt: asset.createdAt || Date.now(),
        };
        await db.saveCustomFont(item);
      }
    }
    if (snapshot.manifest.assets.localWebPages) {
      await db.clearAllLocalWebPages();
      await clearAllLocalWebFiles();
      for (const asset of snapshot.manifest.assets.localWebPages) {
        if (asset.kind === 'package' && asset.entryPath && asset.files?.length) {
          const packageFiles: LocalWebFileItem[] = asset.files.flatMap((file) => {
            const blob = blobs.get(file.path);
            if (!blob) return [];
            return [{
              key: `${asset.id}:${file.relativePath}`,
              pageId: asset.id,
              path: file.relativePath,
              data: blob,
              mimeType: file.type || blob.type || 'application/octet-stream',
              size: file.size || blob.size,
            }];
          });
          if (packageFiles.length === 0) continue;
          await saveLocalWebFiles(packageFiles);
          await db.saveLocalWebPage({
            id: asset.id,
            name: asset.name,
            kind: 'package',
            entryPath: asset.entryPath,
            fileCount: packageFiles.length,
            totalSize: packageFiles.reduce((sum, file) => sum + file.size, 0),
            createdAt: asset.createdAt || Date.now(),
          });
          continue;
        }
        const blob = blobs.get(asset.path);
        if (!blob) continue;
        const item: LocalWebPageItem = {
          id: asset.id,
          name: asset.name,
          html: await blob.text(),
          kind: 'html',
          createdAt: asset.createdAt || Date.now(),
        };
        await db.saveLocalWebPage(item);
      }
    }
    if (snapshot.data.vectorIcons) await replaceVectorIconRecords(snapshot.data.vectorIcons);

    // 先恢复扩展 localStorage，再写结构化快照字段：结构化数据是权威来源，
    // 避免旧版 localStorageState 意外覆盖新字段或迁移后的数据。
    if (snapshot.data.localStorageState) restoreAppLocalStorage(snapshot.data.localStorageState);

    storage.saveSpaces(snapshot.data.spaces);
    storage.saveConfig(snapshot.data.config);
    storage.saveWallpaperId(snapshot.data.wallpaperId || null);
    storage.saveStickers(snapshot.data.stickers || [], 'vertical');
    storage.saveDeletedStickers(snapshot.data.deletedStickers || [], 'vertical');
    if (Array.isArray(snapshot.data.horizontalStickers)) {
      storage.saveStickers(snapshot.data.horizontalStickers, 'horizontal');
    }
    if (Array.isArray(snapshot.data.horizontalDeletedStickers)) {
      storage.saveDeletedStickers(snapshot.data.horizontalDeletedStickers, 'horizontal');
    }

    if (snapshot.data.searchEngine) storage.saveSearchEngine(snapshot.data.searchEngine);
    else localStorage.removeItem('Eclipin_searchEngine');

    if (snapshot.data.language === 'en' || snapshot.data.language === 'zh') {
      localStorage.setItem('app_language', snapshot.data.language);
    }
    if (snapshot.data.stickerImagesMigrated) storage.markStickerImagesMigrated();

    notifyPersistenceRestoreApplied();
  } catch (error) {
    notifyPersistenceRestoreFailed();
    throw error;
  }
}

export function snapshotFromLegacySync(syncData: LegacySyncData): SnapshotPackage {
  const wallpaperAssets = (syncData.assets?.wallpapers || []).map(id => ({
    id,
    path: `assets/wallpapers/${safeName(id)}`,
    type: 'application/octet-stream',
    createdAt: Date.now(),
  }));
  const stickerImageAssets = (syncData.assets?.stickers || []).map(id => ({
    id,
    path: `assets/stickers/${safeName(id)}`,
    type: 'image/png',
  }));

  return {
    manifest: {
      type: 'eclipin-snapshot',
      version: 2,
      appVersion: packageInfo.version,
      exportedAt: new Date(syncData.lastUpdated || Date.now()).toISOString(),
      lastUpdated: syncData.lastUpdated || Date.now(),
      deviceName: syncData.deviceName || 'Unknown Device',
      assets: {
        favicons: [],
        stickerImages: stickerImageAssets,
        wallpapers: wallpaperAssets,
        customFonts: undefined,
        localWebPages: undefined,
      },
    },
    data: {
      spaces: syncData.data.spaces,
      config: syncData.data.config,
      searchEngine: syncData.data.searchEngine,
      wallpaperId: syncData.data.wallpaperId,
      language: null,
      stickers: syncData.data.stickers || [],
      deletedStickers: syncData.data.deletedStickers || [],
      stickerImagesMigrated: false,
    },
    assets: [],
  };
}

export function isSnapshotManifest(value: unknown): value is SnapshotManifest {
  return Boolean(
    value &&
    typeof value === 'object' &&
    ['eclipin-snapshot', 'eclipse-tab-snapshot'].includes((value as SnapshotManifest).type) &&
    (value as SnapshotManifest).version === 2
  );
}

export function getSnapshotAssetRefs(manifest: SnapshotManifest): { path: string; type: string }[] {
  const localWebAssets = (manifest.assets.localWebPages || []).reduce<Array<{ path: string; type: string }>>((result, asset) => {
    if (asset.files?.length) result.push(...asset.files.map((file) => ({ path: file.path, type: file.type })));
    else result.push({ path: asset.path, type: asset.type });
    return result;
  }, []);
  const weSceneAssets = getWeSceneSnapshotAssetRefs(manifest.assets.weScenes);
  return [
    ...manifest.assets.favicons,
    ...manifest.assets.stickerImages,
    ...manifest.assets.wallpapers,
    ...(manifest.assets.customFonts || []),
    ...localWebAssets,
    ...weSceneAssets,
    ...manifest.assets.wallpapers
      .filter(asset => asset.thumbnailPath)
      .map(asset => ({ path: asset.thumbnailPath!, type: asset.thumbnailType || 'image/png' })),
  ];
}
