export type WallpaperUploadKind = 'image' | 'video' | 'weScene';

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const MAX_VIDEO_SIZE = 500 * 1024 * 1024;
const MAX_WE_SCENE_ARCHIVE_SIZE = 500 * 1024 * 1024;

export const classifyWallpaperUpload = (file: File): WallpaperUploadKind | null => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  // A packed scene.pkg reports no useful MIME type, so match on the extension.
  const name = file.name.toLowerCase();
  if (
    name.endsWith('.zip')
    || name.endsWith('.pkg')
    || file.type === 'application/zip'
    || file.type === 'application/x-zip-compressed'
  ) return 'weScene';
  return null;
};

export const maxWallpaperUploadSize = (kind: WallpaperUploadKind): number => {
  if (kind === 'image') return MAX_IMAGE_SIZE;
  if (kind === 'video') return MAX_VIDEO_SIZE;
  return MAX_WE_SCENE_ARCHIVE_SIZE;
};
