import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseHTML } from 'linkedom';
import { applyOps, plainText } from '../src/core/highlight.ts';
import { wordDiff } from '../src/core/worddiff.ts';

function paragraph(html: string): HTMLElement {
  const { document } = parseHTML(`<!doctype html><html><body><div id="x">${html}</div></body></html>`);
  return document.getElementById('x') as unknown as HTMLElement;
}

test('insertions and deletions are marked without losing inline formatting', () => {
  const el = paragraph('Hello <strong>brave</strong> new world');
  assert.equal(applyOps(el, wordDiff('Hello brave old world', plainText(el))), true);
  assert.equal(el.innerHTML, 'Hello <strong>brave</strong> <del class="mr-del">old</del><ins class="mr-ins">new</ins> world');
});

test('an insertion is marked inside the formatting it belongs to', () => {
  const el = paragraph('Read <a href="#">the guide</a> first');
  assert.equal(applyOps(el, wordDiff('Read first', plainText(el))), true);
  // The inserted text is "the guide "; its trailing space lives in the next text node and stays unmarked.
  assert.equal(el.innerHTML, 'Read <a href="#"><ins class="mr-ins">the guide</ins></a> first');
});

test('an insertion that spans two text nodes is split per node', () => {
  const el = paragraph('One <em>two three</em> four');
  assert.equal(applyOps(el, wordDiff('One four', plainText(el))), true);
  assert.equal(el.innerHTML, 'One <em><ins class="mr-ins">two three</ins></em> four');
  const el2 = paragraph('Alpha <b>beta</b> gamma delta');
  assert.equal(applyOps(el2, wordDiff('Alpha delta', plainText(el2))), true);
  assert.equal(el2.innerHTML, 'Alpha <b><ins class="mr-ins">beta</ins></b> <ins class="mr-ins">gamma</ins> delta');
});

test('text removed at the very end is appended there', () => {
  const el = paragraph('Keep this');
  assert.equal(applyOps(el, wordDiff('Keep this and that', plainText(el))), true);
  assert.equal(el.innerHTML, 'Keep this<del class="mr-del"> and that</del>');
});

test('ops that do not describe the element leave it untouched', () => {
  const el = paragraph('Unchanged <em>text</em>');
  // Same length as the real text, different content: must still be rejected.
  assert.equal(applyOps(el, [{ type: 'eq', text: 'Something else' }]), false);
  assert.equal(applyOps(el, [{ type: 'eq', text: 'Unchanged' }]), false);
  assert.equal(el.innerHTML, 'Unchanged <em>text</em>');
});
