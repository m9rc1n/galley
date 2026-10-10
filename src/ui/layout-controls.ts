import { icons } from './icons.ts';
import { LAYOUTS, type Layout } from './settings.ts';

/** One vocabulary and picker for both readers; only reviews have files and conversations. */
export const LAYOUT_NAMES: Record<Layout, string> = {
  balanced: 'Balanced',
  files: 'Files',
  review: 'Review',
  wide: 'Wide text',
  focus: 'Focus',
  fit: 'Fit to screen',
};
const REVIEW_CAPTIONS: Record<Layout, string> = {
  balanced: 'Contents, text and comments side by side',
  files: 'Every file in the margin, for large reviews',
  review: 'More space for review comments',
  wide: 'For tables, code and diagrams',
  focus: 'Text in one column, with comments below',
  fit: 'Uses the full window width',
};
const LIBRARY_LAYOUTS = ['focus', 'balanced', 'wide'] as const;
type LibraryLayoutValue = (typeof LIBRARY_LAYOUTS)[number];
const LIBRARY_CAPTIONS: Record<LibraryLayoutValue, string> = {
  focus: 'A centred article, with navigation available on demand',
  balanced: 'Contents beside a centred article',
  wide: 'More room for tables, code and diagrams',
};

/** Fixed extension markup, composed into each reader's settings sheet. */
export function layoutPanel(context: 'review' | 'library'): string {
  const library = context === 'library';
  const choices = library ? LIBRARY_LAYOUTS : LAYOUTS;
  const buttons = choices
    .map((value) => {
      const caption = library ? LIBRARY_CAPTIONS[value as LibraryLayoutValue] : REVIEW_CAPTIONS[value];
      return `<button data-value="${value}" aria-label="${LAYOUT_NAMES[value]}: ${caption}">
      <span class="mr-layout-preview${library ? ' is-library' : ''}" aria-hidden="true"><i class="c"></i><i class="t"><b></b><b></b><b></b><b></b></i>${library ? '' : '<i class="m"><b></b><b></b></i>'}</span>
      <span class="mr-theme-label"><span class="mr-theme-name">${LAYOUT_NAMES[value]}</span>${icons.check}</span>
      <span class="mr-theme-caption">${caption}</span></button>`;
    })
    .join('');
  return `<section class="mr-settings-section" aria-label="Layout">
    <div class="mr-set-row mr-theme-row"><span>Layout<small>${library ? 'Arrange the article and its contents. Narrow screens use one column.' : 'Arrange text and comments on wide screens. Narrow screens use one column.'}</small></span>
      <div class="mr-theme-options mr-layout-options" data-setting="layout" role="group" aria-label="Layout">${buttons}</div></div>
    <div class="mr-set-row"><span>Density<small>Compact fits more on the screen</small></span><div class="mr-seg" data-setting="density" role="group" aria-label="Density"><button data-value="comfortable">Comfortable</button><button data-value="compact">Compact</button></div></div>
    </section><p class="mr-settings-note">${library ? 'Layout stays with this library session. Your review keeps its own layout.' : 'Changes to your settings appear in the reader right away.'}</p>`;
}

/** Library navigation and late preference reads cannot overwrite this session's reading layout. */
export class LibraryLayout {
  private selected: LibraryLayoutValue = 'focus';
  get value(): LibraryLayoutValue {
    return this.selected;
  }
  select(value: string): boolean {
    const supported = LIBRARY_LAYOUTS.find((layout) => layout === value);
    if (!supported) return false;
    this.selected = supported;
    return true;
  }
  next(): void {
    this.selected = LIBRARY_LAYOUTS[(LIBRARY_LAYOUTS.indexOf(this.selected) + 1) % LIBRARY_LAYOUTS.length];
  }
}
