import { ReaderError, type DocContents, type DocRef, type DocStatus, type ReviewSource, type CommentTarget, type CommentPlan, type Thread } from '../platforms/types.ts';
import { highlightCode, languageName, languageOf } from './code.ts';
import { renderCodeFile } from './code-files.ts';
import { renderDiagrams } from './diagrams.ts';
import { viewedKey, loadViewed, saveViewed } from './viewed.ts';
import { icons } from './icons.ts';
import css from './reader.css';
import { loadImage, platformLink, renderDocument, renderSnippet, type RenderedBlock, type RenderedDoc } from './render.ts';
import { filterDocument, paragraphTarget, selectionTarget } from './reading.ts';
import { DEFAULT_SETTINGS, TEXT_SIZES, loadSettings, saveSettings, type Settings } from './settings.ts';

const STATUS_LABEL: Record<DocStatus, string> = { added: 'New', removed: 'Deleted', modified: 'Edited', renamed: 'Renamed' };
const WORDS_PER_MINUTE = 230;
/** Changes are brought to this fraction of the viewport height when navigating. */
const FOCUS_LINE = 0.3;

const TEMPLATE = `
<div class="mr-root mode-changes" tabindex="-1" role="dialog" aria-modal="true" aria-label="Galley reader">
  <div class="mr-progress"><div></div></div>
  <header class="mr-topbar">
    <div class="mr-tb-left">
      <button class="mr-btn mr-icon-btn" data-act="close" title="Close reader (Esc)" aria-label="Close reader (Esc)">${icons.close}</button>
      <span class="mr-brand">galley${__GALLEY_DEV__ ? '<span class="mr-dev">dev</span>' : ''}</span>
    </div>
    <div class="mr-tb-center">
      <button class="mr-btn mr-file-btn" data-act="files" aria-haspopup="menu" aria-expanded="false" hidden>
        <span class="mr-status-dot" aria-hidden="true"></span><span class="mr-file-name"></span><span class="mr-count"></span>${icons.chevronDown}
      </button>
    </div>
    <div class="mr-tb-right">
      <button class="mr-btn mr-icon-btn mr-viewed" data-act="viewed" aria-pressed="false" disabled hidden>${icons.viewed}</button>
      <button class="mr-btn mr-icon-btn" data-act="settings" aria-haspopup="dialog" aria-expanded="false" title="Reading settings" aria-label="Reading settings">${icons.settings}</button>
    </div>
  </header>
  <p class="mr-viewed-feedback" role="status" hidden></p>
  <div class="mr-menu mr-files" role="menu" aria-label="Changed documents" hidden></div>
  <div class="mr-settings" hidden>
    <div class="mr-settings-backdrop" data-act="close-settings"></div>
    <aside class="mr-settings-panel" role="dialog" aria-modal="true" aria-labelledby="mr-settings-title" tabindex="-1">
      <header class="mr-settings-heading"><h2 id="mr-settings-title">Reading settings</h2><button class="mr-btn mr-icon-btn" data-act="close-settings" aria-label="Close settings (Esc)" title="Close settings (Esc)">${icons.close}</button></header>
      <section class="mr-settings-section" aria-label="Review">
        <div class="mr-set-row"><span>Changes</span><div class="mr-seg" role="group" aria-label="Show changes"><button data-mode="changes" aria-pressed="true">Marked</button><button data-mode="clean" aria-pressed="false">Clean</button></div></div>
        <div class="mr-set-row"><span>Show</span><div class="mr-seg" role="group" aria-label="Paragraph filter"><button data-scope="changed" aria-pressed="true">Changed parts</button><button data-scope="all" aria-pressed="false">Whole files</button></div></div>
        <div class="mr-set-row"><span id="mr-code-label">Code files<small>Review changed source files after the documents</small></span><button class="mr-switch mr-code-toggle" data-act="code-files" role="switch" aria-checked="false" aria-labelledby="mr-code-label"></button></div>
        <div class="mr-set-row"><span>External images<small>Images hosted elsewhere can tell their host who is reading</small></span><div class="mr-seg" data-setting="images" role="group" aria-label="External images"><button data-value="ask">Ask</button><button data-value="load">Load</button></div></div>
      </section>
      <section class="mr-settings-section" aria-label="Appearance">
        <div class="mr-set-row"><span>Theme</span><div class="mr-seg" data-setting="theme" role="group" aria-label="Theme"><button data-value="auto">Auto</button><button data-value="light">Light</button><button data-value="sepia">Sepia</button><button data-value="dark">Dark</button></div></div>
        <div class="mr-set-row"><span>Typeface</span><div class="mr-seg" data-setting="font" role="group" aria-label="Typeface"><button data-value="serif" class="mr-serif-sample">Serif</button><button data-value="sans">Sans</button></div></div>
        <div class="mr-set-row"><span>Text size</span><div class="mr-seg"><button data-act="smaller" aria-label="Smaller text">A−</button><button data-act="larger" aria-label="Larger text" class="mr-larger-sample">A+</button></div></div>
      </section>
      <details class="mr-settings-section mr-keys-section"><summary>Keyboard shortcuts</summary><dl class="mr-keys">
        <dt><kbd>J</kbd> <kbd>K</kbd></dt><dd>Next / previous change</dd>
        <dt><kbd>]</kbd> <kbd>[</kbd></dt><dd>Next / previous document</dd>
        <dt><kbd>R</kbd></dt><dd>Comment on the paragraph in focus</dd>
        <dt><kbd>V</kbd></dt><dd>Mark document as viewed</dd>
        <dt><kbd>C</kbd></dt><dd>Changes on / off</dd>
        <dt><kbd>+</kbd> <kbd>−</kbd></dt><dd>Text size</dd>
        <dt><kbd>Esc</kbd></dt><dd>Close settings / reader</dd>
      </dl></details>
      <p class="mr-settings-note">To comment, select text or use the button beside a paragraph.</p>
    </aside>
  </div>
  <nav class="mr-toc" aria-label="Contents"></nav>
  <main class="mr-main">
    <article class="mr-article">
      <div class="mr-gutter" aria-hidden="true"></div>
      <div class="mr-empty-reader" hidden><h1>No document changes</h1><p>Turn on “Code files” in reading settings to review the changed source files.</p><button class="mr-btn mr-outline" data-act="settings">Reading settings</button></div>
      <div class="mr-doc"></div>
    </article>
  </main>
  <form class="mr-composer" aria-label="Review comment" hidden>
    <div class="mr-compose-context">
      <p class="mr-compose-label">Commenting on</p>
      <p class="mr-comment-target">a paragraph</p>
      <blockquote class="mr-comment-quote" hidden></blockquote>
    </div>
    <div class="mr-compose-input">
      <label class="mr-visually-hidden" for="mr-comment">Comment</label>
      <textarea id="mr-comment" rows="3" placeholder="Write a review comment…" aria-describedby="mr-comment-status"></textarea>
      <div class="mr-compose-actions">
        <p id="mr-comment-status" class="mr-comment-status" role="status" aria-live="polite"></p>
        <button type="button" class="mr-btn" data-act="cancel-comment">Cancel</button>
        <button type="submit" class="mr-btn mr-primary mr-submit" disabled>Comment</button>
      </div>
    </div>
  </form>
  <button type="button" class="mr-select-chip" data-act="comment-selection" hidden>${icons.comment}<span>Comment</span></button>
  <p class="mr-toast" role="status" aria-live="polite" hidden></p>
  <div class="mr-pill" hidden>
    <button class="mr-btn" data-act="prev" title="Previous change (K)" aria-label="Previous change">${icons.up}</button>
    <span class="mr-pill-label" aria-live="polite"></span>
    <button class="mr-btn" data-act="next" title="Next change (J)" aria-label="Next change">${icons.down}</button>
  </div>
</div>`;

function h<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

function chip(kind: 'added' | 'modified' | 'removed', text: string): HTMLElement {
  const el = h('span', `mr-chip is-${kind}`);
  el.append(h('span', 'mr-dot'), text);
  return el;
}

function actionButton(label: string, act: string, className: string): HTMLButtonElement {
  const b = h('button', `mr-btn ${className}`, label);
  b.dataset.act = act;
  return b;
}

/** "docs/adr/0007-use-markdown.md" → "0007 use markdown" */
function prettyName(path: string): string {
  const file = path.split('/').pop() ?? path;
  return file.replace(/\.(md|markdown|mdown|mkd|mdx)$/i, '').replace(/[-_]+/g, ' ');
}

function textWithoutDeletions(el: HTMLElement): string {
  const clone = el.cloneNode(true) as HTMLElement;
  for (const del of clone.querySelectorAll('del')) del.remove();
  return clone.textContent?.trim() ?? '';
}

const relative = typeof Intl !== 'undefined' && 'RelativeTimeFormat' in Intl ? new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'short' }) : null;

function relativeTime(iso: string): string {
  const minutes = Math.round((Date.parse(iso) - Date.now()) / 60_000);
  if (!Number.isFinite(minutes)) return '';
  if (!relative) return new Date(iso).toLocaleDateString();
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute');
  if (Math.abs(minutes) < 60 * 24) return relative.format(Math.round(minutes / 60), 'hour');
  if (Math.abs(minutes) < 60 * 24 * 30) return relative.format(Math.round(minutes / 1440), 'day');
  return new Date(iso).toLocaleDateString();
}

/** Tight list items are inline spans; their visual block is the list item. */
function surfaceOf(el: HTMLElement): HTMLElement {
  return el.matches('.mr-tight') ? el.closest('li') ?? el : el;
}

/** Where a hidden element (a removed block in Clean mode) would be: the next visible element. */
function nextVisible(el: Element, stop: Element): Element | null {
  for (let node: Element | null = el; node && node !== stop; node = node.parentElement) {
    for (let sib = node.nextElementSibling; sib; sib = sib.nextElementSibling) {
      if (sib.getClientRects().length) return sib;
    }
  }
  return null;
}

let active: Reader | null = null;

export interface ReaderHandle {
  close(): void;
}

/** Open the reader over the current page. Accepts a promise so it can show loading and errors itself. */
export function openReader(
  source: ReviewSource | Promise<ReviewSource>,
  options: { start?: number; onClose?: () => void } = {},
): ReaderHandle {
  active?.close();
  const reader = new Reader(options.onClose);
  active = reader;
  Promise.resolve(source).then(
    (s) => reader.setSource(s, options.start ?? 0),
    (err) => reader.showError(err),
  );
  return { close: () => reader.close() };
}

interface View {
  doc: DocRef;
  section: HTMLElement;
  rendered: RenderedDoc | null;
}

interface Hit {
  view: View;
  block: RenderedBlock;
  side: 'base' | 'head';
  /** The element to target: the block, or one version of a diagram. */
  el: HTMLElement;
}

/** Thread cards go in the left margin when it is at least this wide (rail, gap, edge); otherwise below their paragraph. */
const RAIL_SPACE = 340;

class Reader {
  private readonly host = document.createElement('div');
  private readonly shadow = this.host.attachShadow({ mode: 'open' });
  private readonly root: HTMLElement;
  private readonly el: Record<
    'progress' | 'topbar' | 'fileBtn' | 'fileName' | 'fileStatus' | 'viewed' | 'viewedFeedback' | 'fileCount' | 'files' | 'settings' | 'toc' | 'article' | 'gutter' | 'doc' | 'pill' | 'pillLabel' | 'composer' | 'commentTarget' | 'commentQuote' | 'commentStatus' | 'chip' | 'toast' | 'empty',
    HTMLElement
  >;
  private settings: Settings = { ...DEFAULT_SETTINGS };
  private source: ReviewSource | null = null;
  private index = 0;
  private readonly loading = new Set<DocRef>();
  private readonly cache = new Map<DocRef, Promise<DocContents>>();
  private rendered: RenderedDoc | null = null;
  private headings: Array<{ el: HTMLElement; link: HTMLElement }> = [];
  private markTargets: HTMLElement[] = [];
  private lastStep: { el: HTMLElement; at: number } | null = null;
  private views: View[] = [];
  private readonly viewed = new Map<DocRef, { value: boolean; ready: boolean; busy: boolean; key?: string; error?: string }>();
  private viewedLoading: Promise<void> | null = null;
  private drawerFocus: HTMLElement | null = null;
  private target: CommentTarget | null = null;
  private targetEls: HTMLElement[] = [];
  private plan: CommentPlan | null = null;
  private readonly blockOf = new WeakMap<Element, { view: View; block: RenderedBlock }>();
  private hover: Hit | null = null;
  private readonly commentBtn = h('button', 'mr-comment-btn');
  private chipTarget: { target: CommentTarget; elements: HTMLElement[]; range?: Range } | null = null;
  private threads: Thread[] = [];
  private readonly ownThreads = new WeakSet<Thread>();
  private threadEls: Array<{ view: View; card: HTMLElement; anchor: HTMLElement }> = [];
  private readonly rail = h('div', 'mr-threads');
  private toastTimer = 0;
  private planToken = 0;
  private submitting = false;
  private readonly textarea: HTMLTextAreaElement;
  private readonly submit: HTMLButtonElement;
  private frame = 0;
  private needLayout = false;
  private closed = false;
  private readonly dark = matchMedia('(prefers-color-scheme: dark)');
  private readonly resize = new ResizeObserver(() => this.schedule(true));
  private readonly prevOverflow: string;
  private readonly prevFocus: Element | null;

  constructor(private readonly onClose?: () => void) {
    this.host.id = __GALLEY_DEV__ ? 'galley-reader-dev' : 'galley-reader';
    // biome-ignore lint/plugin: the bundled stylesheet and a fixed template; no document content.
    this.shadow.innerHTML = `<style>${css}</style>${TEMPLATE}`;
    const q = (sel: string) => this.shadow.querySelector<HTMLElement>(sel)!;
    this.root = q('.mr-root');
    this.el = {
      progress: q('.mr-progress > div'),
      topbar: q('.mr-topbar'),
      fileBtn: q('.mr-file-btn'),
      fileName: q('.mr-file-btn .mr-file-name'),
      fileStatus: q('.mr-file-btn .mr-status-dot'),
      viewed: q('.mr-viewed'),
      viewedFeedback: q('.mr-viewed-feedback'),
      fileCount: q('.mr-file-btn .mr-count'),
      files: q('.mr-files'),
      settings: q('.mr-settings'),
      toc: q('.mr-toc'),
      article: q('.mr-article'),
      gutter: q('.mr-gutter'),
      doc: q('.mr-doc'),
      pill: q('.mr-pill'),
      pillLabel: q('.mr-pill-label'),
      composer: q('.mr-composer'),
      commentTarget: q('.mr-comment-target'),
      commentQuote: q('.mr-comment-quote'),
      commentStatus: q('.mr-comment-status'),
      chip: q('.mr-select-chip'),
      toast: q('.mr-toast'),
      empty: q('.mr-empty-reader'),
    };
    this.commentBtn.type = 'button';
    this.commentBtn.dataset.act = 'comment-block';
    // biome-ignore lint/plugin: a bundled icon constant.
    this.commentBtn.innerHTML = icons.comment;
    this.commentBtn.hidden = true;
    this.rail.setAttribute('aria-label', 'Review comments');
    this.el.article.prepend(this.rail, this.commentBtn);
    q('.mr-tb-right').prepend(this.el.pill);
    this.textarea = q('#mr-comment') as HTMLTextAreaElement;
    this.submit = q('.mr-submit') as HTMLButtonElement;
    this.el.composer.addEventListener('submit', (e) => { e.preventDefault(); void this.postComment(); });
    this.textarea.addEventListener('input', () => { this.growTextarea(); this.updateSubmit(); });
    this.root.addEventListener('mouseup', (e) => this.captureSelection(e));
    this.el.doc.addEventListener('pointerover', (e) => this.onHover(e.target));
    this.el.article.addEventListener('pointerleave', () => { this.hover = null; this.commentBtn.hidden = true; });
    this.el.doc.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch') setTimeout(() => this.onTap(e), 0); });
    document.addEventListener('selectionchange', this.onSelectionChange);
    this.el.doc.replaceChildren(this.skeleton());

    this.prevOverflow = document.documentElement.style.overflow;
    this.prevFocus = document.activeElement;
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.append(this.host);
    this.root.focus({ preventScroll: true });

    this.root.addEventListener('click', (e) => this.onClick(e));
    this.root.addEventListener('galley:context', () => {
      if (this.rendered) this.buildToc(this.rendered);
      this.schedule(true);
    });
    this.root.addEventListener('scroll', () => this.schedule(false), { passive: true });
    for (const type of ['keydown', 'keyup', 'keypress']) window.addEventListener(type, this.shield, true);
    this.dark.addEventListener('change', this.onSchemeChange);
    this.resize.observe(this.el.doc);
    this.resize.observe(this.el.composer);

    this.applySettings();
    void loadSettings().then((s) => {
      this.settings = s;
      this.applySettings();
    });
  }

  setSource(source: ReviewSource, start: number): void {
    if (this.closed) return;
    this.source = source;
    this.shadow.querySelector<HTMLElement>('[data-act="code-files"]')!.title = `${source.codeDocs?.length ?? 0} supported code files`;
    const all = [...source.docs, ...(source.codeDocs ?? [])];
    if (!all.length) {
      this.showMessage('No readable changes here', 'This change set does not touch any supported document or text source files.');
      return;
    }
    this.index = Math.min(Math.max(start, 0), all.length - 1);
    this.views = all.map((doc, i) => {
      const section = h('section', `mr-document${doc.status === 'removed' || doc.status === 'added' ? ` doc-${doc.status}` : ''}${doc.kind === 'code' ? ' is-code' : ''}`);
      section.setAttribute('aria-label', doc.path);
      section.dataset.document = String(i);
      section.hidden = doc.kind === 'code' && !this.settings.codeFiles;
      section.append(this.skeleton());
      return { doc, section, rendered: null };
    });
    for (const doc of all) this.viewed.set(doc, { value: false, ready: false, busy: false });
    if (source.viewed) void this.initNativeViewed();
    this.el.doc.replaceChildren(...this.views.map((view) => view.section));
    this.updateFileButton();
    void this.loadAll(this.index);
    void this.loadThreads();
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    cancelAnimationFrame(this.frame);
    this.resize.disconnect();
    for (const type of ['keydown', 'keyup', 'keypress']) window.removeEventListener(type, this.shield, true);
    this.dark.removeEventListener('change', this.onSchemeChange);
    document.removeEventListener('selectionchange', this.onSelectionChange);
    clearTimeout(this.toastTimer);
    CSS.highlights?.delete('galley-quote');
    this.host.remove();
    document.documentElement.style.overflow = this.prevOverflow;
    if (this.prevFocus instanceof HTMLElement) this.prevFocus.focus({ preventScroll: true });
    if (active === this) active = null;
    this.onClose?.();
  }

  showError(err: unknown): void {
    if (this.closed) return;
    const e =
      err instanceof ReaderError
        ? err
        : new ReaderError('Something went wrong while loading this document.', err instanceof Error ? err.message : String(err));
    const extra: Node[] = [];
    if (e.needsToken) {
      const p = h('p');
      const a = h('a', '', 'Create a fine-grained token');
      a.href = 'https://github.com/settings/personal-access-tokens/new';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      p.append(a, ' with read-only access to Contents and Pull requests, then click the Galley icon in your browser toolbar to save it.');
      extra.push(p);
    }
    this.showMessage(e.message, e.hint, extra, Boolean(this.source));
  }

  // ---------------------------------------------------------------- documents

  private load(doc: DocRef): Promise<DocContents> {
    let p = this.cache.get(doc);
    if (!p) {
      p = this.source!.load(doc);
      this.cache.set(doc, p);
      p.catch(() => this.cache.delete(doc));
    }
    return p;
  }

  private async loadAll(start: number): Promise<void> {
    // Keep source order and limit requests to three documents at once.
    let cursor = 0;
    const worker = async () => {
      while (cursor < this.views.length && !this.closed) {
        const index = cursor++;
        if (!this.views[index].section.hidden && !this.views[index].rendered) await this.loadView(index);
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, this.views.length) }, worker));
    if (!this.closed && start) this.show(start);
  }

  private async loadView(index: number): Promise<void> {
    const view = this.views[index];
    if (this.loading.has(view.doc)) return;
    this.loading.add(view.doc);
    try {
      const contents = await this.load(view.doc);
      if (this.closed) return;
      const r = view.doc.kind === 'code' ? renderCodeFile(document, view.doc, contents) : renderDocument(document, { path: view.doc.status === 'removed' ? view.doc.oldPath : view.doc.path, status: view.doc.status, ...contents, links: this.source!.links(view.doc), origin: location.origin, images: this.settings.images });
      view.rendered = r;
      view.section.replaceChildren(this.buildArticle(view.doc, r));
      for (const block of r.blocks) this.blockOf.set(block.el, { view, block });
      for (const img of r.content.querySelectorAll('img')) img.addEventListener('load', () => this.schedule(true), { once: true });
      this.attachThreads(view);
      filterDocument(r, this.settings.scope === 'changed');
      renderDiagrams(r.diagrams, this.root.classList.contains('is-dark'), () => this.schedule(true));
      void highlightCode(r.content).then(() => this.schedule(true));
      if (index === this.index) { this.rendered = r; this.buildToc(r); }
      this.schedule(true);
      if (!this.source!.viewed) await this.initLocalViewed(view.doc, contents);
      else this.updateViewed();
    } catch (err) {
      if (this.closed) return;
      const box = h('div', 'mr-message');
      box.append(h('h2', '', view.doc.path), h('p', '', err instanceof Error ? err.message : String(err)));
      const platform = h('a', 'mr-outline', 'Open platform diff');
      platform.href = this.source!.diffUrl; platform.target = '_blank'; platform.rel = 'noopener noreferrer';
      box.append(platform);
      const retry = actionButton('Try again', 'retry-doc', 'mr-outline');
      retry.dataset.doc = String(index);
      box.append(retry);
      view.section.replaceChildren(box);
      this.schedule(true);
    } finally { this.loading.delete(view.doc); }
  }

  private show(index: number): void {
    const view = this.views[index];
    if (!view || view.section.hidden) return;
    this.index = index;
    this.rendered = view.rendered;
    this.closeMenus();
    this.updateFileButton();
    if (view.rendered) this.buildToc(view.rendered);
    this.scrollToEl(view.section, 0.12, false);
  }

  private buildArticle(doc: DocRef, r: RenderedDoc): DocumentFragment {
    const frag = document.createDocumentFragment();
    const intro: HTMLElement[] = [];
    if (r.description) intro.push(h('p', 'mr-subtitle', r.description));
    intro.push(this.byline(doc, r));
    const noun = doc.kind === 'code' ? 'file' : 'document';
    if (doc.status === 'added') intro.push(h('div', 'mr-banner is-added', `This ${noun} is new in this change.`));
    if (doc.status === 'removed') intro.push(h('div', 'mr-banner is-removed', `This ${noun} is deleted by this change. You are reading its last version.`));

    if (r.lead) {
      // Title first, like an article: front matter (or its removed version) moves below the byline.
      const before: Element[] = [];
      for (let el = r.content.firstElementChild; el && el !== r.lead; el = el.nextElementSibling) before.push(el);
      r.lead.classList.add('mr-lead');
      r.lead.after(...intro, ...before);
    } else if (doc.kind === 'code') {
      // Source files are titled by their path, in the code face, not as an article.
      const title = h('h1', 'mr-title mr-code-title');
      const slash = doc.path.lastIndexOf('/');
      if (slash > 0) title.append(h('span', 'mr-code-dir', doc.path.slice(0, slash + 1)));
      title.append(doc.path.slice(slash + 1));
      frag.append(title, ...intro);
    } else {
      frag.append(h('h1', 'mr-title', r.title ?? prettyName(doc.path)), ...intro);
    }
    frag.append(r.content);
    if (!r.blocks.some((block) => block.kind !== 'same')) frag.append(h('p', 'mr-empty-changes', 'No visible changes. Choose Entire files to read this file.'));
    return frag;
  }

  private byline(doc: DocRef, r: RenderedDoc): HTMLElement {
    const line = h('div', 'mr-byline');
    line.append(h('span', '', doc.kind === 'code' ? languageName(languageOf(doc.path)) ?? 'Source file' : `${Math.max(1, Math.round(r.words / WORDS_PER_MINUTE))} min read`));
    if (doc.status !== 'added' && doc.status !== 'removed') {
      const { added, modified, removed } = r.stats;
      if (!added && !modified && !removed) line.append(h('span', '', doc.status === 'renamed' ? 'Moved, text unchanged' : 'No visible text changes'));
      if (modified) line.append(chip('modified', `${modified} edited`));
      if (added) line.append(chip('added', `${added} added`));
      if (removed) line.append(chip('removed', `${removed} removed`));
    }
    if (r.hiddenLines) {
      // Comments, link definitions and unbalanced HTML render nowhere; say so instead of implying no change.
      const hidden = h('a', 'mr-chip is-hidden', `${r.hiddenLines} line${r.hiddenLines === 1 ? '' : 's'} not shown`);
      hidden.href = this.source!.diffUrl;
      hidden.target = '_blank';
      hidden.rel = 'noopener noreferrer';
      hidden.title = 'Changed source lines this view cannot show, such as HTML comments, link definitions or raw HTML. Opens the platform diff.';
      line.append(hidden);
    }
    if (r.heldImages) {
      const load = actionButton(`Load ${r.heldImages} external image${r.heldImages === 1 ? '' : 's'}`, 'load-images', 'mr-chip is-images');
      load.title = 'Images hosted outside this site were not loaded, so their hosts cannot see that you are reading. Choose Always in reading settings to skip this.';
      line.append(load);
    }
    return line;
  }

  private buildToc(r: RenderedDoc): void {
    this.headings = [];
    const toc = this.el.toc;
    toc.replaceChildren();
    const all = [...r.content.querySelectorAll<HTMLElement>('h1, h2, h3')].filter((el) => el !== r.lead && !el.closest('.mr-ghost') && !el.hidden);
    if (all.length < 3) return;
    const top = Math.min(...all.map((el) => Number(el.tagName[1])));
    const list = h('div', 'mr-toc-list');
    list.append(h('p', 'mr-toc-title', 'Contents'));
    toc.append(list);
    all.forEach((el, i) => {
      const link = h('a', `lvl-${Math.min(3, Number(el.tagName[1]) - top + 1)}`);
      link.href = '#';
      link.dataset.act = 'heading';
      link.dataset.i = String(i);
      link.append(h('span', '', textWithoutDeletions(el)));
      list.append(link);
      this.headings.push({ el, link });
    });
    // Mark sections that contain changes.
    for (const changed of r.content.querySelectorAll('[data-mr-change]')) {
      let owner: { el: HTMLElement; link: HTMLElement } | null = null;
      for (const hd of this.headings) {
        if (hd.el === changed || hd.el.compareDocumentPosition(changed) & Node.DOCUMENT_POSITION_FOLLOWING) owner = hd;
        else break;
      }
      if (owner && !owner.link.querySelector('.mr-dot')) owner.link.append(h('span', 'mr-dot'));
    }
  }

  // ---------------------------------------------------------------- chrome

  private updateFileButton(): void {
    const visible = this.views.filter((view) => !view.section.hidden);
    const docs = visible.map((view) => view.doc);
    this.el.empty.hidden = visible.length > 0;
    if (!visible.length) {
      this.el.fileBtn.hidden = this.el.viewed.hidden = true;
      this.closeComposer(false);
      this.el.viewedFeedback.hidden = true;
      return;
    }
    if (this.views[this.index].section.hidden) this.index = this.views.indexOf(visible[0]);
    this.rendered = this.views[this.index].rendered;
    this.el.fileBtn.hidden = false;
    const doc = this.views[this.index].doc;
    const position = docs.indexOf(doc);
    // The bar shows only the file name; the full path, status and the PR live in the documents menu.
    this.el.fileBtn.dataset.path = doc.path;
    this.el.fileCount.textContent = docs.length > 1 ? `${position + 1} of ${docs.length}` : '';
    this.el.fileBtn.title = `${STATUS_LABEL[doc.status]}: ${doc.status === 'renamed' ? `${doc.oldPath} → ` : ''}${doc.path}`;
    this.el.fileBtn.setAttribute('aria-label', `Browse documents: ${STATUS_LABEL[doc.status].toLowerCase()} ${doc.path}, ${position + 1} of ${docs.length}`);
    this.el.fileStatus.className = `mr-status-dot is-${doc.status}`;
    this.el.fileName.textContent = baseName(doc.path);
    const menu = this.el.files;
    menu.replaceChildren();
    const head = h('div', 'mr-files-head');
    head.setAttribute('role', 'presentation');
    head.append(h('p', 'mr-files-title', this.source?.title ?? ''));
    const meta = h('p', 'mr-files-meta');
    if (this.source?.subtitle) meta.append(h('span', 'mr-files-source', this.source.subtitle));
    meta.append(h('span', 'mr-files-progress', `${docs.filter((doc) => this.viewed.get(doc)?.value).length} of ${docs.length} viewed`));
    head.append(meta);
    menu.append(head);
    docs.forEach((d) => {
      const i = this.views.findIndex((view) => view.doc === d);
      const item = h('button', 'mr-menu-item');
      item.setAttribute('role', 'menuitem');
      item.dataset.act = 'doc';
      item.dataset.doc = String(i);
      item.title = `${STATUS_LABEL[d.status]}: ${d.path}`;
      if (i === this.index) item.setAttribute('aria-current', 'true');
      const dot = h('span', `mr-status-dot is-${d.status}`);
      dot.setAttribute('aria-hidden', 'true');
      const name = h('span', 'mr-menu-name');
      const dir = d.path.slice(0, d.path.length - baseName(d.path).length);
      name.append(h('span', 'mr-path-name', baseName(d.path)));
      if (dir) name.append(h('span', 'mr-path-dir', dir));
      item.append(dot, name, h('span', 'mr-menu-status', STATUS_LABEL[d.status]));
      if (this.viewed.get(d)?.value) {
        const check = h('span', 'mr-file-check');
        // biome-ignore lint/plugin: a bundled icon constant.
        check.innerHTML = icons.check;
        check.setAttribute('aria-label', 'Viewed');
        item.append(check);
      }
      menu.append(item);
    });
    this.updateActiveViewed();
  }

  private skeleton(): HTMLElement {
    const s = h('div', 'mr-skeleton');
    // biome-ignore lint/plugin: fixed placeholder markup.
    s.innerHTML = '<i class="h"></i><i></i><i></i><i class="s"></i><i></i><i></i><i></i><i class="s"></i>';
    return s;
  }

  private showMessage(title: string, body: string, extra: Node[] = [], retry = false): void {
    this.rendered = null;
    this.el.toc.replaceChildren();
    this.el.gutter.replaceChildren();
    this.el.pill.hidden = true;
    const box = h('div', 'mr-message');
    box.append(h('h2', '', title));
    if (body) box.append(h('p', '', body));
    box.append(...extra);
    const actions = h('div', 'mr-actions');
    if (retry) actions.append(actionButton('Try again', 'retry', 'mr-primary'));
    actions.append(actionButton('Back to the diff', 'close', 'mr-outline'));
    box.append(actions);
    this.el.doc.replaceChildren(box);
  }

  private toggleMenu(menu: HTMLElement, button: HTMLElement | null): void {
    const open = menu.hidden;
    this.closeMenus();
    menu.hidden = !open;
    button?.setAttribute('aria-expanded', String(open));
    if (menu === this.el.files && open && button) {
      const anchor = button.getBoundingClientRect();
      const width = menu.offsetWidth;
      menu.style.left = `${Math.max(12, Math.min(anchor.left + anchor.width / 2 - width / 2, innerWidth - width - 12))}px`;
    }
    if (menu === this.el.settings && open) {
      this.drawerFocus = button;
      for (const el of this.root.querySelectorAll<HTMLElement>('.mr-topbar, .mr-main, .mr-toc, .mr-composer')) el.inert = true;
      this.root.classList.add('settings-open');
      this.el.settings.querySelector<HTMLElement>('button[data-act="close-settings"]')!.focus();
    }
  }

  private closeMenus(): boolean {
    const drawerOpen = !this.el.settings.hidden;
    const wasOpen = drawerOpen || !this.el.files.hidden;
    this.el.files.hidden = this.el.settings.hidden = true;
    for (const b of this.shadow.querySelectorAll('.mr-topbar [aria-expanded]')) b.setAttribute('aria-expanded', 'false');
    if (drawerOpen) {
      for (const el of this.root.querySelectorAll<HTMLElement>('.mr-topbar, .mr-main, .mr-toc, .mr-composer')) el.inert = false;
      this.root.classList.remove('settings-open');
      this.drawerFocus?.focus({ preventScroll: true });
      this.drawerFocus = null;
    }
    return wasOpen;
  }

  // Viewed status is optional; failures never remove the document or imply a successful save.
  private async initLocalViewed(doc: DocRef, contents: DocContents): Promise<void> {
    const state = this.viewed.get(doc)!;
    state.busy = true; state.error = undefined;
    this.updateViewed();
    try {
      state.key = await viewedKey(this.source!.diffUrl, doc, contents);
      state.value = await loadViewed(state.key);
      state.ready = true;
    } catch (err) { state.error = err instanceof Error ? err.message : String(err); }
    finally { state.busy = false; if (!this.closed) this.updateViewed(); }
  }

  private initNativeViewed(): Promise<void> {
    if (this.viewedLoading) return this.viewedLoading;
    this.viewedLoading = (async () => {
      for (const state of this.viewed.values()) state.busy = true;
      this.updateViewed();
      try {
        const paths = await this.source!.viewed!.load();
        for (const [doc, state] of this.viewed) { state.value = paths.includes(doc.path); state.ready = true; state.error = undefined; }
      } catch (err) {
        for (const state of this.viewed.values()) state.error = err instanceof Error ? err.message : String(err);
      } finally {
        this.viewedLoading = null;
        for (const state of this.viewed.values()) state.busy = false;
        if (!this.closed) this.updateViewed();
      }
    })();
    return this.viewedLoading;
  }

  private updateViewed(): void {
    this.updateFileButton();
  }

  private updateActiveViewed(): void {
    const view = this.views[this.index];
    const state = this.viewed.get(view.doc)!;
    const button = this.el.viewed as HTMLButtonElement;
    button.hidden = false;
    button.dataset.doc = String(this.index);
    button.disabled = !view.rendered || state.busy || (!state.ready && !state.error);
    button.setAttribute('aria-pressed', String(state.value));
    button.setAttribute('aria-label', `${state.value ? 'Unmark' : 'Mark'} ${view.doc.path} as viewed`);
    const label = state.busy ? state.ready ? 'Saving…' : 'Loading…' : !state.ready && state.error ? 'Retry loading viewed state' : state.value ? 'Viewed (V to unmark)' : 'Mark as viewed (V)';
    button.title = `${label}\n${state.error ?? this.source!.viewed?.label ?? 'Saved in this browser; resets when this file changes'}`;
    button.classList.toggle('is-busy', state.busy);
    button.classList.toggle('is-error', Boolean(state.error));
    this.el.viewedFeedback.hidden = !state.error;
    this.el.viewedFeedback.textContent = state.error ?? '';
  }

  private async toggleViewed(index: number): Promise<void> {
    const view = this.views[index];
    if (!view) return;
    const state = this.viewed.get(view.doc)!;
    if (state.busy) return;
    if (!state.ready) {
      if (this.source!.viewed) await this.initNativeViewed();
      else await this.initLocalViewed(view.doc, await this.load(view.doc));
      return;
    }
    const value = !state.value;
    state.busy = true; state.error = undefined;
    this.updateViewed();
    try {
      if (this.source!.viewed) await this.source!.viewed.set(view.doc, value);
      else await saveViewed(state.key!, value);
      state.value = value;
    } catch (err) { state.error = err instanceof Error ? err.message : String(err); }
    finally { state.busy = false; if (!this.closed) this.updateViewed(); }
  }

  private update(patch: Partial<Settings>): void {
    this.settings = { ...this.settings, ...patch };
    this.applySettings();
    if (patch.images === 'load') this.loadImages(this.root);
    void saveSettings(this.settings);
  }

  /** Load held external images inside `scope`, after an explicit click or the Always setting. */
  private loadImages(scope: ParentNode): void {
    for (const img of scope.querySelectorAll<HTMLImageElement>('img[data-mr-src]')) {
      img.addEventListener('load', () => this.schedule(true), { once: true });
      loadImage(img);
    }
    for (const button of this.root.querySelectorAll<HTMLElement>('[data-act="load-images"]')) {
      if (!button.closest('.mr-document')?.querySelector('img[data-mr-src]')) button.remove();
    }
    this.schedule(true);
  }

  private applySettings(): void {
    const s = this.settings;
    const r = this.root;
    for (const view of this.views) if (view.rendered) filterDocument(view.rendered, s.scope === 'changed');
    if (this.rendered) this.buildToc(this.rendered);
    const codeToggle = this.shadow.querySelector<HTMLElement>('[data-act="code-files"]')!;
    codeToggle.setAttribute('aria-checked', String(s.codeFiles));
    codeToggle.title = `${this.source?.codeDocs?.length ?? 0} supported code files`;
    let loadCode = false;
    for (const view of this.views) if (view.doc.kind === 'code') {
      view.section.hidden = !s.codeFiles;
      loadCode ||= s.codeFiles && !view.rendered;
    }
    if (this.source) { this.updateFileButton(); if (this.rendered) this.buildToc(this.rendered); else this.el.toc.replaceChildren(); }
    if (loadCode) void this.loadAll(0);
    for (const b of this.shadow.querySelectorAll<HTMLElement>('[data-scope]')) b.setAttribute('aria-pressed', String(b.dataset.scope === s.scope));
    r.classList.toggle('mode-changes', s.mode === 'changes');
    r.classList.toggle('mode-clean', s.mode === 'clean');
    r.classList.toggle('font-sans', s.font === 'sans');
    r.classList.toggle('is-sepia', s.theme === 'sepia');
    r.classList.toggle('is-dark', s.theme === 'dark' || (s.theme === 'auto' && this.dark.matches));
    r.style.setProperty('--body-size', `${TEXT_SIZES[s.size] ?? 20}px`);
    for (const b of this.shadow.querySelectorAll<HTMLElement>('[data-mode]')) b.setAttribute('aria-pressed', String(b.dataset.mode === s.mode));
    for (const group of this.shadow.querySelectorAll<HTMLElement>('[data-setting]')) {
      const value = s[group.dataset.setting as 'theme' | 'font' | 'images'];
      for (const b of group.querySelectorAll<HTMLElement>('[data-value]')) b.setAttribute('aria-pressed', String(b.dataset.value === value));
    }
    for (const view of this.views) if (view.rendered) renderDiagrams(view.rendered.diagrams, r.classList.contains('is-dark'), () => this.schedule(true));
    this.schedule(true);
  }

  private readonly onSchemeChange = () => this.applySettings();

  // ---------------------------------------------------------------- navigation

  private scrollToEl(el: Element, line = FOCUS_LINE, flash = true): void {
    const top = this.root.scrollTop + el.getBoundingClientRect().top - this.root.clientHeight * line;
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.root.scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' });
    if (flash) {
      el.classList.remove('mr-flash');
      void (el as HTMLElement).offsetWidth;
      el.classList.add('mr-flash');
      setTimeout(() => el.classList.remove('mr-flash'), 1700);
    }
  }

  private visibleChanges(): HTMLElement[] {
    return this.views.flatMap((view) => view.rendered?.changes ?? []).filter((el) => el.getClientRects().length > 0);
  }

  private step(direction: 1 | -1): void {
    const list = this.visibleChanges();
    if (!list.length) return;
    let index: number;
    const recent = this.lastStep && performance.now() - this.lastStep.at < 900 ? list.indexOf(this.lastStep.el) : -1;
    if (recent !== -1) {
      // Pressed again while still scrolling: continue from the last target, not from mid-scroll positions.
      index = recent + direction;
    } else {
      const line = this.root.clientHeight * FOCUS_LINE;
      const tops = list.map((el) => el.getBoundingClientRect().top);
      index = direction === 1 ? tops.findIndex((t) => t > line + 8) : tops.findLastIndex((t) => t < line - 8);
    }
    const target = list[index];
    if (!target) return;
    this.lastStep = { el: target, at: performance.now() };
    this.scrollToEl(target);
  }

  private stepDoc(direction: 1 | -1): void {
    const indices = this.views.flatMap((view, i) => view.section.hidden ? [] : [i]);
    const next = indices[indices.indexOf(this.index) + direction];
    if (next !== undefined) this.show(next);
  }

  // ---------------------------------------------------------------- events

  /** Keep the page's own keyboard shortcuts from firing while the reader is open. */
  private readonly shield = (e: Event) => {
    // The reader is modal: keys reach it when focus is inside it, or when focus fell back to the page body.
    const origin = e.target;
    if (origin !== this.host && origin !== document.body && origin !== document.documentElement) return;
    if (e.type === 'keydown') this.onKey(e as KeyboardEvent);
    if (e.type === 'keyup' && (e as KeyboardEvent).key === 'Shift') {
      const target = e.composedPath()[0];
      if (!(target instanceof Element && target.closest('.mr-composer, .mr-thread'))) this.captureSelection();
    }
    e.stopPropagation();
  };

  private onKey(e: KeyboardEvent): void {
    if (e.defaultPrevented) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      if (this.closeMenus() || this.submitting) return;
      if (!this.el.chip.hidden) {
        this.hideChip();
        return;
      }
      if (!this.el.composer.hidden) {
        // An empty composer closes; a draft is only ever discarded with Cancel.
        if (!this.textarea.value.trim()) this.closeComposer(true);
        else {
          this.textarea.blur();
          this.el.commentStatus.textContent = 'Draft kept. Choose Cancel to discard it.';
        }
        return;
      }
      this.close();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && e.composedPath()[0] === this.textarea) { e.preventDefault(); void this.postComment(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.composedPath()[0];
    if (e.key === 'Tab') {
      const focusRoot = this.el.settings.hidden ? this.root : this.el.settings;
      const controls = [...focusRoot.querySelectorAll<HTMLElement>('button, a[href], input, textarea, select, summary, [tabindex="0"]')]
        .filter((el) => el.getClientRects().length && !el.matches(':disabled'));
      const index = controls.indexOf(this.shadow.activeElement as HTMLElement);
      const next = e.shiftKey ? (index <= 0 ? controls.length - 1 : index - 1) : (index + 1) % controls.length;
      controls[next]?.focus();
      e.preventDefault();
      return;
    }
    if (!this.el.settings.hidden) return;
    if (target instanceof HTMLElement && target.matches('input, textarea, select, [contenteditable]')) return;
    switch (e.key) {
      case 'Escape':
        if (!this.closeMenus()) this.close();
        break;
      case 'j':
      case 'n':
        this.step(1);
        break;
      case 'k':
      case 'p':
        this.step(-1);
        break;
      case ']':
        this.stepDoc(1);
        break;
      case '[':
        this.stepDoc(-1);
        break;
      case 'c':
        this.update({ mode: this.settings.mode === 'changes' ? 'clean' : 'changes' });
        break;
      case 'v':
        if (!this.el.viewed.hidden && !(this.el.viewed as HTMLButtonElement).disabled) void this.toggleViewed(this.index);
        break;
      case 'r':
        this.commentAtFocus();
        break;
      case '+':
      case '=':
        this.update({ size: Math.min(TEXT_SIZES.length - 1, this.settings.size + 1) });
        break;
      case '-':
        this.update({ size: Math.max(0, this.settings.size - 1) });
        break;
      default:
        return;
    }
    e.preventDefault();
  }

  private onClick(e: MouseEvent): void {
    const target = e.target as Element;
    const inMenu = target.closest('.mr-menu, .mr-settings, [data-act="files"], [data-act="settings"]');
    if (!inMenu) this.closeMenus();

    const anchor = target.closest<HTMLAnchorElement>('.mr-content a[href^="#"]');
    if (anchor) {
      e.preventDefault();
      const id = decodeURIComponent(anchor.getAttribute('href')!.slice(1));
      const content = anchor.closest('.mr-content');
      const dest = id ? [...(content?.querySelectorAll('[id]') ?? [])].find((el) => el.id === id || el.id === `user-content-${id}`) : undefined;
      if (dest?.closest('[hidden]')) this.update({ scope: 'all' });
      if (dest) this.scrollToEl(dest, 0.12);
      return;
    }

    const scope = target.closest<HTMLElement>('[data-scope]');
    if (scope) {
      this.update({ scope: scope.dataset.scope as Settings['scope'] });
      return;
    }
    const mode = target.closest<HTMLElement>('[data-mode]');
    if (mode) {
      this.update({ mode: mode.dataset.mode as Settings['mode'] });
      return;
    }
    const setting = target.closest<HTMLElement>('[data-setting] [data-value]');
    if (setting) {
      const key = setting.parentElement!.dataset.setting as 'theme' | 'font' | 'images';
      this.update({ [key]: setting.dataset.value } as Partial<Settings>);
      return;
    }

    const action = target.closest<HTMLElement>('[data-act]');
    if (!action) return;
    switch (action.dataset.act) {
      case 'close':
        this.close();
        return;
      case 'files':
        if (this.views.some((view) => !view.section.hidden)) this.toggleMenu(this.el.files, action);
        return;
      case 'settings':
        this.toggleMenu(this.el.settings, action);
        return;
      case 'code-files':
        if (!this.settings.codeFiles && !this.source?.codeDocs?.length) return;
        this.update({ codeFiles: !this.settings.codeFiles });
        return;
      case 'close-settings':
        this.closeMenus();
        return;
      case 'viewed':
        void this.toggleViewed(Number(action.dataset.doc));
        return;
      case 'smaller':
        this.update({ size: Math.max(0, this.settings.size - 1) });
        return;
      case 'larger':
        this.update({ size: Math.min(TEXT_SIZES.length - 1, this.settings.size + 1) });
        return;
      case 'prev':
        this.step(-1);
        return;
      case 'next':
        this.step(1);
        return;
      case 'doc':
        void this.show(Number(action.dataset.doc));
        return;
      case 'retry-doc':
        void this.loadView(Number(action.dataset.doc));
        return;
      case 'comment-block':
        if (this.hover) this.commentOn(this.hover);
        return;
      case 'comment-selection':
        if (this.chipTarget) this.openComposer(this.chipTarget.target, this.chipTarget.elements, this.chipTarget.range);
        return;
      case 'cancel-comment':
        this.closeComposer(true);
        return;
      case 'load-image': {
        const img = action.closest('.mr-img-hold')?.nextElementSibling;
        if (img instanceof HTMLImageElement) this.loadImages(img.parentElement!);
        return;
      }
      case 'load-images':
        this.loadImages(action.closest('.mr-document') ?? this.root);
        return;
      case 'toggle-thread': {
        const card = action.closest('.mr-thread');
        card?.classList.toggle('is-expanded');
        action.textContent = card?.classList.contains('is-expanded') ? 'Show fewer replies' : action.dataset.label ?? '';
        this.schedule(true);
        return;
      }
      case 'retry':
        if (this.source) void this.show(this.index);
        return;
      case 'heading': {
        e.preventDefault();
        const hd = this.headings[Number(action.dataset.i)];
        if (hd) this.scrollToEl(hd.el, 0.12, false);
        return;
      }
      case 'mark': {
        const dest = this.markTargets[Number(action.dataset.i)];
        if (dest) this.scrollToEl(dest);
        return;
      }
    }
  }

  // ---------------------------------------------------------------- comments
  //
  // Commenting is explicit: a button beside the paragraph under the pointer, a chip over selected
  // text, or R for the paragraph in focus. Nothing follows the scroll position. The composer only
  // appears once a target is chosen, and existing threads sit in the left margin.

  private updateSubmit(): void {
    this.submit.disabled = this.submitting || !this.plan || !this.textarea.value.trim();
  }

  private growTextarea(): void {
    const t = this.textarea;
    t.style.height = 'auto';
    t.style.height = `${Math.min(t.scrollHeight, 220)}px`;
    this.schedule(false);
  }

  private hitFor(view: View, block: RenderedBlock, node?: Node): Hit {
    const el = node instanceof Element ? node : node?.parentElement;
    const version = el?.closest<HTMLElement>('.mr-diagram-version') ?? null;
    const old = el?.closest('.mr-ghost-row, [data-mr-side="base"]');
    return { view, block, side: old || !block.head ? 'base' : 'head', el: version ?? block.el };
  }

  /** The innermost rendered block containing `node`. */
  private blockAt(node: Node): Hit | null {
    for (let el: Element | null = node instanceof Element ? node : node.parentElement; el && !el.matches('.mr-document'); el = el.parentElement) {
      if (el.matches('.mr-thread')) return null;
      const entry = this.blockOf.get(el);
      if (entry) return this.hitFor(entry.view, entry.block, node);
    }
    return null;
  }

  private onHover(node: EventTarget | null): void {
    if (!(node instanceof Node) || this.submitting) return;
    const hit = this.blockAt(node);
    if (!hit) return;
    this.hover = hit;
    this.placeCommentButton();
  }

  /** The comment button sits in the left margin, level with the first line of the hovered block. */
  private placeCommentButton(): void {
    const button = this.commentBtn;
    const hover = this.hover;
    const el = hover?.el;
    button.hidden = !el?.isConnected || Boolean(el.closest('[hidden]')) || !el.getClientRects().length;
    if (button.hidden || !hover || !el) return;
    const first = el.getClientRects()[0];
    const line = parseFloat(getComputedStyle(el).lineHeight) || first.height;
    button.style.top = `${first.top - this.el.article.getBoundingClientRect().top + Math.min(line, first.height) / 2}px`;
    const unit = hover.side === 'base' ? hover.block.base : hover.block.head;
    const label = unit ? `Comment on ${hover.side === 'base' ? 'old' : 'new'} lines ${unit.lines[0] + 1}–${unit.lines[1]}` : 'Comment';
    button.setAttribute('aria-label', label);
    button.title = `${label} (R)`;
  }

  private commentOn(hit: Hit): void {
    const target = paragraphTarget(hit.view.doc, hit.block, hit.side);
    if (target) this.openComposer(target, [hit.el]);
  }

  /** R: comment on the block nearest the reading line. */
  private commentAtFocus(): void {
    const line = this.root.clientHeight * FOCUS_LINE;
    let best: Hit | null = null;
    let distance = Infinity;
    for (const view of this.views) {
      for (const block of view.rendered?.blocks ?? []) {
        if (!block.el.getClientRects().length || block.el.closest('[hidden]')) continue;
        const rect = block.el.getBoundingClientRect();
        if (rect.bottom < 60 || rect.top > this.root.clientHeight) continue;
        const d = rect.top <= line && rect.bottom >= line ? 0 : Math.min(Math.abs(rect.top - line), Math.abs(rect.bottom - line));
        if (d < distance) {
          best = this.hitFor(view, block);
          distance = d;
        }
      }
    }
    if (best) this.commentOn(best);
  }

  private shadowSelection(): Selection | null {
    return (this.shadow as ShadowRoot & { getSelection?: () => Selection | null }).getSelection?.() ?? document.getSelection();
  }

  private readonly onSelectionChange = () => {
    if (this.chipTarget?.range && this.shadowSelection()?.isCollapsed) this.hideChip();
  };

  /** Selected text gets a small Comment chip; nothing opens until it is clicked. */
  private captureSelection(event?: MouseEvent): void {
    if (this.submitting) return;
    const origin = event?.target as Element | undefined;
    if (origin && (!origin.closest('.mr-content') || origin.closest('.mr-composer, .mr-thread, .mr-select-chip'))) return;
    const selection = this.shadowSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const view = this.views.find((v) => v.section.contains(range.startContainer) && v.section.contains(range.endContainer));
    if (!view?.rendered) return;
    const rect = [...range.getClientRects()].filter((r) => r.width && r.height).at(-1) ?? range.getBoundingClientRect();
    const target = selectionTarget(view.doc, view.rendered.blocks, range);
    if (!target) {
      this.showChip(rect, null, 'Select text within one file and one version (old or new) to comment');
      return;
    }
    const elements = view.rendered.blocks.filter((block) => range.intersectsNode(block.el)).map((block) => block.el);
    this.showChip(rect, { target, elements, range: range.cloneRange() });
  }

  /** On touch screens a tap on a paragraph offers the chip for that paragraph. */
  private onTap(e: PointerEvent): void {
    const node = e.target as Element;
    if (this.submitting || node.closest('a, button, summary, input, .mr-thread') || !this.shadowSelection()?.isCollapsed) return;
    const hit = this.blockAt(node);
    const target = hit && paragraphTarget(hit.view.doc, hit.block, hit.side);
    if (!hit || !target) {
      this.hideChip();
      return;
    }
    this.showChip(new DOMRect(e.clientX, e.clientY, 0, 0), { target, elements: [hit.el] });
  }

  private showChip(rect: DOMRect, target: Reader['chipTarget'], problem?: string): void {
    const chip = this.el.chip as HTMLButtonElement;
    this.chipTarget = target;
    chip.disabled = !target;
    chip.title = problem ?? 'Comment on this text';
    chip.hidden = false;
    this.placeChip(rect);
  }

  private placeChip(rect: DOMRect): void {
    const chip = this.el.chip;
    const width = chip.offsetWidth || 110;
    const left = Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, this.root.clientWidth - width - 8));
    const above = rect.top - 44;
    chip.style.left = `${left}px`;
    chip.style.top = `${above > 60 ? above : rect.bottom + 10}px`;
  }

  private hideChip(): void {
    this.el.chip.hidden = true;
    this.chipTarget = null;
  }

  private openComposer(target: CommentTarget, elements: HTMLElement[], range?: Range): void {
    if (this.submitting) return;
    this.hideChip();
    this.el.toast.hidden = true;
    this.setTarget(target, elements, range);
    this.el.composer.hidden = false;
    this.root.classList.add('is-composing');
    this.growTextarea();
    requestAnimationFrame(() => {
      if (this.closed) return;
      // Keep the paragraph being discussed in view above the dock.
      const last = elements[elements.length - 1];
      const rect = last?.getBoundingClientRect();
      const limit = this.root.clientHeight - this.el.composer.offsetHeight - 24;
      if (last && rect && (rect.bottom > limit || rect.top < 64)) this.scrollToEl(last, 0.22, false);
      this.textarea.focus({ preventScroll: true });
    });
  }

  private closeComposer(discard: boolean): void {
    if (this.submitting) return;
    if (discard) this.textarea.value = '';
    // Hiding the focused textarea would drop focus to the page and silence the reader's shortcuts.
    const focusInside = this.el.composer.contains(this.shadow.activeElement);
    this.clearTarget();
    this.el.composer.hidden = true;
    this.root.classList.remove('is-composing');
    if (focusInside) this.root.focus({ preventScroll: true });
    this.schedule(false);
  }

  private clearTarget(): void {
    this.planToken++;
    this.target = null;
    this.plan = null;
    for (const el of this.targetEls) el.classList.remove('mr-targeted');
    this.targetEls = [];
    CSS.highlights?.delete('galley-quote');
    this.el.commentTarget.textContent = 'a paragraph';
    this.el.commentQuote.hidden = true;
    this.updateSubmit();
  }

  private setTarget(target: CommentTarget, elements: HTMLElement[], range?: Range): void {
    this.clearTarget();
    this.target = target;
    if (range && typeof Highlight === 'function' && CSS.highlights) {
      // A selection stays visibly marked while the reviewer types.
      CSS.highlights.set('galley-quote', new Highlight(range));
    } else {
      this.targetEls = [...new Set(elements.map(surfaceOf))];
      for (const el of this.targetEls) el.classList.add('mr-targeted');
    }
    const path = target.side === 'base' ? target.doc.oldPath : target.doc.path;
    const lines = target.startLine === target.endLine ? `line ${target.startLine}` : `lines ${target.startLine}–${target.endLine}`;
    this.el.commentTarget.textContent = `${path} · ${target.side === 'base' ? 'old' : 'new'} ${target.doc.kind === 'code' ? 'source' : 'text'}, ${lines}`;
    this.el.commentQuote.textContent = target.quote;
    this.el.commentQuote.hidden = !target.quote;
    const token = ++this.planToken;
    const prepare = this.source?.prepareComment;
    if (!prepare) {
      this.el.commentStatus.textContent = 'Commenting is unavailable for this source.';
      return;
    }
    this.el.commentStatus.textContent = 'Preparing…';
    void prepare(target).then((plan) => {
      if (token !== this.planToken || this.closed) return;
      this.plan = plan;
      this.el.commentStatus.textContent = `${plan.label} · ${/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'}↵`;
      this.updateSubmit();
    }, (err) => {
      if (token === this.planToken && !this.closed) this.el.commentStatus.textContent = err instanceof Error ? err.message : String(err);
    });
  }

  private async postComment(): Promise<void> {
    if (!this.plan || !this.target || !this.textarea.value.trim() || this.submitting) return;
    const plan = this.plan, target = this.target, body = this.textarea.value;
    this.submitting = true;
    this.textarea.disabled = true;
    this.updateSubmit();
    this.el.commentStatus.textContent = 'Posting…';
    try {
      const result = await plan.post(body);
      if (this.closed) return;
      const thread: Thread = {
        doc: target.doc,
        side: target.side,
        line: target.endLine,
        url: result.url,
        comments: [{ author: 'You', body, createdAt: new Date().toISOString(), url: result.url }],
      };
      this.ownThreads.add(thread);
      this.threads.push(thread);
      const view = this.views.find((v) => v.doc === target.doc);
      if (view?.rendered) this.attachThreads(view);
      this.submitting = false;
      this.closeComposer(true);
      // The textarea was disabled while posting, which already moved focus out of the reader.
      this.root.focus({ preventScroll: true });
      this.toast('Comment posted', result.url);
    } catch (err) {
      if (this.closed) return;
      this.el.commentStatus.textContent = err instanceof ReaderError ? `${err.message} ${err.hint}` : err instanceof Error ? err.message : String(err);
    } finally {
      this.submitting = false;
      this.textarea.disabled = false;
      this.updateSubmit();
    }
  }

  private toast(text: string, url?: string): void {
    const toast = this.el.toast;
    toast.replaceChildren(text);
    const href = url && platformLink(url, location.origin);
    if (href) {
      const link = h('a', '', 'View on platform');
      link.href = href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      toast.append(' · ', link);
    }
    toast.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => { toast.hidden = true; }, 6000);
  }

  // ---------------------------------------------------------------- threads

  private async loadThreads(): Promise<void> {
    const load = this.source?.loadThreads;
    if (!load) return;
    try {
      const threads = await load();
      if (this.closed) return;
      this.threads.push(...threads);
    } catch {
      // Threads are context; a failure must not get in the way of reading.
      return;
    }
    for (const view of this.views) if (view.rendered) this.attachThreads(view);
    this.schedule(true);
  }

  /** Anchor this document's threads to the blocks holding their lines; the rest are file comments. */
  private attachThreads(view: View): void {
    const r = view.rendered!;
    for (const entry of this.threadEls) if (entry.view === view) entry.card.remove();
    this.threadEls = this.threadEls.filter((entry) => entry.view !== view);
    view.section.querySelector('.mr-file-threads')?.remove();
    for (const block of r.blocks) delete block.el.dataset.mrThreads;
    const fileLevel: HTMLElement[] = [];
    for (const thread of this.threads) {
      if (thread.doc !== view.doc) continue;
      const card = this.threadCard(thread);
      const line = thread.line;
      const block = line === null ? undefined : r.blocks.find((b) => {
        const unit = thread.side === 'base' ? b.base : b.head;
        return unit && line - 1 >= unit.lines[0] && line - 1 < Math.max(unit.lines[1], unit.lines[0] + 1);
      });
      if (!block) {
        fileLevel.push(card);
        continue;
      }
      block.el.dataset.mrThreads = '';
      this.threadEls.push({ view, card, anchor: block.el });
    }
    if (fileLevel.length) {
      const box = h('section', 'mr-file-threads');
      box.setAttribute('aria-label', 'Comments on this file');
      box.append(h('p', 'mr-file-threads-title', `${fileLevel.length} comment${fileLevel.length === 1 ? '' : 's'} on this file`), ...fileLevel);
      view.section.querySelector('.mr-byline')?.after(box);
    }
    filterDocument(r, this.settings.scope === 'changed');
    this.schedule(true);
  }

  private threadCard(thread: Thread): HTMLElement {
    const own = this.ownThreads.has(thread);
    const card = h('aside', `mr-thread${own ? ' is-own' : ''}${thread.resolved ? ' is-resolved' : ''}`);
    const first = thread.comments[0];
    card.setAttribute('aria-label', `Comment by ${first?.author ?? 'unknown'}${thread.line ? ` on ${thread.side === 'base' ? 'old' : 'new'} line ${thread.line}` : ''}`);
    const fold = thread.comments.length > 3;
    thread.comments.forEach((comment, i) => {
      const item = h('div', `mr-thread-comment${fold && i > 0 && i < thread.comments.length - 1 ? ' is-folded' : ''}`);
      const meta = h('div', 'mr-thread-meta');
      meta.append(h('span', 'mr-avatar', comment.author.slice(0, 1).toUpperCase()), h('span', 'mr-thread-author', comment.author));
      const time = h('time', 'mr-thread-time', relativeTime(comment.createdAt));
      time.dateTime = comment.createdAt;
      time.title = new Date(comment.createdAt).toLocaleString();
      meta.append(time);
      const body = h('div', 'mr-thread-body');
      body.append(renderSnippet(document, comment.body, location.origin, this.settings.images));
      item.append(meta, body);
      card.append(item);
      if (fold && i === 0) {
        const more = actionButton(`${thread.comments.length - 2} more replies`, 'toggle-thread', 'mr-thread-more');
        more.dataset.label = more.textContent!;
        card.append(more);
      }
    });
    const foot = h('div', 'mr-thread-foot');
    if (thread.outdated) foot.append(h('span', 'mr-thread-tag', 'Outdated'));
    if (thread.resolved) foot.append(h('span', 'mr-thread-tag', 'Resolved'));
    const href = platformLink(thread.url, location.origin);
    if (href) {
      const link = h('a', 'mr-thread-link', own ? 'View on platform' : 'Reply on platform');
      link.href = href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      foot.append(link);
    }
    card.append(foot);
    return card;
  }

  /** Wide screens: cards in the left margin, level with their block, never overlapping. Narrow: below it. */
  private layoutThreads(): void {
    const article = this.el.article.getBoundingClientRect();
    const wide = article.left >= RAIL_SPACE;
    this.root.classList.toggle('has-rail', wide);
    for (const entry of this.threadEls) {
      const { card, anchor } = entry;
      if (wide) {
        if (card.parentElement !== this.rail) this.rail.append(card);
      } else {
        card.style.top = '';
        const item = anchor.matches('.mr-tight') ? anchor.closest('li') : null;
        if (item) {
          if (item.lastElementChild !== card) item.append(card);
        } else if (anchor.nextElementSibling !== card) anchor.after(card);
      }
      card.hidden = !anchor.isConnected || Boolean(anchor.closest('[hidden]')) || !anchor.getClientRects().length;
    }
    if (!wide) return;
    let floor = -Infinity;
    const placed = this.threadEls
      .filter((entry) => !entry.card.hidden)
      .map((entry) => ({ card: entry.card, top: surfaceOf(entry.anchor).getBoundingClientRect().top - article.top }))
      .sort((a, b) => a.top - b.top);
    for (const { card, top } of placed) {
      const y = Math.max(top, floor);
      card.style.top = `${y}px`;
      floor = y + card.offsetHeight + 12;
    }
  }

  // ---------------------------------------------------------------- frame updates

  private schedule(layout: boolean): void {
    this.needLayout ||= layout;
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      if (this.needLayout) {
        this.layoutGutter();
        this.layoutThreads();
      }
      this.needLayout = false;
      this.onScroll();
    });
  }

  private onScroll(): void {
    const root = this.root;
    root.style.setProperty('--composer-height', `${this.el.composer.offsetHeight}px`);
    const top = root.scrollTop;
    const max = root.scrollHeight - root.clientHeight;
    this.el.progress.style.transform = `scaleX(${max > 0 ? Math.min(1, top / max) : 0})`;
    this.el.topbar.classList.toggle('is-scrolled', top > 2);
    let currentDoc = this.index;
    this.views.forEach((view, i) => { if (!view.section.hidden && view.section.getBoundingClientRect().top <= 150) currentDoc = i; });
    if (currentDoc !== this.index) {
      this.index = currentDoc;
      this.rendered = this.views[currentDoc].rendered;
      this.updateFileButton();
      if (this.rendered) this.buildToc(this.rendered);
      else this.el.toc.replaceChildren();
    }
    this.placeCommentButton();
    if (!this.el.chip.hidden && !this.chipTarget?.range) this.hideChip();
    else if (this.chipTarget?.range) this.placeChip(this.chipTarget.range.getBoundingClientRect());

    let activeHeading = -1;
    this.headings.forEach((hd, i) => {
      if (hd.el.getBoundingClientRect().top < 140) activeHeading = i;
    });
    for (const [i, hd] of this.headings.entries()) hd.link.classList.toggle('is-active', i === activeHeading);

    const list = this.visibleChanges();
    if (!list.length) {
      this.el.pill.hidden = true;
      return;
    }
    this.el.pill.hidden = false;
    const line = root.clientHeight * FOCUS_LINE + 8;
    let current = -1;
    list.forEach((el, i) => {
      if (el.getBoundingClientRect().top <= line) current = i;
    });
    this.el.pillLabel.textContent =
      current === -1 ? `${list.length} change${list.length === 1 ? '' : 's'}` : `Change ${current + 1} of ${list.length}`;
  }

  /** Draw the change bars in the left margin, merging adjacent blocks of the same kind. */
  private layoutGutter(): void {
    const gutter = this.el.gutter;
    gutter.replaceChildren();
    this.markTargets = [];
    const origin = this.el.article.getBoundingClientRect().top;
    const spans: Array<{ top: number; bottom: number; kind: string; target: HTMLElement; point: boolean }> = [];
    for (const el of this.el.doc.querySelectorAll<HTMLElement>('[data-mr-change]')) {
      const content = el.closest('.mr-content')!;
      if (el.closest('[hidden]')) continue;
      const kind = el.dataset.mrChange!;
      let point = false;
      let rect = el.getBoundingClientRect();
      if (!el.getClientRects().length) {
        const next = nextVisible(el, content);
        if (!next) continue;
        rect = next.getBoundingClientRect();
        point = true;
      }
      const top = point ? rect.top - origin - 10 : rect.top - origin;
      const bottom = point ? top + 7 : rect.bottom - origin;
      const last = spans[spans.length - 1];
      if (last && !point && !last.point && last.kind === kind && top - last.bottom < 16) {
        last.bottom = Math.max(last.bottom, bottom);
        continue;
      }
      spans.push({ top, bottom, kind, target: el, point });
    }
    const label: Record<string, string> = { added: 'Added', modified: 'Edited', removed: 'Removed' };
    spans.forEach((s, i) => {
      const mark = h('div', `mr-mark is-${s.kind}${s.point ? ' is-point' : ''}`);
      mark.style.top = `${s.top}px`;
      mark.style.height = `${Math.max(4, s.bottom - s.top)}px`;
      mark.title = label[s.kind] ?? '';
      mark.dataset.act = 'mark';
      mark.dataset.i = String(i);
      this.markTargets.push(s.point ? (nextVisible(s.target, s.target.closest('.mr-content')!) as HTMLElement) ?? s.target : s.target);
      gutter.append(mark);
    });
  }
}
