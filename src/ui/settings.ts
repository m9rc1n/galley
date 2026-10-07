export const THEMES = ['paper', 'sage', 'sepia', 'slate'] as const;
export const APPEARANCES = ['auto', 'light', 'dark'] as const;
export type Theme = typeof THEMES[number];
export type Appearance = typeof APPEARANCES[number];

export interface Settings {
  theme: Theme;
  appearance: Appearance;
  font: 'serif' | 'sans';
  /** Index into TEXT_SIZES. */
  size: number;
  mode: 'changes' | 'clean';
  scope: 'changed' | 'all';
  codeFiles: boolean;
  /** External images in documents: wait for a click, or always load them. */
  images: 'ask' | 'load';
}

export const TEXT_SIZES = [17, 18, 20, 22, 24];

export const DEFAULT_SETTINGS: Settings = { theme: 'sage', appearance: 'auto', font: 'serif', size: 2, mode: 'changes', scope: 'changed', codeFiles: false, images: 'ask' };

const SETTINGS_KEY = 'galley:settings';

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
  // Earlier versions used one setting for both colour and brightness. Preserve that choice.
  const saved = await read<Partial<Omit<Settings, 'theme'>> & { theme?: Theme | Appearance }>(SETTINGS_KEY) ?? {};
  const theme = THEMES.find((theme) => theme === saved.theme) ?? DEFAULT_SETTINGS.theme;
  const legacyAppearance = saved.theme === 'dark' ? 'dark' : saved.theme === 'light' || saved.theme === 'sepia' ? 'light' : 'auto';
  const appearance = APPEARANCES.find((appearance) => appearance === saved.appearance) ?? legacyAppearance;
  return { ...DEFAULT_SETTINGS, ...saved, theme, appearance };
}

export function saveSettings(settings: Settings): Promise<void> {
  return write(SETTINGS_KEY, settings);
}
