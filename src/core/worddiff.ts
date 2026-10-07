import { boundedDiff } from './limits.ts';

export type OpType = 'eq' | 'ins' | 'del';

export interface Op {
  type: OpType;
  text: string;
}

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'word' }) : null;

/** Split text into words, spaces and punctuation. Intl.Segmenter also handles CJK and other scripts. */
export function tokenize(text: string): string[] {
  if (segmenter) return Array.from(segmenter.segment(text), (s) => s.segment);
  return text.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu) ?? [];
}

/** Collapse runs: consecutive equal text is joined, and each run of edits becomes one deletion followed by one insertion. */
function merge(ops: Op[]): Op[] {
  const out: Op[] = [];
  let del = '';
  let ins = '';
  const flush = () => {
    if (del) out.push({ type: 'del', text: del });
    if (ins) out.push({ type: 'ins', text: ins });
    del = '';
    ins = '';
  };
  for (const op of ops) {
    if (op.type === 'del') del += op.text;
    else if (op.type === 'ins') ins += op.text;
    else if (op.text) {
      flush();
      const last = out[out.length - 1];
      if (last?.type === 'eq') last.text += op.text;
      else out.push({ type: 'eq', text: op.text });
    }
  }
  flush();
  return out;
}

function editLength(ops: Op[], from: number, step: 1 | -1): number {
  let n = 0;
  for (let i = from; i >= 0 && i < ops.length && ops[i].type !== 'eq'; i += step) n = Math.max(n, ops[i].text.length);
  return n;
}

/**
 * Semantic cleanup in the spirit of diff-match-patch: a short unchanged fragment squeezed between
 * two edits ("a", "the", ", ") is folded into them, so rewrites read as phrases, not confetti.
 */
function cleanup(ops: Op[]): Op[] {
  let out = merge(ops);
  for (let changed = true; changed; ) {
    changed = false;
    for (let i = 1; i < out.length - 1; i++) {
      const op = out[i];
      if (op.type !== 'eq' || out[i - 1].type === 'eq' || out[i + 1].type === 'eq') continue;
      const trivial = !op.text.trim() || op.text.length <= Math.min(editLength(out, i - 1, -1), editLength(out, i + 1, 1), 12);
      if (!trivial) continue;
      out.splice(i, 1, { type: 'del', text: op.text }, { type: 'ins', text: op.text });
      out = merge(out);
      changed = true;
      break;
    }
  }
  return out;
}

/**
 * Folding can leave identical words or spaces at both ends of a deletion/insertion pair
 * ("␣and runbooks␣" → ", runbooks and…␣"). Move them back out as unchanged text, whole tokens only,
 * so words are never split into letter-level edits.
 */
function factor(ops: Op[]): Op[] {
  const out: Op[] = [];
  for (let i = 0; i < ops.length; i++) {
    const del = ops[i];
    const ins = ops[i + 1];
    if (del.type !== 'del' || ins?.type !== 'ins') {
      out.push(del);
      continue;
    }
    i++;
    const a = tokenize(del.text);
    const b = tokenize(ins.text);
    let pre = 0;
    while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
    let suf = 0;
    while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
    if (pre) out.push({ type: 'eq', text: a.slice(0, pre).join('') });
    const removed = a.slice(pre, a.length - suf).join('');
    const added = b.slice(pre, b.length - suf).join('');
    if (removed) out.push({ type: 'del', text: removed });
    if (added) out.push({ type: 'ins', text: added });
    if (suf) out.push({ type: 'eq', text: a.slice(a.length - suf).join('') });
  }
  return merge(out);
}

export function wordDiff(before: string, after: string): Op[] {
  const parts = boundedDiff(tokenize(before), tokenize(after));
  return factor(
    cleanup(parts.map((p): Op => ({ type: p.added ? 'ins' : p.removed ? 'del' : 'eq', text: p.value.join('') }))),
  );
}

/** Share of the text that changed, ignoring whitespace (0 = identical, 1 = completely rewritten). */
export function changeRatio(ops: Op[]): number {
  let changed = 0;
  let total = 0;
  for (const op of ops) {
    const len = op.text.replace(/\s+/g, '').length;
    if (op.type === 'eq') total += 2 * len;
    else {
      changed += len;
      total += len;
    }
  }
  return total ? changed / total : 0;
}

export function hasVisibleChange(ops: Op[]): boolean {
  return ops.some((op) => op.type !== 'eq' && op.text.trim() !== '');
}
