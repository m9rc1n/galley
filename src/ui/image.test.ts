import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { withImageFallback } from './image.ts';

let receiving: { onmessage: ((event: MessageEvent) => void) | null; close: ReturnType<typeof vi.fn> };
let sending: object;
beforeEach(() => {
  vi.useFakeTimers();
  receiving = { onmessage: null, close: vi.fn() };
  sending = {};
  vi.stubGlobal(
    'MessageChannel',
    class {
      port1 = receiving;
      port2 = sending;
    },
  );
});

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function broken(src = 'https://img.shields.io/badge/coverage-100-green') {
  vi.stubGlobal('chrome', { runtime: { getURL: (path: string) => `chrome-extension://galley/${path}` } });
  const img = document.createElement('img');
  img.alt = 'Coverage';
  img.src = src;
  document.body.append(img);
  withImageFallback(img);
  img.dispatchEvent(new Event('error'));
  return img;
}

it('recovers a consented badge blocked by the host CSP in an isolated image frame', () => {
  const img = broken();
  const frame = document.querySelector('iframe')!;
  expect(frame.src).toBe('chrome-extension://galley/image-frame.html');
  expect(frame.getAttribute('sandbox')).toBe('allow-scripts');
  expect(frame.title).toBe('Coverage');
  expect(frame.referrerPolicy).toBe('no-referrer');
  expect(img.isConnected).toBe(false);
  const post = vi.spyOn(frame.contentWindow!, 'postMessage').mockImplementation(() => {});
  frame.dispatchEvent(new Event('load'));
  expect(post).toHaveBeenCalledWith({ type: 'galley-image', src: img.src }, '*', [sending]);
  receiving.onmessage!({ data: { width: 128, height: 20 } } as MessageEvent);
  expect(frame.dataset.loaded).toBe('true');
  expect(frame.style.aspectRatio).toBe('128 / 20');
  expect(frame.style.width).toBe('128px');
  expect(receiving.close).toHaveBeenCalled();
  frame.remove();
});

it('keeps a document width and accessible fallback label', () => {
  const img = document.createElement('img');
  img.src = 'https://example.com/image.png';
  img.width = 200;
  document.body.append(img);
  vi.stubGlobal('chrome', { runtime: { getURL: () => 'chrome-extension://galley/image-frame.html' } });
  withImageFallback(img);
  img.dispatchEvent(new Event('error'));
  receiving.onmessage!({ data: { width: 800, height: 400 } } as MessageEvent);
  expect(document.querySelector('iframe')!.style.width).toBe('200px');
  expect(document.querySelector('iframe')!.title).toBe('Document image');
});

it.each([
  null,
  {},
  { error: true },
  { width: '128', height: 20 },
  { width: 128, height: '20' },
  { width: NaN, height: 20 },
  { width: 128, height: Infinity },
  { width: 0, height: 20 },
  { width: 128, height: -1 },
  { width: 10_001, height: 20 },
  { width: 128, height: 10_001 },
])('rejects malformed image sizing and restores alt text: %j', (data) => {
  const img = broken();
  receiving.onmessage!({ data } as MessageEvent);
  expect(document.querySelector('iframe')).toBeNull();
  expect(img.isConnected).toBe(true);
  expect(img.alt).toBe('Coverage');
  expect(receiving.close).toHaveBeenCalled();
});

it('restores the original image if the frame stops answering', () => {
  const img = broken();
  vi.advanceTimersByTime(15_000);
  expect(img.isConnected).toBe(true);
  expect(document.querySelector('iframe')).toBeNull();
  expect(receiving.close).toHaveBeenCalled();
});

it('does not revive an image from a closed reader', () => {
  const img = document.createElement('img');
  img.src = 'https://example.com/image.png';
  vi.stubGlobal('chrome', { runtime: { getURL: () => 'chrome-extension://galley/image-frame.html' } });
  withImageFallback(img);
  img.dispatchEvent(new Event('error'));
  expect(document.querySelector('iframe')).toBeNull();
});

it('bounds fallback frames in a reader with many blocked images', () => {
  for (let i = 0; i < 32; i++) {
    const existing = document.createElement('iframe');
    existing.className = 'mr-image-frame';
    document.body.append(existing);
  }
  const img = broken();
  expect(img.isConnected).toBe(true);
  expect(document.querySelectorAll('iframe')).toHaveLength(32);
});

it.each([undefined, {}, { runtime: {} }])('leaves ordinary image loading alone outside the extension: %j', (chrome) => {
  vi.stubGlobal('chrome', chrome);
  const img = document.createElement('img');
  document.body.append(img);
  withImageFallback(img);
  img.dispatchEvent(new Event('error'));
  expect(img.isConnected).toBe(true);
  expect(document.querySelector('iframe')).toBeNull();
});

it.each(['javascript:alert(1)', 'data:image/svg+xml,<svg/>', `https://example.com/${'x'.repeat(8192)}`])(
  'never forwards unsafe or oversized image addresses: %s',
  (src) => {
    const img = broken(src);
    expect(document.querySelector('iframe')).toBeNull();
    expect(img.isConnected).toBe(true);
  },
);
