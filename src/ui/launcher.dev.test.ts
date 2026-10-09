import { afterEach, expect, it, vi } from 'vitest';
import { Launcher } from './launcher.ts';

afterEach(() => document.querySelector('#galley-launcher-dev')?.remove());

it('marks the development build, and keeps it apart from an installed Galley on the same page', () => {
  new Launcher().show('review1', 2, vi.fn());
  const host = document.querySelector('#galley-launcher-dev')!;
  expect(document.querySelector('#galley-launcher')).toBeNull();
  expect(host.shadowRoot!.querySelector('.wrap')!.classList.contains('dev')).toBe(true);
  expect(host.shadowRoot!.querySelector('.dev-tag')!.textContent).toBe('DEV');
});
