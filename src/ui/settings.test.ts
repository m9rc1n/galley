import { afterEach, expect, it, vi } from 'vitest';
import { APPEARANCES, DEFAULT_SETTINGS, DENSITIES, FONTS, LAYOUTS, THEMES, loadSettings, saveSettings } from './settings.ts';

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
  'remembers $theme and $appearance independently', async ({ theme, appearance }) => {
    await saveSettings({ ...DEFAULT_SETTINGS, theme, appearance });
    expect(await loadSettings()).toEqual({ ...DEFAULT_SETTINGS, theme, appearance });
  },
);

it('falls back to valid palette and appearance defaults for unknown saved choices', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ theme: 'unknown', appearance: 'unknown', font: 'unknown' }));
  expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
});

it.each(LAYOUTS.flatMap((layout) => DENSITIES.map((density) => ({ layout, density }))))(
  'remembers the $layout layout and $density density', async ({ layout, density }) => {
    await saveSettings({ ...DEFAULT_SETTINGS, layout, density });
    expect(await loadSettings()).toEqual({ ...DEFAULT_SETTINGS, layout, density });
  },
);

it('falls back to the balanced, comfortable layout for unknown saved choices', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ layout: 'sidebar', density: 'tiny' }));
  expect(await loadSettings()).toMatchObject({ layout: 'balanced', density: 'comfortable' });
});

it('remembers how comment cards look, and shades them unless outlines were chosen', async () => {
  expect(DEFAULT_SETTINGS.comments).toBe('shaded');
  await saveSettings({ ...DEFAULT_SETTINGS, comments: 'outlined' });
  expect((await loadSettings()).comments).toBe('outlined');
  localStorage.setItem('galley:settings', JSON.stringify({ comments: 'boxed' }));
  expect((await loadSettings()).comments).toBe('shaded');
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
  vi.stubGlobal('chrome', { storage: { local: { get: async () => { throw new Error('Denied'); }, set: async () => { throw new Error('Denied'); } } } });
  expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
  await expect(saveSettings(DEFAULT_SETTINGS)).resolves.toBeUndefined();
  vi.stubGlobal('chrome', undefined);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Denied'); });
  await expect(saveSettings(DEFAULT_SETTINGS)).resolves.toBeUndefined();
});
