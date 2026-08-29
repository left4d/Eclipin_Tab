// Must match the legacy IndexedDB name used by the main app so existing local web packages remain available.
const DB_NAME = 'EclipseTabDB';
const DB_VERSION = 6;
const LOCAL_WEB_FILES_STORE = 'local_web_files';
const LOCAL_WEB_PREFIX = '/__local-web__/';

chrome.runtime.onInstalled.addListener(() => {
  // Reserved for migrations. The worker otherwise stays event-driven and dormant when unused.
});

const openDb = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  request.onsuccess = () => resolve(request.result);
  request.onupgradeneeded = () => {
    const db = request.result;
    const ensureStore = (name, keyPath) => {
      if (!db.objectStoreNames.contains(name)) return db.createObjectStore(name, { keyPath });
      return request.transaction.objectStore(name);
    };
    ensureStore('wallpapers', 'id');
    ensureStore('sticker_images', 'id');
    ensureStore('favicons', 'domain');
    ensureStore('custom_fonts', 'id');
    ensureStore('local_web_pages', 'id');
    const fileStore = ensureStore(LOCAL_WEB_FILES_STORE, 'key');
    if (!fileStore.indexNames.contains('pageId')) fileStore.createIndex('pageId', 'pageId', { unique: false });
  };
});

const readLocalWebFile = async (pageId, path) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LOCAL_WEB_FILES_STORE, 'readonly');
    const request = tx.objectStore(LOCAL_WEB_FILES_STORE).get(`${pageId}:${path}`);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  }).finally(() => db.close());
};

const decodeVirtualRequest = (url) => {
  if (url.origin !== self.location.origin || !url.pathname.startsWith(LOCAL_WEB_PREFIX)) return null;
  const rest = url.pathname.slice(LOCAL_WEB_PREFIX.length);
  const parts = rest.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  try {
    const pageId = decodeURIComponent(parts.shift());
    const path = parts.map((part) => decodeURIComponent(part)).join('/');
    if (!pageId || !path || path.split('/').some((segment) => segment === '..' || segment === '.')) return null;
    return { pageId, path };
  } catch {
    return null;
  }
};

self.addEventListener('fetch', (event) => {
  const target = decodeVirtualRequest(new URL(event.request.url));
  if (!target) return;
  event.respondWith((async () => {
    try {
      const item = await readLocalWebFile(target.pageId, target.path);
      if (!item?.data) return new Response('Local web package file not found', { status: 404 });
      const headers = new Headers({
        'Content-Type': item.mimeType || item.data.type || 'application/octet-stream',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      });
      return new Response(item.data, { status: 200, headers });
    } catch (error) {
      console.warn('Failed to serve local web package file:', error);
      return new Response('Failed to load local web package file', { status: 500 });
    }
  })());
});
