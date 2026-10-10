import { buildLens, MAX_CONFIG_CHARS, ORIGIN_NAMES, type ArchitectureInput, type ConfigReading, type LensName } from '../core/architecture.ts';
import { configFormat, type RepoDiscovery } from '../core/discovery.ts';
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
import {
  anchorState,
  exportMarkdown,
  exportMermaid,
  MAX_NOTES,
  NOTE_NAMES,
  sectionText,
  type Anchor,
  type AnchorState,
  type ExportContext,
  type Note,
} from '../core/notes.ts';
import { ReaderError, type RepositorySource } from '../platforms/types.ts';
import { highlightCode } from './code.ts';
import { readConfiguration } from './configs.ts';
import { isPalette, PALETTE_KEYS, type DiagramPalette } from './diagram-palette.ts';
import { renderDiagrams } from './diagrams.ts';
import { loadReaderFonts } from './fonts.ts';
import { chip, option, selectField, setRow, switchButton } from './dom.ts';
import { icons } from './icons.ts';
import { layoutPanel, LibraryLayout, LAYOUT_NAMES } from './layout-controls.ts';
import css from './reader.css';
import { digestText, ProjectNotes, when } from './project-store.ts';
import { loadImage, renderDocument, type RenderedDoc } from './render.ts';
import {
  button,
  configStatus,
  exportSheet,
  external,
  h,
  lensSwitch,
  lensView,
  notesView,
  reviewView,
  type ConfigState,
  type ReviewRelated,
} from './repo-views.ts';
import repoCss from './repo.css';
import { DEFAULT_SETTINGS, loadSettings, updateSettings, TEXT_SIZES, type Settings } from './settings.ts';
import { applyReadingControls, keyGroups, nextTab, PaletteCarousel, READING_SECTIONS, selectTab, settingsSheet, type Shortcuts } from './settings-sheet.ts';

/**
 * The repository reader: a project's docs read at one commit, with the same typography, sanitiser and
 * diagrams as the review reader, and none of its review operations. Its views share one index: Read,
 * a document with its contents and the documents that link to it; Map, one document's neighbourhood
 * of links, or what configuration and decision records state, with the evidence for each; Notes, the
 * reader's own thinking; and, when opened from a review, This review. History lasts as long as the
 * reader is open; notes, proposals and types are kept only when the reader saves them (ADR 0028).
 */

const WORDS_PER_MINUTE = 230;
/** Neighbours shown in a column of the map before "Show more". */
const MAP_COLUMN = 8;
/** Below this many documents, every folder of the outline starts open. */
const OPEN_OUTLINE = 40;
/** Room under the top bar when a paragraph is brought into view. */
const TOP = 72;
/** Configuration files read at a time. */
const CONFIG_CONCURRENCY = 4;
/** Longest address a new-issue link may have: browsers and platforms refuse longer ones. */
const MAX_ISSUE_URL = 8_000;

/** Every shortcut of the repository reader; the Keys tab lists them and onKey() handles them. */
const SHORTCUTS: Shortcuts = [
  [
    'Move through the library',
    [
      [['/'], 'Find a document or heading'],
      [['Alt', '←'], 'Back to where you were'],
      [['Alt', '→'], 'Forward again'],
    ],
  ],
  [
    'Views',
    [
      [['M'], 'Open the map, or go back to reading'],
      [['L'], 'Next reading layout'],
      [['N'], 'Open your notes, or go back to reading'],
    ],
  ],
  [
    'Settings',
    [
      [[','], 'Open settings'],
      [['?'], 'Show these shortcuts'],
      [['Esc'], 'Close what is open, then the reader'],
    ],
  ],
];
const SETTINGS_TABS = ['reading', 'layout', 'keys'];

const TEMPLATE = `
<div class="mr-root mr-repo" tabindex="-1" role="dialog" aria-modal="true" aria-label="Galley: project library">
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
      <button class="mr-btn mr-file-btn" data-act="docs" aria-haspopup="dialog" aria-expanded="false" title="Project library (/)"><span class="mr-file-name">Project library</span>${icons.chevronDown}</button>
    </div>
    <div class="mr-tb-right">
      <div class="mr-seg mr-repo-views" role="group" aria-label="View"><button data-view="review" aria-pressed="false" aria-label="This review" hidden>${icons.review}<span>This review</span></button><button data-view="read" aria-pressed="true" aria-label="Read">${icons.book}<span>Read</span></button><button data-view="map" aria-pressed="false" aria-label="Map" title="Map (M)">${icons.map}<span>Map</span></button><button data-view="notes" aria-pressed="false" aria-label="Notes" title="Your notes (N)">${icons.note}<span>Notes</span></button></div>
      <button class="mr-btn mr-repo-commit" data-act="refresh" hidden>${icons.refresh}<span class="mr-repo-commit-label"></span></button>
      <button class="mr-btn mr-icon-btn" data-act="settings" aria-haspopup="dialog" aria-expanded="false" title="Reading settings" aria-label="Reading settings">${icons.settings}</button>
    </div>
  </header>
  <div class="mr-menu mr-repo-docs" role="dialog" aria-label="Project library" hidden>
    <div class="mr-files-head"><p class="mr-files-title"></p><p class="mr-files-meta"></p></div>
    <input type="search" class="mr-repo-search" placeholder="Find a document or heading" aria-label="Find a document or heading">
    <div class="mr-repo-notes"></div>
    <nav class="mr-repo-outline" aria-label="Documents in this repository"></nav>
  </div>
${settingsSheet('Set type, appearance and layout for comfortable reading.', [
  {
    id: 'reading',
    label: 'Reading',
    icon: icons.book,
    panel: `${READING_SECTIONS}
      <section class="mr-settings-section" aria-label="Images">
        <div class="mr-set-row"><span>External images<small>Images hosted elsewhere can tell their host who is reading</small></span><div class="mr-seg" data-setting="images" role="group" aria-label="External images"><button data-value="ask">Ask</button><button data-value="load">Load</button></div></div>
      </section>
      <p class="mr-settings-note">Changes to your settings appear in both readers right away.</p>`,
  },
  { id: 'layout', label: 'Layout', icon: icons.layout, panel: layoutPanel('library') },
  {
    id: 'keys',
    label: 'Keys',
    icon: icons.keyboard,
    panel: `${keyGroups(SHORTCUTS)}
      <p class="mr-settings-note">Shortcuts work while the reader has focus and no text field is active. Press ? at any time to come back here.</p>`,
  },
])}
  <nav class="mr-toc" aria-label="Contents"></nav>
  <main class="mr-main">
    <article class="mr-article mr-repo-read"><div class="mr-doc"></div></article>
    <section class="mr-repo-map" aria-label="Project map" hidden></section>
    <div class="mr-repo-thinking" hidden></div>
    <div class="mr-repo-review" hidden></div>
  </main>
  <div class="mr-settings mr-repo-export" hidden>
    <div class="mr-settings-backdrop" data-act="close-export"></div>
    <aside class="mr-settings-panel" role="dialog" aria-modal="true" aria-labelledby="mr-export-title" tabindex="-1"></aside>
  </div>
  <div class="mr-repo-zoom" role="dialog" aria-modal="true" aria-label="Enlarged diagram" hidden><button class="mr-btn mr-icon-btn" data-act="close-zoom" aria-label="Close diagram (Esc)" title="Close (Esc)">${icons.close}</button><img alt=""></div>
  <p class="mr-toast" role="status" aria-live="polite" hidden></p>
</div>`;

const shortSha = (sha: string) => sha.slice(0, 7);
const edgeKey = (from: string, to: string) => `${from}\u0000${to}`;
const sectionKey = (anchor: Anchor) => `${anchor.path}\u0000${anchor.heading ?? ''}`;
const newId = (prefix: string) => `${prefix}:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en')} ${n === 1 ? one : many}`;
const folderOf = (path: string) => path.slice(0, Math.max(0, path.lastIndexOf('/')));
const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/** What the reader typed or chose in a view's forms, put back after the view is drawn again, with the focus. */
function typed(root: HTMLElement): () => void {
  const key = (form: HTMLFormElement) => `${form.dataset.act}:${form.dataset.id ?? form.dataset.from ?? form.dataset.lens ?? ''}`;
  const fields = (form: HTMLFormElement) => [...form.querySelectorAll<HTMLInputElement>('input, textarea, select, [role="switch"]')];
  const isSwitch = (el: HTMLElement) => el.getAttribute('role') === 'switch';
  const name = (el: HTMLInputElement) => el.name || el.dataset.act!;
  const active = (root.getRootNode() as ShadowRoot).activeElement;
  const before = new Map(
    [...root.querySelectorAll('form')].map((form) => [
      key(form),
      new Map(fields(form).map((el) => [name(el), { value: isSwitch(el) ? el.getAttribute('aria-checked')! : el.value, focused: el === active }])),
    ]),
  );
  return () => {
    for (const form of root.querySelectorAll('form')) {
      const saved = before.get(key(form));
      if (!saved) continue;
      for (const el of fields(form)) {
        const was = saved.get(name(el));
        if (!was) continue;
        if (isSwitch(el)) el.setAttribute('aria-checked', was.value);
        else el.value = was.value;
        if (was.focused) el.focus();
      }
      // Only alternatives answer a question.
      const group = form.querySelector<HTMLElement>('.mr-note-group');
      if (group) group.hidden = form.querySelector<HTMLSelectElement>('[data-act="note-kind"]')!.value !== 'alternative';
    }
  };
}

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

type View = 'read' | 'map' | 'notes' | 'review';

/** The review a repository reader was opened from (RFC 0049, Phase 5): its title, the revision read and its chapters. */
export interface ReviewContext {
  title: string;
  revision: 'base' | 'head';
  /** The branch of that revision. */
  ref: string;
  /** The review's chapters, in reading order, with the paths each one changes. */
  chapters: Array<{ title: string; paths: string[] }>;
}

let active: RepoReader | null = null;

export interface RepoReaderHandle {
  close(): void;
}

/** Open the repository reader over the page. Accepts a promise so it can show loading and errors itself. */
export function openRepository(
  source: RepositorySource | Promise<RepositorySource>,
  options: { onClose?: () => void; review?: ReviewContext } = {},
): RepoReaderHandle {
  active?.close();
  const reader = new RepoReader(options.onClose, options.review ?? null);
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
  private readonly layouts = new LibraryLayout();
  private source: RepositorySource | null = null;
  private discovery: Promise<RepoDiscovery> | null = null;
  private listing: RepoDiscovery | null = null;
  private index: ProjectIndex | null = null;
  private readonly corrections: Corrections = { docs: new Map(), folders: new Map() };
  private readonly cache = new Map<string, Promise<string>>();
  /** Documents read in this snapshot; those read before the listing arrived join the map as soon as it exists. */
  private readonly read = new Map<string, string>();
  /** The pass reading documents for the map, while it runs. */
  private indexing: { cancelled: boolean } | null = null;
  private readonly unreadable = { failed: new Set<string>(), skipped: new Set<string>() };
  private history: Place[] = [];
  private at = -1;
  private path: string | null = null;
  private rendered: RenderedDoc | null = null;
  private view: View = 'read';
  private focus: string | null = null;
  /** The map's lens: documents and their links, or what configuration and decision records state. */
  private lens: 'documents' | LensName = 'documents';
  private entityFocus: string | null = null;
  /** Configuration read at this snapshot's commit, by path; read only when the reader asks. */
  private readonly configs = new Map<string, ConfigReading>();
  private config: { state: ConfigState['state']; read: number; notes: string[]; run: { cancelled: boolean } | null } = {
    state: 'idle',
    read: 0,
    notes: [],
    run: null,
  };
  private notes: ProjectNotes | null = null;
  /** Notes chosen for export: this session only. */
  private readonly chosen = new Set<string>();
  private editing: string | null = null;
  /** The note whose list of things to connect to is open: one at a time, so long lists stay quick. */
  private connecting: string | null = null;
  private confirmDelete = false;
  private anchorStates = new Map<string, AnchorState>();
  private exportFormat: 'markdown' | 'mermaid' = 'markdown';
  /** The snapshot before a refresh: which documents had been read, and their links, to say what changed. */
  private previous: { commit: string; read: Set<string>; edges: Set<string> } | null = null;
  /** Paths the review changes, when opened from one. */
  private readonly changed: Set<string>;
  private search = '';
  /** The map reads its first batch by itself once; after that, only when the reader asks. */
  private indexedOnce = false;
  private toastTimer = 0;
  private readonly palettes = new PaletteCarousel(this.shadow);
  /** The control that opened the sheet that is open, to give focus back to: found again, as a view may be drawn anew. */
  private sheetOpener = '';
  private closed = false;
  private readonly dark = matchMedia('(prefers-color-scheme: dark)');
  private readonly prevOverflow: string;
  private readonly prevFocus: Element | null;

  constructor(
    private readonly onClose: (() => void) | undefined,
    private readonly review: ReviewContext | null,
  ) {
    this.changed = new Set(review?.chapters.flatMap((chapter) => chapter.paths));
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
    this.root.addEventListener('submit', (e) => this.onSubmit(e));
    if (review) {
      // Opened over a review: closing goes back to it, where the reader left it.
      const close = this.q('[data-act="close"]');
      close.title = 'Back to the review (Esc)';
      close.setAttribute('aria-label', 'Back to the review (Esc)');
      this.q('[data-view="review"]').hidden = false;
    }
    this.root.addEventListener('scroll', () => this.onScroll(), { passive: true });
    this.q('.mr-palette-track').addEventListener('scroll', () => this.palettes.update(), { passive: true });
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
    // Notes belong to the repository, not the commit: a refresh keeps them.
    const notes = new ProjectNotes(source.id);
    this.notes = notes;
    void notes.load().then(() => {
      if (this.closed) return;
      this.applyCorrections();
      this.redraw();
      if (this.view === 'notes') void this.checkAnchors();
    });
    // Opened from a review, the reader starts at what the review changes.
    if (this.review) void this.showReview();
    else this.start();
  }

  /** The document the reader was opened at; a folder or the repository opens at its README, else its first document. */
  private start(): void {
    const source = this.source!;
    if (!source.start.folder) {
      void this.open(source.start.path);
      return;
    }
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
    if (this.config.run) this.config.run.cancelled = true;
    this.notes?.flush();
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
    if (this.config.run) this.config.run.cancelled = true;
    // What was read before, to say which links changed and which notes need another look.
    if (this.index?.docs.size)
      this.previous = {
        commit: before.commit,
        read: new Set(this.index.docs.keys()),
        edges: new Set(this.index.edges.map((edge) => edgeKey(edge.from, edge.to))),
      };
    this.configs.clear();
    this.config = { state: 'idle', read: 0, notes: [], run: null };
    this.entityFocus = null;
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
    this.anchorStates = new Map();
    void this.checkAnchors();
    if (this.view !== 'read') {
      // The document is read again at the new commit when the reader goes back to it.
      this.rendered = null;
      this.q('.mr-doc').replaceChildren(this.skeleton());
      if (this.view === 'map') await this.showMap();
      else if (this.view === 'review') await this.showReview();
      else this.drawNotes();
    } else if (this.path) await this.open(this.path, { push: false });
    // Nothing was open, such as a repository without documents: start again at the new commit.
    else this.start();
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
    if (this.changed.has(path)) facts.append(chip('modified', 'Changed in this review'));
    const at = h('span', 'mr-repo-at', `${path} · ${source.ref ?? 'default branch'} @ ${shortSha(source.commit)}`);
    at.title = `Read at commit ${source.commit}`;
    facts.append(at);
    if (r.heldImages) facts.append(button(`Load ${plural(r.heldImages, 'external image')}`, 'load-images', 'mr-btn mr-chip is-images'));
    const actions = h('span', 'mr-file-actions');
    actions.append(button('Add a note', 'note-here', 'mr-repo-note'), external(`Open on ${source.platform}`, source.links.blob(path), 'mr-repo-open'));
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

  /** A document's type as a chip; one the reader set carries the accent, like everything else of theirs. */
  private kindChip(kind: DocKind, from: KindSource): HTMLElement {
    const el = chip(from === 'reader' ? 'own' : null, KIND_NAMES[kind]);
    el.title = `${KIND_NAMES[kind]}, ${KIND_SOURCES[from]}`;
    return el;
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

  /** Reflow the article around the paragraph in view, without moving a map or notes view. */
  private arrangeLayout(): void {
    this.remember();
    this.applySettings();
    const place = this.history[this.at];
    if (this.view === 'read' && place && this.rendered) this.restore(place);
  }

  private restore(place: Place): void {
    const block = this.rendered!.blocks[place.block];
    this.root.scrollTo({ top: block ? this.root.scrollTop + block.el.getBoundingClientRect().top - place.offset : 0 });
  }

  private reveal(el: Element): void {
    this.root.scrollTo({ top: this.root.scrollTop + el.getBoundingClientRect().top - TOP });
    el.classList.add('mr-flash');
    setTimeout(() => el.classList.remove('mr-flash'), 1600);
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
    if (this.changed.has(path)) item.append(chip('modified', 'Changed'));
    if (path === this.path) item.setAttribute('aria-current', 'true');
    return item;
  }

  // ---------------------------------------------------------------- map

  private setView(view: View): void {
    if (view !== this.view) this.remember();
    this.view = view;
    this.q('.mr-repo-read').hidden = view !== 'read';
    this.q('.mr-repo-map').hidden = view !== 'map';
    this.q('.mr-repo-thinking').hidden = view !== 'notes';
    this.q('.mr-repo-review').hidden = view !== 'review';
    // Focus never stays in a view that is hidden: it goes back to the reader.
    if (this.shadow.activeElement?.closest('[hidden]')) this.root.focus({ preventScroll: true });
    this.q('.mr-toc').hidden = view !== 'read';
    for (const b of this.shadow.querySelectorAll<HTMLElement>('[data-view]')) b.setAttribute('aria-pressed', String(b.dataset.view === view));
  }

  private async showMap(focus = this.path ?? this.focus): Promise<void> {
    if (!this.source) return;
    this.closeMenus();
    this.setView('map');
    // Once listed, the map is drawn at once.
    if (!this.index && !(await this.listed('map', this.q('.mr-repo-map'), 'map'))) return;
    const index = this.index!;
    this.focus = focus && index.documentAt(focus) ? index.documentAt(focus) : (index.documentAt('') ?? index.listed[0] ?? null);
    this.drawMap();
    this.autoIndex();
  }

  /** The listing, for a view that needs it: a skeleton meanwhile, and a way to try again when it fails. */
  private async listed(view: View, pane: HTMLElement, retry: string): Promise<boolean> {
    pane.replaceChildren(this.skeleton());
    try {
      await this.discover();
    } catch (err) {
      if (this.view === view) {
        const { title, hint } = problem(err);
        const box = h('div', 'mr-message');
        box.append(h('h2', '', title), h('p', '', hint), button('Try again', retry));
        pane.replaceChildren(box);
      }
      return false;
    }
    return !this.closed && this.view === view;
  }

  /** The map and the review view read a first batch of documents by themselves, once per snapshot. */
  private autoIndex(): void {
    if (!this.indexing && this.index!.unread().length && !this.indexedOnce) void this.indexMore();
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
    // Documents read for the map also count for suggestions in the architecture views.
    const load = async (path: string) => {
      const text = await this.load(path);
      if (!signal.cancelled) this.read.set(path, text);
      return text;
    };
    const result = await readForIndex(index, load, {
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
    else if (this.view === 'review') this.drawReview();
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

  private mapHead(): HTMLElement {
    const head = h('header', 'mr-map-head');
    head.append(h('h1', 'mr-title', 'Project map'), lensSwitch(this.lens), this.indexStatus());
    return head;
  }

  private drawMap(): void {
    if (this.lens !== 'documents') {
      this.drawLens(this.lens);
      return;
    }
    const map = this.q('.mr-repo-map');
    const index = this.index!;
    const head = this.mapHead();
    const since = this.sinceRefresh();
    if (since) head.append(since);
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
      if (this.changed.has(focus)) facts.append(chip('modified', 'Changed in this review'));
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

  /** The reader can correct a type, as a settings row; Galley says where every type came from. */
  private kindEditor(path: string, kind: DocKind, from: KindSource): HTMLElement {
    const box = h('div', 'mr-map-kind');
    const select = h('select');
    select.dataset.act = 'kind';
    select.dataset.path = path;
    for (const value of DOC_KINDS) select.append(option(value, KIND_NAMES[value], value === kind));
    box.append(
      setRow(
        'Type',
        selectField(select),
        from === 'reader' ? 'Set by you. Kept with your notes when you save them.' : `${KIND_NAMES[kind]}, ${KIND_SOURCES[from]}.`,
      ),
    );
    const folder = folderOf(path);
    if (folder)
      box.append(
        setRow(
          `Everything in ${folder}/`,
          switchButton('kind-folder', this.corrections.folders.has(folder) && !this.corrections.docs.has(path)),
          'The same type for the whole folder',
        ),
      );
    return box;
  }

  /** A type the reader sets is part of their notes: kept when they save, both types visible on the map. */
  private setKind(path: string, kind: DocKind, folderWide: boolean): void {
    const folder = folderOf(path);
    this.notes!.change((thinking) => {
      thinking.docKinds = thinking.docKinds.filter(([doc]) => doc !== path);
      if (folderWide && folder) thinking.folderKinds = [...thinking.folderKinds.filter(([at]) => at !== folder), [folder, kind]];
      else {
        thinking.folderKinds = thinking.folderKinds.filter(([at]) => at !== folder);
        thinking.docKinds.push([path, kind]);
      }
    });
    this.applyCorrections();
    this.drawMap();
    this.buildOutline();
  }

  /** The types the reader set, from their notes. */
  private applyCorrections(): void {
    const thinking = this.notes!.thinking;
    this.corrections.docs = new Map(thinking.docKinds);
    this.corrections.folders = new Map(thinking.folderKinds);
  }

  // ---------------------------------------------------------------- architecture, infrastructure and decisions

  private lensInput(): ArchitectureInput {
    const thinking = this.notes!.thinking;
    return {
      index: this.index!,
      corrections: this.corrections,
      configs: this.configs,
      texts: this.read,
      proposed: thinking,
      kinds: new Map(thinking.entityKinds),
    };
  }

  private configState(): ConfigState {
    const { state, read, notes } = this.config;
    return { state, read, notes, files: this.listing!.configs.files.length, commit: this.source!.commit };
  }

  private drawLens(lens: LensName): void {
    const map = this.q('.mr-repo-map');
    const source = this.source!;
    const model = buildLens(lens, this.lensInput());
    const restore = typed(map);
    map.replaceChildren(
      this.mapHead(),
      lensView({
        lens,
        model,
        focus: this.entityFocus,
        config: this.configState(),
        links: { isDocument: (path) => this.index!.documentAt(path) === path, fileAt: (path, line) => `${source.links.blob(path)}#L${line}` },
        reading: this.path ? { path: this.path, title: this.titleOf(this.path) } : null,
      }),
    );
    restore();
  }

  /**
   * Read the listed configuration files in the sandboxed frame, a few at a time, only when the reader
   * asks. Nothing in them is run or followed; what could not be read is said.
   */
  private async readConfigs(): Promise<void> {
    const { files, limits } = this.listing!.configs;
    const run = { cancelled: false };
    const notes = [...limits];
    this.config = { state: 'reading', read: 0, notes, run };
    this.updateConfigStatus();
    let next = 0;
    const work = async () => {
      while (next < files.length) {
        const file = files[next++];
        const listedLarge = (file.size ?? 0) > MAX_CONFIG_CHARS;
        const text = listedLarge ? null : await this.load(file.path).catch(() => null);
        if (run.cancelled) return;
        const large = listedLarge || (text ?? '').length > MAX_CONFIG_CHARS;
        const reading = text === null || large ? null : await readConfiguration(this.shadow, file.path, configFormat(file.path)!, text);
        if (run.cancelled) return;
        if (reading) {
          this.configs.set(file.path, reading);
          this.config.read++;
          for (const note of reading.notes) notes.push(`${file.path}: ${note}`);
        } else notes.push(large ? `${file.path} is too large to read.` : `${file.path} could not be read.`);
        this.updateConfigStatus();
      }
    };
    await Promise.all(Array.from({ length: CONFIG_CONCURRENCY }, work));
    if (run.cancelled) return;
    this.config.state = 'done';
    this.config.run = null;
    this.redraw();
  }

  private updateConfigStatus(): void {
    for (const box of this.shadow.querySelectorAll('.mr-lens-configs')) box.replaceWith(configStatus(this.configState()));
  }

  /** Draw the current view again after its data changed, keeping what the reader is typing. */
  private redraw(): void {
    if (!this.index && this.view !== 'notes') return;
    if (this.view === 'map') this.drawMap();
    else if (this.view === 'review') this.drawReview();
    else if (this.view === 'notes') this.drawNotes();
    else this.buildOutline();
  }

  /** After a refresh: links that changed among the documents read at both commits, and notes to look at again. */
  private sinceRefresh(): HTMLElement | null {
    const previous = this.previous;
    if (!previous) return null;
    const index = this.index!;
    const both = (path: string) => previous.read.has(path) && index.docs.has(path);
    const now = index.edges.filter((edge) => both(edge.from)).map((edge) => edgeKey(edge.from, edge.to));
    const added = now.filter((key) => !previous.edges.has(key));
    const gone = [...previous.edges].filter((key) => both(key.split('\u0000')[0]) && !now.includes(key));
    const read = [...previous.read].filter(both).length;
    const box = h('section', 'mr-map-since');
    box.setAttribute('aria-label', `Since ${shortSha(previous.commit)}`);
    const head = h('h3', '', `Since ${shortSha(previous.commit)}`);
    box.append(head);
    box.append(
      h(
        'p',
        '',
        added.length || gone.length
          ? `Among the ${plural(read, 'document')} read at both commits, ${plural(added.length, 'link is', 'links are')} new and ${plural(gone.length, 'link is', 'links are')} gone.`
          : `No links changed among the ${plural(read, 'document')} read at both commits.`,
      ),
    );
    const list = h('ul', 'mr-map-since-list');
    for (const [key, what] of [...added.map((key) => [key, 'New'] as const), ...gone.map((key) => [key, 'Gone'] as const)]) {
      const [from, to] = key.split('\u0000');
      const item = h('li', '', `${what}: `);
      const a = button(this.titleOf(from), 'focus', 'mr-repo-edge-doc');
      a.dataset.path = from;
      const b = button(this.titleOf(to), 'focus', 'mr-repo-edge-doc');
      b.dataset.path = to;
      item.append(a, ' → ', b);
      list.append(item);
    }
    if (list.childElementCount) box.append(list);
    const stale = [...this.anchorStates.values()].filter((state) => state === 'changed' || state === 'missing').length;
    if (stale)
      box.append(
        h('p', '', `${plural(stale, 'of your notes is', 'of your notes are')} about a section that changed or is gone.`),
        button('Look at them', 'view-notes'),
      );
    box.append(button('Dismiss', 'dismiss-since'));
    return box;
  }

  private proposeEntity(form: HTMLFormElement): void {
    const data = new FormData(form);
    const name = String(data.get('name')).trim();
    if (!name) return;
    // The switch is there only while a document is open: on, the proposal is about that document.
    const about = form.querySelector('[data-act="propose-about"]')?.getAttribute('aria-checked') === 'true';
    const reading = about ? { path: this.path!, label: this.titleOf(this.path!).slice(0, 200) } : null;
    const entity = { id: newId('reader'), name, kind: String(data.get('kind')), lens: form.dataset.lens as 'architecture' | 'infrastructure', anchor: reading };
    this.notes!.change((thinking) => thinking.entities.push(entity));
    this.entityFocus = entity.id;
    form.reset();
    this.drawMap();
    this.toast(`${name} added as your proposal. Save your notes to keep it.`);
  }

  private proposeRelation(form: HTMLFormElement): void {
    const data = new FormData(form);
    const relation = { id: newId('link'), from: form.dataset.from!, to: String(data.get('to')), label: String(data.get('label')).trim() };
    if (!relation.label) return;
    this.notes!.change((thinking) => {
      const same = thinking.relations.some((r) => r.from === relation.from && r.to === relation.to && r.label === relation.label);
      if (!same) thinking.relations.push(relation);
    });
    this.drawMap();
  }

  // ---------------------------------------------------------------- notes

  private showNotes(): void {
    this.closeMenus();
    this.setView('notes');
    this.drawNotes();
    void this.checkAnchors();
  }

  /** What a new note can be about: the document being read, whole or one of its sections. */
  private anchorOptions(): Map<string, { path: string; heading: string | null; label: string; text: string }> {
    const options = new Map<string, { path: string; heading: string | null; label: string; text: string }>();
    const path = this.path;
    const text = path === null ? undefined : this.read.get(path);
    if (text === undefined) return options;
    const doc = indexDocument(path!, text);
    const title = doc.title.slice(0, 200);
    options.set(`${path}\u0000`, { path: path!, heading: null, label: title, text });
    for (const heading of doc.headings.filter((heading) => heading.id.length <= 200))
      options.set(`${path}\u0000${heading.id}`, { path: path!, heading: heading.id, label: `${title} § ${heading.text}`.slice(0, 400), text });
    return options;
  }

  private noteLabel(note: Note): string {
    const line = note.text.split('\n')[0];
    return `${NOTE_NAMES[note.kind]}: ${line.length > 60 ? `${line.slice(0, 59)}…` : line}`;
  }

  /** What a note can be connected to: other notes, and the components, services and environments in the views. */
  private targets(): Array<{ id: string; label: string }> {
    const notes = this.notes!.thinking.notes.map((note) => ({ id: note.id, label: this.noteLabel(note) }));
    if (!this.index) return notes;
    const entities = (['architecture', 'infrastructure'] as const).flatMap((lens) =>
      buildLens(lens, this.lensInput()).entities.filter((entity) => !entity.doc),
    );
    return [...notes, ...entities.map((entity) => ({ id: entity.id, label: `${entity.name} (${entity.kind}, ${ORIGIN_NAMES[entity.origin].toLowerCase()})` }))];
  }

  private drawNotes(): void {
    const notes = this.notes!;
    const pane = this.q('.mr-repo-thinking');
    const restore = typed(pane);
    pane.replaceChildren(
      notesView({
        notes: notes.thinking.notes,
        state: notes.state,
        dirty: notes.dirty,
        error: notes.error,
        recovery: notes.offer ? { at: when(notes.offer.at) } : null,
        confirmDelete: this.confirmDelete,
        anchors: [...this.anchorOptions()].map(([value, option]) => ({ value, label: option.label })),
        anchorStates: this.anchorStates,
        targets: this.targets(),
        editing: this.editing,
        connecting: this.connecting,
      }),
    );
    restore();
  }

  /** Whether each note's section is still as it was when the note was written, at the commit read. */
  private async checkAnchors(): Promise<void> {
    const source = this.source!;
    const listing = await this.discover().catch(() => null);
    // Fingerprints of the sections notes are about, at this commit; null for a section or document that is gone.
    const sections = new Map<string, string | null>();
    for (const note of this.notes!.thinking.notes) {
      const anchor = note.anchor;
      if (!anchor || anchor.commit === source.commit) continue;
      let digest: string | null = null;
      if (!listing || listing.docs.some((doc) => doc.path === anchor.path)) {
        // A document that cannot be read now says nothing about its sections.
        const text = await this.load(anchor.path).catch(() => null);
        if (text === null) continue;
        const section = sectionText(text, anchor.heading);
        digest = section === null ? null : await digestText(section);
      }
      sections.set(sectionKey(anchor), digest);
    }
    if (this.closed || this.source !== source) return;
    // States come from each note's anchor as it is now: one reconfirmed or detached meanwhile is not undone.
    for (const note of this.notes!.thinking.notes) {
      const anchor = note.anchor;
      if (anchor && (anchor.commit === source.commit || sections.has(sectionKey(anchor))))
        this.anchorStates.set(note.id, anchorState(anchor, source.commit, sections.get(sectionKey(anchor)) ?? null));
    }
    if (this.view === 'notes') this.drawNotes();
    else if (this.view === 'map' && this.previous) this.drawMap();
  }

  private async addNote(form: HTMLFormElement): Promise<void> {
    const notes = this.notes!;
    const data = new FormData(form);
    const text = String(data.get('text')).trim();
    if (!text) return;
    if (notes.thinking.notes.length >= MAX_NOTES) {
      this.toast(`You have ${MAX_NOTES} notes, the most Galley keeps for one repository. Delete some to add more.`);
      return;
    }
    const kind = data.get('kind') as Note['kind'];
    const choice = this.anchorOptions().get(String(data.get('anchor')));
    const source = this.source!;
    const anchor = choice
      ? {
          path: choice.path,
          heading: choice.heading,
          label: choice.label,
          commit: source.commit,
          digest: await digestText(sectionText(choice.text, choice.heading)!),
        }
      : null;
    const now = Date.now();
    const note: Note = {
      id: newId('note'),
      kind,
      text,
      group: kind === 'alternative' ? String(data.get('group')).trim() : '',
      anchor,
      links: [],
      created: now,
      updated: now,
    };
    notes.change((thinking) => thinking.notes.push(note));
    if (anchor) this.anchorStates.set(note.id, 'current');
    // The form may have been drawn again meanwhile: the one on screen is the one to clear.
    this.q<HTMLFormElement>('form[data-act="add-note"]').reset();
    this.drawNotes();
    this.q<HTMLTextAreaElement>('form[data-act="add-note"] textarea').focus();
  }

  private saveNote(form: HTMLFormElement): void {
    const data = new FormData(form);
    const text = String(data.get('text')).trim();
    if (!text) return;
    const kind = data.get('kind') as Note['kind'];
    const id = form.dataset.id!;
    this.notes!.change((thinking) => {
      const note = thinking.notes.find((n) => n.id === id)!;
      note.kind = kind;
      note.text = text;
      note.group = kind === 'alternative' ? String(data.get('group')).trim() : '';
      note.updated = Date.now();
    });
    this.editing = null;
    this.drawNotes();
    this.focusNote(id);
  }

  private focusNote(id: string, act = 'edit-note'): void {
    this.shadow.querySelector<HTMLElement>(`.mr-note[data-id="${CSS.escape(id)}"] [data-act="${act}"]`)?.focus();
  }

  private changeNote(id: string, change: (note: Note) => void): void {
    this.notes!.change((thinking) => change(thinking.notes.find((note) => note.id === id)!));
    this.drawNotes();
  }

  /** The reader has looked again at a changed section: the note is about it as it is now. */
  private async reconfirm(id: string): Promise<void> {
    const source = this.source!;
    const anchor = this.notes!.thinking.notes.find((note) => note.id === id)!.anchor!;
    // The section was just checked at this commit, and the document is cached.
    const digest = await digestText(sectionText(await this.load(anchor.path), anchor.heading)!);
    if (this.source !== source) return;
    this.changeNote(id, (note) => {
      note.anchor = { ...anchor, commit: source.commit, digest };
    });
    this.anchorStates.set(id, 'current');
    this.drawNotes();
    this.toast(`Reconfirmed at ${shortSha(source.commit)}. Save your notes to keep it.`);
  }

  private deleteNote(id: string): void {
    this.notes!.change((thinking) => {
      thinking.notes = thinking.notes.filter((note) => note.id !== id);
      for (const note of thinking.notes) note.links = note.links.filter((link) => link !== id);
    });
    this.chosen.delete(id);
    this.drawNotes();
    this.toast('Note deleted. Your saved notes keep it until you save.');
  }

  private async afterStore(done: Promise<boolean>, success: string, then?: () => void): Promise<void> {
    const ok = await done;
    if (this.closed) return;
    if (ok) {
      then?.();
      this.toast(success);
    }
    this.drawNotes();
  }

  // ---------------------------------------------------------------- export

  private exportText(): string {
    const source = this.source!;
    const targets = this.targets();
    const ctx: ExportContext = {
      name: source.name,
      ref: source.ref,
      commit: source.commit,
      date: new Date().toISOString().slice(0, 10),
      link: (path, heading) => `${source.links.blob(path)}${heading ? `#${heading}` : ''}`,
      describe: (id) => targets.find((target) => target.id === id)?.label ?? null,
    };
    const thinking = this.notes!.thinking;
    return this.exportFormat === 'markdown' ? exportMarkdown(thinking, this.chosen, ctx) : exportMermaid(thinking, this.chosen, ctx);
  }

  private drawExport(): void {
    const source = this.source!;
    const notes = this.notes!.thinking.notes;
    const text = notes.some((note) => this.chosen.has(note.id)) ? this.exportText() : '';
    const issue = text ? source.newIssue(`Notes on ${source.name}`, text) : '';
    this.q('.mr-repo-export .mr-settings-panel').replaceChildren(
      ...exportSheet({
        format: this.exportFormat,
        text,
        notes: notes.map((note) => ({
          id: note.id,
          label: note.text.split('\n')[0],
          about: note.anchor ? `${NOTE_NAMES[note.kind]} about ${note.anchor.label}` : NOTE_NAMES[note.kind],
          chosen: this.chosen.has(note.id),
        })),
        issue: issue.length <= MAX_ISSUE_URL ? issue : null,
        platform: source.platform,
      }),
    );
  }

  private openExport(): void {
    this.drawExport();
    this.openSheet(this.q('.mr-repo-export'), '[data-act="export"]');
  }

  private downloadExport(): void {
    const markdown = this.exportFormat === 'markdown';
    const url = URL.createObjectURL(new Blob([this.exportText()], { type: markdown ? 'text/markdown' : 'text/plain' }));
    const a = h('a');
    a.href = url;
    a.download = `${this.source!.name.replace(/[^\w.-]+/g, '-')}-notes.${markdown ? 'md' : 'mmd'}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  // ---------------------------------------------------------------- a review's project context

  private async showReview(): Promise<void> {
    this.closeMenus();
    this.setView('review');
    if (!this.index && !(await this.listed('review', this.q('.mr-repo-review'), 'show-review'))) return;
    this.drawReview();
    this.autoIndex();
  }

  /** Documents read so far that link to a path: each with the links that connect them, flagged, never judged. */
  private relatedTo(path: string): ReviewRelated[] {
    const index = this.index!;
    const found = new Map<string, ReviewRelated>();
    for (const doc of index.docs.values()) {
      if (doc.path === path) continue;
      for (const link of doc.links) {
        if (link.path === null || (link.path !== path && index.documentAt(link.path) !== path)) continue;
        const { kind } = classify(doc, this.corrections);
        const entry = found.get(doc.path) ?? {
          path: doc.path,
          title: doc.title,
          kind: kind === 'other' ? null : KIND_NAMES[kind],
          flag: this.changed.has(doc.path) ? 'changed' : 'worth-checking',
          evidence: [],
        };
        entry.evidence.push({ path: doc.path, line: link.line, text: link.text || link.href });
        found.set(doc.path, entry);
      }
    }
    return [...found.values()].sort((a, b) => Number(a.flag > b.flag) - Number(a.flag < b.flag) || a.title.localeCompare(b.title, 'en', { numeric: true }));
  }

  private drawReview(): void {
    const review = this.review!;
    const index = this.index!;
    const source = this.source!;
    const status = h('div', 'mr-review-status');
    status.append(this.indexStatus());
    const configs = new Set(this.listing!.configs.files.map((file) => file.path));
    if ([...this.changed].some((path) => configs.has(path))) status.append(configStatus(this.configState()));
    this.q('.mr-repo-review').replaceChildren(
      reviewView({
        title: review.title,
        revision: `its ${review.revision}, ${review.ref} @ ${shortSha(source.commit)}`,
        status,
        chapters: review.chapters.map((chapter) => ({
          title: chapter.title,
          files: chapter.paths.map((path) => ({
            path,
            changedDoc: index.documentAt(path) === path,
            related: this.relatedTo(path),
            declares: (this.configs.get(path)?.items ?? []).slice(0, 12).map((item) => item.name),
          })),
        })),
      }),
    );
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

  private get settingsSheet(): HTMLElement {
    return this.q('.mr-settings:not(.mr-repo-export)');
  }

  private openSheetEl(): HTMLElement | null {
    return this.shadow.querySelector<HTMLElement>('.mr-settings:not([hidden])');
  }

  private openSettings(tab: string): void {
    selectTab(this.settingsSheet, tab, false);
    this.openSheet(this.settingsSheet, '[data-act="settings"]');
    this.palettes.reveal(this.settings.theme);
  }

  /** Settings and export open as sheets: the reader behind goes inert, and focus comes back to what opened them. */
  private openSheet(sheet: HTMLElement, opener: string): void {
    this.closeMenus();
    sheet.hidden = false;
    this.sheetOpener = opener;
    this.q(opener).setAttribute('aria-expanded', 'true');
    for (const el of this.root.querySelectorAll<HTMLElement>('.mr-topbar, .mr-main, .mr-toc')) el.inert = true;
    sheet.querySelector<HTMLElement>('.mr-settings-heading .mr-icon-btn')!.focus();
  }

  private closeSheet(): boolean {
    const sheet = this.openSheetEl();
    if (!sheet) return false;
    sheet.hidden = true;
    for (const el of this.root.querySelectorAll<HTMLElement>('.mr-topbar, .mr-main, .mr-toc')) el.inert = false;
    const opener = this.q(this.sheetOpener);
    opener.setAttribute('aria-expanded', 'false');
    opener.focus({ preventScroll: true });
    return true;
  }

  private closeMenus(): boolean {
    let closed = false;
    for (const [menu, control] of [['.mr-repo-docs', '[data-act="docs"]']]) {
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
      else if (view.dataset.view === 'notes') this.showNotes();
      else if (view.dataset.view === 'review') void this.showReview();
      else if (this.path && this.rendered?.content.isConnected) this.setView('read');
      else if (this.path) void this.open(this.path, { push: false });
      else this.start();
      return;
    }
    const el = target.closest<HTMLElement>('[data-act]');
    const value = target.closest<HTMLElement>('[data-setting] [data-value]');
    if (value) {
      const key = value.closest<HTMLElement>('[data-setting]')!.dataset.setting!;
      if (key === 'layout') {
        if (this.layouts.select(value.dataset.value!)) this.arrangeLayout();
      } else this.update({ [key]: value.dataset.value });
      return;
    }
    const tab = target.closest<HTMLElement>('[data-settings-tab]');
    if (tab) {
      selectTab(this.settingsSheet, tab.dataset.settingsTab!);
      return;
    }
    if (!el) {
      if (!target.closest('.mr-menu, [data-act="docs"], [data-act="settings"]')) this.closeMenus();
      return;
    }
    const path = el.dataset.path;
    const id = el.dataset.id!;
    const notes = this.notes!;
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
      case 'settings':
        this.openSettings('reading');
        return;
      case 'close-settings':
      case 'close-export':
        this.closeSheet();
        return;
      case 'palette-prev':
      case 'palette-next':
      case 'palette-page':
        this.palettes.onClick(el.dataset.act, el);
        return;
      case 'top-glow':
        this.update({ topGlow: !this.settings.topGlow });
        return;
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
        if (this.source!.start.folder && !this.path) this.start();
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
      // ---- map lenses
      case 'lens':
        this.lens = el.dataset.lens as 'documents' | LensName;
        this.entityFocus = null;
        this.drawMap();
        this.q(`[data-act="lens"][data-lens="${this.lens}"]`).focus();
        return;
      case 'entity':
        this.entityFocus = id;
        this.drawMap();
        this.q('.mr-map-title').focus();
        return;
      case 'doc-map':
        this.lens = 'documents';
        this.focus = path!;
        this.drawMap();
        this.q('.mr-map-title').focus();
        return;
      case 'read-configs':
        return void this.readConfigs();
      case 'kind-folder': {
        const select = el.closest('.mr-map-kind')!.querySelector<HTMLSelectElement>('[data-act="kind"]')!;
        this.setKind(select.dataset.path!, select.value as DocKind, el.getAttribute('aria-checked') !== 'true');
        this.q('[data-act="kind-folder"]').focus();
        return;
      }
      case 'propose-about':
        el.setAttribute('aria-checked', String(el.getAttribute('aria-checked') !== 'true'));
        return;
      case 'remove-entity':
        notes.change((thinking) => {
          thinking.entities = thinking.entities.filter((entity) => entity.id !== id);
          thinking.relations = thinking.relations.filter((relation) => relation.from !== id && relation.to !== id);
          for (const note of thinking.notes) note.links = note.links.filter((link) => link !== id);
        });
        this.entityFocus = null;
        this.drawMap();
        return;
      case 'remove-relation': {
        const { from, to, label } = el.dataset;
        notes.change((thinking) => {
          thinking.relations = thinking.relations.filter((relation) => relation.from !== from || relation.to !== to || relation.label !== label);
        });
        this.drawMap();
        return;
      }
      case 'dismiss-since':
        this.previous = null;
        this.drawMap();
        return;
      // ---- notes
      case 'view-notes':
        this.showNotes();
        return;
      case 'note-here':
        this.showNotes();
        this.q('form[data-act="add-note"] textarea').focus();
        return;
      case 'save-notes':
        return void this.afterStore(notes.save(), 'Notes saved in this browser.');
      case 'delete-notes':
        this.confirmDelete = true;
        this.drawNotes();
        this.q('[data-act="confirm-delete-notes"]').focus();
        return;
      case 'confirm-delete-notes':
        this.confirmDelete = false;
        return void this.afterStore(notes.deleteAll(), 'Your notes for this repository are deleted.', () => {
          this.chosen.clear();
          this.anchorStates.clear();
          this.applyCorrections();
        });
      case 'cancel-delete-notes':
        this.confirmDelete = false;
        this.drawNotes();
        this.q('[data-act="delete-notes"]').focus();
        return;
      case 'recover':
        notes.recover();
        this.applyCorrections();
        this.drawNotes();
        this.toast('Your unsaved notes are back. Save to keep them.');
        void this.checkAnchors();
        return;
      case 'discard-draft':
        return void this.afterStore(notes.discard(), 'Unsaved notes discarded.');
      case 'reconfirm':
        return void this.reconfirm(id);
      case 'detach':
        this.anchorStates.delete(id);
        this.changeNote(id, (note) => {
          note.anchor = null;
        });
        return;
      case 'connect':
        this.connecting = id;
        this.drawNotes();
        this.q('[data-act="connect-note"]').focus();
        return;
      case 'cancel-connect':
        this.connecting = null;
        this.drawNotes();
        this.focusNote(id, 'connect');
        return;
      case 'disconnect':
        this.changeNote(id, (note) => {
          note.links = note.links.filter((link) => link !== el.dataset.link);
        });
        return;
      case 'edit-note':
        this.editing = id;
        this.drawNotes();
        this.q('form[data-act="save-note"] textarea').focus();
        return;
      case 'cancel-edit': {
        const editing = this.editing!;
        this.editing = null;
        this.drawNotes();
        this.focusNote(editing);
        return;
      }
      case 'delete-note':
        this.deleteNote(id);
        return;
      // ---- export
      case 'export':
        this.openExport();
        return;
      case 'choose-note':
        if (this.chosen.has(id)) this.chosen.delete(id);
        else this.chosen.add(id);
        this.drawExport();
        this.q(`[data-act="choose-note"][data-id="${CSS.escape(id)}"]`).focus();
        return;
      case 'export-format':
        this.exportFormat = el.dataset.format as 'markdown' | 'mermaid';
        this.drawExport();
        this.q(`[data-act="export-format"][data-format="${this.exportFormat}"]`).focus();
        return;
      case 'copy-export':
        void navigator.clipboard.writeText(this.exportText()).then(
          () => this.toast('Copied. Paste it where you choose.'),
          () => this.toast('Galley could not copy. Select the text and copy it instead.'),
        );
        return;
      case 'download-export':
        this.downloadExport();
        return;
      // ---- review
      case 'show-review':
        return void this.showReview();
      case 'smaller':
      case 'larger':
        this.update({ size: Math.min(TEXT_SIZES.length - 1, Math.max(0, this.settings.size + (el.dataset.act === 'larger' ? 1 : -1))) });
        return;
    }
  }

  private onChange(e: Event): void {
    const el = e.target as HTMLInputElement;
    const id = el.dataset.id!;
    if (el.id === 'mr-typeface') {
      this.update({ font: el.value as Settings['font'] });
      return;
    }
    switch (el.dataset.act) {
      case 'kind': {
        const folderWide = el.closest('.mr-map-kind')!.querySelector('[data-act="kind-folder"]')?.getAttribute('aria-checked') === 'true';
        this.setKind(el.dataset.path!, el.value as DocKind, folderWide);
        this.q('[data-act="kind"]').focus();
        return;
      }
      case 'note-kind':
        // Only alternatives answer a question.
        el.closest('form')!.querySelector<HTMLElement>('.mr-note-group')!.hidden = el.value !== 'alternative';
        return;
      case 'entity-kind': {
        // The reader's own proposal changes; a declared or documented type stays visible beside theirs.
        const kind = el.value;
        this.notes!.change((thinking) => {
          const proposed = thinking.entities.find((entity) => entity.id === id);
          if (proposed) proposed.kind = kind;
          else
            thinking.entityKinds = [
              ...thinking.entityKinds.filter(([entity]) => entity !== id),
              ...(kind === el.dataset.original ? [] : [[id, kind] as [string, string]]),
            ];
        });
        this.drawMap();
        this.q('[data-act="entity-kind"]').focus();
        return;
      }
      case 'connect-note': {
        const to = el.value;
        this.connecting = null;
        this.changeNote(id, (note) => {
          note.links.push(to);
        });
        this.focusNote(id, 'connect');
        return;
      }
    }
  }

  private onSubmit(e: SubmitEvent): void {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    switch (form.dataset.act) {
      case 'propose-entity':
        this.proposeEntity(form);
        return;
      case 'propose-relation':
        this.proposeRelation(form);
        return;
      case 'add-note':
        void this.addNote(form);
        return;
      case 'save-note':
        this.saveNote(form);
        return;
    }
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
      if (this.closeSheet()) return;
      if (this.closeZoom() || this.closeMenus()) {
        this.root.focus({ preventScroll: true });
        return;
      }
      this.close();
      return;
    }
    const sheet = this.openSheetEl();
    if (sheet && e.key === 'Tab') {
      // Focus stays inside an open sheet.
      const controls = [...sheet.querySelectorAll<HTMLElement>('button, a[href], input, textarea, select, [tabindex="0"]')].filter(
        (el) => el.getClientRects().length && !el.matches(':disabled'),
      );
      const at = controls.indexOf(this.shadow.activeElement as HTMLElement);
      controls[e.shiftKey ? (at <= 0 ? controls.length - 1 : at - 1) : (at + 1) % controls.length].focus();
      e.preventDefault();
      return;
    }
    const target = e.composedPath()[0];
    const tab = target instanceof HTMLElement && target.matches('[data-settings-tab]') ? nextTab(SETTINGS_TABS, target.dataset.settingsTab!, e.key) : null;
    if (tab) {
      e.preventDefault();
      selectTab(this.settingsSheet, tab, true);
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
    if (sheet) return;
    if (e.key === '/') {
      e.preventDefault();
      this.toggleDocs(true);
    } else if (e.key === ',' || e.key === '?') {
      e.preventDefault();
      this.openSettings(e.key === '?' ? 'keys' : 'reading');
    } else if (e.key === 'l' || e.key === 'L') {
      e.preventDefault();
      this.layouts.next();
      this.arrangeLayout();
      this.toast(`Layout: ${LAYOUT_NAMES[this.layouts.value]}`);
    } else if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      if (this.view === 'map') this.q<HTMLElement>('[data-view="read"]').click();
      else void this.showMap();
    } else if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      if (this.view === 'notes') this.q<HTMLElement>('[data-view="read"]').click();
      else this.showNotes();
    }
  }

  // ---------------------------------------------------------------- settings

  private update(patch: Partial<Settings>): void {
    this.settings = { ...this.settings, ...patch };
    this.applySettings();
    if (patch.images === 'load' && this.rendered)
      for (const img of this.rendered.content.querySelectorAll<HTMLImageElement>('img[data-mr-src]')) loadImage(img);
    void updateSettings(patch);
  }

  private applySettings(): void {
    const s = this.settings;
    const r = this.root;
    r.dataset.font = s.font;
    r.dataset.theme = s.theme;
    r.dataset.density = s.density;
    r.dataset.layout = this.layouts.value;
    r.classList.toggle('no-top-glow', !s.topGlow);
    r.classList.toggle('is-dark', s.appearance === 'dark' || (s.appearance === 'auto' && this.dark.matches));
    const text = TEXT_SIZES[s.size] ?? TEXT_SIZES[DEFAULT_SETTINGS.size];
    r.style.setProperty('--text-scale', String(Math.round((text / TEXT_SIZES[DEFAULT_SETTINGS.size]) * 1000) / 1000));
    r.style.setProperty('--body-size', `${text}px`);
    applyReadingControls(this.shadow, { ...s, layout: this.layouts.value });
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
