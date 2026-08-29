const SEARCH_HISTORY_KEY = 'eclipin_search_history_v1';
const MAX_HISTORY_ITEMS = 8;
const MAX_HISTORY_LENGTH = 160;

const sanitizeHistory = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.slice(0, MAX_HISTORY_LENGTH)),
  )).slice(0, MAX_HISTORY_ITEMS);
};

export const readSearchHistory = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    return sanitizeHistory(JSON.parse(raw));
  } catch {
    return [];
  }
};

export const pushSearchHistory = (query: string, current: string[]): string[] => {
  const trimmed = query.trim().slice(0, MAX_HISTORY_LENGTH);
  if (!trimmed) return current;
  const next = sanitizeHistory([trimmed, ...current.filter((item) => item !== trimmed)]);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
    } catch {
      // Storage can be unavailable in hardened/private contexts. History is optional.
    }
  }
  return next;
};

export const clearSearchHistory = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch {
    // Optional convenience feature; silently degrade when storage is unavailable.
  }
};
