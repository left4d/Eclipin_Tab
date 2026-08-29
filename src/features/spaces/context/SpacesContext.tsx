import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Space, SpacesState, DockItem, createDefaultSpace } from '@/shared/types';
import { storage } from '@/shared/utils/storage';
import { SpaceExportData, MultiSpaceExportData, createSpaceFromImport, createSpacesFromMultiImport } from '@/features/spaces/utils/spaceExportImport';
import { prefetchIcons } from '@/features/dock/utils/iconCache';
import { generateFolderIcon } from '@/features/dock/utils/iconFetcher';


const normalizeSpacesState = (state: SpacesState): SpacesState => {
    const normalizedSpaces = state.spaces.map(space => ({
        ...space,
        showInDock: space.showInDock !== false,
    }));
    const dockSpaces = normalizedSpaces.filter(space => space.showInDock !== false);
    const fallbackSpace = dockSpaces[0] ?? normalizedSpaces[0];
    const activeIsVisible = dockSpaces.some(space => space.id === state.activeSpaceId);

    return {
        ...state,
        spaces: normalizedSpaces,
        activeSpaceId: activeIsVisible ? state.activeSpaceId : (fallbackSpace?.id ?? state.activeSpaceId),
    };
};

function containsDockItem(items: DockItem[], itemId: string): boolean {
    return items.some(item =>
        item.id === itemId ||
        (item.type === 'folder' && item.items ? containsDockItem(item.items, itemId) : false)
    );
}

function extractDockItem(
    items: DockItem[],
    itemId: string
): { items: DockItem[]; extractedItem: DockItem | null } {
    for (let index = 0; index < items.length; index += 1) {
        const item = items[index];

        if (item.id === itemId) {
            return {
                items: [...items.slice(0, index), ...items.slice(index + 1)],
                extractedItem: item,
            };
        }

        if (item.type === 'folder' && item.items) {
            const nestedResult = extractDockItem(item.items, itemId);
            if (!nestedResult.extractedItem) continue;

            const nextItems = [...items];
            if (nestedResult.items.length === 0) {
                nextItems.splice(index, 1);
            } else if (nestedResult.items.length === 1) {
                nextItems[index] = nestedResult.items[0];
            } else {
                nextItems[index] = {
                    ...item,
                    items: nestedResult.items,
                    icon: generateFolderIcon(nestedResult.items),
                };
            }

            return {
                items: nextItems,
                extractedItem: nestedResult.extractedItem,
            };
        }
    }

    return { items, extractedItem: null };
}

// ============================================================================
// 数据层 Context 类型定义 (低频变化)
// ============================================================================

interface SpacesDataContextType {
    // 状态
    spaces: Space[];
    /** 参与首页快捷网址栏显示和切换的空间 */
    dockSpaces: Space[];
    activeSpaceId: string;
    isSwitching: boolean;

    // 派生
    currentSpace: Space;
    currentIndex: number;
    dockCurrentIndex: number;
}

const SpacesDataContext = createContext<SpacesDataContextType | undefined>(undefined);

// ============================================================================
// 操作层 Context 类型定义 (几乎不变)
// ============================================================================

interface SpacesActionsContextType {
    switchToNextSpace: () => void;
    switchToSpace: (spaceId: string) => void;
    addSpace: (name?: string) => void;
    deleteSpace: (spaceId: string) => void;
    renameSpace: (spaceId: string, newName: string) => void;
    setSpaceDockVisibility: (spaceId: string, visible: boolean) => void;
    updateCurrentSpaceApps: (apps: DockItem[] | ((prev: DockItem[]) => DockItem[])) => void;
    /** 按指定空间 ID 更新 apps（异步操作安全，不受空间切换影响） */
    updateSpaceApps: (spaceId: string, apps: DockItem[] | ((prev: DockItem[]) => DockItem[])) => void;
    moveItemToSpace: (sourceSpaceId: string, targetSpaceId: string, itemId: string) => void;
    importSpace: (data: SpaceExportData) => Promise<Space>;
    importMultipleSpaces: (data: MultiSpaceExportData) => Promise<Space[]>;
    pinSpace: (spaceId: string) => void;
    setIsSwitching: (value: boolean) => void;
}

const SpacesActionsContext = createContext<SpacesActionsContextType | undefined>(undefined);

// ============================================================================
// 组合类型 (兼容层)
// ============================================================================

interface SpacesContextType extends SpacesDataContextType, SpacesActionsContextType { }

// ============================================================================
// Provider 实现
// ============================================================================

interface SpacesProviderProps {
    children: React.ReactNode;
}

export function SpacesProvider({ children }: SpacesProviderProps) {
    // 初始化状态（从 localStorage 读取，只调用一次）
    const [spacesState, setSpacesState] = useState<SpacesState>(() => {
        const loaded = storage.getSpaces();
        return normalizeSpacesState(loaded);
    });
    const [isSwitching, setIsSwitching] = useState(false);

    // 跟踪是否已完成首次渲染
    const isFirstRenderRef = useRef(true);

    // 解构状态
    const { spaces, activeSpaceId } = spacesState;

    // 派生：首页快捷网址栏可见空间
    const dockSpaces = useMemo(() => {
        const visible = spaces.filter(space => space.showInDock !== false);
        return visible.length > 0 ? visible : spaces.slice(0, 1);
    }, [spaces]);

    // 派生：当前空间
    const currentSpace = useMemo(() => {
        return spaces.find(s => s.id === activeSpaceId) || spaces[0];
    }, [spaces, activeSpaceId]);

    // 派生：当前索引
    const currentIndex = useMemo(() => {
        return spaces.findIndex(s => s.id === activeSpaceId);
    }, [spaces, activeSpaceId]);

    const dockCurrentIndex = useMemo(() => {
        return dockSpaces.findIndex(s => s.id === activeSpaceId);
    }, [dockSpaces, activeSpaceId]);

    // 首次加载时预取所有空间的图标到内存缓存
    // 这样切换空间时图标已在缓存中，不需要重新从 IndexedDB 加载
    const hasPrefetchedRef = useRef(false);
    useEffect(() => {
        if (hasPrefetchedRef.current) return;
        hasPrefetchedRef.current = true;

        const allDomains: string[] = [];
        for (const space of spaces) {
            for (const item of space.apps) {
                if (item.url) {
                    try { allDomains.push(new URL(item.url).hostname); } catch {}
                }
                if (item.type === 'folder' && item.items) {
                    for (const sub of item.items) {
                        if (sub.url) {
                            try { allDomains.push(new URL(sub.url).hostname); } catch {}
                        }
                    }
                }
            }
        }

        if (allDomains.length > 0) {
            prefetchIcons(allDomains).catch(() => {});
        }
    }, []); // 仅首次运行

    // 持久化到 localStorage (防抖保存)
    // 跳过首次渲染，因为 storage.getSpaces() 已经处理了保存
    const saveTimeoutRef = useRef<number>();

    useEffect(() => {
        if (isFirstRenderRef.current) {
            isFirstRenderRef.current = false;
            return;
        }

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = window.setTimeout(() => {
            storage.saveSpaces(spacesState);
        }, 500);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [spacesState]);

    useEffect(() => {
        const flushPersistentState = () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = undefined;
            }
            storage.saveSpaces(spacesState);
        };
        window.addEventListener('eclipin:flush-persistent-state', flushPersistentState);
        return () => window.removeEventListener('eclipin:flush-persistent-state', flushPersistentState);
    }, [spacesState]);

    // ============================================================================
    // 空间切换操作
    // ============================================================================

    const switchToNextSpace = useCallback(() => {
        if (isSwitching || dockSpaces.length <= 1) return;

        const safeCurrentIndex = Math.max(0, dockCurrentIndex);
        const nextIndex = (safeCurrentIndex + 1) % dockSpaces.length;
        const nextSpace = dockSpaces[nextIndex];

        setSpacesState(prev => ({
            ...prev,
            activeSpaceId: nextSpace.id,
        }));
    }, [isSwitching, dockSpaces, dockCurrentIndex]);

    const switchToSpace = useCallback((spaceId: string) => {
        if (isSwitching) return;

        const targetSpace = spaces.find(s => s.id === spaceId);
        if (!targetSpace || targetSpace.showInDock === false) return;

        setSpacesState(prev => ({
            ...prev,
            activeSpaceId: spaceId,
        }));
    }, [isSwitching, spaces]);

    // ============================================================================
    // 空间管理操作
    // ============================================================================

    const addSpace = useCallback((name?: string) => {
        const newSpace = createDefaultSpace(name || `Space ${spaces.length + 1}`);

        setSpacesState(prev => ({
            ...prev,
            spaces: [...prev.spaces, newSpace],
            activeSpaceId: newSpace.id, // 自动跳转到新空间
        }));
    }, [spaces.length]);

    const deleteSpace = useCallback((spaceId: string) => {
        if (spaces.length <= 1) {
            console.warn('[SpacesContext] Cannot delete the last space');
            return;
        }

        setSpacesState(prev => {
            const deleteIndex = prev.spaces.findIndex(space => space.id === spaceId);
            if (deleteIndex === -1 || prev.spaces.length <= 1) return prev;

            let remainingSpaces = prev.spaces.filter(space => space.id !== spaceId);
            if (!remainingSpaces.some(space => space.showInDock !== false)) {
                remainingSpaces = remainingSpaces.map((space, index) => index === 0 ? { ...space, showInDock: true } : space);
            }

            let nextActiveSpaceId = prev.activeSpaceId;
            if (spaceId === prev.activeSpaceId || !remainingSpaces.some(space => space.id === prev.activeSpaceId && space.showInDock !== false)) {
                const fallbackIndex = Math.max(0, Math.min(deleteIndex - 1, remainingSpaces.length - 1));
                const fallback = remainingSpaces.filter(space => space.showInDock !== false)[0] ?? remainingSpaces[fallbackIndex];
                nextActiveSpaceId = fallback.id;
            }

            return {
                ...prev,
                spaces: remainingSpaces,
                activeSpaceId: nextActiveSpaceId,
            };
        });
    }, [spaces.length]);

    const renameSpace = useCallback((spaceId: string, newName: string) => {
        if (!newName.trim()) return;

        setSpacesState(prev => ({
            ...prev,
            spaces: prev.spaces.map(s =>
                s.id === spaceId ? { ...s, name: newName.trim() } : s
            ),
        }));
    }, []);


    const setSpaceDockVisibility = useCallback((spaceId: string, visible: boolean) => {
        setSpacesState(prev => {
            const target = prev.spaces.find(space => space.id === spaceId);
            if (!target) return prev;

            const visibleSpaces = prev.spaces.filter(space => space.showInDock !== false);
            if (!visible && target.showInDock !== false && visibleSpaces.length <= 1) {
                return prev;
            }

            const nextSpaces = prev.spaces.map(space =>
                space.id === spaceId ? { ...space, showInDock: visible } : space
            );
            const nextVisibleSpaces = nextSpaces.filter(space => space.showInDock !== false);
            const nextActiveSpaceId = !visible && prev.activeSpaceId === spaceId
                ? (nextVisibleSpaces[0]?.id ?? prev.activeSpaceId)
                : prev.activeSpaceId;

            return {
                ...prev,
                spaces: nextSpaces,
                activeSpaceId: nextActiveSpaceId,
            };
        });
    }, []);

    // ============================================================================
    // 导入空间
    // ============================================================================

    const importSpace = useCallback(async (data: SpaceExportData) => {
        // createSpaceFromImport 现在是 async，会压缩图标
        const newSpace = await createSpaceFromImport(data, spaces);

        setSpacesState(prev => ({
            ...prev,
            spaces: [...prev.spaces, newSpace],
            activeSpaceId: newSpace.id, // 自动跳转到新导入的空间
        }));

        return newSpace;
    }, [spaces]);

    const importMultipleSpaces = useCallback(async (data: MultiSpaceExportData) => {
        // 创建多个空间
        const newSpaces = await createSpacesFromMultiImport(data, spaces);

        if (newSpaces.length > 0) {
            setSpacesState(prev => ({
                ...prev,
                spaces: [...prev.spaces, ...newSpaces],
                activeSpaceId: newSpaces[0].id, // 自动跳转到第一个导入的空间
            }));
        }

        return newSpaces;
    }, [spaces]);

    // ============================================================================
    // 置顶空间
    // ============================================================================

    const pinSpace = useCallback((spaceId: string) => {
        setSpacesState(prev => {
            const targetIndex = prev.spaces.findIndex(s => s.id === spaceId);
            if (targetIndex <= 0) return prev; // 已经在第一位或找不到

            const targetSpace = prev.spaces[targetIndex];
            const newSpaces = [
                targetSpace,
                ...prev.spaces.slice(0, targetIndex),
                ...prev.spaces.slice(targetIndex + 1),
            ];

            return {
                ...prev,
                spaces: newSpaces,
            };
        });
    }, []);

    // ============================================================================
    // Apps 更新（供 DockContext 调用）
    // ============================================================================

    const updateCurrentSpaceApps = useCallback((apps: DockItem[] | ((prev: DockItem[]) => DockItem[])) => {
        setSpacesState(prev => ({
            ...prev,
            spaces: prev.spaces.map(s =>
                s.id === prev.activeSpaceId
                    ? { ...s, apps: typeof apps === 'function' ? apps(s.apps) : apps }
                    : s
            ),
        }));
    }, []);

    const updateSpaceApps = useCallback((spaceId: string, apps: DockItem[] | ((prev: DockItem[]) => DockItem[])) => {
        setSpacesState(prev => ({
            ...prev,
            spaces: prev.spaces.map(s =>
                s.id === spaceId
                    ? { ...s, apps: typeof apps === 'function' ? apps(s.apps) : apps }
                    : s
            ),
        }));
    }, []);

    const moveItemToSpace = useCallback((sourceSpaceId: string, targetSpaceId: string, itemId: string) => {
        if (sourceSpaceId === targetSpaceId) return;

        setSpacesState(prev => {
            const sourceSpace = prev.spaces.find(space => space.id === sourceSpaceId);
            const targetSpace = prev.spaces.find(space => space.id === targetSpaceId);
            if (!sourceSpace || !targetSpace || containsDockItem(targetSpace.apps, itemId)) {
                return prev;
            }

            const result = extractDockItem(sourceSpace.apps, itemId);
            if (!result.extractedItem) return prev;

            return {
                ...prev,
                spaces: prev.spaces.map(space => {
                    if (space.id === sourceSpaceId) {
                        return { ...space, apps: result.items };
                    }
                    if (space.id === targetSpaceId) {
                        return { ...space, apps: [...space.apps, result.extractedItem!] };
                    }
                    return space;
                }),
            };
        });
    }, []);

    // ============================================================================
    // Context Values (分离数据和操作，减少重渲染)
    // ============================================================================

    const dataValue = useMemo<SpacesDataContextType>(() => ({
        spaces,
        dockSpaces,
        activeSpaceId,
        isSwitching,
        currentSpace,
        currentIndex,
        dockCurrentIndex,
    }), [spaces, dockSpaces, activeSpaceId, isSwitching, currentSpace, currentIndex, dockCurrentIndex]);

    const actionsValue = useMemo<SpacesActionsContextType>(() => ({
        switchToNextSpace,
        switchToSpace,
        addSpace,
        deleteSpace,
        renameSpace,
        setSpaceDockVisibility,
        updateCurrentSpaceApps,
        updateSpaceApps,
        moveItemToSpace,
        importSpace,
        importMultipleSpaces,
        pinSpace,
        setIsSwitching,
    }), [
        switchToNextSpace,
        switchToSpace,
        addSpace,
        deleteSpace,
        renameSpace,
        setSpaceDockVisibility,
        updateCurrentSpaceApps,
        updateSpaceApps,
        moveItemToSpace,
        importSpace,
        importMultipleSpaces,
        pinSpace,
    ]);

    return (
        <SpacesDataContext.Provider value={dataValue}>
            <SpacesActionsContext.Provider value={actionsValue}>
                {children}
            </SpacesActionsContext.Provider>
        </SpacesDataContext.Provider>
    );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * 获取 Spaces 数据状态 (低频变化)
 * 用于需要访问 spaces、currentSpace 等数据的组件
 */
export function useSpacesData(): SpacesDataContextType {
    const context = useContext(SpacesDataContext);
    if (!context) {
        throw new Error('useSpacesData must be used within a SpacesProvider');
    }
    return context;
}

/**
 * 获取 Spaces 操作方法 (几乎不变)
 * 用于只需要调用操作方法的组件
 */
export function useSpacesActions(): SpacesActionsContextType {
    const context = useContext(SpacesActionsContext);
    if (!context) {
        throw new Error('useSpacesActions must be used within a SpacesProvider');
    }
    return context;
}

/**
 * 获取完整的 Spaces Context (兼容层)
 * 组合 SpacesDataContext 和 SpacesActionsContext
 * 
 * 性能建议：如果组件只需要部分状态，建议使用 useSpacesData 或 useSpacesActions
 */
export function useSpaces(): SpacesContextType {
    const dataContext = useContext(SpacesDataContext);
    const actionsContext = useContext(SpacesActionsContext);

    if (!dataContext || !actionsContext) {
        throw new Error('useSpaces must be used within a SpacesProvider');
    }

    return { ...dataContext, ...actionsContext };
}

/**
 * 仅获取当前空间数据（性能优化用）
 */
export function useCurrentSpace(): Space {
    const { currentSpace } = useSpacesData();
    return currentSpace;
}

/**
 * 仅获取空间切换状态（性能优化用）
 */
export function useSpaceSwitching(): {
    isSwitching: boolean;
    setIsSwitching: (value: boolean) => void;
} {
    const { isSwitching } = useSpacesData();
    const { setIsSwitching } = useSpacesActions();
    return { isSwitching, setIsSwitching };
}
