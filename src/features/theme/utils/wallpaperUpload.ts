export type WallpaperUploadKind = 'image' | 'video' | 'weScene';

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const MAX_VIDEO_SIZE = 500 * 1024 * 1024;
const MAX_WE_SCENE_ZIP_SIZE = 500 * 1024 * 1024;

export const classifyWallpaperUpload = (file: File): WallpaperUploadKind | null => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (
    file.name.toLowerCase().endsWith('.zip')
    || file.type === 'application/zip'
    || file.type === 'application/x-zip-compressed'
  ) return 'weScene';
  return null;
};

export const maxWallpaperUploadSize = (kind: WallpaperUploadKind): number => {
  if (kind === 'image') return MAX_IMAGE_SIZE;
  if (kind === 'video') return MAX_VIDEO_SIZE;
  return MAX_WE_SCENE_ZIP_SIZE;
};
