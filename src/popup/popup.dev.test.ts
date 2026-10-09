import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';

vi.mock('../platforms/tokens.ts', () => ({ getToken: vi.fn(async () => null), setToken: vi.fn(), migrateTokens: vi.fn(async () => {}) }));

it('marks the development build next to the name', async () => {
  document.documentElement.innerHTML = readFileSync('src/popup/popup.html', 'utf8');
  vi.stubGlobal('chrome', { tabs: { query: vi.fn(async () => []) } });
  await import('./popup.ts');
  expect(document.querySelector('.brand .dev')!.textContent).toBe('dev');
  await vi.waitFor(() => expect(document.querySelector('#site')!.textContent).not.toBe(''));
});
