import type { DockItem } from '@/features/dock/types/dock';

export interface OpenBrowserTab {
  id: number;
  windowId: number;
  index: number;
  title: string;
  url: string;
  domain: string;
  displayDomain: string;
  favIconUrl?: string;
  active: boolean;
  pinned: boolean;
}

export interface OpenTabDomainGroup {
  domain: string;
  displayDomain: string;
  tabs: OpenBrowserTab[];
}

declare const browser: any;

const getChromeTabs = (): any | null => (
  typeof chrome !== 'undefined' && (chrome as any).tabs ? (chrome as any).tabs : null
);

const getBrowserTabs = (): any | null => (
  typeof browser !== 'undefined' && browser?.tabs ? browser.tabs : null
);

const getOwnExtensionRoot = (): string => {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) return chrome.runtime.getURL('');
    if (typeof browser !== 'undefined' && browser?.runtime?.getURL) return browser.runtime.getURL('');
  } catch {
    // Ignore environments where runtime URLs are unavailable (for example Vite preview).
  }
  return '';
};

const isSupportedWebsiteUrl = (rawUrl: string): boolean => {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'file:';
  } catch {
    return false;
  }
};

const normalizeHost = (hostname: string): string => hostname.trim().toLowerCase().replace(/^www\./, '');

export const normalizeOpenTabUrl = (rawUrl: string): string => {
  try {
    const url = new URL(rawUrl);
    url.hash = '';
    return url.href;
  } catch {
    return rawUrl.trim();
  }
};

export const collectDockItemUrls = (items: DockItem[]): Set<string> => {
  const urls = new Set<string>();
  const visit = (entries: DockItem[]) => {
    entries.forEach((item) => {
      if (item.url) urls.add(normalizeOpenTabUrl(item.url));
      if (item.type === 'folder' && item.items) visit(item.items);
    });
  };
  visit(items);
  return urls;
};

export const isTabsApiAvailable = (): boolean => {
  if (typeof chrome !== 'undefined' && chrome.permissions && getChromeTabs()) return true;
  if (typeof browser !== 'undefined' && browser?.permissions && getBrowserTabs()) return true;
  return false;
};

export const hasTabsPermission = async (): Promise<boolean> => {
  try {
    if (typeof chrome !== 'undefined' && chrome.permissions) {
      return await new Promise<boolean>((resolve) => {
        chrome.permissions.contains({ permissions: ['tabs'] }, (result) => resolve(Boolean(result)));
      });
    }
    if (typeof browser !== 'undefined' && browser?.permissions) {
      return Boolean(await browser.permissions.contains({ permissions: ['tabs'] }));
    }
  } catch {
    return false;
  }
  return false;
};

export const requestTabsPermission = async (): Promise<boolean> => {
  try {
    if (typeof chrome !== 'undefined' && chrome.permissions) {
      return await new Promise<boolean>((resolve) => {
        chrome.permissions.request({ permissions: ['tabs'] }, (granted) => resolve(Boolean(granted)));
      });
    }
    if (typeof browser !== 'undefined' && browser?.permissions) {
      return Boolean(await browser.permissions.request({ permissions: ['tabs'] }));
    }
  } catch {
    return false;
  }
  return false;
};

const queryChromeCurrentWindowTabs = async (tabsApi: any): Promise<any[]> => (
  new Promise((resolve, reject) => {
    tabsApi.query({ currentWindow: true }, (tabs: any[]) => {
      const runtimeError = typeof chrome !== 'undefined' ? chrome.runtime?.lastError : undefined;
      if (runtimeError) {
        reject(new Error(runtimeError.message || 'Failed to query tabs'));
        return;
      }
      resolve(Array.isArray(tabs) ? tabs : []);
    });
  })
);

export const queryOpenBrowserTabs = async (): Promise<OpenBrowserTab[]> => {
  const chromeTabs = getChromeTabs();
  const browserTabs = getBrowserTabs();
  let rawTabs: any[] = [];

  if (chromeTabs) {
    rawTabs = await queryChromeCurrentWindowTabs(chromeTabs);
  } else if (browserTabs) {
    rawTabs = await browserTabs.query({ currentWindow: true });
  } else {
    return [];
  }

  const ownRoot = getOwnExtensionRoot();

  return rawTabs
    .map((tab): OpenBrowserTab | null => {
      const url = String(tab?.url || '').trim();
      if (!url || (ownRoot && url.startsWith(ownRoot)) || !isSupportedWebsiteUrl(url)) return null;

      try {
        const parsed = new URL(url);
        const isFile = parsed.protocol === 'file:';
        const domain = isFile ? '__local-file__' : normalizeHost(parsed.hostname || parsed.host);
        if (!domain) return null;
        const displayDomain = isFile ? '本地文件' : domain;
        const title = String(tab?.title || '').trim() || (isFile ? parsed.pathname.split('/').filter(Boolean).pop() : displayDomain) || displayDomain;
        const tabId = Number(tab?.id);
        if (!Number.isFinite(tabId)) return null;

        return {
          id: tabId,
          windowId: Number.isFinite(Number(tab?.windowId)) ? Number(tab.windowId) : -1,
          index: Number.isFinite(Number(tab?.index)) ? Number(tab.index) : 0,
          title,
          url,
          domain,
          displayDomain,
          favIconUrl: typeof tab?.favIconUrl === 'string' && tab.favIconUrl ? tab.favIconUrl : undefined,
          active: Boolean(tab?.active),
          pinned: Boolean(tab?.pinned),
        };
      } catch {
        return null;
      }
    })
    .filter((tab): tab is OpenBrowserTab => Boolean(tab))
    .sort((a, b) => a.index - b.index);
};

export const groupOpenTabsByDomain = (tabs: OpenBrowserTab[]): OpenTabDomainGroup[] => {
  const groups = new Map<string, OpenTabDomainGroup>();
  tabs.forEach((tab) => {
    const current = groups.get(tab.domain);
    if (current) current.tabs.push(tab);
    else groups.set(tab.domain, { domain: tab.domain, displayDomain: tab.displayDomain, tabs: [tab] });
  });

  return [...groups.values()].sort((a, b) => {
    const activeA = a.tabs.some((tab) => tab.active) ? 1 : 0;
    const activeB = b.tabs.some((tab) => tab.active) ? 1 : 0;
    if (activeA !== activeB) return activeB - activeA;
    const firstA = Math.min(...a.tabs.map((tab) => tab.index));
    const firstB = Math.min(...b.tabs.map((tab) => tab.index));
    return firstA - firstB;
  });
};

export const focusOpenBrowserTab = async (tabId: number): Promise<void> => {
  const chromeTabs = getChromeTabs();
  if (chromeTabs) {
    await new Promise<void>((resolve, reject) => {
      chromeTabs.update(tabId, { active: true }, () => {
        const runtimeError = typeof chrome !== 'undefined' ? chrome.runtime?.lastError : undefined;
        if (runtimeError) reject(new Error(runtimeError.message || 'Failed to focus tab'));
        else resolve();
      });
    });
    return;
  }

  const browserTabs = getBrowserTabs();
  if (browserTabs) await browserTabs.update(tabId, { active: true });
};

export const subscribeToTabChanges = (listener: () => void): (() => void) => {
  const tabsApi = getChromeTabs() || getBrowserTabs();
  if (!tabsApi) return () => {};

  const events = [tabsApi.onCreated, tabsApi.onRemoved, tabsApi.onUpdated, tabsApi.onMoved, tabsApi.onActivated, tabsApi.onAttached, tabsApi.onDetached]
    .filter(Boolean);
  events.forEach((event: any) => event.addListener?.(listener));

  return () => events.forEach((event: any) => event.removeListener?.(listener));
};
