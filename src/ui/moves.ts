import type { DocRef } from '../platforms/types.ts';
import type { RenderedBlock, RenderedDoc } from './render.ts';

/** One changed line of a source file, by its number in its own version. */
interface Line {
  file: File;
  block: RenderedBlock;
  number: number;
  text: string;
  used: boolean;
  /** Unchanged lines before it in its file: lines with the same count belong to one change. */
  hunk: number;
}

interface File {
  ref: DocRef;
  removed: Map<number, Line>;
  added: Map<number, Line>;
}

interface Run {
  removed: Line[];
  added: Line[];
}

/** Code removed in one place and added in another: the rows at each end, in order. */
export interface Move {
  from: { ref: DocRef; rows: RenderedBlock[] };
  to: { ref: DocRef; rows: RenderedBlock[] };
}

/** Less is too likely to match by chance. Braces and blank lines join a run but do not count, since the diff
 * often pairs a moved block's closing brace with another block's. */
const MIN_DISTINCTIVE = 2;
const MIN_CHARACTERS = 40;
/** A line this common cannot say where code came from. */
const MAX_CANDIDATES = 40;
/** Two runs this close, between the same files, are one move with a few lines edited on the way. */
const MAX_GAP = 4;
const MAX_ROWS = 10_000;

const distinctive = (text: string) => text.length >= 6 && /\w/.test(text);

/**
 * Pairs removed and added lines across every source file shown so far. Indentation is ignored, so code
 * moved into a block or out of one still matches; lines changed on the way stay ordinary changes.
 */
export class MoveFinder {
  private readonly lines = { removed: new Map<string, Line[]>(), added: new Map<string, Line[]>() };
  private readonly order: File[] = [];

  /** Indexes a newly shown file and returns the moves it completes, within itself or with a file shown before. */
  add(ref: DocRef, r: RenderedDoc): Move[] {
    if (r.blocks.length > MAX_ROWS) return [];
    const file: File = { ref, removed: new Map(), added: new Map() };
    this.order.push(file);
    let hunk = 0;
    // Files are indexed as they render, before any comment becomes a note, so every block is a code row.
    for (const block of r.blocks) {
      if (block.kind === 'same') {
        hunk++;
        continue;
      }
      const side = block.kind === 'removed' ? 'removed' : 'added';
      const unit = (side === 'removed' ? block.base : block.head)!;
      const line: Line = { file, block, number: unit.lines[0], text: unit.text.trim(), used: false, hunk };
      file[side].set(line.number, line);
      const same = this.lines[side].get(line.text);
      if (same) same.push(line);
      else this.lines[side].set(line.text, [line]);
    }
    const runs: Run[] = [];
    for (const side of ['removed', 'added'] as const)
      for (const line of file[side].values()) {
        const run = this.match(line, side);
        if (run) runs.push(run);
      }
    return this.group(runs);
  }

  private match(line: Line, side: 'removed' | 'added'): Run | null {
    if (line.used || !distinctive(line.text)) return null;
    const candidates = this.lines[side === 'removed' ? 'added' : 'removed'].get(line.text)?.filter((other) => !other.used) ?? [];
    if (!candidates.length || candidates.length > MAX_CANDIDATES) return null;
    let best: Run | null = null;
    for (const other of candidates) {
      const [from, to] = side === 'removed' ? [line, other] : [other, line];
      // Within one change, the same text removed and added is an edit in place (re-indented, say), not a move.
      if (from.file === to.file && from.hunk === to.hunk) continue;
      const run: Run = { removed: [from], added: [to] };
      for (const step of [-1, 1]) {
        for (let k = 1; ; k++) {
          const removed = from.file.removed.get(from.number + step * k);
          const added = to.file.added.get(to.number + step * k);
          if (!removed || !added || removed.used || added.used || removed.text !== added.text) break;
          run.removed[step < 0 ? 'unshift' : 'push'](removed);
          run.added[step < 0 ? 'unshift' : 'push'](added);
        }
      }
      // Blank lines can join a run but never start or end one.
      while (!run.removed[0].text) {
        run.removed.shift();
        run.added.shift();
      }
      while (!run.removed.at(-1)!.text) {
        run.removed.pop();
        run.added.pop();
      }
      const evidence = run.removed.filter((row) => distinctive(row.text));
      if (evidence.length < MIN_DISTINCTIVE || evidence.reduce((sum, row) => sum + row.text.length, 0) < MIN_CHARACTERS) continue;
      if (!best || run.removed.length > best.removed.length) best = run;
    }
    if (best) for (const row of [...best.removed, ...best.added]) row.used = true;
    return best;
  }

  /** Runs between the same two files, a few lines apart at both ends, are one move edited on the way. */
  private group(runs: Run[]): Move[] {
    const rank = (file: File) => this.order.indexOf(file);
    runs.sort(
      (a, b) => rank(a.removed[0].file) - rank(b.removed[0].file) || rank(a.added[0].file) - rank(b.added[0].file) || a.removed[0].number - b.removed[0].number,
    );
    const moves: Run[] = [];
    for (const run of runs) {
      const last = moves.at(-1);
      const gap = (a: Line[], b: Line[]) => b[0].number - a.at(-1)!.number;
      if (
        last &&
        last.removed[0].file === run.removed[0].file &&
        last.added[0].file === run.added[0].file &&
        gap(last.removed, run.removed) > 0 &&
        gap(last.removed, run.removed) <= MAX_GAP &&
        gap(last.added, run.added) > 0 &&
        gap(last.added, run.added) <= MAX_GAP
      ) {
        last.removed.push(...run.removed);
        last.added.push(...run.added);
      } else moves.push(run);
    }
    return moves.map(({ removed, added }) => ({
      from: { ref: removed[0].file.ref, rows: removed.map((line) => line.block) },
      to: { ref: added[0].file.ref, rows: added.map((line) => line.block) },
    }));
  }
}

/** "line 40", "src/quota.ts, old line 12": where the other end is, from this end. */
function place(here: DocRef, there: DocRef, row: RenderedBlock, side: 'base' | 'head'): string {
  const line = `${side === 'base' ? 'old ' : ''}line ${row[side]!.lines[0] + 1}`;
  return here === there ? line : `${side === 'base' ? there.oldPath : there.path}, ${line}`;
}

/** Moved rows get a calm tint of their own, and each end a note that goes to the other. */
export function showMove({ from, to }: Move): void {
  for (const row of [...from.rows, ...to.rows]) row.el.dataset.mrMoved = '';
  const note = (at: RenderedBlock, label: string) => {
    const doc = at.el.ownerDocument;
    const box = doc.createElement('div');
    box.className = 'mr-move-note';
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'mr-move-link';
    button.textContent = label;
    box.append(button);
    // Comment rows shown as a formatted note keep the move note outside it, where it is always visible.
    (at.el.closest<HTMLElement>('.mr-source-comment') ?? at.el).before(box);
    return { box, button };
  };
  const away = note(from.rows[0], `Moved to ${place(from.ref, to.ref, to.rows[0], 'head')}`);
  const here = note(to.rows[0], `Moved from ${place(to.ref, from.ref, from.rows[0], 'base')}`);
  const go = (target: typeof away) => {
    target.box.scrollIntoView({ block: 'center', behavior: 'instant' });
    target.button.focus({ preventScroll: true });
    target.box.classList.remove('is-flash');
    void target.box.offsetWidth;
    target.box.classList.add('is-flash');
  };
  away.button.addEventListener('click', () => go(here));
  here.button.addEventListener('click', () => go(away));
}
