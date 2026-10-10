import { expect, it, vi } from 'vitest';
import type { ReviewProject } from '../platforms/types.ts';
import { readerHarness, review } from '../testing/reader.ts';
import { handbook, repository } from '../testing/repo.ts';

const ui = readerHarness();
const repoShadow = () => document.querySelector('#galley-repo-reader')?.shadowRoot ?? null;

function project(): ReviewProject {
  return {
    base: { ref: 'main', commit: 'ba5e000000000000000000000000000000000000' },
    head: { ref: 'feature/guide', commit: 'bead000000000000000000000000000000000000' },
    open: vi.fn((revision: 'base' | 'head') =>
      repository(handbook, {
        commit: revision === 'head' ? 'bead000000000000000000000000000000000000' : 'ba5e000000000000000000000000000000000000',
        pinned: true,
      }),
    ),
  };
}

it('a review without its repository offers no project docs', async () => {
  await ui.open(review());
  expect(ui.q('[data-act="project"]').hidden).toBe(true);
});

it('Project docs opens the repository at the review’s head or base over the review, and closing it comes back to the review as it was', async () => {
  const behind = project();
  await ui.open(review({ project: behind }));
  const toggle = ui.q('[data-act="project"]');
  expect(toggle.hidden).toBe(false);
  ui.click('[data-act="project"]');
  expect(ui.q('.mr-project').hidden).toBe(false);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect([...ui.q('.mr-project').querySelectorAll('.mr-menu-item')].map((item) => item.textContent)).toStrictEqual([
    'As this change leaves themfeature/guide @ bead000',
    'Before this changemain @ ba5e000',
  ]);
  // Esc closes the menu first, like every menu.
  ui.key('Escape');
  expect(ui.q('.mr-project').hidden).toBe(true);
  expect(document.querySelector('#galley-reader')).not.toBe(null);

  ui.click('[data-act="project"]');
  ui.click('[data-act="project-open"][data-revision="head"]');
  expect(behind.open).toHaveBeenCalledWith('head');
  expect(ui.q('.mr-project').hidden).toBe(true);
  await vi.waitFor(() => expect(repoShadow()?.querySelector('.mr-review-context h1')?.textContent).toBe('This review'));
  expect(repoShadow()!.querySelector('.mr-review-context .mr-subtitle')!.textContent).toContain('at its head, feature/guide @ bead000 for “Update the guide”');
  expect([...repoShadow()!.querySelectorAll('.mr-review-chapter h2')].length).toBeGreaterThan(0);
  expect(repoShadow()!.querySelector('.mr-review-path')!.textContent).toContain('docs/guide.md');

  // Keys belong to the docs while they are open: Esc closes them, not the review.
  const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true, cancelable: true });
  repoShadow()!.querySelector<HTMLElement>('.mr-root')!.dispatchEvent(esc);
  expect(document.querySelector('#galley-repo-reader')).toBe(null);
  expect(document.querySelector('#galley-reader')).not.toBe(null);
  expect(ui.shadow().activeElement).toBe(toggle);

  // The base is the other choice; closing the review closes the docs over it too.
  ui.click('[data-act="project"]');
  ui.click('[data-act="project-open"][data-revision="base"]');
  expect(behind.open).toHaveBeenLastCalledWith('base');
  await vi.waitFor(() => expect(repoShadow()?.querySelector('.mr-review-context .mr-subtitle')?.textContent).toContain('at its base, main @ ba5e000'));
  ui.close();
  expect(document.querySelector('#galley-repo-reader')).toBe(null);
});
