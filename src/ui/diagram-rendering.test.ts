import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { deferred } from '../testing/reader.ts';

const engine = vi.hoisted(() => ({ initialize: vi.fn(), render: vi.fn() }));
vi.mock('./mermaid-engine.ts', () => ({ default: engine }));
const fence = (text: string) => `\`\`\`mermaid\n${text}\n\`\`\``;

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('chrome', { runtime: { getURL: () => `${process.cwd()}/src/ui/mermaid-engine.ts` } });
  engine.initialize.mockClear(); engine.render.mockClear();
  engine.render.mockResolvedValue({ svg: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>' });
});
afterEach(() => document.body.replaceChildren());

async function diagram(base = '', head = fence('flowchart LR\n A --> B')) {
  const { renderDocument } = await import('./render.ts');
  const r = renderDocument(document, { path: 'guide.md', status: 'modified', base, head, links: { blob: (p) => p, raw: (p) => p }, origin: location.origin });
  document.body.append(r.content); return r.diagrams[0];
}

it('serialises old and new versions with a locked configuration and displays inert images', async () => {
  const { renderDiagrams } = await import('./diagrams.ts');
  const d = await diagram(fence('flowchart LR\n A --> C'));
  const pending = deferred<{ svg: string }>(); engine.render.mockReturnValueOnce(pending.promise);
  const changed = vi.fn(); renderDiagrams([d], false, changed);
  await vi.waitFor(() => expect(engine.render).toHaveBeenCalledOnce());
  expect(engine.initialize).toHaveBeenCalledWith(expect.objectContaining({ securityLevel: 'strict', htmlLabels: false, maxEdges: 300, theme: 'default', secure: expect.arrayContaining(['fontURL', 'themeCSS']) }));
  const stage = engine.render.mock.calls[0][2] as HTMLElement;
  expect(stage.inert).toBe(true); expect(stage.getAttribute('aria-hidden')).toBe('true');
  pending.resolve({ svg: '<svg xmlns="http://www.w3.org/2000/svg"><script>evil()</script><path d="M0 0"/></svg>' });
  await vi.waitFor(() => expect(d.versions.every((v) => v.view.dataset.state === 'ready')).toBe(true));
  expect(engine.render).toHaveBeenCalledTimes(2); expect(stage.isConnected).toBe(false);
  expect(decodeURIComponent(d.versions[0].view.querySelector('img')!.src)).not.toContain('<script>');
  expect(d.versions[0].view.querySelector('img')!.alt).toContain('Old version');
  d.versions[0].view.querySelector('img')!.dispatchEvent(new Event('load'));
  expect(changed).toHaveBeenCalledTimes(3);
  renderDiagrams([d], false, changed); await Promise.resolve();
  expect(engine.render).toHaveBeenCalledTimes(2);
});

it('discards a stale theme result and rerenders with the latest theme', async () => {
  const { renderDiagrams } = await import('./diagrams.ts'); const d = await diagram();
  const pending = deferred<{ svg: string }>(); engine.render.mockReturnValueOnce(pending.promise);
  renderDiagrams([d], false, vi.fn()); await vi.waitFor(() => expect(engine.render).toHaveBeenCalledOnce());
  renderDiagrams([d], true, vi.fn()); pending.resolve({ svg: '<svg>old-theme</svg>' });
  await vi.waitFor(() => expect(d.versions[0].view.dataset.state).toBe('ready'));
  expect(engine.initialize).toHaveBeenLastCalledWith(expect.objectContaining({ theme: 'dark' }));
  expect(d.versions[0].view.querySelector('img')!.src).not.toContain('old-theme');
});

it('keeps source available when parsing fails and rejects external assets before invoking Mermaid', async () => {
  const { renderDiagrams } = await import('./diagrams.ts'); const d = await diagram();
  engine.render.mockRejectedValueOnce(new Error('Invalid syntax'));
  renderDiagrams([d], false, vi.fn());
  await vi.waitFor(() => expect(d.versions[0].view.dataset.state).toBe('error'));
  expect(d.versions[0].sourceDetails.open).toBe(true);
  expect(d.versions[0].view.textContent).toContain('source is available');
  const unsafe = await diagram('', fence('flowchart LR\n A@{ img: "https://tracker.example/p.gif" }'));
  renderDiagrams([unsafe], false, vi.fn());
  await vi.waitFor(() => expect(unsafe.versions[0].view.dataset.state).toBe('error'));
  expect(unsafe.versions[0].view.textContent).toContain('External images');
  expect(engine.render).toHaveBeenCalledOnce();
});

it('skips detached diagrams, including those closed while rendering is pending', async () => {
  const { renderDiagrams } = await import('./diagrams.ts'); const d = await diagram();
  d.el.remove(); renderDiagrams([d], false, vi.fn()); await Promise.resolve();
  expect(engine.render).not.toHaveBeenCalled();
  document.body.append(d.el);
  const pending = deferred<{ svg: string }>(); engine.render.mockReturnValueOnce(pending.promise);
  const changed = vi.fn(); renderDiagrams([d], true, changed);
  await vi.waitFor(() => expect(engine.render).toHaveBeenCalledOnce());
  const stage = engine.render.mock.calls[0][2] as HTMLElement;
  d.el.remove(); pending.resolve({ svg: '<svg/>' });
  await vi.waitFor(() => expect(changed).toHaveBeenCalledOnce());
  expect(d.versions[0].view.querySelector('img')).toBeNull(); expect(stage.isConnected).toBe(false);
});
