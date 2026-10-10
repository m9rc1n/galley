import type { DocContents, DocRef } from '../platforms/types.ts';
import type { RenderedBlock, RenderedDoc } from './render.ts';
import type { SymbolDefinition } from './spec-frame.ts';
import { hostFor } from './sandbox.ts';
import { parser } from './specs.ts';

const KINDS = ['function', 'class', 'method', 'interface', 'type', 'enum'];

/** Frame replies supply structure, never HTML or replacement source. */
function symbols(value: unknown, lines: number): value is SymbolDefinition[] {
  return (
    Array.isArray(value) &&
    value.length <= 1_000 &&
    value.every(
      (item: SymbolDefinition | null) =>
        item &&
        KINDS.includes(item.kind) &&
        typeof item.name === 'string' &&
        item.name.length <= 200 &&
        typeof item.parent === 'string' &&
        item.parent.length <= 200 &&
        Number.isInteger(item.start) &&
        Number.isInteger(item.end) &&
        item.start >= 0 &&
        item.end >= item.start &&
        item.end < lines,
    )
  );
}

type Status = 'Added' | 'Edited' | 'Moved' | 'Removed';

interface Entry {
  symbol: SymbolDefinition;
  old?: SymbolDefinition;
  /** The source rows that changed inside it, in order. */
  changed: RenderedBlock[];
  status: Status;
}

function element(doc: Document, tag: string, className: string, text?: string): HTMLElement {
  const el = doc.createElement(tag);
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

const isRow = (block: RenderedBlock) => block.el.classList.contains('mr-code-line');
const within = (block: RenderedBlock, side: 'base' | 'head', symbol: SymbolDefinition) => {
  const line = block[side]?.lines[0];
  return line !== undefined && line >= symbol.start && line <= symbol.end;
};
const statusOf = (changed: RenderedBlock[], otherwise: Status): Status => (changed.every((block) => 'mrMoved' in block.el.dataset) ? 'Moved' : otherwise);

/** Pair each declaration with its old version by name, then a renamed one by an unchanged line they share. */
function entries(r: RenderedDoc, base: SymbolDefinition[], head: SymbolDefinition[]): { list: Entry[]; other: RenderedBlock[] } {
  const rows = r.blocks.filter(isRow);
  const unused = new Set(base);
  const list: Entry[] = [];
  const same = (a: SymbolDefinition, b: SymbolDefinition) => a.kind === b.kind && a.parent === b.parent;
  for (const symbol of head) {
    const candidates = [...unused].filter((old) => same(old, symbol));
    const old =
      candidates.find((old) => old.name === symbol.name) ??
      candidates.find((old) =>
        rows.some((block) => block.kind === 'same' && within(block, 'head', symbol) && within(block, 'base', old) && /\w{3}/.test(block.head!.text)),
      );
    if (old) unused.delete(old);
    const changed = rows.filter((block) => block.kind !== 'same' && (within(block, 'head', symbol) || (old !== undefined && within(block, 'base', old))));
    // A declaration counts only where its lines changed, so one the parser reads differently in each version is no change.
    if (changed.length) list.push({ symbol, old, changed, status: statusOf(changed, old ? 'Edited' : 'Added') });
  }
  for (const symbol of unused) {
    const changed = rows.filter((block) => block.kind === 'removed' && within(block, 'base', symbol));
    if (changed.length) list.push({ symbol, changed, status: statusOf(changed, 'Removed') });
  }
  const other = rows.filter(
    (block) => block.kind !== 'same' && !head.some((symbol) => within(block, 'head', symbol)) && !base.some((symbol) => within(block, 'base', symbol)),
  );
  // Source order: by the first line that changed.
  const order = new Map(r.blocks.map((block, index) => [block, index]));
  list.sort((a, b) => order.get(a.changed[0])! - order.get(b.changed[0])!);
  return { list, other };
}

/** The declaration's name; a renamed one shows the rename the way a document shows an edit. */
function nameOf(doc: Document, entry: Entry): HTMLElement {
  const name = element(doc, 'span', 'mr-spec-name');
  if (!entry.old || entry.old.name === entry.symbol.name) name.textContent = entry.symbol.name;
  else name.append(element(doc, 'del', 'mr-del', entry.old.name), element(doc, 'ins', 'mr-ins', entry.symbol.name));
  return name;
}

/** Goes to the first line that changed, or to the formatted comment holding it. */
function link(doc: Document, rows: RenderedBlock[], status: Status, depth: number): HTMLButtonElement {
  const button = element(doc, 'button', 'mr-spec-link') as HTMLButtonElement;
  button.type = 'button';
  button.dataset.status = status.toLowerCase();
  button.style.setProperty('--spec-depth', String(depth));
  if (status === 'Removed') button.classList.add('is-removed');
  button.addEventListener('click', () => {
    const target = rows[0].el.closest<HTMLElement>('.mr-source-comment') ?? rows[0].el;
    target.scrollIntoView({ block: 'center', behavior: 'instant' });
    target.classList.remove('is-flash');
    void target.offsetWidth;
    target.classList.add('is-flash');
  });
  return button;
}

const plans = new WeakMap<RenderedDoc, { base: SymbolDefinition[]; head: SymbolDefinition[] }>();

/**
 * A short map of a source file's changes above its code: which functions, classes and types changed and
 * how, each a link to its first changed line. Files with a single change go without one.
 */
export function presentSymbols(r: RenderedDoc, base: SymbolDefinition[], head: SymbolDefinition[]): void {
  plans.set(r, { base, head });
  r.content.querySelector(':scope > .mr-symbol-plan')?.remove();
  const doc = r.content.ownerDocument;
  const { list, other } = entries(r, base, head);
  // A class changed only through its methods is their heading, not a change of its own to count.
  const counted = list.filter((entry) => !(entry.symbol.kind === 'class' && list.some((member) => member.symbol.parent === entry.symbol.name)));
  if (counted.length + (other.length ? 1 : 0) < 2) return;
  const plan = element(doc, 'nav', 'mr-spec-plan mr-symbol-plan');
  plan.setAttribute('aria-label', 'Changes in this file');
  plan.append(
    element(doc, 'p', 'mr-spec-kicker', 'In this file'),
    element(doc, 'p', 'mr-spec-summary', `${counted.length} declaration${counted.length === 1 ? '' : 's'} changed`),
  );
  const counts = element(doc, 'p', 'mr-spec-counts');
  for (const status of ['Added', 'Edited', 'Moved', 'Removed']) {
    const count = counted.filter((entry) => entry.status === status).length;
    if (count) counts.append(element(doc, 'span', `mr-spec-count is-${status.toLowerCase()}`, `${count} ${status.toLowerCase()}`));
  }
  const outline = element(doc, 'div', 'mr-spec-outline');
  for (const entry of list) {
    const button = link(doc, entry.changed, entry.status, entry.symbol.parent ? 1 : 0);
    button.append(
      element(doc, 'span', 'mr-symbol-kind', entry.symbol.kind),
      nameOf(doc, entry),
      element(doc, 'span', `mr-spec-status is-${entry.status.toLowerCase()}`, entry.status),
    );
    outline.append(button);
  }
  if (other.length) {
    // In a new or deleted file, the lines outside declarations were simply added or removed.
    const kind = other.every((block) => block.kind === other[0].kind) ? other[0].kind : 'edited';
    const status = statusOf(other, kind === 'added' ? 'Added' : kind === 'removed' ? 'Removed' : 'Edited');
    const button = link(doc, other, status, 0);
    button.append(
      element(doc, 'span', 'mr-symbol-kind', 'other'),
      element(doc, 'span', 'mr-spec-name', 'Outside declarations'),
      element(doc, 'span', `mr-spec-status is-${status.toLowerCase()}`, status),
    );
    outline.append(button);
  }
  plan.append(counts, outline);
  r.content.prepend(plan);
}

/** Moves found after the plan was drawn (in a file shown later) change what it says. */
export function refreshSymbols(r: RenderedDoc): void {
  const plan = plans.get(r);
  if (plan) presentSymbols(r, plan.base, plan.head);
}

export async function enhanceSymbols(r: RenderedDoc, ref: DocRef, contents: DocContents): Promise<void> {
  if (
    !/\.[cm]?[jt]sx?$/i.test(ref.path) ||
    r.content.classList.contains('mr-spec-file') ||
    Math.max(contents.base.length, contents.head.length) > 200_000 ||
    r.blocks.length > 10_000
  )
    return;
  try {
    const reply = await parser.request(hostFor(r.content), { ...contents, jsx: /\.[jt]sx$/i.test(ref.path), symbols: true });
    if (!r.content.isConnected) return;
    if (!symbols(reply.base, contents.base.split('\n').length) || !symbols(reply.head, contents.head.split('\n').length)) return;
    presentSymbols(r, reply.base, reply.head);
  } catch {
    // The source view is already complete; the map is an extra.
  }
}
