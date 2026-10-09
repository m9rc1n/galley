// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { applyOps } from './highlight.ts';
import { diffUnits, similarity } from './blockdiff.ts';
import { reconstructBase } from './patch.ts';
import { changeRatio, hasVisibleChange, wordDiff } from './worddiff.ts';
import { isBalancedHtml, isCommentOnly, parseDocument, renderFrontMatter, renderUnit, splitFrontMatter } from './markdown.ts';

afterEach(() => vi.unstubAllGlobals());

it('scores punctuation-only text and pairs changed heading levels only when the titles are close', () => {
  expect(similarity('!!!', '!!!')).toBe(1);
  expect(similarity('!!!', '???')).toBe(0);
  expect(similarity('!!!', 'words')).toBe(0);
  const changes = (a: string, b: string) => diffUnits(parseDocument(a).units, parseDocument(b).units).map((c) => c.kind);
  expect(changes('# Alpha beta gamma\n', '## Alpha beta delta\n')).toEqual(['removed', 'added']);
  expect(changes('# Alpha beta gamma\n', '## Alpha beta gamma\n')).toEqual(['modified']);
  expect(changes('The old limit is 10.\n', 'Unrelated addition.\n\nThe old limit is 20.\n')).toEqual(['added', 'modified']);
});

it('leaves an empty patch unchanged and declines multi-file patches', () => {
  expect(reconstructBase('head', '')).toBe('head');
  const patch = '--- a/a.md\n+++ b/a.md\n@@ -1 +1 @@\n-old\n+new\n';
  expect(reconstructBase('new\n', `${patch}${patch.replaceAll('a.md', 'b.md')}`)).toBeNull();
});

it.each([
  ['', ''], ['old', ''], ['', 'new'], ['one two', 'one two'],
  ['a b c d', 'x b c y'], ['first and last', 'new and different'],
  ['alpha beta gamma delta', 'alpha gamma beta delta'],
  ['  old value  ', '  new value  '], ['one, two and three', 'one and three, two'],
])('word edits preserve both complete versions for %j → %j', (base, head) => {
  const ops = wordDiff(base, head);
  expect(ops.filter((o) => o.type !== 'ins').map((o) => o.text).join('')).toBe(base);
  expect(ops.filter((o) => o.type !== 'del').map((o) => o.text).join('')).toBe(head);
  expect(changeRatio(ops)).toBeGreaterThanOrEqual(0);
  expect(changeRatio(ops)).toBeLessThanOrEqual(1);
  expect(hasVisibleChange(ops)).toBe(base.replace(/\s/g, '') !== head.replace(/\s/g, ''));
});

it('keeps structural whitespace out of deletion marks and leaves inserted padding unmarked', () => {
  const el = document.createElement('ul');
  el.innerHTML = '<li>Keep</li>\n<li>Next</li>';
  expect(applyOps(el, [{ type: 'eq', text: 'Keep' }, { type: 'del', text: ' removed' }, { type: 'eq', text: '\nNext' }])).toBe(true);
  expect(el.querySelector('li')!.innerHTML).toBe('Keep<del class="mr-del"> removed</del>');
  const p = document.createElement('p'); p.textContent = '  added  ';
  expect(applyOps(p, [{ type: 'ins', text: '  added  ' }])).toBe(true);
  expect(p.innerHTML).toBe('  <ins class="mr-ins">added</ins>  ');
  const spaces = document.createElement('p'); spaces.append(document.createComment('invisible'), ' ');
  expect(applyOps(spaces, [{ type: 'del', text: '  ' }, { type: 'ins', text: ' ' }])).toBe(true);
  expect(spaces.querySelector('ins, del')).toBeNull();
});

it('renders empty task items, alert titles with and without a following line, and linked headings', () => {
  const parsed = parseDocument('# [Guide](guide.md) `API`\n\n1. [ ] todo\n2. [X] done\n\n> [!TIP] Same line\n\n> [!WARNING]\n\n>\n> ## Heading inside quote\n');
  expect(parsed.units[0].links).toEqual(['guide.md']);
  expect(parsed.html).toContain('id="guide-api"');
  expect(parsed.html).toContain('mr-alert-tip');
  expect(parsed.html).toContain('Same line');
  expect(parsed.html).toContain('mr-alert-warning');
  expect(parsed.html.match(/class="mr-task"/g)).toHaveLength(2);
});

it('reads TOML front matter, front matter at the very end of a file, and front matter that is not key-value', () => {
  const toml = splitFrontMatter('+++\ntitle = "RFC"\ntags = ["a"]\n+++\n# Body\n');
  expect(toml.frontmatter?.fields).toEqual([['title', 'RFC'], ['tags', '["a"]']]);
  const atEnd = splitFrontMatter('---\ntitle: Only\n---');
  expect(atEnd.lineCount).toBe(3);
  expect(atEnd.body).toBe('\n\n\n');
  // Lines before the first field have nothing to fold into, so they are left out.
  expect(splitFrontMatter('---\n  stray line\nowner: docs\n---\n').frontmatter?.fields).toEqual([['owner', 'docs']]);
  const prose = splitFrontMatter('---\njust a note, no fields\n---\nText\n').frontmatter!;
  expect(prose.fields).toEqual([]);
  expect(renderFrontMatter(prose, null)).toContain('<pre><code>just a note, no fields</code></pre>');
});

it('renders front matter on its own for a version that has it, and nothing for one that does not', () => {
  const withMeta = parseDocument('---\ntitle: A\n---\nText\n');
  expect(renderUnit(withMeta.units[0], withMeta)).toContain('<dt>title</dt> <dd>A</dd>');
  expect(renderUnit(withMeta.units[0], { ...withMeta, frontmatter: null })).toBe('');
});

it('treats unfinished HTML as balanced only when nothing was left open, and an unclosed comment as not a comment', () => {
  expect(isBalancedHtml('<div>a < b</div>')).toBe(true);
  expect(isBalancedHtml('<!-- never closed <div>')).toBe(true);
  expect(isBalancedHtml('<div><span')).toBe(false);
  expect(isCommentOnly('<!-- a -->\n<!-- b -->')).toBe(true);
  expect(isCommentOnly('<!-- never closed')).toBe(false);
  expect(isCommentOnly('   ')).toBe(false);
});

it('turns indented code into a code unit, and fences code that contains backticks with a longer fence', () => {
  const doc = parseDocument('Intro\n\n    indented()\n\n````md\n```js\nx\n```\n````\n');
  const codes = doc.units.filter((unit) => unit.kind === 'code');
  expect(codes.map((unit) => unit.text)).toEqual(['indented()', 'md ```js x ```']);
  expect(codes[0].source).toBe('```\nindented()\n```');
  expect(codes[1].source.startsWith('````md\n')).toBe(true);
  expect(renderUnit(codes[1], doc)).toContain('```js');
});

it('gives headings without words a stable id, numbered when it repeats', () => {
  const ids = [...parseDocument('# ![logo](logo.png)\n\n## ***\n\n# !!!\n').html.matchAll(/<h[12][^>]*\sid="([^"]+)"/g)].map((m) => m[1]);
  expect(ids).toEqual(['section', 'section-1', 'section-2']);
});

it('only makes a checkbox or an alert from the plain text that starts an item or quote', () => {
  const doc = parseDocument('- **[x]** bold first\n- [x] done\n\n> [!NOTE]\n> Read this.\n\n> **[!TIP]** not an alert\n');
  expect(doc.html.match(/class="mr-task"/g)).toHaveLength(1);
  expect(doc.html).toContain('mr-alert-note');
  expect(doc.html).not.toContain('mr-alert-tip');
  // The marker and its line break go; the text of the alert stays.
  expect(doc.html).toMatch(/mr-alert-note[^>]*>\s*<p[^>]*>Read this\.<\/p>/);
});

it('marks text that was removed entirely as a deletion, even when nothing is left to attach it to', () => {
  const p = document.createElement('p');
  expect(applyOps(p, [{ type: 'del', text: 'all gone' }])).toBe(true);
  expect(p.innerHTML).toBe('<del class="mr-del">all gone</del>');
});

it('splits words without Intl.Segmenter, as older browsers need', async () => {
  // Only while the module loads: it decides once which splitter to use.
  vi.stubGlobal('Intl', {});
  vi.resetModules();
  const { tokenize, wordDiff } = await import('./worddiff.ts');
  vi.unstubAllGlobals();
  expect(tokenize('Hello, wide  world!')).toEqual(['Hello', ',', ' ', 'wide', '  ', 'world', '!']);
  expect(wordDiff('a small change', 'a big change').filter((op) => op.type !== 'eq').map((op) => [op.type, op.text])).toEqual([['del', 'small'], ['ins', 'big']]);
  expect(tokenize('')).toEqual([]);
});
