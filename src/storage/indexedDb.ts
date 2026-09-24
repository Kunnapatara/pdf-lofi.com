/**
 * Low-level IndexedDB connection & transaction manager for PDF-LoFi.
 * All document bytes remain on the user's device in browser storage.
 */
export const DB_NAME = 'pdf_lofi_db';
export const DB_VERSION = 2;
export const STORE_NAME = 'documents';
export const WORKFLOWS_STORE = 'workflows';

export function openLocalDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(WORKFLOWS_STORE)) {
        const workflowStore = db.createObjectStore(WORKFLOWS_STORE, { keyPath: 'id' });
        workflowStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
