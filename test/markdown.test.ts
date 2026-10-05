import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isBalancedHtml, parseDocument, renderUnit, slugify, splitFrontMatter } from '../src/core/markdown.ts';

test('front matter is split off without shifting line numbers', () => {
  const { body, frontmatter, lineCount } = splitFrontMatter('---\ntitle: "Hello"\ntags:\n  - a\n  - b\n---\n# Heading\n');
  assert.equal(lineCount, 6);
  assert.equal(body.split('\n')[6], '# Heading');
  assert.deepEqual(frontmatter?.fields, [
    ['title', 'Hello'],
    ['tags', 'a, b'],
  ]);
});

test('every leaf block becomes a unit that knows its source lines', () => {
  const doc = parseDocument('# Title\n\nIntro paragraph\nwrapped.\n\n- one\n- two\n\n```js\nx()\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n---\n');
  assert.deepEqual(
    doc.units.map((u) => [u.kind, u.lines, u.inList]),
    [
      ['heading', [0, 1], false],
      ['paragraph', [2, 4], false],
      ['paragraph', [5, 6], true],
      ['paragraph', [6, 7], true],
      ['code', [8, 11], false],
      ['table', [12, 15], false],
      ['rule', [16, 17], false],
    ],
  );
  assert.equal(doc.units[1].key, 'paragraph:Intro paragraph wrapped.');
  assert.match(doc.html, /<span class="mr-tight" data-mr-u="2">one<\/span>/);
  assert.match(doc.html, /<h1 data-mr-u="0" id="title">/);
  assert.match(doc.html, /<pre data-mr-u="4" data-lang="js"><code>x\(\)\n<\/code><\/pre>/);
  assert.match(doc.html, /<div class="mr-table" data-mr-u="5"><table>/);
});

test('front matter is the first unit and renders as a metadata card', () => {
  const doc = parseDocument('---\nstatus: Draft\n---\n\nBody text.\n');
  assert.equal(doc.units[0].kind, 'frontmatter');
  assert.deepEqual(doc.units[1].lines, [4, 5]);
  assert.match(doc.html, /<details class="mr-meta" data-mr-u="0">/);
  assert.match(doc.html, /<dt>status<\/dt> <dd>Draft<\/dd>/);
});

test('task lists and alerts render like on GitHub and GitLab', () => {
  const { html } = parseDocument('- [x] done\n- [ ] todo\n\n> [!WARNING]\n> Careful.\n');
  assert.match(html, /<li class="mr-task-item"><span class="mr-tight" data-mr-u="0"><input type="checkbox" class="mr-task" disabled checked>done/);
  assert.match(html, /<input type="checkbox" class="mr-task" disabled>todo/);
  assert.match(html, /<blockquote class="mr-alert mr-alert-warning" data-alert="Warning">/);
  assert.doesNotMatch(html, /\[!WARNING\]/);
});

test('self-contained HTML blocks become units, open-ended ones are left alone', () => {
  assert.equal(isBalancedHtml('<p align="center"><img src="x.png"><br/></p>'), true);
  assert.equal(isBalancedHtml('<details>\n<summary>More</summary>'), false);
  assert.equal(isBalancedHtml('</details>'), false);
  const doc = parseDocument('<details>\n<summary>More</summary>\n\nHidden text\n\n</details>\n\n<!-- a comment -->\n');
  assert.deepEqual(doc.units.map((u) => u.kind), ['paragraph']);
});

test('heading ids follow GitHub slugs and stay unique', () => {
  const { html } = parseDocument('# Hello, World!\n\n## Hello, World!\n');
  assert.match(html, /id="hello-world"/);
  assert.match(html, /id="hello-world-1"/);
  assert.equal(slugify('  Ünïcode & Co.  '), 'ünïcode--co');
});

test('smart quotes are on, but text replacements are off', () => {
  const { html } = parseDocument('Use "quotes" -- and keep --flags... as written (c).\n');
  assert.match(html, /“quotes”/);
  assert.match(html, /-- and keep --flags\.\.\. as written \(c\)/);
});

test('a unit renders on its own, for showing removed blocks', () => {
  const doc = parseDocument('## Old heading\n\n- item one\n\n```\ncode\n```\n');
  assert.equal(renderUnit(doc.units[0], doc).trim(), '<h2 id="old-heading">Old heading</h2>');
  assert.equal(renderUnit(doc.units[1], doc).trim(), '<p>item one</p>');
  assert.match(renderUnit(doc.units[2], doc), /<pre><code>code\n<\/code><\/pre>/);
});
