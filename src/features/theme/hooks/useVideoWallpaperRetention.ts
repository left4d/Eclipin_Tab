import { useEffect, type MutableRefObject } from 'react';
import type { WallpaperType } from '@/shared/utils/db';

interface VideoWallpaperRetentionOptions {
  wallpaperId: string | null;
  wallpaperType: WallpaperType;
  wallpaperUrlRef: MutableRefObject<string | null>;
  loadWallpaperById: (id: string) => Promise<void>;
  releaseCurrentWallpaper: () => void;
}

/**
 * Video wallpaper policy follows the user's new-tab usage pattern: keep the
 * decoder warm while the new tab is visible, but release its Blob URL as soon
 * as the document is hidden. Returning to the tab reloads only the selected
 * video wallpaper from IndexedDB.
 */
export const useVideoWallpaperRetention = ({
  wallpaperId,
  wallpaperType,
  wallpaperUrlRef,
  loadWallpaperById,
  releaseCurrentWallpaper,
}: VideoWallpaperRetentionOptions): void => {
  useEffect(() => {
    let suspendedVideo = false;

    const releaseIfHidden = () => {
      if (document.visibilityState !== 'hidden' || wallpaperType !== 'video' || !wallpaperUrlRef.current) return;
      suspendedVideo = true;
      releaseCurrentWallpaper();
    };
    const resumeIfVisible = () => {
      if (document.visibilityState === 'hidden' || !wallpaperId) return;
      if (!suspendedVideo && wallpaperUrlRef.current) return;
      suspendedVideo = false;
      void loadWallpaperById(wallpaperId);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') releaseIfHidden();
      else resumeIfVisible();
    };
    const handlePageHide = (event: PageTransitionEvent) => {
      if (event.persisted || wallpaperType !== 'video' || !wallpaperUrlRef.current) return;
      suspendedVideo = true;
      releaseCurrentWallpaper();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', resumeIfVisible);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', resumeIfVisible);
    };
  }, [loadWallpaperById, releaseCurrentWallpaper, wallpaperId, wallpaperType, wallpaperUrlRef]);
};
