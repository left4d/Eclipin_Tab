import React, { useEffect, useState } from 'react';

import { useWallpaperStorage } from '@/features/theme/hooks/useWallpaperStorage';
import { isWeSceneWallpaperItem, type WallpaperItem } from '@/shared/utils/db';
import styles from './WallpaperGallery.module.css';
import wallpaperIcon from '@/assets/icons/wallpaper.svg';
import closeIcon from '@/assets/icons/close.svg';

export interface WallpaperGalleryProps {
    wallpaperId: string | null;
    onWallpaperIdChange: (id: string) => Promise<void>;
    onWallpaperClear: () => void;
    onWallpaperUpload: (file: File) => Promise<void>;
}

export const WallpaperGallery: React.FC<WallpaperGalleryProps> = React.memo(({
    wallpaperId,
    onWallpaperIdChange,
    onWallpaperClear,
    onWallpaperUpload
}) => {
    const { getRecentWallpapers, createWallpaperUrl, revokeWallpaperUrl, deleteWallpaper } = useWallpaperStorage();
    const [recentWallpapers, setRecentWallpapers] = useState<WallpaperItem[]>([]);
    const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const thumbnailUrlsRef = React.useRef<string[]>([]);

    const loadWallpapers = async () => {
        const wallpapers = await getRecentWallpapers();
        setRecentWallpapers(wallpapers);

        thumbnailUrlsRef.current.forEach(revokeWallpaperUrl);
        const newThumbnails: Record<string, string> = {};
        wallpapers.forEach(wp => {
            const previewBlob = wp.thumbnail || (isWeSceneWallpaperItem(wp) ? null : wp.data);
            if (previewBlob) newThumbnails[wp.id] = createWallpaperUrl(previewBlob);
        });
        thumbnailUrlsRef.current = Object.values(newThumbnails);
        setThumbnails(newThumbnails);
    };

    useEffect(() => {
        void loadWallpapers();
        return () => {
            thumbnailUrlsRef.current.forEach(revokeWallpaperUrl);
            thumbnailUrlsRef.current = [];
        };
    }, [revokeWallpaperUrl]);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            await onWallpaperUpload(file);
            await loadWallpapers();
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleWallpaperSelect = async (id: string) => {
        if (id === wallpaperId) return;
        await onWallpaperIdChange(id);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            await deleteWallpaper(id);
            if (id === wallpaperId) {
                onWallpaperClear();
            }
            await loadWallpapers();
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    return (
        <div className={styles.gridContainer}>
            {/* Upload Button */}
            <div
                className={`${styles.uploadBtn} ${isUploading ? styles.uploading : ''}`}
                onClick={handleUploadClick}
                title="Upload Wallpaper"
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,.zip,application/zip,application/x-zip-compressed"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />
                <img src={wallpaperIcon} alt="Upload" width={24} height={24} />
            </div>

            {/* Recent Wallpapers */}
            {recentWallpapers.map(wp => (
                <div
                    key={wp.id}
                    className={`${styles.thumbnail} ${wp.id === wallpaperId ? styles.active : ''}`}
                    onClick={() => handleWallpaperSelect(wp.id)}
                    title={isWeSceneWallpaperItem(wp)
                        ? `Wallpaper Engine · ${wp.sourceDescriptorPath}`
                        : new Date(wp.createdAt).toLocaleDateString()}
                >
                    {thumbnails[wp.id] && (
                        <img src={thumbnails[wp.id]} alt="Wallpaper" className={styles.image} />
                    )}
                    {isWeSceneWallpaperItem(wp) && (
                        <span className={styles.weSceneBadge} aria-label="Wallpaper Engine scene">WE</span>
                    )}
                    <button
                        className={styles.deleteBtn}
                        onClick={(e) => handleDelete(e, wp.id)}
                        title="Delete"
                    >
                        <img src={closeIcon} alt="Delete" width={10} height={10} />
                    </button>
                </div>
            ))}
        </div>
    );
});
