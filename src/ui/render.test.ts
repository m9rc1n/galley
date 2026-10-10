// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { renderMarkdown } from '../testing/render.ts';
import { platformLink, renderDocument, renderSnippet } from './render.ts';

const marked = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('[data-mr-change]')];
const cellText = (row: Element) => [...row.querySelectorAll('td')].map((cell) => cell.textContent?.trim());

it('raw HTML cannot borrow a block id to hide a real edit', () => {
  const decoy = '\n\n<p data-mr-u="1">Nothing to see here.</p>\n\n<p data-mr-u="0000000000000000:1">Nor here.</p>\n';
  const r = renderMarkdown(`Intro stays.\n\nThe transfer limit is 10 EUR.${decoy}`, `Intro stays.\n\nThe transfer limit is 99999 EUR.${decoy}`);
  const real = [...r.content.querySelectorAll('p')].find((p) => p.textContent?.includes('99999'))!;
  expect(real.dataset.mrChange).toBe('modified');
  expect(real.querySelector('ins')?.textContent).toBe('99999');
  expect(marked(r.content)).toStrictEqual([real]);
  expect(r.stats).toStrictEqual({ added: 0, removed: 0, modified: 1 });
  // Forged ids are removed; real ones carry this render's nonce.
  for (const el of r.content.querySelectorAll<HTMLElement>('[data-mr-u]')) expect(el.dataset.mrU!).toMatch(/^[0-9a-f]{16}:\d+$/);
  expect(r.content.querySelectorAll('p:not([data-mr-u])').length).toBe(2);
});

it('raw HTML cannot fake Galley banners or change markers, or hide text in Clean mode', () => {
  const r = renderMarkdown(
    'Text.\n',
    'Text.\n\n<p class="mr-banner is-added">Reviewed and approved by the security team</p>\n\n<p data-mr-change="removed" class="mr-ghost mr-ghost-item">This paragraph looks removed but is new.</p>\n\nInline <ins class="mr-ins">fake insertion</ins> and <del class="mr-del">fake deletion</del>.\n\n<div class="mr-content mr-flash mr-subtle mr-rewritten">x</div>\n',
  );
  expect(r.content.querySelector('.mr-banner, .mr-ghost, .mr-ghost-item, .mr-ins, .mr-del, .mr-flash, .mr-subtle, .mr-rewritten')).toBe(null);
  expect(r.content.querySelector('.mr-content')).toBe(null);
  expect(r.content.querySelector('[data-mr-change="removed"]')).toBe(null);
  // The new blocks are reported as added, by Galley, and nothing else is marked.
  expect(r.stats).toStrictEqual({ added: 4, removed: 0, modified: 0 });
  expect(marked(r.content).every((el) => el.dataset.mrChange === 'added' && el.parentElement === r.content)).toBeTruthy();
  expect([...r.content.querySelectorAll('[class]')].every((el) => el.getAttribute('class') !== '')).toBeTruthy();
});

it('only the data attributes Galley renders survive', () => {
  const r = renderMarkdown('', '<p data-mr-change="added" data-alert="Approved" data-foo="1" data-lang="x">a</p>\n\n```js\nx()\n```\n', 'added');
  const p = r.content.querySelector('p')!;
  expect([...p.attributes].map((a) => a.name)).toStrictEqual(['data-lang']);
  expect(r.content.querySelector('pre')?.dataset.lang).toBe('js');
});

it('classes from Galley’s own markdown rendering still apply', () => {
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
  const r = renderMarkdown('', md, 'added');
  const has = (selector: string) => expect(r.content.querySelector(selector), selector).toBeTruthy();
  has('details.mr-meta');
  has('li.mr-task-item > span.mr-tight > input.mr-task[type=checkbox][checked]');
  has('blockquote.mr-alert.mr-alert-warning');
  has('blockquote.mr-alert.mr-alert-tip');
  has('div.mr-table > table');
  has('sup.footnote-ref');
  has('section.footnotes > ol.footnotes-list > li.footnote-item');
  has('a.footnote-backref');
  // An allowed class keeps its place next to stripped ones.
  const mixed = renderMarkdown('', '<div class="mr-alert mr-banner">x</div>\n', 'added').content.querySelector('.mr-html > div')!;
  expect(mixed.className).toBe('mr-alert');
});

it('removed blocks and rewritten blocks carry no block ids', () => {
  const r = renderMarkdown('# Title\n\nGone paragraph.\n\nKept.\n\nOld wording entirely.\n', '# Title\n\nKept.\n\nCompletely different sentence here.\n');
  const ghosts = [...r.content.querySelectorAll<HTMLElement>('.mr-ghost')];
  expect(ghosts.length >= 2).toBeTruthy();
  for (const ghost of ghosts) {
    expect(ghost.dataset.mrChange).toBe('removed');
    expect(ghost.querySelector('[data-mr-u]')).toBe(null);
  }
});

it('the sanitiser still removes script vectors', () => {
  const r = renderMarkdown(
    '',
    '[a](javascript:alert(1))\n\n<a href="javascript:alert(2)">b</a> <img src=x onerror="alert(3)"> <svg><script>alert(4)</script></svg> <math><mtext><table><mglyph><style><img src=x onerror=alert(5)>\n\n<iframe src="https://example.com"></iframe><form><button>Go</button></form><p style="position:fixed">x</p>\n',
    'added',
  );
  // markdown-it leaves the markdown link as text; the HTML link loses its href.
  expect([...r.content.querySelectorAll('a')].every((a) => !/^javascript:/i.test(a.getAttribute('href') ?? ''))).toBeTruthy();
  expect(r.content.querySelectorAll('[onerror], script, style, iframe, form, button, [style]').length).toBe(0);
});

it('a changed reference definition marks every block that uses it, and names the new target', () => {
  const r = renderMarkdown(
    'Download the [installer][dl].\n\n[dl]: https://good.example/setup.sh\n',
    'Download the [installer][dl].\n\n[dl]: https://evil.example/setup.sh\n',
  );
  expect(r.stats).toStrictEqual({ added: 0, removed: 0, modified: 1 });
  const note = r.content.querySelector('.mr-link-note')!;
  expect(note.querySelector('del')!.textContent).toBe('https://good.example/setup.sh');
  expect(note.querySelector('ins')!.textContent).toBe('https://evil.example/setup.sh');
  expect(r.content.querySelector('p')!.dataset.mrChange).toBe('modified');
  expect(r.content.querySelector('.mr-subtle')).toBe(null);
});

it('an inline link or image whose text stays the same gets a visible destination note', () => {
  const link = renderMarkdown('Get the [installer](https://good.example/a.sh) here.\n', 'Get the [installer](https://evil.example/a.sh) here.\n');
  expect(link.content.querySelector('.mr-link-note')!.textContent!).toMatch(/Link changed.*good\.example.*→.*evil\.example/);
  const image = renderMarkdown('![Logo](logo-old.png)\n', '![Logo](logo-new.png)\n');
  expect(image.content.querySelector('.mr-link-note')!.textContent!).toMatch(/Image changed/);
  // Edited text plus a new destination: both the word change and the destination are shown.
  const both = renderMarkdown('Read [the guide](https://a.example) now.\n', 'Read [the guide](https://b.example) today.\n');
  expect(both.content.querySelector('ins.mr-ins')).toBeTruthy();
  expect(both.content.querySelector('.mr-link-note')).toBeTruthy();
});

it('indentation changes inside code blocks are changes', () => {
  const r = renderMarkdown('```yaml\nsteps:\n    if: always()\n```\n', '```yaml\nsteps:\nif: always()\n```\n');
  expect(r.stats).toStrictEqual({ added: 0, removed: 0, modified: 1 });
  expect(r.content.querySelector('del.mr-line')!.textContent).toBe('    if: always()');
  expect(r.content.querySelector('ins.mr-line')!.textContent).toBe('if: always()');
  // Re-wrapping prose is still not a change.
  expect(renderMarkdown('One two\nthree.\n', 'One\ntwo three.\n').stats).toStrictEqual({ added: 0, removed: 0, modified: 0 });
});

it('table edits highlight only the changed cell and preserve neighbouring values and markup', () => {
  const base = '| Plan | Limit | Notes |\n|---|---|---|\n| Starter | 10 | Keep |\n| Team | 20 | **Shared** |\n| Enterprise | 50 | Private |\n';
  const r = renderMarkdown(base, base.replace('| Team | 20 |', '| Team | 25 |'));
  const rows = [...r.content.querySelectorAll('tbody tr')];
  expect(r.stats).toEqual({ added: 0, removed: 0, modified: 1 });
  expect(r.content.querySelector('.mr-table')?.getAttribute('data-mr-change')).toBe('modified');
  const team = rows[1].querySelectorAll('td');
  expect(team[1].querySelector('del')?.textContent).toBe('20');
  expect(team[1].querySelector('ins')?.textContent).toBe('25');
  expect(team[0].textContent).toBe('Team');
  expect(team[2].querySelector('strong')?.textContent).toBe('Shared');
  expect(team[0].querySelector('ins, del')).toBeNull();
  expect(team[2].querySelector('ins, del')).toBeNull();
  expect(cellText(rows[0])).toEqual(['Starter', '10', 'Keep']);
  expect(cellText(rows[2])).toEqual(['Enterprise', '50', 'Private']);
  expect(r.content.querySelectorAll('ins, del')).toHaveLength(2);
});

it('retains deleted table rows in their original position and distinguishes newly added rows', () => {
  const header = '| Name | Detail |\n|---|---|\n';
  const first = '| First | First detail |\n',
    last = '| Last | Last detail |\n';
  const r = renderMarkdown(`${header}${first}| Removed | Obsolete policy |\n${last}`, `${header}${first}${last}| New | New policy |\n`);
  const rows = [...r.content.querySelectorAll('tbody tr')];
  expect(rows.map((row) => row.firstElementChild?.textContent)).toEqual(['First', 'Removed', 'Last', 'New']);
  expect(rows[1].classList).toContain('mr-ghost-row');
  expect(cellText(rows[1])).toEqual(['Removed', 'Obsolete policy']);
  expect(rows[3].classList).toContain('mr-row-added');
  expect(rows[0].querySelector('ins, del')).toBeNull();
  expect(rows[2].querySelector('ins, del')).toBeNull();
});

it('retains a deleted final table row and names changed link destinations even when cell text stays the same', () => {
  const header = '| Name | Reference |\n|---|---|\n';
  const row = '| Policy | [Read](https://good.example/policy) |\n';
  const r = renderMarkdown(`${header}${row}| Retired | Legacy guidance |\n`, header + row.replace('good.example', 'new.example'));
  expect(r.content.querySelector('tbody tr:last-child')?.classList).toContain('mr-ghost-row');
  expect(cellText(r.content.querySelector('tbody tr:last-child')!)).toEqual(['Retired', 'Legacy guidance']);
  const note = r.content.querySelector('.mr-link-note')!;
  expect(note.querySelector('del')?.textContent).toBe('https://good.example/policy');
  expect(note.querySelector('ins')?.textContent).toBe('https://new.example/policy');
  expect(r.content.querySelector('tbody tr:first-child a')?.getAttribute('href')).toBe('https://new.example/policy');
});

it('external images wait for a click; platform, repository and inline images load', () => {
  const md =
    '![Pixel](https://tracker.example/p.gif)\n\n![Own](https://gitlab.example/uploads/a.png)\n\n![Repo](img/b.png)\n\n![Inline](data:image/gif;base64,R0lGODlhAQABAAAAACw=)\n';
  const r = renderMarkdown('', md, 'added');
  expect(r.heldImages).toBe(1);
  const [pixel, own, repo, inline] = [...r.content.querySelectorAll('img')];
  expect(pixel.getAttribute('src')).toBe(null);
  expect(pixel.dataset.mrSrc).toBe('https://tracker.example/p.gif');
  expect(r.content.querySelector('.mr-img-hold')!.textContent!).toMatch(/image from tracker\.example/);
  expect(own.getAttribute('src')).toBe('https://gitlab.example/uploads/a.png');
  expect(repo.getAttribute('src')).toBe('/raw/docs/img/b.png');
  expect(inline.getAttribute('src')!).toMatch(/^data:image\/gif/);
  const always = renderDocument(document, {
    path: 'docs/a.md',
    status: 'added',
    base: '',
    head: md,
    links: { raw: (p) => p, blob: (p) => p },
    origin: 'https://gitlab.example',
    images: 'load',
  });
  expect(always.heldImages).toBe(0);
  expect(always.content.querySelector('img')!.getAttribute('src')).toBe('https://tracker.example/p.gif');
});

it('documents cannot load anything except through held images', () => {
  const r = renderMarkdown(
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
  expect([...urls]).toStrictEqual(['https://t.example/2.png']);
  expect(r.content.querySelectorAll('img')).toHaveLength(1);
  expect(r.content.querySelector('img')!.dataset.mrSrc).toBe('https://t.example/2.png');
  expect(r.content.querySelector('img')!.getAttribute('src')).toBe(null);
  expect(r.content.querySelector('input')!.getAttribute('src')).toBe(null);
  expect(r.content.querySelector('[srcset], [poster], [background], [ping], video, audio, source, use')).toBe(null);
  expect(r.content.querySelector('svg image')!.getAttribute('href')).toBe(null);
});

it('changed source lines that render nowhere are counted', () => {
  expect(renderMarkdown('Policy text.\n\n<!-- reviewed: security -->\n', 'Policy text.\n\n<!-- TODO: disable the check -->\n').hiddenLines).toBe(2);
  expect(renderMarkdown('A [x][d].\n\n[d]: https://a.example\n', 'A [x][d].\n\n[d]: https://b.example\n').hiddenLines).toBe(2);
  // Visible edits and re-wrapped prose are not hidden changes.
  expect(renderMarkdown('One two three.\n', 'One two four.\n').hiddenLines).toBe(0);
  expect(renderMarkdown('One two\nthree.\n', 'One\ntwo three.\n').hiddenLines).toBe(0);
});

it('hostile documents cannot freeze the reader', () => {
  const time = (fn: () => void) => {
    const start = performance.now();
    fn();
    return performance.now() - start;
  };
  // Each of these took seconds to forever before the fixes.
  expect(time(() => renderMarkdown('x\n', `${'<!--a-->'.repeat(40)}x\n`)) < 1000).toBeTruthy();
  expect(time(() => renderMarkdown('x\n', `<div>${'<a'.repeat(40_000)}</div>\n`)) < 1000).toBeTruthy();
  const words = (prefix: string) => Array.from({ length: 6000 }, (_, i) => `${prefix}${i}`).join(' ');
  expect(time(() => renderMarkdown(`${words('a')}\n`, `${words('b')}\n`)) < 3000).toBeTruthy();
  expect(() => renderMarkdown('', 'x'.repeat(2_000_001), 'added')).toThrow(/too large/);
});

it('preserves every old and new paragraph when rendering a large document', () => {
  // jsdom DOM allocation under coverage varies with shared-runner load. Keep this an integration
  // check; core/limits.test.ts separately checks that 40,000-element diffs stay within their budget.
  const paragraphs = (prefix: string) => Array.from({ length: 400 }, (_, i) => `${prefix} paragraph ${i}.`);
  const base = paragraphs('Old'),
    head = paragraphs('New');
  const r = renderMarkdown(base.join('\n\n'), head.join('\n\n'));
  const rows = [...r.content.querySelectorAll('p')];
  expect(rows).toHaveLength(head.length);
  expect(r.stats).toEqual({ added: 0, removed: 0, modified: head.length });
  const version = (omit: 'ins' | 'del') =>
    rows.map((row) => {
      const clone = row.cloneNode(true) as HTMLElement;
      for (const mark of clone.querySelectorAll(omit)) mark.remove();
      return clone.textContent;
    });
  expect(version('ins')).toEqual(base);
  expect(version('del')).toEqual(head);
});

it('comment bodies go through the document sanitiser and image rules', () => {
  const frag = renderSnippet(
    document,
    'Hi <img src=x onerror=alert(1)> <script>alert(2)</script> [site](https://ok.example) ![p](https://t.example/p.gif) <p class="mr-banner" data-mr-change="added">x</p> [jump](#top)',
    'https://gitlab.example',
  );
  const box = document.createElement('div');
  box.append(frag);
  expect(box.querySelectorAll('script, [onerror], .mr-banner, [data-mr-change]').length).toBe(0);
  const link = box.querySelector('a[href]')!;
  expect(link.getAttribute('href')).toBe('https://ok.example');
  expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  expect(box.querySelector('img[data-mr-src]')!.getAttribute('src')).toBe(null);
  expect(box.querySelector('.mr-img-hold')).toBeTruthy();
  expect(box.querySelectorAll('a')).toHaveLength(2);
  expect([...box.querySelectorAll('a')][1].getAttribute('href')).toBe(null);
});

it('document ids and names cannot collide with the reader’s own ids', () => {
  const r = renderMarkdown(
    '',
    '# MR comment status\n\n<p id="mr-comment">x</p><a name="mr-code-label">y</a>\n\nSee[^1] and <span id="user-content-kept">z</span>.\n\n[^1]: Note.\n',
    'added',
  );
  const ids = [...r.content.querySelectorAll('[id]')].map((el) => el.id);
  expect(ids).toContain('user-content-mr-comment-status');
  expect(ids).toContain('user-content-mr-comment');
  expect(ids).toContain('user-content-kept');
  expect(ids.every((id) => id.startsWith('user-content-'))).toBe(true);
  expect(r.content.querySelector('a[name]')!.getAttribute('name')).toBe('user-content-mr-code-label');
  // Footnote links still find their targets the way the reader resolves #fragments.
  for (const link of r.content.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')) {
    const id = decodeURIComponent(link.getAttribute('href')!.slice(1));
    expect(
      ids.some((candidate) => candidate === id || candidate === `user-content-${id}`),
      id,
    ).toBe(true);
  }
});

it('links built from platform data stay on the platform', () => {
  const origin = 'https://gitlab.example';
  expect(platformLink('https://gitlab.example/g/p/-/merge_requests/1#note_5', origin)).toBe('https://gitlab.example/g/p/-/merge_requests/1#note_5');
  expect(platformLink('#thread-1', origin)).toBe('#thread-1');
  for (const url of [
    'javascript:alert(1)',
    'data:text/html,x',
    'https://evil.example/',
    'https://gitlab.example.evil.example/',
    'http://gitlab.example/',
    '//evil.example',
    '# x',
    'not a url',
  ]) {
    expect(platformLink(url, origin), url).toBe(null);
  }
});

it('very long comment bodies are shortened before rendering', () => {
  const box = document.createElement('div');
  box.append(renderSnippet(document, `${'word '.repeat(20_000)}TAIL`, 'https://gitlab.example'));
  expect(box.textContent).not.toContain('TAIL');
  expect(box.textContent!.length).toBeLessThan(66_000);
  expect(box.lastElementChild!.textContent).toContain('Open it on the platform');
  const short = document.createElement('div');
  short.append(renderSnippet(document, 'Fine', 'https://gitlab.example'));
  expect(short.textContent!.trim()).toBe('Fine');
  expect(short.children).toHaveLength(1);
});

it('a removed code block keeps its place inside the list it was part of', () => {
  const r = renderMarkdown('- First\n\n  ```js\n  const gone = true;\n  ```\n\n- Second\n', '- First\n\n- Second\n');
  const ghost = r.content.querySelector<HTMLElement>('li.mr-ghost')!;
  expect(ghost.querySelector('pre')!.textContent).toContain('const gone = true;');
  expect(ghost.nextElementSibling!.textContent).toContain('Second');
});

it('a removed block goes above the outermost list when the next live block sits in a nested one', () => {
  const r = renderMarkdown('Removed intro.\n\n- - Nested\n', '- - Nested\n');
  const ghost = r.content.querySelector<HTMLElement>('.mr-ghost')!;
  expect(ghost.textContent).toContain('Removed intro.');
  expect(ghost.nextElementSibling!.tagName).toBe('UL');
  expect(r.content.querySelectorAll('ul .mr-ghost')).toHaveLength(0);
});

it('compares a code block without a language line by line', () => {
  const r = renderMarkdown('```\nfirst\nold line\nlast\n```\n', '```\nfirst\nnew line\nlast\n```\n');
  expect(r.blocks.some((block) => block.kind === 'modified')).toBe(true);
  expect(r.content.querySelector('pre')!.dataset.lang).toBeUndefined();
  expect(r.content.querySelectorAll('.mr-line, .mr-cl').length).toBeGreaterThan(3);
});

it('copes with an HTML block the sanitiser drops entirely', () => {
  const r = renderMarkdown('Intro.\n', '<frameset></frameset>\n');
  expect(r.content.querySelector('frameset')).toBeNull();
  expect(r.blocks).toHaveLength(1);
});

it('keeps a changed diagram next to the other changes in the reading order', () => {
  const diagram = (edge: string) => `\`\`\`mermaid\nflowchart LR\n  A --> ${edge}\n\`\`\`\n`;
  const r = renderMarkdown(`Intro text here.\n\nA stable paragraph.\n\n${diagram('B')}`, `Intro text changed here.\n\nA stable paragraph.\n\n${diagram('C')}`);
  expect(r.diagrams).toHaveLength(1);
  expect(r.changes).toHaveLength(2);
  expect(r.changes).toContain(r.diagrams[0].el);
  expect(r.changes[0].textContent).toContain('Intro');
});

it('a removed heading or block keeps neither its anchor id nor a block id that raw HTML tried to forge', () => {
  // The sanitiser lets block ids through (it must), so the removed block is cleaned afterwards.
  const forged = `<div data-mr-u='1234:9' id="forged">Gone block</div>`;
  const r = renderMarkdown(`Keep.\n\n## Gone heading\n\n${forged}\n`, 'Keep.\n');
  const ghosts = [...r.content.querySelectorAll('.mr-ghost')];
  expect(ghosts.map((ghost) => ghost.textContent).join(' ')).toContain('Gone heading');
  expect(ghosts.map((ghost) => ghost.textContent).join(' ')).toContain('Gone block');
  expect(r.content.querySelectorAll('.mr-ghost [id], .mr-ghost [data-mr-u]')).toHaveLength(0);
});

it('a heading in a comment cannot take an anchor id from the document', () => {
  const frag = renderSnippet(document, '## Title\n\nBody', location.origin);
  expect(frag.querySelector('h2')!.textContent).toBe('Title');
  expect(frag.querySelectorAll('[id]')).toHaveLength(0);
});

it('shows emoji shortcodes as the emoji, in documents and comments, but not in code or as emoticons', () => {
  const r = renderMarkdown('Ship it.\n', 'Ship it :rocket: :+1: :)\n\n`:smile:` and :not_an_emoji:\n');
  const text = r.content.textContent!;
  expect(text).toContain('🚀 👍 :)');
  expect(r.content.querySelector('code')!.textContent).toBe(':smile:');
  expect(text).toContain(':not_an_emoji:');
  // The edit reads as words: the shortcodes became emoji in the new version.
  expect(r.content.querySelector('ins')!.textContent).toContain('🚀');
  const comment = document.createElement('div');
  comment.append(renderSnippet(document, 'Looks good :tada:', 'https://gitlab.example'));
  expect(comment.textContent!.trim()).toBe('Looks good 🎉');
});
