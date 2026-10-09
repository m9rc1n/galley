import { afterEach, expect, it, vi } from 'vitest';
import { renderCodeFile } from './code-files.ts';
import { MoveFinder, showMove } from './moves.ts';
import type { DocRef } from '../platforms/types.ts';

const file = (path: string, status: DocRef['status'] = 'modified', oldPath = path): DocRef => ({ path, oldPath, status, kind: 'code' });
const rendered = (ref: DocRef, base: string, head: string) => {
  const r = renderCodeFile(document, ref, { base, head });
  document.body.append(r.content);
  return r;
};
const lines = (move: { rows: { el: HTMLElement }[] }) => move.rows.map((row) => row.el.querySelector('.mr-code-text')!.textContent);
afterEach(() => document.body.replaceChildren());

const helper = 'function quota(client) {\n  const used = usage.get(client) ?? 0;\n  return limit - used;\n}\n';
/** Code that stays put, longer than what moves past it, so the diff keeps it and shows the other block moving. */
const stay = Array.from({ length: 12 }, (_, i) => `step${i}(context, options);\n`).join('');

it('finds a block moved within a file, marks both ends and goes from one to the other', () => {
  const ref = file('src/limits.ts');
  const r = rendered(ref, `${helper}${stay}`, `${stay}${helper}`);
  const moves = new MoveFinder().add(ref, r);
  expect(moves).toHaveLength(1);
  expect(lines(moves[0].from)).toEqual(['function quota(client) {', '  const used = usage.get(client) ?? 0;', '  return limit - used;', '}']);
  expect(lines(moves[0].to)).toEqual(lines(moves[0].from));
  showMove(moves[0]);
  expect(r.blocks.filter((block) => 'mrMoved' in block.el.dataset)).toHaveLength(8);
  const notes = [...r.content.querySelectorAll<HTMLButtonElement>('.mr-move-link')];
  expect(notes.map((note) => note.textContent)).toEqual(['Moved to line 13', 'Moved from old line 1']);
  // Each note sits just above its end of the move.
  expect(notes[0].parentElement!.nextElementSibling).toBe(moves[0].from.rows[0].el);
  const scroll = vi.fn();
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scroll });
  notes[0].click();
  expect(scroll).toHaveBeenCalledWith({ block: 'center', behavior: 'instant' });
  expect(document.activeElement).toBe(notes[1]);
  expect(notes[1].parentElement!.classList.contains('is-flash')).toBe(true);
  notes[1].click();
  expect(document.activeElement).toBe(notes[0]);
});

it('finds code moved to another file, even re-indented, once both files are shown', () => {
  const finder = new MoveFinder();
  const from = file('src/limits.ts');
  const before = rendered(from, `import { a } from 'a';\n${helper}`, "import { a } from 'a';\n");
  expect(finder.add(from, before)).toEqual([]);
  const to = file('src/quota/index.ts', 'renamed', 'src/quota.ts');
  const after = rendered(to, 'export const x = 1;\n', `export const x = 1;\nexport class Quota {\n${helper.replace(/^/gm, '  ').trimEnd()}\n}\n`);
  const [move] = finder.add(to, after);
  expect([move.from.ref, move.to.ref]).toEqual([from, to]);
  showMove(move);
  expect([...document.querySelectorAll('.mr-move-link')].map((note) => note.textContent)).toEqual([
    'Moved to src/quota/index.ts, line 3',
    'Moved from src/limits.ts, old line 2',
  ]);
});

it('reads a move with a line edited on the way as one move, leaving the edit as a change', () => {
  const ref = file('src/limits.ts');
  const body = (middle: string) =>
    `function quota(client) {\n  const used = usage.get(client) ?? 0;\n  const spare = limit - used;\n${middle}\n  log.debug('quota checked');\n  metrics.count('quota');\n  return spare;\n}\n`;
  const r = rendered(ref, `${body('  audit(client);')}${stay}`, `${stay}${body('  audit(client, spare);')}`);
  const moves = new MoveFinder().add(ref, r);
  expect(moves).toHaveLength(1);
  showMove(moves[0]);
  const edited = r.blocks.filter((block) => block.head?.text === '  audit(client, spare);' || block.base?.text === '  audit(client);');
  expect(edited.map((block) => [block.kind, 'mrMoved' in block.el.dataset])).toEqual([
    ['removed', false],
    ['added', false],
  ]);
  expect(r.content.querySelectorAll('.mr-move-note')).toHaveLength(2);
});

it('does not call short, common or blank runs a move', () => {
  const finder = new MoveFinder();
  const ref = file('src/a.ts');
  // Two lines are not enough, braces and blank lines say nothing, and a line found everywhere is no evidence.
  const short = rendered(ref, 'first(alpha);\nsecond(beta);\nx();\n', 'x();\nfirst(alpha);\nsecond(beta);\n');
  expect(finder.add(ref, short)).toEqual([]);
  const braces = rendered(file('src/b.ts'), '}\n\n}\n\n}\nx();\n', 'x();\n}\n\n}\n\n}\n');
  expect(finder.add(file('src/b.ts'), braces)).toEqual([]);
  const common = 'return result;\nreturn result;\nreturn result;\n';
  const everywhere = rendered(file('src/c.ts'), `${common.repeat(15)}keep();\n`, `keep();\n${common.repeat(15)}`);
  expect(finder.add(file('src/c.ts'), everywhere)).toEqual([]);
  const huge = rendered(file('src/d.ts'), 'a\n', 'b\n');
  huge.blocks.push(...Array.from({ length: 10_001 }, () => huge.blocks[0]));
  expect(finder.add(file('src/d.ts'), huge)).toEqual([]);
});

it('keeps separate moves apart, and puts a note outside a formatted comment', () => {
  const ref = file('src/limits.ts');
  const first = 'function first() {\n  return alpha.compute();\n  // done\n}\n';
  const second = 'function second() {\n  return beta.compute();\n  // done\n}\n';
  const filler = 'one();\ntwo();\nthree();\nfour();\nfive();\nsix();\n';
  const r = rendered(ref, `${first}${filler}${second}tail();\n`, `tail();\n${second}${filler}${first}`);
  const moves = new MoveFinder().add(ref, r);
  expect(moves.map((move) => lines(move.from)[0])).toEqual(['function first() {', 'function second() {']);
  // A comment shown as a formatted note carries its rows inside; the move note goes before the whole card.
  const card = document.createElement('section');
  card.className = 'mr-source-comment';
  moves[0].to.rows[0].el.before(card);
  card.append(moves[0].to.rows[0].el);
  showMove(moves[0]);
  expect(card.previousElementSibling!.classList.contains('mr-move-note')).toBe(true);
});

it('takes the longest of several matches, with the short lines around it but no blank line at either end', () => {
  const finder = new MoveFinder();
  const partial = 'function quota(client) {\n  const used = usage.get(client) ?? 0;\n  return 0;\n}\n';
  const old = file('src/old.ts', 'removed');
  finder.add(old, rendered(old, `${partial}\ny();\n${helper}\n${partial}`, ''));
  const target = file('src/new.ts');
  const [move] = finder.add(target, rendered(target, 'keep();\nend();\n', `keep();\n\ny();\n${helper}\nend();\n`));
  expect(lines(move.from)).toEqual(['y();', ...helper.trimEnd().split('\n')]);
  expect(move.from.rows[0].base!.lines[0]).toBe(5);
});
