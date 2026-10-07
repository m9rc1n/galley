import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { renderDocument } from '../src/ui/render.ts';
import type { DocStatus } from '../src/platforms/types.ts';

// One window for the whole file: the sanitiser is created once, for the first window it sees.
const { document } = new JSDOM('<!doctype html><html><body></body></html>').window;

function render(base: string, head: string, status: DocStatus = 'modified') {
  return renderDocument(document, {
    path: 'docs/a.md',
    status,
    base,
    head,
    links: { raw: (p) => `/raw/${p}`, blob: (p) => `/blob/${p}` },
    origin: 'https://gitlab.example',
  });
}

const marked = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('[data-mr-change]')];

test('raw HTML cannot borrow a block id to hide a real edit', () => {
  const decoy = '\n\n<p data-mr-u="1">Nothing to see here.</p>\n\n<p data-mr-u="0000000000000000:1">Nor here.</p>\n';
  const r = render(`Intro stays.\n\nThe transfer limit is 10 EUR.${decoy}`, `Intro stays.\n\nThe transfer limit is 99999 EUR.${decoy}`);
  const real = [...r.content.querySelectorAll('p')].find((p) => p.textContent?.includes('99999'))!;
  assert.equal(real.dataset.mrChange, 'modified');
  assert.equal(real.querySelector('ins')?.textContent, '99999');
  assert.deepEqual(marked(r.content), [real]);
  assert.deepEqual(r.stats, { added: 0, removed: 0, modified: 1 });
  // Forged ids are removed; real ones carry this render's nonce.
  for (const el of r.content.querySelectorAll<HTMLElement>('[data-mr-u]')) assert.match(el.dataset.mrU!, /^[0-9a-f]{16}:\d+$/);
  assert.equal(r.content.querySelectorAll('p:not([data-mr-u])').length, 2);
});

test('raw HTML cannot fake Galley banners or change markers, or hide text in Clean mode', () => {
  const r = render(
    'Text.\n',
    'Text.\n\n<p class="mr-banner is-added">Reviewed and approved by the security team</p>\n\n<p data-mr-change="removed" class="mr-ghost mr-ghost-item">This paragraph looks removed but is new.</p>\n\nInline <ins class="mr-ins">fake insertion</ins> and <del class="mr-del">fake deletion</del>.\n\n<div class="mr-content mr-flash mr-subtle mr-rewritten">x</div>\n',
  );
  assert.equal(r.content.querySelector('.mr-banner, .mr-ghost, .mr-ghost-item, .mr-ins, .mr-del, .mr-flash, .mr-subtle, .mr-rewritten'), null);
  assert.equal(r.content.querySelector('.mr-content'), null);
  assert.equal(r.content.querySelector('[data-mr-change="removed"]'), null);
  // The new blocks are reported as added, by Galley, and nothing else is marked.
  assert.deepEqual(r.stats, { added: 4, removed: 0, modified: 0 });
  assert.ok(marked(r.content).every((el) => el.dataset.mrChange === 'added' && el.parentElement === r.content));
  assert.ok([...r.content.querySelectorAll('[class]')].every((el) => el.getAttribute('class') !== ''));
});

test('only the data attributes Galley renders survive', () => {
  const r = render('', '<p data-mr-change="added" data-alert="Approved" data-foo="1" data-lang="x">a</p>\n\n```js\nx()\n```\n', 'added');
  const p = r.content.querySelector('p')!;
  assert.deepEqual(
    [...p.attributes].map((a) => a.name),
    ['data-lang'],
  );
  assert.equal(r.content.querySelector('pre')?.dataset.lang, 'js');
});

test('classes from Galley’s own markdown rendering still apply', () => {
  const md = [
    '---',
    'title: Spec',
    '---',
    '',
    '- [x] done',
    '- [ ] todo',
    '',
    '> [!WARNING]',
    '> Careful.',
    '',
    '> [!TIP]',
    '> Handy.',
    '',
    '| a | b |',
    '|---|---|',
    '| 1 | 2 |',
    '',
    'A claim.[^1]',
    '',
    '[^1]: The source.',
    '',
  ].join('\n');
  const r = render('', md, 'added');
  const has = (selector: string) => assert.ok(r.content.querySelector(selector), selector);
  has('details.mr-meta');
  has('li.mr-task-item > span.mr-tight > input.mr-task[type=checkbox][checked]');
  has('blockquote.mr-alert.mr-alert-warning');
  has('blockquote.mr-alert.mr-alert-tip');
  has('div.mr-table > table');
  has('sup.footnote-ref');
  has('section.footnotes > ol.footnotes-list > li.footnote-item');
  has('a.footnote-backref');
  // An allowed class keeps its place next to stripped ones.
  const mixed = render('', '<div class="mr-alert mr-banner">x</div>\n', 'added').content.querySelector('.mr-html > div')!;
  assert.equal(mixed.className, 'mr-alert');
});

test('removed blocks and rewritten blocks carry no block ids', () => {
  const r = render('# Title\n\nGone paragraph.\n\nKept.\n\nOld wording entirely.\n', '# Title\n\nKept.\n\nCompletely different sentence here.\n');
  const ghosts = [...r.content.querySelectorAll<HTMLElement>('.mr-ghost')];
  assert.ok(ghosts.length >= 2);
  for (const ghost of ghosts) {
    assert.equal(ghost.dataset.mrChange, 'removed');
    assert.equal(ghost.querySelector('[data-mr-u]'), null);
  }
});

test('the sanitiser still removes script vectors', () => {
  const r = render(
    '',
    '[a](javascript:alert(1))\n\n<a href="javascript:alert(2)">b</a> <img src=x onerror="alert(3)"> <svg><script>alert(4)</script></svg> <math><mtext><table><mglyph><style><img src=x onerror=alert(5)>\n\n<iframe src="https://example.com"></iframe><form><button>Go</button></form><p style="position:fixed">x</p>\n',
    'added',
  );
  // markdown-it leaves the markdown link as text; the HTML link loses its href.
  assert.ok([...r.content.querySelectorAll('a')].every((a) => !/^javascript:/i.test(a.getAttribute('href') ?? '')));
  assert.equal(r.content.querySelectorAll('[onerror], script, style, iframe, form, button, [style]').length, 0);
});

test('a changed reference definition marks every block that uses it, and names the new target', () => {
  const r = render('Download the [installer][dl].\n\n[dl]: https://good.example/setup.sh\n', 'Download the [installer][dl].\n\n[dl]: https://evil.example/setup.sh\n');
  assert.deepEqual(r.stats, { added: 0, removed: 0, modified: 1 });
  const note = r.content.querySelector('.mr-link-note')!;
  assert.equal(note.querySelector('del')!.textContent, 'https://good.example/setup.sh');
  assert.equal(note.querySelector('ins')!.textContent, 'https://evil.example/setup.sh');
  assert.equal(r.content.querySelector('p')!.dataset.mrChange, 'modified');
  assert.equal(r.content.querySelector('.mr-subtle'), null);
});

test('an inline link or image whose text stays the same gets a visible destination note', () => {
  const link = render('Get the [installer](https://good.example/a.sh) here.\n', 'Get the [installer](https://evil.example/a.sh) here.\n');
  assert.match(link.content.querySelector('.mr-link-note')!.textContent!, /Link changed.*good\.example.*→.*evil\.example/);
  const image = render('![Logo](logo-old.png)\n', '![Logo](logo-new.png)\n');
  assert.match(image.content.querySelector('.mr-link-note')!.textContent!, /Image changed/);
  // Edited text plus a new destination: both the word change and the destination are shown.
  const both = render('Read [the guide](https://a.example) now.\n', 'Read [the guide](https://b.example) today.\n');
  assert.ok(both.content.querySelector('ins.mr-ins'));
  assert.ok(both.content.querySelector('.mr-link-note'));
});

test('indentation changes inside code blocks are changes', () => {
  const r = render('```yaml\nsteps:\n    if: always()\n```\n', '```yaml\nsteps:\nif: always()\n```\n');
  assert.deepEqual(r.stats, { added: 0, removed: 0, modified: 1 });
  assert.equal(r.content.querySelector('del.mr-line')!.textContent, '    if: always()');
  assert.equal(r.content.querySelector('ins.mr-line')!.textContent, 'if: always()');
  // Re-wrapping prose is still not a change.
  assert.deepEqual(render('One two\nthree.\n', 'One\ntwo three.\n').stats, { added: 0, removed: 0, modified: 0 });
});

test('external images wait for a click; platform, repository and inline images load', () => {
  const md = '![Pixel](https://tracker.example/p.gif)\n\n![Own](https://gitlab.example/uploads/a.png)\n\n![Repo](img/b.png)\n\n![Inline](data:image/gif;base64,R0lGODlhAQABAAAAACw=)\n';
  const r = render('', md, 'added');
  assert.equal(r.heldImages, 1);
  const [pixel, own, repo, inline] = [...r.content.querySelectorAll('img')];
  assert.equal(pixel.getAttribute('src'), null);
  assert.equal(pixel.dataset.mrSrc, 'https://tracker.example/p.gif');
  assert.match(r.content.querySelector('.mr-img-hold')!.textContent!, /image from tracker\.example/);
  assert.equal(own.getAttribute('src'), 'https://gitlab.example/uploads/a.png');
  assert.equal(repo.getAttribute('src'), '/raw/docs/img/b.png');
  assert.match(inline.getAttribute('src')!, /^data:image\/gif/);
  const always = renderDocument(document, { path: 'docs/a.md', status: 'added', base: '', head: md, links: { raw: (p) => p, blob: (p) => p }, origin: 'https://gitlab.example', images: 'load' });
  assert.equal(always.heldImages, 0);
  assert.equal(always.content.querySelector('img')!.getAttribute('src'), 'https://tracker.example/p.gif');
});

test('documents cannot load anything except through held images', () => {
  const r = render(
    '',
    [
      '<picture><source srcset="https://t.example/1.png"><img src="https://t.example/2.png" srcset="https://t.example/3.png 2x"></picture>',
      '',
      '<video src="https://t.example/v.mp4" poster="https://t.example/poster.png"></video><audio src="https://t.example/a.mp3"></audio>',
      '',
      '<table background="https://t.example/bg.png"><tr><td background="https://t.example/td.png">x</td></tr></table>',
      '',
      '<input type="image" src="https://t.example/input.png"> <a href="https://ok.example" ping="https://t.example/ping">link</a>',
      '',
      '<svg><image href="https://t.example/svg.png"/><use href="https://t.example/sprite.svg#a"/><use href="#local"/></svg>',
      '',
    ].join('\n'),
    'added',
  );
  // The only remaining tracker URL is the held <img> (and its label's tooltip).
  const urls = new Set(r.content.innerHTML.match(/https:\/\/t\.example\/[\w./#]+/g));
  assert.deepEqual([...urls], ['https://t.example/2.png']);
  assert.equal(r.content.querySelectorAll('img').length, 1);
  assert.equal(r.content.querySelector('img')!.dataset.mrSrc, 'https://t.example/2.png');
  assert.equal(r.content.querySelector('img')!.getAttribute('src'), null);
  assert.equal(r.content.querySelector('input')!.getAttribute('src'), null);
  assert.equal(r.content.querySelector('[srcset], [poster], [background], [ping], video, audio, source, use'), null);
  assert.equal(r.content.querySelector('svg image')!.getAttribute('href'), null);
});

test('changed source lines that render nowhere are counted', () => {
  assert.equal(render('Policy text.\n\n<!-- reviewed: security -->\n', 'Policy text.\n\n<!-- TODO: disable the check -->\n').hiddenLines, 2);
  assert.equal(render('A [x][d].\n\n[d]: https://a.example\n', 'A [x][d].\n\n[d]: https://b.example\n').hiddenLines, 2);
  // Visible edits and re-wrapped prose are not hidden changes.
  assert.equal(render('One two three.\n', 'One two four.\n').hiddenLines, 0);
  assert.equal(render('One two\nthree.\n', 'One\ntwo three.\n').hiddenLines, 0);
});

test('hostile documents cannot freeze the reader', () => {
  const time = (fn: () => void) => {
    const start = performance.now();
    fn();
    return performance.now() - start;
  };
  // Each of these took seconds to forever before the fixes.
  assert.ok(time(() => render('x\n', `${'<!--a-->'.repeat(40)}x\n`)) < 1000);
  assert.ok(time(() => render('x\n', `<div>${'<a'.repeat(40_000)}</div>\n`)) < 1000);
  const words = (prefix: string) => Array.from({ length: 6000 }, (_, i) => `${prefix}${i}`).join(' ');
  assert.ok(time(() => render(`${words('a')}\n`, `${words('b')}\n`)) < 3000);
  // jsdom is far slower than Chrome (4,000 edited paragraphs render in ~1 s there); keep this small.
  const paragraphs = (prefix: string) => Array.from({ length: 800 }, (_, i) => `${prefix} paragraph ${i}.`).join('\n\n');
  assert.ok(time(() => render(paragraphs('Old'), paragraphs('New'))) < 5000);
  assert.throws(() => render('', 'x'.repeat(2_000_001), 'added'), /too large/);
});

test('comment bodies go through the document sanitiser and image rules', async () => {
  const { renderSnippet } = await import('../src/ui/render.ts');
  const frag = renderSnippet(document, 'Hi <img src=x onerror=alert(1)> <script>alert(2)</script> [site](https://ok.example) ![p](https://t.example/p.gif) <p class="mr-banner" data-mr-change="added">x</p> [jump](#top)', 'https://gitlab.example');
  const box = document.createElement('div');
  box.append(frag);
  assert.equal(box.querySelectorAll('script, [onerror], .mr-banner, [data-mr-change]').length, 0);
  const link = box.querySelector('a[href]')!;
  assert.equal(link.getAttribute('href'), 'https://ok.example');
  assert.equal(link.getAttribute('rel'), 'noopener noreferrer');
  assert.equal(box.querySelector('img[data-mr-src]')!.getAttribute('src'), null);
  assert.ok(box.querySelector('.mr-img-hold'));
  assert.equal(box.querySelectorAll('a').length, 2);
  assert.equal([...box.querySelectorAll('a')][1].getAttribute('href'), null);
});
