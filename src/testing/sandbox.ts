import { afterEach, vi } from 'vitest';

const ports: MessagePort[] = [];
afterEach(() => {
  for (const port of ports.splice(0)) port.close();
});

/**
 * Plays the browser's part for src/ui/sandbox.ts: waits for the frame showing `page`, then hands the
 * reader's port to `serve` (the real frame script, with its engine mocked or not).
 */
export async function connectFrame(page: string, serve: (port: MessagePort) => void, root: ParentNode = document): Promise<HTMLIFrameElement> {
  const frame = await vi.waitFor(() => {
    const el = [...root.querySelectorAll('iframe')].find((candidate) => candidate.src.endsWith(page) && !candidate.dataset.connected);
    if (!el) throw new Error(`no ${page} frame yet`);
    return el;
  });
  frame.dataset.connected = 'true';
  vi.spyOn(frame.contentWindow!, 'postMessage').mockImplementation((_message: unknown, _origin: unknown, transfer?: unknown) => {
    const [port] = transfer as MessagePort[];
    ports.push(port);
    serve(port);
  });
  frame.dispatchEvent(new Event('load'));
  return frame;
}
