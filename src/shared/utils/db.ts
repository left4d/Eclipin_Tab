// Keep the upstream database name so existing installs retain wallpapers, stickers and local assets after the Eclipin rename.
export const DB_NAME = 'EclipseTabDB';
export const STORE_NAME = 'wallpapers';
export const STICKER_IMAGES_STORE = 'sticker_images';
export const FAVICONS_STORE = 'favicons';
export const CUSTOM_FONTS_STORE = 'custom_fonts';
export const LOCAL_WEB_PAGES_STORE = 'local_web_pages';
export const LOCAL_WEB_FILES_STORE = 'local_web_files';
export const WE_SCENE_RESOURCES_STORE = 'we_scene_resources';
const DB_VERSION = 7;

import type { BlobWallpaperItem, WallpaperItem } from '@/shared/types/wallpaper';
export type { BlobWallpaperItem, WallpaperItem, WallpaperType, WeSceneResourceItem, WeSceneWallpaperItem } from '@/shared/types/wallpaper';
export { isWeSceneWallpaperItem } from '@/shared/types/wallpaper';

export interface StickerImageItem {
    id: string;
    data: Blob;
}

export interface FaviconItem {
    domain: string; // 将作为主键使用
    data: Blob; // 图标图片 Blob（直接存储，不转 base64）
    isFallback: boolean;
    iconSmall?: boolean; // 标记图标为小尺寸
    lastUpdated?: number; // 记录更新时间
}

export interface CustomFontItem {
    id: string;
    name: string;
    fileName: string;
    data: Blob;
    mimeType: string;
    createdAt: number;
}

export interface LocalWebPageItem {
    id: string;
    name: string;
    html?: string;
    kind?: 'html' | 'package';
    entryPath?: string;
    fileCount?: number;
    totalSize?: number;
    createdAt: number;
}


interface DBWrapper {
    // 壁纸操作
    save: (item: BlobWallpaperItem) => Promise<string>;
    saveMultiple: (items: BlobWallpaperItem[]) => Promise<string[]>;
    get: (id: string) => Promise<WallpaperItem | null>;
    remove: (id: string) => Promise<void>;
    removeMultiple: (ids: string[]) => Promise<void>;
    getAll: () => Promise<WallpaperItem[]>;
    // 贴纸图片操作
    saveStickerImage: (item: StickerImageItem) => Promise<string>;
    getStickerImage: (id: string) => Promise<StickerImageItem | null>;
    removeStickerImage: (id: string) => Promise<void>;
    removeStickerImages: (ids: string[]) => Promise<void>;
    clearAllStickerImages: () => Promise<void>;
    // Favicon 操作
    saveFavicon: (item: FaviconItem) => Promise<string>;
    getFavicon: (domain: string) => Promise<FaviconItem | null>;
    deleteFavicon: (domain: string) => Promise<void>;
    clearAllFavicons: () => Promise<void>;
    // 自定义字体操作
    saveCustomFont: (item: CustomFontItem) => Promise<string>;
    getCustomFont: (id: string) => Promise<CustomFontItem | null>;
    getAllCustomFonts: () => Promise<CustomFontItem[]>;
    clearAllCustomFonts: () => Promise<void>;
    deleteCustomFont: (id: string) => Promise<void>;
    // 本地网页操作
    saveLocalWebPage: (item: LocalWebPageItem) => Promise<string>;
    getLocalWebPage: (id: string) => Promise<LocalWebPageItem | null>;
    getAllLocalWebPages: () => Promise<LocalWebPageItem[]>;
    deleteLocalWebPage: (id: string) => Promise<void>;
    clearAllLocalWebPages: () => Promise<void>;
    getRawDatabase: () => Promise<IDBDatabase>;
}

class IndexedDBWrapper implements DBWrapper {
    private dbPromise: Promise<IDBDatabase> | null = null;

    private getDB(): Promise<IDBDatabase> {
        if (!this.dbPromise) {
            this.dbPromise = new Promise((resolve, reject) => {
                if (typeof window === 'undefined' || !window.indexedDB) {
                    reject(new Error('IndexedDB is not supported'));
                    return;
                }

                try {
                    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

                    request.onerror = (event) => {
                        this.dbPromise = null;
                        // Handle privacy mode restrictions (SecurityError)
                        const error = (event.target as IDBOpenDBRequest).error;
                        console.error('IndexedDB open error:', error);
                        reject(error || new Error('Failed to open IndexedDB'));
                    };

                    request.onsuccess = () => resolve(request.result);

                    request.onupgradeneeded = (event) => {
                        const db = (event.target as IDBOpenDBRequest).result;
                        // v1: 创建 wallpapers store
                        if (!db.objectStoreNames.contains(STORE_NAME)) {
                            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                        }
                        // v2: 创建 sticker_images store
                        if (!db.objectStoreNames.contains(STICKER_IMAGES_STORE)) {
                            db.createObjectStore(STICKER_IMAGES_STORE, { keyPath: 'id' });
                        }
                        // v3: 创建 favicons store
                        if (!db.objectStoreNames.contains(FAVICONS_STORE)) {
                            db.createObjectStore(FAVICONS_STORE, { keyPath: 'domain' });
                        }
                        // v4: 创建自定义字体 store
                        if (!db.objectStoreNames.contains(CUSTOM_FONTS_STORE)) {
                            db.createObjectStore(CUSTOM_FONTS_STORE, { keyPath: 'id' });
                        }
                        // v5: 创建本地网页元数据 store
                        if (!db.objectStoreNames.contains(LOCAL_WEB_PAGES_STORE)) {
                            db.createObjectStore(LOCAL_WEB_PAGES_STORE, { keyPath: 'id' });
                        }
                        // v6: 网页包文件独立存储，按路径按需读取，避免每个资源请求反序列化整个网页包。
                        if (!db.objectStoreNames.contains(LOCAL_WEB_FILES_STORE)) {
                            const store = db.createObjectStore(LOCAL_WEB_FILES_STORE, { keyPath: 'key' });
                            store.createIndex('pageId', 'pageId', { unique: false });
                        }
                        // v7: Wallpaper Engine 场景资源独立存储。场景壁纸记录只保存元数据/中间格式，
                        // 纹理与序列帧按 wallpaperId + path 单独保存，避免退化成单 Blob 图片模型。
                        if (!db.objectStoreNames.contains(WE_SCENE_RESOURCES_STORE)) {
                            const store = db.createObjectStore(WE_SCENE_RESOURCES_STORE, { keyPath: 'key' });
                            store.createIndex('wallpaperId', 'wallpaperId', { unique: false });
                        }
                    };
                } catch (e) {
                    this.dbPromise = null;
                    reject(e);
                }
            });
        }
        return this.dbPromise;
    }

    getRawDatabase(): Promise<IDBDatabase> {
        return this.getDB();
    }

    // ========================================================================
    // 壁纸操作
    // ========================================================================

    async save(item: BlobWallpaperItem): Promise<string> {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put(item);

                request.onsuccess = () => resolve(item.id);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('DB Save Error:', error);
            throw error;
        }
    }

    // ========================================================================
    // 性能优化: 批量操作使用单个事务，减少事务开销
    // ========================================================================

    async saveMultiple(items: BlobWallpaperItem[]): Promise<string[]> {
        if (items.length === 0) return [];

        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const ids: string[] = [];

                // 在单个事务中执行所有写入操作
                items.forEach(item => {
                    store.put(item);
                    ids.push(item.id);
                });

                transaction.oncomplete = () => resolve(ids);
                transaction.onerror = () => reject(transaction.error);
            });
        } catch (error) {
            console.error('DB SaveMultiple Error:', error);
            throw error;
        }
    }

    async get(id: string): Promise<WallpaperItem | null> {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(id);

                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('DB Get Error:', error);
            return null;
        }
    }

    async remove(id: string): Promise<void> {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                // Always include the WE resource store. For image/video wallpapers the index
                // simply has no matching entries; for weScene this keeps metadata + resources
                // deletion atomic and prevents orphaned frame/texture blobs.
                const transaction = db.transaction([STORE_NAME, WE_SCENE_RESOURCES_STORE], 'readwrite');
                transaction.objectStore(STORE_NAME).delete(id);

                const resourceStore = transaction.objectStore(WE_SCENE_RESOURCES_STORE);
                const index = resourceStore.index('wallpaperId');
                const cursorRequest = index.openKeyCursor(IDBKeyRange.only(id));
                cursorRequest.onsuccess = () => {
                    const cursor = cursorRequest.result;
                    if (!cursor) return;
                    resourceStore.delete(cursor.primaryKey);
                    cursor.continue();
                };

                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
                transaction.onabort = () => reject(transaction.error || new Error('Failed to remove wallpaper'));
            });
        } catch (error) {
            console.error('DB Remove Error:', error);
            throw error;
        }
    }

    async removeMultiple(ids: string[]): Promise<void> {
        if (ids.length === 0) return;

        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_NAME, WE_SCENE_RESOURCES_STORE], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const resourceStore = transaction.objectStore(WE_SCENE_RESOURCES_STORE);
                const resourceIndex = resourceStore.index('wallpaperId');

                for (const id of ids) {
                    store.delete(id);
                    const cursorRequest = resourceIndex.openKeyCursor(IDBKeyRange.only(id));
                    cursorRequest.onsuccess = () => {
                        const cursor = cursorRequest.result;
                        if (!cursor) return;
                        resourceStore.delete(cursor.primaryKey);
                        cursor.continue();
                    };
                }

                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
                transaction.onabort = () => reject(transaction.error || new Error('Failed to remove wallpapers'));
            });
        } catch (error) {
            console.error('DB RemoveMultiple Error:', error);
            throw error;
        }
    }

    async getAll(): Promise<WallpaperItem[]> {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.getAll();

                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('DB GetAll Error:', error);
            return [];
        }
    }

    // ========================================================================
    // 贴纸图片操作
    // ========================================================================

    async saveStickerImage(item: StickerImageItem): Promise<string> {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STICKER_IMAGES_STORE, 'readwrite');
                const store = transaction.objectStore(STICKER_IMAGES_STORE);
                const request = store.put(item);

                request.onsuccess = () => resolve(item.id);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('DB SaveStickerImage Error:', error);
            throw error;
        }
    }

    async getStickerImage(id: string): Promise<StickerImageItem | null> {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STICKER_IMAGES_STORE, 'readonly');
                const store = transaction.objectStore(STICKER_IMAGES_STORE);
                const request = store.get(id);

                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('DB GetStickerImage Error:', error);
            return null;
        }
    }

    async removeStickerImage(id: string): Promise<void> {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STICKER_IMAGES_STORE, 'readwrite');
                const store = transaction.objectStore(STICKER_IMAGES_STORE);
                const request = store.delete(id);

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('DB RemoveStickerImage Error:', error);
            throw error;
        }
    }

    async removeStickerImages(ids: string[]): Promise<void> {
        if (ids.length === 0) return;

        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STICKER_IMAGES_STORE, 'readwrite');
                const store = transaction.objectStore(STICKER_IMAGES_STORE);

                ids.forEach(id => {
                    store.delete(id);
                });

                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });
        } catch (error) {
            console.error('DB RemoveStickerImages Error:', error);
            throw error;
        }
    }

    async clearAllStickerImages(): Promise<void> {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STICKER_IMAGES_STORE, 'readwrite');
                const store = transaction.objectStore(STICKER_IMAGES_STORE);
                const request = store.clear();

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('DB ClearAllStickerImages Error:', error);
        }
    }
    // ========================================================================
    // Favicon 操作
    // ========================================================================

    async saveFavicon(item: FaviconItem): Promise<string> {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(FAVICONS_STORE, 'readwrite');
                const store = transaction.objectStore(FAVICONS_STORE);
                const request = store.put(item);

                request.onsuccess = () => resolve(item.domain);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('DB SaveFavicon Error:', error);
            throw error;
        }
    }

    async getFavicon(domain: string): Promise<FaviconItem | null> {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(FAVICONS_STORE, 'readonly');
                const store = transaction.objectStore(FAVICONS_STORE);
                const request = store.get(domain);

                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('DB GetFavicon Error:', error);
            return null;
        }
    }

    async deleteFavicon(domain: string): Promise<void> {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(FAVICONS_STORE, 'readwrite');
                const store = transaction.objectStore(FAVICONS_STORE);
                const request = store.delete(domain);

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('DB DeleteFavicon Error:', error);
        }
    }

    async clearAllFavicons(): Promise<void> {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(FAVICONS_STORE, 'readwrite');
                const store = transaction.objectStore(FAVICONS_STORE);
                const request = store.clear();

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('DB ClearAllFavicons Error:', error);
        }
    }

    // ========================================================================
    // 自定义字体操作
    // ========================================================================

    async saveCustomFont(item: CustomFontItem): Promise<string> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(CUSTOM_FONTS_STORE, 'readwrite');
            const request = transaction.objectStore(CUSTOM_FONTS_STORE).put(item);
            request.onsuccess = () => resolve(item.id);
            request.onerror = () => reject(request.error);
        });
    }

    async getCustomFont(id: string): Promise<CustomFontItem | null> {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(CUSTOM_FONTS_STORE, 'readonly');
                const request = transaction.objectStore(CUSTOM_FONTS_STORE).get(id);
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('DB GetCustomFont Error:', error);
            return null;
        }
    }

    async getAllCustomFonts(): Promise<CustomFontItem[]> {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(CUSTOM_FONTS_STORE, 'readonly');
                const request = transaction.objectStore(CUSTOM_FONTS_STORE).getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('DB GetAllCustomFonts Error:', error);
            return [];
        }
    }

    async clearAllCustomFonts(): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(CUSTOM_FONTS_STORE, 'readwrite');
            const request = transaction.objectStore(CUSTOM_FONTS_STORE).clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async deleteCustomFont(id: string): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(CUSTOM_FONTS_STORE, 'readwrite');
            const request = transaction.objectStore(CUSTOM_FONTS_STORE).delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // ========================================================================
    // 本地网页操作
    // ========================================================================

    async saveLocalWebPage(item: LocalWebPageItem): Promise<string> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(LOCAL_WEB_PAGES_STORE, 'readwrite');
            const request = transaction.objectStore(LOCAL_WEB_PAGES_STORE).put(item);
            request.onsuccess = () => resolve(item.id);
            request.onerror = () => reject(request.error);
        });
    }

    async getLocalWebPage(id: string): Promise<LocalWebPageItem | null> {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(LOCAL_WEB_PAGES_STORE, 'readonly');
                const request = transaction.objectStore(LOCAL_WEB_PAGES_STORE).get(id);
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('DB GetLocalWebPage Error:', error);
            return null;
        }
    }

    async getAllLocalWebPages(): Promise<LocalWebPageItem[]> {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(LOCAL_WEB_PAGES_STORE, 'readonly');
                const request = transaction.objectStore(LOCAL_WEB_PAGES_STORE).getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('DB GetAllLocalWebPages Error:', error);
            return [];
        }
    }

    async deleteLocalWebPage(id: string): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(LOCAL_WEB_PAGES_STORE, 'readwrite');
            const request = transaction.objectStore(LOCAL_WEB_PAGES_STORE).delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async clearAllLocalWebPages(): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(LOCAL_WEB_PAGES_STORE, 'readwrite');
            const request = transaction.objectStore(LOCAL_WEB_PAGES_STORE).clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }



}

export const db = new IndexedDBWrapper();
