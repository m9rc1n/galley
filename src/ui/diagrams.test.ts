// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { renderMarkdown } from '../testing/render.ts';
import { diagramCode, diagramImage, diagramSize } from './diagrams.ts';
import { filterDocument, paragraphTarget, selectionTarget } from './reading.ts';

const fence = (code: string) => `\`\`\`mermaid\n${code}\n\`\`\``;
const render = renderMarkdown;

it('Mermaid fences retain whole old/new diagrams and trusted source coordinates', () => {
  const before = fence('flowchart LR\n A --> B'),
    after = fence('flowchart LR\n A --> C');
  const r = render(before, after);
  expect(r.diagrams).toHaveLength(1);
  expect(r.diagrams[0].versions).toHaveLength(2);
  expect(r.diagrams[0].versions[0].source).toBe('flowchart LR\n A --> B\n');
  expect(r.diagrams[0].versions[1].source).toBe('flowchart LR\n A --> C\n');
  expect(r.blocks[0].el).toBe(r.diagrams[0].el);
  expect(r.changes[0]).toBe(r.diagrams[0].el);
  expect(r.content.querySelector('ins, del')).toBe(null);
  const target = paragraphTarget({ path: 'a.md', oldPath: 'a.md', status: 'modified' }, r.blocks[0], 'base')!;
  expect(target.startLine).toBe(1);
  expect(target.endLine).toBe(4);
  expect(target.quote).toMatch(/A --> B/);
  expect(target.quote).not.toMatch(/A --> C/);
  const range = document.createRange();
  range.selectNodeContents(r.diagrams[0].el);
  expect(selectionTarget({ path: 'a.md', oldPath: 'a.md', status: 'modified' }, r.blocks, range)).toBe(null);
});

it('raw HTML cannot request diagram rendering or forge version-side attributes', () => {
  const r = render('', '<pre data-lang="mermaid" data-mr-side="base" class="mr-diagram"><code>flowchart LR\n A --> B</code></pre>', 'added');
  expect(r.diagrams).toHaveLength(0);
  expect(r.content.querySelector('[data-mr-side], .mr-diagram')).toBe(null);
});

it('unchanged, added, removed and fenced-language transitions remain reviewable', () => {
  const code = fence('sequenceDiagram\n Alice->>Bob: Hello');
  const unchanged = render(code, code);
  expect(unchanged.diagrams[0].versions).toHaveLength(1);
  filterDocument(unchanged, true);
  expect(unchanged.diagrams[0].el.hidden).toBe(true);
  filterDocument(unchanged, false);
  expect(unchanged.diagrams[0].el.hidden).toBe(false);
  expect(render('', code, 'added').diagrams[0].versions[0].side).toBe('head');
  expect(render(code, '', 'removed').diagrams[0].versions[0].side).toBe('base');
  const changed = render(code, code.replace('mermaid', 'text'));
  expect(changed.diagrams).toHaveLength(1);
  expect(changed.diagrams[0].versions).toHaveLength(1);
  expect(changed.diagrams[0].el.querySelectorAll('.mr-diagram-version').length).toBe(2);
});

it('diagram rendering locks configuration and rejects external assets or excessive source', () => {
  expect(diagramCode('---\nconfig:\n  securityLevel: loose\n---\nflowchart LR\n A --> B')).toBe('flowchart LR\n A --> B');
  expect(diagramCode('%%{init: {"securityLevel":"loose","themeCSS":"@import evil"}}%%\nflowchart LR\n A --> B')).not.toMatch(/loose|evil/);
  expect(() => diagramCode('flowchart LR\n A@{ img: "https://evil.example/image" }')).toThrow(/not supported/);
  expect(() => diagramCode('flowchart LR\n A@{ "img": "https://evil.example/image" }')).toThrow(/not supported/);
  expect(() => diagramCode('flowchart LR\n classDef a fill:url(https://evil.example/image)')).toThrow(/not supported/);
  expect(() => diagramCode('A'.repeat(20_001))).toThrow(/too large/);
  expect(diagramCode('flowchart LR\n A --> B\n classDef a fill:#fff,stroke:#111')).toMatch(/classDef/);
  expect(diagramCode('flowchart LR\n A@{ shape: rect } --> B')).toContain('shape: rect');
});

it('SVG output becomes an inert image with scripts, HTML and external resource references removed', () => {
  const image = diagramImage(
    document,
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><foreignObject><div>unsafe</div></foreignObject><image href="https://evil.example/x"/><path onclick="alert(1)" fill="url(https://evil.example/x)" d="M0 0"/><style>.x{fill:url(#arrow)}</style></svg>',
  );
  const svg = decodeURIComponent(image.split(',')[1]);
  expect(image).toMatch(/^data:image\/svg\+xml/);
  expect(svg).not.toMatch(/script|foreignObject|<image|onclick|https:\/\/evil/);
  expect(svg).toMatch(/url\(#arrow\)/);
  const refs = decodeURIComponent(
    diagramImage(
      document,
      '<svg xmlns="http://www.w3.org/2000/svg"><linearGradient id="local"/><use href="#local"/><use href="https://external.example/s.svg#x"/><path fill="url(#local)"/></svg>',
    ).split(',')[1],
  );
  expect(refs).not.toContain('external.example');
  expect(refs).toContain('url(#local)');
});

it('diagrams are shown at the size they were laid out for, read from the drawing itself', () => {
  expect(diagramSize('<svg id="d1" width="100%" viewBox="4 4 408.2 858.75" role="graphics-document">')).toEqual({ width: 409, height: 859 });
  expect(diagramSize('<svg viewBox="-50 -10 747 543">')).toEqual({ width: 747, height: 543 });
  for (const svg of ['<svg width="100%">', '<svg viewBox="0 0 0 10">', '<svg viewBox="0 0 90000 10">', '<g viewBox="0 0 10 10"><svg>', 'not svg'])
    expect(diagramSize(svg)).toBeNull();
});

it('keeps links inside a drawing only when they point at a part of the drawing itself', () => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><linearGradient id="a" href="#b"/><linearGradient id="b"/><linearGradient id="c" href="https://evil.example/x"/><linearGradient id="d" xlink:href="//evil.example/y"/></svg>';
  const image = decodeURIComponent(diagramImage(document, svg).split(',')[1]);
  expect(image).toContain('href="#b"');
  expect(image).not.toContain('evil.example');
});
