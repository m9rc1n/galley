import { languageOf, lineEl, lineify, registerCode } from './code.ts';
import { mermaidSource, prepareDiagram, type Diagram } from './diagrams.ts';
import { boundedDiff } from '../core/limits.ts';
import DOMPurify from 'dompurify';
import { diffUnits, similarity, type BlockChange } from '../core/blockdiff.ts';
import { applyOps, plainText } from '../core/highlight.ts';
import { normalize, parseDocument, renderUnit, type ParsedDoc, type Unit } from '../core/markdown.ts';
import { resolveHref, type RepoLinks } from '../core/paths.ts';
import { changeRatio, hasVisibleChange, wordDiff } from '../core/worddiff.ts';
import { MAX_DOCUMENT_CHARS } from '../core/limits.ts';
import { ReaderError, type DocStatus } from '../platforms/types.ts';

export interface RenderInput {
  path: string;
  status: DocStatus;
  base: string;
  head: string;
  links: RepoLinks;
  /** Origin of the GitHub or GitLab site; images hosted there load normally. */
  origin: string;
  /** External images wait for a click unless the reader chose to always load them. */
  images?: 'ask' | 'load';
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
  /** External images that wait for the reader to load them. */
  heldImages: number;
  /** Changed, non-blank source lines that no rendered block shows (comments, link definitions…). */
  hiddenLines: number;
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

const SVG_NS = 'http://www.w3.org/2000/svg';
const ABSOLUTE_URL = /^\s*(?:[a-z][a-z\d+.-]*:|\/\/)/i;

let purifier: ReturnType<typeof DOMPurify> | null = null;

/**
 * Sanitise document HTML. Besides removing scripts, this keeps documents from loading anything by
 * themselves: the only element that may fetch is <img>, and its absolute URL is parked in
 * data-mr-src until decorate() decides whether it may load (see F5 in the security review).
 */
export function sanitize(doc: Document, html: string): DocumentFragment {
  if (!purifier) {
    purifier = DOMPurify(doc.defaultView ?? window);
    purifier.addHook('uponSanitizeAttribute', (node, data) => {
      const name = data.attrName;
      if (name === 'class') {
        data.attrValue = data.attrValue
          .split(/\s+/)
          .filter((value) => RENDERER_CLASSES.has(value))
          .join(' ');
        if (!data.attrValue) data.keepAttr = false;
      } else if (name === 'src' && node.nodeName !== 'IMG') {
        // e.g. <input type="image" src>, MathML <mglyph src>.
        data.keepAttr = false;
      } else if ((name === 'href' || name === 'xlink:href') && node.namespaceURI === SVG_NS && node.nodeName.toLowerCase() !== 'a' && !data.attrValue.startsWith('#')) {
        // SVG <use>, <image> and filter references to other documents.
        data.keepAttr = false;
      }
    });
    purifier.addHook('afterSanitizeAttributes', (node) => {
      if (node.nodeName !== 'IMG') return;
      const el = node as Element;
      const src = el.getAttribute('src');
      if (src && ABSOLUTE_URL.test(src) && !/^\s*data:/i.test(src)) {
        el.setAttribute('data-mr-src', src.trim());
        el.removeAttribute('src');
      }
    });
  }
  return purifier.sanitize(html, {
    RETURN_DOM_FRAGMENT: true,
    FORBID_TAGS: ['style', 'form', 'iframe', 'frame', 'frameset', 'object', 'embed', 'base', 'link', 'meta', 'button', 'textarea', 'select', 'video', 'audio', 'source', 'track'],
    FORBID_ATTR: ['style', 'srcset', 'poster', 'background', 'ping', 'lowsrc', 'dynsrc'],
    // No data-* attributes from documents, except the two Galley renders itself.
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['data-mr-u', 'data-lang'],
    // Document ids and names become user-content-*, like on GitHub, so they can never take over the
    // reader's own ids (labels, aria-describedby) in the shared shadow root.
    SANITIZE_NAMED_PROPS: true,
  }) as unknown as DocumentFragment;
}

/** Images on the review platform itself (and GitHub's user-content hosts) reveal nothing new. */
export function isPlatformUrl(url: string, origin: string): boolean {
  let target: URL;
  let site: URL;
  try {
    site = new URL(origin);
    target = new URL(url, origin);
  } catch {
    return false;
  }
  if (target.protocol !== 'https:' && target.protocol !== site.protocol) return false;
  const host = site.hostname;
  return target.hostname === host || target.hostname.endsWith(`.${host}`) || (host === 'github.com' && target.hostname.endsWith('.githubusercontent.com'));
}

/** Links built from platform API data (threads, posted comments) open only on the review platform itself, or a fragment in the demo. */
export function platformLink(url: string, origin: string): string | null {
  if (/^#\S*$/.test(url)) return url;
  try {
    const target = new URL(url);
    return /^https?:$/.test(target.protocol) && target.origin === new URL(origin).origin ? target.href : null;
  } catch {
    return null;
  }
}

/** Show a held image. */
export function loadImage(img: HTMLImageElement): void {
  const src = img.dataset.mrSrc;
  if (!src) return;
  img.src = src;
  img.hidden = false;
  delete img.dataset.mrSrc;
  const hold = img.previousElementSibling;
  if (hold?.classList.contains('mr-img-hold')) hold.remove();
}

function holdImage(doc: Document, img: HTMLImageElement, src: string): void {
  let host = src;
  try {
    host = new URL(src, 'https://invalid.invalid').hostname;
  } catch {
    // Keep the raw value; it is only shown as text.
  }
  const hold = doc.createElement('span');
  hold.className = 'mr-img-hold';
  const text = doc.createElement('span');
  const alt = img.getAttribute('alt')?.trim();
  text.textContent = `${alt ? `${alt} · ` : ''}image from ${host}`;
  text.title = src;
  const button = doc.createElement('button');
  button.type = 'button';
  button.className = 'mr-img-load';
  button.dataset.act = 'load-image';
  button.textContent = 'Load';
  hold.append(text, button);
  img.hidden = true;
  img.before(hold);
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

interface LinkTarget {
  el: Element;
  label: string;
  url: string;
}

function linkTargets(root: ParentNode): LinkTarget[] {
  return [...root.querySelectorAll('a[href], img')].map((el) => ({
    el,
    label: el.tagName === 'IMG' ? `img:${el.getAttribute('alt') ?? ''}` : `a:${normalize(el.textContent ?? '')}`,
    url: el.getAttribute('href') ?? el.getAttribute('src') ?? el.getAttribute('data-mr-src') ?? '',
  }));
}

/**
 * Links and images that kept their text but point somewhere new (see F3 in the security review).
 * Pairs are made by link text (or image alt) before inline marks change that text.
 */
function changedLinks(before: ParentNode, after: ParentNode): Array<{ el: Element; from: string; to: string }> {
  const old = linkTargets(before);
  const used = new Set<number>();
  const out: Array<{ el: Element; from: string; to: string }> = [];
  for (const link of linkTargets(after)) {
    const i = old.findIndex((o, k) => !used.has(k) && o.label === link.label);
    if (i === -1) continue;
    used.add(i);
    if (old[i].url !== link.url) out.push({ el: link.el, from: old[i].url, to: link.url });
  }
  return out;
}

function noteLinkChanges(doc: Document, changes: Array<{ el: Element; from: string; to: string }>): void {
  for (const { el, from, to } of changes) {
    const note = doc.createElement('span');
    note.className = 'mr-link-note';
    note.setAttribute('role', 'note');
    const label = doc.createElement('span');
    label.className = 'mr-link-note-label';
    label.textContent = el.tagName === 'IMG' ? 'Image changed' : 'Link changed';
    const was = doc.createElement('del');
    was.className = 'mr-del';
    was.textContent = from || '(none)';
    const now = doc.createElement('ins');
    now.className = 'mr-ins';
    now.textContent = to || '(none)';
    note.append(label, was, doc.createTextNode(' → '), now);
    el.after(note);
  }
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
  const base = before.replace(/\n$/, '');
  const head = (code.textContent ?? '').replace(/\n$/, '');
  const parts = boundedDiff(base.split('\n'), head.split('\n'));
  if (!parts.some((p) => p.added || p.removed)) return false;
  // Every line is its own block, tagged with its line in the old or new text for highlighting.
  const frag = doc.createDocumentFragment();
  let b = 0;
  let h = 0;
  for (const part of parts) {
    for (const line of part.value) {
      if (part.removed) frag.append(lineEl(doc, 'del', 'mr-del mr-line', line, `b:${b++}`));
      else if (part.added) frag.append(lineEl(doc, 'ins', 'mr-ins mr-line', line, `h:${h++}`));
      else {
        frag.append(lineEl(doc, 'span', 'mr-cl', line, `h:${h++}`));
        b++;
      }
    }
  }
  code.replaceChildren(frag);
  registerCode(pre, { language: languageOf(pre.dataset.lang ?? ''), base, head });
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
  const parts = boundedDiff(baseRows.map(key), headRows.map(key));

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
      if (parts[i].removed) {
        removed = removed.concat(baseRows.slice(bi, bi + n));
        bi += n;
      } else {
        added = added.concat(headRows.slice(hi, hi + n));
        hi += n;
      }
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

function decorate(doc: Document, root: HTMLElement, input: RenderInput): { replacements: Map<HTMLElement, HTMLElement>; held: number } {
  const { path, links } = input;
  const replacements = new Map<HTMLElement, HTMLElement>();
  let held = 0;
  for (const img of root.querySelectorAll('img')) {
    img.loading = 'lazy';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    const src = img.getAttribute('src');
    if (src) {
      const r = resolveHref(path, src);
      if (r.type === 'repo') img.setAttribute('src', links.raw(r.path) + r.suffix);
    }
    const remote = img.dataset.mrSrc;
    if (!remote) continue;
    if (input.images === 'load' || isPlatformUrl(remote, input.origin)) {
      loadImage(img);
    } else {
      holdImage(doc, img, remote);
      held++;
    }
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
  return { replacements, held };
}

/** GitHub's own limit for a comment; GitLab allows far longer notes, which the platform still shows in full. */
const MAX_SNIPPET_CHARS = 65_536;

/**
 * Render a review comment's markdown. Comments are written by anyone who can comment, so they go
 * through the same sanitiser as documents, and their images follow the same loading rules.
 */
export function renderSnippet(doc: Document, markdown: string, origin: string, images: 'ask' | 'load' = 'ask'): DocumentFragment {
  const long = markdown.length > MAX_SNIPPET_CHARS;
  const frag = sanitize(doc, parseDocument(long ? markdown.slice(0, MAX_SNIPPET_CHARS) : markdown).html);
  if (long) {
    const note = doc.createElement('p');
    note.textContent = '… Shortened in the reader. Open it on the platform to read the whole comment.';
    frag.append(note);
  }
  for (const el of frag.querySelectorAll('[data-mr-u]')) el.removeAttribute('data-mr-u');
  for (const el of frag.querySelectorAll('[id]')) el.removeAttribute('id');
  for (const a of frag.querySelectorAll('a[href]')) {
    if (a.getAttribute('href')!.startsWith('#')) {
      a.removeAttribute('href');
      continue;
    }
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  }
  for (const img of frag.querySelectorAll('img')) {
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    const remote = img.dataset.mrSrc;
    if (!remote) continue;
    if (images === 'load' || isPlatformUrl(remote, origin)) loadImage(img);
    else holdImage(doc, img, remote);
  }
  return frag;
}

/** Count changed source lines that sit outside every rendered block, in either version. */
function hiddenLines(baseSrc: string, headSrc: string, base: ParsedDoc, head: ParsedDoc): number {
  const split = (text: string) => text.replace(/\r\n?/g, '\n').split('\n');
  const a = split(baseSrc);
  const b = split(headSrc);
  const covered = (parsed: ParsedDoc, length: number) => {
    const lines = new Uint8Array(length);
    for (const unit of parsed.units) lines.fill(1, unit.lines[0], Math.min(length, unit.lines[1]));
    return lines;
  };
  const inA = covered(base, a.length);
  const inB = covered(head, b.length);
  let ai = 0;
  let bi = 0;
  let hidden = 0;
  for (const part of boundedDiff(a, b)) {
    const count = part.count ?? part.value.length;
    if (part.removed) for (let k = 0; k < count; k++, ai++) hidden += !inA[ai] && a[ai].trim() ? 1 : 0;
    else if (part.added) for (let k = 0; k < count; k++, bi++) hidden += !inB[bi] && b[bi].trim() ? 1 : 0;
    else {
      ai += count;
      bi += count;
    }
  }
  return hidden;
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
      // Collected before inline marks are added, because they change the link text. Markdown blocks
      // list their destinations, so blocks without links skip the DOM queries; raw HTML always checks.
      const hasLinks = change.base!.links.length || change.head!.links.length || change.head!.kind === 'html';
      const links = hasLinks ? changedLinks(before, el) : [];
      if ((change.head!.kind === 'code' && diffCode(doc, el, plainText(before))) || (change.head!.kind === 'table' && diffTable(doc, el, before))) {
        noteLinkChanges(doc, links);
        mark(el, 'modified');
        touch(el);
        continue;
      }
      const ops = wordDiff(plainText(before), plainText(el));
      if (!hasVisibleChange(ops)) {
        // Only formatting or a destination changed. Name changed destinations; otherwise flag quietly.
        noteLinkChanges(doc, links);
        mark(el, 'modified', links.length ? undefined : 'mr-subtle');
        touch(el);
      } else if (changeRatio(ops) > REWRITE_RATIO || !applyOps(el, ops)) {
        touch(ghost(el));
        mark(el, 'added', 'mr-rewritten');
      } else {
        noteLinkChanges(doc, links);
        mark(el, 'modified');
        touch(el);
      }
    }
  }
  return runs;
}

export function renderDocument(doc: Document, input: RenderInput): RenderedDoc {
  if (Math.max(input.base.length, input.head.length) > MAX_DOCUMENT_CHARS) {
    throw new ReaderError('This document is too large for the reader.', 'Open it in the platform diff instead.');
  }
  const removedDoc = input.status === 'removed';
  const head = parseDocument(removedDoc ? input.base : input.head);
  const root = doc.createElement('div');
  root.className = 'mr-content';
  root.append(sanitize(doc, head.html));
  const words = (plainText(root).match(/[\p{L}\p{N}]+/gu) ?? []).length;

  let changes: HTMLElement[] = [];
  const blocks: RenderedBlock[] = [];
  const stats = { added: 0, removed: 0, modified: 0 };
  let hidden = 0;
  if (input.status !== 'added' && !removedDoc) {
    const base = parseDocument(input.base);
    const blockChanges = diffUnits(base.units, head.units);
    changes = applyChanges(doc, root, blockChanges, base, head.nonce, blocks);
    for (const c of blockChanges) if (c.kind !== 'same') stats[c.kind]++;
    hidden = hiddenLines(input.base, input.head, base, head);
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
  const { replacements, held } = decorate(doc, root, input);
  for (const pre of root.querySelectorAll<HTMLElement>('pre')) {
    lineify(doc, pre);
    // Wide screens give a code block the room its longest line needs, up to 120 characters (reader.css).
    const longest = Math.max(0, ...[...pre.querySelectorAll('.mr-cl, .mr-line')].map((line) => (line.textContent ?? '').replace(/\t/g, '    ').length));
    pre.style.setProperty('--chars', String(longest));
  }
  for (const block of blocks) block.el = replacements.get(block.el) ?? block.el;
  changes = changes.map((el) => replacements.get(el) ?? el);
  // One pass for document order: compareDocumentPosition walks siblings, so sorting with it is quadratic.
  const order = new Map<Element, number>();
  let position = 0;
  for (const el of root.querySelectorAll('*')) order.set(el, position++);
  blocks.sort((a, b) => (order.get(a.el) ?? 0) - (order.get(b.el) ?? 0));

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
    heldImages: held,
    hiddenLines: hidden,
  };
}
