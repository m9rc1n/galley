import {
  ReaderError,
  type DocContents,
  type DocRef,
  type DocStatus,
  type ReviewOverview,
  type ReviewSource,
  type CommentTarget,
  type CommentPlan,
  type Thread,
} from '../platforms/types.ts';
import { highlightCode, languageName, languageOf } from './code.ts';
import { renderCodeFile } from './code-files.ts';
import { quietFile, type QuietFile } from '../core/quiet.ts';
import { MoveFinder, showMove } from './moves.ts';
import { enhanceSymbols, refreshSymbols } from './symbols.ts';
import { enhanceSpecs } from './specs.ts';
import { renderSourceComments, showCommentSource } from './source-comments.ts';
import { isPalette, PALETTE_KEYS, type DiagramPalette } from './diagram-palette.ts';
import { renderDiagrams } from './diagrams.ts';
import { viewedKey, loadViewed, saveViewed } from './viewed.ts';
import { icons } from './icons.ts';
import css from './reader.css';
import { loadReaderFonts } from './fonts.ts';
import { loadImage, platformLink, renderDocument, renderSnippet, type RenderedBlock, type RenderedDoc } from './render.ts';
import { filterDocument, paragraphTarget, selectionTarget } from './reading.ts';
import { DEFAULT_SETTINGS, LAYOUTS, TEXT_SIZES, loadSettings, saveSettings, type Layout, type Settings, type Theme } from './settings.ts';

const STATUS_LABEL: Record<DocStatus, string> = { added: 'New', removed: 'Deleted', modified: 'Edited', renamed: 'Renamed' };
const WORDS_PER_MINUTE = 230;
/** Changes are brought to this fraction of the viewport height when navigating. */
const FOCUS_LINE = 0.3;

/** Palettes chosen for reading: neutral, warm, then cool. The settings show them six to a page. */
const PALETTES: Array<[Theme, string, string]> = [
  ['paper', 'Paper', 'Neutral'],
  ['eink', 'E-ink', 'Paper grey'],
  ['cream', 'Cream', 'Gentle cream'],
  ['sepia', 'Sepia', 'Warm paper'],
  ['night', 'Night', 'Evening amber'],
  ['blush', 'Blush', 'Warm pastel'],
  ['sage', 'Sage', 'Soft green'],
  ['seafoam', 'Seafoam', 'Cool green'],
  ['slate', 'Slate', 'Cool blue'],
  ['nord', 'Nord', 'Arctic blue'],
  ['dusk', 'Dusk', 'Soft violet'],
  ['contrast', 'Contrast', 'Crisp ink'],
  ['ocean', 'Ocean', 'Ink · sea glass'],
  ['clay', 'Clay', 'Stone · terracotta'],
  ['orchid', 'Orchid', 'Stone · lavender'],
  ['graphite', 'Graphite', 'Charcoal · blue'],
];
const PALETTES_PER_PAGE = 6;
const paletteButton = ([value, name, caption]: [Theme, string, string]) => `
  <button data-value="${value}" aria-label="${name}">
    <span class="mr-theme-preview" aria-hidden="true"><span>Aa</span><span class="mr-theme-lines"><i></i><i></i><i></i></span></span>
    <span class="mr-theme-label"><span class="mr-theme-name">${name}</span>${icons.check}</span>
    <span class="mr-theme-caption">${caption}</span>
  </button>`;
const PALETTE_PAGES = Array.from(
  { length: Math.ceil(PALETTES.length / PALETTES_PER_PAGE) },
  (_, page) =>
    `<div class="mr-palette-page">${PALETTES.slice(page * PALETTES_PER_PAGE, (page + 1) * PALETTES_PER_PAGE)
      .map(paletteButton)
      .join('')}</div>`,
).join('');
const PALETTE_DOTS = Array.from(
  { length: Math.ceil(PALETTES.length / PALETTES_PER_PAGE) },
  (_, page) => `<button class="mr-carousel-dot" data-act="palette-page" data-page="${page}" aria-label="Palettes, page ${page + 1}"></button>`,
).join('');

/**
 * Each layout is drawn as a page: a contents column (c), the text (t, with lines) and the comments
 * column (m) in the proportions that layout gives them on a wide screen.
 */
const LAYOUT_CHOICES: Array<[Layout, string, string]> = [
  ['balanced', 'Balanced', 'Contents, text and comments side by side'],
  ['review', 'Review', 'More space for review comments'],
  ['wide', 'Wide text', 'For tables, code and diagrams'],
  ['focus', 'Focus', 'Text in one column, with comments below'],
  ['fit', 'Fit to screen', 'Uses the full window width'],
];
const LAYOUT_NAMES = Object.fromEntries(LAYOUT_CHOICES.map(([value, name]) => [value, name])) as Record<Layout, string>;
const LAYOUT_OPTIONS = LAYOUT_CHOICES.map(
  ([value, name, caption]) => `
  <button data-value="${value}" aria-label="${name}: ${caption}">
    <span class="mr-layout-preview" aria-hidden="true"><i class="c"></i><i class="t"><b></b><b></b><b></b><b></b></i><i class="m"><b></b><b></b></i></span>
    <span class="mr-theme-label"><span class="mr-theme-name">${name}</span>${icons.check}</span>
    <span class="mr-theme-caption">${caption}</span>
  </button>`,
).join('');

/** Settings tabs, in order: arrow keys move through them. */
const SETTINGS_TABS = ['reading', 'layout', 'review', 'keys'] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];
/** Every shortcut, grouped the way a review goes; the Keys tab lists them and onKey handles them. */
const SHORTCUTS: Array<[string, Array<[string[], string]>]> = [
  [
    'Move through the review',
    [
      [['J', 'K'], 'Next / previous change'],
      [['N', 'P'], 'Next / previous conversation'],
      [[']', '['], 'Next / previous file'],
      [['F'], 'Go to a file'],
    ],
  ],
  [
    'Comment',
    [
      [['R'], 'Comment on the selection or the paragraph in focus'],
      [['⌘/Ctrl', 'Enter'], 'Post the comment or reply'],
      [['Esc'], 'Leave the editor; your draft is kept'],
      [['V'], 'Mark the file viewed'],
    ],
  ],
  [
    'Change the view',
    [
      [['C'], 'Change marks on / off'],
      [['A'], 'Changed parts / whole files'],
      [['L'], 'Next layout'],
      [['D'], 'Comfortable / compact'],
      [['+', '−'], 'Larger / smaller text'],
      [['0'], 'Default text size'],
    ],
  ],
  [
    'Settings',
    [
      [[','], 'Open settings'],
      [['?'], 'Show these shortcuts'],
      [['Esc'], 'Close settings, then the reader'],
    ],
  ],
];
const KEY_GROUPS = SHORTCUTS.map(
  ([title, keys]) => `
  <section class="mr-settings-section mr-keys-group" aria-label="${title}"><h3 class="mr-keys-title">${title}</h3><dl class="mr-keys">${keys
    .map(([combo, description]) => `<dt>${combo.map((key) => `<kbd>${key}</kbd>`).join(' ')}</dt><dd>${description}</dd>`)
    .join('')}</dl></section>`,
).join('');

/** Settings chosen from a group of buttons in the settings sheet (data-setting / data-value). */
type SettingKey = 'theme' | 'appearance' | 'font' | 'images' | 'comments' | 'tests' | 'codeComments' | 'layout' | 'density';

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
  <div class="mr-menu mr-files" role="menu" aria-label="Changed files" hidden></div>
  <div class="mr-settings" hidden>
    <div class="mr-settings-backdrop" data-act="close-settings"></div>
    <aside class="mr-settings-panel" role="dialog" aria-modal="true" aria-labelledby="mr-settings-title" tabindex="-1">
      <header class="mr-settings-heading"><div><h2 id="mr-settings-title">Reading settings</h2><p>Choose a view that helps you follow the changes.</p></div><button class="mr-btn mr-icon-btn" data-act="close-settings" aria-label="Close settings (Esc)" title="Close settings (Esc)">${icons.close}</button></header>
      <div class="mr-settings-tabs" role="tablist" aria-label="Settings category">
        <button id="mr-reading-tab" role="tab" data-settings-tab="reading" aria-selected="true" aria-controls="mr-reading-panel" tabindex="0">${icons.book}Reading</button>
        <button id="mr-layout-tab" role="tab" data-settings-tab="layout" aria-selected="false" aria-controls="mr-layout-panel" tabindex="-1">${icons.layout}Layout</button>
        <button id="mr-review-tab" role="tab" data-settings-tab="review" aria-selected="false" aria-controls="mr-review-panel" tabindex="-1">${icons.check}Review</button>
        <button id="mr-keys-tab" role="tab" data-settings-tab="keys" aria-selected="false" aria-controls="mr-keys-panel" tabindex="-1">${icons.keyboard}Keys</button>
      </div>
      <div class="mr-settings-body">
      <div id="mr-reading-panel" role="tabpanel" aria-labelledby="mr-reading-tab">
      <section class="mr-settings-section" aria-label="Page appearance">
        <div class="mr-set-row"><span>Appearance</span><div class="mr-seg mr-appearance" data-setting="appearance" role="group" aria-label="Appearance"><button data-value="auto">System</button><button data-value="light">Light</button><button data-value="dark">Dark</button></div></div>
        <div class="mr-set-row mr-theme-row"><span>Palette<small>Previewed in your current appearance</small></span>
          <div class="mr-palette-carousel">
            <div class="mr-theme-options mr-palette-track" data-setting="theme" role="group" aria-label="Palette">${PALETTE_PAGES}</div>
            <div class="mr-carousel-nav">
              <button class="mr-btn mr-icon-btn" data-act="palette-prev" aria-label="Previous palettes">${icons.chevronLeft}</button>
              <span class="mr-carousel-dots">${PALETTE_DOTS}</span>
              <button class="mr-btn mr-icon-btn" data-act="palette-next" aria-label="More palettes">${icons.chevronRight}</button>
            </div>
          </div>
        </div>
      </section>
      <section class="mr-settings-section" aria-label="Typography">
        <div class="mr-set-row"><label for="mr-typeface">Typeface</label><div class="mr-font-select"><select id="mr-typeface" aria-label="Typeface"><option value="galley">Galley</option><option value="serif">Newsreader</option><option value="sans">DM Sans</option><option value="georgia">Georgia</option><option value="system">System</option><option value="mono">Monospace</option></select>${icons.chevronDown}</div></div>
        <div class="mr-set-row"><span>Text size</span><div class="mr-size-control"><button class="mr-btn" data-act="smaller" aria-label="Smaller text">A−</button><output class="mr-text-size" aria-live="polite">20 px</output><button class="mr-btn" data-act="larger" aria-label="Larger text">A+</button></div></div>
        <div class="mr-type-preview" aria-label="Typeface and text size preview"><p>Understand changes. Review together.</p><span>Read the context. See the edits. Ask a question.</span></div>
      </section>
      <p class="mr-settings-note">Changes to your settings appear in the reader right away.</p>
      </div>
      <div id="mr-layout-panel" role="tabpanel" aria-labelledby="mr-layout-tab" hidden>
      <section class="mr-settings-section" aria-label="Layout">
        <div class="mr-set-row mr-theme-row"><span>Layout<small>Arrange text and comments on wide screens. Narrow screens use one column.</small></span>
          <div class="mr-theme-options mr-layout-options" data-setting="layout" role="group" aria-label="Layout">${LAYOUT_OPTIONS}</div>
        </div>
        <div class="mr-set-row"><span>Density<small>Compact fits more on the screen</small></span><div class="mr-seg" data-setting="density" role="group" aria-label="Density"><button data-value="comfortable">Comfortable</button><button data-value="compact">Compact</button></div></div>
      </section>
      <p class="mr-settings-note">Changes to your settings appear in the reader right away.</p>
      </div>
      <div id="mr-review-panel" role="tabpanel" aria-labelledby="mr-review-tab" hidden>
      <section class="mr-settings-section" aria-label="Review">
        <div class="mr-set-row"><span>Change marks<small>Highlight inserted and removed text</small></span><div class="mr-seg" role="group" aria-label="Show changes"><button data-mode="changes" aria-pressed="true">Marked</button><button data-mode="clean" aria-pressed="false">Clean</button></div></div>
        <div class="mr-set-row"><span>Context<small>Show changed sections or read the full files</small></span><div class="mr-seg" role="group" aria-label="Paragraph filter"><button data-scope="changed" aria-pressed="true">Changed parts</button><button data-scope="all" aria-pressed="false">Whole files</button></div></div>
        <div class="mr-set-row"><span id="mr-overview-label">Title &amp; description<small>Show the request’s title and description before the files</small></span><button class="mr-switch mr-overview-toggle" data-act="overview" role="switch" aria-checked="false" aria-labelledby="mr-overview-label"></button></div>
        <div class="mr-set-row"><span id="mr-code-label">Code files<small>Review changed source files after the documents</small></span><button class="mr-switch mr-code-toggle" data-act="code-files" role="switch" aria-checked="false" aria-labelledby="mr-code-label"></button></div>
        <div class="mr-set-row"><span id="mr-signs-label">+ and − signs<small>Mark added and removed lines of code with + and −</small></span><button class="mr-switch" data-act="signs" role="switch" aria-checked="true" aria-labelledby="mr-signs-label"></button></div>
        <div class="mr-set-row"><span>Test files<small>Read suites and cases, or every line of the raw source</small></span><div class="mr-seg" data-setting="tests" role="group" aria-label="Test files"><button data-value="plan">Test plan</button><button data-value="source">Whole file</button></div></div>
        <div class="mr-set-row"><span>Code comments<small>Show comments in code as formatted notes, or as written</small></span><div class="mr-seg" data-setting="codeComments" role="group" aria-label="Code comments"><button data-value="formatted">Formatted</button><button data-value="source">Source</button></div></div>
        <div class="mr-set-row"><span>External images<small>Images hosted elsewhere can tell their host who is reading</small></span><div class="mr-seg" data-setting="images" role="group" aria-label="External images"><button data-value="ask">Ask</button><button data-value="load">Load</button></div></div>
        <div class="mr-set-row"><span>Comment cards<small>Choose a shaded background or a border</small></span><div class="mr-seg" data-setting="comments" role="group" aria-label="Comment cards"><button data-value="shaded">Shaded</button><button data-value="outlined">Outlined</button></div></div>
      </section>
      <p class="mr-settings-note">To comment, select some text or point at a paragraph. Replies stay in their thread.</p>
      </div>
      <div id="mr-keys-panel" role="tabpanel" aria-labelledby="mr-keys-tab" hidden>${KEY_GROUPS}
      <p class="mr-settings-note">Shortcuts work while the reader has focus and no text field is active. Press ? at any time to come back here.</p>
      </div>
      </div>
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
  <button type="button" class="mr-select-chip" data-act="comment-selection" hidden>${icons.comment}<span>Comment</span></button>
  <div class="mr-lightbox" role="dialog" aria-modal="true" aria-label="Enlarged diagram" hidden>
    <div class="mr-lightbox-stage" data-act="close-lightbox"><img alt="" draggable="false" data-act="diagram-canvas"></div>
    <div class="mr-lightbox-bar" role="toolbar" aria-label="Zoom">
      <button class="mr-btn mr-icon-btn" data-act="zoom-out" aria-label="Zoom out (−)" title="Zoom out (−)">${icons.minus}</button>
      <button class="mr-btn mr-zoom-level" data-act="zoom-fit" aria-label="Fit the diagram to the window (0)" title="Fit to the window (0)">100%</button>
      <button class="mr-btn mr-icon-btn" data-act="zoom-in" aria-label="Zoom in (+)" title="Zoom in (+)">${icons.plus}</button>
      <span class="mr-lightbox-hint">Pinch or ⌘/Ctrl + scroll to zoom · drag to move</span>
    </div>
    <button class="mr-btn mr-icon-btn mr-lightbox-close" data-act="close-lightbox" aria-label="Close diagram (Esc)" title="Close (Esc)">${icons.close}</button>
  </div>
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

function chip(kind: 'added' | 'modified' | 'removed' | 'moved', text: string): HTMLElement {
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
  const file = path.slice(path.lastIndexOf('/') + 1);
  return file.replace(/\.(md|markdown|mdown|mkd|mdx)$/i, '').replace(/[-_]+/g, ' ');
}

function textWithoutDeletions(el: HTMLElement): string {
  const clone = el.cloneNode(true) as HTMLElement;
  for (const del of clone.querySelectorAll('del')) del.remove();
  return clone.textContent!.trim();
}

const relative =
  typeof Intl !== 'undefined' && 'RelativeTimeFormat' in Intl ? new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'short' }) : null;

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
  return el.matches('.mr-tight') ? el.closest('li')! : el;
}

/** What a failed write says to the reviewer, with the platform's advice when it has some. */
function problem(err: unknown): string {
  return err instanceof ReaderError ? `${err.message} ${err.hint}`.trim() : err instanceof Error ? err.message : String(err);
}

/** Whether an editor holds something the reviewer wrote, beyond what it opened with. */
function hasDraft(editor: { textarea: HTMLTextAreaElement; prefill: string }): boolean {
  const text = editor.textarea.value.trim();
  return Boolean(text) && text !== editor.prefill.trim();
}

function sameTarget(a: CommentTarget, b: CommentTarget): boolean {
  return a.doc === b.doc && a.side === b.side && a.startLine === b.startLine && a.endLine === b.endLine && a.quote === b.quote;
}

/** "line 5", "old lines 30–34": where a comment lands, in the words of the document beside it. */
function placeName(side: 'base' | 'head', start: number, end: number): string {
  return `${side === 'base' ? 'old ' : ''}${start === end ? `line ${start}` : `lines ${start}–${end}`}`;
}

/** The block a comment on `line` belongs to, in whichever view of a code comment the reader shows. */
function blockAt(r: RenderedDoc, side: 'base' | 'head', line: number): RenderedBlock | undefined {
  return r.blocks.find((block) => {
    const unit = block[side];
    return unit && !block.el.closest('[data-mr-comment-view][hidden]') && line - 1 >= unit.lines[0] && line - 1 < Math.max(unit.lines[1], unit.lines[0] + 1);
  });
}

/** The enlarged diagram keeps this much space around it, and leaves room for the zoom bar along the bottom. */
const ZOOM_MARGIN = 32;
const ZOOM_BAR = 72;

const SUBMIT_KEY = `${typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'}↵`;

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
export function openReader(source: ReviewSource | Promise<ReviewSource>, options: { start?: number; onClose?: () => void } = {}): ReaderHandle {
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
  /** Folded as noise (a lockfile, generated code, a whitespace-only edit) until the reviewer opens it. */
  quiet?: QuietFile;
  open?: boolean;
}

interface Hit {
  view: View;
  block: RenderedBlock;
  side: 'base' | 'head';
  /** The element to target: the block, or one version of a diagram. */
  el: HTMLElement;
}

/** A text box inside a card, for a new comment or a reply. Each keeps its own draft and posting state. */
interface Editor {
  form: HTMLFormElement;
  textarea: HTMLTextAreaElement;
  status: HTMLElement;
  cancel: HTMLButtonElement;
  submit: HTMLButtonElement;
  /** False until a new comment knows where it will be posted. */
  ready: boolean;
  busy: boolean;
  /** Text the editor started with, such as a mention; it alone is not a draft. */
  prefill: string;
  send(): void;
}

/** A thread's reply box. It opens under the comment being answered. */
interface ReplyEditor extends Editor {
  thread: Thread;
  /** Index of the comment being answered. */
  to: number;
  context: HTMLElement;
}

/** A new comment, written where its thread will appear: beside its block, or below it on narrow screens. */
interface Draft extends Editor {
  target: CommentTarget;
  view: View;
  /** The block its thread will belong to. */
  anchor: HTMLElement;
  /** What stays marked while the comment is written: the selected words, or the blocks. */
  range?: Range;
  marks: HTMLElement[];
  plan: CommentPlan | null;
}

/** The right column holds review threads when its side of the page has room for them and a gap. */
const RAIL_SPACE = 296;
/** Vertical space between cards in the comments column. */
const CARD_GAP = 12;
/** On the way to the comment control, passing over other text keeps it; stopping on a block this long moves it. */
const AIM_DELAY = 280;
/** In the comments column, the text level with the pointer, or failing that the nearest text this close above or below. */
const LANE_OFFSETS = [0, 8, -8, 16, -16, 24, -24, 32, -32, 40, -40, 48, -48];

class Reader {
  private readonly host = document.createElement('div');
  private readonly shadow = this.host.attachShadow({ mode: 'open' });
  private readonly root: HTMLElement;
  private readonly el: Record<
    | 'progress'
    | 'topbar'
    | 'fileBtn'
    | 'fileName'
    | 'fileStatus'
    | 'viewed'
    | 'viewedFeedback'
    | 'fileCount'
    | 'files'
    | 'settings'
    | 'toc'
    | 'article'
    | 'gutter'
    | 'doc'
    | 'pill'
    | 'pillLabel'
    | 'chip'
    | 'toast'
    | 'empty'
    | 'lightbox',
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
  /** The pull or merge request's description, the first document when the reader asks for it. */
  private overview: HTMLElement | null = null;
  private lastStep: { el: HTMLElement; at: number } | null = null;
  private views: View[] = [];
  private readonly viewed = new Map<DocRef, { value: boolean; ready: boolean; busy: boolean; key?: string; error?: string }>();
  private drawerFocus: HTMLElement | null = null;
  private zoomFrom: HTMLElement | null = null;
  /** The enlarged diagram: its laid-out size, the scale that fits the window, and what is in view. */
  private readonly diagramView = { width: 0, height: 0, fit: 1, scale: 1, x: 0, y: 0 };
  /** Pointers on the enlarged diagram: one drags it, two pinch it. */
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private dragged = false;
  private readonly blockOf = new WeakMap<Element, { view: View; block: RenderedBlock }>();
  private hover: Hit | null = null;
  /** Where the pointer last was on the hovered block: the corner of the path to its comment control. */
  private aim: { x: number; y: number } | null = null;
  private aimTimer = 0;
  /** Text marked because the pointer is on its card or on the comment control. */
  private linked: HTMLElement | null = null;
  private readonly commentBtn = h('button', 'mr-comment-btn');
  private chipTarget: { target: CommentTarget; elements: HTMLElement[]; range?: Range } | null = null;
  private threads: Thread[] = [];
  private readonly ownThreads = new WeakSet<Thread>();
  private readonly threadByCard = new WeakMap<Element, Thread>();
  private readonly replyEditors = new Map<Thread, ReplyEditor>();
  private readonly editorOf = new WeakMap<Element, Editor>();
  private drafts: Draft[] = [];
  private readonly moves = new MoveFinder();
  /** The card the comments column is arranged around: the one being written in, or the last one used. */
  private active: HTMLElement | null = null;
  private threadEls: Array<{ view: View; card: HTMLElement; anchor: HTMLElement }> = [];
  private readonly rail = h('div', 'mr-threads');
  private toastTimer = 0;
  private editorCount = 0;
  private frame = 0;
  private needLayout = false;
  private closed = false;
  private readonly dark = matchMedia('(prefers-color-scheme: dark)');
  private readonly resize = new ResizeObserver(() => this.schedule(true));
  private readonly prevOverflow: string;
  private readonly prevFocus: Element | null;

  constructor(private readonly onClose?: () => void) {
    loadReaderFonts(document);
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
      chip: q('.mr-select-chip'),
      toast: q('.mr-toast'),
      empty: q('.mr-empty-reader'),
      lightbox: q('.mr-lightbox'),
    };
    this.commentBtn.type = 'button';
    this.commentBtn.dataset.act = 'comment-block';
    // biome-ignore lint/plugin: a bundled icon constant.
    this.commentBtn.innerHTML = icons.comment;
    this.commentBtn.append(h('span', 'mr-comment-btn-label', 'Comment'));
    this.commentBtn.hidden = true;
    this.rail.setAttribute('aria-label', 'Review comments');
    this.el.article.prepend(this.rail, this.commentBtn);
    q('.mr-tb-right').prepend(this.el.pill);
    this.root.addEventListener('mouseup', (e) => this.captureSelection(e));
    this.el.doc.addEventListener('pointerover', (e) => this.onHover(e.target as Element, e));
    this.el.doc.addEventListener('focusin', (e) => this.onHover(e.target as Element));
    this.root.addEventListener('pointermove', (e) => this.trackPointer(e), { passive: true });
    this.root.addEventListener('pointerleave', () => this.clearHover());
    this.root.addEventListener('pointerover', (e) => this.linkCard(e.target as Element));
    this.root.addEventListener('focusin', (e) => this.onFocusIn(e.target as Element));
    this.el.doc.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch') {
        // Shadow DOM retargets the event after dispatch; retain the actual paragraph for the deferred tap.
        const node = e.target as Element;
        setTimeout(() => this.onTap(e, node), 0);
      }
    });
    document.addEventListener('selectionchange', this.onSelectionChange);
    this.el.doc.replaceChildren(this.skeleton());

    this.prevOverflow = document.documentElement.style.overflow;
    this.prevFocus = document.activeElement;
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.append(this.host);
    this.root.focus({ preventScroll: true });

    this.root.addEventListener('click', (e) => this.onClick(e));
    const stage = this.stage();
    stage.addEventListener('wheel', this.onStageWheel, { passive: false });
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'] as const) stage.addEventListener(type, this.onStagePointer);
    // A drag that ends on the backdrop is not a click on it.
    stage.addEventListener(
      'click',
      (e) => {
        if (this.dragged) e.stopPropagation();
        this.dragged = false;
      },
      true,
    );
    stage.querySelector('img')!.addEventListener('dblclick', (e) => {
      const box = stage.getBoundingClientRect();
      this.zoomDiagram(2, e.clientX - box.left, e.clientY - box.top);
    });
    this.paletteTrack().addEventListener('scroll', () => this.updatePaletteNav(), { passive: true });
    this.shadow.querySelector<HTMLSelectElement>('#mr-typeface')!.addEventListener('change', (e) => {
      this.update({ font: (e.target as HTMLSelectElement).value as Settings['font'] });
    });
    this.root.addEventListener('galley:context', () => {
      if (this.rendered) this.buildToc(this.rendered);
      this.schedule(true);
    });
    this.root.addEventListener('galley:code-view', (event) => {
      const view = this.views.find((view) => view.rendered?.content === event.target);
      if (view?.rendered?.content.querySelector('.mr-source-comment')) this.reanchorCodeComments(view);
      this.schedule(true);
    });
    this.root.addEventListener(
      'scroll',
      () => {
        if (!this.el.chip.hidden && !this.chipTarget?.range) this.hideChip();
        this.schedule(false);
      },
      { passive: true },
    );
    for (const type of ['keydown', 'keyup', 'keypress']) window.addEventListener(type, this.shield, true);
    this.dark.addEventListener('change', this.onSchemeChange);
    this.resize.observe(this.root);
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
    this.shadow.querySelector<HTMLElement>('[data-act="code-files"]')!.title = `${source.codeDocs?.length ?? 0} supported code files`;
    const all = [...source.docs, ...(source.codeDocs ?? [])];
    if (!all.length) {
      this.showMessage('No readable changes here', 'This change set does not touch any supported document or text source files.');
      return;
    }
    this.index = Math.min(Math.max(start, 0), all.length - 1);
    this.views = all.map((doc, i) => {
      const section = h(
        'section',
        `mr-document${doc.status === 'removed' || doc.status === 'added' ? ` doc-${doc.status}` : ''}${doc.kind === 'code' ? ' is-code' : ''}`,
      );
      section.setAttribute('aria-label', doc.path);
      section.dataset.document = String(i);
      section.hidden = doc.kind === 'code' && !this.settings.codeFiles;
      section.append(this.skeleton());
      return { doc, section, rendered: null };
    });
    for (const doc of all) this.viewed.set(doc, { value: false, ready: false, busy: false });
    if (source.viewed) void this.initNativeViewed();
    this.overview = source.overview ? this.renderOverview(source.overview) : null;
    this.el.doc.replaceChildren(...(this.overview ? [this.overview] : []), ...this.views.map((view) => view.section));
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
    active = null;
    this.onClose?.();
  }

  showError(err: unknown): void {
    if (this.closed) return;
    const e = err instanceof ReaderError ? err : new ReaderError('Galley could not load this review.', err instanceof Error ? err.message : String(err));
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
    this.showMessage(e.message, e.hint, extra);
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
        const view = this.views[index];
        if (!view.section.hidden && !view.rendered && !view.quiet) await this.loadView(index);
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
      // Files most reviewers skip start folded, one click away. A file with a discussion on it never does.
      const quiet = view.open || this.threads.some((thread) => thread.doc === view.doc) ? null : quietFile(view.doc, contents);
      if (quiet) {
        view.quiet = quiet;
        view.section.classList.add('is-quiet');
        view.section.replaceChildren(this.quietCard(view, index));
        this.schedule(true);
        // Release the loading slot before progress storage resolves: a newly arrived discussion
        // may need to open this folded file immediately.
        if (!this.source!.viewed) void this.initLocalViewed(view.doc, contents);
        else this.updateViewed();
        return;
      }
      const r =
        view.doc.kind === 'code'
          ? renderCodeFile(document, view.doc, contents)
          : renderDocument(document, {
              path: view.doc.status === 'removed' ? view.doc.oldPath : view.doc.path,
              status: view.doc.status,
              ...contents,
              links: this.source!.links(view.doc),
              origin: location.origin,
              images: this.settings.images,
            });
      view.rendered = r;
      view.section.replaceChildren(this.buildArticle(view.doc, r));
      for (const block of r.blocks) this.blockOf.set(block.el, { view, block });
      if (r.isCode) await enhanceSpecs(r, view.doc, contents);
      if (this.closed) return;
      if (r.isCode) {
        this.applyCodeView(view);
        this.showMoves(view);
        void enhanceSymbols(r, view.doc, contents).then(() => this.schedule(true));
      }
      for (const img of r.content.querySelectorAll('img')) img.addEventListener('load', () => this.schedule(true), { once: true });
      this.attachThreads(view);
      filterDocument(r, this.settings.scope === 'changed');
      const drawDiagrams = () => renderDiagrams(r.diagrams, this.root.classList.contains('is-dark'), () => this.schedule(true), this.palette());
      drawDiagrams();
      void highlightCode(r.content).then(() => {
        if (
          r.isCode &&
          !this.closed &&
          renderSourceComments(r, {
            path: view.doc.status === 'removed' ? view.doc.oldPath : view.doc.path,
            status: view.doc.status,
            ...contents,
            links: this.source!.links(view.doc),
            origin: location.origin,
            images: this.settings.images,
          })
        ) {
          for (const block of r.blocks) this.blockOf.set(block.el, { view, block });
          // The notes start formatted; show them as the setting says.
          delete r.content.dataset.mrView;
          this.applyCodeView(view);
          drawDiagrams();
          void highlightCode(r.content).then(() => this.schedule(true));
        }
        this.schedule(true);
      });
      if (index === this.index) {
        this.rendered = r;
        this.buildToc(r);
      }
      this.schedule(true);
      if (!this.source!.viewed) await this.initLocalViewed(view.doc, contents);
      else this.updateViewed();
    } catch (err) {
      if (this.closed) return;
      const box = h('div', 'mr-message');
      box.append(h('h2', '', view.doc.path), h('p', '', err instanceof Error ? err.message : String(err)));
      const platform = h('a', 'mr-outline', 'Open platform diff');
      platform.href = this.source!.diffUrl;
      platform.target = '_blank';
      platform.rel = 'noopener noreferrer';
      box.append(platform);
      const retry = actionButton('Try again', 'retry-doc', 'mr-outline');
      retry.dataset.doc = String(index);
      box.append(retry);
      view.section.replaceChildren(box);
      this.schedule(true);
    } finally {
      this.loading.delete(view.doc);
    }
  }

  /** Code moved within or between source files reads as moved, not as removed here and added there. */
  private showMoves(view: View): void {
    const moves = this.moves.add(view.doc, view.rendered!);
    for (const move of moves) showMove(move);
    const touched = new Set(moves.flatMap((move) => [move.from.ref, move.to.ref]));
    for (const other of this.views) {
      if (!touched.has(other.doc)) continue;
      const moved = other.rendered!.blocks.filter((block) => 'mrMoved' in block.el.dataset).length;
      const byline = other.section.querySelector('.mr-byline')!;
      byline.querySelector('.is-moved')?.remove();
      byline.append(chip('moved', `${moved} moved`));
      refreshSymbols(other.rendered!);
    }
    this.schedule(true);
  }

  private quietCard(view: View, index: number): HTMLElement {
    const { doc, quiet } = view;
    const card = h('div', 'mr-quiet');
    const name = h('p', 'mr-quiet-name');
    const slash = doc.path.lastIndexOf('/');
    if (slash > 0) name.append(h('span', 'mr-code-dir', doc.path.slice(0, slash + 1)));
    name.append(doc.path.slice(slash + 1));
    const meta = h('p', 'mr-quiet-meta');
    meta.append(h('span', 'mr-quiet-label', quiet!.label), h('span', 'mr-quiet-reason', quiet!.reason));
    if (quiet!.added) meta.append(chip('added', `${quiet!.added.toLocaleString('en-US')} added`));
    if (quiet!.removed) meta.append(chip('removed', `${quiet!.removed.toLocaleString('en-US')} removed`));
    const show = actionButton('Show changes', 'show-quiet', 'mr-outline mr-quiet-show');
    show.dataset.doc = String(index);
    show.setAttribute('aria-label', `Show changes in ${doc.path}`);
    const text = h('div', 'mr-quiet-text');
    text.append(name, meta);
    card.append(text, show);
    return card;
  }

  private openQuiet(index: number): void {
    const view = this.views[index];
    view.open = true;
    view.section.classList.remove('is-quiet');
    view.section.replaceChildren(this.skeleton());
    void this.loadView(index);
  }

  private show(index: number): void {
    // Callers only offer visible documents: the menu, stepDoc and the starting index all skip hidden ones.
    const view = this.views[index];
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
    if (!r.blocks.some((block) => block.kind !== 'same'))
      frag.append(h('p', 'mr-empty-changes', 'No visible text changes. Choose Whole files in Reading settings → Review → Context to read this file.'));
    return frag;
  }

  private byline(doc: DocRef, r: RenderedDoc): HTMLElement {
    const line = h('div', 'mr-byline');
    line.append(
      h(
        'span',
        '',
        doc.kind === 'code' ? (languageName(languageOf(doc.path)) ?? 'Source file') : `${Math.max(1, Math.round(r.words / WORDS_PER_MINUTE))} min read`,
      ),
    );
    // A whole new or deleted file is said once, here, beside what kind of file it is.
    const noun = doc.kind === 'code' ? 'file' : 'document';
    if (doc.status === 'added') line.append(chip('added', `New ${noun}`));
    if (doc.status === 'removed') line.append(chip('removed', `Deleted ${noun}`), h('span', 'mr-byline-note', 'You are reading its last version'));
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
      load.title =
        'Images hosted outside this site were not loaded, so their hosts cannot see that you are reading. To load them automatically, choose Load in Reading settings → Review → External images.';
      line.append(load);
    }
    return line;
  }

  private buildToc(r: RenderedDoc): void {
    this.headings = [];
    const toc = this.el.toc;
    toc.replaceChildren();
    if (r.isCode) return;
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
    this.el.fileBtn.setAttribute('aria-label', `Browse files: ${STATUS_LABEL[doc.status].toLowerCase()} ${doc.path}, ${position + 1} of ${docs.length}`);
    this.el.fileStatus.className = `mr-status-dot is-${doc.status}`;
    this.el.fileName.textContent = baseName(doc.path);
    const menu = this.el.files;
    menu.replaceChildren();
    const head = h('div', 'mr-files-head');
    head.setAttribute('role', 'presentation');
    head.append(h('p', 'mr-files-title', this.source!.title));
    const meta = h('p', 'mr-files-meta');
    if (this.source!.subtitle) meta.append(h('span', 'mr-files-source', this.source!.subtitle));
    meta.append(h('span', 'mr-files-progress', `${docs.filter((doc) => this.viewed.get(doc)?.value).length} of ${docs.length} viewed`));
    const folded = this.views.filter((view) => !view.section.hidden && view.quiet && !view.open).length;
    if (folded) meta.append(h('span', 'mr-files-folded', `${folded} folded`));
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
      item.append(dot, name);
      const { quiet, open } = this.views[i];
      if (quiet && !open) item.append(h('span', 'mr-menu-quiet', quiet.label));
      item.append(h('span', 'mr-menu-status', STATUS_LABEL[d.status]));
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

  private showMessage(title: string, body: string, extra: Node[] = []): void {
    this.rendered = null;
    this.el.toc.replaceChildren();
    this.el.gutter.replaceChildren();
    this.el.pill.hidden = true;
    const box = h('div', 'mr-message');
    box.append(h('h2', '', title));
    if (body) box.append(h('p', '', body));
    box.append(...extra);
    const actions = h('div', 'mr-actions');
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
      // Wide screens align the name with the document, and the menu with the name.
      const start = this.root.clientWidth >= 1280 ? anchor.left : anchor.left + anchor.width / 2 - width / 2;
      menu.style.left = `${Math.max(12, Math.min(start, innerWidth - width - 12))}px`;
    }
    if (menu === this.el.settings && open) {
      this.drawerFocus = button;
      for (const el of this.root.querySelectorAll<HTMLElement>('.mr-topbar, .mr-main, .mr-toc')) el.inert = true;
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
      for (const el of this.root.querySelectorAll<HTMLElement>('.mr-topbar, .mr-main, .mr-toc')) el.inert = false;
      this.root.classList.remove('settings-open');
      this.drawerFocus?.focus({ preventScroll: true });
      this.drawerFocus = null;
    }
    return wasOpen;
  }

  private selectSettingsTab(name: SettingsTab, focus = false): void {
    for (const tab of this.el.settings.querySelectorAll<HTMLElement>('[data-settings-tab]')) {
      const active = tab.dataset.settingsTab === name;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      this.shadow.querySelector<HTMLElement>(`#${tab.getAttribute('aria-controls')}`)!.hidden = !active;
      if (active && focus) tab.focus({ preventScroll: true });
    }
    this.el.settings.querySelector<HTMLElement>('.mr-settings-body')!.scrollTop = 0;
  }

  // Viewed status is optional; failures never remove the document or imply a successful save.
  private async initLocalViewed(doc: DocRef, contents: DocContents): Promise<void> {
    const state = this.viewed.get(doc)!;
    state.busy = true;
    state.error = undefined;
    this.updateViewed();
    try {
      state.key = await viewedKey(this.source!.diffUrl, doc, contents);
      state.value = await loadViewed(state.key);
      state.ready = true;
    } catch (err) {
      state.error = err instanceof Error ? err.message : String(err);
    } finally {
      state.busy = false;
      if (!this.closed) this.updateViewed();
    }
  }

  /** Busy documents ignore the Viewed control, so only one load is ever in flight. */
  private async initNativeViewed(): Promise<void> {
    for (const state of this.viewed.values()) state.busy = true;
    this.updateViewed();
    try {
      const paths = await this.source!.viewed!.load();
      for (const [doc, state] of this.viewed) {
        state.value = paths.includes(doc.path);
        state.ready = true;
        state.error = undefined;
      }
    } catch (err) {
      for (const state of this.viewed.values()) state.error = err instanceof Error ? err.message : String(err);
    } finally {
      for (const state of this.viewed.values()) state.busy = false;
      if (!this.closed) this.updateViewed();
    }
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
    button.disabled = !(view.rendered || view.quiet) || state.busy || (!state.ready && !state.error);
    button.setAttribute('aria-pressed', String(state.value));
    button.setAttribute('aria-label', `${state.value ? 'Unmark' : 'Mark'} ${view.doc.path} as viewed`);
    const label = state.busy
      ? state.ready
        ? 'Saving…'
        : 'Loading…'
      : !state.ready && state.error
        ? 'Retry loading viewed state'
        : state.value
          ? 'Viewed (V to unmark)'
          : 'Mark as viewed (V)';
    button.title = `${label}\n${state.error ?? this.source!.viewed?.label ?? 'Saved in this browser; resets when this file changes'}`;
    button.classList.toggle('is-busy', state.busy);
    button.classList.toggle('is-error', Boolean(state.error));
    this.el.viewedFeedback.hidden = !state.error;
    this.el.viewedFeedback.textContent = state.error ?? '';
  }

  private async toggleViewed(index: number): Promise<void> {
    const view = this.views[index];
    const state = this.viewed.get(view.doc)!;
    if (state.busy) return;
    if (!state.ready) {
      if (this.source!.viewed) await this.initNativeViewed();
      else await this.initLocalViewed(view.doc, await this.load(view.doc));
      return;
    }
    const value = !state.value;
    state.busy = true;
    state.error = undefined;
    this.updateViewed();
    try {
      if (this.source!.viewed) await this.source!.viewed.set(view.doc, value);
      else await saveViewed(state.key!, value);
      state.value = value;
    } catch (err) {
      state.error = err instanceof Error ? err.message : String(err);
    } finally {
      state.busy = false;
      if (!this.closed) this.updateViewed();
    }
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
    const overviewToggle = this.shadow.querySelector<HTMLElement>('[data-act="overview"]')!;
    overviewToggle.setAttribute('aria-checked', String(s.overview));
    overviewToggle.closest<HTMLElement>('.mr-set-row')!.hidden = Boolean(this.source) && !this.source?.overview;
    if (this.overview) this.overview.hidden = !s.overview;
    this.shadow.querySelector('[data-act="signs"]')!.setAttribute('aria-checked', String(s.signs));
    r.classList.toggle('no-signs', !s.signs);
    const codeToggle = this.shadow.querySelector<HTMLElement>('[data-act="code-files"]')!;
    codeToggle.setAttribute('aria-checked', String(s.codeFiles));
    codeToggle.title = `${this.source?.codeDocs?.length ?? 0} supported code files`;
    let loadCode = false;
    for (const view of this.views)
      if (view.doc.kind === 'code') {
        view.section.hidden = !s.codeFiles;
        loadCode ||= s.codeFiles && !view.rendered;
      }
    if (this.source) {
      this.updateFileButton();
      if (this.rendered) this.buildToc(this.rendered);
      else this.el.toc.replaceChildren();
    }
    if (loadCode) void this.loadAll(0);
    for (const b of this.shadow.querySelectorAll<HTMLElement>('[data-scope]')) b.setAttribute('aria-pressed', String(b.dataset.scope === s.scope));
    r.classList.toggle('mode-changes', s.mode === 'changes');
    r.classList.toggle('mode-clean', s.mode === 'clean');
    r.dataset.font = s.font;
    r.dataset.theme = s.theme;
    r.dataset.comments = s.comments;
    r.dataset.layout = s.layout;
    r.dataset.density = s.density;
    r.classList.toggle('is-dark', s.appearance === 'dark' || (s.appearance === 'auto' && this.dark.matches));
    this.applyFit();
    this.shadow.querySelector<HTMLSelectElement>('#mr-typeface')!.value = s.font;
    this.shadow.querySelector<HTMLOutputElement>('.mr-text-size')!.textContent = `${TEXT_SIZES[s.size] ?? 20} px`;
    (this.shadow.querySelector('[data-act="smaller"]') as HTMLButtonElement).disabled = s.size <= 0;
    (this.shadow.querySelector('[data-act="larger"]') as HTMLButtonElement).disabled = s.size >= TEXT_SIZES.length - 1;
    for (const b of this.shadow.querySelectorAll<HTMLElement>('[data-mode]')) b.setAttribute('aria-pressed', String(b.dataset.mode === s.mode));
    for (const group of this.shadow.querySelectorAll<HTMLElement>('[data-setting]')) {
      const value = s[group.dataset.setting as SettingKey];
      for (const b of group.querySelectorAll<HTMLElement>('[data-value]')) b.setAttribute('aria-pressed', String(b.dataset.value === value));
    }
    for (const view of this.views) if (view.rendered?.isCode) this.applyCodeView(view);
    const palette = this.palette();
    for (const view of this.views)
      if (view.rendered) renderDiagrams(view.rendered.diagrams, r.classList.contains('is-dark'), () => this.schedule(true), palette);
    this.schedule(true);
  }

  /** Test files and code comments as Reading settings → Review asks: a test plan and notes, or the source. */
  private applyCodeView(view: View): void {
    const r = view.rendered!;
    for (const button of r.content.querySelectorAll<HTMLElement>('.mr-spec-view-options [data-value]'))
      button.setAttribute('aria-pressed', String(button.dataset.value === this.settings.tests));
    const tests = r.content.classList.contains('mr-spec-file') && this.settings.tests === 'source';
    const comments = tests || this.settings.codeComments === 'source';
    const state = `${tests} ${comments}`;
    if (r.content.dataset.mrView === state) return;
    r.content.dataset.mrView = state;
    r.content.classList.toggle('is-spec-source', tests);
    showCommentSource(r, comments);
  }

  /**
   * Text size for the whole reading surface, and for Fit to screen the scale of the whole composition:
   * the balanced layout as drawn for a 1440px window, grown with wider windows up to one and a half times.
   */
  private applyFit(): void {
    const { layout, size } = this.settings;
    const fit = layout === 'fit' ? Math.round(Math.min(1.5, Math.max(1, this.root.clientWidth / 1440)) * 100) / 100 : 1;
    const text = TEXT_SIZES[size] ?? 20;
    this.root.style.setProperty('--fit', String(fit));
    // The chosen size against the default: titles, bylines, contents and comments grow with the text.
    this.root.style.setProperty('--text-scale', String(Math.round((text / TEXT_SIZES[DEFAULT_SETTINGS.size]) * 1000) / 1000));
    this.root.style.setProperty('--body-size', `${Math.round(text * fit * 10) / 10}px`);
  }

  private readonly onSchemeChange = () => this.applySettings();

  /** The reading palette as plain colours, so diagrams are drawn in the page's own style. */
  private palette(): DiagramPalette | undefined {
    const style = getComputedStyle(this.root);
    const palette = Object.fromEntries(PALETTE_KEYS.map((key) => [key, style.getPropertyValue(key === 'code' ? '--code-bg' : `--${key}`).trim()]));
    return isPalette(palette) ? palette : undefined;
  }

  /**
   * A diagram over the whole window: first all of it, as large as the window allows (up to twice the
   * size it was laid out at), then as close as the reader wants to look.
   */
  private openLightbox(button: HTMLElement): void {
    const source = button.querySelector('img');
    if (!source) return;
    const image = this.el.lightbox.querySelector('img')!;
    image.src = source.src;
    image.alt = source.alt;
    this.diagramView.width = source.width || source.naturalWidth || 600;
    this.diagramView.height = source.height || source.naturalHeight || 400;
    this.el.lightbox.hidden = false;
    this.zoomFrom = button;
    this.fitDiagram();
    this.el.lightbox.querySelector<HTMLElement>('.mr-lightbox-close')!.focus({ preventScroll: true });
  }

  private stage(): HTMLElement {
    return this.el.lightbox.querySelector<HTMLElement>('.mr-lightbox-stage')!;
  }

  /** The space the diagram can use: the stage, less a margin and the zoom bar along its bottom. */
  private stageRoom(): { width: number; height: number } {
    const stage = this.stage();
    return { width: stage.clientWidth, height: stage.clientHeight - ZOOM_BAR };
  }

  /** Smallest and largest scale: never smaller than the whole diagram in view, and up to four times its size. */
  private zoomLimits(): [number, number] {
    const fit = this.diagramView.fit;
    return [Math.min(fit, 1), Math.max(4, fit * 2)];
  }

  private fitDiagram(): void {
    const view = this.diagramView;
    const room = this.stageRoom();
    view.fit = Math.min((room.width - 2 * ZOOM_MARGIN) / view.width, (room.height - 2 * ZOOM_MARGIN) / view.height, 2);
    this.showDiagram(view.fit, 0, 0);
  }

  /** Draw the diagram at `scale` with its corner at (x, y): centred on an axis where it fits, kept in reach where it does not. */
  private showDiagram(scale: number, x: number, y: number): void {
    const view = this.diagramView;
    const room = this.stageRoom();
    const width = view.width * scale,
      height = view.height * scale;
    const place = (offset: number, size: number, space: number) =>
      size + 2 * ZOOM_MARGIN <= space ? (space - size) / 2 : Math.min(ZOOM_MARGIN, Math.max(space - size - ZOOM_MARGIN, offset));
    Object.assign(view, { scale, x: place(x, width, room.width), y: place(y, height, room.height) });
    // Sizing the image, not scaling it, keeps the drawing sharp at every zoom.
    const image = this.el.lightbox.querySelector('img')!;
    image.style.width = `${Math.round(width)}px`;
    image.style.height = `${Math.round(height)}px`;
    image.style.transform = `translate(${Math.round(view.x)}px, ${Math.round(view.y)}px)`;
    const [min, max] = this.zoomLimits();
    this.el.lightbox.querySelector('.mr-zoom-level')!.textContent = `${Math.round(scale * 100)}%`;
    this.el.lightbox.querySelector<HTMLButtonElement>('[data-act="zoom-out"]')!.disabled = scale <= min + 0.001;
    this.el.lightbox.querySelector<HTMLButtonElement>('[data-act="zoom-in"]')!.disabled = scale >= max - 0.001;
    this.stage().classList.toggle('is-movable', width + 2 * ZOOM_MARGIN > room.width || height + 2 * ZOOM_MARGIN > room.height);
  }

  /** Zoom by `factor`, keeping the point under (px, py) in place: the pointer, or the middle of the stage. */
  private zoomDiagram(factor: number, px = this.stageRoom().width / 2, py = this.stageRoom().height / 2): void {
    const view = this.diagramView;
    const [min, max] = this.zoomLimits();
    const scale = Math.min(max, Math.max(min, view.scale * factor));
    const k = scale / view.scale;
    this.showDiagram(scale, px - (px - view.x) * k, py - (py - view.y) * k);
  }

  private moveDiagram(dx: number, dy: number): void {
    const view = this.diagramView;
    this.showDiagram(view.scale, view.x + dx, view.y + dy);
  }

  /** Wheel and trackpad: scrolling moves the diagram; pinching (or ⌘/Ctrl + scroll) zooms where the pointer is. */
  private readonly onStageWheel = (e: WheelEvent) => {
    e.preventDefault();
    const box = this.stage().getBoundingClientRect();
    if (e.ctrlKey || e.metaKey) this.zoomDiagram(Math.exp(-e.deltaY / 100), e.clientX - box.left, e.clientY - box.top);
    else this.moveDiagram(-e.deltaX, -e.deltaY);
  };

  private readonly onStagePointer = (e: PointerEvent) => {
    const stage = this.stage();
    if (e.type === 'pointerdown') {
      stage.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.dragged = false;
      return;
    }
    if (e.type !== 'pointermove') {
      this.pointers.delete(e.pointerId);
      stage.classList.remove('is-dragging');
      return;
    }
    const last = this.pointers.get(e.pointerId);
    if (!last) return;
    const next = { x: e.clientX, y: e.clientY };
    const other = [...this.pointers].find(([id]) => id !== e.pointerId)?.[1];
    if (other) {
      // Two fingers: zoom by how far they moved apart, around the point between them.
      const box = stage.getBoundingClientRect();
      const before = Math.max(1, Math.hypot(last.x - other.x, last.y - other.y));
      this.zoomDiagram(Math.hypot(next.x - other.x, next.y - other.y) / before, (next.x + other.x) / 2 - box.left, (next.y + other.y) / 2 - box.top);
    } else this.moveDiagram(next.x - last.x, next.y - last.y);
    // A press that moved is a drag, not a click on the backdrop.
    if (Math.abs(next.x - last.x) + Math.abs(next.y - last.y) > 2) {
      this.dragged = true;
      stage.classList.add('is-dragging');
    }
    this.pointers.set(e.pointerId, next);
  };

  private closeLightbox(): boolean {
    if (this.el.lightbox.hidden) return false;
    this.el.lightbox.hidden = true;
    this.pointers.clear();
    this.el.lightbox.querySelector('img')!.removeAttribute('src');
    this.zoomFrom?.focus({ preventScroll: true });
    this.zoomFrom = null;
    return true;
  }

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
    const target = this.nextOf(this.visibleChanges(), direction);
    if (target) this.scrollToEl(target);
  }

  /** Conversations in reading order, by the text they discuss. */
  private visibleThreads(): Array<{ anchor: HTMLElement; card: HTMLElement }> {
    return this.threadEls
      .filter(({ card, anchor }) => !card.hidden && anchor.getClientRects().length > 0)
      .map(({ card, anchor }) => ({ card, anchor, top: anchor.getBoundingClientRect().top }))
      .sort((a, b) => a.top - b.top)
      .map(({ card, anchor }) => ({ card, anchor }));
  }

  /** N and P: bring the next or previous conversation level with the focus line, and point it out. */
  private stepThread(direction: 1 | -1): void {
    const threads = this.visibleThreads();
    if (!threads.length) {
      this.toast('No conversations in this review yet');
      return;
    }
    // Several conversations can share one paragraph, so the list holds cards, positioned by their text.
    const cards = threads.map((thread) => thread.card);
    const tops = new Map(threads.map((thread) => [thread.card, thread.anchor.getBoundingClientRect().top]));
    const card = this.nextOf(cards, direction, (el) => tops.get(el)!);
    if (!card) {
      this.toast(direction === 1 ? 'No more conversations below' : 'No more conversations above');
      return;
    }
    this.scrollToEl(threads.find((thread) => thread.card === card)!.anchor, FOCUS_LINE, false);
    card.classList.remove('mr-flash');
    void card.offsetWidth;
    card.classList.add('mr-flash');
    setTimeout(() => card.classList.remove('mr-flash'), 1700);
  }

  /** The next element in reading order after the focus line, or the one before it. */
  private nextOf(list: HTMLElement[], direction: 1 | -1, topOf = (el: HTMLElement) => el.getBoundingClientRect().top): HTMLElement | undefined {
    if (!list.length) return undefined;
    let index: number;
    const recent = this.lastStep && performance.now() - this.lastStep.at < 900 ? list.indexOf(this.lastStep.el) : -1;
    if (recent !== -1) {
      // Pressed again while still scrolling: continue from the last target, not from mid-scroll positions.
      index = recent + direction;
    } else {
      const line = this.root.clientHeight * FOCUS_LINE;
      const tops = list.map(topOf);
      index = direction === 1 ? tops.findIndex((t) => t > line + 8) : tops.findLastIndex((t) => t < line - 8);
    }
    const target = list[index];
    if (target) this.lastStep = { el: target, at: performance.now() };
    return target;
  }

  /** The settings sheet, open at one of its tabs. */
  private openSettings(tab: SettingsTab): void {
    this.selectSettingsTab(tab);
    // Shortcuts are ignored while the sheet is open, so it is always closed here.
    this.toggleMenu(this.el.settings, this.shadow.querySelector<HTMLElement>('[data-act="settings"]'));
    this.revealPalette();
  }

  /** A first document of the request's own title, author and description, folded under its title on demand. */
  private renderOverview(overview: ReviewOverview): HTMLElement {
    const section = h('section', 'mr-document mr-overview');
    section.setAttribute('aria-label', `${overview.kind} description`);
    section.hidden = !this.settings.overview;
    const byline = h('div', 'mr-byline');
    if (overview.author) byline.append(h('span', 'mr-overview-author', `Opened by ${overview.author}`));
    const href = platformLink(overview.url, location.origin);
    if (href) {
      const link = h('a', 'mr-overview-link', `Open on ${new URL(href, location.href).host}`);
      link.href = href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      byline.append(link);
    }
    const body = h('details', 'mr-overview-body');
    body.open = true;
    const content = h('div', 'mr-content');
    if (overview.description.trim()) content.append(renderSnippet(document, overview.description, location.origin, this.settings.images));
    else content.append(h('p', 'mr-overview-empty', 'No description was added to this request.'));
    body.append(h('summary', '', 'Description'), content);
    section.append(h('p', 'mr-overview-kind', overview.kind), h('h1', 'mr-title', overview.title), byline, body);
    return section;
  }

  private paletteTrack(): HTMLElement {
    return this.shadow.querySelector<HTMLElement>('.mr-palette-track')!;
  }

  /** The palette page in view; pages are as wide as the track. */
  private paletteAt(): number {
    const track = this.paletteTrack();
    return track.clientWidth ? Math.round(track.scrollLeft / track.clientWidth) : 0;
  }

  private turnPalettes(page: number, smooth = true): void {
    const track = this.paletteTrack();
    const target = Math.max(0, Math.min(track.children.length - 1, page));
    track.scrollTo({ left: target * track.clientWidth, behavior: smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto' });
    this.updatePaletteNav(target);
  }

  private updatePaletteNav(page = this.paletteAt()): void {
    const last = this.paletteTrack().children.length - 1;
    this.shadow.querySelector<HTMLButtonElement>('[data-act="palette-prev"]')!.disabled = page <= 0;
    this.shadow.querySelector<HTMLButtonElement>('[data-act="palette-next"]')!.disabled = page >= last;
    for (const [i, dot] of this.shadow.querySelectorAll<HTMLElement>('.mr-carousel-dot').entries()) dot.setAttribute('aria-current', String(i === page));
  }

  /** The settings open on the page that holds the chosen palette. */
  private revealPalette(): void {
    const track = this.paletteTrack();
    const page = track.querySelector(`[data-value="${this.settings.theme}"]`)?.closest('.mr-palette-page');
    this.turnPalettes([...track.children].indexOf(page!), false);
  }

  private stepDoc(direction: 1 | -1): void {
    const indices = this.views.flatMap((view, i) => (view.section.hidden ? [] : [i]));
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
      if (this.closeLightbox() || this.closeMenus()) return;
      // A draft is only ever discarded with Cancel. Esc leaves an editor, and closes it when it is empty.
      const editor = this.editorAt(this.shadow.activeElement);
      if (editor) {
        if (editor.busy) return;
        if (!hasDraft(editor)) {
          if ('thread' in editor) this.closeReply((editor as ReplyEditor).thread);
          else this.closeDraft(editor as Draft);
          return;
        }
        editor.status.textContent = 'Draft kept. Cancel discards it.';
        this.root.focus({ preventScroll: true });
        return;
      }
      if (!this.el.chip.hidden) {
        this.hideChip();
        return;
      }
      const unsent = [...this.drafts, ...this.replyEditors.values()].find((item) => hasDraft(item) && item.form.isConnected && !item.form.closest('[hidden]'));
      if (unsent) {
        this.toast('You have an unsent comment. Post it, or choose Cancel to discard it.');
        this.focusEditor(unsent);
        return;
      }
      this.close();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      const editor = this.editorAt(e.composedPath()[0]);
      if (editor) {
        e.preventDefault();
        editor.send();
        return;
      }
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.composedPath()[0];
    if (target instanceof HTMLElement && target.matches('[data-settings-tab]') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      const at = SETTINGS_TABS.indexOf(target.dataset.settingsTab as SettingsTab);
      const step = e.key === 'ArrowRight' ? 1 : -1;
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? SETTINGS_TABS.length - 1 : (at + step + SETTINGS_TABS.length) % SETTINGS_TABS.length;
      this.selectSettingsTab(SETTINGS_TABS[next], true);
      return;
    }
    if (e.key === 'Tab') {
      const focusRoot = !this.el.lightbox.hidden ? this.el.lightbox : this.el.settings.hidden ? this.root : this.el.settings;
      const controls = [...focusRoot.querySelectorAll<HTMLElement>('button, a[href], input, textarea, select, summary, [tabindex="0"]')].filter(
        (el) => el.getClientRects().length && !el.matches(':disabled, [tabindex="-1"]'),
      );
      const index = controls.indexOf(this.shadow.activeElement as HTMLElement);
      const next = e.shiftKey ? (index <= 0 ? controls.length - 1 : index - 1) : (index + 1) % controls.length;
      controls[next]?.focus();
      e.preventDefault();
      return;
    }
    if (!this.el.lightbox.hidden) {
      const step = 80;
      const keys: Record<string, () => void> = {
        '+': () => this.zoomDiagram(1.25),
        '=': () => this.zoomDiagram(1.25),
        '-': () => this.zoomDiagram(0.8),
        '0': () => this.fitDiagram(),
        ArrowLeft: () => this.moveDiagram(step, 0),
        ArrowRight: () => this.moveDiagram(-step, 0),
        ArrowUp: () => this.moveDiagram(0, step),
        ArrowDown: () => this.moveDiagram(0, -step),
      };
      if (keys[e.key]) {
        e.preventDefault();
        keys[e.key]();
      }
      return;
    }
    if (!this.el.settings.hidden) return;
    if (target instanceof HTMLElement && target.matches('input, textarea, select, [contenteditable]')) return;
    switch (e.key) {
      case 'j':
        this.step(1);
        break;
      case 'k':
        this.step(-1);
        break;
      case 'n':
        this.stepThread(1);
        break;
      case 'p':
        this.stepThread(-1);
        break;
      case 'f': {
        const button = this.shadow.querySelector<HTMLElement>('[data-act="files"]');
        if (button && !button.hidden && this.views.some((view) => !view.section.hidden)) this.toggleMenu(this.el.files, button);
        break;
      }
      case 'a':
        this.update({ scope: this.settings.scope === 'changed' ? 'all' : 'changed' });
        this.toast(this.settings.scope === 'all' ? 'Whole files' : 'Changed parts');
        break;
      case 'l': {
        const layout = LAYOUTS[(LAYOUTS.indexOf(this.settings.layout) + 1) % LAYOUTS.length];
        this.update({ layout });
        this.toast(`Layout: ${LAYOUT_NAMES[layout]}`);
        break;
      }
      case 'd':
        this.update({ density: this.settings.density === 'compact' ? 'comfortable' : 'compact' });
        this.toast(this.settings.density === 'compact' ? 'Compact' : 'Comfortable');
        break;
      case '0':
        this.update({ size: DEFAULT_SETTINGS.size });
        break;
      case ',':
        this.openSettings('reading');
        break;
      case '?':
        this.openSettings('keys');
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
        this.commentHere();
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

    const settingsTab = target.closest<HTMLElement>('[data-settings-tab]');
    if (settingsTab) {
      this.selectSettingsTab(settingsTab.dataset.settingsTab as SettingsTab);
      return;
    }

    const anchor = target.closest<HTMLAnchorElement>('.mr-content a[href^="#"]');
    if (anchor) {
      e.preventDefault();
      const id = decodeURIComponent(anchor.getAttribute('href')!.slice(1));
      const content = anchor.closest('.mr-content');
      const dest = id ? [...content!.querySelectorAll('[id]')].find((el) => el.id === id || el.id === `user-content-${id}`) : undefined;
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
      const key = setting.closest<HTMLElement>('[data-setting]')!.dataset.setting as SettingKey;
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
        if (this.source && !this.views.some((view) => !view.section.hidden)) this.selectSettingsTab('review');
        this.toggleMenu(this.el.settings, action);
        if (!this.el.settings.hidden) this.revealPalette();
        return;
      case 'palette-prev':
        this.turnPalettes(this.paletteAt() - 1);
        return;
      case 'palette-next':
        this.turnPalettes(this.paletteAt() + 1);
        return;
      case 'palette-page':
        this.turnPalettes(Number(action.dataset.page));
        return;
      case 'overview':
        if (!this.source?.overview) return;
        this.update({ overview: !this.settings.overview });
        if (this.settings.overview) this.root.scrollTo({ top: 0 });
        return;
      case 'code-files':
        if (!this.settings.codeFiles && !this.source?.codeDocs?.length) return;
        this.update({ codeFiles: !this.settings.codeFiles });
        return;
      case 'signs':
        this.update({ signs: !this.settings.signs });
        return;
      case 'zoom-diagram':
        this.openLightbox(action);
        return;
      case 'close-lightbox':
        this.closeLightbox();
        return;
      case 'zoom-in':
        this.zoomDiagram(1.25);
        return;
      case 'zoom-out':
        this.zoomDiagram(0.8);
        return;
      case 'zoom-fit':
        this.fitDiagram();
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
      case 'show-quiet':
        this.openQuiet(Number(action.dataset.doc));
        return;
      case 'comment-block':
        this.commentOn(this.hover!);
        return;
      case 'comment-selection':
        this.startComment(this.chipTarget!.target, this.chipTarget!.elements, this.chipTarget!.range);
        return;
      case 'reply-to': {
        this.openReply(this.threadByCard.get(action.closest('.mr-thread')!)!, Number(action.dataset.comment));
        return;
      }
      case 'load-image': {
        this.loadImages(action.closest('.mr-img-hold')!.parentElement!);
        return;
      }
      case 'load-images':
        this.loadImages(action.closest('.mr-document')!);
        return;
      case 'toggle-thread': {
        const card = action.closest('.mr-thread')!;
        card.classList.toggle('is-expanded');
        action.textContent = card.classList.contains('is-expanded') ? 'Show fewer replies' : action.dataset.label!;
        this.schedule(true);
        return;
      }
      case 'heading': {
        e.preventDefault();
        this.scrollToEl(this.headings[Number(action.dataset.i)].el, 0.12, false);
        return;
      }
      case 'mark': {
        this.scrollToEl(this.markTargets[Number(action.dataset.i)]);
        return;
      }
    }
  }

  // ---------------------------------------------------------------- comments
  //
  // A comment starts from the text: select some words, point at a block and choose the control beside
  // it, tap a paragraph on a touch screen, or press R. Its editor opens where the thread will appear,
  // in the comments column or below the block on narrow screens, and keeps its draft until it is
  // posted or cancelled. Replies are written inside their thread.

  private hitFor(view: View, block: RenderedBlock, el?: Element): Hit {
    const version = el?.closest<HTMLElement>('.mr-diagram-version') ?? null;
    const old = el?.closest('.mr-ghost-row, [data-mr-side="base"]');
    return { view, block, side: old || !block.head ? 'base' : 'head', el: version ?? block.el };
  }

  /** The innermost rendered block containing `node`. */
  private blockAt(node: Element): Hit | null {
    for (let el: Element | null = node; el && !el.matches('.mr-document'); el = el.parentElement) {
      if (el.matches('.mr-thread, .mr-composer')) return null;
      const entry = this.blockOf.get(el);
      if (entry) return this.hitFor(entry.view, entry.block, node);
    }
    return null;
  }

  private onHover(node: Element, e?: Event): void {
    const hit = this.blockAt(node);
    if (!hit || (hit.el === this.hover?.el && hit.side === this.hover.side)) return;
    // On the way to the comment control, trackPointer decides whether this block takes it.
    if (e instanceof MouseEvent && this.aiming(e.clientX, e.clientY)) return;
    this.hoverBlock(hit, e);
  }

  private hoverBlock(hit: Hit, e?: Event): void {
    clearTimeout(this.aimTimer);
    if (this.hover) surfaceOf(this.hover.el).classList.remove('mr-hovered');
    this.hover = hit;
    this.aim = e instanceof MouseEvent ? { x: e.clientX, y: e.clientY } : null;
    surfaceOf(hit.el).classList.toggle('mr-hovered', hit.view.doc.kind === 'code');
    this.placeCommentButton();
    this.heatMark(hit.el);
  }

  /**
   * Heading for the comment control: inside the triangle from the last point on the hovered block to the
   * control's near edge, or level with the control past that edge. Menus use the same rule for submenus.
   */
  private aiming(x: number, y: number): boolean {
    if (!this.aim || this.commentBtn.hidden) return false;
    const box = this.commentBtn.getBoundingClientRect();
    const edge = box.left >= this.aim.x ? box.left : box.right;
    const progress = (x - this.aim.x) / (edge - this.aim.x);
    if (!(progress > 0)) return false;
    if (progress >= 1) return y >= box.top - 8 && y <= box.bottom + 8;
    const top = this.aim.y + (box.top - 8 - this.aim.y) * progress;
    const bottom = this.aim.y + (box.bottom + 8 - this.aim.y) * progress;
    return y >= Math.min(top, bottom) && y <= Math.max(top, bottom);
  }

  /** The change marker beside the text being pointed at comes to full strength. */
  private heatMark(block: HTMLElement | null): void {
    const origin = this.el.article.getBoundingClientRect().top;
    const box = block ? surfaceOf(block).getBoundingClientRect() : null;
    for (const mark of this.el.gutter.children as HTMLCollectionOf<HTMLElement>) {
      const top = parseFloat(mark.style.top),
        bottom = top + parseFloat(mark.style.height);
      mark.classList.toggle('is-hot', Boolean(box && box.top - origin < bottom && box.bottom - origin > top));
    }
  }

  /** The control stays while the pointer crosses the margin towards it, and goes anywhere else. */
  private trackPointer(e: PointerEvent): void {
    const node = e.composedPath()[0];
    if (e.pointerType === 'touch' || !(node instanceof Element)) return;
    if (node.closest('.mr-comment-btn')) {
      clearTimeout(this.aimTimer);
      return;
    }
    const over = this.blockAt(node);
    if (this.hover && over?.el === this.hover.el) {
      clearTimeout(this.aimTimer);
      this.aim = { x: e.clientX, y: e.clientY };
      return;
    }
    if (this.aiming(e.clientX, e.clientY)) {
      clearTimeout(this.aimTimer);
      if (over) this.aimTimer = window.setTimeout(() => this.hoverBlock(over), AIM_DELAY);
      return;
    }
    // On wide screens the comments column is a lane: pointing into it, level with any text, offers to
    // comment on that text. Between blocks the nearest text takes it; far from any, the control stays.
    const article = this.el.article.getBoundingClientRect();
    if (
      this.root.classList.contains('has-rail') &&
      e.clientX >= article.right &&
      !node.closest('.mr-thread, .mr-composer, .mr-topbar, .mr-settings, .mr-menu')
    ) {
      let hit: Hit | null = null;
      for (const offset of LANE_OFFSETS) {
        const probe = this.shadow.elementFromPoint((article.left + article.right) / 2, e.clientY + offset);
        hit = probe && this.blockAt(probe);
        if (hit) break;
      }
      if (hit && hit.el !== this.hover?.el) this.hoverBlock(hit, e);
      return;
    }
    if (!this.hover) return;
    const block = surfaceOf(this.hover.el).getBoundingClientRect();
    const control = this.commentBtn.hidden ? block : this.commentBtn.getBoundingClientRect();
    const reach = this.commentBtn.hidden ? article.right : control.right;
    // A one-line target can be shorter than its comment control. Include both in the bridge so the
    // control and the target highlight survive a diagonal move into the input invitation.
    const across =
      e.clientY >= Math.min(block.top, control.top) - 8 &&
      e.clientY <= Math.max(block.bottom, control.bottom) + 8 &&
      e.clientX >= block.left - 8 &&
      e.clientX <= reach + 8;
    if (!across || node.closest('.mr-thread, .mr-composer, .mr-topbar')) this.clearHover();
  }

  private clearHover(): void {
    clearTimeout(this.aimTimer);
    if (!this.hover) return;
    surfaceOf(this.hover.el).classList.remove('mr-hovered');
    this.hover = null;
    this.commentBtn.hidden = true;
    this.heatMark(null);
  }

  /** Pointing at a card, or at the comment control, marks the text it belongs to. */
  private linkCard(node: Element): void {
    const card = node.closest<HTMLElement>('.mr-thread, .mr-composer, .mr-comment-btn');
    const anchor = card === this.commentBtn ? this.hover?.el : card ? this.anchorOf(card) : undefined;
    const el = anchor ? surfaceOf(anchor) : null;
    if (el === this.linked) return;
    this.linked?.classList.remove('mr-linked');
    el?.classList.add('mr-linked');
    this.linked = el;
  }

  private anchorOf(card: Element): HTMLElement | undefined {
    return this.threadEls.find((entry) => entry.card === card)?.anchor ?? this.drafts.find((draft) => draft.form === card)?.anchor;
  }

  /** The card in use is the one the comments column is arranged around. */
  private onFocusIn(node: Element): void {
    const card = node.closest<HTMLElement>('.mr-thread, .mr-composer');
    if (!card || card === this.active) return;
    this.active = card;
    this.schedule(true);
  }

  /** Beside the hovered block: a placeholder in the comments column, or a small button in the margin. */
  private placeCommentButton(): void {
    const button = this.commentBtn;
    const hover = this.hover;
    const el = hover?.el;
    // A block that is already being commented on has its editor beside it.
    button.hidden =
      !el?.isConnected || Boolean(el.closest('[hidden]')) || !el.getClientRects().length || this.drafts.some((draft) => !draft.range && draft.anchor === el);
    if (button.hidden || !hover || !el) return;
    const article = this.el.article.getBoundingClientRect();
    const first = el.getClientRects()[0];
    const line = parseFloat(getComputedStyle(el).lineHeight) || first.height;
    const middle = first.top - article.top + Math.min(line, first.height) / 2;
    // Wide screens: in the comments column, which starts where a source file's code ends. Otherwise
    // just past the text or the code.
    const lane = this.root.classList.contains('has-rail');
    const column = (!lane && el.closest('.mr-code-lines')) || this.el.article;
    const right = column.getBoundingClientRect().right;
    button.classList.toggle('is-lane', lane);
    button.classList.toggle('is-beside-code', lane && hover.view.doc.kind === 'code');
    button.classList.remove('is-gap');
    button.classList.toggle('is-compact', !lane && this.root.clientWidth - right < 140);
    // A hit always carries the side its block has.
    const unit = (hover.side === 'base' ? hover.block.base : hover.block.head)!;
    const label = `Comment on ${placeName(hover.side, unit.lines[0] + 1, unit.lines[1])}`;
    button.setAttribute('aria-label', label);
    button.title = `${label} (R)`;
    button.querySelector('.mr-comment-btn-label')!.textContent = lane ? 'Add a comment…' : 'Comment';
    if (!lane) {
      button.hidden = this.root.clientWidth - right < 60;
      button.style.left = `${right - article.left + 14}px`;
      button.style.top = `${middle}px`;
      return;
    }
    button.style.left = '';
    // In the comments column: level with the block, or just below the conversation already beside it.
    const height = button.offsetHeight || 40;
    let top = middle - height / 2;
    const cards = [...(this.rail.children as HTMLCollectionOf<HTMLElement>)].filter((card) => !card.hidden).sort((a, b) => a.offsetTop - b.offsetTop);
    for (const card of cards) {
      if (top < card.offsetTop + card.offsetHeight + 8 && top + height > card.offsetTop - 8) top = card.offsetTop + card.offsetHeight + 8;
    }
    // Code keeps the full invitation below any existing discussion. Its line stays highlighted and
    // the pointer bridge reaches the control even when the discussion pushes it down.
    const gap = hover.view.doc.kind !== 'code' && top > surfaceOf(el).getBoundingClientRect().bottom - article.top;
    button.classList.toggle('is-gap', gap);
    button.style.top = `${gap ? middle : top}px`;
  }

  private commentOn(hit: Hit): void {
    this.startComment(paragraphTarget(hit.view.doc, hit.block, hit.side)!, [hit.el]);
  }

  /** R: the selected words if there are any, otherwise the block nearest the reading line. */
  private commentHere(): void {
    if (this.shadowSelection()?.isCollapsed === false) {
      this.captureSelection();
      if (this.chipTarget?.range) this.startComment(this.chipTarget.target, this.chipTarget.elements, this.chipTarget.range);
      return;
    }
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

  /** Selected text gets a small Comment chip; nothing opens until it is chosen. */
  private captureSelection(event?: MouseEvent): void {
    const origin = event?.target as Element | undefined;
    if (origin && (!origin.closest('.mr-content') || origin.closest('.mr-composer, .mr-thread, .mr-select-chip'))) return;
    const selection = this.shadowSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const view = this.views.find((v) => v.section.contains(range.startContainer) && v.section.contains(range.endContainer));
    const inCard = () =>
      [range.startContainer, range.endContainer].some((node) => (node instanceof Element ? node : node.parentElement!).closest('.mr-composer, .mr-thread'));
    if (!view?.rendered || inCard()) {
      this.hideChip();
      return;
    }
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
  private onTap(e: PointerEvent, node: Element): void {
    if (node.closest('a, button, summary, input, textarea, .mr-thread, .mr-composer') || !this.shadowSelection()?.isCollapsed) return;
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
    chip.title = problem ?? 'Comment on this text (R)';
    chip.hidden = false;
    this.placeChip(rect);
  }

  private placeChip(rect: DOMRect): void {
    const chip = this.el.chip;
    const width = chip.offsetWidth || 110;
    const left = Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, this.root.clientWidth - width - 8));
    const above = rect.top - 52;
    chip.style.left = `${left}px`;
    chip.style.top = `${above > 60 ? above : rect.bottom + 10}px`;
  }

  private hideChip(): void {
    this.el.chip.hidden = true;
    this.chipTarget = null;
  }

  /** Open an editor for a new comment beside its text. Choosing the same text again returns to it. */
  private startComment(target: CommentTarget, elements: HTMLElement[], range?: Range): void {
    this.hideChip();
    this.el.toast.hidden = true;
    const view = this.views.find((v) => v.doc === target.doc)!;
    const anchor = elements.at(-1)!;
    const existing = this.drafts.find((draft) => sameTarget(draft.target, target));
    if (existing) {
      this.focusEditor(existing);
      return;
    }
    // Untouched editors elsewhere make way; drafts with text stay where they were written.
    for (const draft of this.drafts.filter((item) => !item.busy && !hasDraft(item))) this.closeDraft(draft);
    const place = placeName(target.side, target.startLine, target.endLine);
    const path = target.side === 'base' ? target.doc.oldPath : target.doc.path;
    const editor = this.createEditor(
      'mr-composer',
      `New comment on ${path}, ${place}`,
      'Add a comment…',
      'Comment',
      (built) => void this.postDraft(built as Draft),
    );
    const draft: Draft = Object.assign(editor, { target, view, anchor, range, marks: [...new Set(elements.map(surfaceOf))], plan: null as CommentPlan | null });
    draft.form.prepend(h('p', 'mr-comment-target', `Comment on ${place}`));
    if (range) draft.form.insertBefore(h('blockquote', `mr-comment-quote${target.doc.kind === 'code' ? ' is-code' : ''}`, target.quote), draft.textarea);
    draft.cancel.addEventListener('click', () => this.closeDraft(draft));
    draft.form.addEventListener('focusout', () =>
      setTimeout(() => {
        // Clicking away from an empty editor removes it, as long as the reader still has focus.
        if (this.drafts.includes(draft) && !draft.busy && !hasDraft(draft) && !draft.form.contains(this.shadow.activeElement) && document.hasFocus())
          this.closeDraft(draft);
      }, 0),
    );
    this.drafts.push(draft);
    this.active = draft.form;
    this.refreshMarks();
    this.layoutThreads();
    this.focusEditor(draft);
    this.prepareDraft(draft);
  }

  private prepareDraft(draft: Draft): void {
    const prepare = this.source?.prepareComment;
    if (!prepare) {
      draft.status.textContent = 'Commenting is unavailable in this review. Open it on GitHub or GitLab to comment.';
      return;
    }
    draft.status.textContent = 'Checking where to post your comment…';
    void prepare(draft.target).then(
      (plan) => {
        if (this.closed || !this.drafts.includes(draft)) return;
        draft.plan = plan;
        draft.ready = true;
        draft.status.textContent = `${plan.label} · ${SUBMIT_KEY}`;
        this.updateEditor(draft);
      },
      (err) => {
        if (!this.closed && this.drafts.includes(draft)) draft.status.textContent = problem(err);
      },
    );
  }

  private async postDraft(draft: Draft): Promise<void> {
    const body = draft.textarea.value;
    if (!draft.plan || !body.trim() || draft.busy) return;
    this.setBusy(draft, true);
    draft.status.textContent = 'Posting…';
    try {
      const result = await draft.plan.post(body);
      if (this.closed) return;
      const { target } = draft;
      const thread: Thread = {
        doc: target.doc,
        side: target.side,
        line: target.endLine,
        url: result.url,
        comments: [{ author: 'You', body, createdAt: new Date().toISOString(), url: result.url }],
        reply: result.reply,
      };
      this.ownThreads.add(thread);
      this.threads.push(thread);
      // The thread takes the editor's place, in the same frame.
      this.setBusy(draft, false);
      this.closeDraft(draft);
      this.attachThreads(draft.view);
      const card = this.cardOf(thread)!;
      this.active = card;
      card.classList.add('is-new');
      this.layoutThreads();
      this.toast('Comment posted', result.url);
    } catch (err) {
      if (this.closed) return;
      draft.status.textContent = problem(err);
    } finally {
      if (this.drafts.includes(draft)) this.setBusy(draft, false);
    }
  }

  private closeDraft(draft: Draft): void {
    if (draft.busy || !this.drafts.includes(draft)) return;
    const focused = draft.form.contains(this.shadow.activeElement);
    this.drafts = this.drafts.filter((item) => item !== draft);
    this.resize.unobserve(draft.form);
    draft.form.remove();
    if (this.active === draft.form) this.active = null;
    this.refreshMarks();
    // Removing the focused editor would drop focus to the page and silence the reader's shortcuts.
    if (focused) this.root.focus({ preventScroll: true });
    this.placeCommentButton();
    this.schedule(true);
  }

  /** The words, or blocks, of every open editor stay marked while it is written. */
  private refreshMarks(): void {
    for (const el of this.root.querySelectorAll('.mr-targeted')) el.classList.remove('mr-targeted');
    const highlights = typeof Highlight === 'function' && CSS.highlights;
    const ranges: Range[] = [];
    for (const draft of this.drafts) {
      if (draft.range && highlights) ranges.push(draft.range);
      else for (const el of draft.marks) el.classList.add('mr-targeted');
    }
    if (ranges.length) CSS.highlights.set('galley-quote', new Highlight(...ranges));
    else CSS.highlights?.delete('galley-quote');
  }

  /** `send` posts what the editor holds; the editor it is given is the one being built, later extended into a Draft or ReplyEditor. */
  private createEditor(className: string, label: string, placeholder: string, action: string, send: (editor: Editor) => void): Editor {
    const form = h('form', className);
    form.setAttribute('aria-label', label);
    const textarea = h('textarea');
    textarea.rows = 1;
    textarea.placeholder = placeholder;
    textarea.setAttribute('aria-label', label);
    const status = h('p', 'mr-comment-status');
    status.id = `mr-comment-status-${++this.editorCount}`;
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    textarea.setAttribute('aria-describedby', status.id);
    const cancel = h('button', 'mr-btn mr-cancel', 'Cancel');
    cancel.type = 'button';
    const submit = h('button', 'mr-btn mr-primary mr-submit', action);
    submit.type = 'submit';
    submit.disabled = true;
    const actions = h('div', 'mr-compose-actions');
    actions.append(status, cancel, submit);
    form.append(textarea, actions);
    const editor: Editor = { form, textarea, status, cancel, submit, ready: false, busy: false, prefill: '', send: () => send(editor) };
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      editor.send();
    });
    // The card is the field: a click on its padding puts the cursor in the text.
    form.addEventListener('click', (e) => {
      if (e.target === form) textarea.focus();
    });
    textarea.addEventListener('input', () => this.fitEditor(editor));
    this.editorOf.set(form, editor);
    this.resize.observe(form);
    return editor;
  }

  /** Grow with the text, and offer to post only what can be posted. */
  private fitEditor(editor: Editor): void {
    const { form, textarea } = editor;
    form.classList.toggle('has-text', Boolean(textarea.value.trim()));
    textarea.style.height = 'auto';
    if (textarea.value) textarea.style.height = `${Math.min(textarea.scrollHeight, 320)}px`;
    this.updateEditor(editor);
    this.schedule(true);
  }

  private updateEditor(editor: Editor): void {
    editor.submit.disabled = editor.busy || !editor.ready || !editor.textarea.value.trim();
  }

  /** A write in progress keeps its editor, its text and the cursor exactly where they are. */
  private setBusy(editor: Editor, busy: boolean): void {
    editor.busy = busy;
    editor.textarea.readOnly = busy;
    editor.cancel.disabled = busy;
    editor.form.setAttribute('aria-busy', String(busy));
    this.updateEditor(editor);
  }

  private editorAt(node: EventTarget | null): Editor | undefined {
    const form = node instanceof Element ? node.closest('form') : null;
    return form ? this.editorOf.get(form) : undefined;
  }

  /** Bring an editor into view, arrange the comments column around it and put the cursor in it. */
  private focusEditor(editor: Editor): void {
    // Lay out now, for the current width, so the editor is where it belongs before it takes focus.
    this.active = editor.form.closest<HTMLElement>('.mr-thread') ?? editor.form;
    this.layoutThreads();
    const rect = editor.form.getBoundingClientRect();
    if (rect.top < 64 || rect.bottom > this.root.clientHeight - 16) this.scrollToEl(editor.form, 0.3, false);
    editor.textarea.focus({ preventScroll: true });
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
    this.toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 6000);
  }

  // ---------------------------------------------------------------- threads

  /** Each thread has one reply box, which keeps its draft while the reader is open. */
  private replyEditor(thread: Thread): ReplyEditor {
    const existing = this.replyEditors.get(thread);
    if (existing) return existing;
    const base = this.createEditor('mr-reply', `Reply to ${thread.comments[0].author}`, 'Write a reply…', 'Reply', () => void this.postReply(thread));
    const editor: ReplyEditor = Object.assign(base, { thread, to: 0, context: h('p', 'mr-reply-context') });
    editor.form.prepend(editor.context);
    editor.form.hidden = true;
    editor.ready = true;
    editor.cancel.addEventListener('click', () => this.closeReply(thread));
    editor.textarea.addEventListener('focus', () => {
      if (!editor.status.textContent) editor.status.textContent = `${SUBMIT_KEY} to reply`;
    });
    this.replyEditors.set(thread, editor);
    return editor;
  }

  /**
   * Reply to one comment, Reddit style: the box opens under it. Platform threads are flat, so an answer
   * to a reply goes to the same thread and names the person it answers.
   */
  private openReply(thread: Thread, index: number): void {
    const card = this.cardOf(thread)!;
    const comment = thread.comments[index];
    const editor = this.replyEditor(thread);
    const author = comment.author;
    // Mentions use the username; a display name with spaces would mention nobody.
    const handle = comment.handle ?? author;
    const starter = thread.comments[0];
    const mention = index > 0 && author !== 'You' && handle !== (starter?.handle ?? starter?.author) && /^[\w.-]+$/.test(handle) ? `@${handle} ` : '';
    if (!hasDraft(editor)) editor.textarea.value = mention;
    editor.prefill = mention;
    editor.to = index;
    editor.context.textContent = `Replying to ${author}`;
    editor.form.setAttribute('aria-label', `Reply to ${author}`);
    editor.textarea.setAttribute('aria-label', `Reply to ${author}`);
    editor.form.hidden = false;
    card.querySelectorAll('.mr-thread-comment')[index]?.after(editor.form);
    this.fitEditor(editor);
    this.focusEditor(editor);
    const end = editor.textarea.value.length;
    editor.textarea.setSelectionRange(end, end);
  }

  private closeReply(thread: Thread): void {
    const editor = this.replyEditors.get(thread);
    if (!editor || editor.busy) return;
    const focused = editor.form.contains(this.shadow.activeElement);
    editor.textarea.value = '';
    editor.status.textContent = '';
    editor.form.hidden = true;
    this.fitEditor(editor);
    if (focused) this.cardOf(thread)!.querySelectorAll<HTMLElement>('.mr-reply-to')[editor.to].focus({ preventScroll: true });
  }

  private async postReply(thread: Thread): Promise<void> {
    const editor = this.replyEditors.get(thread);
    if (!editor || editor.busy || !thread.reply || !hasDraft(editor)) return;
    const body = editor.textarea.value.trim();
    this.setBusy(editor, true);
    editor.status.textContent = 'Posting reply…';
    try {
      const result = await thread.reply(body);
      if (this.closed) return;
      thread.comments.push({ author: 'You', body, createdAt: new Date().toISOString(), url: result.url });
      this.setBusy(editor, false);
      const focused = editor.form.contains(this.shadow.activeElement);
      editor.textarea.value = '';
      editor.status.textContent = '';
      editor.form.hidden = true;
      this.fitEditor(editor);
      this.refreshCard(thread);
      // The conversation continues from the new reply.
      if (focused) [...this.cardOf(thread)!.querySelectorAll<HTMLElement>('.mr-reply-to')].at(-1)!.focus({ preventScroll: true });
      this.toast('Reply posted', result.url);
    } catch (err) {
      if (this.closed) return;
      editor.status.textContent = problem(err);
    } finally {
      this.setBusy(editor, false);
    }
  }

  /** A thread's card: anchored ones are kept for layout, file comments are already on the page. */
  private cardOf(thread: Thread): HTMLElement | undefined {
    return (
      this.threadEls.find((entry) => this.threadByCard.get(entry.card) === thread)?.card ??
      [...this.root.querySelectorAll<HTMLElement>('.mr-thread')].find((card) => this.threadByCard.get(card) === thread)
    );
  }

  /** Redraw a thread in place, keeping its position and the cursor in its reply box. */
  private refreshCard(thread: Thread): void {
    const old = this.cardOf(thread)!;
    const editor = this.replyEditors.get(thread);
    const focused = editor?.form.contains(this.shadow.activeElement);
    const card = this.threadCard(thread);
    card.classList.toggle('is-expanded', old.classList.contains('is-expanded'));
    card.style.top = old.style.top;
    card.hidden = old.hidden;
    old.replaceWith(card);
    const entry = this.threadEls.find((item) => item.card === old);
    if (entry) entry.card = card;
    if (this.active === old) this.active = card;
    if (focused) editor?.textarea.focus({ preventScroll: true });
    this.schedule(true);
  }

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
    this.views.forEach((view, index) => {
      if (view.rendered) this.attachThreads(view);
      // A folded file that turns out to have a discussion opens, so the discussion is not missed.
      else if (view.quiet && !view.open && this.threads.some((thread) => thread.doc === view.doc)) this.openQuiet(index);
    });
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
      const block = line === null ? undefined : blockAt(r, thread.side, line);
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

  /** A draft's text and posting target survive switching between formatted notes and comments as written. */
  private reanchorCodeComments(view: View): void {
    for (const draft of this.drafts) {
      if (draft.view !== view || !draft.anchor.closest('[data-mr-comment-view][hidden]')) continue;
      // A line the note leaves out, such as an opening /**, keeps the draft beside its note.
      draft.anchor =
        blockAt(view.rendered!, draft.target.side, draft.target.startLine)?.el ??
        draft.anchor.closest('.mr-source-comment')!.querySelector<HTMLElement>('[data-mr-comment-view]:not([hidden])')!;
      draft.range = undefined;
      draft.marks = [draft.anchor];
      draft.anchor.dataset.mrSpecContext = '';
    }
    this.attachThreads(view);
    this.refreshMarks();
  }

  private threadCard(thread: Thread): HTMLElement {
    const own = this.ownThreads.has(thread);
    const card = h('aside', `mr-thread${own ? ' is-own' : ''}${thread.resolved ? ' is-resolved' : ''}`);
    this.threadByCard.set(card, thread);
    const first = thread.comments[0];
    card.setAttribute('aria-label', `Comment by ${first.author}${thread.line ? ` on ${thread.side === 'base' ? 'old' : 'new'} line ${thread.line}` : ''}`);
    const fold = thread.comments.length > 3;
    const editor = this.replyEditors.get(thread);
    thread.comments.forEach((comment, i) => {
      const item = h('div', `mr-thread-comment${i ? ' is-reply' : ''}${fold && i > 0 && i < thread.comments.length - 1 ? ' is-folded' : ''}`);
      const meta = h('div', 'mr-thread-meta');
      // A long name is cut short with an ellipsis; the whole name and username stay in its tooltip.
      const name = h('span', 'mr-thread-author', comment.author);
      name.title = comment.handle && comment.handle !== comment.author ? `${comment.author} (@${comment.handle})` : comment.author;
      meta.append(h('span', 'mr-avatar', comment.author.slice(0, 1).toUpperCase()), name);
      const time = h('time', 'mr-thread-time', relativeTime(comment.createdAt));
      time.dateTime = comment.createdAt;
      time.title = new Date(comment.createdAt).toLocaleString();
      meta.append(time);
      const body = h('div', 'mr-thread-body');
      body.append(renderSnippet(document, comment.body, location.origin, this.settings.images));
      item.append(meta, body);
      if (thread.reply) {
        const reply = actionButton('Reply', 'reply-to', 'mr-reply-to');
        // biome-ignore lint/plugin: a bundled icon constant.
        reply.insertAdjacentHTML('afterbegin', icons.reply);
        reply.dataset.comment = String(i);
        reply.setAttribute('aria-label', `Reply to ${comment.author}`);
        item.append(reply);
      }
      card.append(item);
      if (editor && !editor.form.hidden && editor.to === i) card.append(editor.form);
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
      const link = h('a', 'mr-thread-link', 'View on platform');
      link.href = href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      foot.append(link);
    }
    card.append(foot);
    return card;
  }

  /**
   * Wide screens: cards in the comments column, level with their text (for a source file, the column
   * starts where its code ends). Narrow screens: below the text they belong to.
   */
  private layoutThreads(): void {
    const article = this.el.article.getBoundingClientRect();
    // Focus keeps every conversation below its text, whatever the width.
    const wide = this.settings.layout !== 'focus' && this.root.clientWidth >= 1280 && this.root.clientWidth - article.right >= RAIL_SPACE;
    this.root.classList.toggle('has-rail', wide);
    const entries = [
      ...this.threadEls.map(({ view, card, anchor }) => ({ card, anchor, code: view.doc.kind === 'code' })),
      ...this.drafts.map((draft) => ({ card: draft.form as HTMLElement, anchor: draft.anchor, code: draft.view.doc.kind === 'code' })),
    ];
    const last = new Map<Element, Element>();
    for (const { card, anchor, code } of entries) {
      card.classList.toggle('is-code-card', wide && code);
      if (wide) {
        if (card.parentElement !== this.rail) this.rail.append(card);
      } else {
        card.style.top = '';
        // Below the block and the cards already there, in order. A list item keeps its cards inside it.
        const item = anchor.matches('.mr-tight') ? anchor.closest('li') : null;
        const host = item ?? anchor;
        const before = last.get(host) ?? (item && [...item.children].filter((child) => !child.matches('.mr-thread, .mr-composer')).at(-1)) ?? anchor;
        if (before.nextElementSibling !== card) before.after(card);
        last.set(host, card);
      }
      card.hidden = !anchor.isConnected || Boolean(anchor.closest('[hidden]')) || !anchor.getClientRects().length;
    }
    if (!wide) return;
    const placed = entries
      .filter((entry) => !entry.card.hidden)
      .map((entry, order) => ({
        card: entry.card,
        top: surfaceOf(entry.anchor).getBoundingClientRect().top - article.top,
        height: entry.card.offsetHeight,
        order,
      }))
      .sort((a, b) => a.top - b.top || a.order - b.order);
    // Cards never overlap. The one in use stays level with its text; the others make room around it.
    const tops = placed.map((item) => item.top);
    const pivot = placed.findIndex((item) => item.card === this.active);
    for (let i = Math.max(pivot, 0) + 1; i < placed.length; i++) tops[i] = Math.max(tops[i], tops[i - 1] + placed[i - 1].height + CARD_GAP);
    for (let i = pivot - 1; i >= 0; i--) tops[i] = Math.min(tops[i], tops[i + 1] - placed[i].height - CARD_GAP);
    if (tops[0] < 0) {
      for (let i = 0; i < placed.length; i++) tops[i] = Math.max(placed[i].top, i ? tops[i - 1] + placed[i - 1].height + CARD_GAP : 0);
    }
    placed.forEach((item, i) => {
      item.card.style.top = `${tops[i]}px`;
    });
  }

  // ---------------------------------------------------------------- frame updates

  private schedule(layout: boolean): void {
    if (this.closed) return;
    this.needLayout ||= layout;
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      if (this.needLayout) {
        if (this.settings.layout === 'fit') this.applyFit();
        this.layoutGutter();
        this.layoutThreads();
        // The comment control is positioned within the article, so only layout can move it.
        this.placeCommentButton();
      }
      this.needLayout = false;
      this.onScroll();
    });
  }

  private onScroll(): void {
    const root = this.root;
    const top = root.scrollTop;
    const max = root.scrollHeight - root.clientHeight;
    this.el.progress.style.transform = `scaleX(${max > 0 ? Math.min(1, top / max) : 0})`;
    // Source files use the contents column, so the contents give way while one passes beneath them.
    const contents = this.el.toc.firstElementChild;
    if (contents) {
      const box = contents.getBoundingClientRect();
      const beneath = (rect: DOMRect) => rect.top < box.bottom + 32 && rect.bottom > box.top - 32;
      this.el.toc.classList.toggle(
        'is-covered',
        this.views.some((view) => {
          if (view.section.hidden) return false;
          if (view.doc.kind === 'code') return beneath(view.section.getBoundingClientRect());
          // So do code blocks that run wider than the text, into the contents column.
          return [...view.section.querySelectorAll<HTMLElement>('.mr-content > pre')].some((pre) => {
            const rect = pre.getBoundingClientRect();
            return rect.left < box.right + 16 && beneath(rect);
          });
        }),
      );
    }
    this.el.topbar.classList.toggle('is-scrolled', top > 2);
    let currentDoc = this.index;
    this.views.forEach((view, i) => {
      if (!view.section.hidden && view.section.getBoundingClientRect().top <= 150) currentDoc = i;
    });
    if (currentDoc !== this.index) {
      this.index = currentDoc;
      this.rendered = this.views[currentDoc].rendered;
      this.updateFileButton();
      if (this.rendered) this.buildToc(this.rendered);
      else this.el.toc.replaceChildren();
    }
    if (this.chipTarget?.range) this.placeChip(this.chipTarget.range.getBoundingClientRect());

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
    this.el.pillLabel.textContent = current === -1 ? `${list.length} change${list.length === 1 ? '' : 's'}` : `Change ${current + 1} of ${list.length}`;
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
      // Code shows its changes line by line, in the block itself, so it needs no bar beside it.
      if (el.closest('[hidden], .is-code') || el.matches('pre')) continue;
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
      mark.dataset.label = label[s.kind];
      mark.dataset.act = 'mark';
      mark.dataset.i = String(i);
      this.markTargets.push(s.point ? (nextVisible(s.target, s.target.closest('.mr-content')!) as HTMLElement) : s.target);
      gutter.append(mark);
    });
  }
}
