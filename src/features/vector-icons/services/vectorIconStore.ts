import type { VectorIconMeta, VectorIconRecord } from '../types/vectorIcon';
import { sanitizeSvg } from '../utils/svgSanitizer';
import { VECTOR_ICON_CANONICAL_SIZE } from '../utils/vectorIconSizing';

// Legacy database identifier is intentionally retained to preserve users' existing SVG library.
const DB_NAME = 'EclipseTabVectorIcons';
const DB_VERSION = 1;
const STORE_NAME = 'icons';
const FALLBACK_KEY = 'Eclipin_vectorIcons_fallback';
let databasePromise: Promise<IDBDatabase> | null = null;
const pendingIconReads = new Map<string, Promise<VectorIconRecord | null>>();


function normalizeStoredRecord(record: VectorIconRecord | null): { record: VectorIconRecord | null; changed: boolean } {
  if (!record) return { record: null, changed: false };
  const canonicalViewBox = `0 0 ${VECTOR_ICON_CANONICAL_SIZE} ${VECTOR_ICON_CANONICAL_SIZE}`;
  if (record.viewBox === canonicalViewBox && record.svg.includes('data-eclipin-normalized="1"')) {
    return { record, changed: false };
  }
  try {
    const sanitized = sanitizeSvg(record.svg);
    return {
      record: { ...record, svg: sanitized.svg, viewBox: sanitized.viewBox },
      changed: sanitized.svg !== record.svg || sanitized.viewBox !== record.viewBox,
    };
  } catch {
    return { record, changed: false };
  }
}

function canUseIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt');
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        databasePromise = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      databasePromise = null;
      reject(request.error ?? new Error('无法打开矢量图标存储。'));
    };
  });
  return databasePromise;
}

export function releaseVectorIconStore(): void {
  pendingIconReads.clear();
  const pending = databasePromise;
  databasePromise = null;
  if (!pending) return;
  void pending.then(db => db.close()).catch(() => undefined);
}

async function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void,
): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    action(store, resolve, reject);
    transaction.onerror = () => reject(transaction.error ?? new Error('矢量图标存储操作失败。'));
  });
}

function loadFallback(): VectorIconRecord[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFallback(records: VectorIconRecord[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(FALLBACK_KEY, JSON.stringify(records));
}

export async function listVectorIconMetadata(): Promise<VectorIconMeta[]> {
  if (!canUseIndexedDb()) {
    return loadFallback()
      .map(({ svg: _svg, ...meta }) => meta)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }
  try {
    return await withStore<VectorIconMeta[]>('readonly', (store, resolve, reject) => {
      const result: VectorIconMeta[] = [];
      const request = store.openCursor();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve(result.sort((a, b) => b.updatedAt - a.updatedAt));
          return;
        }
        const { svg: _svg, ...meta } = cursor.value as VectorIconRecord;
        result.push(meta);
        cursor.continue();
      };
    });
  } catch {
    return loadFallback().map(({ svg: _svg, ...meta }) => meta).sort((a, b) => b.updatedAt - a.updatedAt);
  }
}

export async function getVectorIcon(id: string): Promise<VectorIconRecord | null> {
  const existing = pendingIconReads.get(id);
  if (existing) return existing;

  const request = (async (): Promise<VectorIconRecord | null> => {
    let rawRecord: VectorIconRecord | null = null;
    if (!canUseIndexedDb()) {
      rawRecord = loadFallback().find(item => item.id === id) ?? null;
    } else {
      try {
        rawRecord = await withStore<VectorIconRecord | null>('readonly', (store, resolve, reject) => {
          const readRequest = store.get(id);
          readRequest.onsuccess = () => resolve((readRequest.result as VectorIconRecord | undefined) ?? null);
          readRequest.onerror = () => reject(readRequest.error);
        });
      } catch {
        rawRecord = loadFallback().find(item => item.id === id) ?? null;
      }
    }

    const normalized = normalizeStoredRecord(rawRecord);
    if (normalized.changed && normalized.record) {
      // Lazy migration keeps old libraries visually consistent without loading
      // every SVG into memory during startup.
      await saveVectorIcon(normalized.record);
    }
    return normalized.record;
  })();

  pendingIconReads.set(id, request);
  try {
    return await request;
  } finally {
    if (pendingIconReads.get(id) === request) pendingIconReads.delete(id);
  }
}

export async function saveVectorIcon(record: VectorIconRecord): Promise<void> {
  if (!canUseIndexedDb()) {
    const records = loadFallback();
    const index = records.findIndex(item => item.id === record.id);
    if (index >= 0) records[index] = record;
    else records.unshift(record);
    saveFallback(records.sort((a, b) => b.updatedAt - a.updatedAt));
    return;
  }
  try {
    await withStore<void>('readwrite', (store, resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    const records = loadFallback();
    const index = records.findIndex(item => item.id === record.id);
    if (index >= 0) records[index] = record;
    else records.unshift(record);
    saveFallback(records.sort((a, b) => b.updatedAt - a.updatedAt));
  }
}

export async function deleteVectorIcon(id: string): Promise<void> {
  if (!canUseIndexedDb()) {
    saveFallback(loadFallback().filter(item => item.id !== id));
    return;
  }
  try {
    await withStore<void>('readwrite', (store, resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    saveFallback(loadFallback().filter(item => item.id !== id));
  }
}


export async function exportVectorIconRecords(): Promise<VectorIconRecord[]> {
  const metadata = await listVectorIconMetadata();
  const records = await Promise.all(metadata.map((item) => getVectorIcon(item.id)));
  return records.filter((item): item is VectorIconRecord => Boolean(item));
}

export async function replaceVectorIconRecords(records: VectorIconRecord[]): Promise<void> {
  pendingIconReads.clear();
  if (!canUseIndexedDb()) {
    saveFallback(records);
    return;
  }
  try {
    await withStore<void>('readwrite', (store, resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    for (const record of records) await saveVectorIcon(record);
    saveFallback([]);
  } catch {
    saveFallback(records);
  }
}
