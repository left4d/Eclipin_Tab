import { executeNavigationInput } from '@/shared/navigation';
import { normalizeOpenTabUrl, type OpenBrowserTab } from './openTabsService';

export interface SavedBrowserTab {
  title: string;
  url: string;
  domain: string;
  displayDomain: string;
  favIconUrl?: string;
}

export interface SavedTabSession {
  id: string;
  name: string;
  savedAt: string;
  tabs: SavedBrowserTab[];
}

const STORAGE_KEY = 'Eclipin_savedTabSessions';
export const SAVED_TAB_SESSIONS_CHANGED_EVENT = 'eclipin-saved-tab-sessions-changed';

declare const browser: any;

const getChromeTabs = (): any | null => (
  typeof chrome !== 'undefined' && (chrome as any).tabs ? (chrome as any).tabs : null
);

const getBrowserTabs = (): any | null => (
  typeof browser !== 'undefined' && browser?.tabs ? browser.tabs : null
);

const normalizeHost = (hostname: string): string => hostname.trim().toLowerCase().replace(/^www\./, '');

const getDisplayDomain = (rawUrl: string): { domain: string; displayDomain: string } => {
  try {
    const url = new URL(rawUrl);
    if (url.protocol === 'file:') return { domain: '__local-file__', displayDomain: '本地文件' };
    const domain = normalizeHost(url.hostname || url.host);
    return { domain, displayDomain: domain || '网页' };
  } catch {
    return { domain: '', displayDomain: '网页' };
  }
};

const normalizeFavicon = (value: unknown): string | undefined => {
  const favicon = typeof value === 'string' ? value.trim() : '';
  return /^(?:https?:|data:image\/)/i.test(favicon) ? favicon : undefined;
};

const normalizeSavedTab = (value: unknown): SavedBrowserTab | null => {
  if (!value || typeof value !== 'object') return null;
  const input = value as Partial<SavedBrowserTab>;
  const url = normalizeOpenTabUrl(String(input.url || '').trim());
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:', 'file:'].includes(parsed.protocol)) return null;
  } catch {
    return null;
  }

  const derived = getDisplayDomain(url);
  if (!derived.domain) return null;
  return {
    title: String(input.title || '').trim() || derived.displayDomain,
    url,
    domain: String(input.domain || '').trim() || derived.domain,
    displayDomain: String(input.displayDomain || '').trim() || derived.displayDomain,
    favIconUrl: normalizeFavicon(input.favIconUrl),
  };
};

const normalizeSessionName = (value: unknown): string => String(value || '').trim().slice(0, 80);

const createSessionId = (): string => `tab-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeSessions = (value: unknown): SavedTabSession[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry): SavedTabSession | null => {
      if (!entry || typeof entry !== 'object') return null;
      const input = entry as Partial<SavedTabSession>;
      const unique = new Set<string>();
      const tabs = (Array.isArray(input.tabs) ? input.tabs : [])
        .map(normalizeSavedTab)
        .filter((tab): tab is SavedBrowserTab => {
          if (!tab) return false;
          if (unique.has(tab.url)) return false;
          unique.add(tab.url);
          return true;
        });
      if (tabs.length === 0) return null;
      return {
        id: String(input.id || '').trim() || createSessionId(),
        name: normalizeSessionName(input.name) || '保存的会话',
        savedAt: String(input.savedAt || '').trim() || new Date().toISOString(),
        tabs,
      };
    })
    .filter((session): session is SavedTabSession => Boolean(session))
    .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt));
};

const getStorage = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

const emitChanged = (sessions: SavedTabSession[]) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<SavedTabSession[]>(SAVED_TAB_SESSIONS_CHANGED_EVENT, { detail: sessions }));
};

const persistSessions = (sessions: SavedTabSession[]): SavedTabSession[] => {
  const normalized = normalizeSessions(sessions);
  try {
    getStorage()?.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Keep the UI usable even when storage is unavailable.
  }
  emitChanged(normalized);
  return normalized;
};

export const loadSavedTabSessions = (): SavedTabSession[] => {
  try {
    const raw = getStorage()?.getItem(STORAGE_KEY);
    return raw ? normalizeSessions(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
};

export const subscribeToSavedTabSessions = (listener: (sessions: SavedTabSession[]) => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  const handleLocal = (event: Event) => {
    const detail = (event as CustomEvent<SavedTabSession[]>).detail;
    listener(Array.isArray(detail) ? detail : loadSavedTabSessions());
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener(loadSavedTabSessions());
  };
  window.addEventListener(SAVED_TAB_SESSIONS_CHANGED_EVENT, handleLocal);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener(SAVED_TAB_SESSIONS_CHANGED_EVENT, handleLocal);
    window.removeEventListener('storage', handleStorage);
  };
};

export const toSavedBrowserTab = (tab: Pick<OpenBrowserTab, 'title' | 'url' | 'domain' | 'displayDomain' | 'favIconUrl'>): SavedBrowserTab => ({
  title: tab.title,
  url: normalizeOpenTabUrl(tab.url),
  domain: tab.domain,
  displayDomain: tab.displayDomain,
  favIconUrl: normalizeFavicon(tab.favIconUrl),
});

export const createSavedTabSession = (
  candidates: Array<Pick<OpenBrowserTab, 'title' | 'url' | 'domain' | 'displayDomain' | 'favIconUrl'>>,
  name: string,
): SavedTabSession[] => {
  const tabs = candidates.map(toSavedBrowserTab);
  if (tabs.length === 0) return loadSavedTabSessions();
  const sessions = loadSavedTabSessions();
  const baseName = normalizeSessionName(name) || tabs[0]?.displayDomain || '保存的会话';
  const taken = new Set(sessions.map((session) => session.name.toLowerCase()));
  let uniqueName = baseName;
  let suffix = 2;
  while (taken.has(uniqueName.toLowerCase())) {
    uniqueName = `${baseName} ${suffix}`;
    suffix += 1;
  }
  return persistSessions([
    {
      id: createSessionId(),
      name: uniqueName,
      savedAt: new Date().toISOString(),
      tabs,
    },
    ...sessions,
  ]);
};

export const appendTabsToSavedSession = (
  sessionId: string,
  candidates: Array<Pick<OpenBrowserTab, 'title' | 'url' | 'domain' | 'displayDomain' | 'favIconUrl'>>,
): { sessions: SavedTabSession[]; addedCount: number } => {
  const sessions = loadSavedTabSessions();
  let addedCount = 0;
  const additions = candidates.map(toSavedBrowserTab);
  const next = sessions.map((session) => {
    if (session.id !== sessionId) return session;
    const existing = new Set(session.tabs.map((tab) => normalizeOpenTabUrl(tab.url)));
    const tabs = [...session.tabs];
    additions.forEach((tab) => {
      if (existing.has(tab.url)) return;
      existing.add(tab.url);
      tabs.push(tab);
      addedCount += 1;
    });
    return { ...session, tabs };
  });
  return { sessions: persistSessions(next), addedCount };
};

export const deleteSavedTabSession = (sessionId: string): SavedTabSession[] => (
  persistSessions(loadSavedTabSessions().filter((session) => session.id !== sessionId))
);

export const renameSavedTabSession = (sessionId: string, nextName: string): SavedTabSession[] => {
  const name = normalizeSessionName(nextName);
  if (!name) return loadSavedTabSessions();
  return persistSessions(loadSavedTabSessions().map((session) => (
    session.id === sessionId ? { ...session, name } : session
  )));
};

export const removeTabFromSavedSession = (sessionId: string, rawUrl: string): SavedTabSession[] => {
  const targetUrl = normalizeOpenTabUrl(rawUrl);
  const next = loadSavedTabSessions()
    .map((session) => session.id === sessionId
      ? { ...session, tabs: session.tabs.filter((tab) => normalizeOpenTabUrl(tab.url) !== targetUrl) }
      : session)
    .filter((session) => session.tabs.length > 0);
  return persistSessions(next);
};

const createChromeTab = (tabsApi: any, url: string, active: boolean): Promise<void> => (
  new Promise((resolve, reject) => {
    tabsApi.create({ url, active }, () => {
      const runtimeError = typeof chrome !== 'undefined' ? chrome.runtime?.lastError : undefined;
      if (runtimeError) reject(new Error(runtimeError.message || 'Failed to create tab'));
      else resolve();
    });
  })
);

export const openSavedTab = async (url: string, active = true): Promise<void> => {
  const chromeTabs = getChromeTabs();
  if (chromeTabs) {
    await createChromeTab(chromeTabs, url, active);
    return;
  }
  const browserTabs = getBrowserTabs();
  if (browserTabs) {
    await browserTabs.create({ url, active });
    return;
  }
  executeNavigationInput(url, { openInNewTab: true });
};

export const restoreSavedTabSession = async (session: SavedTabSession): Promise<void> => {
  for (let index = 0; index < session.tabs.length; index += 1) {
    await openSavedTab(session.tabs[index].url, index === 0);
  }
};
