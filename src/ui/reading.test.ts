// @vitest-environment jsdom
import { expect, it } from 'vitest';
import type { DocRef } from '../platforms/types.ts';
import { renderMarkdown } from '../testing/render.ts';
import { filterDocument, paragraphTarget, selectionTarget } from './reading.ts';
import { DEFAULT_SETTINGS } from './settings.ts';

const doc: DocRef = { path: 'new.md', oldPath: 'old.md', status: 'renamed' };
const render = (base: string, head: string, status = doc.status) => renderMarkdown(base, head, status, { path: doc.path });

it('changed paragraphs are the default, preserving only relevant headings and list structure', () => {
  expect(DEFAULT_SETTINGS.scope).toBe('changed');
  const base = '# Guide\n\n## Edited section\n\nKept prose.\n\n- stable item\n- change value 10\n\n## Unchanged section\n\nMore kept prose.\n';
  const r = render(base, base.replace('value 10', 'value 20'));
  filterDocument(r, true);
  const hidden = (text: string) => r.blocks.find((b) => b.el.textContent?.includes(text))!.el.hidden;
  expect(hidden('Guide')).toBe(false);
  expect(hidden('Edited section')).toBe(false);
  expect(hidden('Kept prose')).toBe(true);
  expect(hidden('stable item')).toBe(true);
  expect(hidden('value')).toBe(false);
  expect(hidden('Unchanged section')).toBe(true);
  expect(r.content.querySelector<HTMLElement>('li:not(.mr-context-gap)')?.hidden).toBe(true);
  expect(r.content.querySelectorAll('.mr-context-toggle').length > 0).toBeTruthy();
  filterDocument(r, false);
  expect(r.content.querySelectorAll('[hidden]')).toHaveLength(0);
});

it('comment targets retain source offsets after front matter, rewrapping and deleted blocks', () => {
  const r = render('---\ntitle: Guide\n---\n\n# Guide\n\nKeep old\nwording.\n\nRemoved paragraph.\n', '---\ntitle: Guide\n---\n\n# Guide\n\nKeep new wording.\n');
  const modified = r.blocks.find((b) => b.kind === 'modified')!;
  expect(paragraphTarget(doc, modified)).toStrictEqual({ doc, side: 'head', startLine: 7, endLine: 7, quote: 'Keep new wording.' });
  expect(paragraphTarget(doc, modified, 'base')).toStrictEqual({ doc, side: 'base', startLine: 7, endLine: 8, quote: 'Keep old wording.' });
  const deleted = r.blocks.find((b) => b.kind === 'removed')!;
  expect(paragraphTarget(doc, deleted)?.side).toBe('base');
  expect(paragraphTarget(doc, deleted)?.startLine).toBe(10);
});

it('selections quote exact rendered text with the containing paragraph range', () => {
  const r = render('', '# Guide\n\nA **selected phrase** in text.\n', 'added');
  const block = r.blocks[1];
  const text = block.el.querySelector('strong')!.firstChild!;
  const range = document.createRange();
  range.setStart(text, 0); range.setEnd(text, 8);
  expect(selectionTarget(doc, r.blocks, range)).toStrictEqual({ doc, side: 'head', startLine: 3, endLine: 3, quote: 'selected' });
});

it('removed words target the old version; selections spanning both versions are rejected', () => {
  const r = render('Keep old wording.', 'Keep new wording.');
  const del = r.content.querySelector('del')!.firstChild!;
  const range = document.createRange();
  range.selectNodeContents(del);
  expect(selectionTarget(doc, r.blocks, range)?.side).toBe('base');
  range.selectNodeContents(r.blocks[0].el);
  expect(selectionTarget(doc, r.blocks, range)).toBe(null);
});

it('images, new and removed documents retain trusted source targets and change navigation', () => {
  for (const status of ['added', 'removed'] as const) {
    const r = render(status === 'removed' ? '![Diagram](image.png)\n' : '', status === 'added' ? '![Diagram](image.png)\n' : '', status);
    expect(r.blocks[0].el.tagName).toBe('FIGURE');
    expect(r.changes[0]).toBe(r.blocks[0].el);
    expect(paragraphTarget(doc, r.blocks[0])?.side).toBe(status === 'removed' ? 'base' : 'head');
    filterDocument(r, true);
    expect(r.blocks[0].el.hidden).toBe(false);
  }
});

it('raw HTML cannot forge source coordinates or the reading highlight', () => {
  const r = render('', '<p data-mr-u="1" data-mr-line="1" class="mr-reading">Spoof</p>\n\nReal paragraph.\n', 'added');
  const fake = r.content.querySelector('.mr-html > p')!;
  expect(fake.getAttribute('data-mr-line')).toBe(null);
  expect(fake.className).toBe('');
  const target = paragraphTarget(doc, r.blocks[1])!;
  expect(target.startLine).toBe(3);
  expect(target.quote).toBe('Real paragraph.');
});

it('each hidden stretch can reveal and collapse context independently, retaining it across display changes', () => {
  const r = render('# Guide\n\nKept before.\n\nChange value 10.\n\nKept after.\n', '# Guide\n\nKept before.\n\nChange value 20.\n\nKept after.\n');
  filterDocument(r, true);
  const before = r.blocks.find((block) => block.el.textContent === 'Kept before.')!.el;
  const after = r.blocks.find((block) => block.el.textContent === 'Kept after.')!.el;
  expect(before.hidden).toBe(true); expect(after.hidden).toBe(true);
  expect(r.content.querySelector('.mr-context-toggle')!.getAttribute('aria-label')).toBe('Expand 1 unchanged block');
  (r.content.querySelector('.mr-context-toggle') as HTMLButtonElement).click();
  expect(r.content.querySelector('.mr-context-toggle')!.getAttribute('aria-label')).toBe('Collapse 1 unchanged block');
  expect(before.hidden).toBe(false); expect(after.hidden).toBe(true);
  filterDocument(r, true);
  expect(before.hidden).toBe(false);
  expect(r.content.querySelector('.mr-context-toggle')!.getAttribute('aria-expanded')).toBe('true');
  (r.content.querySelector('.mr-context-toggle') as HTMLButtonElement).click();
  expect(before.hidden).toBe(true); expect(after.hidden).toBe(true);
  filterDocument(r, false);
  expect(r.content.querySelector('.mr-context-gap')).toBe(null);
  expect(before.hidden).toBe(false); expect(after.hidden).toBe(false);
});
