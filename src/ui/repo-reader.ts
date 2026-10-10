import type { RepoDiscovery } from '../core/discovery.ts';
import {
  classify,
  DOC_KINDS,
  fileTitle,
  folderTree,
  indexDocument,
  KIND_NAMES,
  KIND_SOURCES,
  ProjectIndex,
  readForIndex,
  type Corrections,
  type DocKind,
  type Edge,
  type FolderNode,
  type KindSource,
} from '../core/docindex.ts';
import { ReaderError, type RepositorySource } from '../platforms/types.ts';
import { highlightCode } from './code.ts';
import { isPalette, PALETTE_KEYS, type DiagramPalette } from './diagram-palette.ts';
import { renderDiagrams } from './diagrams.ts';
import { loadReaderFonts } from './fonts.ts';
import { icons } from './icons.ts';
import css from './reader.css';
import { loadImage, renderDocument, type RenderedDoc } from './render.ts';
import repoCss from './repo.css';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, TEXT_SIZES, type Settings } from './settings.ts';

/**
 * The repository reader: a project's docs read at one commit, with the same typography, sanitiser and
 * diagrams as the review reader, and none of its review operations. Two views share one index: Read,
 * a document with its contents and the documents that link to it, and Map, one document's
 * neighbourhood of links with the evidence for each. Nothing is saved: history and corrections last
 * as long as the reader is open.
 */

const WORDS_PER_MINUTE = 230;
/** Neighbours shown in a column of the map before "Show more". */
const MAP_COLUMN = 8;
/** Below this many documents, every folder of the outline starts open. */
const OPEN_OUTLINE = 40;
/** Room under the top bar when a paragraph is brought into view. */
const TOP = 72;

const TEMPLATE = `
<div class="mr-root mr-repo" tabindex="-1" role="dialog" aria-modal="true" aria-label="Galley: repository docs">
  <div class="mr-progress"><div></div></div>
  <header class="mr-topbar">
    <div class="mr-tb-left">
      <button class="mr-btn mr-icon-btn" data-act="close" title="Close reader (Esc)" aria-label="Close reader (Esc)">${icons.close}</button>
      <span class="mr-brand">galley${__GALLEY_DEV__ ? '<span class="mr-dev">dev</span>' : ''}</span>
      <span class="mr-repo-history">
        <button class="mr-btn mr-icon-btn" data-act="back" title="Back (Alt+←)" aria-label="Back" disabled>${icons.chevronLeft}</button>
        <button class="mr-btn mr-icon-btn" data-act="forward" title="Forward (Alt+→)" aria-label="Forward" disabled>${icons.chevronRight}</button>
      </span>
    </div>
    <div class="mr-tb-center">
      <button class="mr-btn mr-file-btn" data-act="docs" aria-haspopup="dialog" aria-expanded="false" title="Documents (/)"><span class="mr-file-name">Documents</span>${icons.chevronDown}</button>
    </div>
    <div class="mr-tb-right">
      <div class="mr-seg mr-repo-views" role="group" aria-label="View"><button data-view="read" aria-pressed="true">Read</button><button data-view="map" aria-pressed="false" title="Map (M)">Map</button></div>
      <button class="mr-btn mr-repo-commit" data-act="refresh" hidden>${icons.refresh}<span class="mr-repo-commit-label"></span></button>
      <button class="mr-btn mr-icon-btn" data-act="settings" aria-haspopup="dialog" aria-expanded="false" title="Reading settings" aria-label="Reading settings">${icons.settings}</button>
    </div>
  </header>
  <div class="mr-menu mr-repo-docs" role="dialog" aria-label="Documents" hidden>
    <div class="mr-files-head"><p class="mr-files-title"></p><p class="mr-files-meta"></p></div>
    <input type="search" class="mr-repo-search" placeholder="Find a document or heading" aria-label="Find a document or heading">
    <div class="mr-repo-notes"></div>
    <nav class="mr-repo-outline" aria-label="Documents in this repository"></nav>
  </div>
  <div class="mr-menu mr-repo-settings" role="dialog" aria-label="Reading settings" hidden>
    <div class="mr-set-row"><span>Appearance</span><div class="mr-seg" data-setting="appearance" role="group" aria-label="Appearance"><button data-value="auto">System</button><button data-value="light">Light</button><button data-value="dark">Dark</button></div></div>
    <div class="mr-set-row"><span>Text size</span><div class="mr-size-control"><button class="mr-btn" data-act="smaller" aria-label="Smaller text">A−</button><output class="mr-text-size" aria-live="polite"></output><button class="mr-btn" data-act="larger" aria-label="Larger text">A+</button></div></div>
    <div class="mr-set-row"><span>External images<small>Images hosted elsewhere can tell their host who is reading</small></span><div class="mr-seg" data-setting="images" role="group" aria-label="External images"><button data-value="ask">Ask</button><button data-value="load">Load</button></div></div>
    <p class="mr-settings-note">Palette, typeface and layout follow your review settings.</p>
  </div>
  <nav class="mr-toc" aria-label="Contents"></nav>
  <main class="mr-main">
    <article class="mr-article mr-repo-read"><div class="mr-doc"></div></article>
    <section class="mr-repo-map" aria-label="Project map" hidden></section>
  </main>
  <div class="mr-repo-zoom" role="dialog" aria-modal="true" aria-label="Enlarged diagram" hidden><button class="mr-btn mr-icon-btn" data-act="close-zoom" aria-label="Close diagram (Esc)" title="Close (Esc)">${icons.close}</button><img alt=""></div>
  <p class="mr-toast" role="status" aria-live="polite" hidden></p>
</div>`;

function h<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function button(label: string, act: string, className = 'mr-btn mr-outline'): HTMLButtonElement {
  const b = h('button', className, label);
  b.type = 'button';
  b.dataset.act = act;
  return b;
}

function external(label: string, href: string, className = ''): HTMLAnchorElement {
  const a = h('a', className, label);
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}

const shortSha = (sha: string) => sha.slice(0, 7);
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en')} ${n === 1 ? one : many}`;
const folderOf = (path: string) => path.slice(0, Math.max(0, path.lastIndexOf('/')));
const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

function problem(err: unknown): { title: string; hint: string } {
  if (err instanceof ReaderError) return { title: err.message, hint: err.hint };
  return { title: 'Galley could not read this.', hint: err instanceof Error ? err.message : String(err) };
}

/** Where the reader was in a document: the first paragraph in view, and how far below the top bar it sat. */
interface Place {
  path: string;
  block: number;
  offset: number;
}

let active: RepoReader | null = null;

export interface RepoReaderHandle {
  close(): void;
}

/** Open the repository reader over the page. Accepts a promise so it can show loading and errors itself. */
export function openRepository(source: RepositorySource | Promise<RepositorySource>, options: { onClose?: () => void } = {}): RepoReaderHandle {
  active?.close();
  const reader = new RepoReader(options.onClose);
  active = reader;
  Promise.resolve(source).then(
    (s) => reader.setSource(s),
    (err) => reader.showError(err),
  );
  return { close: () => reader.close() };
}

class RepoReader {
  private readonly host = document.createElement('div');
  private readonly shadow = this.host.attachShadow({ mode: 'open' });
  private readonly root: HTMLElement;
  private readonly q = <T extends HTMLElement = HTMLElement>(selector: string) => this.shadow.querySelector<T>(selector)!;
  private settings: Settings = { ...DEFAULT_SETTINGS };
  private source: RepositorySource | null = null;
  private discovery: Promise<RepoDiscovery> | null = null;
  private listing: RepoDiscovery | null = null;
  private index: ProjectIndex | null = null;
  private readonly corrections: Corrections = { docs: new Map(), folders: new Map() };
  private readonly cache = new Map<string, Promise<string>>();
  /** Documents opened before the listing arrived; they join the map as soon as it exists. */
  private readonly read = new Map<string, string>();
  /** The pass reading documents for the map, while it runs. */
  private indexing: { cancelled: boolean } | null = null;
  private readonly unreadable = { failed: new Set<string>(), skipped: new Set<string>() };
  private history: Place[] = [];
  private at = -1;
  private path: string | null = null;
  private rendered: RenderedDoc | null = null;
  private view: 'read' | 'map' = 'read';
  private focus: string | null = null;
  private search = '';
  /** The map reads its first batch by itself once; after that, only when the reader asks. */
  private indexedOnce = false;
  private toastTimer = 0;
  private closed = false;
  private readonly dark = matchMedia('(prefers-color-scheme: dark)');
  private readonly prevOverflow: string;
  private readonly prevFocus: Element | null;

  constructor(private readonly onClose?: () => void) {
    loadReaderFonts(document);
    this.host.id = __GALLEY_DEV__ ? 'galley-repo-reader-dev' : 'galley-repo-reader';
    // biome-ignore lint/plugin: the bundled stylesheets and a fixed template; no document content.
    this.shadow.innerHTML = `<style>${css}${repoCss}</style>${TEMPLATE}`;
    this.root = this.q('.mr-root');
    this.q('.mr-doc').append(this.skeleton());
    this.prevOverflow = document.documentElement.style.overflow;
    this.prevFocus = document.activeElement;
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.append(this.host);
    this.root.focus({ preventScroll: true });
    this.root.addEventListener('click', (e) => this.onClick(e));
    this.root.addEventListener('change', (e) => this.onChange(e));
    this.root.addEventListener('scroll', () => this.onScroll(), { passive: true });
    this.q('.mr-repo-search').addEventListener('input', (e) => {
      this.search = (e.target as HTMLInputElement).value;
      this.buildOutline();
    });
    for (const type of ['keydown', 'keyup', 'keypress']) window.addEventListener(type, this.shield, true);
    this.dark.addEventListener('change', this.onSchemeChange);
    this.applySettings();
    void loadSettings().then((settings) => {
      this.settings = settings;
      this.applySettings();
    });
  }

  // ---------------------------------------------------------------- source

  setSource(source: RepositorySource): void {
    if (this.closed) return;
    this.source = source;
    this.showSnapshot();
    if (!source.start.folder) {
      void this.open(source.start.path);
      return;
    }
    // A folder or the repository opens at its README, else its first document, so listing comes first.
    void this.discover().then(
      (found) => {
        const folder = source.start.path;
        const inside = found.docs.find((doc) => !folder || doc.path.startsWith(`${folder}/`));
        const start = this.index!.documentAt(folder) ?? inside?.path ?? this.index!.documentAt('') ?? found.docs[0]?.path;
        if (start) void this.open(start);
        else
          this.message('No documents here', `Galley found no Markdown files in ${source.name} at ${shortSha(source.commit)}.`, [
            external(`Open on ${source.platform}`, source.url, 'mr-btn mr-outline'),
          ]);
      },
      (err) => {
        const { title, hint } = problem(err);
        this.message(title, hint, [button('Try again', 'retry-list')]);
      },
    );
  }

  showError(err: unknown): void {
    if (this.closed) return;
    const e = err instanceof ReaderError ? err : new ReaderError('Galley could not open this repository.', err instanceof Error ? err.message : String(err));
    const extra: Node[] = [];
    if (e.needsToken) {
      const p = h('p');
      p.append(
        external('Create a fine-grained token', 'https://github.com/settings/personal-access-tokens/new'),
        ' with read-only access to Contents, then click the Galley icon in your browser toolbar to save it.',
      );
      extra.push(p);
    }
    this.message(e.message, e.hint, extra);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    if (this.indexing) this.indexing.cancelled = true;
    for (const type of ['keydown', 'keyup', 'keypress']) window.removeEventListener(type, this.shield, true);
    this.dark.removeEventListener('change', this.onSchemeChange);
    clearTimeout(this.toastTimer);
    this.host.remove();
    document.documentElement.style.overflow = this.prevOverflow;
    if (this.prevFocus instanceof HTMLElement) this.prevFocus.focus({ preventScroll: true });
    active = null;
    this.onClose?.();
  }

  /** The repository listing, once per snapshot; a failed listing can be tried again. */
  private discover(): Promise<RepoDiscovery> {
    const source = this.source!;
    this.discovery ??= source.discover().then(
      (found) => {
        if (this.source === source) {
          this.listing = found;
          this.index = new ProjectIndex(found.docs.map((doc) => doc.path));
          // Documents already read in this snapshot count for the map at once.
          for (const [path, text] of this.read) this.index.add(indexDocument(path, text));
          this.buildOutline();
          this.updateBacklinks();
        }
        return found;
      },
      (err) => {
        this.discovery = null;
        throw err;
      },
    );
    return this.discovery;
  }

  private load(path: string): Promise<string> {
    let text = this.cache.get(path);
    if (!text) {
      text = this.source!.load(path);
      this.cache.set(path, text);
      text.catch(() => this.cache.delete(path));
    }
    return text;
  }

  private showSnapshot(): void {
    const source = this.source!;
    const at = shortSha(source.commit);
    const where = source.ref ?? 'default branch';
    const refresh = this.q('[data-act="refresh"]');
    refresh.hidden = false;
    this.q('.mr-repo-commit-label').textContent = at;
    // A commit, or a review's base or head, never moves; a branch or tag can be checked again.
    const pinned = source.pinned;
    refresh.toggleAttribute('disabled', pinned);
    refresh.title = pinned
      ? `Reading commit ${source.commit}`
      : `Reading ${where} at commit ${source.commit}. Every document comes from this commit. Choose to check for a newer one.`;
    refresh.setAttribute('aria-label', pinned ? `Reading commit ${at}` : `Reading ${where} at ${at}. Check for a newer commit`);
    this.q('.mr-files-title').textContent = source.name;
    this.updateListMeta();
  }

  private updateListMeta(): void {
    const source = this.source!;
    const count = this.listing ? ` · ${plural(this.listing.docs.length, 'document')}` : '';
    this.q('.mr-files-meta').textContent = `${source.ref ?? 'Default branch'} · ${shortSha(source.commit)}${count}`;
  }

  /** Check the branch or tag again. A new commit is a new snapshot: listing and map start over. */
  private async refresh(): Promise<void> {
    const before = this.source!;
    const control = this.q<HTMLButtonElement>('[data-act="refresh"]');
    control.disabled = true;
    let next: RepositorySource;
    try {
      next = await before.refresh();
    } catch (err) {
      if (!this.closed) {
        control.disabled = false;
        this.toast(problem(err).title);
      }
      return;
    }
    if (this.closed || this.source !== before) return;
    control.disabled = false;
    if (next.commit === before.commit) {
      this.toast(`Up to date: ${before.ref ?? 'the default branch'} is still at ${shortSha(before.commit)}.`);
      return;
    }
    if (this.indexing) this.indexing.cancelled = true;
    this.indexing = null;
    this.source = next;
    this.discovery = null;
    this.listing = null;
    this.index = null;
    this.cache.clear();
    this.read.clear();
    this.unreadable.failed.clear();
    this.unreadable.skipped.clear();
    this.indexedOnce = false;
    this.showSnapshot();
    this.toast(`Now reading ${shortSha(next.commit)}. It was ${shortSha(before.commit)}.`);
    if (this.view === 'map') {
      // The document is read again at the new commit when the reader goes back to it.
      this.rendered = null;
      this.q('.mr-doc').replaceChildren(this.skeleton());
      await this.showMap();
    } else if (this.path) await this.open(this.path, { push: false });
    // Nothing was open, such as a repository without documents: start again at the new commit.
    else this.setSource(next);
  }

  // ---------------------------------------------------------------- reading

  /** Open a document at the snapshot's commit; history remembers the paragraph the reader leaves. */
  private async open(path: string, options: { anchor?: string; line?: number; push?: boolean; place?: Place } = {}): Promise<void> {
    if (options.push !== false) {
      this.remember();
      this.history = this.history.slice(0, this.at + 1);
      this.history.push({ path, block: -1, offset: 0 });
      this.at = this.history.length - 1;
    }
    this.updateHistory();
    this.setView('read');
    this.path = path;
    this.rendered = null;
    this.q('.mr-file-name').textContent = fileTitle(path);
    this.q('.mr-doc').replaceChildren(this.skeleton());
    this.q('.mr-toc').replaceChildren();
    const source = this.source!;
    let text: string;
    try {
      text = await this.load(path);
    } catch (err) {
      if (this.closed || this.path !== path) return;
      const { title, hint } = problem(err);
      this.message(title, hint, [external(`Open on ${source.platform}`, source.links.blob(path), 'mr-btn mr-outline'), ...this.backButton()]);
      return;
    }
    if (this.closed || this.path !== path || this.source !== source) return;
    this.read.set(path, text);
    if (this.index && !this.index.docs.has(path)) this.index.add(indexDocument(path, text));
    let r: RenderedDoc;
    try {
      r = renderDocument(document, {
        path,
        status: 'modified',
        base: text,
        head: text,
        links: source.links,
        origin: location.origin,
        images: this.settings.images,
      });
    } catch (err) {
      const { title, hint } = problem(err);
      this.message(title, hint, [external(`Open on ${source.platform}`, source.links.blob(path), 'mr-btn mr-outline'), ...this.backButton()]);
      return;
    }
    this.rendered = r;
    this.q('.mr-file-name').textContent = r.title ?? fileTitle(path);
    this.q('.mr-doc').replaceChildren(this.article(path, r));
    this.buildToc(r);
    this.drawDiagrams();
    void highlightCode(r.content);
    if (options.place) this.restore(options.place);
    else if (options.line) this.showLine(options.line);
    else if (options.anchor) this.showAnchor(options.anchor);
    else this.root.scrollTo({ top: 0 });
  }

  private article(path: string, r: RenderedDoc): DocumentFragment {
    const source = this.source!;
    const frag = document.createDocumentFragment();
    const intro: HTMLElement[] = [];
    if (r.description) intro.push(h('p', 'mr-subtitle', r.description));
    const byline = h('div', 'mr-byline');
    const facts = h('span', 'mr-file-meta');
    facts.append(h('span', '', `${Math.max(1, Math.round(r.words / WORDS_PER_MINUTE))} min read`));
    const indexed = this.index?.docs.get(path);
    if (indexed) {
      const { kind, from } = classify(indexed, this.corrections);
      if (kind !== 'other') facts.append(this.kindChip(kind, from));
      if (indexed.status) facts.append(h('span', 'mr-repo-status', indexed.status));
    }
    const at = h('span', 'mr-repo-at', `${path} · ${source.ref ?? 'default branch'} @ ${shortSha(source.commit)}`);
    at.title = `Read at commit ${source.commit}`;
    facts.append(at);
    if (r.heldImages) facts.append(button(`Load ${plural(r.heldImages, 'external image')}`, 'load-images', 'mr-btn mr-chip is-images'));
    const actions = h('span', 'mr-file-actions');
    actions.append(external(`Open on ${source.platform}`, source.links.blob(path), 'mr-repo-open'));
    byline.append(facts, actions);
    intro.push(byline);
    if (r.lead) {
      const before: Element[] = [];
      for (let el = r.content.firstElementChild; el && el !== r.lead; el = el.nextElementSibling) before.push(el);
      r.lead.classList.add('mr-lead');
      r.lead.after(...intro, ...before);
    } else frag.append(h('h1', 'mr-title', r.title ?? fileTitle(path)), ...intro);
    frag.append(r.content, this.backlinks(path));
    return frag;
  }

  private kindChip(kind: DocKind, from: KindSource): HTMLElement {
    const chip = h('span', `mr-repo-kind is-${kind}${from === 'reader' ? ' is-reader' : ''}`, KIND_NAMES[kind]);
    chip.title = `${KIND_NAMES[kind]}, ${KIND_SOURCES[from]}`;
    return chip;
  }

  /** The documents that link here, from the documents read so far, each with the links as evidence. */
  private backlinks(path: string): HTMLElement {
    const box = h('aside', 'mr-repo-backlinks');
    box.setAttribute('aria-label', 'Linked from');
    box.append(h('h2', '', 'Linked from'));
    const index = this.index;
    if (!index || index.docs.size < index.listed.length) {
      const read = index ? index.docs.size : this.read.size;
      const total = index ? ` of ${plural(index.listed.length, 'document')}` : '';
      box.append(h('p', 'mr-repo-quiet', `Galley has read ${read.toLocaleString('en')}${total} in this repository.`));
    }
    const edges = index?.incoming(path) ?? [];
    if (edges.length) box.append(this.edgeList(edges, 'from', 'open'));
    else if (index && index.docs.size >= index.listed.length) box.append(h('p', 'mr-repo-quiet', 'No other document links here.'));
    if (!index || index.docs.size < index.listed.length) box.append(button(this.indexing ? 'Reading documents…' : 'Find links to this document', 'index'));
    return box;
  }

  /** Connections as a list: each document, and under it every link that makes the connection. */
  private edgeList(edges: Edge[], end: 'from' | 'to', act: 'open' | 'focus', limit = Number.POSITIVE_INFINITY): HTMLElement {
    const list = h('ul', 'mr-repo-edges');
    edges.forEach((edge, i) => {
      const other = edge[end];
      const item = h('li', 'mr-repo-edge');
      if (i >= limit) item.hidden = true;
      const name = button(this.titleOf(other), act, 'mr-repo-edge-doc');
      name.dataset.path = other;
      name.title = other;
      item.append(name);
      const doc = this.index!.docs.get(other);
      if (doc) {
        const { kind, from } = classify(doc, this.corrections);
        if (kind !== 'other') item.append(this.kindChip(kind, from));
      }
      const evidence = h('ul', 'mr-repo-evidence');
      for (const link of edge.evidence) {
        const proof = button('', 'evidence', 'mr-repo-proof');
        proof.dataset.path = edge.from;
        proof.dataset.line = String(link.line);
        proof.append(h('q', '', link.text || link.href), ` ${link.section ? `in “${link.section}”, ` : ''}line ${link.line}`);
        proof.title = `Open ${edge.from} at line ${link.line}`;
        const li = h('li');
        li.append(proof);
        evidence.append(li);
      }
      item.append(evidence);
      list.append(item);
    });
    if (edges.length > limit) list.append(button(`Show ${edges.length - limit} more`, 'more', 'mr-btn mr-repo-more'));
    return list;
  }

  private titleOf(path: string): string {
    return this.index?.docs.get(path)?.title ?? fileTitle(path);
  }

  private buildToc(r: RenderedDoc): void {
    const toc = this.q('.mr-toc');
    const all = [...r.content.querySelectorAll<HTMLElement>('h1, h2, h3')].filter((el) => el !== r.lead);
    if (all.length < 3) return;
    const top = Math.min(...all.map((el) => Number(el.tagName[1])));
    const list = h('div', 'mr-toc-list');
    list.append(h('p', 'mr-toc-title', 'Contents'));
    for (const el of all) {
      const link = h('a', `lvl-${Math.min(3, Number(el.tagName[1]) - top + 1)}`);
      link.href = `#${el.id}`;
      link.dataset.act = 'heading';
      link.append(h('span', '', el.textContent!.trim()));
      list.append(link);
    }
    toc.append(list);
  }

  // ---------------------------------------------------------------- places

  /** The first paragraph in view (-1 for the top), so coming back lands on it at any window width. */
  private remember(): void {
    const place = this.history[this.at];
    // The map hides the document; its place was taken when the map opened.
    if (!place || !this.rendered || place.path !== this.path || this.view !== 'read') return;
    const blocks = this.rendered.blocks;
    const i = this.root.scrollTop > 0 ? blocks.findIndex((block) => block.el.getBoundingClientRect().bottom > TOP) : -1;
    place.block = i;
    place.offset = i < 0 ? 0 : blocks[i].el.getBoundingClientRect().top;
  }

  private restore(place: Place): void {
    const block = this.rendered!.blocks[place.block];
    this.root.scrollTo({ top: block ? this.root.scrollTop + block.el.getBoundingClientRect().top - place.offset : 0 });
  }

  private reveal(el: Element): void {
    this.root.scrollTo({ top: this.root.scrollTop + el.getBoundingClientRect().top - TOP });
    el.classList.add('mr-repo-flash');
    setTimeout(() => el.classList.remove('mr-repo-flash'), 1600);
  }

  /**
   * A link's evidence is a source line; show the paragraph that holds it. Every link sits in a block
   * that starts at or before its line, and a document read as it is has every block's source.
   */
  private showLine(line: number): void {
    this.reveal(this.rendered!.blocks.findLast((b) => b.head!.lines[0] < line)!.el);
  }

  private showAnchor(anchor: string): void {
    const content = this.rendered?.content;
    const target =
      content && [...content.querySelectorAll('[id]')].find((el) => el.id === anchor || el.id === `user-content-${anchor}` || el.id === anchor.toLowerCase());
    if (target) this.reveal(target);
    else this.toast(`“${anchor}” is not a section of this document; showing its beginning.`);
  }

  private backButton(): HTMLElement[] {
    return this.at > 0 ? [button('Back', 'back')] : [];
  }

  private go(step: -1 | 1): void {
    const next = this.history[this.at + step];
    if (!next) return;
    this.remember();
    this.at += step;
    void this.open(next.path, { push: false, place: next });
  }

  private updateHistory(): void {
    this.q<HTMLButtonElement>('[data-act="back"]').disabled = this.at <= 0;
    this.q<HTMLButtonElement>('[data-act="forward"]').disabled = this.at >= this.history.length - 1;
  }

  /** In-repository links open here at the same commit; everything else opens on the platform in a new tab. */
  private follow(a: HTMLAnchorElement, e: MouseEvent): void {
    const target = a.dataset.mrPath!;
    const [file, hash = ''] = target.split('#');
    const path = file.replace(/\?.*$/, '');
    const anchor = safeDecode(hash);
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    const doc = this.index?.documentAt(path) ?? (/\.(md|markdown|mdown|mkd|mdx)$/i.test(path) ? path : null);
    if (!doc) return;
    e.preventDefault();
    if (doc === this.path) {
      if (anchor) this.showAnchor(anchor);
      return;
    }
    void this.open(doc, { anchor });
  }

  // ---------------------------------------------------------------- documents list

  private toggleDocs(open = this.q('.mr-repo-docs').hidden): void {
    this.closeMenus();
    if (!open || !this.source) return;
    this.q('.mr-repo-docs').hidden = false;
    this.q('[data-act="docs"]').setAttribute('aria-expanded', 'true');
    const listing = this.discover();
    this.buildOutline();
    this.q('.mr-repo-search').focus();
    listing.catch(() => this.buildOutline());
  }

  private buildOutline(): void {
    const outline = this.q('.mr-repo-outline');
    const notes = this.q('.mr-repo-notes');
    if (!this.source || this.q('.mr-repo-docs').hidden) return;
    this.updateListMeta();
    notes.replaceChildren(...(this.listing?.limits ?? []).map((limit) => h('p', 'mr-repo-limit', limit)));
    if (!this.index) {
      outline.replaceChildren(
        ...(this.discovery
          ? [h('p', 'mr-repo-quiet', 'Listing documents…')]
          : [h('p', 'mr-repo-quiet', 'Galley could not list this repository.'), button('Try again', 'retry-list')]),
      );
      return;
    }
    if (!this.index.listed.length) {
      outline.replaceChildren(h('p', 'mr-repo-quiet', 'No Markdown documents at this commit.'));
      return;
    }
    if (this.search.trim()) {
      const found = this.index.search(this.search);
      const list = h('div', 'mr-repo-results');
      for (const match of found) {
        const item = this.docItem(match.path);
        if (match.heading) {
          item.dataset.anchor = match.heading.id;
          item.querySelector('.mr-path-dir')!.textContent = `§ ${match.heading.text}`;
        }
        list.append(item);
      }
      if (!found.length) list.append(h('p', 'mr-repo-quiet', 'No document or heading matches.'));
      if (this.index.docs.size < this.index.listed.length)
        list.append(h('p', 'mr-repo-quiet', `Headings are searched in the ${plural(this.index.docs.size, 'document')} Galley has read.`));
      outline.replaceChildren(list);
      return;
    }
    const tree = folderTree(this.index.listed);
    const openAll = this.index.listed.length <= OPEN_OUTLINE;
    const draw = (node: FolderNode, parent: HTMLElement) => {
      for (const path of node.docs) parent.append(this.docItem(path));
      for (const folder of node.folders) {
        const details = h('details', 'mr-repo-folder');
        details.open = openAll || this.path?.startsWith(`${folder.path}/`) === true;
        const summary = h('summary', '', `${folder.name}/`);
        details.append(summary);
        draw(folder, details);
        parent.append(details);
      }
    };
    outline.replaceChildren();
    draw(tree, outline);
  }

  private docItem(path: string): HTMLButtonElement {
    const item = button('', 'open', 'mr-menu-item');
    item.dataset.path = path;
    const name = h('span', 'mr-menu-name');
    name.append(h('span', 'mr-path-name', this.titleOf(path)), h('span', 'mr-path-dir', path));
    item.append(name);
    const doc = this.index!.docs.get(path);
    if (doc) {
      const { kind, from } = classify(doc, this.corrections);
      if (kind !== 'other') item.append(this.kindChip(kind, from));
    }
    if (path === this.path) item.setAttribute('aria-current', 'true');
    return item;
  }

  // ---------------------------------------------------------------- map

  private setView(view: 'read' | 'map'): void {
    if (view !== this.view) this.remember();
    this.view = view;
    this.q('.mr-repo-read').hidden = view !== 'read';
    this.q('.mr-repo-map').hidden = view !== 'map';
    this.q('.mr-toc').hidden = view !== 'read';
    for (const b of this.shadow.querySelectorAll<HTMLElement>('[data-view]')) b.setAttribute('aria-pressed', String(b.dataset.view === view));
  }

  private async showMap(focus = this.path ?? this.focus): Promise<void> {
    if (!this.source) return;
    this.closeMenus();
    this.setView('map');
    const map = this.q('.mr-repo-map');
    if (!this.index) {
      map.replaceChildren(this.skeleton());
      try {
        await this.discover();
      } catch (err) {
        if (this.view !== 'map') return;
        const { title, hint } = problem(err);
        const box = h('div', 'mr-message');
        box.append(h('h2', '', title), h('p', '', hint), button('Try again', 'map'));
        map.replaceChildren(box);
        return;
      }
      if (this.closed || this.view !== 'map') return;
    }
    const index = this.index!;
    this.focus = focus && index.documentAt(focus) ? index.documentAt(focus) : (index.documentAt('') ?? index.listed[0] ?? null);
    this.drawMap();
    if (!this.indexing && index.unread().length && index.docs.size < index.listed.length && !this.indexedOnce) void this.indexMore();
  }

  /** Read the next batch of documents for the map; the reader can stop it at any time. */
  private async indexMore(): Promise<void> {
    if (this.indexing) return;
    const index = this.index!;
    const signal = { cancelled: false };
    this.indexing = signal;
    this.indexedOnce = true;
    this.refreshIndexViews();
    const sizes = new Map(this.listing!.docs.flatMap((doc) => (doc.size === undefined ? [] : [[doc.path, doc.size] as [string, number]])));
    let last = 0;
    const result = await readForIndex(index, (path) => this.load(path), {
      sizes,
      signal,
      progress: () => {
        if (Date.now() - last < 250) return;
        last = Date.now();
        this.updateIndexStatus();
      },
    });
    if (this.indexing !== signal) return;
    this.indexing = null;
    for (const path of result.failed) this.unreadable.failed.add(path);
    for (const path of result.skipped) this.unreadable.skipped.add(path);
    if (!this.closed) this.refreshIndexViews();
  }

  /** Only offered while a pass runs: the status is redrawn as soon as one starts or ends. */
  private stopIndexing(): void {
    this.indexing!.cancelled = true;
    this.indexing = null;
    this.refreshIndexViews();
  }

  /** After the index changes: the map, the list's kinds and the current document's backlinks. */
  private refreshIndexViews(): void {
    if (this.view === 'map') this.drawMap();
    else this.updateIndexStatus();
    this.buildOutline();
    this.updateBacklinks();
  }

  private updateBacklinks(): void {
    const old = this.shadow.querySelector('.mr-repo-backlinks');
    if (old && this.path) old.replaceWith(this.backlinks(this.path));
  }

  private updateIndexStatus(): void {
    const status = this.shadow.querySelector('.mr-map-status');
    if (status) status.replaceWith(this.indexStatus());
  }

  private indexStatus(): HTMLElement {
    const index = this.index!;
    const status = h('div', 'mr-map-status');
    status.setAttribute('role', 'status');
    const read = index.docs.size;
    const total = index.listed.length;
    status.append(
      h(
        'p',
        '',
        read >= total
          ? `Built from all ${plural(total, 'document')} at ${shortSha(this.source!.commit)}.`
          : `Built from ${read.toLocaleString('en')} of ${plural(total, 'document')} at ${shortSha(this.source!.commit)}. Links from the others are not shown yet.`,
      ),
    );
    if (this.indexing) status.append(button('Stop reading', 'stop-index'));
    else if (read < total) status.append(button('Index more', 'index'));
    const notes: string[] = [...this.listing!.limits];
    if (this.unreadable.failed.size) notes.push(`${plural(this.unreadable.failed.size, 'document')} could not be read.`);
    if (this.unreadable.skipped.size) notes.push(`${plural(this.unreadable.skipped.size, 'document is', 'documents are')} too large to read.`);
    for (const note of notes) status.append(h('p', 'mr-repo-limit', note));
    return status;
  }

  private drawMap(): void {
    const map = this.q('.mr-repo-map');
    const index = this.index!;
    const head = h('header', 'mr-map-head');
    head.append(h('h1', 'mr-title', 'Project map'), this.indexStatus());
    if (!this.focus) {
      map.replaceChildren(head, h('p', 'mr-repo-quiet', 'No Markdown documents at this commit.'));
      return;
    }
    const focus = this.focus;
    const doc = index.docs.get(focus);
    // Folders are where a document lives, not something it links to: shown as a path, never as a line.
    const crumbs = h('nav', 'mr-map-crumbs');
    crumbs.setAttribute('aria-label', 'Folder');
    const folder = folderOf(focus);
    const siblings = index.listed.filter((path) => path !== focus && folderOf(path) === folder).length;
    crumbs.append(h('span', '', `In ${folder ? `${folder}/` : 'the top folder'}${siblings ? ` with ${plural(siblings, 'other document')}` : ''}`));
    const center = h('div', 'mr-map-center');
    const title = h('h2', 'mr-map-title', this.titleOf(focus));
    title.tabIndex = -1;
    center.append(title, h('p', 'mr-path-dir', focus));
    if (doc) {
      const { kind, from } = classify(doc, this.corrections);
      const facts = h('p', 'mr-map-facts');
      facts.append(this.kindChip(kind, from));
      if (doc.status) facts.append(h('span', 'mr-repo-status', doc.status));
      if (doc.unread) facts.append(h('span', 'mr-repo-limit', doc.unread === 'failed' ? 'Could not be read' : 'Too large to read'));
      center.append(facts, this.kindEditor(focus, kind, from));
    } else center.append(h('p', 'mr-repo-quiet', 'Not read yet: its own links are not shown.'));
    const read = button('Read', 'open', 'mr-btn mr-primary');
    read.dataset.path = focus;
    center.append(read);
    const column = (label: string, edges: Edge[], end: 'from' | 'to', empty: string) => {
      const col = h('section', 'mr-map-col');
      col.setAttribute('aria-label', label);
      col.append(h('h3', '', `${label} (${edges.length})`));
      col.append(edges.length ? this.edgeList(edges, end, 'focus', MAP_COLUMN) : h('p', 'mr-repo-quiet', empty));
      return col;
    };
    const grid = h('div', 'mr-map-grid');
    grid.append(
      column('Linked from', index.incoming(focus), 'from', 'No document read so far links here.'),
      center,
      column('Links to', index.outgoing(focus), 'to', doc ? 'It links to no other listed document.' : 'Read it to see its links.'),
    );
    const parts: HTMLElement[] = [head, crumbs, grid];
    const problems = index.problems.filter((p) => p.from === focus);
    if (problems.length) {
      const box = h('section', 'mr-map-problems');
      box.setAttribute('aria-label', 'Links the map cannot follow');
      box.append(h('h3', '', 'Links the map cannot follow'));
      const list = h('ul');
      for (const p of problems) {
        const item = h('li');
        const proof = button('', 'evidence', 'mr-repo-proof');
        proof.dataset.path = focus;
        proof.dataset.line = String(p.link.line);
        proof.append(h('q', '', p.link.text || p.link.href), ` line ${p.link.line}`);
        item.append(
          proof,
          p.kind === 'missing-doc'
            ? `: ${p.link.path} is not among the listed documents${this.listing?.limits.length ? ', which are incomplete' : ''}.`
            : `: “${p.link.anchor}” is not a section of ${p.link.path}.`,
        );
        list.append(item);
      }
      box.append(list);
      parts.push(box);
    }
    map.replaceChildren(...parts);
  }

  /** The reader can correct a kind for this session; Galley says where every kind came from. */
  private kindEditor(path: string, kind: DocKind, from: KindSource): HTMLElement {
    const box = h('div', 'mr-map-kind');
    const label = h('label', '', 'Type ');
    const select = h('select');
    select.dataset.act = 'kind';
    select.dataset.path = path;
    for (const value of DOC_KINDS) {
      const option = h('option', '', KIND_NAMES[value]);
      option.value = value;
      option.selected = value === kind;
      select.append(option);
    }
    label.append(select);
    box.append(label);
    const folder = folderOf(path);
    if (folder) {
      const all = h('label', 'mr-map-kind-all');
      const check = h('input');
      check.type = 'checkbox';
      check.dataset.act = 'kind-folder';
      check.checked = this.corrections.folders.has(folder) && !this.corrections.docs.has(path);
      all.append(check, ` Everything in ${folder}/`);
      box.append(all);
    }
    box.append(h('small', '', from === 'reader' ? 'Set by you for this session; Galley does not save it.' : `${KIND_NAMES[kind]}, ${KIND_SOURCES[from]}.`));
    return box;
  }

  private setKind(path: string, kind: DocKind, folderWide: boolean): void {
    const folder = folderOf(path);
    this.corrections.docs.delete(path);
    if (folderWide && folder) this.corrections.folders.set(folder, kind);
    else {
      this.corrections.folders.delete(folder);
      this.corrections.docs.set(path, kind);
    }
    this.drawMap();
    this.buildOutline();
  }

  // ---------------------------------------------------------------- chrome

  private skeleton(): HTMLElement {
    const s = h('div', 'mr-skeleton');
    // biome-ignore lint/plugin: fixed placeholder markup.
    s.innerHTML = '<i class="h"></i><i></i><i></i><i class="s"></i><i></i><i></i><i></i><i class="s"></i>';
    return s;
  }

  private message(title: string, body: string, extra: Node[] = []): void {
    this.rendered = null;
    this.setView('read');
    this.q('.mr-toc').replaceChildren();
    const box = h('div', 'mr-message');
    box.append(h('h2', '', title));
    if (body) box.append(h('p', '', body));
    const actions = h('div', 'mr-actions');
    actions.append(...extra.filter((node) => node instanceof HTMLElement && node.matches('a, button')));
    box.append(...extra.filter((node) => !(node instanceof HTMLElement && node.matches('a, button'))), actions);
    actions.append(button('Close', 'close'));
    this.q('.mr-doc').replaceChildren(box);
  }

  private toast(text: string): void {
    const toast = this.q('.mr-toast');
    toast.textContent = text;
    toast.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 4000);
  }

  private closeMenus(): boolean {
    let closed = false;
    for (const [menu, control] of [
      ['.mr-repo-docs', '[data-act="docs"]'],
      ['.mr-repo-settings', '[data-act="settings"]'],
    ]) {
      if (!this.q(menu).hidden) closed = true;
      this.q(menu).hidden = true;
      this.q(control).setAttribute('aria-expanded', 'false');
    }
    return closed;
  }

  private closeZoom(): boolean {
    const zoom = this.q('.mr-repo-zoom');
    if (zoom.hidden) return false;
    zoom.hidden = true;
    return true;
  }

  private onScroll(): void {
    const max = this.root.scrollHeight - this.root.clientHeight;
    this.q('.mr-progress > div').style.transform = `scaleX(${max > 0 ? Math.min(1, this.root.scrollTop / max) : 0})`;
    this.q('.mr-topbar').classList.toggle('is-scrolled', this.root.scrollTop > 8);
  }

  private onClick(e: MouseEvent): void {
    const target = e.target as Element;
    const link = target.closest<HTMLAnchorElement>('.mr-content a[data-mr-path]');
    if (link) {
      this.follow(link, e);
      return;
    }
    const section = target.closest<HTMLAnchorElement>('.mr-content a[href^="#"]');
    if (section) {
      e.preventDefault();
      this.showAnchor(safeDecode(section.getAttribute('href')!.slice(1)));
      return;
    }
    const view = target.closest<HTMLElement>('[data-view]');
    if (view) {
      if (view.dataset.view === 'map') void this.showMap();
      else if (this.path && this.rendered?.content.isConnected) this.setView('read');
      else if (this.path) void this.open(this.path, { push: false });
      return;
    }
    const el = target.closest<HTMLElement>('[data-act]');
    const value = target.closest<HTMLElement>('[data-setting] [data-value]');
    if (value) {
      const key = value.closest<HTMLElement>('[data-setting]')!.dataset.setting as 'appearance' | 'images';
      this.update({ [key]: value.dataset.value });
      return;
    }
    if (!el) {
      if (!target.closest('.mr-menu, [data-act="docs"], [data-act="settings"]')) this.closeMenus();
      return;
    }
    const path = el.dataset.path;
    switch (el.dataset.act) {
      case 'close':
        this.close();
        return;
      case 'back':
        this.go(-1);
        return;
      case 'forward':
        this.go(1);
        return;
      case 'docs':
        this.toggleDocs();
        return;
      case 'settings': {
        const open = this.q('.mr-repo-settings').hidden;
        this.closeMenus();
        this.q('.mr-repo-settings').hidden = !open;
        el.setAttribute('aria-expanded', String(open));
        return;
      }
      case 'refresh':
        return void this.refresh();
      case 'open':
        this.closeMenus();
        if (path === this.path && !el.dataset.anchor && this.view === 'read') return;
        return void this.open(path!, { anchor: el.dataset.anchor });
      case 'evidence':
        this.closeMenus();
        return void this.open(path!, { line: Number(el.dataset.line) });
      case 'focus':
        this.focus = path!;
        this.drawMap();
        this.q('.mr-map-title').focus();
        return;
      case 'more':
        for (const item of el.parentElement!.querySelectorAll<HTMLElement>('li[hidden]')) item.hidden = false;
        el.remove();
        return;
      case 'map':
        return void this.showMap();
      case 'index':
        return void (this.index
          ? this.indexMore()
          : this.discover().then(
              () => this.indexMore(),
              (err) => this.toast(problem(err).title),
            ));
      case 'stop-index':
        this.stopIndexing();
        return;
      case 'retry-list':
        if (this.source!.start.folder && !this.path) this.setSource(this.source!);
        else this.toggleDocs(true);
        return;
      case 'heading':
        e.preventDefault();
        this.showAnchor(el.getAttribute('href')!.slice(1));
        return;
      case 'load-image':
        loadImage(el.parentElement!.nextElementSibling as HTMLImageElement);
        return;
      case 'load-images':
        for (const img of this.rendered!.content.querySelectorAll<HTMLImageElement>('img[data-mr-src]')) loadImage(img);
        el.remove();
        return;
      case 'zoom-diagram': {
        const zoom = this.q('.mr-repo-zoom');
        zoom.querySelector('img')!.src = el.querySelector('img')!.src;
        zoom.hidden = false;
        this.q('[data-act="close-zoom"]').focus();
        return;
      }
      case 'close-zoom':
        this.closeZoom();
        return;
      case 'smaller':
      case 'larger':
        this.update({ size: Math.min(TEXT_SIZES.length - 1, Math.max(0, this.settings.size + (el.dataset.act === 'larger' ? 1 : -1))) });
        return;
    }
  }

  private onChange(e: Event): void {
    const el = e.target as HTMLInputElement | HTMLSelectElement;
    const box = el.closest('.mr-map-kind');
    if (!box) return;
    const select = box.querySelector<HTMLSelectElement>('[data-act="kind"]')!;
    const all = box.querySelector<HTMLInputElement>('[data-act="kind-folder"]');
    this.setKind(select.dataset.path!, select.value as DocKind, Boolean(all?.checked));
  }

  private readonly shield = (e: Event) => {
    // The reader is modal: keys reach it when focus is inside it, or when focus fell back to the page body.
    const origin = e.target;
    if (origin !== this.host && origin !== document.body && origin !== document.documentElement) return;
    if (e.type === 'keydown') this.onKey(e as KeyboardEvent);
    e.stopPropagation();
  };

  private onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (this.closeZoom() || this.closeMenus()) {
        this.root.focus({ preventScroll: true });
        return;
      }
      this.close();
      return;
    }
    // In the search box, Alt/Option + arrows move the caret by word, and letters are typed.
    if (this.shadow.activeElement?.matches('input, select, textarea')) return;
    if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      this.go(e.key === 'ArrowLeft' ? -1 : 1);
      return;
    }
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === '/') {
      e.preventDefault();
      this.toggleDocs(true);
    } else if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      if (this.view === 'map') this.q<HTMLElement>('[data-view="read"]').click();
      else void this.showMap();
    }
  }

  // ---------------------------------------------------------------- settings

  private update(patch: Partial<Settings>): void {
    this.settings = { ...this.settings, ...patch };
    this.applySettings();
    if (patch.images === 'load' && this.rendered)
      for (const img of this.rendered.content.querySelectorAll<HTMLImageElement>('img[data-mr-src]')) loadImage(img);
    void saveSettings(this.settings);
  }

  private applySettings(): void {
    const s = this.settings;
    const r = this.root;
    r.dataset.font = s.font;
    r.dataset.theme = s.theme;
    r.dataset.density = s.density;
    r.classList.toggle('no-top-glow', !s.topGlow);
    r.classList.toggle('is-dark', s.appearance === 'dark' || (s.appearance === 'auto' && this.dark.matches));
    const text = TEXT_SIZES[s.size] ?? TEXT_SIZES[DEFAULT_SETTINGS.size];
    r.style.setProperty('--text-scale', String(Math.round((text / TEXT_SIZES[DEFAULT_SETTINGS.size]) * 1000) / 1000));
    r.style.setProperty('--body-size', `${text}px`);
    this.q('.mr-text-size').textContent = `${text} px`;
    this.q<HTMLButtonElement>('[data-act="smaller"]').disabled = s.size <= 0;
    this.q<HTMLButtonElement>('[data-act="larger"]').disabled = s.size >= TEXT_SIZES.length - 1;
    for (const group of this.shadow.querySelectorAll<HTMLElement>('[data-setting]')) {
      const value = s[group.dataset.setting as 'appearance' | 'images'];
      for (const b of group.querySelectorAll<HTMLElement>('[data-value]')) b.setAttribute('aria-pressed', String(b.dataset.value === value));
    }
    this.drawDiagrams();
  }

  private readonly onSchemeChange = () => this.applySettings();

  private drawDiagrams(): void {
    if (!this.rendered) return;
    const style = getComputedStyle(this.root);
    const palette = Object.fromEntries(PALETTE_KEYS.map((key) => [key, style.getPropertyValue(key === 'code' ? '--code-bg' : `--${key}`).trim()]));
    renderDiagrams(this.rendered.diagrams, this.root.classList.contains('is-dark'), () => {}, isPalette(palette) ? (palette as DiagramPalette) : undefined);
  }
}
