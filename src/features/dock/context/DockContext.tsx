import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { DockItem, SearchEngine, createDefaultDockApps } from '@/shared/types';
import { storage } from '@/shared/utils/storage';
import { DEFAULT_SEARCH_ENGINE } from '@/features/search/constants/searchEngines';
import { generateFolderIcon, fetchIcon } from '@/features/dock/utils/iconFetcher';
import { useSpaces } from '@/features/spaces/context/SpacesContext';
import { useThemeData } from '@/features/theme/context/ThemeContext';
import { createId } from '@/shared/utils/id';
import { executeNavigationAction, parseNavigationAction } from '@/shared/navigation';
import { useLanguage } from '@/shared/context/LanguageContext';

// ============================================================================
// 数据层 Context (低频变化)
// ============================================================================

interface DockDataContextType {
    dockItems: DockItem[];
    selectedSearchEngine: SearchEngine;
    setDockItems: React.Dispatch<React.SetStateAction<DockItem[]>>;
    setSelectedSearchEngine: (engine: SearchEngine) => void;
    handleItemSave: (data: Partial<DockItem>, editingItem: DockItem | null) => void;
    handleItemsReorder: (items: DockItem[]) => void;
    handleItemDelete: (item: DockItem) => void;
    handleFolderItemsReorder: (folderId: string, items: DockItem[]) => void;
    handleFolderItemDelete: (folderId: string, item: DockItem) => void;
    handleDragFromFolder: (item: DockItem, mousePosition: { x: number; y: number }) => void;
    handleDragToFolder: (item: DockItem) => void;
    handleDropOnFolder: (dragItem: DockItem, targetFolder: DockItem) => void;
}

const DockDataContext = createContext<DockDataContextType | undefined>(undefined);

// ============================================================================
// UI 层 Context (中频变化)
// ============================================================================

interface DockUIContextType {
    isEditMode: boolean;
    openFolderId: string | null;
    folderAnchor: DOMRect | null;
    setIsEditMode: (value: boolean) => void;
    setOpenFolderId: (id: string | null) => void;
    setFolderAnchor: (rect: DOMRect | null) => void;
}

const DockUIContext = createContext<DockUIContextType | undefined>(undefined);

// ============================================================================
// Drag Context (频繁变化/拖拽相关)
// ============================================================================

interface DockDragContextType {
    draggingItem: DockItem | null;
    setDraggingItem: (item: DockItem | null) => void;
    /** 文件夹是否有活动的占位符 (用于跨组件拖拽检测) */
    folderPlaceholderActive: boolean;
    setFolderPlaceholderActive: (active: boolean) => void;
}

const DockDragContext = createContext<DockDragContextType | undefined>(undefined);

// ============================================================================
// 组合 Context (用于需要同时访问数据和 UI 的场景)
// ============================================================================

interface DockContextType extends DockDataContextType, DockUIContextType, DockDragContextType {
    handleItemClick: (item: DockItem, rect?: DOMRect) => void;
    handleHoverOpenFolder: (item: DockItem, folder: DockItem) => void;
    openFolder: DockItem | undefined;
}

// ============================================================================
// Provider 实现
// ============================================================================

export const DockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // 从 SpacesContext 获取当前空间的 apps
    const { currentSpace, updateSpaceApps } = useSpaces();
    const { language } = useLanguage();

    // 数据状态: dockItems 来自当前 Space
    const [dockItems, setDockItemsInternal] = useState<DockItem[]>(currentSpace.apps);
    const [selectedSearchEngine, setSelectedSearchEngineState] = useState<SearchEngine>(DEFAULT_SEARCH_ENGINE);

    // UI 状态 (中频变化)
    const [isEditMode, setIsEditModeState] = useState(false);
    const [openFolderId, setOpenFolderIdState] = useState<string | null>(null);
    const [folderAnchor, setFolderAnchor] = useState<DOMRect | null>(null);
    const [draggingItem, setDraggingItem] = useState<DockItem | null>(null);
    const [folderPlaceholderActive, setFolderPlaceholderActive] = useState(false);
    const activeSpaceIdRef = React.useRef(currentSpace.id);

    // 当 currentSpace 变化时同步 dockItems
    useEffect(() => {
        activeSpaceIdRef.current = currentSpace.id;
        setDockItemsInternal(currentSpace.apps);
    }, [currentSpace.id, currentSpace.apps]);

    // 包装 setDockItems: 同时更新本地状态和 SpacesContext
    const setDockItems: React.Dispatch<React.SetStateAction<DockItem[]>> = useCallback(
        (action) => {
            const targetSpaceId = currentSpace.id;

            if (activeSpaceIdRef.current === targetSpaceId) {
                setDockItemsInternal(action);
            }

            // 按发起操作时的空间 ID 写回，避免异步图标获取完成后覆盖当前已切换到的空间。
            updateSpaceApps(targetSpaceId, action);
        },
        [currentSpace.id, updateSpaceApps]
    );

    // 存储 openFolderId 的 ref 用于 handleItemDelete 以减少依赖
    const openFolderIdRef = React.useRef(openFolderId);
    useEffect(() => {
        openFolderIdRef.current = openFolderId;
    }, [openFolderId]);

    // 搜索引擎使用独立存储，仅在 Provider 初始化时读取一次。
    useEffect(() => {
        const savedEngine = storage.getSearchEngine();
        if (savedEngine) setSelectedSearchEngineState(savedEngine);
    }, []);

    // 首次安装的默认网站只补充缺失图标，不再根据“当前是否为空”重复写入。
    // 这样用户主动清空 Main 空间后，下一次打开新标签页仍会保持为空。
    const iconFetchAttemptedSpacesRef = React.useRef(new Set<string>());
    useEffect(() => {
        if (iconFetchAttemptedSpacesRef.current.has(currentSpace.id)) return;

        const defaultIds = new Set(createDefaultDockApps().map(item => item.id));
        const candidates = currentSpace.apps.filter(item => (
            item.type === 'app' && item.url && !item.icon && defaultIds.has(item.id)
        ));
        if (candidates.length === 0) return;

        iconFetchAttemptedSpacesRef.current.add(currentSpace.id);
        const targetSpaceId = currentSpace.id;
        let cancelled = false;

        void Promise.all(candidates.map(async item => {
            try {
                const result = await fetchIcon(item.url!);
                return { id: item.id, icon: result.url, iconSmall: result.iconSmall };
            } catch {
                return null;
            }
        })).then(results => {
            if (cancelled) return;
            type IconUpdate = { id: string; icon: string; iconSmall: boolean };
            const validResults = results.filter((result): result is IconUpdate => result !== null);
            const updates = new Map(validResults.map(result => [result.id, result] as const));
            if (updates.size === 0) return;

            updateSpaceApps(targetSpaceId, previous => previous.map(item => {
                const update = updates.get(item.id);
                return update ? { ...item, icon: update.icon, iconSmall: update.iconSmall } : item;
            }));
        });

        return () => {
            cancelled = true;
        };
    }, [currentSpace.apps, currentSpace.id, updateSpaceApps]);

    // 保存搜索引擎 (dockItems 存储由 SpacesContext 管理)
    useEffect(() => {
        storage.saveSearchEngine(selectedSearchEngine);
    }, [selectedSearchEngine]);

    // 辅助函数: 检查并在需要时解散文件夹
    const checkAndDissolveFolderIfNeeded = useCallback((folderId: string, updatedItems: DockItem[]): DockItem[] => {
        const folder = updatedItems.find(i => i.id === folderId);
        if (!folder || folder.type !== 'folder' || !folder.items) return updatedItems;

        const folderIndex = updatedItems.findIndex(i => i.id === folderId);
        if (folderIndex === -1) return updatedItems;

        // 如果文件夹没有项目，完全移除它
        if (folder.items.length === 0) {
            return updatedItems.filter(i => i.id !== folderId);
        }

        // 如果文件夹恰好只有 1 个项目，解散并用该项目替换文件夹
        if (folder.items.length === 1) {
            const remainingItem = folder.items[0];
            const newItems = [...updatedItems];
            newItems[folderIndex] = remainingItem;
            return newItems;
        }

        return updatedItems;
    }, []);

    // ========================================================================
    // UI 操作 (中频)
    // ========================================================================

    const setIsEditMode = useCallback((value: boolean) => {
        setIsEditModeState(value);
    }, []);

    const setSelectedSearchEngine = useCallback((engine: SearchEngine) => {
        setSelectedSearchEngineState(engine);
    }, []);

    const setOpenFolderId = useCallback((id: string | null) => {
        setOpenFolderIdState(id);
        if (!id) {
            setFolderAnchor(null);
        }
    }, []);

    // ========================================================================
    // 数据操作 (低频)
    // ========================================================================

    const handleItemDelete = useCallback((item: DockItem) => {
        const message = language === 'zh'
            ? `确定要删除 "${item.name}" 吗？${item.type === 'folder' ? '文件夹内的所有内容也将被删除。' : ''}`
            : `Delete "${item.name}"?${item.type === 'folder' ? ' Everything inside the folder will also be deleted.' : ''}`;
        if (window.confirm(message)) {
            setDockItems(prev => {
                const newItems = prev.filter((i) => i.id !== item.id);
                return newItems;
            });
            if (openFolderIdRef.current === item.id) {
                setOpenFolderIdState(null);
            }
        }
    }, [language, setDockItems]);

    const handleItemSave = useCallback((data: Partial<DockItem>, editingItem: DockItem | null) => {
        const hasNavigationUpdate = !editingItem
            || Object.prototype.hasOwnProperty.call(data, 'action')
            || Object.prototype.hasOwnProperty.call(data, 'url');
        const action = hasNavigationUpdate
            ? (data.action ?? parseNavigationAction(data.url ?? '') ?? undefined)
            : undefined;
        const normalizedData: Partial<DockItem> = hasNavigationUpdate
            ? {
                ...data,
                action,
                url: action?.type === 'url' ? action.url : undefined,
            }
            : data;
        if (editingItem) {
            const updateItemRecursively = (items: DockItem[]): DockItem[] => {
                return items.map((item) => {
                    if (item.id === editingItem.id) {
                        return { ...item, ...normalizedData };
                    }
                    if (item.type === 'folder' && item.items) {
                        const updatedItems = updateItemRecursively(item.items);
                        return {
                            ...item,
                            items: updatedItems,
                            icon: generateFolderIcon(updatedItems),
                        };
                    }
                    return item;
                });
            };

            setDockItems(prev => updateItemRecursively(prev));
        } else {
            const newItem: DockItem = {
                id: createId('item'),
                name: normalizedData.name || '',
                url: normalizedData.url,
                action: normalizedData.action,
                icon: normalizedData.icon,
                iconSmall: normalizedData.iconSmall,
                type: 'app',
            };
            setDockItems(prev => [...prev, newItem]);
        }
    }, [setDockItems]);

    const handleItemsReorder = useCallback((items: DockItem[]) => {
        const updatedItems = items.map((item) => {
            if (item.type === 'folder' && item.items && item.items.length > 0) {
                return {
                    ...item,
                    icon: generateFolderIcon(item.items),
                };
            }
            return item;
        });
        setDockItems(updatedItems);
    }, [setDockItems]);

    const handleFolderItemsReorder = useCallback((folderId: string, items: DockItem[]) => {
        setDockItems(prev => prev.map((item) => {
            if (item.id === folderId && item.type === 'folder') {
                return {
                    ...item,
                    items,
                    icon: generateFolderIcon(items),
                };
            }
            return item;
        }));
    }, [setDockItems]);

    const handleFolderItemDelete = useCallback((folderId: string, item: DockItem) => {
        setDockItems(prev => {
            const folder = prev.find((i) => i.id === folderId);
            if (folder && folder.type === 'folder' && folder.items) {
                const newItems = folder.items.filter((i) => i.id !== item.id);

                let newDockItems = prev.map((i) => {
                    if (i.id === folderId) {
                        return {
                            ...i,
                            items: newItems,
                            icon: generateFolderIcon(newItems),
                        };
                    }
                    return i;
                });

                newDockItems = checkAndDissolveFolderIfNeeded(folderId, newDockItems);

                const dissolvedFolder = newDockItems.find(i => i.id === folderId);
                if (!dissolvedFolder || dissolvedFolder.type !== 'folder') {
                    setOpenFolderIdState(null);
                }

                return newDockItems;
            }
            return prev;
        });
    }, [checkAndDissolveFolderIfNeeded, setDockItems]);

    const handleDragFromFolder = useCallback((item: DockItem, mousePosition: { x: number; y: number }) => {
        if (!openFolderId) return;

        setDockItems(prev => {
            const folder = prev.find(i => i.id === openFolderId);
            if (!folder || folder.type !== 'folder' || !folder.items) return prev;

            const newFolderItems = folder.items.filter(i => i.id !== item.id);

            let newDockItems = prev.map(i => {
                if (i.id === openFolderId) {
                    return {
                        ...i,
                        items: newFolderItems,
                        icon: newFolderItems.length > 0 ? generateFolderIcon(newFolderItems) : undefined,
                    };
                }
                return i;
            });

            const updatedDockItems = checkAndDissolveFolderIfNeeded(openFolderId, newDockItems);

            const folderAfter = updatedDockItems.find(i => i.id === openFolderId);
            if (!folderAfter || folderAfter.type !== 'folder') {
                setOpenFolderIdState(null);
            }

            const dockElement = document.querySelector('[data-dock-container="true"]');
            if (!dockElement) {
                const finalItems = [...updatedDockItems];
                const existingIdx = finalItems.findIndex(i => i.id === item.id);
                if (existingIdx !== -1) finalItems.splice(existingIdx, 1);
                finalItems.push(item);
                return finalItems;
            }

            const dockItemElements = Array.from(dockElement.querySelectorAll('[data-dock-item-wrapper="true"]'));
            let insertIndex = updatedDockItems.length;

            for (let i = 0; i < dockItemElements.length; i++) {
                const rect = dockItemElements[i].getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;

                if (mousePosition.x < centerX) {
                    insertIndex = i;
                    break;
                }
            }

            let finalItems = updatedDockItems.filter(i => i.id !== item.id);
            insertIndex = Math.max(0, Math.min(insertIndex, finalItems.length));
            finalItems.splice(insertIndex, 0, item);

            return finalItems;
        });
    }, [openFolderId, checkAndDissolveFolderIfNeeded, setDockItems]);

    const handleDragToFolder = useCallback((item: DockItem) => {
        if (!openFolderId || item.type === 'folder') return;

        setDockItems(prev => {
            const folder = prev.find(i => i.id === openFolderId);
            if (!folder || folder.type !== 'folder') return prev;

            const newFolderItems = [...(folder.items || []), item];

            return prev.map(i => {
                if (i.id === openFolderId) {
                    return {
                        ...i,
                        items: newFolderItems,
                        icon: generateFolderIcon(newFolderItems),
                    };
                }
                return i;
            }).filter(i => i.id !== item.id);
        });
    }, [openFolderId, setDockItems]);

    const handleDropOnFolder = useCallback((dragItem: DockItem, targetFolder: DockItem) => {
        if (targetFolder.type !== 'folder') return;

        let itemsToAdd: DockItem[] = [];
        if (dragItem.type === 'folder' && dragItem.items) {
            itemsToAdd = dragItem.items;
        } else {
            itemsToAdd = [dragItem];
        }

        setDockItems(prev => {
            return prev.map(item => {
                if (item.id === targetFolder.id) {
                    // 防止重复: 过滤掉已经存在于文件夹中的项目
                    const existingIds = new Set((item.items || []).map(i => i.id));
                    const uniqueItemsToAdd = itemsToAdd.filter(add => !existingIds.has(add.id));

                    const mergedItems = [...(item.items || []), ...uniqueItemsToAdd];
                    return {
                        ...item,
                        items: mergedItems,
                        icon: generateFolderIcon(mergedItems),
                    };
                }
                return item;
            }).filter(item => item.id !== dragItem.id);
        });
    }, [setDockItems]);

    // ========================================================================
    // Context Values (使用 useMemo 避免不必要的 Re-render)
    // ========================================================================

    const dataValue: DockDataContextType = useMemo(() => ({
        dockItems,
        selectedSearchEngine,
        setDockItems,
        setSelectedSearchEngine,
        handleItemSave,
        handleItemsReorder,
        handleItemDelete,
        handleFolderItemsReorder,
        handleFolderItemDelete,
        handleDragFromFolder,
        handleDragToFolder,
        handleDropOnFolder,
    }), [
        dockItems,
        selectedSearchEngine,
        setDockItems,
        handleItemSave,
        handleItemsReorder,
        handleItemDelete,
        handleFolderItemsReorder,
        handleFolderItemDelete,
        handleDragFromFolder,
        handleDragToFolder,
        handleDropOnFolder,
    ]);

    const uiValue: DockUIContextType = useMemo(() => ({
        isEditMode,
        openFolderId,
        folderAnchor,
        setIsEditMode,
        setOpenFolderId,
        setFolderAnchor,
    }), [
        isEditMode,
        openFolderId,
        folderAnchor,
        setIsEditMode,
        setOpenFolderId,
    ]);

    const dragValue: DockDragContextType = useMemo(() => ({
        draggingItem,
        setDraggingItem,
        folderPlaceholderActive,
        setFolderPlaceholderActive,
    }), [draggingItem, folderPlaceholderActive]);

    return (
        <DockDataContext.Provider value={dataValue}>
            <DockUIContext.Provider value={uiValue}>
                <DockDragContext.Provider value={dragValue}>
                    {children}
                </DockDragContext.Provider>
            </DockUIContext.Provider>
        </DockDataContext.Provider>
    );
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * 获取 Dock 数据状态 (低频变化)
 * 用于需要访问 dockItems、searchEngine 等数据的组件
 */
export const useDockData = () => {
    const context = useContext(DockDataContext);
    if (context === undefined) {
        throw new Error('useDockData must be used within a DockProvider');
    }
    return context;
};

/**
 * 获取 Dock UI 状态 (中频变化)
 * 用于需要访问 isEditMode、openFolderId 等 UI 状态的组件
 */
export const useDockUI = () => {
    const context = useContext(DockUIContext);
    if (context === undefined) {
        throw new Error('useDockUI must be used within a DockProvider');
    }
    return context;
};

/**
 * 获取 Dock 拖拽状态
 */
export const useDockDrag = () => {
    const context = useContext(DockDragContext);
    if (context === undefined) {
        throw new Error('useDockDrag must be used within a DockProvider');
    }
    return context;
};

/**
 * 获取完整的 Dock 上下文 (兼容层)
 * 组合 DockDataContext 和 DockUIContext，提供完整功能
 * 
 * 性能建议：如果组件只需要部分状态，建议使用 useDockData 或 useDockUI
 */
export const useDock = (): DockContextType => {
    const dataContext = useContext(DockDataContext);
    const uiContext = useContext(DockUIContext);
    const dragContext = useContext(DockDragContext);
    const { openInNewTab } = useThemeData();

    if (dataContext === undefined || uiContext === undefined || dragContext === undefined) {
        throw new Error('useDock must be used within a DockProvider');
    }

    // 组合操作 - 需要同时访问数据和 UI
    const handleItemClick = useCallback((item: DockItem, rect?: DOMRect) => {
        if (item.type === 'folder') {
            uiContext.setOpenFolderId(item.id);
            uiContext.setFolderAnchor(rect ?? null);
        } else if (item.action) {
            executeNavigationAction(item.action, { openInNewTab });
        }
    }, [uiContext, openInNewTab]);

    const handleHoverOpenFolder = useCallback((_item: DockItem, folder: DockItem) => {
        if (folder.type === 'folder') {
            uiContext.setOpenFolderId(folder.id);
        }
    }, [uiContext]);

    const openFolder = useMemo(() =>
        dataContext.dockItems.find((item) => item.id === uiContext.openFolderId),
        [dataContext.dockItems, uiContext.openFolderId]
    );

    return {
        ...dataContext,
        ...uiContext,
        ...dragContext,
        handleItemClick,
        handleHoverOpenFolder,
        openFolder,
    };
};
