// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { renderCodeFile } from './code-files.ts';
import { filterDocument, paragraphTarget, selectionTarget } from './reading.ts';

const ref = { path: 'src/main.ts', oldPath: 'src/old.ts', status: 'modified' as const, kind: 'code' as const };

it('source files preserve text, diff sides and exact line numbers without parsing Markdown/HTML', () => {
  const r = renderCodeFile(document, ref, { base: 'const value = 1;\n  return value;\n', head: 'const value = 2;\n  return value;\n<script>alert(1)</script>\n' });
  expect(r.isCode).toBe(true); expect(r.diagrams).toHaveLength(0);
  expect(r.content.querySelector('script')).toBe(null);
  expect(r.content.textContent!).toMatch(/<script>alert\(1\)<\/script>/);
  const removed = r.blocks.find((block) => block.kind === 'removed')!;
  const added = r.blocks.find((block) => block.kind === 'added')!;
  expect(paragraphTarget(ref, removed)!.side).toBe('base');
  expect(paragraphTarget(ref, added)!.side).toBe('head');
  expect(paragraphTarget(ref, added)!.startLine).toBe(1);
  const same = r.blocks.find((block) => block.kind === 'same')!;
  expect(paragraphTarget(ref, same)!.quote).toBe('  return value;');
  expect(paragraphTarget(ref, same)!.startLine).toBe(2);
  filterDocument(r, true); expect(same.el.hidden).toBe(true);
  expect(r.content.querySelector('.mr-context-toggle')!.textContent!).toMatch(/unchanged line/);
  filterDocument(r, false); expect(same.el.hidden).toBe(false);
});

it('removed source files keep their last version, and binary/huge sources fail safely', () => {
  const r = renderCodeFile(document, { ...ref, status: 'removed' }, { base: 'line one\nline two\n', head: '' });
  expect(r.blocks).toHaveLength(2); expect(r.content.querySelector('.mr-ghost')).toBe(null);
  expect(paragraphTarget(ref, r.blocks[1])!.endLine).toBe(2);
  expect(() => renderCodeFile(document, ref, { base: '', head: '\0binary' })).toThrow(/binary/);
  expect(() => renderCodeFile(document, ref, { base: '', head: 'x'.repeat(500_001) })).toThrow(/too large/);
});

it('source selections preserve indentation and newlines while excluding line numbers and signs', () => {
  const code = '  first line\n\n  last line\n';
  const r = renderCodeFile(document, ref, { base: code, head: code });
  const texts = [...r.content.querySelectorAll('.mr-code-text')].map((el) => el.firstChild!);
  const range = document.createRange(); range.setStart(texts[0], 0); range.setEnd(texts[2], 6);
  expect(selectionTarget(ref, r.blocks, range)).toStrictEqual({ doc: ref, side: 'head', startLine: 1, endLine: 3, quote: '  first line\n\n  last' });
  range.setStart(texts[0], 2); range.setEnd(texts[0], 7);
  expect(selectionTarget(ref, r.blocks, range)!.quote).toBe('first');
  range.selectNodeContents(r.content.querySelector('.mr-code-lines')!);
  expect(selectionTarget(ref, r.blocks, range)).toBe(null); // start/end must belong to source lines
});

it('Clean source selections skip hidden old rows and quote only the visible new version', () => {
  const r = renderCodeFile(document, ref, { base: '  first\nold value\n  last\n', head: '  first\nnew value\n  last\n' });
  const host = document.createElement('div'); host.className = 'mode-clean'; host.append(r.content);
  const first = r.blocks[0].el.querySelector('.mr-code-text')!.firstChild!;
  const last = r.blocks.at(-1)!.el.querySelector('.mr-code-text')!.firstChild!;
  const range = document.createRange(); range.setStart(first, 0); range.setEnd(last, last.textContent!.length);
  expect(selectionTarget(ref, r.blocks, range)!.quote).toBe('  first\nnew value\n  last');
  expect(selectionTarget(ref, r.blocks, range)!.endLine).toBe(3);
  host.className = '';
  expect(selectionTarget(ref, r.blocks, range)).toBe(null); // visible old/new text has no single version
  host.className = 'mode-clean';
  r.blocks[0].el.hidden = true;
  range.setStart(r.blocks.find((block) => block.kind === 'added')!.el.querySelector('.mr-code-text')!.firstChild!, 0);
  expect(selectionTarget(ref, r.blocks, range)!.quote).toBe('new value\n  last');
});
