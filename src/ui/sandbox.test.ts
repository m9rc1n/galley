import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { deferred } from '../testing/reader.ts';
import { connectFrame } from '../testing/sandbox.ts';
import { serve } from './sandbox-frame.ts';
import { hostFor, sandbox } from './sandbox.ts';

const echo = (port: MessagePort, handle: (data: { id: number; n?: number }) => Promise<object> = async (data) => ({ n: data.n })) =>
  serve(port, (data): data is { id: number; n?: number } => typeof (data as { id?: unknown })?.id === 'number', handle);

beforeEach(() => vi.stubGlobal('chrome', { runtime: { getURL: (path: string) => `chrome-extension://galley/${path}` } }));
afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
});

it('opens one hidden, script-only sandboxed frame inside the reader and reuses it', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const shadow = host.attachShadow({ mode: 'open' });
  const inner = document.createElement('p');
  shadow.append(inner);
  expect(hostFor(inner)).toBe(shadow);
  const box = sandbox('test-frame.html', 1_000);
  const first = box.request(hostFor(inner), { n: 1 });
  const frame = await connectFrame('test-frame.html', (port) => echo(port), shadow);
  expect(frame.getAttribute('sandbox')).toBe('allow-scripts');
  expect(frame.src).toBe('chrome-extension://galley/test-frame.html');
  expect(frame.getAttribute('aria-hidden')).toBe('true');
  expect(frame.tabIndex).toBe(-1);
  expect(frame.style.visibility).toBe('hidden');
  expect(await first).toEqual({ n: 1, id: expect.any(Number) });
  expect(await box.request(shadow, { n: 2 })).toMatchObject({ n: 2 });
  expect(shadow.querySelectorAll('iframe')).toHaveLength(1);
  expect(document.body.querySelector(':scope > iframe')).toBeNull();
});

it('uses the demo build next to the page when there is no extension runtime', async () => {
  vi.stubGlobal('chrome', undefined);
  const box = sandbox('test-frame.html', 1_000);
  const reply = box.request(document.body, { n: 3 });
  const frame = await connectFrame('test-frame.html', (port) => echo(port));
  expect(frame.src).toBe(new URL('build/test-frame.html', location.href).href);
  await expect(reply).resolves.toMatchObject({ n: 3 });
});

it('sends one request at a time, rejects reported errors and ignores replies for other requests', async () => {
  const box = sandbox('test-frame.html', 5_000);
  const seen: number[] = [];
  const gate = deferred<void>();
  const a = box.request(document.body, { n: 1 }),
    b = box.request(document.body, { n: 2 }),
    c = box.request(document.body, { n: 3 });
  await connectFrame('test-frame.html', (port) => {
    const original = port.postMessage.bind(port);
    // A stray reply with an unknown id, before the real one, changes nothing.
    port.postMessage = (message: unknown) => {
      original({ id: 999, n: -1 });
      original(message);
    };
    echo(port, async ({ n }) => {
      seen.push(n!);
      if (n === 1) await gate.promise;
      if (n === 2) throw new Error('secret detail');
      return { n };
    });
  });
  await vi.waitFor(() => expect(seen).toEqual([1]));
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(seen).toEqual([1]);
  gate.resolve();
  await expect(a).resolves.toMatchObject({ n: 1 });
  await expect(b).rejects.toThrow('could not process');
  await expect(c).resolves.toMatchObject({ n: 3 });
});

it('discards a frame that stops answering or is removed, and opens a fresh one for the next request', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
  const box = sandbox('test-frame.html', 2_000);
  const stuck = box.request(document.body, { n: 1 });
  const first = await connectFrame('test-frame.html', () => {
    /* never answers */
  });
  vi.advanceTimersByTime(1_750);
  await Promise.resolve();
  expect(first.isConnected).toBe(true);
  vi.advanceTimersByTime(500);
  await expect(stuck).rejects.toThrow('stopped');
  expect(first.isConnected).toBe(false);
  const closed = box.request(document.body, { n: 2 });
  const second = await connectFrame('test-frame.html', () => {
    /* never answers */
  });
  expect(second).not.toBe(first);
  second.remove();
  vi.advanceTimersByTime(250);
  await expect(closed).rejects.toThrow('stopped');
  const next = box.request(document.body, { n: 3 });
  await connectFrame('test-frame.html', (port) => echo(port));
  await expect(next).resolves.toMatchObject({ n: 3 });
});
