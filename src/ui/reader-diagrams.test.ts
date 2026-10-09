import { expect, it, vi } from 'vitest';
import { readerHarness, review } from '../testing/reader.ts';

// Drawing diagrams happens in a sandboxed frame (diagrams.ts); here the drawing is instant, so the
// reader's reaction to "a diagram changed size" can be seen without one.
const drawn = vi.hoisted(() => ({ renderDiagrams: vi.fn() }));
vi.mock('./diagrams.ts', async (original) => ({ ...(await original<typeof import('./diagrams.ts')>()), renderDiagrams: drawn.renderDiagrams }));

const ui = readerHarness();

it('makes room again whenever a diagram finishes drawing, when the document is shown and when the palette changes', async () => {
  drawn.renderDiagrams.mockImplementation((_diagrams: unknown, _dark: boolean, changed: () => void) => changed());
  const frame = vi.spyOn(globalThis, 'requestAnimationFrame');
  await ui.open(review());
  ui.flushFrame();
  const shown = drawn.renderDiagrams.mock.calls.length;
  expect(shown).toBeGreaterThan(0);
  frame.mockClear();
  ui.click('[data-act="settings"]');
  ui.click('[data-setting="theme"] [data-value="paper"]');
  expect(drawn.renderDiagrams.mock.calls.length).toBeGreaterThan(shown);
  expect(frame).toHaveBeenCalled();
});
