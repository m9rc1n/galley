import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { deferred } from '../testing/reader.ts';
import { connectFrame } from '../testing/sandbox.ts';

const engine = vi.hoisted(() => ({ initialize: vi.fn(), render: vi.fn() }));
vi.mock('mermaid', () => ({ default: engine }));
const fence = (text: string) => `\`\`\`mermaid\n${text}\n\`\`\``;

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('chrome', { runtime: { getURL: (path: string) => `chrome-extension://galley/${path}` } });
  engine.initialize.mockClear(); engine.render.mockClear();
  engine.render.mockResolvedValue({ svg: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>' });
});
afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
});

async function diagram(base = '', head = fence('flowchart LR\n A --> B'), parent: ParentNode = document.body) {
  const { renderDocument } = await import('./render.ts');
  const r = renderDocument(document, { path: 'guide.md', status: 'modified', base, head, links: { blob: (p) => p, raw: (p) => p }, origin: location.origin });
  parent.append(r.content); return r.diagrams[0];
}

async function connect(root: ParentNode = document) {
  const { serveDiagrams } = await import('./diagram-frame.ts');
  return connectFrame('diagram-frame.html', (port) => serveDiagrams(port, engine), root);
}

it('renders old and new versions in a sandboxed frame with a locked configuration and displays inert images', async () => {
  const { renderDiagrams } = await import('./diagrams.ts');
  const d = await diagram(fence('flowchart LR\n A --> C'));
  const pending = deferred<{ svg: string }>(); engine.render.mockReturnValueOnce(pending.promise);
  const changed = vi.fn(); renderDiagrams([d], false, changed);
  const frame = await connect();
  expect(frame.getAttribute('sandbox')).toBe('allow-scripts');
  expect(frame.src).toBe('chrome-extension://galley/diagram-frame.html');
  expect(frame.getAttribute('aria-hidden')).toBe('true'); expect(frame.tabIndex).toBe(-1);
  await vi.waitFor(() => expect(engine.render).toHaveBeenCalledOnce());
  expect(engine.initialize).toHaveBeenCalledWith(expect.objectContaining({ securityLevel: 'strict', htmlLabels: false, maxEdges: 300, theme: 'default', secure: expect.arrayContaining(['fontURL', 'themeCSS']) }));
  expect(engine.render.mock.calls[0]).toEqual([expect.stringMatching(/^galley-diagram-\d+$/), 'flowchart LR\n A --> C\n']);
  pending.resolve({ svg: '<svg xmlns="http://www.w3.org/2000/svg"><script>evil()</script><path d="M0 0"/></svg>' });
  await vi.waitFor(() => expect(d.versions.every((v) => v.view.dataset.state === 'ready')).toBe(true));
  expect(engine.render).toHaveBeenCalledTimes(2); expect(document.querySelectorAll('iframe')).toHaveLength(1);
  expect(decodeURIComponent(d.versions[0].view.querySelector('img')!.src)).not.toContain('<script>');
  expect(d.versions[0].view.querySelector('img')!.alt).toContain('Old version');
  d.versions[0].view.querySelector('img')!.dispatchEvent(new Event('load'));
  expect(changed).toHaveBeenCalledTimes(3);
  renderDiagrams([d], false, changed); await Promise.resolve();
  expect(engine.render).toHaveBeenCalledTimes(2);
});

it('keeps the frame inside the reader when diagrams are in a shadow root', async () => {
  const { renderDiagrams } = await import('./diagrams.ts');
  const host = document.createElement('div'); document.body.append(host);
  const shadow = host.attachShadow({ mode: 'open' });
  const d = await diagram('', fence('flowchart LR\n A --> B'), shadow);
  renderDiagrams([d], false, vi.fn());
  await connect(shadow);
  await vi.waitFor(() => expect(d.versions[0].view.dataset.state).toBe('ready'));
  expect(document.body.querySelector(':scope > iframe')).toBeNull();
});

it('discards a stale theme result and rerenders with the latest theme', async () => {
  const { renderDiagrams } = await import('./diagrams.ts'); const d = await diagram();
  const pending = deferred<{ svg: string }>(); engine.render.mockReturnValueOnce(pending.promise);
  renderDiagrams([d], false, vi.fn()); await connect();
  await vi.waitFor(() => expect(engine.render).toHaveBeenCalledOnce());
  renderDiagrams([d], true, vi.fn()); pending.resolve({ svg: '<svg>old-theme</svg>' });
  await vi.waitFor(() => expect(d.versions[0].view.dataset.state).toBe('ready'));
  expect(engine.initialize).toHaveBeenLastCalledWith(expect.objectContaining({ theme: 'dark' }));
  expect(d.versions[0].view.querySelector('img')!.src).not.toContain('old-theme');
});

it('keeps source available when parsing fails and rejects external assets before invoking Mermaid', async () => {
  const { renderDiagrams } = await import('./diagrams.ts'); const d = await diagram();
  engine.render.mockRejectedValueOnce(new Error('Invalid syntax'));
  renderDiagrams([d], false, vi.fn()); await connect();
  await vi.waitFor(() => expect(d.versions[0].view.dataset.state).toBe('error'));
  expect(d.versions[0].sourceDetails.open).toBe(true);
  expect(d.versions[0].view.textContent).toContain('source is available');
  const unsafe = await diagram('', fence('flowchart LR\n A@{ img: "https://tracker.example/p.gif" }'));
  renderDiagrams([unsafe], false, vi.fn());
  await vi.waitFor(() => expect(unsafe.versions[0].view.dataset.state).toBe('error'));
  expect(unsafe.versions[0].view.textContent).toContain('External images');
  expect(engine.render).toHaveBeenCalledOnce();
});

it('treats replies from the frame as untrusted: oversized or non-string SVG is refused', async () => {
  const { renderDiagrams } = await import('./diagrams.ts');
  const huge = await diagram();
  engine.render.mockResolvedValueOnce({ svg: `<svg>${'x'.repeat(2_000_000)}</svg>` });
  renderDiagrams([huge], false, vi.fn()); await connect();
  await vi.waitFor(() => expect(huge.versions[0].view.dataset.state).toBe('error'));
  const odd = await diagram('', fence('flowchart LR\n X --> Y'));
  engine.render.mockResolvedValueOnce({ svg: 42 });
  renderDiagrams([odd], false, vi.fn());
  await vi.waitFor(() => expect(odd.versions[0].view.dataset.state).toBe('error'));
  expect(odd.versions[0].view.querySelector('img')).toBeNull();
});

it('discards a frame that stops answering, then renders the next diagram in a fresh one', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
  const { renderDiagrams } = await import('./diagrams.ts');
  const stuck = await diagram();
  engine.render.mockReturnValueOnce(new Promise(() => {}));
  renderDiagrams([stuck], false, vi.fn());
  const first = await connect();
  await vi.waitFor(() => expect(engine.render).toHaveBeenCalledOnce());
  vi.advanceTimersByTime(20_500);
  await vi.waitFor(() => expect(stuck.versions[0].view.dataset.state).toBe('error'));
  expect(stuck.versions[0].view.textContent).toBe('Could not render this Mermaid diagram. The source is available below.');
  expect(first.isConnected).toBe(false);
  const next = await diagram('', fence('flowchart LR\n C --> D'));
  renderDiagrams([next], false, vi.fn());
  vi.resetModules(); // a fresh frame is a fresh document: its script starts with an empty queue
  const second = await connect();
  expect(second).not.toBe(first);
  await vi.waitFor(() => expect(next.versions[0].view.dataset.state).toBe('ready'));
});

it('stops waiting as soon as the reader, and with it the frame, is closed', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  const { renderDiagrams } = await import('./diagrams.ts'); const d = await diagram();
  engine.render.mockReturnValueOnce(new Promise(() => {}));
  const changed = vi.fn(); renderDiagrams([d], false, changed);
  const frame = await connect();
  await vi.waitFor(() => expect(engine.render).toHaveBeenCalledOnce());
  frame.remove(); vi.advanceTimersByTime(250);
  await vi.waitFor(() => expect(changed).toHaveBeenCalledOnce());
  expect(d.versions[0].view.dataset.state).toBe('error');
});

it('skips detached diagrams, including those closed while rendering is pending', async () => {
  const { renderDiagrams } = await import('./diagrams.ts'); const d = await diagram();
  d.el.remove(); renderDiagrams([d], false, vi.fn()); await Promise.resolve();
  expect(document.querySelector('iframe')).toBeNull();
  document.body.append(d.el);
  const pending = deferred<{ svg: string }>(); engine.render.mockReturnValueOnce(pending.promise);
  const changed = vi.fn(); renderDiagrams([d], true, changed);
  await connect();
  await vi.waitFor(() => expect(engine.render).toHaveBeenCalledOnce());
  d.el.remove(); pending.resolve({ svg: '<svg/>' });
  await vi.waitFor(() => expect(changed).toHaveBeenCalledOnce());
  expect(d.versions[0].view.querySelector('img')).toBeNull();
});

it('draws in the reader’s palette, redraws when the palette changes, and shows the drawing at its own size', async () => {
  const { renderDiagrams } = await import('./diagrams.ts'); const d = await diagram();
  const palette = { bg: '#fffefa', fg: '#202d25', muted: '#505c52', soft: '#f1f4e9', rule: '#d9dfd2', code: '#f6f7ef', accent: '#506b38' };
  engine.render.mockResolvedValue({ svg: '<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 420.5 96"><path d="M0 0"/></svg>' });
  renderDiagrams([d], false, vi.fn(), palette); await connect();
  await vi.waitFor(() => expect(d.versions[0].view.dataset.state).toBe('ready'));
  expect(engine.initialize).toHaveBeenLastCalledWith(expect.objectContaining({ theme: 'base', themeVariables: expect.objectContaining({ primaryColor: palette.bg }) }));
  const zoom = d.versions[0].view.querySelector<HTMLButtonElement>('.mr-diagram-zoom')!;
  expect(zoom.dataset.act).toBe('zoom-diagram');
  expect(zoom.getAttribute('aria-label')).toBe('Enlarge the new version of the diagram');
  expect([zoom.querySelector('img')!.width, zoom.querySelector('img')!.height]).toEqual([421, 96]);
  renderDiagrams([d], false, vi.fn(), palette); await Promise.resolve();
  expect(engine.render).toHaveBeenCalledOnce();
  renderDiagrams([d], false, vi.fn(), { ...palette, accent: '#466b96' });
  await vi.waitFor(() => expect(engine.render).toHaveBeenCalledTimes(2));
});
