import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const q = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const html = readFileSync('src/options/options.html', 'utf8');

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  document.documentElement.innerHTML = html;
});
afterEach(() => document.body.replaceChildren());

async function open() {
  await import('./options.ts');
  await vi.waitFor(() => expect(q<HTMLInputElement>('#read-button').disabled).toBe(false));
}

it('keeps the existing button by default, saves only the opening choice, and announces its state', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ font: 'mono' }));
  await open();
  const control = q<HTMLInputElement>('#read-button');
  expect(control.checked).toBe(true);
  expect(control.getAttribute('role')).toBe('switch');
  expect(control.getAttribute('aria-checked')).toBe('true');
  control.click();
  await vi.waitFor(() => expect(q('#status').textContent).toContain('button is off'));
  expect(control.getAttribute('aria-checked')).toBe('false');
  expect(JSON.parse(localStorage.getItem('galley:settings')!)).toMatchObject({ font: 'mono', readButton: false });
  control.click();
  await vi.waitFor(() => expect(q('#status').textContent).toBe('The Read button is on.'));
});

it('keeps the saved choice when writing fails, and can read settings again after a read failure', async () => {
  localStorage.setItem('galley:settings', '{bad');
  await import('./options.ts');
  await vi.waitFor(() => expect(q('#retry').hidden).toBe(false));
  expect(q<HTMLInputElement>('#read-button').disabled).toBe(true);
  expect(q('#status').textContent).toContain('could not be read');
  localStorage.setItem('galley:settings', JSON.stringify({ readButton: false }));
  q('#retry').click();
  await vi.waitFor(() => expect(q<HTMLInputElement>('#read-button').disabled).toBe(false));
  const control = q<HTMLInputElement>('#read-button');
  expect(control.checked).toBe(false);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Full');
  });
  control.click();
  await vi.waitFor(() => expect(q('#status').textContent).toContain('not saved'));
  expect(control.checked).toBe(false);
  expect(control.disabled).toBe(false);
});
