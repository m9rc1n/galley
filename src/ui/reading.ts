import type { CommentTarget, DocRef } from '../platforms/types.ts';
import type { RenderedBlock, RenderedDoc } from './render.ts';

const revealed = new WeakMap<RenderedDoc, Set<HTMLElement>>();

/** Hide unchanged blocks, retain relevant headings, and let every gap reveal its own context. */
export function filterDocument(r: RenderedDoc, changedOnly: boolean): void {
  for (const gap of r.content.querySelectorAll('.mr-context-gap')) gap.remove();
  for (const el of r.content.querySelectorAll<HTMLElement>('[hidden]')) el.hidden = false;
  if (!changedOnly) return;
  let expanded = revealed.get(r);
  if (!expanded) revealed.set(r, expanded = new Set());
  const context = new Set<HTMLElement>();
  const headings: RenderedBlock[] = [];
  for (const block of r.blocks) {
    const unit = block.head ?? block.base!;
    if (unit.kind === 'heading' && block.kind !== 'removed') {
      while (headings.length && (headings[headings.length - 1].head?.level ?? 0) >= unit.level) headings.pop();
      headings.push(block);
    }
    if (block.kind !== 'same') for (const heading of headings) context.add(heading.el);
  }
  if (r.lead) context.add(r.lead);
  const gaps: Array<{ blocks: RenderedBlock[]; anchor: HTMLElement; parent: HTMLElement }> = [];
  let previous: typeof gaps[number] | undefined;
  for (const block of r.blocks) {
    // Blocks with review threads stay in view, like changed ones.
    const unchanged = block.kind === 'same' && !context.has(block.el) && !('mrThreads' in block.el.dataset);
    block.el.hidden = unchanged && !expanded.has(block.el);
    if (!unchanged) { previous = undefined; continue; }
    const anchor = block.el.classList.contains('mr-tight') ? block.el.closest('li')! : block.el;
    const parent = anchor.parentElement!;
    if (!previous || previous.parent !== parent) {
      previous = { blocks: [], anchor, parent };
      gaps.push(previous);
    }
    previous.blocks.push(block);
  }
  for (const gap of gaps) {
    const isExpanded = gap.blocks.some((block) => expanded.has(block.el));
    const marker = r.content.ownerDocument.createElement(gap.parent.matches('ul, ol') ? 'li' : 'div');
    marker.className = 'mr-context-gap';
    const button = r.content.ownerDocument.createElement('button');
    button.type = 'button';
    button.className = 'mr-context-toggle';
    button.textContent = `${gap.blocks.length} unchanged ${r.isCode ? gap.blocks.length === 1 ? 'line' : 'lines' : gap.blocks.length === 1 ? 'block' : 'blocks'}`;
    button.setAttribute('aria-label', `${isExpanded ? 'Collapse' : 'Expand'} ${button.textContent}`);
    button.setAttribute('aria-expanded', String(isExpanded));
    button.title = `${isExpanded ? 'Collapse' : 'Expand'} nearby unchanged content`;
    button.addEventListener('click', () => {
      for (const block of gap.blocks) isExpanded ? expanded.delete(block.el) : expanded.add(block.el);
      filterDocument(r, true);
      r.content.dispatchEvent(new r.content.ownerDocument.defaultView!.Event('galley:context', { bubbles: true }));
      r.content.querySelectorAll<HTMLButtonElement>('.mr-context-toggle')[gaps.indexOf(gap)]?.focus({ preventScroll: true });
    });
    marker.append(button);
    gap.parent.insertBefore(marker, gap.anchor);
  }
  // Empty wrappers disappear, except when they contain a context toggle.
  for (const el of [...r.content.querySelectorAll<HTMLElement>('li:not(.mr-context-gap), ul, ol, blockquote, section')].reverse()) {
    const children = r.blocks.filter((block) => el.contains(block.el));
    if (children.length) el.hidden = children.every((block) => block.el.hidden) && !el.querySelector('.mr-context-gap');
    else if (el.matches('section.footnotes')) el.hidden = !r.blocks.some((block) => !block.el.hidden && block.el.querySelector('.footnote-ref'));
  }
  const separator = r.content.querySelector<HTMLElement>('.footnotes-sep');
  if (separator) separator.hidden = r.content.querySelector<HTMLElement>('section.footnotes')?.hidden ?? true;
}

function owner(node: Node, blocks: RenderedBlock[]): RenderedBlock | undefined {
  return blocks.find((block) => block.el === node || block.el.contains(node));
}
function oldText(node: Node, block: RenderedBlock): boolean {
  const el = node.nodeType === 1 ? node as Element : node.parentElement;
  return !block.head || Boolean(el?.closest('del.mr-del, .mr-ghost-row, [data-mr-side="base"]'));
}

export function paragraphTarget(doc: DocRef, block: RenderedBlock, side: 'base' | 'head' = block.head ? 'head' : 'base', quote?: string): CommentTarget | null {
  const unit = side === 'base' ? block.base : block.head;
  if (!unit) return null;
  const clone = block.el.cloneNode(true) as HTMLElement;
  for (const el of clone.querySelectorAll(side === 'head' ? 'del.mr-del, .mr-ghost-row, [data-mr-side="base"]' : 'ins.mr-ins, [data-mr-side="head"]')) el.remove();
  return { doc, side, startLine: unit.lines[0] + 1, endLine: unit.lines[1], quote: quote ?? (unit.kind === 'code' ? unit.source.replace(/\n$/, '') : clone.textContent?.replace(/\s+/g, ' ').trim() ?? '') };
}

/** A selection quotes its exact text and targets the source ranges of its containing blocks. */
export function selectionTarget(doc: DocRef, blocks: RenderedBlock[], range: Range): CommentTarget | null {
  const first = owner(range.startContainer, blocks), last = owner(range.endContainer, blocks);
  if (!first || !last) return null;
  const side = oldText(range.startContainer, first) ? 'base' : 'head';
  if ((oldText(range.endContainer, last) ? 'base' : 'head') !== side) return null;
  const covered = blocks.filter((block) => range.intersectsNode(block.el) && !block.el.closest('[hidden]') && !(block.el.classList.contains('mr-ghost') && block.el.closest('.mode-clean')));
  if (covered.some((block) => !(side === 'base' ? block.base : block.head))) return null;
  if (doc.kind === 'code') {
    // DOM ranges include gutters and concatenate rows. Quote only source text, with its newlines.
    const rows = covered.flatMap((block) => {
      // The whole line: once highlighted, its text is split across token spans. Blank lines count too.
      const text = block.el.querySelector('.mr-code-text');
      if (!text || !range.intersectsNode(block.el)) return [];
      if (!text.textContent) return [{ block, text: '' }];
      const selected = block.el.ownerDocument.createRange();
      selected.selectNodeContents(text);
      if (range.compareBoundaryPoints(0, selected) > 0) selected.setStart(range.startContainer, range.startOffset);
      if (range.compareBoundaryPoints(2, selected) < 0) selected.setEnd(range.endContainer, range.endOffset);
      return selected.collapsed ? [] : [{ block, text: selected.toString().replace(/\u200b/g, '') }];
    });
    if (!rows.length) return null;
    const start = paragraphTarget(doc, rows[0].block, side), end = paragraphTarget(doc, rows[rows.length - 1].block, side);
    if (!start || !end) return null;
    return { ...start, endLine: end.endLine, quote: rows.map((row) => row.text).join('\n') };
  }
  // Inline removed/inserted text across both versions cannot have a single source range.
  const fragment = range.cloneContents();
  if ((side === 'head' && fragment.querySelector('del.mr-del, .mr-ghost-row, [data-mr-side="base"]')) || (side === 'base' && fragment.querySelector('ins.mr-ins, [data-mr-side="head"]'))) return null;
  const start = paragraphTarget(doc, first, side), end = paragraphTarget(doc, last, side);
  if (!start || !end) return null;
  return { ...start, endLine: end.endLine, quote: range.toString().trim() };
}
