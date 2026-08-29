/**
 * 浏览器书签导入工具函数
 * 封装 chrome.bookmarks API，支持 Chrome/Edge 和 Firefox
 */

import { DockItem } from '@/shared/types';
import { createId } from '@/shared/utils/id';
import { normalizeUrl } from '@/shared/utils/url';

// ============================================================================
// 类型定义
// ============================================================================

export interface BookmarkNode {
    id: string;
    title: string;
    url?: string;
    children?: BookmarkNode[];
}

// Firefox browser API 声明
declare const browser: any;

// ============================================================================
// 浏览器兼容
// ============================================================================

const getBrowserBookmarks = (): any | null => {
    if (typeof chrome !== 'undefined' && (chrome as any).bookmarks) {
        return (chrome as any).bookmarks;
    }
    if (typeof browser !== 'undefined' && browser?.bookmarks) {
        return browser.bookmarks;
    }
    return null;
};

// ============================================================================
// 权限请求
// ============================================================================

/**
 * 检查是否有书签权限
 */
export async function hasBookmarkPermission(): Promise<boolean> {
    try {
        if (typeof chrome !== 'undefined' && chrome.permissions) {
            return new Promise((resolve) => {
                chrome.permissions.contains({ permissions: ['bookmarks'] }, (result) => {
                    resolve(result);
                });
            });
        }
        if (typeof browser !== 'undefined' && browser?.permissions) {
            const result = await browser.permissions.contains({ permissions: ['bookmarks'] });
            return result;
        }
    } catch {
        // Firefox 可能默认有权限
    }
    return false;
}

/**
 * 请求书签权限
 */
export async function requestBookmarkPermission(): Promise<boolean> {
    try {
        if (typeof chrome !== 'undefined' && chrome.permissions) {
            return new Promise((resolve) => {
                chrome.permissions.request({ permissions: ['bookmarks'] }, (granted) => {
                    resolve(granted);
                });
            });
        }
        if (typeof browser !== 'undefined' && browser?.permissions) {
            const granted = await browser.permissions.request({ permissions: ['bookmarks'] });
            return granted;
        }
    } catch {
        return false;
    }
    return false;
}


// ============================================================================
// 书签读取
// ============================================================================

/**
 * 获取完整书签树
 * 注意：必须在已授权 bookmarks 权限后调用，否则 chrome.bookmarks 不可用
 */
export async function getBookmarkTree(): Promise<BookmarkNode[]> {
    // 授权后重新获取 bookmarks API（optional_permissions 授权后才会挂载）
    const bookmarks = getBrowserBookmarks();
    if (!bookmarks) {
        throw new Error('Bookmarks API not available. Please grant bookmarks permission first.');
    }

    return new Promise((resolve, reject) => {
        bookmarks.getTree((tree: any[]) => {
            const runtimeError = typeof chrome !== 'undefined' ? chrome.runtime?.lastError : undefined;
            if (runtimeError) {
                reject(new Error(runtimeError.message || 'Failed to read bookmarks'));
                return;
            }
            const normalized = normalizeNodes(tree);
            resolve(normalized);
        });
    });
}

/**
 * 标准化书签节点（过滤空节点，统一结构）
 */
function normalizeNodes(nodes: any[]): BookmarkNode[] {
    return nodes
        .filter((node: any) => node.title || node.children)
        .map((node: any) => {
            const result: BookmarkNode = {
                id: node.id,
                title: node.title || '',
            };
            if (node.url) {
                result.url = node.url;
            }
            if (node.children && node.children.length > 0) {
                result.children = normalizeNodes(node.children);
            }
            return result;
        });
}

// ============================================================================
// 书签转换
// ============================================================================

/**
 * 将选中的书签节点转换为 DockItem 列表
 */
export function bookmarksToDockItems(nodes: BookmarkNode[]): DockItem[] {
    return nodes.flatMap(node => {
        const url = node.url ? normalizeUrl(node.url) : '';
        if (!url) return [];

        return [{
            id: createId('item'),
            name: node.title.trim() || new URL(url).hostname,
            url,
            type: 'app' as const,
        }];
    });
}

/**
 * 将书签文件夹转换为 DockItem 文件夹
 */
export function bookmarkFolderToDockFolder(folder: BookmarkNode): DockItem {
    const children = folder.children || [];
    const items = bookmarksToDockItems(children);

    return {
        id: createId('folder'),
        name: folder.title.trim() || 'Folder',
        type: 'folder',
        items,
    };
}

/**
 * 检查书签 API 是否可用（是否在扩展环境中）
 * 注意：bookmarks 在 optional_permissions 中，授权前 chrome.bookmarks 为 undefined，
 * 所以这里检测 chrome.permissions 是否存在来判断是否在扩展环境中。
 */
export function isBookmarkApiAvailable(): boolean {
    if (typeof chrome !== 'undefined' && chrome.permissions) {
        return true;
    }
    if (typeof browser !== 'undefined' && browser?.permissions) {
        return true;
    }
    return false;
}
