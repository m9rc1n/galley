// Frame side of sandbox.ts. These scripts run in sandboxed extension pages (diagram-frame.html,
// highlight-frame.html): an opaque origin with no extension APIs, no storage or cookies, and a CSP
// without network access. Requests arrive over the port the reader transfers when the frame loads.

let queue: Promise<void> = Promise.resolve();

/** Answers requests one at a time across all ports; errors are reported without details. */
export function serve<T extends { id: number }>(port: MessagePort, accept: (data: unknown) => data is T, handle: (request: T) => Promise<object>): void {
  port.onmessage = ({ data }: MessageEvent<unknown>) => {
    if (!accept(data)) return;
    queue = queue.then(async () => {
      let reply: object;
      try {
        reply = { ...(await handle(data)), id: data.id };
      } catch {
        reply = { id: data.id, error: true };
      }
      port.postMessage(reply);
    });
  };
}

export function listen(onPort: (port: MessagePort) => void): void {
  addEventListener('message', (event: MessageEvent) => {
    const [port] = event.ports;
    if (port) onPort(port);
  });
}
