/**
 * GitHub tokens, one per site: github.com or a GitHub Enterprise Server origin.
 *
 * In the extension they live in the extension's own IndexedDB. Only extension pages (the popup)
 * and the background worker can open it. Content scripts cannot: they run inside github.com's
 * renderer, and their IndexedDB is the page's. Requests that need a token are therefore made by
 * the background worker (see background/worker.ts), and the token never enters the page.
 */
const DB_NAME = 'galley';
const STORE = 'tokens';
/** Where versions up to 0.2 kept tokens: chrome.storage.local, which content scripts can read. */
const LEGACY_KEY = 'galley:tokens';

function assertTrustedContext(): void {
  // A web page (that is, a content script) must never read or write tokens: its storage is the page's.
  if (/^https?:$/.test(globalThis.location?.protocol ?? '')) throw new Error('GitHub tokens are only available to Galley itself.');
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Run one operation in its own transaction, resolving once it has committed. */
async function run(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest): Promise<unknown> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = action(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function getToken(origin: string): Promise<string | null> {
  assertTrustedContext();
  return ((await run('readonly', (store) => store.get(origin))) as string | undefined) ?? null;
}

export async function setToken(origin: string, token: string | null): Promise<void> {
  assertTrustedContext();
  await run('readwrite', (store) => (token ? store.put(token, origin) : store.delete(origin)));
}

/** Move tokens saved by older versions out of chrome.storage.local, then delete them there. */
export async function migrateTokens(): Promise<void> {
  const area = globalThis.chrome?.storage?.local;
  if (!area) return;
  const legacy = (await area.get(LEGACY_KEY))[LEGACY_KEY] as Record<string, string> | undefined;
  if (!legacy) return;
  for (const [origin, token] of Object.entries(legacy)) if (token && !(await getToken(origin))) await setToken(origin, token);
  await area.remove(LEGACY_KEY);
}
