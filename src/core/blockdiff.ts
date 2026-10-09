import { boundedDiff } from './limits.ts';
import type { Unit } from './markdown.ts';

export type ChangeKind = 'same' | 'added' | 'removed' | 'modified';

export interface BlockChange {
  kind: ChangeKind;
  base?: Unit;
  head?: Unit;
}

/** Two blocks this similar (0–1) are treated as one edited block rather than a delete plus an insert. */
const PAIR_THRESHOLD = 0.35;
/** How far ahead to look for an edited counterpart, so pairing stays in document order. */
const PAIR_WINDOW = 8;

function words(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[\p{L}\p{N}_]+/gu) ?? []);
}

/** Dice coefficient over the words of two blocks. */
export function similarity(a: string, b: string): number {
  const wa = words(a);
  const wb = words(b);
  if (!wa.size && !wb.size) return a === b ? 1 : 0;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  return (2 * shared) / (wa.size + wb.size);
}

function pairRun(removed: Unit[], added: Unit[], out: BlockChange[]): void {
  let next = 0;
  for (const r of removed) {
    let match = -1;
    let best = 0;
    for (let k = next; k < Math.min(added.length, next + PAIR_WINDOW); k++) {
      const a = added[k];
      if (a.kind !== r.kind || (a.kind === 'heading' && a.level !== r.level && similarity(a.text, r.text) < 0.8)) continue;
      const score = similarity(r.text, a.text);
      if (score >= PAIR_THRESHOLD && score > best) {
        best = score;
        match = k;
      }
    }
    if (match === -1) {
      out.push({ kind: 'removed', base: r });
      continue;
    }
    for (; next < match; next++) out.push({ kind: 'added', head: added[next] });
    out.push({ kind: 'modified', base: r, head: added[match] });
    next = match + 1;
  }
  for (; next < added.length; next++) out.push({ kind: 'added', head: added[next] });
}

/**
 * Block-level diff of two documents. Units are compared by normalised source text, then each
 * run of deletions/insertions is paired up by similarity so small edits show up as edits.
 */
export function diffUnits(base: Unit[], head: Unit[]): BlockChange[] {
  const parts = boundedDiff(
    base.map((u) => u.key),
    head.map((u) => u.key),
  );
  const out: BlockChange[] = [];
  let bi = 0;
  let hi = 0;
  let removed: Unit[] = [];
  let added: Unit[] = [];
  const flush = () => {
    if (removed.length || added.length) pairRun(removed, added, out);
    removed = [];
    added = [];
  };
  for (const part of parts) {
    const count = part.count;
    if (part.removed) {
      for (let k = 0; k < count; k++) removed.push(base[bi + k]);
      bi += count;
    } else if (part.added) {
      for (let k = 0; k < count; k++) added.push(head[hi + k]);
      hi += count;
    } else {
      flush();
      for (let k = 0; k < count; k++) out.push({ kind: 'same', base: base[bi + k], head: head[hi + k] });
      bi += count;
      hi += count;
    }
  }
  flush();
  return out;
}

export interface ChangeSummary {
  added: number;
  removed: number;
  modified: number;
}

export function summarize(changes: BlockChange[]): ChangeSummary {
  const s: ChangeSummary = { added: 0, removed: 0, modified: 0 };
  for (const c of changes) if (c.kind !== 'same') s[c.kind]++;
  return s;
}
