import type { Op } from './worddiff.ts';

/** Containers whose whitespace-only text children must never receive inline markup. */
const STRUCTURAL = new Set(['TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'UL', 'OL', 'DL', 'COLGROUP']);

export function textNodes(root: Node): Text[] {
  const out: Text[] = [];
  const walk = (node: Node) => {
    for (let c = node.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) out.push(c as Text);
      else if (c.nodeType === 1) walk(c);
    }
  };
  walk(root);
  return out;
}

export function plainText(root: Node): string {
  return textNodes(root)
    .map((t) => t.data)
    .join('');
}

interface Deletion {
  at: number;
  text: string;
  node: number;
}

/**
 * Mark a word diff inside already-rendered HTML: inserted text is wrapped in `<ins class="mr-ins">`
 * and removed text is put back as `<del class="mr-del">`. Inline formatting (links, bold, code) of
 * the new version is preserved because only text nodes are split.
 *
 * Returns false (and leaves the DOM untouched) if `ops` does not describe this element's text.
 */
export function applyOps(root: Element, ops: Op[]): boolean {
  const doc = root.ownerDocument;
  const nodes = textNodes(root);
  const starts: number[] = [];
  let total = 0;
  for (const n of nodes) {
    starts.push(total);
    total += n.data.length;
  }

  const after = ops
    .filter((op) => op.type !== 'del')
    .map((op) => op.text)
    .join('');
  if (after.length !== total || after !== nodes.map((n) => n.data).join('')) return false;

  const inserts: Array<[number, number]> = [];
  const pending: Array<{ at: number; text: string }> = [];
  let pos = 0;
  for (const op of ops) {
    if (op.type === 'eq') pos += op.text.length;
    else if (op.type === 'ins') {
      if (op.text.trim()) inserts.push([pos, pos + op.text.length]);
      pos += op.text.length;
    } else if (op.text.trim()) pending.push({ at: pos, text: op.text });
  }

  // Attach each deletion to the text node it sits in; at a boundary prefer the following node,
  // unless that node is layout whitespace (between table rows, list items…).
  const deletions: Deletion[] = [];
  for (const d of pending) {
    let k = nodes.findIndex((n, i) => d.at >= starts[i] && d.at < starts[i] + n.data.length);
    if (k === -1) k = nodes.length - 1;
    const parent = nodes[k]?.parentNode?.nodeName ?? '';
    if (k > 0 && STRUCTURAL.has(parent) && !nodes[k].data.trim()) k--;
    if (k === -1) {
      const del = doc.createElement('del');
      del.className = 'mr-del';
      del.textContent = d.text;
      root.append(del);
      continue;
    }
    deletions.push({ ...d, node: k, at: Math.min(Math.max(d.at, starts[k]), starts[k] + nodes[k].data.length) });
  }

  nodes.forEach((node, k) => {
    const start = starts[k];
    const text = node.data;
    const end = start + text.length;
    const ins = inserts.filter(([s, e]) => s < end && e > start);
    const dels = deletions.filter((d) => d.node === k);
    if (!ins.length && !dels.length) return;

    const cuts = new Set<number>([0, text.length]);
    for (const [s, e] of ins) {
      cuts.add(Math.max(s - start, 0));
      cuts.add(Math.min(e - start, text.length));
    }
    for (const d of dels) cuts.add(d.at - start);
    const points = [...cuts].sort((a, b) => a - b);

    const frag = doc.createDocumentFragment();
    points.forEach((p, i) => {
      for (const d of dels) {
        if (d.at - start !== p) continue;
        const del = doc.createElement('del');
        del.className = 'mr-del';
        del.textContent = d.text;
        frag.append(del);
      }
      const q = points[i + 1];
      if (q === undefined || q <= p) return;
      const piece = text.slice(p, q);
      if (ins.some(([s, e]) => s - start <= p && e - start >= q) && piece.trim()) {
        // Keep surrounding spaces outside the highlight; only the words get marked.
        const [, lead, core, trail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(piece)!;
        const el = doc.createElement('ins');
        el.className = 'mr-ins';
        el.textContent = core;
        if (lead) frag.append(doc.createTextNode(lead));
        frag.append(el);
        if (trail) frag.append(doc.createTextNode(trail));
      } else {
        frag.append(doc.createTextNode(piece));
      }
    });
    node.replaceWith(frag);
  });
  return true;
}
