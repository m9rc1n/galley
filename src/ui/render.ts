import { mermaidSource, prepareDiagram, type Diagram } from './diagrams.ts';
import { diffArrays } from 'diff';
import DOMPurify from 'dompurify';
import { diffUnits, similarity, type BlockChange } from '../core/blockdiff.ts';
import { applyOps, plainText } from '../core/highlight.ts';
import { normalize, parseDocument, renderUnit, type ParsedDoc, type Unit } from '../core/markdown.ts';
import { resolveHref, type RepoLinks } from '../core/paths.ts';
import { changeRatio, hasVisibleChange, wordDiff } from '../core/worddiff.ts';
import type { DocStatus } from '../platforms/types.ts';

export interface RenderInput {
  path: string;
  status: DocStatus;
  base: string;
  head: string;
  links: RepoLinks;
}

export interface RenderedBlock {
  el: HTMLElement;
  kind: BlockChange['kind'];
  base?: Unit;
  head?: Unit;
}

export interface RenderedDoc {
  diagrams: Diagram[];
  isCode: boolean;
  /** Trusted source mapping; document HTML cannot forge comment targets. */
  blocks: RenderedBlock[];
  /** The article body, sanitised and annotated with change markers. */
  content: HTMLElement;
  /** First element of every run of consecutive changes, in reading order. */
  changes: HTMLElement[];
  stats: { added: number; removed: number; modified: number };
  /** The document's opening `<h1>`, styled as the article title. */
  lead: HTMLElement | null;
  title: string | null;
  description: string | null;
  words: number;
}

/** Above this share of changed text, an edit is shown as "old block removed, new block added". */
const REWRITE_RATIO = 0.6;

/**
 * The only classes that survive sanitising: the ones Galley's own markdown rendering produces.
 * Raw HTML in a document may not borrow anything else (banners, change markers, removed-block
 * styling), so it cannot imitate Galley's interface or hide text. Change markers are added
 * after sanitising and never come from the document.
 */
const RENDERER_CLASSES = new Set([
  'mr-tight',
  'mr-table',
  'mr-html',
  'mr-meta',
  'mr-task',
  'mr-task-item',
  'mr-alert',
  'mr-alert-note',
  'mr-alert-tip',
  'mr-alert-important',
  'mr-alert-warning',
  'mr-alert-caution',
  'footnotes',
  'footnotes-sep',
  'footnotes-list',
  'footnote-item',
  'footnote-ref',
  'footnote-backref',
]);

let purifier: ReturnType<typeof DOMPurify> | null = null;

function sanitize(doc: Document, html: string): DocumentFragment {
  if (!purifier) {
    purifier = DOMPurify(doc.defaultView ?? window);
    purifier.addHook('uponSanitizeAttribute', (_node, data) => {
      if (data.attrName !== 'class') return;
      data.attrValue = data.attrValue
        .split(/\s+/)
        .filter((name) => RENDERER_CLASSES.has(name))
        .join(' ');
      if (!data.attrValue) data.keepAttr = false;
    });
  }
  return purifier.sanitize(html, {
    RETURN_DOM_FRAGMENT: true,
    FORBID_TAGS: ['style', 'form', 'iframe', 'frame', 'frameset', 'object', 'embed', 'base', 'link', 'meta', 'button', 'textarea', 'select'],
    FORBID_ATTR: ['style'],
    // No data-* attributes from documents, except the two Galley renders itself.
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['data-mr-u', 'data-lang'],
  }) as unknown as DocumentFragment;
}

/**
 * Map block ids to elements, accepting only ids stamped with this render's nonce. A copy of the
 * attribute written in raw HTML (to make a decoy stand in for a real block) is removed.
 */
function blocksById(root: HTMLElement, nonce: string): Map<number, HTMLElement> {
  const byId = new Map<number, HTMLElement>();
  for (const el of root.querySelectorAll<HTMLElement>('[data-mr-u]')) {
    const [stamp, id] = (el.dataset.mrU ?? '').split(':');
    if (stamp === nonce && id && !byId.has(Number(id))) byId.set(Number(id), el);
    else el.removeAttribute('data-mr-u');
  }
  return byId;
}

function fragmentFor(doc: Document, unit: Unit, parsed: ParsedDoc): DocumentFragment {
  const frag = sanitize(doc, renderUnit(unit, parsed));
  // Removed headings must not compete with live headings for anchor targets, and removed blocks
  // carry no block ids at all.
  for (const el of frag.querySelectorAll('[id]')) el.removeAttribute('id');
  for (const el of frag.querySelectorAll('[data-mr-u]')) el.removeAttribute('data-mr-u');
  return frag;
}

function mark(el: HTMLElement, kind: 'added' | 'modified' | 'removed', extra?: string): void {
  el.dataset.mrChange = kind;
  if (extra) el.classList.add(extra);
}

/** Build a "removed" block and put it where it used to be, keeping list structure intact. */
function insertGhost(doc: Document, root: HTMLElement, unit: Unit, parsed: ParsedDoc, anchor: Element | null): HTMLElement {
  const frag = fragmentFor(doc, unit, parsed);
  const anchorItem = anchor?.closest('li') ?? null;
  let ghost: HTMLElement;
  let before: Element | null = anchor;
  if (unit.inList && anchorItem && root.contains(anchorItem)) {
    ghost = doc.createElement('li');
    // A removed list item renders as <p>…</p>; unwrap it so it looks like its siblings.
    const only = frag.firstElementChild;
    if (only?.tagName === 'P' && frag.childElementCount === 1) ghost.append(...only.childNodes);
    else ghost.append(frag);
    before = anchorItem;
  } else {
    ghost = doc.createElement('div');
    ghost.append(frag);
    if (anchorItem && root.contains(anchorItem)) {
      // Not a list item, but the next live block sits in a list: go before the outermost list.
      let list: Element = anchorItem.closest('ul, ol') ?? anchorItem;
      for (let up = list.parentElement?.closest('ul, ol'); up && root.contains(up); up = up.parentElement?.closest('ul, ol')) list = up;
      before = list;
    }
    if (unit.inList) ghost.classList.add('mr-ghost-item');
  }
  ghost.classList.add('mr-ghost');
  ghost.title = 'Removed in this change';
  mark(ghost, 'removed');
  if (before?.parentNode) before.parentNode.insertBefore(ghost, before);
  else root.append(ghost);
  return ghost;
}

/** Code is compared line by line, like a code diff: removed lines above the lines that replaced them. */
function diffCode(doc: Document, pre: HTMLElement, before: string): boolean {
  const code = pre.querySelector('code') ?? pre;
  const lines = (text: string) => text.replace(/\n$/, '').split('\n');
  const parts = diffArrays(lines(before), lines(code.textContent ?? ''));
  if (!parts.some((p) => p.added || p.removed)) return false;
  const frag = doc.createDocumentFragment();
  const total = parts.reduce((n, p) => n + p.value.length, 0);
  let seen = 0;
  for (const part of parts) {
    for (const line of part.value) {
      seen++;
      if (!part.added && !part.removed) {
        // Changed lines are blocks and end their own line; plain lines need an explicit break.
        frag.append(doc.createTextNode(seen < total ? `${line}\n` : line));
        continue;
      }
      const el = doc.createElement(part.added ? 'ins' : 'del');
      el.className = `${part.added ? 'mr-ins' : 'mr-del'} mr-line`;
      el.textContent = line || ' ';
      frag.append(el);
    }
  }
  code.replaceChildren(frag);
  return true;
}

function cells(row: Element): HTMLElement[] {
  return [...row.children].filter((c): c is HTMLElement => c.tagName === 'TD' || c.tagName === 'TH');
}

/** Tables are compared row by row and then cell by cell, so an edit never leaks into a neighbouring cell. */
function diffTable(doc: Document, table: HTMLElement, before: ParentNode): boolean {
  const headRows = [...table.querySelectorAll('tr')];
  const baseRows = [...before.querySelectorAll('tr')];
  if (!headRows.length || !baseRows.length) return false;
  const key = (row: Element) => cells(row).map((c) => normalize(c.textContent ?? '')).join('\u0001');
  const parts = diffArrays(baseRows.map(key), headRows.map(key));

  const ghostRow = (row: Element, anchor: Element | undefined) => {
    const ghost = doc.importNode(row, true) as HTMLElement;
    ghost.classList.add('mr-ghost-row');
    ghost.title = 'Removed in this change';
    if (anchor?.parentNode) anchor.parentNode.insertBefore(ghost, anchor);
    else headRows[headRows.length - 1].parentNode?.append(ghost);
  };
  const diffRow = (row: Element, into: HTMLElement) => {
    const old = cells(row);
    cells(into).forEach((cell, i) => {
      const was = old[i] ? plainText(old[i]) : '';
      if (normalize(was) !== normalize(plainText(cell))) applyOps(cell, wordDiff(was, plainText(cell)));
    });
  };

  let bi = 0;
  let hi = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const count = part.count ?? part.value.length;
    if (!part.added && !part.removed) {
      bi += count;
      hi += count;
      continue;
    }
    // Gather one run of removed + added rows, then pair similar rows as edits.
    let removed: Element[] = [];
    let added: HTMLElement[] = [];
    for (; i < parts.length && (parts[i].added || parts[i].removed); i++) {
      const n = parts[i].count ?? parts[i].value.length;
      if (parts[i].removed) removed = removed.concat(baseRows.slice(bi, (bi += n)));
      else added = added.concat(headRows.slice(hi, (hi += n)));
    }
    i--;
    const anchor = headRows[hi];
    let next = 0;
    for (const row of removed) {
      let match = -1;
      let best = 0;
      for (let k = next; k < Math.min(added.length, next + 6); k++) {
        const score = similarity(row.textContent ?? '', added[k].textContent ?? '');
        if (score >= 0.35 && score > best) {
          best = score;
          match = k;
        }
      }
      if (match === -1) {
        ghostRow(row, added[next] ?? anchor);
        continue;
      }
      for (; next < match; next++) added[next].classList.add('mr-row-added');
      diffRow(row, added[match]);
      next = match + 1;
    }
    for (; next < added.length; next++) added[next].classList.add('mr-row-added');
  }
  return true;
}

function decorate(doc: Document, root: HTMLElement, path: string, links: RepoLinks): Map<HTMLElement, HTMLElement> {
  const replacements = new Map<HTMLElement, HTMLElement>();
  for (const img of root.querySelectorAll('img')) {
    const src = img.getAttribute('src');
    if (src) {
      const r = resolveHref(path, src);
      if (r.type === 'repo') img.setAttribute('src', links.raw(r.path) + r.suffix);
    }
    img.loading = 'lazy';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
  }
  for (const a of root.querySelectorAll('a[href]')) {
    const r = resolveHref(path, a.getAttribute('href') ?? '');
    if (r.type === 'anchor') continue;
    a.setAttribute('href', r.type === 'repo' ? links.blob(r.path) + r.suffix : r.href);
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  }
  // A paragraph holding just one image becomes a figure, captioned with its alt text.
  for (const p of root.querySelectorAll('p')) {
    const img = p.querySelector('img');
    if (!img || p.textContent?.trim() || p.querySelectorAll('img').length !== 1) continue;
    const figure = doc.createElement('figure');
    for (const attr of p.attributes) figure.setAttribute(attr.name, attr.value);
    figure.append(...p.childNodes);
    const alt = img.getAttribute('alt')?.trim();
    if (alt && !/\.(png|jpe?g|gif|svg|webp)$/i.test(alt)) {
      const caption = doc.createElement('figcaption');
      caption.textContent = alt;
      figure.append(caption);
    }
    p.replaceWith(figure);
    replacements.set(p, figure);
  }
  return replacements;
}

function applyChanges(doc: Document, root: HTMLElement, changes: BlockChange[], base: ParsedDoc, nonce: string, blocks: RenderedBlock[]): HTMLElement[] {
  const byId = blocksById(root, nonce);

  // Each removed block goes right before the next block that still exists.
  const anchorFor = new Map<BlockChange, Element | null>();
  let nextHead: Element | null = null;
  for (let i = changes.length - 1; i >= 0; i--) {
    const c = changes[i];
    if (c.head) nextHead = byId.get(c.head.id) ?? nextHead;
    else anchorFor.set(c, nextHead);
  }

  const runs: HTMLElement[] = [];
  let inRun = false;
  const touch = (el: HTMLElement) => {
    if (!inRun) runs.push(el);
    inRun = true;
  };

  for (const change of changes) {
    const live = change.head && byId.get(change.head.id);
    if (live) blocks.push({ el: live, ...change });
    const ghost = (anchor: Element | null) => {
      const el = insertGhost(doc, root, change.base!, base, anchor);
      blocks.push({ el, kind: 'removed', base: change.base });
      return el;
    };
    if (change.kind === 'same') {
      inRun = false;
    } else if (change.kind === 'removed') {
      touch(ghost(anchorFor.get(change) ?? null));
    } else {
      const el = byId.get(change.head!.id);
      if (!el) continue;
      if (change.kind === 'added') {
        mark(el, 'added');
        touch(el);
        continue;
      }
      // Compare against the old block element itself, not the fragment around it (which ends in a newline).
      const frag = fragmentFor(doc, change.base!, base);
      const before = frag.firstElementChild ?? frag;
      if (mermaidSource(change.base) !== null || mermaidSource(change.head) !== null) {
        mark(el, 'modified');
        touch(el);
        continue;
      }
      if ((change.head!.kind === 'code' && diffCode(doc, el, plainText(before))) || (change.head!.kind === 'table' && diffTable(doc, el, before))) {
        mark(el, 'modified');
        touch(el);
        continue;
      }
      const ops = wordDiff(plainText(before), plainText(el));
      if (!hasVisibleChange(ops)) {
        // Only formatting or a link target changed: flag the block without inline marks.
        mark(el, 'modified', 'mr-subtle');
        touch(el);
      } else if (changeRatio(ops) > REWRITE_RATIO || !applyOps(el, ops)) {
        touch(ghost(el));
        mark(el, 'added', 'mr-rewritten');
      } else {
        mark(el, 'modified');
        touch(el);
      }
    }
  }
  return runs;
}

export function renderDocument(doc: Document, input: RenderInput): RenderedDoc {
  const removedDoc = input.status === 'removed';
  const head = parseDocument(removedDoc ? input.base : input.head);
  const root = doc.createElement('div');
  root.className = 'mr-content';
  root.append(sanitize(doc, head.html));
  const words = (plainText(root).match(/[\p{L}\p{N}]+/gu) ?? []).length;

  let changes: HTMLElement[] = [];
  const blocks: RenderedBlock[] = [];
  const stats = { added: 0, removed: 0, modified: 0 };
  if (input.status !== 'added' && !removedDoc) {
    const base = parseDocument(input.base);
    const blockChanges = diffUnits(base.units, head.units);
    changes = applyChanges(doc, root, blockChanges, base, head.nonce, blocks);
    for (const c of blockChanges) if (c.kind !== 'same') stats[c.kind]++;
  } else {
    const byId = blocksById(root, head.nonce);
    for (const unit of head.units) {
      const el = byId.get(unit.id);
      if (!el) continue;
      const kind = removedDoc ? 'removed' : 'added';
      mark(el, kind);
      blocks.push({ el, kind, ...(removedDoc ? { base: unit } : { head: unit }) });
    }
    changes = blocks.length ? [blocks[0].el] : [];
    stats[removedDoc ? 'removed' : 'added'] = blocks.length;
  }
  const replacements = decorate(doc, root, input.path, input.links);
  for (const block of blocks) block.el = replacements.get(block.el) ?? block.el;
  changes = changes.map((el) => replacements.get(el) ?? el);
  blocks.sort((a, b) => a.el.compareDocumentPosition(b.el) & 4 ? -1 : 1);

  const diagrams: Diagram[] = [];
  for (const block of blocks) {
    const before = block.el;
    const diagram = prepareDiagram(doc, block);
    if (diagram) { diagrams.push(diagram); changes = changes.map((el) => el === before ? diagram.el : el); }
  }
  const fm = new Map(head.frontmatter?.fields ?? []);
  const first = [...root.children].find((el) => !el.matches('details.mr-meta, .mr-ghost'));
  const lead = first?.tagName === 'H1' ? (first as HTMLElement) : null;
  return {
    content: root,
    diagrams,
    isCode: false,
    blocks,
    changes,
    stats,
    lead,
    title: fm.get('title') ?? lead?.textContent?.trim() ?? null,
    description: fm.get('description') ?? fm.get('summary') ?? null,
    words,
  };
}
