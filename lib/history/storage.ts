import { DocumentHistoryItem } from "@/lib/types";

const dbName = "productgpt-local-data";
const dbVersion = 1;
const storeName = "document-history";

function canUseIndexedDb() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openHistoryDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!canUseIndexedDb()) {
      reject(new Error("当前环境不支持本地历史记录。"));
      return;
    }

    const request = indexedDB.open(dbName, dbVersion);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
        store.createIndex("taskType", "taskType");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("打开本地历史记录失败。"));
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T | void> {
  return openHistoryDb().then(
    (db) =>
      new Promise<T | void>((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = callback(store);
        let requestResult: T | void;

        if (request) {
          request.onsuccess = () => {
            requestResult = request.result;
          };
          request.onerror = () =>
            reject(request.error ?? new Error("读取本地历史记录失败。"));
        }

        transaction.oncomplete = () => {
          db.close();
          resolve(requestResult);
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error ?? new Error("写入本地历史记录失败。"));
        };
      })
  );
}

export async function getHistoryItems(): Promise<DocumentHistoryItem[]> {
  if (!canUseIndexedDb()) {
    return [];
  }

  const items = (await withStore<DocumentHistoryItem[]>("readonly", (store) =>
    store.getAll()
  )) as DocumentHistoryItem[] | undefined;

  return (items ?? []).sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function saveHistoryItem(
  item: DocumentHistoryItem
): Promise<DocumentHistoryItem[]> {
  await withStore<IDBValidKey>("readwrite", (store) => store.put(item));
  return getHistoryItems();
}

export async function saveHistoryItems(
  items: DocumentHistoryItem[]
): Promise<DocumentHistoryItem[]> {
  await withStore<undefined>("readwrite", (store) => {
    items.forEach((item) => store.put(item));
  });
  return getHistoryItems();
}

export async function deleteHistoryItem(
  id: string
): Promise<DocumentHistoryItem[]> {
  await withStore<undefined>("readwrite", (store) => store.delete(id));
  return getHistoryItems();
}

export async function clearHistoryItems(): Promise<DocumentHistoryItem[]> {
  await withStore<undefined>("readwrite", (store) => store.clear());
  return [];
}
