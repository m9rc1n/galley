import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { filterDocument, paragraphTarget, selectionTarget } from '../src/ui/reading.ts';
import { renderDocument } from '../src/ui/render.ts';
import { DEFAULT_SETTINGS } from '../src/ui/settings.ts';
import type { DocRef } from '../src/platforms/types.ts';

const { document } = new JSDOM('<!doctype html><html><body></body></html>').window;
const doc: DocRef = { path: 'new.md', oldPath: 'old.md', status: 'renamed' };
const render = (base: string, head: string, status = doc.status) => renderDocument(document, { path: doc.path, base, head, status, links: { blob: (p) => p, raw: (p) => p } });

test('changed paragraphs are the default, preserving only relevant headings and list structure', () => {
  assert.equal(DEFAULT_SETTINGS.scope, 'changed');
  const base = '# Guide\n\n## Edited section\n\nKept prose.\n\n- stable item\n- change value 10\n\n## Unchanged section\n\nMore kept prose.\n';
  const r = render(base, base.replace('value 10', 'value 20'));
  filterDocument(r, true);
  const hidden = (text: string) => r.blocks.find((b) => b.el.textContent?.includes(text))!.el.hidden;
  assert.equal(hidden('Guide'), false);
  assert.equal(hidden('Edited section'), false);
  assert.equal(hidden('Kept prose'), true);
  assert.equal(hidden('stable item'), true);
  assert.equal(hidden('value'), false);
  assert.equal(hidden('Unchanged section'), true);
  assert.equal(r.content.querySelector<HTMLElement>('li:not(.mr-context-gap)')?.hidden, true);
  assert.ok(r.content.querySelectorAll('.mr-context-toggle').length > 0);
  filterDocument(r, false);
  assert.equal(r.content.querySelectorAll('[hidden]').length, 0);
});

test('comment targets retain source offsets after front matter, rewrapping and deleted blocks', () => {
  const r = render('---\ntitle: Guide\n---\n\n# Guide\n\nKeep old\nwording.\n\nRemoved paragraph.\n', '---\ntitle: Guide\n---\n\n# Guide\n\nKeep new wording.\n');
  const modified = r.blocks.find((b) => b.kind === 'modified')!;
  assert.deepEqual(paragraphTarget(doc, modified), { doc, side: 'head', startLine: 7, endLine: 7, quote: 'Keep new wording.' });
  assert.deepEqual(paragraphTarget(doc, modified, 'base'), { doc, side: 'base', startLine: 7, endLine: 8, quote: 'Keep old wording.' });
  const deleted = r.blocks.find((b) => b.kind === 'removed')!;
  assert.equal(paragraphTarget(doc, deleted)?.side, 'base');
  assert.equal(paragraphTarget(doc, deleted)?.startLine, 10);
});

test('selections quote exact rendered text with the containing paragraph range', () => {
  const r = render('', '# Guide\n\nA **selected phrase** in text.\n', 'added');
  const block = r.blocks[1];
  const text = block.el.querySelector('strong')!.firstChild!;
  const range = document.createRange();
  range.setStart(text, 0); range.setEnd(text, 8);
  assert.deepEqual(selectionTarget(doc, r.blocks, range), { doc, side: 'head', startLine: 3, endLine: 3, quote: 'selected' });
});

test('removed words target the old version; selections spanning both versions are rejected', () => {
  const r = render('Keep old wording.', 'Keep new wording.');
  const del = r.content.querySelector('del')!.firstChild!;
  const range = document.createRange();
  range.selectNodeContents(del);
  assert.equal(selectionTarget(doc, r.blocks, range)?.side, 'base');
  range.selectNodeContents(r.blocks[0].el);
  assert.equal(selectionTarget(doc, r.blocks, range), null);
});

test('images, new and removed documents retain trusted source targets and change navigation', () => {
  for (const status of ['added', 'removed'] as const) {
    const r = render(status === 'removed' ? '![Diagram](image.png)\n' : '', status === 'added' ? '![Diagram](image.png)\n' : '', status);
    assert.equal(r.blocks[0].el.tagName, 'FIGURE');
    assert.equal(r.changes[0], r.blocks[0].el);
    assert.equal(paragraphTarget(doc, r.blocks[0])?.side, status === 'removed' ? 'base' : 'head');
    filterDocument(r, true);
    assert.equal(r.blocks[0].el.hidden, false);
  }
});

test('raw HTML cannot forge source coordinates or the reading highlight', () => {
  const r = render('', '<p data-mr-u="1" data-mr-line="1" class="mr-reading">Spoof</p>\n\nReal paragraph.\n', 'added');
  const fake = r.content.querySelector('.mr-html > p')!;
  assert.equal(fake.getAttribute('data-mr-line'), null);
  assert.equal(fake.className, '');
  const target = paragraphTarget(doc, r.blocks[1])!;
  assert.equal(target.startLine, 3);
  assert.equal(target.quote, 'Real paragraph.');
});


test('each hidden stretch can reveal and collapse context independently, retaining it across display changes', () => {
  const r = render('# Guide\n\nKept before.\n\nChange value 10.\n\nKept after.\n', '# Guide\n\nKept before.\n\nChange value 20.\n\nKept after.\n');
  filterDocument(r, true);
  const before = r.blocks.find((block) => block.el.textContent === 'Kept before.')!.el;
  const after = r.blocks.find((block) => block.el.textContent === 'Kept after.')!.el;
  assert.equal(before.hidden, true); assert.equal(after.hidden, true);
  assert.equal(r.content.querySelector('.mr-context-toggle')!.getAttribute('aria-label'), 'Expand 1 unchanged block');
  (r.content.querySelector('.mr-context-toggle') as HTMLButtonElement).click();
  assert.equal(r.content.querySelector('.mr-context-toggle')!.getAttribute('aria-label'), 'Collapse 1 unchanged block');
  assert.equal(before.hidden, false); assert.equal(after.hidden, true);
  filterDocument(r, true);
  assert.equal(before.hidden, false);
  assert.equal(r.content.querySelector('.mr-context-toggle')!.getAttribute('aria-expanded'), 'true');
  (r.content.querySelector('.mr-context-toggle') as HTMLButtonElement).click();
  assert.equal(before.hidden, true); assert.equal(after.hidden, true);
  filterDocument(r, false);
  assert.equal(r.content.querySelector('.mr-context-gap'), null);
  assert.equal(before.hidden, false); assert.equal(after.hidden, false);
});
