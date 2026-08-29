import { makeFaviconRef, invalidateIconCache, resolveIconUrl } from './iconCache';
import { discoverIconCandidates } from './iconCandidateDiscovery';
import { fetchAndProbeImage, imageUrlToBlob, probeBlobDimensions, probeImageLegacy } from './iconImageTools';
import { generateTextIconBlob } from './iconTextIcon';
import { db } from '@/shared/utils/db';
import { ensureHostPermission } from '@/shared/utils/hostPermission';

export { generateFolderIcon, generateTextIcon } from './iconTextIcon';

// ============================================================================
// 请求去重: 跟踪进行中的请求，避免重复网络请求
// ============================================================================
type IconResult = { url: string; isFallback: boolean; iconSmall?: boolean };

// 网络获取结果: 区分 Blob（可存 IndexedDB）和直接 URL（跨域无法获取 Blob 时）
type NetworkIconResult =
  | { kind: 'blob'; blob: Blob; iconSmall: boolean }
  | { kind: 'url'; url: string; iconSmall: boolean };

const pendingRequests = new Map<string, Promise<IconResult>>();

// Fallback 自动刷新间隔: 24小时
const FALLBACK_REFRESH_INTERVAL = 24 * 60 * 60 * 1000;
// 小图标阈值: 低于此尺寸标记为 iconSmall
const SMALL_ICON_THRESHOLD = 100;

/**
 * 获取网站图标
 * 返回的 url 是 favicon:domain 引用 ID（非 fallback 时）
 * 或 data URL（fallback 文字图标时）
 *
 * 优先级：
 * 1. IndexedDB 缓存命中 → 返回引用 ID (除非 forceRefresh)
 * 2. 进行中的请求 (去重)
 * 3. 网络获取 → 存 Blob 到 IndexedDB → 返回引用 ID
 */
export const fetchIcon = async (
  url: string,
  minSize: number = 100,
  forceRefresh: boolean = false,
  allowPermissionRequest: boolean = false
): Promise<IconResult> => {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    // 1. 检查 IndexedDB 缓存 (如果不强制刷新)
    if (!forceRefresh) {
      try {
        const dbCached = await db.getFavicon(domain);
      if (dbCached && dbCached.data) {
        // 旧版本可能缓存了 HTML、空文件或浏览器无法解码的响应。
        let blobValid = dbCached.data instanceof Blob && dbCached.data.size > 0;
        if (blobValid) {
          try {
            await probeBlobDimensions(dbCached.data);
          } catch {
            blobValid = false;
          }
        }

        if (!blobValid) {
          // 清除损坏的缓存条目，让下次重新获取，并使其内存缓存失效
          try { 
            await db.deleteFavicon(domain); 
            invalidateIconCache(domain);
          } catch { /* ignore */ }
        } else {
          // Fallback 自动刷新
          const isFallbackExpired = dbCached.isFallback &&
            dbCached.lastUpdated &&
            (Date.now() - dbCached.lastUpdated) > FALLBACK_REFRESH_INTERVAL;

          if (isFallbackExpired) {
            refreshFallbackIcon(url, domain, minSize);
          }

          if (dbCached.isFallback) {
            // Fallback 存的是文字图标的 Blob，需要转为 objectURL 显示
            const objectUrl = await resolveIconUrl(domain);
            return { url: objectUrl || makeFaviconRef(domain), isFallback: true, iconSmall: dbCached.iconSmall };
          }

          // 正常图标：返回引用 ID，DockItem 渲染时会异步解析
          return { url: makeFaviconRef(domain), isFallback: false, iconSmall: dbCached.iconSmall };
        }
        }
      } catch (dbError) {
        console.warn('Failed to read from IndexedDB favicon cache:', dbError);
      }
    }

    // 2. 请求去重
    const cacheKey = `${domain}:${minSize}:${forceRefresh}:${allowPermissionRequest}`;
    const pending = pendingRequests.get(cacheKey);
    if (pending) {
      return pending;
    }

    // 3. 网络获取
    const fetchPromise = fetchIconInternal(url, domain, minSize, allowPermissionRequest);
    pendingRequests.set(cacheKey, fetchPromise);

    try {
      return await fetchPromise;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  } catch {
    const fallbackBlob = generateTextIconBlob(url);
    return { url: fallbackBlob.dataUrl, isFallback: true };
  }
};

/**
 * 后台刷新 fallback 图标
 */
const refreshFallbackIcon = async (url: string, domain: string, minSize: number) => {
  try {
    const result = await fetchIconFromNetwork(url, domain, minSize, false);
    if (result && result.kind === 'blob') {
      invalidateIconCache(domain);
      await db.saveFavicon({
        domain,
        data: result.blob,
        isFallback: false,
        iconSmall: result.iconSmall,
        lastUpdated: Date.now()
      });
    }
  } catch {
    // 静默失败
  }
};

/**
 * 获取并自动处理图标（供 Modal 等组件使用）
 * 返回可直接显示的 URL（引用 ID 或 data URL）
 */
export const fetchAndProcessIcon = async (
  url: string,
  minSize: number = 100,
  forceRefresh: boolean = false,
  allowPermissionRequest: boolean = false
): Promise<IconResult> => {
  return fetchIcon(url, minSize, forceRefresh, allowPermissionRequest);
};

/**
 * 纯网络获取逻辑（不涉及缓存读取）
 * 三层 fallback 策略：
 *   1. 新版 fetch() + Blob（需要 host_permissions）
 *   2. 旧版 Image 探测（不需要 CORS → 返回 Blob 或直接 URL）
 *   3. 动态请求 host 权限后重试 fetch
 * 成功时返回 NetworkIconResult，失败时返回 null
 */
const fetchIconFromNetwork = async (
  url: string,
  domain: string,
  minSize: number,
  allowPermissionRequest: boolean
): Promise<NetworkIconResult | null> => {
  try {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol;
    const origin = `${protocol}//${domain}`;
    const normalizedDomain = domain.replace(/^www\./, '');
    const discoveredCandidates = await discoverIconCandidates(url);

    const specialCandidates: Record<string, string[]> = {
      'chatgpt.com': [
        'https://chatgpt.com/favicon.ico',
        'https://chatgpt.com/apple-touch-icon.png',
      ],
      'youtube.com': [
        'https://www.youtube.com/favicon.ico',
      ],
      'photos.google.com': [
        'https://www.gstatic.com/images/branding/product/2x/photos_96dp.png',
        'https://photos.google.com/favicon.ico',
      ],
    };

    const highPriorityCandidates = Array.from(new Set([
      ...discoveredCandidates,
      ...(specialCandidates[normalizedDomain] || []),
      `${origin}/apple-touch-icon.png`,
      `${origin}/apple-touch-icon-180x180.png`,
      `${origin}/apple-touch-icon-precomposed.png`,
      `${origin}/icon-192x192.png`,
      `${origin}/favicon.ico`,
    ]));

    const fallbackCandidates = [
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
      `https://api.faviconkit.com/${domain}/256`,
      `https://icon.horse/icon/${domain}`,
    ];

    const allCandidates = [...highPriorityCandidates, ...fallbackCandidates];

    // ================================================================
    // 策略 1: 新版 fetch（需要 host_permissions）→ 返回 Blob
    // ================================================================
    const fetchResult = await tryFetchStrategy(highPriorityCandidates, fallbackCandidates, minSize);
    if (fetchResult) return fetchResult;

    const retryWithPermission = async (probeMinSize: number): Promise<NetworkIconResult | null> => {
      const permitted = await ensureHostPermission();
      if (permitted) {
        const retryResult = await tryFetchStrategy(highPriorityCandidates, fallbackCandidates, probeMinSize);
        if (retryResult) return retryResult;
      }
      return null;
    };

    // ================================================================
    // 策略 2: 官方小图标兜底
    // 有些网站（如 ChatGPT）官方 favicon 小于 100px，不能因为尺寸小就选第三方图标
    // ================================================================
    if (minSize > 0) {
      const officialSmallResult = await tryImageProbeStrategy(highPriorityCandidates, 0);
      if (officialSmallResult) {
        if (officialSmallResult.kind === 'blob') return officialSmallResult;
        if (allowPermissionRequest) {
          const retryResult = await retryWithPermission(0);
          if (retryResult) return retryResult;
        }
        return officialSmallResult;
      }
    }

    // ================================================================
    // 策略 3: 旧版 Image 探测（不需要 CORS 权限）
    // 能获取 Blob 则返回 Blob，否则只在权限重试失败后返回直接 URL
    // ================================================================
    const legacyResult = await tryImageProbeStrategy(allCandidates, minSize);
    if (legacyResult) {
      if (legacyResult.kind === 'blob') return legacyResult;
      if (allowPermissionRequest) {
        const retryResult = await retryWithPermission(minSize);
        if (retryResult) return retryResult;
      }
      return legacyResult;
    }

    // ================================================================
    // 策略 4: 动态请求权限后重试 fetch → 返回 Blob
    // ================================================================
    if (allowPermissionRequest) {
      const retryResult = await retryWithPermission(minSize);
      if (retryResult) return retryResult;
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * 策略 1: 使用 fetch API 获取图标 Blob
 */
const tryFetchStrategy = async (
  highPriorityCandidates: string[],
  fallbackCandidates: string[],
  minSize: number
): Promise<NetworkIconResult | null> => {
  try {
    // 并行尝试高优先级候选
    const highResults = await Promise.allSettled(
      highPriorityCandidates.map(src => fetchAndProbeImage(src, 2000, minSize))
    );

    const validHigh = highResults
      .filter((r): r is PromiseFulfilledResult<{ blob: Blob; width: number; height: number }> =>
        r.status === 'fulfilled'
      )
      .map(r => r.value)
      .sort((a, b) => b.width - a.width);

    if (validHigh.length > 0) {
      const best = validHigh[0];
      return {
        kind: 'blob',
        blob: best.blob,
        iconSmall: best.width < SMALL_ICON_THRESHOLD || best.height < SMALL_ICON_THRESHOLD
      };
    }

    // 官方图标即使小于 100px，也比第三方服务返回的非官方图标更可信
    if (minSize > 0) {
      const smallOfficialResults = await Promise.allSettled(
        highPriorityCandidates.map(src => fetchAndProbeImage(src, 2000, 0))
      );

      const validSmallOfficial = smallOfficialResults
        .filter((r): r is PromiseFulfilledResult<{ blob: Blob; width: number; height: number }> =>
          r.status === 'fulfilled'
        )
        .map(r => r.value)
        .sort((a, b) => b.width - a.width);

      if (validSmallOfficial.length > 0) {
        const best = validSmallOfficial[0];
        return {
          kind: 'blob',
          blob: best.blob,
          iconSmall: best.width < SMALL_ICON_THRESHOLD || best.height < SMALL_ICON_THRESHOLD
        };
      }
    }

    // 并行尝试 fallback（接受任意尺寸）
    const fallbackResults = await Promise.allSettled(
      fallbackCandidates.map(src => fetchAndProbeImage(src, 4000, 0))
    );

    const validFallbacks = fallbackResults
      .filter((r): r is PromiseFulfilledResult<{ blob: Blob; width: number; height: number }> =>
        r.status === 'fulfilled'
      )
      .map(r => r.value)
      .sort((a, b) => b.width - a.width);

    if (validFallbacks.length > 0) {
      const best = validFallbacks[0];
      return {
        kind: 'blob',
        blob: best.blob,
        iconSmall: best.width < SMALL_ICON_THRESHOLD || best.height < SMALL_ICON_THRESHOLD
      };
    }
  } catch {
    // fetch 策略整体失败，继续下一策略
  }
  return null;
};

/**
 * 策略 2: 旧版 Image 探测（兼容无 CORS 权限场景）
 * 使用 new Image() 加载图片（浏览器允许 <img> 跨域加载）
 *
 * 尝试将图片转为 Blob 存储，如果因跨域限制无法获取 Blob，
 * 则直接返回图片 URL（和旧版 v1.0.0 行为一致）
 */
const tryImageProbeStrategy = async (
  candidates: string[],
  minSize: number
): Promise<NetworkIconResult | null> => {
  try {
    const results = await Promise.allSettled(
      candidates.map(src => probeImageLegacy(src, minSize))
    );

    const valid = results
      .filter((r): r is PromiseFulfilledResult<{ url: string; width: number; height: number }> =>
        r.status === 'fulfilled'
      )
      .map(r => r.value)
      .sort((a, b) => b.width - a.width);

    if (valid.length > 0) {
      const best = valid[0];
      const isSmall = best.width < SMALL_ICON_THRESHOLD || best.height < SMALL_ICON_THRESHOLD;

      // 尝试获取 Blob（用于 IndexedDB 离线缓存）
      const blob = await imageUrlToBlob(best.url, best.width, best.height);
      if (blob) {
        return { kind: 'blob', blob, iconSmall: isSmall };
      }

      // Blob 获取失败（跨域限制）→ 直接返回 URL（和旧版行为一致）
      return { kind: 'url', url: best.url, iconSmall: isSmall };
    }
  } catch {
    // Image 探测策略整体失败
  }
  return null;
};

/**
 * 内部图标获取逻辑：网络获取 → 存 IndexedDB → 返回引用 ID 或直接 URL
 */
const fetchIconInternal = async (
  url: string,
  domain: string,
  minSize: number,
  allowPermissionRequest: boolean
): Promise<IconResult> => {
  const networkResult = await fetchIconFromNetwork(url, domain, minSize, allowPermissionRequest);

  if (networkResult) {
    if (networkResult.kind === 'blob') {
      // Blob 可用 → 存 IndexedDB，返回 favicon:domain 引用
      try {
        invalidateIconCache(domain);
        await db.saveFavicon({
          domain,
          data: networkResult.blob,
          isFallback: false,
          iconSmall: networkResult.iconSmall,
          lastUpdated: Date.now()
        });
      } catch (dbError) {
        console.warn('Failed to save favicon to IndexedDB:', dbError);
      }

      return {
        url: makeFaviconRef(domain),
        isFallback: false,
        iconSmall: networkResult.iconSmall
      };
    } else {
      // 直接 URL（跨域无法获取 Blob）→ 直接返回 URL，不存 IndexedDB
      // 和旧版 v1.0.0 行为一致：<img src="https://..."> 直接渲染
      return {
        url: networkResult.url,
        isFallback: false,
        iconSmall: networkResult.iconSmall
      };
    }
  }

  // 全部失败 → 生成文字图标 Blob 并存入 IndexedDB
  const fallback = generateTextIconBlob(url);
  try {
    invalidateIconCache(domain);
    await db.saveFavicon({
      domain,
      data: fallback.blob,
      isFallback: true,
      lastUpdated: Date.now()
    });
  } catch {
    // 存储失败时直接返回 data URL
  }

  return { url: makeFaviconRef(domain), isFallback: true };
};

