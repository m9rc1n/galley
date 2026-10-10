import { afterEach, expect, it, vi } from 'vitest';
import { imageAddress, showImage } from './image-frame.ts';

afterEach(() => document.body.replaceChildren());

it.each([
  null,
  42,
  '',
  'not a URL',
  'javascript:alert(1)',
  'data:image/svg+xml,<svg/>',
  'blob:https://example.com/1',
  'file:///tmp/a',
  'https://user@example.com/a',
  'https://:pass@example.com/a',
  `https://example.com/${'x'.repeat(8192)}`,
])('refuses active, credential-bearing and oversized addresses: %s', (value) => {
  expect(imageAddress(value)).toBe(false);
});

it.each(['https://img.shields.io/badge/coverage-100-green', 'http://example.com/image.png'])('allows only ordinary image addresses: %s', (value) => {
  expect(imageAddress(value)).toBe(true);
});

function port() {
  return { postMessage: vi.fn(), close: vi.fn() };
}

it('loads only as an image, suppresses referrers and reports intrinsic dimensions', () => {
  const channel = port();
  showImage(channel as unknown as MessagePort, 'https://img.shields.io/badge/coverage-100-green');
  const img = document.querySelector('img')!;
  expect(img.referrerPolicy).toBe('no-referrer');
  Object.defineProperties(img, { naturalWidth: { value: 128 }, naturalHeight: { value: 20 } });
  img.dispatchEvent(new Event('load'));
  expect(channel.postMessage).toHaveBeenCalledWith({ width: 128, height: 20 });
  expect(channel.close).toHaveBeenCalled();
});

it('reports a failed image without exposing response content', () => {
  const channel = port();
  showImage(channel as unknown as MessagePort, 'https://example.com/missing.svg');
  document.querySelector('img')!.dispatchEvent(new Event('error'));
  expect(channel.postMessage).toHaveBeenCalledWith({ error: true });
  expect(channel.close).toHaveBeenCalled();
});

it('accepts a single parent request over its transferred port', () => {
  const channel = port() as unknown as MessagePort;
  const send = (data: unknown, source: Window | null = window, ports: MessagePort[] = [channel]) => {
    dispatchEvent(new MessageEvent('message', { data, source, ports }));
  };
  send(null, null);
  send(null);
  send({ type: 'other' });
  send({ type: 'galley-image' }, window, []);
  send({ type: 'galley-image', src: 'javascript:alert(1)' });
  expect(document.querySelector('img')).toBeNull();
  send({ type: 'galley-image', src: 'https://example.com/badge.svg' });
  expect(document.querySelector('img')!.src).toBe('https://example.com/badge.svg');
  send({ type: 'galley-image', src: 'https://example.com/another.svg' });
  expect(document.querySelectorAll('img')).toHaveLength(1);
});
