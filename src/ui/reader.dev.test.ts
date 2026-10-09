import { expect, it } from 'vitest';
import { contents, readerHarness, review } from '../testing/reader.ts';
import { openReader } from './reader.ts';

const ui = readerHarness();

it('marks the development build, and keeps it apart from an installed Galley on the same page', async () => {
  const handle = openReader(review({ load: async () => contents }));
  await ui.tick();
  const host = document.querySelector('#galley-reader-dev')!;
  expect(document.querySelector('#galley-reader')).toBeNull();
  expect(host.shadowRoot!.querySelector('.mr-brand .mr-dev')!.textContent).toBe('dev');
  handle.close();
});
