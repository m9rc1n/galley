import { commentLines } from './code.ts';
import { filterDocument } from './reading.ts';
import { renderDocument, type RenderedBlock, type RenderedDoc, type RenderInput } from './render.ts';
import type { Unit } from '../core/markdown.ts';

/** Remove comment delimiters without removing lines, so Markdown offsets still map to source. */
export function commentText(rows: RenderedBlock[], side: 'base' | 'head'): { text: string; start: number } {
  const units = rows.flatMap((row) => (row[side] ? [row[side]!] : []));
  let block = false;
  const lines = units.map(({ source }) => {
    let text = source.trim();
    if (!block && text.startsWith('/*')) {
      block = true;
      text = text.replace(/^\/\*+ ?/, '');
    } else if (block) text = text.replace(/^\*(?!\/) ?/, '');
    else text = text.replace(/^(?:\/\/\/?|#|--|;|<!--) ?/, '');
    if (block && text.endsWith('*/')) {
      text = text.slice(0, -2).trimEnd();
      block = false;
    }
    return text.replace(/ ?-->$/, '');
  });
  return { text: lines.join('\n'), start: units[0]?.lines[0] ?? 0 };
}

/** Formatted notes or the comment lines as written (Reading settings → Review → Code comments). Both keep the same source and posting targets. */
export function showCommentSource(r: RenderedDoc, source: boolean): void {
  r.content.classList.toggle('is-comment-source', source);
  for (const view of r.content.querySelectorAll<HTMLElement>('[data-mr-comment-view]')) view.hidden = (view.dataset.mrCommentView === 'source') !== source;
  filterDocument(r, r.content.dataset.mrScope === 'changed');
  r.content.dispatchEvent(new r.content.ownerDocument.defaultView!.Event('galley:code-view', { bubbles: true }));
}

/** Standalone comment runs become small Markdown articles. Original diff rows stay available. */
export function renderSourceComments(r: RenderedDoc, input: RenderInput): boolean {
  const container = r.content.querySelector<HTMLElement>('[data-mr-code="done"]');
  const classified = container && commentLines(container);
  if (!classified || r.content.dataset.mrComments || r.blocks.length > 10_000 || Math.max(input.base.length, input.head.length) > 200_000) return false;
  r.content.dataset.mrComments = 'done';
  const runs: RenderedBlock[][] = [];
  let run: RenderedBlock[] | undefined;
  for (const row of r.blocks) {
    const standalone = (!row.base || classified.base.has(row.base.lines[0])) && (!row.head || classified.head.has(row.head.lines[0]));
    if (!standalone) {
      run = undefined;
      continue;
    }
    if (!run || run[0].el.parentElement !== row.el.parentElement) {
      run = [];
      runs.push(run);
    }
    run.push(row);
  }
  // A comment that was edited comes out of the diff as removed lines, perhaps some removed code, then the
  // added lines. Read as one note, the edit shows word by word instead of as two separate notes.
  const position = new Map(r.blocks.map((row, index) => [row, index]));
  for (let i = runs.length - 2; i >= 0; i--) {
    const [removed, added] = [runs[i], runs[i + 1]];
    const between = r.blocks.slice(position.get(removed.at(-1)!)! + 1, position.get(added[0])!);
    if (removed.every((row) => !row.head) && added.every((row) => !row.base) && between.every((row) => row.kind !== 'same'))
      runs.splice(i, 2, [...removed, ...added]);
  }
  if (runs.length > 500) return false;
  const doc = r.content.ownerDocument;
  let count = 0;
  for (const rows of runs) {
    const base = commentText(rows, 'base');
    const head = commentText(rows, 'head');
    const note = renderDocument(doc, { ...input, base: base.text, head: head.text });
    if (!note.content.textContent!.trim() || !note.blocks.length) continue;
    const card = doc.createElement('section');
    card.className = 'mr-source-comment';
    const header = doc.createElement('header');
    header.className = 'mr-source-comment-meta';
    const current = rows.flatMap((row) => (row.head ? [row.head] : []));
    const version = current.length ? current : rows.map((row) => row.base!);
    const [first, last] = [version[0].lines[0] + 1, version.at(-1)!.lines[1]];
    const kind = /^\s*\/\*\*/.test(version[0].source) ? 'Doc comment' : 'Comment';
    header.textContent = `${kind} · ${current.length ? '' : 'old '}${first === last ? `line ${first}` : `lines ${first}–${last}`}`;
    const source = doc.createElement('div');
    source.className = 'mr-source-comment-source';
    source.dataset.mrCommentView = 'source';
    source.hidden = true;
    note.content.classList.add('mr-source-comment-body');
    note.content.dataset.mrCommentView = 'reading';
    card.append(header, note.content, source);
    rows[0].el.before(card);
    for (const row of rows) source.append(row.el);
    for (const block of note.blocks) {
      const offset = (unit: Unit, start: number): Unit => ({ ...unit, lines: [unit.lines[0] + start, unit.lines[1] + start] });
      if (block.base) block.base = offset(block.base, base.start);
      if (block.head) block.head = offset(block.head, head.start);
      if (rows.some((row) => row.kind !== 'same' || 'mrSpecContext' in row.el.dataset)) block.el.dataset.mrSpecContext = '';
    }
    if (note.hiddenLines) {
      const hint = doc.createElement('p');
      hint.className = 'mr-source-comment-hint';
      hint.textContent = 'Some comment changes only appear in Source.';
      note.content.append(hint);
    }
    r.blocks.push(...note.blocks);
    r.changes.push(...note.changes);
    r.diagrams.push(...note.diagrams);
    count++;
  }
  if (!count) return false;
  // Linear document order, including both presentations, keeps navigation and selections stable.
  const order = new Map<Element, number>();
  let index = 0;
  for (const el of r.content.querySelectorAll('*')) order.set(el, index++);
  r.blocks.sort((a, b) => order.get(a.el)! - order.get(b.el)!);
  r.changes.sort((a, b) => order.get(a)! - order.get(b)!);
  return true;
}
