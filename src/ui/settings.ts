export type Theme = 'auto' | 'light' | 'sepia' | 'dark';

export interface Settings {
  theme: Theme;
  font: 'serif' | 'sans';
  /** Index into TEXT_SIZES. */
  size: number;
  mode: 'changes' | 'clean';
  scope: 'changed' | 'all';
  codeFiles: boolean;
}

export const TEXT_SIZES = [17, 18, 20, 22, 24];

export const DEFAULT_SETTINGS: Settings = { theme: 'auto', font: 'serif', size: 2, mode: 'changes', scope: 'changed', codeFiles: false };

const SETTINGS_KEY = 'galley:settings';
const TOKENS_KEY = 'galley:tokens';

/** chrome.storage.local in the extension; localStorage in the demo page. */
function extensionStorage(): chrome.storage.StorageArea | null {
  try {
    return globalThis.chrome?.storage?.local ?? null;
  } catch {
    return null;
  }
}

async function read<T>(key: string): Promise<T | null> {
  const area = extensionStorage();
  try {
    if (area) return ((await area.get(key))[key] as T) ?? null;
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function write(key: string, value: unknown): Promise<void> {
  const area = extensionStorage();
  try {
    if (area) await area.set({ [key]: value });
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Settings are a convenience; failing to persist them is not worth surfacing.
  }
}

export async function loadSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...(await read<Partial<Settings>>(SETTINGS_KEY)) };
}

export function saveSettings(settings: Settings): Promise<void> {
  return write(SETTINGS_KEY, settings);
}

/** GitHub tokens are stored per origin (github.com, or a GitHub Enterprise Server host). */
export async function getToken(origin: string): Promise<string | null> {
  return (await read<Record<string, string>>(TOKENS_KEY))?.[origin] ?? null;
}

export async function setToken(origin: string, token: string | null): Promise<void> {
  const tokens = (await read<Record<string, string>>(TOKENS_KEY)) ?? {};
  if (token) tokens[origin] = token;
  else delete tokens[origin];
  await write(TOKENS_KEY, tokens);
}
