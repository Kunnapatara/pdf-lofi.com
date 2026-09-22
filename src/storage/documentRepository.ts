/**
 * Document Repository pattern for local-first storage in PDF-LoFi.
 * React UI and business logic interact with this abstraction rather than
 * invoking raw IndexedDB APIs.
 */
import { LocalDocument } from '../types/pdf';
import { openLocalDatabase, STORE_NAME } from './indexedDb';

export interface IDocumentRepository {
  save(doc: LocalDocument): Promise<void>;
  getRecent(limit?: number): Promise<LocalDocument[]>;
  getById(id: string): Promise<LocalDocument | null>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}

export class DocumentRepository implements IDocumentRepository {
  async save(doc: LocalDocument): Promise<void> {
    try {
      const db = await openLocalDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(doc);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn('DocumentRepository.save failed:', err);
    }
  }

  async getRecent(limit = 10): Promise<LocalDocument[]> {
    try {
      const db = await openLocalDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('updatedAt');
        const request = index.openCursor(null, 'prev');
        const results: LocalDocument[] = [];

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor && results.length < limit) {
            const item = cursor.value as LocalDocument;
            // Exclude large raw bytes in initial listing to keep memory lean
            results.push({
              ...item,
              data: undefined,
            });
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn('DocumentRepository.getRecent failed:', err);
      return [];
    }
  }

  async getById(id: string): Promise<LocalDocument | null> {
    try {
      const db = await openLocalDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(id);
        request.onsuccess = () => resolve((request.result as LocalDocument) || null);
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn('DocumentRepository.getById failed:', err);
      return null;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const db = await openLocalDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn('DocumentRepository.delete failed:', err);
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await openLocalDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn('DocumentRepository.clear failed:', err);
    }
  }
}

export const documentRepository = new DocumentRepository();
