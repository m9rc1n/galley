import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { deferred } from '../testing/reader.ts';

const engine = vi.hoisted(() => ({ initialize: vi.fn(), render: vi.fn() }));
vi.mock('mermaid', () => ({ default: engine }));
const channels: MessageChannel[] = [];

beforeEach(() => {
  vi.resetModules();
  engine.initialize.mockClear(); engine.render.mockReset();
});
afterEach(() => {
  for (const channel of channels.splice(0)) channel.port1.close();
});

/** A reader-side port connected to a frame-side port the frame script serves. */
function connect(serve: (port: MessagePort) => void) {
  const channel = new MessageChannel(); channels.push(channel);
  serve(channel.port2);
  const replies: unknown[] = [];
  channel.port1.onmessage = ({ data }) => replies.push(data);
  return { send: (data: unknown) => channel.port1.postMessage(data), replies };
}

it('accepts only well-formed requests within the source limit', async () => {
  const { isRequest } = await import('./diagram-frame.ts');
  expect(isRequest({ id: 1, code: 'flowchart LR', dark: false })).toBe(true);
  for (const bad of [null, 'galley-sandbox', { id: '1', code: '', dark: false }, { id: 1, code: 2, dark: false }, { id: 1, code: '', dark: 'no' }, { id: 1, code: 'x'.repeat(20_001), dark: true }]) {
    expect(isRequest(bad)).toBe(false);
  }
});

it('renders one request at a time across ports and answers errors without details', async () => {
  const { serveDiagrams } = await import('./diagram-frame.ts');
  const slow = deferred<{ svg: string }>();
  engine.render.mockReturnValueOnce(slow.promise).mockRejectedValueOnce(new Error('Parse error near <secret>'));
  const a = connect((port) => serveDiagrams(port, engine)), b = connect((port) => serveDiagrams(port, engine));
  a.send({ id: 1, code: 'flowchart LR\n A --> B', dark: false });
  b.send({ id: 2, code: 'not a diagram', dark: true });
  b.send({ nonsense: true });
  await vi.waitFor(() => expect(engine.render).toHaveBeenCalledOnce());
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(engine.render).toHaveBeenCalledOnce();
  slow.resolve({ svg: '<svg/>' });
  await vi.waitFor(() => expect(b.replies).toEqual([{ id: 2, error: true }]));
  expect(a.replies).toEqual([{ id: 1, svg: '<svg/>' }]);
  expect(engine.initialize).toHaveBeenLastCalledWith(expect.objectContaining({ theme: 'dark', securityLevel: 'strict' }));
});

it('serves any port the reader transfers when the frame loads', async () => {
  engine.render.mockResolvedValue({ svg: '<svg/>' });
  await import('./diagram-frame.ts');
  const channel = new MessageChannel(); channels.push(channel);
  const event = new MessageEvent('message', { data: 'galley-sandbox' });
  Object.defineProperty(event, 'ports', { value: [channel.port2] });
  window.dispatchEvent(event);
  window.dispatchEvent(new MessageEvent('message', { data: 'no port' }));
  const replies: unknown[] = [];
  channel.port1.onmessage = ({ data }) => replies.push(data);
  channel.port1.postMessage({ id: 7, code: 'flowchart LR', dark: false });
  await vi.waitFor(() => expect(replies).toEqual([{ id: 7, svg: '<svg/>' }]));
});
