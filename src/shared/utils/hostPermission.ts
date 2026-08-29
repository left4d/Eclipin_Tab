/**
 * Host 权限管理工具。
 * - 图标抓取使用可选的 <all_urls> 权限。
 * - 网页嵌入只申请当前主机，遵循最小权限原则。
 */

declare const browser: any;

const ALL_URLS_ORIGIN = '<all_urls>';
const DENIED_COOLDOWN = 60 * 1000;

let pendingAllUrlsRequest: Promise<boolean> | null = null;
let pendingAllUrlsEnsure: Promise<boolean> | null = null;
let hasAllUrlsPermissionCache: boolean | null = null;
let allUrlsDeniedUntil = 0;

const originPermissionCache = new Map<string, boolean>();
const pendingOriginRequests = new Map<string, Promise<boolean>>();

const hasPermissionsApi = (): boolean => Boolean(
  (typeof chrome !== 'undefined' && chrome.permissions)
  || (typeof browser !== 'undefined' && browser?.permissions),
);

const consumeChromeLastError = (): void => {
  if (typeof chrome !== 'undefined' && chrome.runtime?.lastError) {
    // 读取 lastError，避免 Chrome 在控制台输出未处理的权限错误。
    void chrome.runtime.lastError.message;
  }
};

/** 检查是否已拥有 <all_urls> 权限。 */
export async function hasHostPermission(): Promise<boolean> {
  try {
    if (typeof chrome !== 'undefined' && chrome.permissions) {
      return await new Promise<boolean>((resolve) => {
        chrome.permissions.contains({ origins: [ALL_URLS_ORIGIN] }, (result) => {
          consumeChromeLastError();
          hasAllUrlsPermissionCache = result;
          resolve(result);
        });
      });
    }
    if (typeof browser !== 'undefined' && browser?.permissions) {
      const result = await browser.permissions.contains({ origins: [ALL_URLS_ORIGIN] });
      hasAllUrlsPermissionCache = result;
      return result;
    }
  } catch {
    // 普通网页环境或权限 API 不可用。
  }
  return false;
}

/** 请求 <all_urls> 权限，必须由用户手势触发。 */
export async function requestHostPermission(): Promise<boolean> {
  if (hasAllUrlsPermissionCache === true) return true;
  if (Date.now() < allUrlsDeniedUntil) return false;
  if (pendingAllUrlsRequest) return pendingAllUrlsRequest;

  const request = async (): Promise<boolean> => {
    try {
      if (typeof chrome !== 'undefined' && chrome.permissions) {
        return await new Promise<boolean>((resolve) => {
          chrome.permissions.request({ origins: [ALL_URLS_ORIGIN] }, (granted) => {
            consumeChromeLastError();
            hasAllUrlsPermissionCache = granted;
            if (!granted) allUrlsDeniedUntil = Date.now() + DENIED_COOLDOWN;
            resolve(granted);
          });
        });
      }
      if (typeof browser !== 'undefined' && browser?.permissions) {
        const granted = await browser.permissions.request({ origins: [ALL_URLS_ORIGIN] });
        hasAllUrlsPermissionCache = granted;
        if (!granted) allUrlsDeniedUntil = Date.now() + DENIED_COOLDOWN;
        return granted;
      }
    } catch {
      allUrlsDeniedUntil = Date.now() + DENIED_COOLDOWN;
    }
    return false;
  };

  pendingAllUrlsRequest = request().finally(() => {
    pendingAllUrlsRequest = null;
  });
  return pendingAllUrlsRequest;
}

/** 确保拥有 <all_urls> 权限。 */
export async function ensureHostPermission(): Promise<boolean> {
  if (hasAllUrlsPermissionCache === true) return true;
  if (pendingAllUrlsEnsure) return pendingAllUrlsEnsure;

  pendingAllUrlsEnsure = (async () => {
    if (await hasHostPermission()) return true;
    return requestHostPermission();
  })().finally(() => {
    pendingAllUrlsEnsure = null;
  });
  return pendingAllUrlsEnsure;
}

/**
 * 转换为扩展匹配模式。
 * Chrome 的 match pattern 不包含端口，因此同一 NAS 主机的 HTTP、HTTPS
 * 和不同管理端口可以共用一次授权。
 */
export function getHostPermissionPattern(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return `*://${parsed.hostname}/*`;
  } catch {
    return null;
  }
}

/** 检查具体网页主机是否已授权。普通网页开发环境不阻塞。 */
export async function hasHostPermissionForUrl(url: string): Promise<boolean> {
  const pattern = getHostPermissionPattern(url);
  if (!pattern) return false;
  if (!hasPermissionsApi()) return true;
  if (hasAllUrlsPermissionCache === true || originPermissionCache.get(pattern) === true) return true;

  try {
    if (typeof chrome !== 'undefined' && chrome.permissions) {
      return await new Promise<boolean>((resolve) => {
        chrome.permissions.contains({ origins: [pattern] }, (result) => {
          consumeChromeLastError();
          originPermissionCache.set(pattern, result);
          resolve(result);
        });
      });
    }
    if (typeof browser !== 'undefined' && browser?.permissions) {
      const result = await browser.permissions.contains({ origins: [pattern] });
      originPermissionCache.set(pattern, result);
      return result;
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * 请求具体网页主机权限，必须由用户点击直接触发。
 * 已授权时浏览器会直接返回 true，不会再次弹窗。
 */
export async function requestHostPermissionForUrl(url: string): Promise<boolean> {
  const pattern = getHostPermissionPattern(url);
  if (!pattern) return false;
  if (!hasPermissionsApi()) return true;
  if (hasAllUrlsPermissionCache === true || originPermissionCache.get(pattern) === true) return true;

  const pending = pendingOriginRequests.get(pattern);
  if (pending) return pending;

  const request = (async (): Promise<boolean> => {
    try {
      if (typeof chrome !== 'undefined' && chrome.permissions) {
        return await new Promise<boolean>((resolve) => {
          chrome.permissions.request({ origins: [pattern] }, (granted) => {
            consumeChromeLastError();
            originPermissionCache.set(pattern, granted);
            resolve(granted);
          });
        });
      }
      if (typeof browser !== 'undefined' && browser?.permissions) {
        const granted = await browser.permissions.request({ origins: [pattern] });
        originPermissionCache.set(pattern, granted);
        return granted;
      }
    } catch {
      originPermissionCache.set(pattern, false);
    }
    return false;
  })().finally(() => {
    pendingOriginRequests.delete(pattern);
  });

  pendingOriginRequests.set(pattern, request);
  return request;
}

/** 确保具体网页主机已授权。适合非用户手势触发的检查流程。 */
export async function ensureHostPermissionForUrl(url: string): Promise<boolean> {
  if (await hasHostPermissionForUrl(url)) return true;
  return requestHostPermissionForUrl(url);
}
