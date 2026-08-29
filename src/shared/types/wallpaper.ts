export type WallpaperType = 'image' | 'video' | 'weScene';

export interface BlobWallpaperItem {
    id: string;
    data: Blob;
    thumbnail?: Blob;
    createdAt: number;
    type?: 'image' | 'video'; // undefined = 'image'，向后兼容
}

/**
 * Multi-resource scene wallpaper metadata. The converted scene is stored here;
 * referenced textures/frames live in the dedicated WE resource object store.
 */
export interface WeSceneWallpaperItem {
    id: string;
    type: 'weScene';
    thumbnail?: Blob;
    createdAt: number;
    sourceFileName: string;
    sourceDescriptorPath: string;
    scene: unknown;
    resourceCount: number;
    totalResourceBytes: number;
}

export type WallpaperItem = BlobWallpaperItem | WeSceneWallpaperItem;

export interface WeSceneResourceItem {
    key: string;
    wallpaperId: string;
    path: string;
    data: Blob;
    mimeType: string;
    byteLength: number;
}

export const isWeSceneWallpaperItem = (item: WallpaperItem): item is WeSceneWallpaperItem => (
    item.type === 'weScene'
);
