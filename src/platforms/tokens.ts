/**
 * GitHub tokens, one per site: github.com or a GitHub Enterprise Server origin.
 *
 * In the extension they live in the extension's own IndexedDB. Only extension pages (the popup)
 * and the background worker can open it. Content scripts cannot: they run inside github.com's
 * renderer, and their IndexedDB is the page's. Requests that need a token are therefore made by
 * the background worker (see background/worker.ts), and the token never enters the page.
 * Unit tests have no IndexedDB and fall back to localStorage.
 */
const DB_NAME = 'galley';
const STORE = 'tokens';
/** Where versions up to 0.2 kept tokens: chrome.storage.local, which content scripts can read. */
const LEGACY_KEY = 'galley:tokens';

function assertTrustedContext(): void {
  // A web page (that is, a content script) must never read or write tokens: its storage is the page's.
  if (/^https?:$/.test(globalThis.location?.protocol ?? '')) throw new Error('GitHub tokens are only available to Galley itself.');
}

let database: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return database;
}

async function run(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest): Promise<unknown> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const request = action(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function fallback(): Record<string, string> {
  return JSON.parse(globalThis.localStorage?.getItem(LEGACY_KEY) ?? '{}') as Record<string, string>;
}

export async function getToken(origin: string): Promise<string | null> {
  assertTrustedContext();
  if (typeof indexedDB === 'undefined') return fallback()[origin] ?? null;
  return ((await run('readonly', (store) => store.get(origin))) as string | undefined) ?? null;
}

export async function setToken(origin: string, token: string | null): Promise<void> {
  assertTrustedContext();
  if (typeof indexedDB === 'undefined') {
    const tokens = fallback();
    if (token) tokens[origin] = token;
    else delete tokens[origin];
    globalThis.localStorage?.setItem(LEGACY_KEY, JSON.stringify(tokens));
    return;
  }
  await run('readwrite', (store) => (token ? store.put(token, origin) : store.delete(origin)));
}

/** Move tokens saved by older versions out of chrome.storage.local, then delete them there. */
export async function migrateTokens(): Promise<void> {
  const area = globalThis.chrome?.storage?.local;
  if (!area || typeof indexedDB === 'undefined') return;
  const legacy = (await area.get(LEGACY_KEY))[LEGACY_KEY] as Record<string, string> | undefined;
  if (!legacy) return;
  for (const [origin, token] of Object.entries(legacy)) if (token && !(await getToken(origin))) await setToken(origin, token);
  await area.remove(LEGACY_KEY);
}
