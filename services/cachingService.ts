// A simple IndexedDB wrapper for caching
const DB_NAME = 'AlshabandarCache';
const STORE_NAME = 'FirestoreCache';
const DB_VERSION = 1;

interface CacheItem<T> {
    key: string;
    timestamp: number;
    data: T;
}

let db: IDBDatabase | null = null;

const getDb = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve(db);
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('IndexedDB error:', request.error);
            reject('Error opening IndexedDB.');
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = () => {
            const dbInstance = request.result;
            if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
                dbInstance.createObjectStore(STORE_NAME, { keyPath: 'key' });
            }
        };
    });
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const cachingService = {
    get: async <T>(key: string): Promise<T | null> => {
        try {
            const db = await getDb();
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);

            return new Promise((resolve) => {
                request.onsuccess = () => {
                    const item = request.result as CacheItem<T> | undefined;
                    if (!item) {
                        return resolve(null);
                    }
                    if (Date.now() - item.timestamp > CACHE_TTL) {
                        // Don't await deletion, just fire and forget
                        cachingService.delete(key); 
                        return resolve(null);
                    }
                    resolve(item.data);
                };
                request.onerror = () => {
                    resolve(null);
                };
            });
        } catch (error) {
            console.error("Cache get error:", error);
            return null;
        }
    },

    set: async <T>(key: string, data: T): Promise<void> => {
       try {
            const db = await getDb();
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const item: CacheItem<T> = {
                key,
                timestamp: Date.now(),
                data: data,
            };
            store.put(item);
        } catch (error) {
            console.error("Cache set error:", error);
        }
    },
    
    delete: async (key: string): Promise<void> => {
         try {
            const db = await getDb();
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            store.delete(key);
        } catch (error) {
            console.error("Cache delete error:", error);
        }
    }
};
