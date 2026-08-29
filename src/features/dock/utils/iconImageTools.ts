/**
 * 基于 fetch 和 Image 的图标探测工具。
 */
export const probeBlobDimensions = async (blob: Blob): Promise<{ width: number; height: number }> => {
  try {
    const bitmap = await createImageBitmap(blob);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  } catch {
    const objectUrl = URL.createObjectURL(blob);
    try {
      return await new Promise((resolve, reject) => {
        const image = new Image();
        const timer = window.setTimeout(() => reject(new Error('Image decode timeout')), 3000);
        image.onload = () => {
          window.clearTimeout(timer);
          resolve({ width: image.naturalWidth, height: image.naturalHeight });
        };
        image.onerror = () => {
          window.clearTimeout(timer);
          reject(new Error('Image decode failed'));
        };
        image.src = objectUrl;
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }
};

export const fetchAndProbeImage = async (
  src: string,
  timeout: number = 3000,
  probeMinSize: number = 100,
): Promise<{ blob: Blob; width: number; height: number }> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(src, {
      signal: controller.signal,
      redirect: 'follow',
      cache: 'no-store',
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const blob = await response.blob();
    if (!blob.size) throw new Error('Empty image response');
    const { width, height } = await probeBlobDimensions(blob);

    if (probeMinSize > 0) {
      if (width < probeMinSize || height < probeMinSize) {
        if (width <= 1 || height <= 1) throw new Error('Image invalid');
        throw new Error(`Image too small (${width}x${height} < ${probeMinSize})`);
      }
    } else if (width <= 1 || height <= 1) {
      throw new Error('Image invalid');
    }

    return { blob, width, height };
  } finally {
    clearTimeout(timeoutId);
  }
};

export const probeImageLegacy = (
  src: string,
  minSize: number,
): Promise<{ url: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let settled = false;

    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
      if (!settled) {
        img.src = '';
      }
    };

    img.onload = () => {
      settled = true;
      if (minSize > 0) {
        if (img.naturalWidth >= minSize && img.naturalHeight >= minSize) {
          resolve({ url: src, width: img.naturalWidth, height: img.naturalHeight });
        } else if (img.naturalWidth > 1) {
          reject(`Image too small (${img.naturalWidth}x${img.naturalHeight} < ${minSize})`);
        } else {
          reject('Image invalid');
        }
      } else if (img.naturalWidth > 1) {
        resolve({ url: src, width: img.naturalWidth, height: img.naturalHeight });
      } else {
        reject('Image invalid');
      }
    };
    img.onerror = () => {
      settled = true;
      reject('Failed to load');
    };
    img.src = src;

    setTimeout(() => {
      if (!settled) {
        cleanup();
        reject('Timeout');
      }
    }, 5000);
  });
};

const loadImageWithCORS = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject('Failed to load with CORS');
    img.src = src;
    setTimeout(() => reject('Timeout'), 5000);
  });
};

export const imageUrlToBlob = async (
  imageUrl: string,
  width: number,
  height: number,
): Promise<Blob | null> => {
  try {
    const img = await loadImageWithCORS(imageUrl);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0, width, height);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject('toBlob failed')), 'image/png');
      });
      return blob;
    }
  } catch {
    // canvas tainted 或其他错误，继续尝试 fetch
  }

  try {
    const response = await fetch(imageUrl, { redirect: 'follow' });
    if (response.ok) {
      const blob = await response.blob();
      if (!blob.size) return null;
      await probeBlobDimensions(blob);
      return blob;
    }
  } catch {
    // fetch 或验证失败
  }

  return null;
};
