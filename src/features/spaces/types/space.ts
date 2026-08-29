/**
 * Space 相关类型定义
 * Focus Spaces 多空间系统的核心数据模型
 */

import { DockItem } from '@/features/dock/types/dock';
import { createId } from '@/shared/utils/id';

/**
 * 单个空间定义
 */
export interface Space {
    /** 唯一标识符 (UUID) */
    id: string;

    /** 显示名称，建议大写英文如 WORK, LIFE, GAME */
    name: string;

    /** 图标类型: 纯文本取首字母 | emoji | 自定义图标 */
    iconType: 'text' | 'emoji' | 'icon';

    /** 图标值: emoji 字符或图标名称 (iconType 为 text 时可选) */
    iconValue?: string;

    /** 该空间下的应用/文件夹列表 */
    apps: DockItem[];

    /** 是否显示在首页快捷网址栏和空间切换器中，旧数据缺省视为 true */
    showInDock?: boolean;

    /** 创建时间戳 (ms) */
    createdAt: number;
}

/**
 * 空间持久化状态
 */
export interface SpacesState {
    /** 空间列表 */
    spaces: Space[];

    /** 当前激活空间 ID */
    activeSpaceId: string;

    /** 数据版本号，用于迁移 */
    version: number;
}

/**
 * 创建默认空间
 */
export function createDefaultSpace(name: string = 'Main', apps: DockItem[] = []): Space {
    return {
        id: createId(),
        name,
        iconType: 'text',
        apps,
        showInDock: true,
        createdAt: Date.now(),
    };
}

/**
 * 创建默认空间状态。
 * 全新安装只创建一个精简的 Main 空间；迁移时传入的 apps（包括空数组）会被原样保留。
 */
export function createDefaultSpacesState(initialApps?: DockItem[]): SpacesState {
    const defaultSpace = createDefaultSpace('Main', initialApps ?? createDefaultDockApps());

    return {
        spaces: [defaultSpace],
        activeSpaceId: defaultSpace.id,
        version: 1,
    };
}

/** 首次安装时的 Main 空间快捷网站，保持精简并优先选择中国大陆常用站点。 */
export function createDefaultDockApps(): DockItem[] {
    return [
        { id: 'baidu', name: '百度', url: 'https://www.baidu.com/', type: 'app' },
        { id: 'bilibili', name: '哔哩哔哩', url: 'https://www.bilibili.com/', type: 'app' },
        { id: 'zhihu', name: '知乎', url: 'https://www.zhihu.com/', type: 'app' },
        { id: 'taobao', name: '淘宝', url: 'https://www.taobao.com/', type: 'app' },
        { id: 'jd', name: '京东', url: 'https://www.jd.com/', type: 'app' },
        { id: 'xiaohongshu', name: '小红书', url: 'https://www.xiaohongshu.com/explore', type: 'app' },
    ];
}
