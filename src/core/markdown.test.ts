import { expect, it } from 'vitest';
import { isBalancedHtml, parseDocument, renderUnit, slugify, splitFrontMatter } from './markdown.ts';

it('front matter is split off without shifting line numbers', () => {
  const { body, frontmatter, lineCount } = splitFrontMatter('---\ntitle: "Hello"\ntags:\n  - a\n  - b\n---\n# Heading\n');
  expect(lineCount).toBe(6);
  expect(body.split('\n')[6]).toBe('# Heading');
  expect(frontmatter?.fields).toStrictEqual([
    ['title', 'Hello'],
    ['tags', 'a, b'],
  ]);
});

it('every leaf block becomes a unit that knows its source lines', () => {
  const doc = parseDocument('# Title\n\nIntro paragraph\nwrapped.\n\n- one\n- two\n\n```js\nx()\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n---\n');
  expect(doc.units.map((u) => [u.kind, u.lines, u.inList])).toStrictEqual([
    ['heading', [0, 1], false],
    ['paragraph', [2, 4], false],
    ['paragraph', [5, 6], true],
    ['paragraph', [6, 7], true],
    ['code', [8, 11], false],
    ['table', [12, 15], false],
    ['rule', [16, 17], false],
  ]);
  expect(doc.units[1].key).toBe('paragraph:Intro paragraph wrapped.');
  // Block ids carry a random per-render nonce, so raw HTML in the document cannot forge them.
  expect(doc.nonce).toMatch(/^[0-9a-f]{16}$/);
  expect(parseDocument('x').nonce).not.toBe(doc.nonce);
  const u = (id: number) => `data-mr-u="${doc.nonce}:${id}"`;
  expect(doc.html.includes(`<span class="mr-tight" ${u(2)}>one</span>`)).toBeTruthy();
  expect(doc.html.includes(`<h1 ${u(0)} id="title">`)).toBeTruthy();
  expect(doc.html.includes(`<pre ${u(4)} data-lang="js"><code>x()\n</code></pre>`)).toBeTruthy();
  expect(doc.html.includes(`<div class="mr-table" ${u(5)}><table>`)).toBeTruthy();
});

it('front matter is the first unit and renders as a metadata card', () => {
  const doc = parseDocument('---\nstatus: Draft\n---\n\nBody text.\n');
  expect(doc.units[0].kind).toBe('frontmatter');
  expect(doc.units[1].lines).toStrictEqual([4, 5]);
  expect(doc.html.includes(`<details class="mr-meta" data-mr-u="${doc.nonce}:0">`)).toBeTruthy();
  expect(doc.html).toMatch(/<dt>status<\/dt> <dd>Draft<\/dd>/);
});

it('task lists and alerts render like on GitHub and GitLab', () => {
  const { html, nonce } = parseDocument('- [x] done\n- [ ] todo\n\n> [!WARNING]\n> Careful.\n');
  expect(
    html.includes(`<li class="mr-task-item"><span class="mr-tight" data-mr-u="${nonce}:0"><input type="checkbox" class="mr-task" disabled checked>done`),
  ).toBeTruthy();
  expect(html).toMatch(/<input type="checkbox" class="mr-task" disabled>todo/);
  // The alert title comes from the class (in CSS), not from an attribute.
  expect(html).toMatch(/<blockquote class="mr-alert mr-alert-warning">/);
  expect(html).not.toMatch(/\[!WARNING\]/);
});

it('self-contained HTML blocks become units, open-ended ones are left alone', () => {
  expect(isBalancedHtml('<p align="center"><img src="x.png"><br/></p>')).toBe(true);
  expect(isBalancedHtml('<details>\n<summary>More</summary>')).toBe(false);
  expect(isBalancedHtml('</details>')).toBe(false);
  const doc = parseDocument('<details>\n<summary>More</summary>\n\nHidden text\n\n</details>\n\n<!-- a comment -->\n');
  expect(doc.units.map((u) => u.kind)).toStrictEqual(['paragraph']);
});

it('heading ids follow GitHub slugs and stay unique', () => {
  const { html } = parseDocument('# Hello, World!\n\n## Hello, World!\n');
  expect(html).toMatch(/id="hello-world"/);
  expect(html).toMatch(/id="hello-world-1"/);
  expect(slugify('  Ünïcode & Co.  ')).toBe('ünïcode--co');
});

it('smart quotes are on, but text replacements are off', () => {
  const { html } = parseDocument('Use "quotes" -- and keep --flags... as written (c).\n');
  expect(html).toMatch(/“quotes”/);
  expect(html).toMatch(/-- and keep --flags\.\.\. as written \(c\)/);
});

it('a unit renders on its own, for showing removed blocks', () => {
  const doc = parseDocument('## Old heading\n\n- item one\n\n```\ncode\n```\n');
  expect(renderUnit(doc.units[0], doc).trim()).toBe('<h2 id="old-heading">Old heading</h2>');
  expect(renderUnit(doc.units[1], doc).trim()).toBe('<p>item one</p>');
  expect(renderUnit(doc.units[2], doc)).toMatch(/<pre><code>code\n<\/code><\/pre>/);
});
