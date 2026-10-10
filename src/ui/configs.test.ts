import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { connectFrame } from '../testing/sandbox.ts';
import { serveConfigs } from './config-frame.ts';
import { isReading, readConfiguration } from './configs.ts';
import { serve } from './sandbox-frame.ts';

beforeEach(() => vi.stubGlobal('chrome', { runtime: { getURL: (path: string) => `chrome-extension://galley/${path}` } }));
afterEach(() => document.body.replaceChildren());

const item = { key: 'service:web', name: 'web', kind: 'service', line: 2, detail: '' };
const link = { from: 'service:web', to: 'service:db', label: 'depends on', line: 3 };

it('a frame reply must be structure that fits the file: names, known kinds and labels, lines within it', () => {
  expect(isReading({ items: [item], links: [link], notes: ['Note.'] }, 3)).toBe(true);
  for (const bad of [
    null,
    {},
    { items: [], links: [] },
    { items: [], links: [], notes: [1] },
    { items: [], links: [], notes: Array(11).fill('n') },
    { items: [], links: [], notes: ['x'.repeat(201)] },
    { items: [null], links: [], notes: [] },
    { items: [{ ...item, kind: 'script' }], links: [], notes: [] },
    { items: [{ ...item, line: 4 }], links: [], notes: [] },
    { items: [{ ...item, line: 0 }], links: [], notes: [] },
    { items: [{ ...item, line: 1.5 }], links: [], notes: [] },
    { items: [{ ...item, name: 'x'.repeat(301) }], links: [], notes: [] },
    { items: [{ ...item, key: 7 }], links: [], notes: [] },
    { items: [{ ...item, detail: undefined }], links: [], notes: [] },
    { items: [], links: [null], notes: [] },
    { items: [], links: [{ ...link, label: 'owns' }], notes: [] },
    { items: [], links: [{ ...link, to: 'x'.repeat(601) }], notes: [] },
    { items: [], links: [{ ...link, line: 9 }], notes: [] },
    { items: Array(401).fill(item), links: [], notes: [] },
  ])
    expect(isReading(bad, 3), JSON.stringify(bad)?.slice(0, 80)).toBe(false);
});

it('configuration is read in its own sandboxed frame inside the reader, and a refused or failed reply reads as nothing', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const shadow = host.attachShadow({ mode: 'open' });
  const reading = readConfiguration(shadow, 'docker-compose.yml', 'compose', 'services:\n  web:\n    image: x');
  const frame = await connectFrame('config-frame.html', serveConfigs, shadow);
  expect(frame.getAttribute('sandbox')).toBe('allow-scripts');
  expect(await reading).toStrictEqual({ items: [{ key: 'service:web', name: 'web', kind: 'service', line: 2, detail: 'image x' }], links: [], notes: [] });
  frame.remove();
  // A frame that answers with something else, or fails, gives no reading at all.
  const forged = readConfiguration(shadow, 'docker-compose.yml', 'compose', 'services: {}');
  await connectFrame(
    'config-frame.html',
    (port) =>
      serve(
        port,
        (data): data is { id: number } => true,
        async () => ({ reading: { items: [{ ...item, line: 99 }], links: [], notes: [] } }),
      ),
    shadow,
  );
  expect(await forged).toBe(null);
  shadow.querySelector('iframe')!.remove();
  const failing = readConfiguration(shadow, 'docker-compose.yml', 'compose', 'services: {}');
  await connectFrame(
    'config-frame.html',
    (port) =>
      serve(
        port,
        (data): data is { id: number } => true,
        async () => {
          throw new Error('boom');
        },
      ),
    shadow,
  );
  expect(await failing).toBe(null);
});
