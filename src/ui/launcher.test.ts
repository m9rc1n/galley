import { afterEach, expect, it, vi } from 'vitest';
import { Launcher } from './launcher.ts';

afterEach(() => document.querySelector('#galley-launcher')?.remove());
const button = (selector = '.launch') => document.querySelector('#galley-launcher')!.shadowRoot!.querySelector<HTMLButtonElement>(selector)!;

it('opens the review, replaces counts, and reattaches when a single-page navigation removes its node', () => {
  const launcher = new Launcher(),
    open = vi.fn();
  launcher.show('review1', 1, open);
  expect(button().title).toContain('1 changed text file as');
  button().click();
  expect(open).toHaveBeenCalledOnce();
  const host = document.querySelector('#galley-launcher')!;
  host.remove();
  launcher.reattach();
  expect(host.isConnected).toBe(true);
  launcher.show('review2', 3, open);
  expect(host.isConnected).toBe(false);
  expect(button().title).toContain('3 changed text files');
  launcher.hide();
  launcher.reattach();
  expect(document.querySelector('#galley-launcher')).toBeNull();
});

it('remembers dismissal only for that review, including after navigation', () => {
  const launcher = new Launcher();
  launcher.show('review1', 1, vi.fn());
  button('.dismiss').click();
  launcher.show('review1', 1, vi.fn());
  expect(document.querySelector('#galley-launcher')).toBeNull();
  launcher.show('review2', 2, vi.fn());
  expect(button()).toBeTruthy();
  launcher.hide();
  launcher.show('review1', 1, vi.fn());
  expect(document.querySelector('#galley-launcher')).toBeNull();
});

it('offers an error launcher whose click opens details and whose count cannot contain page HTML', () => {
  const launcher = new Launcher(),
    open = vi.fn();
  launcher.show('error', 0, open, true);
  expect(button().title).toContain('Click for details');
  expect(button('.count').textContent).toBe('!');
  expect(button().classList).toContain('is-error');
  button().click();
  expect(open).toHaveBeenCalledOnce();
});
