// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { applyOps, plainText } from './highlight.ts';
import { wordDiff } from './worddiff.ts';

function paragraph(html: string): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

it('insertions and deletions are marked without losing inline formatting', () => {
  const el = paragraph('Hello <strong>brave</strong> new world');
  expect(applyOps(el, wordDiff('Hello brave old world', plainText(el)))).toBe(true);
  expect(el.innerHTML).toBe('Hello <strong>brave</strong> <del class="mr-del">old</del><ins class="mr-ins">new</ins> world');
});

it('an insertion is marked inside the formatting it belongs to', () => {
  const el = paragraph('Read <a href="#">the guide</a> first');
  expect(applyOps(el, wordDiff('Read first', plainText(el)))).toBe(true);
  // The inserted text is "the guide "; its trailing space lives in the next text node and stays unmarked.
  expect(el.innerHTML).toBe('Read <a href="#"><ins class="mr-ins">the guide</ins></a> first');
});

it('an insertion that spans two text nodes is split per node', () => {
  const el = paragraph('One <em>two three</em> four');
  expect(applyOps(el, wordDiff('One four', plainText(el)))).toBe(true);
  expect(el.innerHTML).toBe('One <em><ins class="mr-ins">two three</ins></em> four');
  const el2 = paragraph('Alpha <b>beta</b> gamma delta');
  expect(applyOps(el2, wordDiff('Alpha delta', plainText(el2)))).toBe(true);
  expect(el2.innerHTML).toBe('Alpha <b><ins class="mr-ins">beta</ins></b> <ins class="mr-ins">gamma</ins> delta');
});

it('text removed at the very end is appended there', () => {
  const el = paragraph('Keep this');
  expect(applyOps(el, wordDiff('Keep this and that', plainText(el)))).toBe(true);
  expect(el.innerHTML).toBe('Keep this<del class="mr-del"> and that</del>');
});

it('ops that do not describe the element leave it untouched', () => {
  const el = paragraph('Unchanged <em>text</em>');
  // Same length as the real text, different content: must still be rejected.
  expect(applyOps(el, [{ type: 'eq', text: 'Something else' }])).toBe(false);
  expect(applyOps(el, [{ type: 'eq', text: 'Unchanged' }])).toBe(false);
  expect(el.innerHTML).toBe('Unchanged <em>text</em>');
});
