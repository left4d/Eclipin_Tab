import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Sticker, StickerInput, DEFAULT_TEXT_STYLE } from '@/shared/types';
import { storage } from '@/shared/utils/storage';
import { db } from '@/shared/utils/db';
import { PERSISTENCE_RESTORE_APPLIED_EVENT, PERSISTENCE_RESTORE_FAILED_EVENT, PERSISTENCE_RESTORE_START_EVENT } from '@/shared/utils/persistenceLifecycle';
import { useThemeData } from '@/features/theme/context/ThemeContext';

// 防抖保存延迟 (ms)
const SAVE_DEBOUNCE_MS = 500;

// ============================================================================
// Context 类型定义
// ============================================================================

interface ZenShelfContextType {
    // 状态
    stickers: Sticker[];
    allStickers: Sticker[];
    deletedStickers: Sticker[];
    selectedStickerId: string | null;
    currentPageIndex: number;

    // 操作
    addSticker: (input: StickerInput) => string;
    updateSticker: (id: string, updates: Partial<Sticker>) => void;
    deleteSticker: (id: string) => void;
    selectSticker: (id: string | null) => void;
    setCurrentPageIndex: (pageIndex: number) => void;
    bringToTop: (id: string) => void;
    restoreSticker: (sticker: Sticker) => void;
    permanentlyDeleteSticker: (id: string) => void;
    clearRecycleBin: () => void;
}

const ZenShelfContext = createContext<ZenShelfContextType | undefined>(undefined);

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 生成 UUID
 */
const generateId = (): string => {
    return `sticker-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const getPageId = (pageIndex: number) => `page-${pageIndex}`;

const belongsToPage = (sticker: Sticker, pageId: string) => (sticker.pageId ?? 'page-0') === pageId;
const isVisibleOnPage = (sticker: Sticker, pageId: string) => sticker.positionMode === 'viewport' || belongsToPage(sticker, pageId);

const migrateStickersToHorizontalPages = (stickers: Sticker[]): Sticker[] => {
    const viewportHeight = Math.max(320, window.innerHeight);
    return stickers.map((sticker) => {
        if (sticker.positionMode === 'viewport') {
            return { ...sticker };
        }
        const rawPage = Number.parseInt((sticker.pageId ?? 'page-0').replace('page-', ''), 10);
        const sourcePage = Number.isFinite(rawPage) ? Math.max(0, rawPage) : 0;
        if (sourcePage === 0) {
            return { ...sticker, pageId: 'page-0' };
        }
        const pageOffset = sticker.y < 0 ? 0 : Math.floor(sticker.y / viewportHeight);
        const pageIndex = Math.max(1, sourcePage + pageOffset);
        return {
            ...sticker,
            pageId: `page-${pageIndex}`,
            y: sticker.y - pageOffset * viewportHeight,
        };
    });
};

const scheduleStickerImageCleanup = (ids: string[]) => {
    if (ids.length === 0) return;
    window.setTimeout(() => {
        const referenced = new Set<string>();
        for (const mode of ['vertical', 'horizontal'] as const) {
            [...storage.getStickers(mode), ...storage.getDeletedStickers(mode)].forEach((sticker) => {
                if (sticker.type === 'image' && sticker.content && !sticker.content.startsWith('data:')) referenced.add(sticker.content);
                if (sticker.type === 'image' && sticker.iconSwapContent && !sticker.iconSwapContent.startsWith('data:')) referenced.add(sticker.iconSwapContent);
            });
        }
        const orphaned = Array.from(new Set(ids)).filter((id) => !referenced.has(id));
        if (orphaned.length > 0) db.removeStickerImages(orphaned).catch(console.error);
    }, SAVE_DEBOUNCE_MS + 180);
};

const loadStickerLayout = (mode: 'vertical' | 'horizontal') => {
    if (mode === 'horizontal' && !storage.hasStickerLayout('horizontal')) {
        const migrated = migrateStickersToHorizontalPages(storage.getStickers('vertical'));
        const migratedDeleted = migrateStickersToHorizontalPages(storage.getDeletedStickers('vertical'));
        storage.saveStickers(migrated, 'horizontal');
        storage.saveDeletedStickers(migratedDeleted, 'horizontal');
    }
    return {
        active: storage.getStickers(mode),
        deleted: storage.getDeletedStickers(mode),
    };
};

// ============================================================================
// Provider 实现
// ============================================================================

export const ZenShelfProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { pageSlideDirection } = useThemeData();
    const initialLayoutRef = useRef<'vertical' | 'horizontal'>(pageSlideDirection);
    const initialLayout = useMemo(() => loadStickerLayout(initialLayoutRef.current), []);
    // 上下/左右模式使用两套布局，避免无限横向分页与纵向长画布互相改写坐标。
    const [allStickers, setAllStickers] = useState<Sticker[]>(initialLayout.active);
    const [allDeletedStickers, setAllDeletedStickers] = useState<Sticker[]>(initialLayout.deleted);
    const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const pageIndex = currentPageIndex;
    const currentPageId = useMemo(() => getPageId(pageIndex), [pageIndex]);
    const stickers = useMemo(() => allStickers.filter(sticker => isVisibleOnPage(sticker, currentPageId)), [allStickers, currentPageId]);
    const deletedStickers = useMemo(() => allDeletedStickers.filter(sticker => isVisibleOnPage(sticker, currentPageId)), [allDeletedStickers, currentPageId]);

    // 防抖保存 refs；latest refs 用于在标签页关闭前同步落盘最新数据。
    const stickersSaveTimeoutRef = useRef<number | null>(null);
    const deletedStickersSaveTimeoutRef = useRef<number | null>(null);
    // 快照恢复期间禁止把当前页面的旧内存状态写回 localStorage。
    // 否则 import 完成后的 reload/pagehide 会把刚恢复的贴纸再次覆盖掉。
    const persistenceSuspendedRef = useRef(false);
    const latestStickersRef = useRef(allStickers);
    const latestDeletedStickersRef = useRef(allDeletedStickers);
    latestStickersRef.current = allStickers;
    latestDeletedStickersRef.current = allDeletedStickers;

    useEffect(() => {
        const cancelPendingStickerSaves = () => {
            if (stickersSaveTimeoutRef.current !== null) {
                window.clearTimeout(stickersSaveTimeoutRef.current);
                stickersSaveTimeoutRef.current = null;
            }
            if (deletedStickersSaveTimeoutRef.current !== null) {
                window.clearTimeout(deletedStickersSaveTimeoutRef.current);
                deletedStickersSaveTimeoutRef.current = null;
            }
        };

        const handleRestoreStart = () => {
            persistenceSuspendedRef.current = true;
            cancelPendingStickerSaves();
        };

        const handleRestoreApplied = () => {
            // applySnapshot 已经把结构化贴纸写入 storage。这里同步刷新 refs，
            // 确保紧随其后的 reload/pagehide 即使触发保存，也只会写回恢复后的数据。
            const restored = loadStickerLayout(initialLayoutRef.current);
            latestStickersRef.current = restored.active;
            latestDeletedStickersRef.current = restored.deleted;
            setAllStickers(restored.active);
            setAllDeletedStickers(restored.deleted);
            persistenceSuspendedRef.current = false;
        };

        const handleRestoreFailed = () => {
            persistenceSuspendedRef.current = false;
        };

        window.addEventListener(PERSISTENCE_RESTORE_START_EVENT, handleRestoreStart);
        window.addEventListener(PERSISTENCE_RESTORE_APPLIED_EVENT, handleRestoreApplied);
        window.addEventListener(PERSISTENCE_RESTORE_FAILED_EVENT, handleRestoreFailed);
        return () => {
            window.removeEventListener(PERSISTENCE_RESTORE_START_EVENT, handleRestoreStart);
            window.removeEventListener(PERSISTENCE_RESTORE_APPLIED_EVENT, handleRestoreApplied);
            window.removeEventListener(PERSISTENCE_RESTORE_FAILED_EVENT, handleRestoreFailed);
        };
    }, []);

    // 持久化：stickers 变化时防抖保存到 localStorage
    useEffect(() => {
        if (stickersSaveTimeoutRef.current !== null) {
            window.clearTimeout(stickersSaveTimeoutRef.current);
        }
        stickersSaveTimeoutRef.current = window.setTimeout(() => {
            stickersSaveTimeoutRef.current = null;
            if (persistenceSuspendedRef.current) return;
            storage.saveStickers(latestStickersRef.current, initialLayoutRef.current);
        }, SAVE_DEBOUNCE_MS);

        return () => {
            if (stickersSaveTimeoutRef.current !== null) {
                window.clearTimeout(stickersSaveTimeoutRef.current);
                stickersSaveTimeoutRef.current = null;
            }
        };
    }, [allStickers]);

    // 持久化：deletedStickers 变化时防抖保存到 localStorage
    useEffect(() => {
        if (deletedStickersSaveTimeoutRef.current !== null) {
            window.clearTimeout(deletedStickersSaveTimeoutRef.current);
        }
        deletedStickersSaveTimeoutRef.current = window.setTimeout(() => {
            deletedStickersSaveTimeoutRef.current = null;
            if (persistenceSuspendedRef.current) return;
            storage.saveDeletedStickers(latestDeletedStickersRef.current, initialLayoutRef.current);
        }, SAVE_DEBOUNCE_MS);

        return () => {
            if (deletedStickersSaveTimeoutRef.current !== null) {
                window.clearTimeout(deletedStickersSaveTimeoutRef.current);
                deletedStickersSaveTimeoutRef.current = null;
            }
        };
    }, [allDeletedStickers]);

    useEffect(() => {
        const flushPendingStickerChanges = () => {
            if (persistenceSuspendedRef.current) return;
            if (stickersSaveTimeoutRef.current !== null) {
                window.clearTimeout(stickersSaveTimeoutRef.current);
                stickersSaveTimeoutRef.current = null;
            }
            if (deletedStickersSaveTimeoutRef.current !== null) {
                window.clearTimeout(deletedStickersSaveTimeoutRef.current);
                deletedStickersSaveTimeoutRef.current = null;
            }
            storage.saveStickers(latestStickersRef.current, initialLayoutRef.current);
            storage.saveDeletedStickers(latestDeletedStickersRef.current, initialLayoutRef.current);
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') flushPendingStickerChanges();
        };

        window.addEventListener('pagehide', flushPendingStickerChanges);
        window.addEventListener('eclipin:flush-persistent-state', flushPendingStickerChanges);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            window.removeEventListener('pagehide', flushPendingStickerChanges);
            window.removeEventListener('eclipin:flush-persistent-state', flushPendingStickerChanges);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            flushPendingStickerChanges();
        };
    }, []);

    useEffect(() => {
        const nextMode = pageSlideDirection;
        if (initialLayoutRef.current === nextMode) return;
        if (!persistenceSuspendedRef.current) {
            storage.saveStickers(latestStickersRef.current, initialLayoutRef.current);
            storage.saveDeletedStickers(latestDeletedStickersRef.current, initialLayoutRef.current);
        }
        const nextLayout = loadStickerLayout(nextMode);
        initialLayoutRef.current = nextMode;
        setAllStickers(nextLayout.active);
        setAllDeletedStickers(nextLayout.deleted);
        setSelectedStickerId(null);
        setCurrentPageIndex(0);
    }, [pageSlideDirection]);

    useEffect(() => {
        setSelectedStickerId(null);
    }, [currentPageId]);

    // ========================================================================
    // 数据迁移：将旧的 base64 图片贴纸迁移到 IndexedDB
    // ========================================================================
    useEffect(() => {
        if (storage.isStickerImagesMigrated()) return;

        const migrateStickers = async () => {
            try {
                // 迁移活跃贴纸
                const activeStickers = storage.getStickers(initialLayoutRef.current);
                const deletedStickersList = storage.getDeletedStickers(initialLayoutRef.current);
                let hasChanges = false;

                const migrateList = async (list: Sticker[]): Promise<Sticker[]> => {
                    const migrated = [...list];
                    for (let i = 0; i < migrated.length; i++) {
                        const s = migrated[i];
                        if (s.type === 'image' && s.content.startsWith('data:')) {
                            try {
                                // base64 转 Blob
                                const response = await fetch(s.content);
                                const blob = await response.blob();
                                const id = `stickerimg_migrated_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                                await db.saveStickerImage({ id, data: blob });
                                migrated[i] = { ...s, content: id };
                                hasChanges = true;
                            } catch (err) {
                                console.warn('Failed to migrate sticker image:', s.id, err);
                            }
                        }
                    }
                    return migrated;
                };

                const migratedActive = await migrateList(activeStickers);
                const migratedDeleted = await migrateList(deletedStickersList);

                if (hasChanges) {
                    storage.saveStickers(migratedActive, initialLayoutRef.current);
                    storage.saveDeletedStickers(migratedDeleted, initialLayoutRef.current);
                    setAllStickers(migratedActive);
                    setAllDeletedStickers(migratedDeleted);
                }

                storage.markStickerImagesMigrated();
                console.log('Sticker image migration completed');
            } catch (error) {
                console.error('Sticker image migration failed:', error);
            }
        };

        migrateStickers();
    }, []); // 仅在首次挂载时执行
    // ========================================================================
    // 操作函数
    // ========================================================================

    const addSticker = useCallback((input: StickerInput) => {
        const newId = generateId();
        setAllStickers(prev => {
            const pageStickers = prev.filter(sticker => belongsToPage(sticker, currentPageId));
            // 计算下一个 zIndex (比当前最大值高 1)
            const maxZ = Math.max(...pageStickers.map(s => s.zIndex || 1), 0);
            const newSticker: Sticker = {
                ...input,
                id: newId,
                pageId: currentPageId,
                zIndex: maxZ + 1,
                // 确保文字贴纸有默认样式
                style: input.type === 'text' ? (input.style || DEFAULT_TEXT_STYLE) : input.style,
            };
            return [...prev, newSticker];
        });
        return newId;
    }, [currentPageId]);

    const updateSticker = useCallback((id: string, updates: Partial<Sticker>) => {
        setAllStickers(prev => prev.map(sticker =>
            sticker.id === id ? { ...sticker, ...updates } : sticker
        ));
    }, []);

    const deleteSticker = useCallback((id: string) => {
        setAllStickers(prev => {
            const stickerToDelete = prev.find(s => s.id === id);

            if (stickerToDelete) {
                setAllDeletedStickers(prevDeleted => {
                    const newDeleted = [stickerToDelete, ...prevDeleted];
                    const pageDeleted = newDeleted.filter(sticker => isVisibleOnPage(sticker, currentPageId));
                    if (pageDeleted.length > 30) {
                        // 清理被截断的贴纸的 IndexedDB 图片数据
                        const truncated = pageDeleted.slice(30);
                        const imageIds = truncated.flatMap((s) => {
                            if (s.type !== 'image') return [];
                            return [s.content, s.iconSwapContent]
                                .filter((id): id is string => Boolean(id && !id.startsWith('data:')));
                        });
                        scheduleStickerImageCleanup(imageIds);
                        const truncatedIds = new Set(truncated.map(sticker => sticker.id));
                        return newDeleted.filter(sticker => !truncatedIds.has(sticker.id));
                    }
                    return newDeleted;
                });
            }

            return prev.filter(sticker => sticker.id !== id);
        });

        // 如果删除的是选中的贴纸，取消选中
        setSelectedStickerId(prev => prev === id ? null : prev);
    }, [currentPageId]);

    const restoreSticker = useCallback((stickerToRestore: Sticker) => {
        // Remove from deleted
        setAllDeletedStickers(prev => prev.filter(s => s.id !== stickerToRestore.id));

        // Add back to active stickers
        setAllStickers(prev => {
            const restoredPageId = stickerToRestore.pageId ?? currentPageId;
            const pageStickers = prev.filter(sticker => belongsToPage(sticker, restoredPageId));
            // Recalculate zIndex to be on top
            const maxZ = Math.max(...pageStickers.map(s => s.zIndex || 1), 0);
            return [...prev, { ...stickerToRestore, pageId: restoredPageId, zIndex: maxZ + 1 }];
        });
    }, [currentPageId]);

    const permanentlyDeleteSticker = useCallback((id: string) => {
        setAllDeletedStickers(prev => {
            const sticker = prev.find(s => s.id === id);
            // 清理 IndexedDB 中的图片数据
            if (sticker && sticker.type === 'image') {
                scheduleStickerImageCleanup([sticker.content, sticker.iconSwapContent]
                    .filter((imageId): imageId is string => Boolean(imageId && !imageId.startsWith('data:'))));
            }
            return prev.filter(s => s.id !== id);
        });
    }, []);

    const clearRecycleBin = useCallback(() => {
        setAllDeletedStickers(prev => {
            // 清理所有图片贴纸的 IndexedDB 数据
            const imageIds = prev
                .filter(sticker => isVisibleOnPage(sticker, currentPageId))
                .flatMap((s) => {
                    if (s.type !== 'image') return [];
                    return [s.content, s.iconSwapContent]
                        .filter((imageId): imageId is string => Boolean(imageId && !imageId.startsWith('data:')));
                });
            scheduleStickerImageCleanup(imageIds);
            return prev.filter(sticker => !isVisibleOnPage(sticker, currentPageId));
        });
    }, [currentPageId]);

    const bringToTop = useCallback((id: string) => {
        setAllStickers(prev => {
            const stickerToTop = prev.find(sticker => sticker.id === id);
            const pageId = stickerToTop?.pageId ?? currentPageId;
            const pageStickers = prev.filter(sticker => belongsToPage(sticker, pageId));
            // 计算当前最大 zIndex
            const maxZ = Math.max(...pageStickers.map(s => s.zIndex || 1), 0);
            return prev.map(sticker =>
                sticker.id === id ? { ...sticker, zIndex: maxZ + 1 } : sticker
            );
        });
    }, [currentPageId]);

    const selectSticker = useCallback((id: string | null) => {
        setSelectedStickerId(id);
    }, []);


    // ========================================================================
    // Context 值
    // ========================================================================

    const contextValue: ZenShelfContextType = useMemo(() => ({
        stickers,
        allStickers,
        deletedStickers,
        selectedStickerId,
        currentPageIndex,
        addSticker,
        updateSticker,
        deleteSticker,
        restoreSticker,
        permanentlyDeleteSticker,
        clearRecycleBin,
        selectSticker,
        setCurrentPageIndex,
        bringToTop,
    }), [
        stickers,
        allStickers,
        deletedStickers,
        selectedStickerId,
        currentPageIndex,
        addSticker,
        updateSticker,
        deleteSticker,
        restoreSticker,
        permanentlyDeleteSticker,
        clearRecycleBin,
        selectSticker,
        setCurrentPageIndex,
        bringToTop,
    ]);

    return (
        <ZenShelfContext.Provider value={contextValue}>
            {children}
        </ZenShelfContext.Provider>
    );
};

// ============================================================================
// Hook
// ============================================================================

/**
 * 获取 Zen Shelf 上下文
 */
export const useZenShelf = (): ZenShelfContextType => {
    const context = useContext(ZenShelfContext);
    if (context === undefined) {
        throw new Error('useZenShelf must be used within a ZenShelfProvider');
    }
    return context;
};
