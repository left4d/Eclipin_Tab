/*
 * @Author: left4d 3190836003@qq.com
 * @Date: 2026-08-02 12:36:20
 * @LastEditors: left4d 3190836003@qq.com
 * @LastEditTime: 2026-08-02 19:51:44
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * Zen Shelf 贴纸相关类型定义
 */

import type { BuiltInFontId } from '@/shared/constants/builtInFonts';
import type { NavigationAction } from '@/shared/navigation';

/**
 * 文字贴纸的样式配置
 */
export interface TextStickerStyle {
    color: string;                           // 字体颜色
    textAlign: 'left' | 'center' | 'right';  // 文字对齐
    fontSize: number;                        // 字号大小 (px)
    fontFamily?: BuiltInFontId;              // 内置字体 ID
    maxWidth?: number;                       // 最大宽度限制 (px)
}

export type StickerInteractionEffect = 'none' | 'lift' | 'scale' | 'button' | 'iconSwap';

export interface LinkCardMetadata {
    url: string;             // 跳转地址
    title: string;           // 卡片主标题
    subtitle: string;        // 卡片副标题
    imageUrl?: string;       // 预览图地址
    siteName?: string;       // 站点名称
}

export type StickerDrawing =
    | { id: string; type: 'line'; x1: number; y1: number; x2: number; y2: number; color: string; strokeWidth: number }
    | { id: string; type: 'ellipse'; x: number; y: number; width: number; height: number; color: string; strokeWidth: number }
    | { id: string; type: 'rectangle'; x: number; y: number; width: number; height: number; color: string; strokeWidth: number };

/**
 * 贴纸数据结构
 */
export interface Sticker {
    id: string;              // UUID 唯一标识
    type: 'text' | 'image' | 'drawing';  // 贴纸类型
    content: string;         // 文字内容 或 图片Base64/URL
    x: number;               // Shelf 逻辑画布 X 坐标（以 1920 逻辑宽度为基准）
    y: number;               // Shelf 逻辑画布 Y 坐标（渲染时统一随 viewportScale 缩放）
    pageId?: string;         // 所属页面，不存在时视为第一页
    zIndex?: number;         // 同优先级贴纸的局部层级顺序（点击置顶）
    priority?: number;       // 层叠优先级，数值越大越靠上（-999～999）
    scale?: number;          // 贴纸整体等比缩放（文字/图片/绘图共用）
    imagePresentation?: 'default' | 'vectorIcon'; // SVG 图标库贴纸可使用更轻的外轮廓
    iconSwapContent?: string; // 图标转换的第二个 SVG 资源；与主图标共用同一显示尺寸
    hideStroke?: boolean;    // 是否隐藏文字/图片贴纸的默认外描边
    strokeWidth?: number;     // 描边视觉宽度（px），不会随贴纸 scale 一起放大
    cornerRadius?: number;    // 图片贴纸圆角视觉半径（px），不会随贴纸 scale 一起放大
    interactionEffect?: StickerInteractionEffect; // 鼠标悬停时的原生交互反馈
    rotation?: number;       // 贴纸旋转角度（deg，-180～180）
    isPinned?: boolean;      // 是否固定在原处不可移动
    positionMode?: 'page' | 'viewport'; // page: 随页面滚动；viewport: 相对屏幕固定
    style?: TextStickerStyle; // 仅针对文字贴纸的样式
    hasCheckbox?: boolean;   // 是否带有复选框 (仅文字贴纸)
    isChecked?: boolean;     // 复选框是否已勾选
    linkCard?: LinkCardMetadata; // 链接卡片元数据（仅文字贴纸）
    imageLinkUrl?: string;   // 旧版图片贴纸链接字段（兼容迁移）
    action?: NavigationAction; // 结构化导航动作；运行时只执行 Action，不再解析字符串
    linkTarget?: string;     // @deprecated 旧版链接字段，仅用于一次性迁移
    anchorId?: string;       // 贴纸内部锚点标签，例如 section-a
    drawings?: StickerDrawing[];
    drawing?: StickerDrawing;
    drawingSize?: { width: number; height: number };
}

/**
 * 创建贴纸时的输入类型（不需要 id，由系统生成）
 */
export type StickerInput = Omit<Sticker, 'id'>;

/**
 * 默认的文字贴纸样式
 */
export const DEFAULT_TEXT_STYLE: TextStickerStyle = {
    color: '#1C1C1E',        // 深色文字
    textAlign: 'left',
    fontSize: 40,
    fontFamily: 'system',
};

/**
 * 图片贴纸的最大宽度限制
 */
export const IMAGE_MAX_WIDTH = 400;
