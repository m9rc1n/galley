import { afterEach, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settings.ts';

afterEach(() => localStorage.clear());

it('merges saved preferences with new defaults and isolates the returned settings', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ theme: 'sepia' }));
  const settings = await loadSettings();
  expect(settings).toEqual({ ...DEFAULT_SETTINGS, theme: 'sepia' });
  settings.size = 4;
  expect(DEFAULT_SETTINGS.size).toBe(2);
  await saveSettings(settings);
  expect((await loadSettings()).size).toBe(4);
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
