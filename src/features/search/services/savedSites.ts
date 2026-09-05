import { createId } from '@/shared/utils/id';

export interface SavedSite {
  id: string;
  site: string;
  createdAt: number;
}

const KEY = 'eclipin_saved_sites_v1';
const MAX_ITEMS = 24;
const MAX_LENGTH = 80;

/** 去掉协议、www、路径与末尾斜杠，尽量只保留域名，例如 bilibili.com */
export const normalizeSite = (value: string): string => value
  .trim()
  .replace(/^https?:\/\//i, '')
  .replace(/^www\./i, '')
  .replace(/^\/+|\/+$/g, '')
  .split('/')
  .filter(Boolean)
  .join('/')
  .slice(0, MAX_LENGTH);

const sanitize = (value: unknown): SavedSite[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is SavedSite => Boolean(
      item
      && typeof item === 'object'
      && typeof (item as SavedSite).id === 'string'
      && typeof (item as SavedSite).site === 'string',
    ))
    .slice(0, MAX_ITEMS);
};

const write = (list: SavedSite[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Optional convenience feature; silently degrade when storage is unavailable.
  }
};

export const readSavedSites = (): SavedSite[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    return sanitize(JSON.parse(raw));
  } catch {
    return [];
  }
};

export const addSavedSite = (site: string): SavedSite[] => {
  const normalized = normalizeSite(site);
  if (!normalized) return readSavedSites();
  const existing = readSavedSites().filter((item) => item.site !== normalized);
  const next: SavedSite[] = [{ id: createId(), site: normalized, createdAt: Date.now() }, ...existing].slice(0, MAX_ITEMS);
  write(next);
  return next;
};

export const removeSavedSite = (id: string): SavedSite[] => {
  const next = readSavedSites().filter((item) => item.id !== id);
  write(next);
  return next;
};

export const clearSavedSites = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Optional; silently degrade.
  }
};
