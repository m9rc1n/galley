import { icons } from './icons.ts';
import { TEXT_SIZES, type Settings, type Theme } from './settings.ts';

/**
 * The settings sheet both readers share (docs/design/patterns.md): a heading, tabs, and rows of
 * labelled controls. Both readers add the shared layout picker; the review reader also adds its Review
 * tab. The shared Reading tab keeps typography and appearance consistent across both.
 */

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
  ['hackerman', 'Hackerman', 'Terminal green'],
  ['aurora', 'Aurora', 'Teal · violet glow'],
  ['sunset', 'Sunset', 'Peach · rose glow'],
];
const PALETTES_PER_PAGE = 6;
const PALETTE_PAGE_COUNT = Math.ceil(PALETTES.length / PALETTES_PER_PAGE);
const paletteButton = ([value, name, caption]: [Theme, string, string]) => `
  <button data-value="${value}" aria-label="${name}">
    <span class="mr-theme-preview" aria-hidden="true"><span>Aa</span><span class="mr-theme-lines"><i></i><i></i><i></i></span></span>
    <span class="mr-theme-label"><span class="mr-theme-name">${name}</span>${icons.check}</span>
    <span class="mr-theme-caption">${caption}</span>
  </button>`;
const PALETTE_PAGES = Array.from(
  { length: PALETTE_PAGE_COUNT },
  (_, page) =>
    `<div class="mr-palette-page">${PALETTES.slice(page * PALETTES_PER_PAGE, (page + 1) * PALETTES_PER_PAGE)
      .map(paletteButton)
      .join('')}</div>`,
).join('');
const PALETTE_DOTS = Array.from(
  { length: PALETTE_PAGE_COUNT },
  (_, page) => `<button class="mr-carousel-dot" data-act="palette-page" data-page="${page}" aria-label="Palettes, page ${page + 1}"></button>`,
).join('');

/** The Reading tab: how the page looks, and how its text is set. */
export const READING_SECTIONS = `
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
        <div class="mr-set-row"><span id="mr-top-glow-label">Top glow<small>A soft wash of color to ease into a review</small></span><button class="mr-switch" data-act="top-glow" role="switch" aria-checked="true" aria-labelledby="mr-top-glow-label"></button></div>
      </section>
      <section class="mr-settings-section" aria-label="Typography">
        <div class="mr-set-row"><label for="mr-typeface">Typeface</label><div class="mr-font-select"><select id="mr-typeface" aria-label="Typeface"><option value="galley">Galley</option><option value="serif">Newsreader</option><option value="sans">DM Sans</option><option value="georgia">Georgia</option><option value="system">System</option><option value="mono">Monospace</option></select>${icons.chevronDown}</div></div>
        <div class="mr-set-row"><span>Text size</span><div class="mr-size-control"><button class="mr-btn" data-act="smaller" aria-label="Smaller text">A−</button><output class="mr-text-size" aria-live="polite">20 px</output><button class="mr-btn" data-act="larger" aria-label="Larger text">A+</button></div></div>
        <div class="mr-type-preview" aria-label="Typeface and text size preview"><p>Understand changes. Review in peace.</p><span>Read the context. See the edits. Ask a question.</span></div>
      </section>`;

/** Shortcuts in groups, as the Keys tab lists them: each key combination and what it does. */
export type Shortcuts = Array<[string, Array<[string[], string]>]>;

export function keyGroups(shortcuts: Shortcuts): string {
  return shortcuts
    .map(
      ([title, keys]) => `
  <section class="mr-settings-section mr-keys-group" aria-label="${title}"><h3 class="mr-keys-title">${title}</h3><dl class="mr-keys">${keys
    .map(([combo, description]) => `<dt>${combo.map((key) => `<kbd>${key}</kbd>`).join(' ')}</dt><dd>${description}</dd>`)
    .join('')}</dl></section>`,
    )
    .join('');
}

export interface SheetTab {
  /** `data-settings-tab`, and the ids `mr-<id>-tab` and `mr-<id>-panel`. */
  id: string;
  label: string;
  icon: string;
  panel: string;
}

/** The sheet's markup: the first tab is selected; the others' panels are hidden until chosen. */
export function settingsSheet(intro: string, tabs: SheetTab[]): string {
  const buttons = tabs
    .map(
      (tab, i) =>
        `<button id="mr-${tab.id}-tab" role="tab" data-settings-tab="${tab.id}" aria-selected="${i === 0}" aria-controls="mr-${tab.id}-panel" tabindex="${i === 0 ? 0 : -1}">${tab.icon}${tab.label}</button>`,
    )
    .join('');
  const panels = tabs
    .map((tab, i) => `<div id="mr-${tab.id}-panel" role="tabpanel" aria-labelledby="mr-${tab.id}-tab"${i === 0 ? '' : ' hidden'}>${tab.panel}</div>`)
    .join('');
  return `
  <div class="mr-settings" hidden>
    <div class="mr-settings-backdrop" data-act="close-settings"></div>
    <aside class="mr-settings-panel" role="dialog" aria-modal="true" aria-labelledby="mr-settings-title" tabindex="-1">
      <header class="mr-settings-heading"><div><h2 id="mr-settings-title">Reading settings</h2><p>${intro}</p></div><button class="mr-btn mr-icon-btn" data-act="close-settings" aria-label="Close settings (Esc)" title="Close settings (Esc)">${icons.close}</button></header>
      <div class="mr-settings-tabs" role="tablist" aria-label="Settings category">${buttons}</div>
      <div class="mr-settings-body">${panels}</div>
    </aside>
  </div>`;
}

/** Select a tab and show its panel; the panel starts at its top. */
export function selectTab(sheet: HTMLElement, name: string, focus = false): void {
  for (const tab of sheet.querySelectorAll<HTMLElement>('[data-settings-tab]')) {
    const active = tab.dataset.settingsTab === name;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    sheet.querySelector<HTMLElement>(`#${tab.getAttribute('aria-controls')}`)!.hidden = !active;
    if (active && focus) tab.focus({ preventScroll: true });
  }
  sheet.querySelector<HTMLElement>('.mr-settings-body')!.scrollTop = 0;
}

/** Roving focus between tabs: arrows step and wrap, Home and End jump. Null for any other key. */
export function nextTab(tabs: readonly string[], current: string, key: string): string | null {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return null;
  if (key === 'Home') return tabs[0];
  if (key === 'End') return tabs[tabs.length - 1];
  const at = tabs.indexOf(current);
  return tabs[(at + (key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
}

/** The palette carousel: pages as wide as the track, with arrows and dots that say where it is. */
export class PaletteCarousel {
  constructor(private readonly root: ParentNode) {}

  private get track(): HTMLElement {
    return this.root.querySelector<HTMLElement>('.mr-palette-track')!;
  }

  /** The page in view. */
  at(): number {
    const track = this.track;
    return track.clientWidth ? Math.round(track.scrollLeft / track.clientWidth) : 0;
  }

  turn(page: number, smooth = true): void {
    const track = this.track;
    const target = Math.max(0, Math.min(track.children.length - 1, page));
    track.scrollTo({ left: target * track.clientWidth, behavior: smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto' });
    this.update(target);
  }

  update(page = this.at()): void {
    const last = this.track.children.length - 1;
    this.root.querySelector<HTMLButtonElement>('[data-act="palette-prev"]')!.disabled = page <= 0;
    this.root.querySelector<HTMLButtonElement>('[data-act="palette-next"]')!.disabled = page >= last;
    for (const [i, dot] of this.root.querySelectorAll<HTMLElement>('.mr-carousel-dot').entries()) dot.setAttribute('aria-current', String(i === page));
  }

  /** The settings open on the page that holds the chosen palette. */
  reveal(theme: Theme): void {
    const page = this.track.querySelector(`[data-value="${theme}"]`)?.closest('.mr-palette-page');
    this.turn([...this.track.children].indexOf(page!), false);
  }

  /** A click on an arrow (`palette-prev`, `palette-next`) or a dot (`palette-page`). */
  onClick(act: string | undefined, el: HTMLElement): void {
    if (act === 'palette-prev') this.turn(this.at() - 1);
    else if (act === 'palette-next') this.turn(this.at() + 1);
    else this.turn(Number(el.dataset.page));
  }
}

/** The state of the Reading tab's controls: the chosen value of every group, the typeface, the text size, the top glow. */
export function applyReadingControls(root: ParentNode, s: Settings): void {
  root.querySelector<HTMLSelectElement>('#mr-typeface')!.value = s.font;
  root.querySelector<HTMLOutputElement>('.mr-text-size')!.textContent = `${TEXT_SIZES[s.size] ?? 20} px`;
  root.querySelector<HTMLButtonElement>('[data-act="smaller"]')!.disabled = s.size <= 0;
  root.querySelector<HTMLButtonElement>('[data-act="larger"]')!.disabled = s.size >= TEXT_SIZES.length - 1;
  root.querySelector('[data-act="top-glow"]')!.setAttribute('aria-checked', String(s.topGlow));
  for (const group of root.querySelectorAll<HTMLElement>('[data-setting]')) {
    const value = s[group.dataset.setting as keyof Settings];
    for (const b of group.querySelectorAll<HTMLElement>('[data-value]')) b.setAttribute('aria-pressed', String(b.dataset.value === value));
  }
}
