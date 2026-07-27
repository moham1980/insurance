import { useCallback, useEffect, useState } from 'react';

export interface FNOLDraft {
  id: string;
  step: number;
  data: Record<string, any>;
  attachments: string[];
  updatedAt: number;
}

const DB_NAME = 'insurance-fnol';
const STORE_NAME = 'drafts';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Persist FNOL draft to IndexedDB for offline support.
 * @example
 * const { draft, saveDraft, loadDraft, clearDraft } = useFNOLStorage();
 */
export function useFNOLStorage() {
  const [db, setDb] = useState<IDBDatabase | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    openDB().then(setDb).catch(() => {});
  }, []);

  const saveDraft = useCallback(
    async (draft: FNOLDraft) => {
      if (!db) return;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      await new Promise<void>((resolve, reject) => {
        const req = store.put({ ...draft, updatedAt: Date.now() });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    },
    [db]
  );

  const loadDraft = useCallback(
    async (id: string): Promise<FNOLDraft | null> => {
      if (!db) return null;
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      return new Promise((resolve, reject) => {
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
      });
    },
    [db]
  );

  const clearDraft = useCallback(
    async (id: string) => {
      if (!db) return;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      await new Promise<void>((resolve, reject) => {
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    },
    [db]
  );

  const listDrafts = useCallback(async (): Promise<FNOLDraft[]> => {
    if (!db) return [];
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    });
  }, [db]);

  return { saveDraft, loadDraft, clearDraft, listDrafts, ready: !!db };
}
