import { expect, it } from 'vitest';
import type { DocRef } from '../platforms/types.ts';
import { renderMarkdown } from '../testing/render.ts';
import { renderCodeFile } from './code-files.ts';
import { filterDocument, paragraphTarget, selectionTarget } from './reading.ts';

const doc: DocRef = { path: 'guide.md', oldPath: 'guide.md', status: 'modified' };
const code: DocRef = { ...doc, path: 'app.ts', oldPath: 'app.ts', kind: 'code' };

it('keeps parent headings with changes and allows folded footnote content to be revealed', () => {
  const base = '# Guide\n\n## First\n\nStable.[^note]\n\n## Second\n\nValue 10.\n\n[^note]: Footnote text.\n';
  const r = renderMarkdown(base, base.replace('Value 10', 'Value 20'));
  filterDocument(r, true);
  expect(r.blocks.filter((b) => b.head?.kind === 'heading').map((b) => [b.el.textContent, b.el.hidden])).toEqual([['Guide', false], ['First', true], ['Second', false]]);
  expect(r.content.querySelector<HTMLElement>('.footnotes p')!.hidden).toBe(true);
  expect(r.content.querySelector<HTMLElement>('.footnotes')!.hidden).toBe(false);
  r.content.querySelector<HTMLButtonElement>('.mr-context-toggle')!.click();
  expect(r.content.querySelector<HTMLElement>('.footnotes')!.hidden).toBe(false);
  expect(r.content.querySelector<HTMLElement>('.footnotes-sep')!.hidden).toBe(false);
  r.content.querySelector<HTMLButtonElement>('.footnotes .mr-context-toggle')!.click();
  expect(r.content.querySelector<HTMLElement>('.footnotes p')!.hidden).toBe(false);
});

it('folds individual unchanged source lines and keeps blank lines in a code selection', () => {
  const text = 'first\n\nthird\nfourth\nfifth\nsixth\nseventh\neighth\n';
  const r = renderCodeFile(document, code, { base: text, head: text.replace('eighth', 'edited') });
  filterDocument(r, true);
  const button = r.content.querySelector<HTMLButtonElement>('.mr-context-toggle')!;
  expect(button.textContent).toBe('5 unchanged lines');
  button.click();
  const range = document.createRange();
  range.setStart(r.blocks[0].el.querySelector('.mr-code-text')!.firstChild!, 1);
  range.setEnd(r.blocks[2].el.querySelector('.mr-code-text')!.firstChild!, 3);
  expect(selectionTarget(code, r.blocks, range)).toMatchObject({ startLine: 1, endLine: 3, quote: 'irst\n\nthi' });
  const single = renderCodeFile(document, code, { base: 'one\ntwo\nthree\nfour\n', head: 'one\ntwo\nthree\nnew\n' });
  filterDocument(single, true);
  expect(single.content.querySelector('.mr-context-toggle')!.textContent).toBe('1 unchanged line');
});

it('rejects selections outside mapped blocks, across versions, or consisting only of code gutters', () => {
  const r = renderMarkdown('Old only.\n\nShared text.\n', 'Shared text.\n\nNew only.\n');
  const outside = document.createElement('p'); outside.textContent = 'Outside';
  const range = document.createRange(); range.selectNodeContents(outside);
  expect(selectionTarget(doc, r.blocks, range)).toBeNull();
  const removed = r.blocks.find((b) => b.kind === 'removed')!;
  const added = r.blocks.find((b) => b.kind === 'added')!;
  expect(paragraphTarget(doc, removed, 'head')).toBeNull();
  expect(paragraphTarget(doc, added, 'base')).toBeNull();
  range.setStart(removed.el.firstChild!.firstChild!, 0);
  range.setEnd(added.el.firstChild!, added.el.textContent!.length);
  expect(selectionTarget(doc, r.blocks, range)).toBeNull();
  const source = renderCodeFile(document, code, { base: '', head: 'hello\n' });
  range.selectNodeContents(source.blocks[0].el.querySelectorAll('.mr-code-number')[1]);
  expect(selectionTarget(code, source.blocks, range)).toBeNull();
});

it('quotes whole code blocks as source and honours an explicitly supplied quote', () => {
  const r = renderMarkdown('```js\nold()\n```\n', '```js\nnew()\n```\n');
  expect(paragraphTarget(doc, r.blocks[0])?.quote).toBe('```js\nnew()\n```');
  expect(paragraphTarget(doc, r.blocks[0], 'base', '')?.quote).toBe('');
});

it('rejects an old-version selection that encloses new-only paragraphs in the middle', () => {
  const r = renderMarkdown('Old first.\n\nOld last.\n', 'New middle.\n');
  const removed = r.blocks.filter((b) => b.kind === 'removed');
  // Put the new paragraph between the two old paragraphs, as interleaved diffs can be displayed.
  removed[0].el.after(r.blocks.find((b) => b.kind === 'added')!.el);
  const range = document.createRange();
  range.setStart(removed[0].el.querySelector('p')!.firstChild!, 0);
  range.setEnd(removed[1].el.querySelector('p')!.firstChild!, 'Old last.'.length);
  expect(selectionTarget(doc, r.blocks, range)).toBeNull();
});
