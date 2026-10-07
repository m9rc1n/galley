import { expect, it, vi } from 'vitest';
import { loadReaderFonts } from './fonts.ts';

vi.mock('./fonts/dm-sans-latin.woff2', () => ({ default: new Uint8Array([1]) }));
vi.mock('./fonts/newsreader-italic-latin.woff2', () => ({ default: new Uint8Array([2]) }));
vi.mock('./fonts/newsreader-latin.woff2', () => ({ default: new Uint8Array([3]) }));

it('loads locally bundled normal and italic faces once when the reader reopens', async () => {
  const doc = document.implementation.createHTMLDocument();
  const fonts = { add: vi.fn(), delete: vi.fn() };
  Object.defineProperty(doc, 'fonts', { value: fonts });
  const load = vi.fn().mockResolvedValue(undefined);
  const construct = vi.fn();
  vi.stubGlobal('FontFace', class {
    load = load;
    constructor(...args: unknown[]) { construct(...args); }
  });
  loadReaderFonts(doc);
  loadReaderFonts(doc);
  await Promise.resolve();
  expect(construct).toHaveBeenCalledTimes(3);
  expect(construct).toHaveBeenCalledWith('Galley Newsreader', expect.any(Uint8Array), expect.objectContaining({ style: 'italic' }));
  expect(fonts.add).toHaveBeenCalledTimes(3);
  expect(load).toHaveBeenCalledTimes(3);
  expect(fonts.delete).not.toHaveBeenCalled();
});

it('keeps system fallbacks available when decoding fonts fails or the font API is unavailable', async () => {
  const doc = document.implementation.createHTMLDocument();
  const fonts = { add: vi.fn(), delete: vi.fn() };
  Object.defineProperty(doc, 'fonts', { value: fonts });
  vi.stubGlobal('FontFace', undefined);
  expect(() => loadReaderFonts(doc)).not.toThrow();
  vi.stubGlobal('FontFace', class {
    load = () => Promise.reject(new Error('Font unavailable'));
  });
  loadReaderFonts(document.implementation.createHTMLDocument());
  loadReaderFonts(doc);
  await Promise.resolve();
  expect(fonts.delete).toHaveBeenCalledTimes(3);
});
