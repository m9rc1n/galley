import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { renderDocument } from '../src/ui/render.ts';
import { renderCodeFile } from '../src/ui/code-files.ts';
import { diagramCode, diagramImage } from '../src/ui/diagrams.ts';
import { filterDocument, paragraphTarget, selectionTarget } from '../src/ui/reading.ts';
import { isCodePath } from '../src/core/paths.ts';

const { document } = new JSDOM('<!doctype html><html><body></body></html>').window;
const ref = { path: 'src/main.ts', oldPath: 'src/old.ts', status: 'modified' as const, kind: 'code' as const };
const fence = (code: string) => '```mermaid\n' + code + '\n```';
const render = (base: string, head: string, status: 'modified' | 'added' | 'removed' = 'modified') => renderDocument(document, { path: 'a.md', status, base, head, links: { raw: (p) => p, blob: (p) => p } });

test('Mermaid fences retain whole old/new diagrams and trusted source coordinates', () => {
  const before = fence('flowchart LR\n A --> B'), after = fence('flowchart LR\n A --> C');
  const r = render(before, after);
  assert.equal(r.diagrams.length, 1);
  assert.equal(r.diagrams[0].versions.length, 2);
  assert.equal(r.diagrams[0].versions[0].source, 'flowchart LR\n A --> B\n');
  assert.equal(r.diagrams[0].versions[1].source, 'flowchart LR\n A --> C\n');
  assert.equal(r.blocks[0].el, r.diagrams[0].el);
  assert.equal(r.changes[0], r.diagrams[0].el);
  assert.equal(r.content.querySelector('ins, del'), null);
  const target = paragraphTarget({ path: 'a.md', oldPath: 'a.md', status: 'modified' }, r.blocks[0], 'base')!;
  assert.equal(target.startLine, 1); assert.equal(target.endLine, 4); assert.match(target.quote, /A --> B/); assert.doesNotMatch(target.quote, /A --> C/);
  const range = document.createRange(); range.selectNodeContents(r.diagrams[0].el);
  assert.equal(selectionTarget({ path: 'a.md', oldPath: 'a.md', status: 'modified' }, r.blocks, range), null);
});

test('raw HTML cannot request diagram rendering or forge version-side attributes', () => {
  const r = render('', '<pre data-lang="mermaid" data-mr-side="base" class="mr-diagram"><code>flowchart LR\n A --> B</code></pre>', 'added');
  assert.equal(r.diagrams.length, 0);
  assert.equal(r.content.querySelector('[data-mr-side], .mr-diagram'), null);
});

test('unchanged, added, removed and fenced-language transitions remain reviewable', () => {
  const code = fence('sequenceDiagram\n Alice->>Bob: Hello');
  const unchanged = render(code, code);
  assert.equal(unchanged.diagrams[0].versions.length, 1);
  filterDocument(unchanged, true); assert.equal(unchanged.diagrams[0].el.hidden, true);
  filterDocument(unchanged, false); assert.equal(unchanged.diagrams[0].el.hidden, false);
  assert.equal(render('', code, 'added').diagrams[0].versions[0].side, 'head');
  assert.equal(render(code, '', 'removed').diagrams[0].versions[0].side, 'base');
  const changed = render(code, code.replace('mermaid', 'text'));
  assert.equal(changed.diagrams.length, 1);
  assert.equal(changed.diagrams[0].versions.length, 1);
  assert.equal(changed.diagrams[0].el.querySelectorAll('.mr-diagram-version').length, 2);
});

test('diagram rendering locks configuration and rejects external assets or excessive source', () => {
  assert.equal(diagramCode('---\nconfig:\n  securityLevel: loose\n---\nflowchart LR\n A --> B'), 'flowchart LR\n A --> B');
  assert.doesNotMatch(diagramCode('%%{init: {"securityLevel":"loose","themeCSS":"@import evil"}}%%\nflowchart LR\n A --> B'), /loose|evil/);
  assert.throws(() => diagramCode('flowchart LR\n A@{ img: "https://evil.example/image" }'), /not supported/);
  assert.throws(() => diagramCode('flowchart LR\n A@{ "img": "https://evil.example/image" }'), /not supported/);
  assert.throws(() => diagramCode('flowchart LR\n classDef a fill:url(https://evil.example/image)'), /not supported/);
  assert.throws(() => diagramCode('A'.repeat(20_001)), /too large/);
  assert.match(diagramCode('flowchart LR\n A --> B\n classDef a fill:#fff,stroke:#111'), /classDef/);
});

test('SVG output becomes an inert image with scripts, HTML and external resource references removed', () => {
  const image = diagramImage(document, '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><foreignObject><div>unsafe</div></foreignObject><image href="https://evil.example/x"/><path onclick="alert(1)" fill="url(https://evil.example/x)" d="M0 0"/><style>.x{fill:url(#arrow)}</style></svg>');
  const svg = decodeURIComponent(image.split(',')[1]);
  assert.match(image, /^data:image\/svg\+xml/);
  assert.doesNotMatch(svg, /script|foreignObject|<image|onclick|https:\/\/evil/);
  assert.match(svg, /url\(#arrow\)/);
});

test('source files preserve text, diff sides and exact line numbers without parsing Markdown/HTML', () => {
  const r = renderCodeFile(document, ref, { base: 'const value = 1;\n  return value;\n', head: 'const value = 2;\n  return value;\n<script>alert(1)</script>\n' });
  assert.equal(r.isCode, true); assert.equal(r.diagrams.length, 0);
  assert.equal(r.content.querySelector('script'), null);
  assert.match(r.content.textContent!, /<script>alert\(1\)<\/script>/);
  const removed = r.blocks.find((block) => block.kind === 'removed')!;
  const added = r.blocks.find((block) => block.kind === 'added')!;
  assert.equal(paragraphTarget(ref, removed)!.side, 'base');
  assert.equal(paragraphTarget(ref, added)!.side, 'head');
  assert.equal(paragraphTarget(ref, added)!.startLine, 1);
  const same = r.blocks.find((block) => block.kind === 'same')!;
  assert.equal(paragraphTarget(ref, same)!.quote, '  return value;');
  assert.equal(paragraphTarget(ref, same)!.startLine, 2);
  filterDocument(r, true); assert.equal(same.el.hidden, true);
  assert.match(r.content.querySelector('.mr-context-toggle')!.textContent!, /unchanged line/);
  filterDocument(r, false); assert.equal(same.el.hidden, false);
});

test('removed source files keep their last version, and binary/huge sources fail safely', () => {
  const r = renderCodeFile(document, { ...ref, status: 'removed' }, { base: 'line one\nline two\n', head: '' });
  assert.equal(r.blocks.length, 2); assert.equal(r.content.querySelector('.mr-ghost'), null);
  assert.equal(paragraphTarget(ref, r.blocks[1])!.endLine, 2);
  assert.throws(() => renderCodeFile(document, ref, { base: '', head: '\0binary' }), /binary/);
  assert.throws(() => renderCodeFile(document, ref, { base: '', head: 'x'.repeat(500_001) }), /too large/);
});

test('only known source/configuration paths are offered as code files', () => {
  for (const path of ['src/App.tsx', 'main.py', 'main.go', 'Dockerfile', '.env.local', '.gitignore', 'config.yaml', 'src/options.json']) assert.equal(isCodePath(path), true, path);
  for (const path of ['image.png', 'movie.mp4', 'archive.zip', 'font.woff', 'README.md', 'unknown.blob']) assert.equal(isCodePath(path), false, path);
});

test('source selections preserve indentation and newlines while excluding line numbers and signs', () => {
  const code = '  first line\n\n  last line\n';
  const r = renderCodeFile(document, ref, { base: code, head: code });
  const texts = [...r.content.querySelectorAll('.mr-code-text')].map((el) => el.firstChild!);
  const range = document.createRange(); range.setStart(texts[0], 0); range.setEnd(texts[2], 6);
  assert.deepEqual(selectionTarget(ref, r.blocks, range), { doc: ref, side: 'head', startLine: 1, endLine: 3, quote: '  first line\n\n  last' });
  range.setStart(texts[0], 2); range.setEnd(texts[0], 7);
  assert.equal(selectionTarget(ref, r.blocks, range)!.quote, 'first');
  range.selectNodeContents(r.content.querySelector('.mr-code-lines')!);
  assert.equal(selectionTarget(ref, r.blocks, range), null); // start/end must belong to source lines
});

test('Clean source selections skip hidden old rows and quote only the visible new version', () => {
  const r = renderCodeFile(document, ref, { base: '  first\nold value\n  last\n', head: '  first\nnew value\n  last\n' });
  const host = document.createElement('div'); host.className = 'mode-clean'; host.append(r.content);
  const first = r.blocks[0].el.querySelector('.mr-code-text')!.firstChild!;
  const last = r.blocks.at(-1)!.el.querySelector('.mr-code-text')!.firstChild!;
  const range = document.createRange(); range.setStart(first, 0); range.setEnd(last, last.textContent!.length);
  assert.equal(selectionTarget(ref, r.blocks, range)!.quote, '  first\nnew value\n  last');
  assert.equal(selectionTarget(ref, r.blocks, range)!.endLine, 3);
  host.className = '';
  assert.equal(selectionTarget(ref, r.blocks, range), null); // visible old/new text has no single version
  host.className = 'mode-clean';
  r.blocks[0].el.hidden = true;
  range.setStart(r.blocks.find((block) => block.kind === 'added')!.el.querySelector('.mr-code-text')!.firstChild!, 0);
  assert.equal(selectionTarget(ref, r.blocks, range)!.quote, 'new value\n  last');
});
