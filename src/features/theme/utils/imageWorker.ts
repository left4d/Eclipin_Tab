/// <reference lib="webworker" />

export type WorkerMessage = {
    id: string;
    type: 'compressIcon' | 'compressStickerImage' | 'compressStickerImageToBlob' | 'rasterizeSvgStickerPreview';
    payload: any;
};

export type WorkerResponse = {
    id: string;
    result?: any;
    error?: string;
};

const ICON_TARGET_SIZE = 192;
const STICKER_TARGET_WIDTH = 1600;
const ICON_COMPRESSION_QUALITY = 0.6;
const STICKER_COMPRESSION_QUALITY = 0.85;

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
    const { id, type, payload } = e.data;
    try {
        if (type === 'compressIcon' || type === 'compressStickerImage') {
            const isIcon = type === 'compressIcon';
            const targetSize = isIcon ? ICON_TARGET_SIZE : STICKER_TARGET_WIDTH;
            const quality = isIcon ? ICON_COMPRESSION_QUALITY : STICKER_COMPRESSION_QUALITY;

            // fetch the data URL to get a Blob (works for data: URLs)
            const response = await fetch(payload);
            const blob = await response.blob();
            const bitmap = await createImageBitmap(blob);

            let width = bitmap.width;
            let height = bitmap.height;

            if (isIcon) {
                if (width > targetSize || height > targetSize) {
                    if (width > height) {
                        height = Math.round((height * targetSize) / width);
                        width = targetSize;
                    } else {
                        width = Math.round((width * targetSize) / height);
                        height = targetSize;
                    }
                }
            } else {
                if (width > targetSize) {
                    height = Math.round((height * targetSize) / width);
                    width = targetSize;
                }
            }

            const canvas = new OffscreenCanvas(width, height);
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('getContext("2d") failed');

            ctx.drawImage(bitmap, 0, 0, width, height);
            const compressedBlob = await canvas.convertToBlob({ type: 'image/webp', quality });

            const reader = new FileReader();
            reader.readAsDataURL(compressedBlob);
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                if (dataUrl.length > payload.length) {
                    self.postMessage({ id, result: payload });
                } else {
                    self.postMessage({ id, result: dataUrl });
                }
                bitmap.close();
            };
        } else if (type === 'rasterizeSvgStickerPreview') {
            const { blob, width, height } = payload as { blob: Blob; width: number; height: number };
            const bitmap = await createImageBitmap(blob, {
                resizeWidth: width,
                resizeHeight: height,
                resizeQuality: 'high',
            });
            const canvas = new OffscreenCanvas(width, height);
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('getContext("2d") failed');
            ctx.drawImage(bitmap, 0, 0, width, height);
            const previewBlob = await canvas.convertToBlob({ type: 'image/png' });
            bitmap.close();
            self.postMessage({ id, result: previewBlob });
        } else if (type === 'compressStickerImageToBlob') {
            const blob = payload as Blob;
            const bitmap = await createImageBitmap(blob);

            let width = bitmap.width;
            let height = bitmap.height;

            if (width > STICKER_TARGET_WIDTH) {
                height = Math.round((height * STICKER_TARGET_WIDTH) / width);
                width = STICKER_TARGET_WIDTH;
            }

            const canvas = new OffscreenCanvas(width, height);
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('getContext("2d") failed');

            ctx.drawImage(bitmap, 0, 0, width, height);
            const compressedBlob = await canvas.convertToBlob({ type: 'image/webp', quality: STICKER_COMPRESSION_QUALITY });

            if (compressedBlob.size < blob.size) {
                self.postMessage({ id, result: compressedBlob });
            } else {
                self.postMessage({ id, result: blob });
            }
            bitmap.close();
        }
    } catch (err: any) {
        self.postMessage({ id, error: err.message || 'Unknown error' });
    }
};
