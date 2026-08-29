/**
 * 图标压缩工具
 * 用于压缩上传的图标和导入的 Space 中的图标，减少 localStorage 使用
 */

import { DockItem } from '@/shared/types';

/** 目标压缩尺寸 - 图标 (192px 足够显示 56px 图标) */
const ICON_TARGET_SIZE = 192;

/** 目标压缩尺寸 - 贴纸图片 (1600px 保证高清晰度，IndexedDB 无空间限制) */
const STICKER_TARGET_WIDTH = 1600;

/** WebP 压缩质量 - 图标 (更高压缩) */
const ICON_COMPRESSION_QUALITY = 0.6;

/** WebP 压缩质量 - 贴纸 (0.85 平衡质量与大小) */
const STICKER_COMPRESSION_QUALITY = 0.85;

// ============================================================================
// 性能优化: 预先创建 Web Worker 来处理图像压缩，防止阻塞主UI线程
// ============================================================================

let worker: Worker | null = null;
const workerCallbacks = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>();

const getWorker = () => {
    // 检查是否支持 Worker 和 OffscreenCanvas
    if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
        return null;
    }
    if (!worker) {
        worker = new Worker(new URL('./imageWorker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = (e: MessageEvent) => {
            const { id, result, error } = e.data;
            const callbacks = workerCallbacks.get(id);
            if (callbacks) {
                if (error) callbacks.reject(new Error(error));
                else callbacks.resolve(result);
                workerCallbacks.delete(id);
            }
        };
    }
    return worker;
};

function runInWorker<T>(type: string, payload: any): Promise<T> {
    const activeWorker = getWorker();
    if (!activeWorker) {
        throw new Error('Web Worker not supported');
    }
    return new Promise((resolve, reject) => {
        const id = Math.random().toString(36).substring(2, 9);
        workerCallbacks.set(id, { resolve, reject });
        activeWorker.postMessage({ id, type, payload });
    });
}

// 保留 main-thread canvas 作为降级处理机制（Safari 16 之前版本可能不支持 OffscreenCanvas）
let reusableIconCanvas: HTMLCanvasElement | null = null;
let reusableIconCtx: CanvasRenderingContext2D | null = null;

function getReusableIconCanvas(width: number, height: number): {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
} | null {
    try {
        if (!reusableIconCanvas) {
            reusableIconCanvas = document.createElement('canvas');
            reusableIconCanvas.width = width;
            reusableIconCanvas.height = height;
            reusableIconCtx = reusableIconCanvas.getContext('2d');
        }

        if (!reusableIconCtx) return null;

        if (reusableIconCanvas.width !== width || reusableIconCanvas.height !== height) {
            reusableIconCanvas.width = width;
            reusableIconCanvas.height = height;
        }

        reusableIconCtx.clearRect(0, 0, width, height);
        return { canvas: reusableIconCanvas, ctx: reusableIconCtx };
    } catch {
        return null;
    }
}

/**
 * 压缩 Base64 图标到指定尺寸 (192x192)
 * 性能优化: 使用 Web Worker 以避免阻塞主线程，若不支持则降级到直接 Canvas 处理
 * @param dataUrl Base64 编码的图片
 * @returns 压缩后的 Base64 图片
 */
export async function compressIcon(dataUrl: string): Promise<string> {
    if (!dataUrl?.startsWith('data:image')) {
        return dataUrl;
    }
    if (dataUrl.startsWith('data:image/svg+xml')) {
        return dataUrl;
    }

    try {
        const result = await runInWorker<string>('compressIcon', dataUrl);
        return result;
    } catch (e) {
        // Fallback to main thread
        console.warn('Worker fallback used for compressIcon');
        return new Promise((resolve, _reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    let { width, height } = img;
                    if (width > ICON_TARGET_SIZE || height > ICON_TARGET_SIZE) {
                        if (width > height) {
                            height = Math.round((height * ICON_TARGET_SIZE) / width);
                            width = ICON_TARGET_SIZE;
                        } else {
                            width = Math.round((width * ICON_TARGET_SIZE) / height);
                            height = ICON_TARGET_SIZE;
                        }
                    }

                    const canvasData = getReusableIconCanvas(width, height);
                    if (!canvasData) {
                        resolve(dataUrl);
                        return;
                    }

                    const { canvas, ctx } = canvasData;
                    ctx.drawImage(img, 0, 0, width, height);
                    const compressedDataUrl = canvas.toDataURL('image/webp', ICON_COMPRESSION_QUALITY);

                    if (compressedDataUrl.length > dataUrl.length) {
                        resolve(dataUrl);
                    } else {
                        resolve(compressedDataUrl);
                    }
                } catch (error) {
                    console.error('Failed to compress icon in fallback:', error);
                    resolve(dataUrl);
                }
            };
            img.onerror = () => resolve(dataUrl);
            img.src = dataUrl;
        });
    }
}

/**
 * 压缩贴纸图片到最大宽度 800px（保持比例）
 * @param dataUrl Base64 编码的图片
 * @returns 压缩后的 Base64 图片
 */
export async function compressStickerImage(dataUrl: string): Promise<string> {
    if (!dataUrl?.startsWith('data:image')) {
        return dataUrl;
    }
    if (dataUrl.startsWith('data:image/svg+xml')) {
        return dataUrl;
    }

    try {
        const result = await runInWorker<string>('compressStickerImage', dataUrl);
        return result;
    } catch (e) {
        // Fallback to main thread
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                try {
                    let { width, height } = img;
                    if (width > STICKER_TARGET_WIDTH) {
                        height = Math.round((height * STICKER_TARGET_WIDTH) / width);
                        width = STICKER_TARGET_WIDTH;
                    }

                    const canvasData = getReusableIconCanvas(width, height);
                    if (!canvasData) {
                        resolve(dataUrl);
                        return;
                    }

                    const { canvas, ctx } = canvasData;
                    ctx.drawImage(img, 0, 0, width, height);

                    const compressedDataUrl = canvas.toDataURL('image/webp', STICKER_COMPRESSION_QUALITY);

                    if (compressedDataUrl.length > dataUrl.length) {
                        resolve(dataUrl);
                    } else {
                        resolve(compressedDataUrl);
                    }
                } catch (error) {
                    console.error('Failed to compress sticker image:', error);
                    resolve(dataUrl);
                }
            };
            img.onerror = () => resolve(dataUrl);
            img.src = dataUrl;
        });
    }
}

/**
 * Render a complex SVG sticker to a transparent session preview. The caller
 * keeps the original SVG in IndexedDB; this Blob exists only to avoid repeatedly
 * rasterizing thousands of vector paths while scrolling/zooming.
 */
export async function rasterizeSvgStickerPreview(
    file: Blob,
    width: number,
    height: number,
): Promise<Blob | null> {
    if (file.type !== 'image/svg+xml' || width <= 0 || height <= 0) return null;

    try {
        return await runInWorker<Blob>('rasterizeSvgStickerPreview', { blob: file, width, height });
    } catch {
        return new Promise((resolve) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.decoding = 'async';
            const release = () => URL.revokeObjectURL(url);
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        release();
                        resolve(null);
                        return;
                    }
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        release();
                        resolve(blob);
                    }, 'image/png');
                } catch {
                    release();
                    resolve(null);
                }
            };
            img.onerror = () => {
                release();
                resolve(null);
            };
            img.src = url;
        });
    }
}

/**
 * 压缩贴纸图片并直接返回 Blob
 * @param file 图片 File 或 Blob
 * @returns 压缩后的 Blob
 */
export async function compressStickerImageToBlob(file: File | Blob): Promise<Blob> {
    if (file.type === 'image/svg+xml') {
        return file;
    }

    try {
        const result = await runInWorker<Blob>('compressStickerImageToBlob', file);
        return result;
    } catch (e) {
        // Fallback to main thread
        console.warn('Worker fallback used for compressStickerImageToBlob');
        return new Promise((resolve) => {
            const img = new Image();
            const url = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(url);
                try {
                    let { width, height } = img;
                    if (width > STICKER_TARGET_WIDTH) {
                        height = Math.round((height * STICKER_TARGET_WIDTH) / width);
                        width = STICKER_TARGET_WIDTH;
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        resolve(file);
                        return;
                    }

                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(
                        (blob) => {
                            if (blob && blob.size < file.size) {
                                resolve(blob);
                            } else {
                                resolve(file);
                            }
                        },
                        'image/webp',
                        STICKER_COMPRESSION_QUALITY
                    );
                } catch (error) {
                    resolve(file);
                }
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                resolve(file);
            };
            img.src = url;
        });
    }
}

/**
 * 递归压缩 DockItem 数组中的所有图标
 * @param items DockItem 数组
 * @returns 压缩图标后的 DockItem 数组
 */
export async function compressIconsInItems(items: DockItem[]): Promise<DockItem[]> {
    return Promise.all(
        items.map(async (item) => {
            const compressedItem = { ...item };

            // 压缩项目本身的图标
            if (compressedItem.icon) {
                compressedItem.icon = await compressIcon(compressedItem.icon);
            }

            // 如果是文件夹，递归压缩子项
            if (compressedItem.type === 'folder' && compressedItem.items) {
                compressedItem.items = await compressIconsInItems(compressedItem.items);
            }

            return compressedItem;
        })
    );
}

/**
 * 估算 Base64 字符串的实际字节大小
 * @param base64 Base64 字符串
 * @returns 估算的字节数
 */
export function estimateBase64Size(base64: string): number {
    if (!base64) return 0;

    // 移除 data URL 前缀
    const base64Data = base64.split(',')[1] || base64;

    // Base64 编码后大小约为原始大小的 4/3
    return Math.ceil((base64Data.length * 3) / 4);
}

/**
 * 格式化字节大小为可读字符串
 * @param bytes 字节数
 * @returns 可读的大小字符串 (如 "1.5 MB")
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
