/** This opaque frame can display one image, never fetch API data or execute image content. */
export function imageAddress(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 8192) return false;
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function showImage(port: MessagePort, src: string): void {
  const img = document.createElement('img');
  img.alt = '';
  img.referrerPolicy = 'no-referrer';
  img.style.cssText = 'display:block;width:100%;height:auto';
  img.addEventListener(
    'load',
    () => {
      port.postMessage({ width: img.naturalWidth, height: img.naturalHeight });
      port.close();
    },
    { once: true },
  );
  img.addEventListener(
    'error',
    () => {
      port.postMessage({ error: true });
      port.close();
    },
    { once: true },
  );
  img.src = src;
  document.body.append(img);
}

addEventListener('message', (event: MessageEvent) => {
  const data = event.data as { type?: unknown; src?: unknown } | null;
  const [port] = event.ports;
  if (data?.type !== 'galley-image' || !port || document.querySelector('img') || !imageAddress(data.src)) return;
  showImage(port, data.src);
});
