// Third-party engines that read pull request content (Mermaid, highlight.js) run in sandboxed
// extension frames, never in the review page. A frame has an opaque origin with no extension APIs,
// storage, cookies or network access (see sandbox-frame.ts), and browsers run it outside the page's
// main thread. A watchdog discards a frame that stops answering, so hostile input can neither reach
// the page nor freeze it. Replies are untrusted: callers validate and sanitise them.

interface Frame {
  el: HTMLIFrameElement;
  port: Promise<MessagePort>;
  replies: Map<number, (reply: Record<string, unknown>) => void>;
}

export interface Sandbox {
  /** Resolves with the frame's reply, or rejects if it reports an error, stops answering or is removed. */
  request(host: ParentNode, message: Record<string, unknown>): Promise<Record<string, unknown>>;
}

/** Frames live inside the reader, so closing the reader removes them. */
export function hostFor(el: Element): ParentNode {
  const root = el.getRootNode();
  return root instanceof ShadowRoot ? root : el.ownerDocument.body;
}

function pageUrl(page: string): string {
  const runtime = (globalThis as { chrome?: { runtime?: { getURL?: (path: string) => string } } }).chrome?.runtime;
  return runtime?.getURL?.(page) ?? new URL(`build/${page}`, location.href).href;
}

function openFrame(host: ParentNode, page: string): Frame {
  const doc = (host as Node).ownerDocument ?? (host as Document);
  const el = doc.createElement('iframe');
  el.setAttribute('sandbox', 'allow-scripts');
  el.setAttribute('aria-hidden', 'true');
  el.tabIndex = -1;
  el.title = 'Galley renderer';
  el.style.cssText = 'position:fixed;left:-100000px;top:0;width:1200px;height:800px;border:0;visibility:hidden;pointer-events:none';
  const replies = new Map<number, (reply: Record<string, unknown>) => void>();
  const port = new Promise<MessagePort>((resolve) => {
    el.addEventListener(
      'load',
      () => {
        const channel = new MessageChannel();
        channel.port1.onmessage = ({ data }: MessageEvent<unknown>) => {
          const id = (data as { id?: unknown } | null)?.id;
          if (typeof id === 'number') replies.get(id)?.(data as Record<string, unknown>);
        };
        // An opaque origin cannot be named as a target; the port, not the origin, carries the replies.
        el.contentWindow?.postMessage('galley-sandbox', '*', [channel.port2]);
        resolve(channel.port1);
      },
      { once: true },
    );
  });
  el.src = pageUrl(page);
  host.append(el);
  return { el, port, replies };
}

/** One request in flight at a time, so the watchdog times a single job and never a queue. */
export function sandbox(page: string, timeoutMs: number): Sandbox {
  let frame: Frame | null = null;
  let requests = 0;
  let queue: Promise<unknown> = Promise.resolve();

  const send = (host: ParentNode, message: Record<string, unknown>) => {
    if (!frame?.el.isConnected) {
      frame?.el.remove();
      frame = openFrame(host, page);
    }
    const current = frame;
    const id = ++requests;
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const deadline = Date.now() + timeoutMs;
      const done = () => {
        clearInterval(watchdog);
        current.replies.delete(id);
      };
      // A frame stuck on hostile input, or closed with the reader, is discarded; the next request gets a fresh one.
      const watchdog = setInterval(() => {
        if (current.el.isConnected && Date.now() < deadline) return;
        done();
        if (frame === current) {
          current.el.remove();
          frame = null;
        }
        reject(new Error('The renderer stopped.'));
      }, 250);
      current.replies.set(id, (reply) => {
        done();
        if (reply.error) reject(new Error('The renderer could not process this.'));
        else resolve(reply);
      });
      void current.port.then((port) => port.postMessage({ ...message, id }));
    });
  };

  return {
    request(host, message) {
      const result = queue.then(() => send(host, message));
      queue = result.catch(() => {});
      return result;
    },
  };
}
