import { afterEach, expect, it, vi } from 'vitest';
import { APPEARANCES, DEFAULT_SETTINGS, DENSITIES, FONTS, LAYOUTS, THEMES, loadSettings, saveSettings, updateSettings } from './settings.ts';

afterEach(() => localStorage.clear());

it('merges saved preferences with new defaults and isolates the returned settings', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ theme: 'sepia' }));
  const settings = await loadSettings();
  expect(settings).toEqual({ ...DEFAULT_SETTINGS, theme: 'sepia', appearance: 'light' });
  settings.size = 4;
  expect(DEFAULT_SETTINGS.size).toBe(2);
  await saveSettings(settings);
  expect((await loadSettings()).size).toBe(4);
});

it.each([
  ['auto', 'sage', 'auto'],
  ['light', 'sage', 'light'],
  ['dark', 'sage', 'dark'],
  ['sepia', 'sepia', 'light'],
])('preserves the former %s theme when splitting palette and appearance', async (old, theme, appearance) => {
  localStorage.setItem('galley:settings', JSON.stringify({ theme: old, font: 'sans', size: 3 }));
  expect(await loadSettings()).toEqual({ ...DEFAULT_SETTINGS, theme, appearance, font: 'sans', size: 3 });
});

it.each(THEMES.flatMap((theme) => APPEARANCES.map((appearance) => ({ theme, appearance }))))(
  'remembers $theme and $appearance independently',
  async ({ theme, appearance }) => {
    await saveSettings({ ...DEFAULT_SETTINGS, theme, appearance });
    expect(await loadSettings()).toEqual({ ...DEFAULT_SETTINGS, theme, appearance });
  },
);

it('falls back to valid palette and appearance defaults for unknown saved choices', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ theme: 'unknown', appearance: 'unknown', font: 'unknown' }));
  expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
});

it.each(LAYOUTS.flatMap((layout) => DENSITIES.map((density) => ({ layout, density }))))(
  'remembers the $layout layout and $density density',
  async ({ layout, density }) => {
    await saveSettings({ ...DEFAULT_SETTINGS, layout, density });
    expect(await loadSettings()).toEqual({ ...DEFAULT_SETTINGS, layout, density });
  },
);

it('falls back to the balanced, comfortable layout for unknown saved choices', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ layout: 'sidebar', density: 'tiny' }));
  expect(await loadSettings()).toMatchObject({ layout: 'balanced', density: 'comfortable' });
});

it('discards the retired comment-card preference when loading and saving settings', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ comments: 'outlined' }));
  const settings = await loadSettings();
  expect(settings).toEqual(DEFAULT_SETTINGS);
  await saveSettings(settings);
  expect(JSON.parse(localStorage.getItem('galley:settings')!)).not.toHaveProperty('comments');
});

it('folds skippable files and suggests a reading order unless told otherwise', async () => {
  expect(DEFAULT_SETTINGS).toMatchObject({ fold: true, order: 'suggested' });
  await saveSettings({ ...DEFAULT_SETTINGS, fold: false, order: 'listed' });
  expect(await loadSettings()).toMatchObject({ fold: false, order: 'listed' });
  localStorage.setItem('galley:settings', JSON.stringify({ fold: 'no', order: 'alphabetical' }));
  expect(await loadSettings()).toMatchObject({ fold: true, order: 'suggested' });
});

it('shows + and − beside changed code lines unless they were turned off', async () => {
  expect(DEFAULT_SETTINGS.signs).toBe(true);
  await saveSettings({ ...DEFAULT_SETTINGS, signs: false });
  expect((await loadSettings()).signs).toBe(false);
  localStorage.setItem('galley:settings', JSON.stringify({ signs: 'no' }));
  expect((await loadSettings()).signs).toBe(true);
});

it('starts with a top glow and remembers when it is turned off', async () => {
  expect(DEFAULT_SETTINGS.topGlow).toBe(true);
  await saveSettings({ ...DEFAULT_SETTINGS, topGlow: false });
  expect((await loadSettings()).topGlow).toBe(false);
  localStorage.setItem('galley:settings', JSON.stringify({ topGlow: 'no' }));
  expect((await loadSettings()).topGlow).toBe(true);
});

it('remembers how test files and code comments read, and starts with the plan and formatted notes', async () => {
  expect(DEFAULT_SETTINGS).toMatchObject({ tests: 'plan', codeComments: 'formatted' });
  await saveSettings({ ...DEFAULT_SETTINGS, tests: 'source', codeComments: 'source' });
  expect(await loadSettings()).toMatchObject({ tests: 'source', codeComments: 'source' });
  localStorage.setItem('galley:settings', JSON.stringify({ tests: 'outline', codeComments: 'rendered' }));
  expect(await loadSettings()).toMatchObject({ tests: 'plan', codeComments: 'formatted' });
});

it.each(FONTS)('remembers the %s typeface', async (font) => {
  await saveSettings({ ...DEFAULT_SETTINGS, font });
  expect((await loadSettings()).font).toBe(font);
});

it('uses extension-local storage instead of the host page storage', async () => {
  const get = vi.fn(async () => ({ 'galley:settings': { font: 'sans' } }));
  const set = vi.fn(async () => {});
  vi.stubGlobal('chrome', { storage: { local: { get, set } } });
  expect((await loadSettings()).font).toBe('sans');
  await saveSettings(DEFAULT_SETTINGS);
  expect(set).toHaveBeenCalledExactlyOnceWith({ 'galley:settings': DEFAULT_SETTINGS });
  expect(localStorage.length).toBe(0);
});

it('falls back to defaults after malformed data or denied reads, and tolerates denied writes', async () => {
  localStorage.setItem('galley:settings', '{bad');
  expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: async () => {
          throw new Error('Denied');
        },
        set: async () => {
          throw new Error('Denied');
        },
      },
    },
  });
  expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
  await expect(saveSettings(DEFAULT_SETTINGS)).resolves.toBeUndefined();
  vi.stubGlobal('chrome', undefined);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Denied');
  });
  await expect(saveSettings(DEFAULT_SETTINGS)).resolves.toBeUndefined();
});

it('uses the defaults when extension storage holds nothing yet, or cannot be reached at all', async () => {
  vi.stubGlobal('chrome', { storage: { local: { get: async () => ({}), set: async () => {} } } });
  expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
  vi.stubGlobal('chrome', {
    get storage(): never {
      throw new Error('Extension context invalidated');
    },
  });
  localStorage.setItem('galley:settings', JSON.stringify({ font: 'mono' }));
  expect((await loadSettings()).font).toBe('mono');
});

it('keeps a newer opening choice when an open reader saves a reading preference', async () => {
  await saveSettings({ ...DEFAULT_SETTINGS, readButton: false });
  expect(await updateSettings({ font: 'mono' })).toMatchObject({ font: 'mono', readButton: false });
  expect(await updateSettings({ readButton: true }, true)).toMatchObject({ font: 'mono', readButton: true });
  localStorage.setItem('galley:settings', JSON.stringify({ readButton: 'no' }));
  expect((await loadSettings()).readButton).toBe(true);
});

it('persists successive reading choices together before another reader opens', async () => {
  await saveSettings({ ...DEFAULT_SETTINGS, readButton: false });
  const changes = [updateSettings({ theme: 'paper' }), updateSettings({ font: 'mono' }), updateSettings({ density: 'compact' })];
  expect(await loadSettings()).toMatchObject({ readButton: false, theme: 'paper', font: 'mono', density: 'compact' });
  await Promise.all(changes);
});

it('reports denied or malformed settings to controls that must preserve a saved choice', async () => {
  localStorage.setItem('galley:settings', '{bad');
  await expect(loadSettings(true)).rejects.toThrow();
  localStorage.clear();
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Denied');
  });
  await expect(updateSettings({ readButton: false }, true)).rejects.toThrow('Denied');
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: async () => ({}),
        set: async () => {
          throw new Error('Extension write denied');
        },
      },
    },
  });
  await expect(saveSettings(DEFAULT_SETTINGS, true)).rejects.toThrow('Extension write denied');
  vi.stubGlobal('chrome', {
    get storage(): never {
      throw new Error('Extension context invalidated');
    },
  });
  await expect(loadSettings(true)).rejects.toThrow('Extension context invalidated');
});
