/** Recover consented images blocked by the host page's img-src policy, without an API proxy. */
export function withImageFallback(img: HTMLImageElement): void {
  const runtime = (globalThis as { chrome?: { runtime?: { getURL?: (path: string) => string } } }).chrome?.runtime;
  if (!runtime?.getURL) return;
  const page = runtime.getURL('image-frame.html');
  img.addEventListener(
    'error',
    () => {
      const src = img.src;
      if (!img.isConnected || src.length > 8192 || !/^https?:\/\//i.test(src)) return;
      if ((img.getRootNode() as ParentNode).querySelectorAll('.mr-image-frame').length >= 32) return;
      const frame = img.ownerDocument.createElement('iframe');
      frame.className = 'mr-image-frame';
      frame.title = img.alt || 'Document image';
      frame.setAttribute('sandbox', 'allow-scripts');
      frame.setAttribute('role', 'img');
      frame.setAttribute('aria-label', frame.title);
      frame.tabIndex = -1;
      frame.referrerPolicy = 'no-referrer';
      frame.style.cssText = 'border:0;max-width:100%;width:160px;height:24px;vertical-align:middle;pointer-events:none';
      const channel = new MessageChannel();
      const done = (loaded: boolean) => {
        clearTimeout(timer);
        channel.port1.close();
        if (!loaded) frame.replaceWith(img);
      };
      const timer = setTimeout(() => done(false), 15_000);
      channel.port1.onmessage = ({ data }: MessageEvent<unknown>) => {
        const reply = data as { width?: unknown; height?: unknown } | null;
        const width = reply?.width;
        const height = reply?.height;
        if (
          typeof width !== 'number' ||
          typeof height !== 'number' ||
          !Number.isFinite(width) ||
          !Number.isFinite(height) ||
          width <= 0 ||
          height <= 0 ||
          width > 10_000 ||
          height > 10_000
        ) {
          done(false);
          return;
        }
        frame.style.width = `${img.getAttribute('width') ? Math.min(img.width, 10_000) : width}px`;
        frame.style.height = 'auto';
        frame.style.aspectRatio = `${width} / ${height}`;
        frame.dataset.loaded = 'true';
        done(true);
      };
      frame.addEventListener('load', () => frame.contentWindow!.postMessage({ type: 'galley-image', src }, '*', [channel.port2]), { once: true });
      frame.src = page;
      img.replaceWith(frame);
    },
    { once: true },
  );
}
