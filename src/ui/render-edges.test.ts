import { expect, it } from 'vitest';
import { renderMarkdown } from '../testing/render.ts';
import { isPlatformUrl, loadImage, renderSnippet, sanitize } from './render.ts';

it.each([
  ['https://gitlab.example/a', 'bad origin', false],
  ['http://gitlab.example/a', 'https://gitlab.example', false],
  ['http://localhost/a', 'http://localhost', true],
  ['https://sub.gitlab.example/a', 'https://gitlab.example', true],
  ['https://raw.githubusercontent.com/a', 'https://github.com', true],
  ['https://fakegithubusercontent.com/a', 'https://github.com', false],
  ['https://gitlab.example.evil/a', 'https://gitlab.example', false],
])('classifies image host %s against %s', (url, origin, expected) => {
  expect(isPlatformUrl(url, origin)).toBe(expected);
});

it('loads images idempotently, with or without a consent placeholder', () => {
  const image = document.createElement('img');
  loadImage(image); expect(image.hasAttribute('src')).toBe(false);
  image.dataset.mrSrc = 'https://images.example/a.png';
  loadImage(image); loadImage(image);
  expect(image.src).toBe('https://images.example/a.png');
  expect(image.dataset.mrSrc).toBeUndefined();
  const r = renderMarkdown('', '![](https://images.example/a.png)\n', 'added');
  expect(r.content.querySelector('.mr-img-hold')!.textContent).toBe('image from images.exampleLoad');
  loadImage(r.content.querySelector('img')!);
  expect(r.content.querySelector('.mr-img-hold')).toBeNull();
});

it('sanitises resource-bearing MathML and SVG while keeping local SVG references', () => {
  const frag = sanitize(document, '<math><mglyph src="https://evil.example/a"></mglyph></math><svg><use href="https://evil.example/a#x"></use><use href="#local"></use><a href="https://example.com">link</a></svg>');
  expect(frag.querySelector('mglyph')!.hasAttribute('src')).toBe(false);
  const uses = frag.querySelectorAll('use');
  // DOMPurify may drop use altogether; no external resource reference may survive.
  expect([...uses].every((el) => !el.getAttribute('href') || el.getAttribute('href')!.startsWith('#'))).toBe(true);
  expect(frag.querySelector('svg a')!.getAttribute('href')).toBe('https://example.com');
});

it('keeps removed loose and nested list items within valid document structure', () => {
  const r = renderMarkdown('Old introduction.\n\n- Parent\n  - Nested stable\n\n- Removed **loose** item\n\n- Kept item\n', '- Parent\n  - Nested stable\n\n- Kept item\n');
  expect(r.content.firstElementChild!.classList).toContain('mr-ghost');
  expect(r.content.firstElementChild!.textContent).toContain('Old introduction.');
  const removed = [...r.content.querySelectorAll('.mr-ghost')].find((e) => e.textContent?.includes('Removed'))!;
  expect(removed.tagName).toBe('LI');
  expect(removed.parentElement!.tagName).toBe('UL');
  expect(removed.querySelector('strong')!.textContent).toBe('loose');
  const last = renderMarkdown('- Kept\n- Deleted item\n', '- Kept\n');
  expect(last.content.querySelector('.mr-ghost-item')!.textContent).toContain('Deleted item');
});

it('shows table rows inserted before a paired edit and added cells without losing unchanged cells', () => {
  const base = '| Name | Value |\n|---|---|\n| Shared row | 10 |\n';
  const head = '| Name | Value | More |\n|---|---|---|\n| Completely new | 77 | New |\n| Shared row | 20 | Added |\n';
  const r = renderMarkdown(base, head);
  expect(r.content.querySelector('.mr-row-added')!.textContent).toContain('Completely new');
  const row = r.content.querySelector('tbody tr:last-child')!;
  expect(row.querySelector('del')!.textContent).toBe('10');
  expect(row.querySelector('td:last-child ins')!.textContent).toBe('Added');
});

it('keeps deleted table rows before surviving rows and appends trailing deletions within the table', () => {
  const header = '| Name | Value |\n|---|---|\n';
  const r = renderMarkdown(`${header}| First removed | 11 |\n| Kept | 22 |\n| Last removed | 33 |\n`, `${header}| Kept | 22 |\n`);
  expect([...r.content.querySelectorAll('tbody tr')].map((row) => [[...row.querySelectorAll('td')].map((cell) => cell.textContent), row.classList.contains('mr-ghost-row')])).toEqual([
    [['First removed', '11'], true], [['Kept', '22'], false], [['Last removed', '33'], true],
  ]);
  expect(r.content.querySelector('tr:not(.mr-ghost-row) del, tr:not(.mr-ghost-row) ins')).toBeNull();
});

it('reports formatting-only code edits and empty documents without invented words or change targets', () => {
  const r = renderMarkdown('```js\nconst a = 1;\n```\n', '```javascript\nconst a = 1;\n```\n');
  expect(r.content.querySelector('.mr-subtle')).toBeTruthy();
  expect(r.content.querySelector('pre')!.textContent).toBe('const a = 1;');
  for (const status of ['added', 'removed', 'modified'] as const) {
    const empty = renderMarkdown('', '', status);
    expect(empty.words).toBe(0); expect(empty.blocks).toEqual([]); expect(empty.changes).toEqual([]);
  }
});

it('keeps inline relative comment images and explicitly permitted external images readable', () => {
  const frag = renderSnippet(document, '![](relative.png)\n\n![](https://external.example/a.png)\n', 'https://gitlab.example', 'load');
  expect([...frag.querySelectorAll('img')].map((img) => img.getAttribute('src'))).toEqual(['relative.png', 'https://external.example/a.png']);
  expect(frag.querySelector('.mr-img-hold')).toBeNull();
});

it('resolves repository links, distinguishes unchanged duplicate destinations, and names empty image destinations', () => {
  const base = 'Read [guide](other.md#section), [stable](stable.md), and [guide](https://old.example).\n';
  const head = 'Read [guide](other.md#section), [stable](stable.md), and [guide](https://new.example) plus [new](new.md).\n';
  const r = renderMarkdown(base, head);
  expect(r.content.querySelector('a')!.getAttribute('href')).toBe('/blob/docs/other.md#section');
  expect(r.content.querySelectorAll('.mr-link-note')).toHaveLength(1);
  const image = renderMarkdown('<p>Logo <img></p>\n', '<p>Logo <img src="https://external.example/logo.png"></p>\n');
  expect(image.content.querySelector('.mr-link-note del')!.textContent).toBe('(none)');
  const gone = renderMarkdown('<p>Logo <img src="logo.png"></p>\n', '<p>Logo <img></p>\n');
  expect(gone.content.querySelector('.mr-link-note ins')!.textContent).toBe('(none)');
});
