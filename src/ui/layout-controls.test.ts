import { expect, it } from 'vitest';
import { LibraryLayout, layoutPanel, LAYOUT_NAMES } from './layout-controls.ts';
import { LAYOUTS } from './settings.ts';

it('the shared review picker offers all existing layouts, labelled with their purpose and illustrated conversation', () => {
  const doc = new DOMParser().parseFromString(layoutPanel('review'), 'text/html');
  const buttons = [...doc.querySelectorAll<HTMLElement>('[data-setting="layout"] button')];
  expect(buttons.map((button) => button.dataset.value)).toEqual(LAYOUTS);
  for (const button of buttons) {
    expect(button.getAttribute('aria-label')).toContain(LAYOUT_NAMES[button.dataset.value as keyof typeof LAYOUT_NAMES]);
    expect(button.querySelector('.mr-theme-caption')!.textContent).not.toBe('');
    expect(button.querySelector('.m')).not.toBeNull();
    expect(button.querySelector('.mr-layout-preview')!.getAttribute('aria-hidden')).toBe('true');
  }
  expect(doc.querySelector('[data-setting="density"]')!.getAttribute('role')).toBe('group');
});

it('the library picker offers reading layouts without review-only controls or an imaginary conversation', () => {
  const doc = new DOMParser().parseFromString(layoutPanel('library'), 'text/html');
  expect([...doc.querySelectorAll<HTMLElement>('[data-setting="layout"] button')].map((button) => button.dataset.value)).toEqual(['focus', 'balanced', 'wide']);
  expect(doc.querySelectorAll('.m')).toHaveLength(0);
  expect(doc.querySelectorAll('.is-library')).toHaveLength(3);
  expect(doc.querySelector('.mr-settings-note')!.textContent).toContain('Your review keeps its own layout');
});

it('each library session starts in Focus, accepts its supported layouts and cycles without review layouts', () => {
  const layout = new LibraryLayout();
  expect(layout.value).toBe('focus');
  expect(layout.select('wide')).toBe(true);
  expect(layout.value).toBe('wide');
  expect(layout.select('review')).toBe(false);
  expect(layout.select('missing')).toBe(false);
  expect(layout.value).toBe('wide');
  layout.next();
  expect(layout.value).toBe('focus');
  layout.next();
  expect(layout.value).toBe('balanced');
  layout.next();
  expect(layout.value).toBe('wide');
  expect(new LibraryLayout().value).toBe('focus');
});
