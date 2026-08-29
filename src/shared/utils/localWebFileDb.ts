import { db, LOCAL_WEB_FILES_STORE } from './db';

export interface LocalWebFileItem {
  key: string;
  pageId: string;
  path: string;
  data: Blob;
  mimeType: string;
  size: number;
}

export const saveLocalWebFiles = async (items: LocalWebFileItem[]): Promise<void> => {
  if (items.length === 0) return;
  const database = await db.getRawDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(LOCAL_WEB_FILES_STORE, 'readwrite');
    const store = transaction.objectStore(LOCAL_WEB_FILES_STORE);
    items.forEach((item) => store.put(item));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('Failed to save local web package files'));
  });
};

export const getLocalWebFiles = async (pageId: string): Promise<LocalWebFileItem[]> => {
  try {
    const database = await db.getRawDatabase();
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(LOCAL_WEB_FILES_STORE, 'readonly');
      const request = transaction.objectStore(LOCAL_WEB_FILES_STORE).index('pageId').getAll(pageId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('DB GetLocalWebFiles Error:', error);
    return [];
  }
};

export const deleteLocalWebFiles = async (pageId: string): Promise<void> => {
  const database = await db.getRawDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(LOCAL_WEB_FILES_STORE, 'readwrite');
    const store = transaction.objectStore(LOCAL_WEB_FILES_STORE);
    const request = store.index('pageId').openKeyCursor(IDBKeyRange.only(pageId));
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      store.delete(cursor.primaryKey);
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('Failed to delete local web package files'));
  });
};

export const clearAllLocalWebFiles = async (): Promise<void> => {
  const database = await db.getRawDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(LOCAL_WEB_FILES_STORE, 'readwrite').objectStore(LOCAL_WEB_FILES_STORE).clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
