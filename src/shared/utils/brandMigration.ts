/**
 * One-time namespace migration for users upgrading from the upstream EclipseTab build.
 * IndexedDB database names are intentionally not renamed here because moving binary
 * assets between databases during startup would risk data loss; those legacy database
 * identifiers remain an internal compatibility detail only.
 */
const renameLocalStorageKey = (key: string): string | null => {
  if (key.startsWith('EclipseTab_')) return `Eclipin_${key.slice('EclipseTab_'.length)}`;
  if (key.startsWith('eclipse_')) return `eclipin_${key.slice('eclipse_'.length)}`;
  return null;
};

export const migrateLegacyBrandStorage = (): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    const legacyKeys: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && renameLocalStorageKey(key)) legacyKeys.push(key);
    }

    for (const legacyKey of legacyKeys) {
      const nextKey = renameLocalStorageKey(legacyKey);
      if (!nextKey) continue;
      const legacyValue = localStorage.getItem(legacyKey);
      if (legacyValue !== null && localStorage.getItem(nextKey) === null) {
        localStorage.setItem(nextKey, legacyValue);
      }
      localStorage.removeItem(legacyKey);
    }
  } catch {
    // Storage may be blocked in private/restricted contexts; the app can still run.
  }
};

export const normalizeLegacyBrandStorageKey = (key: string): string => renameLocalStorageKey(key) ?? key;
