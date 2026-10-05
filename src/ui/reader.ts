import { ReaderError, type DocContents, type DocRef, type DocStatus, type ReviewSource } from '../platforms/types.ts';
import { icons } from './icons.ts';
import css from './reader.css';
import { renderDocument, type RenderedDoc } from './render.ts';
import { DEFAULT_SETTINGS, TEXT_SIZES, loadSettings, saveSettings, type Settings } from './settings.ts';

const STATUS_LABEL: Record<DocStatus, string> = { added: 'New', removed: 'Deleted', modified: 'Edited', renamed: 'Renamed' };
const WORDS_PER_MINUTE = 230;
/** Changes are brought to this fraction of the viewport height when navigating. */
const FOCUS_LINE = 0.3;

const TEMPLATE = `
<div class="mr-root mode-changes" tabindex="-1" role="dialog" aria-modal="true" aria-label="mreadie reader">
  <div class="mr-progress"><div></div></div>
  <header class="mr-topbar">
    <div class="mr-tb-left">
      <button class="mr-btn" data-act="close" title="Back to the diff (Esc)">${icons.back}<span class="mr-hide-sm">Back</span></button>
      <span class="mr-brand">mreadie${__MREADIE_DEV__ ? '<span class="mr-dev">dev</span>' : ''}</span>
      <span class="mr-pr-title"></span>
    </div>
    <div class="mr-tb-center">
      <button class="mr-btn mr-file-btn" data-act="files" aria-haspopup="menu" aria-expanded="false" hidden>
        <span class="mr-status"></span><span class="mr-path"></span><span class="mr-count"></span>${icons.chevronDown}
      </button>
    </div>
    <div class="mr-tb-right">
      <div class="mr-seg" role="group" aria-label="Show changes">
        <button data-mode="changes" aria-pressed="true" title="Highlight what changed (C)">Changes</button>
        <button data-mode="clean" aria-pressed="false" title="Read the new version only (C)">Clean</button>
      </div>
      <button class="mr-btn mr-aa" data-act="settings" aria-haspopup="dialog" aria-expanded="false" title="Reading settings">Aa</button>
    </div>
  </header>
  <div class="mr-menu mr-files" role="menu" aria-label="Changed documents" hidden></div>
  <div class="mr-menu mr-settings" role="dialog" aria-label="Reading settings" hidden>
    <div class="mr-set-row"><span>Theme</span>
      <div class="mr-seg" data-setting="theme">
        <button data-value="auto">Auto</button><button data-value="light">Light</button><button data-value="sepia">Sepia</button><button data-value="dark">Dark</button>
      </div>
    </div>
    <div class="mr-set-row"><span>Typeface</span>
      <div class="mr-seg" data-setting="font"><button data-value="serif" class="mr-serif-sample">Serif</button><button data-value="sans">Sans</button></div>
    </div>
    <div class="mr-set-row"><span>Text size</span>
      <div class="mr-seg"><button data-act="smaller" aria-label="Smaller text">A−</button><button data-act="larger" aria-label="Larger text">A+</button></div>
    </div>
    <dl class="mr-keys">
      <dt><kbd>J</kbd> <kbd>K</kbd></dt><dd>Next / previous change</dd>
      <dt><kbd>]</kbd> <kbd>[</kbd></dt><dd>Next / previous document</dd>
      <dt><kbd>C</kbd></dt><dd>Changes on / off</dd>
      <dt><kbd>+</kbd> <kbd>−</kbd></dt><dd>Text size</dd>
      <dt><kbd>Esc</kbd></dt><dd>Back to the diff</dd>
    </dl>
  </div>
  <nav class="mr-toc" aria-label="Contents"></nav>
  <main class="mr-main">
    <article class="mr-article">
      <div class="mr-gutter" aria-hidden="true"></div>
      <div class="mr-doc"></div>
    </article>
  </main>
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

function statusBadge(status: DocStatus): HTMLElement {
  return h('span', `mr-status is-${status}`, STATUS_LABEL[status]);
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

class Reader {
  private readonly host = document.createElement('div');
  private readonly shadow = this.host.attachShadow({ mode: 'open' });
  private readonly root: HTMLElement;
  private readonly el: Record<
    'progress' | 'topbar' | 'prTitle' | 'fileBtn' | 'fileStatus' | 'filePath' | 'fileCount' | 'files' | 'settings' | 'toc' | 'article' | 'gutter' | 'doc' | 'pill' | 'pillLabel',
    HTMLElement
  >;
  private settings: Settings = { ...DEFAULT_SETTINGS };
  private source: ReviewSource | null = null;
  private index = 0;
  private readonly cache = new Map<DocRef, Promise<DocContents>>();
  private rendered: RenderedDoc | null = null;
  private headings: Array<{ el: HTMLElement; link: HTMLElement }> = [];
  private markTargets: HTMLElement[] = [];
  private lastStep: { el: HTMLElement; at: number } | null = null;
  private renderToken = 0;
  private lastScrollTop = 0;
  private frame = 0;
  private needLayout = false;
  private closed = false;
  private readonly dark = matchMedia('(prefers-color-scheme: dark)');
  private readonly resize = new ResizeObserver(() => this.schedule(true));
  private readonly prevOverflow: string;
  private readonly prevFocus: Element | null;

  constructor(private readonly onClose?: () => void) {
    this.host.id = __MREADIE_DEV__ ? 'mreadie-reader-dev' : 'mreadie-reader';
    this.shadow.innerHTML = `<style>${css}</style>${TEMPLATE}`;
    const q = (sel: string) => this.shadow.querySelector<HTMLElement>(sel)!;
    this.root = q('.mr-root');
    this.el = {
      progress: q('.mr-progress > div'),
      topbar: q('.mr-topbar'),
      prTitle: q('.mr-pr-title'),
      fileBtn: q('.mr-file-btn'),
      fileStatus: q('.mr-file-btn .mr-status'),
      filePath: q('.mr-file-btn .mr-path'),
      fileCount: q('.mr-file-btn .mr-count'),
      files: q('.mr-files'),
      settings: q('.mr-settings'),
      toc: q('.mr-toc'),
      article: q('.mr-article'),
      gutter: q('.mr-gutter'),
      doc: q('.mr-doc'),
      pill: q('.mr-pill'),
      pillLabel: q('.mr-pill-label'),
    };
    this.el.doc.replaceChildren(this.skeleton());

    this.prevOverflow = document.documentElement.style.overflow;
    this.prevFocus = document.activeElement;
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.append(this.host);
    this.root.focus({ preventScroll: true });

    this.root.addEventListener('click', (e) => this.onClick(e));
    this.root.addEventListener('scroll', () => this.schedule(false), { passive: true });
    for (const type of ['keydown', 'keyup', 'keypress']) window.addEventListener(type, this.shield, true);
    this.dark.addEventListener('change', this.onSchemeChange);
    this.resize.observe(this.el.doc);

    this.applySettings();
    void loadSettings().then((s) => {
      this.settings = s;
      this.applySettings();
    });
  }

  setSource(source: ReviewSource, start: number): void {
    if (this.closed) return;
    this.source = source;
    this.el.prTitle.textContent = source.title;
    if (!source.docs.length) {
      this.showMessage('No markdown changes here', 'This change set does not touch any markdown files.');
      return;
    }
    void this.show(Math.min(Math.max(start, 0), source.docs.length - 1));
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    cancelAnimationFrame(this.frame);
    this.resize.disconnect();
    for (const type of ['keydown', 'keyup', 'keypress']) window.removeEventListener(type, this.shield, true);
    this.dark.removeEventListener('change', this.onSchemeChange);
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
      p.append(a, ' with read-only access to Contents and Pull requests, then click the mreadie icon in your browser toolbar to save it.');
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

  private async show(index: number): Promise<void> {
    const source = this.source!;
    const doc = source.docs[index];
    const token = ++this.renderToken;
    this.index = index;
    this.closeMenus();
    this.updateFileButton();
    this.rendered = null;
    this.el.doc.replaceChildren(this.skeleton());
    this.el.toc.replaceChildren();
    this.el.gutter.replaceChildren();
    this.el.pill.hidden = true;
    this.root.classList.toggle('doc-removed', doc.status === 'removed');
    this.root.scrollTop = 0;
    try {
      const contents = await this.load(doc);
      if (token !== this.renderToken || this.closed) return;
      const rendered = renderDocument(document, {
        path: doc.status === 'removed' ? doc.oldPath : doc.path,
        status: doc.status,
        base: contents.base,
        head: contents.head,
        links: source.links(doc),
      });
      this.rendered = rendered;
      this.el.doc.replaceChildren(this.buildArticle(doc, rendered));
      this.buildToc(rendered);
      this.el.pill.hidden = rendered.changes.length === 0;
      this.schedule(true);
      const next = source.docs[index + 1];
      if (next) this.load(next).catch(() => {});
    } catch (err) {
      if (token === this.renderToken) this.showError(err);
    }
  }

  private buildArticle(doc: DocRef, r: RenderedDoc): DocumentFragment {
    const frag = document.createDocumentFragment();
    const kicker = h('p', 'mr-kicker');
    kicker.append(statusBadge(doc.status), h('span', 'mr-path', doc.status === 'renamed' ? `${doc.oldPath} → ${doc.path}` : doc.path));
    frag.append(kicker);

    const intro: HTMLElement[] = [];
    if (r.description) intro.push(h('p', 'mr-subtitle', r.description));
    intro.push(this.byline(doc, r));
    if (doc.status === 'added') intro.push(h('div', 'mr-banner is-added', 'This document is new in this change.'));
    if (doc.status === 'removed') intro.push(h('div', 'mr-banner is-removed', 'This document is deleted by this change. You are reading its last version.'));

    if (r.lead) {
      // Title first, like an article: front matter (or its removed version) moves below the byline.
      const before: Element[] = [];
      for (let el = r.content.firstElementChild; el && el !== r.lead; el = el.nextElementSibling) before.push(el);
      r.lead.classList.add('mr-lead');
      r.lead.after(...intro, ...before);
    } else {
      frag.append(h('h1', 'mr-title', r.title ?? prettyName(doc.path)), ...intro);
    }
    frag.append(r.content, this.footer());
    return frag;
  }

  private byline(doc: DocRef, r: RenderedDoc): HTMLElement {
    const line = h('div', 'mr-byline');
    line.append(h('span', '', `${Math.max(1, Math.round(r.words / WORDS_PER_MINUTE))} min read`));
    if (doc.status === 'added') line.append(chip('added', 'New document'));
    else if (doc.status === 'removed') line.append(chip('removed', 'Deleted'));
    else {
      const { added, modified, removed } = r.stats;
      if (!added && !modified && !removed) line.append(h('span', '', doc.status === 'renamed' ? 'Moved, text unchanged' : 'No visible text changes'));
      if (modified) line.append(chip('modified', `${modified} edited`));
      if (added) line.append(chip('added', `${added} added`));
      if (removed) line.append(chip('removed', `${removed} removed`));
    }
    return line;
  }

  private footer(): HTMLElement {
    const end = h('footer', 'mr-end');
    const docs = this.source!.docs;
    const next = docs[this.index + 1];
    if (next) {
      const b = h('button', 'mr-next');
      b.dataset.act = 'doc';
      b.dataset.doc = String(this.index + 1);
      const label = h('span');
      label.append(h('small', '', `Next document · ${this.index + 2} of ${docs.length}`), h('span', 'mr-path', next.path));
      b.append(label);
      b.insertAdjacentHTML('beforeend', icons.arrowRight);
      end.append(b);
    } else {
      end.append(h('p', 'mr-end-note', docs.length > 1 ? 'That was the last changed document.' : 'End of document.'));
      end.append(actionButton('Back to the diff', 'close', 'mr-outline'));
    }
    return end;
  }

  private buildToc(r: RenderedDoc): void {
    this.headings = [];
    const toc = this.el.toc;
    toc.replaceChildren();
    const all = [...r.content.querySelectorAll<HTMLElement>('h1, h2, h3')].filter((el) => el !== r.lead && !el.closest('.mr-ghost'));
    if (all.length < 3) return;
    const top = Math.min(...all.map((el) => Number(el.tagName[1])));
    toc.append(h('p', 'mr-toc-title', 'Contents'));
    all.forEach((el, i) => {
      const link = h('a', `lvl-${Math.min(3, Number(el.tagName[1]) - top + 1)}`);
      link.href = '#';
      link.dataset.act = 'heading';
      link.dataset.i = String(i);
      link.append(h('span', '', textWithoutDeletions(el)));
      toc.append(link);
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
    const docs = this.source!.docs;
    const doc = docs[this.index];
    this.el.fileBtn.hidden = false;
    this.el.fileStatus.className = `mr-status is-${doc.status}`;
    this.el.fileStatus.textContent = STATUS_LABEL[doc.status];
    this.el.filePath.textContent = doc.path;
    this.el.fileCount.textContent = docs.length > 1 ? `${this.index + 1}/${docs.length}` : '';
    this.el.fileBtn.title = doc.path;
    const menu = this.el.files;
    menu.replaceChildren();
    docs.forEach((d, i) => {
      const item = h('button', 'mr-menu-item');
      item.setAttribute('role', 'menuitem');
      item.dataset.act = 'doc';
      item.dataset.doc = String(i);
      if (i === this.index) item.setAttribute('aria-current', 'true');
      item.append(statusBadge(d.status), h('span', 'mr-path', d.path));
      menu.append(item);
    });
  }

  private skeleton(): HTMLElement {
    const s = h('div', 'mr-skeleton');
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
  }

  private closeMenus(): boolean {
    let wasOpen = false;
    for (const menu of [this.el.files, this.el.settings]) {
      wasOpen ||= !menu.hidden;
      menu.hidden = true;
    }
    for (const b of this.shadow.querySelectorAll('[aria-expanded]')) b.setAttribute('aria-expanded', 'false');
    return wasOpen;
  }

  private update(patch: Partial<Settings>): void {
    this.settings = { ...this.settings, ...patch };
    this.applySettings();
    void saveSettings(this.settings);
  }

  private applySettings(): void {
    const s = this.settings;
    const r = this.root;
    r.classList.toggle('mode-changes', s.mode === 'changes');
    r.classList.toggle('mode-clean', s.mode === 'clean');
    r.classList.toggle('font-sans', s.font === 'sans');
    r.classList.toggle('is-sepia', s.theme === 'sepia');
    r.classList.toggle('is-dark', s.theme === 'dark' || (s.theme === 'auto' && this.dark.matches));
    r.style.setProperty('--body-size', `${TEXT_SIZES[s.size] ?? 20}px`);
    for (const b of this.shadow.querySelectorAll<HTMLElement>('[data-mode]')) b.setAttribute('aria-pressed', String(b.dataset.mode === s.mode));
    for (const group of this.shadow.querySelectorAll<HTMLElement>('[data-setting]')) {
      const value = s[group.dataset.setting as 'theme' | 'font'];
      for (const b of group.querySelectorAll<HTMLElement>('[data-value]')) b.setAttribute('aria-pressed', String(b.dataset.value === value));
    }
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
    return (this.rendered?.changes ?? []).filter((el) => el.getClientRects().length > 0);
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
    const docs = this.source?.docs ?? [];
    const next = this.index + direction;
    if (next >= 0 && next < docs.length) void this.show(next);
  }

  // ---------------------------------------------------------------- events

  /** Keep the page's own keyboard shortcuts from firing while the reader is open. */
  private readonly shield = (e: Event) => {
    if (e.target !== this.host) return;
    if (e.type === 'keydown') this.onKey(e as KeyboardEvent);
    e.stopPropagation();
  };

  private onKey(e: KeyboardEvent): void {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.composedPath()[0];
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
    const inMenu = target.closest('.mr-menu, [data-act="files"], [data-act="settings"]');
    if (!inMenu) this.closeMenus();

    const anchor = target.closest<HTMLAnchorElement>('.mr-content a[href^="#"]');
    if (anchor) {
      e.preventDefault();
      const id = decodeURIComponent(anchor.getAttribute('href')!.slice(1));
      const dest = id && (this.shadow.getElementById(id) ?? this.shadow.getElementById(`user-content-${id}`));
      if (dest) this.scrollToEl(dest, 0.12);
      return;
    }

    const mode = target.closest<HTMLElement>('[data-mode]');
    if (mode) return this.update({ mode: mode.dataset.mode as Settings['mode'] });
    const setting = target.closest<HTMLElement>('[data-setting] [data-value]');
    if (setting) {
      const key = setting.parentElement!.dataset.setting as 'theme' | 'font';
      return this.update({ [key]: setting.dataset.value } as Partial<Settings>);
    }

    const action = target.closest<HTMLElement>('[data-act]');
    if (!action) return;
    switch (action.dataset.act) {
      case 'close':
        return this.close();
      case 'files':
        if ((this.source?.docs.length ?? 0) > 1) this.toggleMenu(this.el.files, action);
        return;
      case 'settings':
        return this.toggleMenu(this.el.settings, action);
      case 'smaller':
        return this.update({ size: Math.max(0, this.settings.size - 1) });
      case 'larger':
        return this.update({ size: Math.min(TEXT_SIZES.length - 1, this.settings.size + 1) });
      case 'prev':
        return this.step(-1);
      case 'next':
        return this.step(1);
      case 'doc':
        void this.show(Number(action.dataset.doc));
        return;
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

  // ---------------------------------------------------------------- frame updates

  private schedule(layout: boolean): void {
    this.needLayout ||= layout;
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      if (this.needLayout) this.layoutGutter();
      this.needLayout = false;
      this.onScroll();
    });
  }

  private onScroll(): void {
    const root = this.root;
    const top = root.scrollTop;
    const max = root.scrollHeight - root.clientHeight;
    this.el.progress.style.transform = `scaleX(${max > 0 ? Math.min(1, top / max) : 0})`;
    const menusOpen = !this.el.files.hidden || !this.el.settings.hidden;
    this.el.topbar.classList.toggle('is-hidden', top > this.lastScrollTop && top > 160 && !menusOpen);
    this.lastScrollTop = top;

    let activeHeading = -1;
    this.headings.forEach((hd, i) => {
      if (hd.el.getBoundingClientRect().top < 140) activeHeading = i;
    });
    this.headings.forEach((hd, i) => hd.link.classList.toggle('is-active', i === activeHeading));

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
    const r = this.rendered;
    if (!r) return;
    const origin = this.el.article.getBoundingClientRect().top;
    const spans: Array<{ top: number; bottom: number; kind: string; target: HTMLElement; point: boolean }> = [];
    for (const el of r.content.querySelectorAll<HTMLElement>('[data-mr-change]')) {
      const kind = el.dataset.mrChange!;
      let point = false;
      let rect = el.getBoundingClientRect();
      if (!el.getClientRects().length) {
        const next = nextVisible(el, r.content);
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
      this.markTargets.push(s.point ? (nextVisible(s.target, r.content) as HTMLElement) ?? s.target : s.target);
      gutter.append(mark);
    });
  }
}
