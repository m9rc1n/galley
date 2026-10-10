import { expect, it, vi } from 'vitest';
import { repository } from '../testing/repo.ts';
import { openRepository } from './repo-reader.ts';

it('marks the development build, and keeps it apart from an installed Galley on the same page', async () => {
  vi.stubGlobal('matchMedia', () => new EventTarget());
  const handle = openRepository(repository());
  const host = document.querySelector('#galley-repo-reader-dev')!;
  expect(document.querySelector('#galley-repo-reader')).toBeNull();
  expect(host.shadowRoot!.querySelector('.mr-brand .mr-dev')!.textContent).toBe('dev');
  handle.close();
});
