import { expect, it, vi } from 'vitest';
import { readerHarness, review } from '../testing/reader.ts';

const ui = readerHarness();

/** Enlarge a diagram drawn at `width` × `height`; the harness window is 1280 × 800. */
async function enlarge(width: number, height: number) {
  await ui.open(review());
  const zoom = document.createElement('button');
  zoom.dataset.act = 'zoom-diagram';
  const image = document.createElement('img');
  image.src = 'data:image/svg+xml,%3Csvg%2F%3E';
  image.width = width;
  image.height = height;
  zoom.append(image);
  ui.q('.mr-content').append(zoom);
  Object.defineProperty(ui.q('.mr-lightbox-stage'), 'setPointerCapture', { configurable: true, value: vi.fn() });
  zoom.click();
  return { stage: ui.q('.mr-lightbox-stage'), image: ui.q<HTMLImageElement>('.mr-lightbox img') };
}
const shown = (image: HTMLImageElement) => ({
  width: parseFloat(image.style.width),
  height: parseFloat(image.style.height),
  at: image.style.transform,
});
const level = () => ui.q('.mr-zoom-level').textContent;
const pointer = (target: Element, type: string, id: number, x: number, y: number) => {
  const e = new MouseEvent(type, { bubbles: true, composed: true, cancelable: true, clientX: x, clientY: y });
  Object.defineProperty(e, 'pointerId', { value: id });
  target.dispatchEvent(e);
};

it('shows a large diagram whole, filling the window, and zooms in from there', async () => {
  const { stage, image } = await enlarge(2400, 1200);
  // 2400 × 1200 shrinks to fit: the 1216-pixel-wide room decides.
  expect(shown(image)).toEqual({ width: 1216, height: 608, at: 'translate(32px, 60px)' });
  expect(level()).toBe('51%');
  expect(stage.classList.contains('is-movable')).toBe(false);
  expect(ui.q<HTMLButtonElement>('[data-act="zoom-out"]').disabled).toBe(true);
  ui.click('[data-act="zoom-in"]');
  expect(level()).toBe('63%');
  expect(stage.classList.contains('is-movable')).toBe(true);
  for (let i = 0; i < 20; i++) ui.click('[data-act="zoom-in"]');
  expect(level()).toBe('400%');
  expect(ui.q<HTMLButtonElement>('[data-act="zoom-in"]').disabled).toBe(true);
  ui.click('[data-act="zoom-out"]');
  expect(level()).toBe('320%');
  ui.click('[data-act="zoom-fit"]');
  expect(level()).toBe('51%');
});

it('grows a small diagram up to twice its size and lets it shrink back to its own size', async () => {
  const { image } = await enlarge(300, 100);
  expect(shown(image)).toMatchObject({ width: 600, height: 200 });
  expect(level()).toBe('200%');
  for (let i = 0; i < 5; i++) ui.click('[data-act="zoom-out"]');
  expect(level()).toBe('100%');
  expect(ui.q<HTMLButtonElement>('[data-act="zoom-out"]').disabled).toBe(true);
});

it('zooms where the pointer is with a pinch or ⌘/Ctrl + scroll, and moves with a plain scroll', async () => {
  const { stage, image } = await enlarge(2400, 1200);
  // The stage's box starts at (360, 300) in the harness; the point under the pointer stays put.
  stage.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, clientX: 360 + 32, clientY: 300 + 60, cancelable: true }));
  expect(level()).toBe('138%');
  expect(shown(image).at).toBe('translate(32px, 32px)');
  const before = shown(image).at;
  const wheel = new WheelEvent('wheel', { deltaX: 40, deltaY: 30, cancelable: true });
  stage.dispatchEvent(wheel);
  expect(wheel.defaultPrevented).toBe(true);
  expect(shown(image).at).not.toBe(before);
  stage.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, metaKey: true, cancelable: true }));
  expect(level()).toBe('51%');
});

it('drags a zoomed diagram without closing it, and closes on a plain click on the backdrop', async () => {
  const { stage, image } = await enlarge(2400, 1200);
  ui.click('[data-act="zoom-in"]');
  ui.click('[data-act="zoom-in"]');
  const before = shown(image).at;
  pointer(stage, 'pointerdown', 1, 600, 400);
  pointer(stage, 'pointermove', 1, 640, 420);
  expect(stage.classList.contains('is-dragging')).toBe(true);
  pointer(stage, 'pointermove', 2, 700, 500);
  pointer(stage, 'pointerup', 1, 640, 420);
  expect(stage.classList.contains('is-dragging')).toBe(false);
  expect(shown(image).at).not.toBe(before);
  stage.click();
  expect(ui.q('.mr-lightbox').hidden).toBe(false);
  stage.click();
  expect(ui.q('.mr-lightbox').hidden).toBe(true);
});

it('treats a press that barely moves as a click', async () => {
  const { stage } = await enlarge(2400, 1200);
  pointer(stage, 'pointerdown', 1, 600, 400);
  pointer(stage, 'pointermove', 1, 601, 400);
  pointer(stage, 'pointercancel', 1, 601, 400);
  stage.click();
  expect(ui.q('.mr-lightbox').hidden).toBe(true);
});

it('pinches with two fingers around the point between them', async () => {
  const { stage } = await enlarge(2400, 1200);
  pointer(stage, 'pointerdown', 1, 500, 400);
  pointer(stage, 'pointerdown', 2, 700, 400);
  pointer(stage, 'pointermove', 2, 900, 400);
  // Twice as far apart: twice the size.
  expect(level()).toBe('101%');
  // Fingers that start on the same spot do not divide by nothing.
  pointer(stage, 'pointerdown', 3, 900, 400);
  pointer(stage, 'pointermove', 3, 900, 400);
  expect(level()).toBe('101%');
});

it('zooms in on a double click, and answers the zoom and arrow keys while open', async () => {
  const { image } = await enlarge(2400, 1200);
  image.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: 600, clientY: 400 }));
  expect(level()).toBe('101%');
  ui.key('0');
  expect(level()).toBe('51%');
  ui.key('+');
  ui.key('=');
  expect(level()).toBe('79%');
  ui.key('-');
  expect(level()).toBe('63%');
  const at = shown(image).at;
  ui.key('ArrowRight');
  expect(shown(image).at).toBe('translate(-200px, -16px)');
  ui.key('ArrowLeft');
  expect(shown(image).at).toBe(at);
  // Moving stops at the edge: the diagram never leaves the window.
  ui.key('ArrowDown');
  expect(shown(image).at).toBe('translate(-120px, -64px)');
  ui.key('ArrowUp');
  expect(shown(image).at).toBe('translate(-120px, 16px)');
  ui.key('x');
  expect(ui.q('.mr-lightbox').hidden).toBe(false);
});
