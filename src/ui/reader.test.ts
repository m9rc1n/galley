import { expect, it, vi } from 'vitest';
import { ReaderError, type CommentPlan, type CommentTarget, type DocContents, type Thread } from '../platforms/types.ts';
import { contents, deferred, guide, readerHarness, review } from '../testing/reader.ts';
import { openReader } from './reader.ts';

const ui = readerHarness();

it('source files retain native diff lines without the Markdown change gutter or contents', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ codeFiles: true }));
  const code = { path: 'src/main.ts', oldPath: 'src/main.ts', kind: 'code' as const, status: 'modified' as const };
  await ui.open(review({ docs: [], codeDocs: [code], load: async () => ({ base: 'const value = 1;\n', head: 'const value = 2;\n' }) }));
  expect(ui.q('.mr-code-file')).toBeTruthy();
  expect(ui.shadow().querySelectorAll('.mr-code-line[data-mr-change]')).toHaveLength(2);
  expect(ui.shadow().querySelectorAll('.mr-mark')).toHaveLength(0);
  expect(ui.q('.mr-toc').childElementCount).toBe(0);
  expect(ui.q('.mr-root').classList.contains('has-rail')).toBe(true);
});

it('opens a modal, replaces an existing reader, and restores the page focus and scrolling on close', async () => {
  const page = document.createElement('button');
  document.body.append(page);
  page.focus();
  document.documentElement.style.overflow = 'clip';
  const closed = vi.fn();
  await ui.open(review(), { onClose: closed });
  expect(document.documentElement.style.overflow).toBe('hidden');
  expect(ui.q('.mr-root').getAttribute('aria-modal')).toBe('true');
  const second = openReader(review());
  expect(closed).toHaveBeenCalledOnce();
  expect(document.querySelectorAll('#galley-reader')).toHaveLength(1);
  second.close();
  second.close();
  expect(document.activeElement).toBe(page);
  expect(document.documentElement.style.overflow).toBe('clip');
  expect(ui.disconnect).toHaveBeenCalledTimes(2);
});

it('renders all documents continuously, folds unchanged context by default, and reveals it locally', async () => {
  const second = { ...guide, path: 'docs/second.md' };
  const source = review({ docs: [guide, second] });
  await ui.open(source);
  expect(source.load).toHaveBeenCalledTimes(2);
  expect(ui.shadow().querySelectorAll('.mr-document')).toHaveLength(2);
  expect(ui.q('.mr-count').textContent).toBe('1 of 2');
  const unchanged = ui.q('.mr-content p');
  expect(unchanged.hidden).toBe(true);
  ui.click('.mr-context-toggle');
  expect(unchanged.hidden).toBe(false);
  ui.click('.mr-context-toggle');
  expect(unchanged.hidden).toBe(true);
  ui.click('[data-scope="all"]');
  expect(unchanged.hidden).toBe(false);
  expect(ui.q('.mr-context-toggle')).toBeNull();
  ui.click('[data-act="files"]');
  expect(ui.q('.mr-files').hidden).toBe(false);
  ui.click('[data-act="doc"][data-doc="1"]');
  expect(ui.q('.mr-file-name').textContent).toBe('second.md');
  expect(ui.q('.mr-files').hidden).toBe(true);
});

it('loads no more than three documents at a time and retains the requested starting file', async () => {
  const pending = Array.from({ length: 5 }, () => deferred<DocContents>());
  const docs = pending.map((_, i) => ({ ...guide, path: `${i}.md` }));
  const load = vi.fn((doc) => pending[docs.indexOf(doc)].promise);
  const handle = openReader(review({ docs, load }), { start: 4 });
  try {
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(3));
    pending[0].resolve(contents);
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(4));
    pending[1].resolve(contents);
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(5));
    pending.forEach((p) => {
      p.resolve(contents);
    });
    await vi.waitFor(() => expect(ui.q('.mr-skeleton')).toBeNull());
    expect(ui.q('.mr-file-name').textContent).toBe('4.md');
  } finally {
    handle.close();
  }
});

it('keeps other documents readable after a load failure and retries only the failed document', async () => {
  const other = { ...guide, path: 'ok.md' };
  const load = vi.fn().mockRejectedValueOnce(new Error('Rate limit')).mockResolvedValue(contents);
  await ui.open(review({ docs: [guide, other], load }));
  expect(ui.q('.mr-message').textContent).toContain('Rate limit');
  expect(ui.q('.mr-message a').getAttribute('href')).toContain('/diffs');
  expect(ui.q('[data-document="1"] .mr-content')).toBeTruthy();
  ui.click('[data-act="retry-doc"]');
  await vi.waitFor(() => expect(ui.q('.mr-message')).toBeNull());
  expect(load).toHaveBeenCalledTimes(3);
  expect(load.mock.calls[2][0]).toBe(guide);
});

it('offers actionable token errors without inserting error HTML', async () => {
  await ui.open(Promise.reject(new ReaderError('<img onerror=evil()>', 'Save a token', true)));
  expect(ui.q('.mr-message h2').textContent).toBe('<img onerror=evil()>');
  expect(ui.q('.mr-message img')).toBeNull();
  expect(ui.q('.mr-message a').getAttribute('href')).toBe('https://github.com/settings/personal-access-tokens/new');
  ui.click('[data-act="close"]');
  expect(document.querySelector('#galley-reader')).toBeNull();
});

it('handles empty reviews and late source resolution after closing', async () => {
  await ui.open(review({ docs: [] }));
  expect(ui.q('.mr-message').textContent).toContain('No readable changes');
  const pending = deferred<ReturnType<typeof review>>();
  const handle = openReader(pending.promise);
  handle.close();
  const source = review();
  pending.resolve(source);
  await pending.promise;
  expect(source.load).not.toHaveBeenCalled();
  expect(document.querySelector('#galley-reader')).toBeNull();
});

it('loads optional code files only when enabled, after documents, and excludes them from navigation when disabled', async () => {
  const code = { path: 'src/main.ts', oldPath: 'src/main.ts', status: 'modified' as const, kind: 'code' as const };
  const load = vi.fn(async (doc) => (doc.kind === 'code' ? { base: 'const count = 1;', head: 'const count = 2;' } : contents));
  await ui.open(review({ codeDocs: [code], load }));
  expect(load).toHaveBeenCalledTimes(1);
  expect(ui.q('[data-document="1"]').hidden).toBe(true);
  ui.click('[data-act="code-files"]');
  await vi.waitFor(() => expect(ui.q('.mr-code-title')).toBeTruthy());
  expect(ui.q('[data-document="1"]').hidden).toBe(false);
  expect(ui.q('.mr-code-title').textContent).toBe('src/main.ts');
  ui.key(']');
  expect(ui.q('.mr-file-name').textContent).toBe('main.ts');
  ui.click('[data-act="code-files"]');
  expect(ui.q('.mr-file-name').textContent).toBe('guide.md');
  ui.key(']');
  expect(ui.q('.mr-file-name').textContent).toBe('guide.md');
});

it('offers settings for a code-only review and ignores enabling code when none is available', async () => {
  await ui.open(review());
  ui.click('[data-act="code-files"]');
  expect(ui.q('[data-act="code-files"]').getAttribute('aria-checked')).toBe('false');
  await ui.open(review({ docs: [], codeDocs: [{ ...guide, path: 'main.py', kind: 'code' }] }));
  expect(ui.q('.mr-empty-reader').hidden).toBe(false);
  expect(ui.q('.mr-file-btn').hidden).toBe(true);
  ui.click('[data-act="code-files"]');
  await vi.waitFor(() => expect(ui.q('.mr-code-title')).toBeTruthy());
  expect(ui.q('.mr-empty-reader').hidden).toBe(true);
});

it('traps focus in settings, persists appearance, and uses Escape to close the drawer before the reader', async () => {
  await ui.open(review());
  ui.click('[data-act="settings"]');
  expect(ui.q('.mr-main').inert).toBe(true);
  expect(ui.shadow().activeElement).toBe(ui.q('button[data-act="close-settings"]'));
  ui.key('Tab', { shiftKey: true });
  // Focus wraps to the last control of the open tab: the shortcuts have a tab of their own now.
  expect(ui.shadow().activeElement).toBe(ui.q('[data-act="larger"]'));
  ui.key('Tab');
  expect(ui.shadow().activeElement).toBe(ui.q('button[data-act="close-settings"]'));
  ui.click('[data-value="dark"]');
  const font = ui.q<HTMLSelectElement>('#mr-typeface');
  font.value = 'sans';
  font.dispatchEvent(new Event('change', { bubbles: true }));
  ui.click('[data-settings-tab="review"]');
  ui.click('[data-mode="clean"]');
  ui.click('[data-settings-tab="reading"]');
  for (let i = 0; i < 8; i++) ui.click('[data-act="larger"]');
  expect(ui.q('.mr-root').style.getPropertyValue('--body-size')).toBe('24px');
  for (let i = 0; i < 8; i++) ui.click('[data-act="smaller"]');
  expect(ui.q('.mr-root').style.getPropertyValue('--body-size')).toBe('17px');
  expect(ui.q('.mr-root').classList).toContain('is-dark');
  expect(JSON.parse(localStorage.getItem('galley:settings')!).font).toBe('sans');
  ui.key('Escape');
  expect(ui.q('.mr-main').inert).toBe(false);
  expect(ui.shadow().activeElement).toBe(ui.q('[data-act="settings"]'));
  ui.key('Escape');
  expect(document.querySelector('#galley-reader')).toBeNull();
});

it('groups reading, layout and review settings into keyboard-accessible tabs without exposing hidden controls', async () => {
  await ui.open(review());
  ui.click('[data-act="settings"]');
  expect(ui.q('#mr-reading-panel').hidden).toBe(false);
  expect(ui.q('#mr-layout-panel').hidden).toBe(true);
  expect(ui.q('#mr-review-panel').hidden).toBe(true);
  const reviewTab = ui.q('[data-settings-tab="review"]');
  reviewTab.focus();
  ui.key('ArrowLeft');
  expect(ui.shadow().activeElement).toBe(ui.q('[data-settings-tab="layout"]'));
  expect(ui.q('#mr-layout-panel').hidden).toBe(false);
  ui.key('ArrowLeft');
  expect(ui.shadow().activeElement).toBe(ui.q('[data-settings-tab="reading"]'));
  // The arrows wrap around, as in any tab list; the shortcuts are the last tab.
  ui.key('ArrowLeft');
  expect(ui.shadow().activeElement).toBe(ui.q('[data-settings-tab="keys"]'));
  expect(ui.q('#mr-keys-panel').hidden).toBe(false);
  ui.key('Home');
  expect(reviewTab.tabIndex).toBe(-1);
  ui.key('End');
  ui.key('ArrowLeft');
  expect(reviewTab.getAttribute('aria-selected')).toBe('true');
  expect(ui.q('#mr-reading-panel').hidden).toBe(true);
  expect(ui.q('#mr-review-panel').hidden).toBe(false);
  ui.key('Tab');
  expect(ui.shadow().activeElement).toBe(ui.q('[data-mode="changes"]'));
  ui.click('[data-settings-tab="reading"]');
  const font = ui.q<HTMLSelectElement>('#mr-typeface');
  font.value = 'georgia';
  font.dispatchEvent(new Event('change', { bubbles: true }));
  expect(ui.q('.mr-root').dataset.font).toBe('georgia');
  ui.click('[data-act="larger"]');
  expect(ui.q('.mr-text-size').textContent).toBe('22 px');
});

it('opens the review tab directly when a code-only review needs code files enabled', async () => {
  await ui.open(review({ docs: [], codeDocs: [{ ...guide, path: 'main.py', kind: 'code' }] }));
  ui.click('.mr-empty-reader [data-act="settings"]');
  expect(ui.q('#mr-review-panel').hidden).toBe(false);
  expect(ui.q('[data-settings-tab="review"]').getAttribute('aria-selected')).toBe('true');
});

it('lets the reader choose a layout and density, remembers both, and keeps comments below their text in Focus', async () => {
  const thread: Thread = {
    doc: guide,
    side: 'head',
    line: 5,
    url: '#thread',
    comments: [{ author: 'Dana', body: 'Question?', createdAt: new Date().toISOString(), url: '#thread' }],
  };
  await ui.open(review({ loadThreads: async () => [thread] }));
  ui.flushFrame();
  const root = ui.q('.mr-root');
  expect([root.dataset.layout, root.dataset.density]).toEqual(['balanced', 'comfortable']);
  expect(root.classList).toContain('has-rail');
  expect(ui.q('.mr-threads .mr-thread')).not.toBeNull();
  ui.click('[data-act="settings"]');
  ui.click('[data-settings-tab="layout"]');
  ui.click('[data-setting="layout"] [data-value="focus"]');
  ui.click('[data-setting="density"] [data-value="compact"]');
  ui.flushFrame();
  expect([root.dataset.layout, root.dataset.density]).toEqual(['focus', 'compact']);
  expect(ui.q('[data-setting="layout"] [data-value="focus"]').getAttribute('aria-pressed')).toBe('true');
  // Focus is wide enough for a comments column, but keeps the conversation under its paragraph.
  expect(root.classList).not.toContain('has-rail');
  expect(ui.q('.mr-threads .mr-thread')).toBeNull();
  expect(ui.q('.mr-content .mr-thread')).not.toBeNull();
  ui.close();
  await ui.open(review({ loadThreads: async () => [thread] }));
  expect([ui.q('.mr-root').dataset.layout, ui.q('.mr-root').dataset.density]).toEqual(['focus', 'compact']);
});

it('moves between conversations and changes the view from the keyboard, and lists every shortcut in its own tab', async () => {
  const at = new Date().toISOString();
  const threads: Thread[] = [5, 3].map((line) => ({
    doc: guide,
    side: 'head',
    line,
    url: `#t${line}`,
    comments: [{ author: 'Dana', body: `On line ${line}`, createdAt: at, url: `#t${line}` }],
  }));
  await ui.open(review({ loadThreads: async () => threads }));
  ui.flushFrame();
  const root = ui.q('.mr-root');
  // N points out the next conversation below the focus line, P the one before; the text scrolls to it.
  ui.key('n');
  const flashed = () => [...ui.shadow().querySelectorAll('.mr-thread.mr-flash')];
  expect(flashed()).toHaveLength(1);
  expect(HTMLElement.prototype.scrollTo).toHaveBeenCalled();
  ui.key('a');
  expect(ui.q('[data-scope="all"]').getAttribute('aria-pressed')).toBe('true');
  expect(ui.q('.mr-toast').textContent).toContain('Whole files');
  ui.key('l');
  expect(root.dataset.layout).toBe('files');
  expect(ui.q('.mr-toast').textContent).toContain('Layout: Files');
  ui.key('d');
  expect(root.dataset.density).toBe('compact');
  ui.key('+');
  ui.key('+');
  expect(ui.q('.mr-text-size').textContent).toBe('24 px');
  // Titles, bylines, contents and comments scale with the text, not the body alone.
  expect(root.style.getPropertyValue('--text-scale')).toBe('1.2');
  ui.key('0');
  expect(ui.q('.mr-text-size').textContent).toBe('20 px');
  ui.key('?');
  expect(ui.q('.mr-settings').hidden).toBe(false);
  expect(ui.q('#mr-keys-panel').hidden).toBe(false);
  const listed = [...ui.shadow().querySelectorAll('#mr-keys-panel dt')].map((dt) => dt.textContent);
  expect(listed).toEqual(expect.arrayContaining(['J K', 'N P', '] [', 'F', 'R', 'A', 'L', 'D', '0', ',', '?']));
  ui.key('Escape');
  expect(ui.q('.mr-settings').hidden).toBe(true);
  ui.key(',');
  expect(ui.q('#mr-reading-panel').hidden).toBe(false);
});

it('grows the text with the window in Fit to screen, up to one and a half times', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ layout: 'fit' }));
  await ui.open(review());
  const root = ui.q('.mr-root');
  // 1280px is narrower than the 1440px the composition is drawn for, so nothing is scaled down.
  expect([root.style.getPropertyValue('--fit'), root.style.getPropertyValue('--body-size')]).toEqual(['1', '20px']);
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1800);
  root.dispatchEvent(new Event('galley:context'));
  ui.flushFrame();
  expect([root.style.getPropertyValue('--fit'), root.style.getPropertyValue('--body-size')]).toEqual(['1.25', '25px']);
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(3840);
  root.dispatchEvent(new Event('galley:context'));
  ui.flushFrame();
  expect([root.style.getPropertyValue('--fit'), root.style.getPropertyValue('--body-size')]).toEqual(['1.5', '30px']);
  // The chosen text size is still the one the settings show.
  ui.click('[data-act="settings"]');
  expect(ui.q('.mr-text-size').textContent).toBe('20 px');
});

it('shows people by their name and mentions them by username, never by a name with spaces', async () => {
  const at = new Date().toISOString();
  const thread: Thread = {
    doc: guide,
    side: 'head',
    line: 5,
    url: '#thread',
    reply: vi.fn(),
    comments: [
      { author: 'Dana Whitfield', handle: 'dana', body: 'Question?', createdAt: at, url: '#thread' },
      { author: 'Lee Okafor', handle: 'lee', body: 'Agreed.', createdAt: at, url: '#thread' },
      { author: 'Sam Reyes', body: 'Name only.', createdAt: at, url: '#thread' },
    ],
  };
  await ui.open(review({ loadThreads: async () => [thread] }));
  const names = [...ui.shadow().querySelectorAll<HTMLElement>('.mr-thread-author')];
  expect(names.map((name) => name.textContent)).toEqual(['Dana Whitfield', 'Lee Okafor', 'Sam Reyes']);
  expect(names.map((name) => name.title)).toEqual(['Dana Whitfield (@dana)', 'Lee Okafor (@lee)', 'Sam Reyes']);
  const answer = (index: number) => ui.shadow().querySelectorAll<HTMLElement>('.mr-reply-to')[index];
  answer(1).click();
  const box = ui.q<HTMLFormElement>('.mr-thread .mr-reply');
  expect(box.querySelector('textarea')!.value).toBe('@lee ');
  expect(box.querySelector('.mr-reply-context')!.textContent).toBe('Replying to Lee Okafor');
  ui.key('Escape');
  answer(2).click();
  expect(box.querySelector('textarea')!.value).toBe('');
  expect(box.querySelector('.mr-reply-context')!.textContent).toBe('Replying to Sam Reyes');
});

it('shows the palettes six to a page, turns the pages, and opens on the page of the chosen palette', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ theme: 'nord' }));
  await ui.open(review());
  ui.click('[data-act="settings"]');
  const pages = [...ui.shadow().querySelectorAll('.mr-palette-page')];
  expect(pages.map((page) => page.querySelectorAll('[data-value]').length)).toEqual([6, 6, 6, 1]);
  // Nord is on the second page, so the settings open there.
  expect(HTMLElement.prototype.scrollTo).toHaveBeenLastCalledWith({ left: 1280, behavior: 'auto' });
  expect(ui.q<HTMLButtonElement>('[data-act="palette-next"]').disabled).toBe(false);
  expect(ui.q('.mr-carousel-dot[data-page="1"]').getAttribute('aria-current')).toBe('true');
  ui.click('[data-act="palette-prev"]');
  expect(HTMLElement.prototype.scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'smooth' });
  expect(ui.q<HTMLButtonElement>('[data-act="palette-prev"]').disabled).toBe(true);
  ui.click('.mr-carousel-dot[data-page="1"]');
  expect(HTMLElement.prototype.scrollTo).toHaveBeenLastCalledWith({ left: 1280, behavior: 'smooth' });
  ui.q('.mr-palette-track').scrollLeft = 1280;
  ui.click('[data-act="palette-next"]');
  expect(HTMLElement.prototype.scrollTo).toHaveBeenLastCalledWith({ left: 2560, behavior: 'smooth' });
  expect(ui.q<HTMLButtonElement>('[data-act="palette-next"]').disabled).toBe(false);
  ui.q('.mr-palette-track').scrollLeft = 2560;
  ui.click('[data-act="palette-next"]');
  expect(HTMLElement.prototype.scrollTo).toHaveBeenLastCalledWith({ left: 3840, behavior: 'smooth' });
  expect(ui.q<HTMLButtonElement>('[data-act="palette-next"]').disabled).toBe(true);
  ui.click('[data-setting="theme"] [data-value="ocean"]');
  expect(ui.q('.mr-root').dataset.theme).toBe('ocean');
  // A palette inside a page is chosen like any other setting.
  ui.click('[data-setting="theme"] [data-value="night"]');
  expect(ui.q('.mr-root').dataset.theme).toBe('night');
  expect(ui.q('[data-setting="theme"] [data-value="night"]').getAttribute('aria-pressed')).toBe('true');
});

it('keeps change markers quiet until the text beside one is pointed at', async () => {
  await ui.open(review());
  ui.flushFrame();
  const marks = [...ui.shadow().querySelectorAll<HTMLElement>('.mr-mark')];
  expect(marks.length).toBeGreaterThan(0);
  expect(marks.some((mark) => mark.classList.contains('is-hot'))).toBe(false);
  expect(marks.map((mark) => mark.dataset.label)).toContain('Edited');
  ui.q('[data-mr-change="modified"]').dispatchEvent(new Event('pointerover', { bubbles: true }));
  expect(ui.shadow().querySelectorAll('.mr-mark.is-hot')).toHaveLength(1);
  ui.q('.mr-root').dispatchEvent(new Event('pointerleave'));
  expect(ui.shadow().querySelector('.mr-mark.is-hot')).toBeNull();
});

it("offers the request's own title and description as a first document, sanitised and foldable", async () => {
  const overview = {
    kind: 'Merge request' as const,
    title: 'Docs: reading-first reviews',
    description: 'Adds **RFC 42**.<script>bad()</script>\n\n- Look at the goals',
    author: 'Dana Whitfield',
    url: `${location.origin}/mr/128`,
  };
  await ui.open(review({ overview }));
  const section = ui.q('.mr-overview');
  // Off until the reader asks for it, and placed before the first document.
  expect(section.hidden).toBe(true);
  expect(section.nextElementSibling?.matches('.mr-document[data-document="0"]')).toBe(true);
  ui.click('[data-act="settings"]');
  ui.click('[data-settings-tab="review"]');
  ui.click('[data-act="overview"]');
  expect(section.hidden).toBe(false);
  expect(ui.q('[data-act="overview"]').getAttribute('aria-checked')).toBe('true');
  expect(section.querySelector('.mr-title')!.textContent).toBe('Docs: reading-first reviews');
  expect(section.querySelector('.mr-byline')!.textContent).toContain('Opened by Dana Whitfield');
  expect(section.querySelector<HTMLAnchorElement>('.mr-overview-link')!.href).toBe(`${location.origin}/mr/128`);
  expect(section.querySelector('.mr-content strong')!.textContent).toBe('RFC 42');
  expect(section.querySelector('script')).toBeNull();
  expect(section.querySelector<HTMLDetailsElement>('details')!.open).toBe(true);
  ui.close();
  await ui.open(review({ overview: { ...overview, description: '  ' } }));
  expect(ui.q('.mr-overview').hidden).toBe(false);
  expect(ui.q('.mr-overview-empty').textContent).toBe('No description was added to this request.');
});

it('hides the description switch when the platform has no description to show', async () => {
  await ui.open(review());
  expect(ui.q('[data-act="overview"]').closest<HTMLElement>('.mr-set-row')!.hidden).toBe(true);
  expect(ui.q('.mr-overview')).toBeNull();
});

it('keeps comment cards shaded without offering the retired setting, even after an outlined preference', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ comments: 'outlined' }));
  await ui.open(review());
  expect(ui.q('.mr-root').hasAttribute('data-comments')).toBe(false);
  ui.click('[data-act="settings"]');
  ui.click('[data-settings-tab="review"]');
  expect(ui.q('[data-setting="comments"]')).toBeNull();
  expect(ui.q('.mr-settings').textContent).not.toContain('Comment cards');
  ui.close();
  await ui.open(review());
  expect(ui.q('.mr-root').hasAttribute('data-comments')).toBe(false);
});

it('changes palettes without changing brightness and remembers both after reopening', async () => {
  await ui.open(review());
  ui.click('[data-act="settings"]');
  ui.click('[data-value="dark"]');
  ui.click('[data-value="paper"]');
  expect(ui.q('.mr-root').dataset.theme).toBe('paper');
  expect(ui.q('.mr-root').classList).toContain('is-dark');
  ui.click('[data-value="light"]');
  expect(ui.q('.mr-root').dataset.theme).toBe('paper');
  expect(ui.q('.mr-root').classList).not.toContain('is-dark');
  ui.click('[data-value="slate"]');
  ui.close();
  await ui.open(review());
  expect(ui.q('.mr-root').dataset.theme).toBe('slate');
  expect(ui.q('.mr-root').classList).not.toContain('is-dark');
  expect(ui.q('[data-value="slate"]').getAttribute('aria-pressed')).toBe('true');
  expect(ui.q('[data-value="light"]').getAttribute('aria-pressed')).toBe('true');
});

it('shields page shortcuts while respecting text input and modifier keys', async () => {
  const pageKey = vi.fn();
  window.addEventListener('keydown', pageKey);
  try {
    await ui.open(review());
    ui.key('c', { ctrlKey: true });
    expect(ui.q('.mr-root').classList).toContain('mode-changes');
    ui.key('c');
    expect(ui.q('.mr-root').classList).toContain('mode-clean');
    ui.key('c');
    expect(ui.q('.mr-root').classList).toContain('mode-changes');
    ui.key('+');
    expect(ui.q('.mr-root').style.getPropertyValue('--body-size')).toBe('22px');
    ui.key('-');
    expect(ui.q('.mr-root').style.getPropertyValue('--body-size')).toBe('20px');
    await ui.commentOn();
    ui.key('c');
    expect(ui.q('.mr-root').classList).toContain('mode-changes');
    expect(pageKey).not.toHaveBeenCalled();
    ui.close();
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }));
    expect(pageKey).toHaveBeenCalledOnce();
  } finally {
    window.removeEventListener('keydown', pageKey);
  }
});

it('holds external document and thread images until an explicit action, with consent remembered', async () => {
  const img = '![pixel](https://tracker.example/a.png)';
  const thread: Thread = {
    doc: guide,
    side: 'head',
    line: null,
    url: '#thread',
    comments: [{ author: 'Reviewer', body: img, createdAt: new Date().toISOString(), url: '#thread' }],
  };
  await ui.open(review({ load: async () => ({ base: '', head: `# Guide\n\n${img}` }), loadThreads: async () => [thread] }));
  expect(ui.shadow().querySelectorAll('img[data-mr-src]')).toHaveLength(2);
  expect(ui.q('img').getAttribute('src')).toBeNull();
  ui.click('[data-act="load-images"]');
  expect(ui.shadow().querySelectorAll('img[data-mr-src]')).toHaveLength(0);
  expect(ui.q('img').getAttribute('src')).toBe('https://tracker.example/a.png');
  await ui.open(review({ load: async () => ({ base: '', head: img }) }));
  ui.click('[data-value="load"]');
  expect(ui.q('img').getAttribute('src')).toBe('https://tracker.example/a.png');
  expect(JSON.parse(localStorage.getItem('galley:settings')!).images).toBe('load');
});

it('navigates change targets and headings without following the platform page links', async () => {
  const head = '# Guide\n\n## First\n\nNew one.\n\n## Second\n\nNew two.\n\n## Third\n\nNew three.\n';
  await ui.open(review({ load: async () => ({ base: head.replaceAll('New', 'Old'), head }) }));
  const changes = [...ui.shadow().querySelectorAll<HTMLElement>('[data-mr-change]')];
  changes.forEach((el, i) => {
    ui.bounds(el, 400 + i * 100);
  });
  ui.key('j');
  const first = ui.scroll.mock.calls.at(-1)?.[0].top;
  ui.key('j');
  expect(ui.scroll.mock.calls.at(-1)?.[0].top).toBeGreaterThan(first);
  ui.key('k');
  expect(ui.scroll.mock.calls.at(-1)?.[0].top).toBe(first);
  ui.click('[data-act="heading"]');
  expect(ui.scroll.mock.calls.at(-1)?.[0].top).toBeGreaterThan(0);
  ui.flushFrame();
  expect(ui.q('.mr-pill').hidden).toBe(false);
  ui.click('[data-act="mark"]');
  expect(changes.some((el) => el.classList.contains('mr-flash'))).toBe(true);
});

it('does not treat a failed native viewed write as saved and lets the reader retry explicitly', async () => {
  const save = vi.fn().mockRejectedValueOnce(new Error('Permission denied')).mockResolvedValue(undefined);
  await ui.open(review({ viewed: { label: 'Saved on GitHub', load: async () => [], set: save } }));
  await ui.readyViewed();
  ui.click('[data-act="viewed"]');
  await vi.waitFor(() => expect(ui.q('.mr-viewed-feedback').textContent).toBe('Permission denied'));
  expect(ui.q('.mr-viewed').getAttribute('aria-pressed')).toBe('false');
  expect(save).toHaveBeenCalledOnce();
  ui.click('[data-act="viewed"]');
  await vi.waitFor(() => expect(ui.q('.mr-viewed').getAttribute('aria-pressed')).toBe('true'));
  expect(ui.q('.mr-viewed-feedback').hidden).toBe(true);
  expect(ui.q('.mr-files-progress').textContent).toBe('1 of 1 viewed');
  ui.key('v');
  await vi.waitFor(() => expect(ui.q('.mr-viewed').getAttribute('aria-pressed')).toBe('false'));
  expect(save.mock.calls.at(-1)).toEqual([guide, false]);
});

it('retries loading native progress without marking a file viewed prematurely', async () => {
  const load = vi.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValue([guide.path]);
  const set = vi.fn();
  await ui.open(review({ viewed: { label: 'GitHub', load, set } }));
  await ui.readyViewed();
  expect(ui.q('.mr-viewed').title).toContain('Retry loading viewed state');
  ui.click('[data-act="viewed"]');
  await vi.waitFor(() => expect(ui.q('.mr-viewed').getAttribute('aria-pressed')).toBe('true'));
  expect(set).not.toHaveBeenCalled();
});

it('persists local viewed progress across reopening without storing document text', async () => {
  await ui.open(review());
  await ui.readyViewed();
  ui.click('[data-act="viewed"]');
  await vi.waitFor(() => expect(ui.q('.mr-viewed').getAttribute('aria-pressed')).toBe('true'));
  expect(Object.keys(localStorage).join()).not.toContain('guide.md');
  await ui.open(review());
  await ui.readyViewed();
  expect(ui.q('.mr-viewed').getAttribute('aria-pressed')).toBe('true');
  ui.click('[data-act="viewed"]');
  await vi.waitFor(() => expect(ui.q('.mr-viewed').getAttribute('aria-pressed')).toBe('false'));
});

it('opens the editor beside its paragraph, with no comment button in the top bar, and posts only once', async () => {
  const pending = deferred<{ url: string }>();
  const post = vi.fn(() => pending.promise);
  const prepare = vi.fn(async (_target: CommentTarget) => ({ kind: 'inline' as const, label: 'GitLab inline comment', post }));
  await ui.open(review({ prepareComment: prepare }));
  expect(ui.q('.mr-composer')).toBeNull();
  expect(ui.q('.mr-topbar [data-act="start-comment"]')).toBeNull();
  const composer = await ui.commentOn();
  expect(prepare.mock.calls[0][0]).toEqual({ doc: guide, side: 'head', startLine: 5, endLine: 5, quote: 'The limit is 20 euros.' });
  expect(composer.parentElement).toBe(ui.q('.mr-threads'));
  expect(composer.querySelector('.mr-comment-target')!.textContent).toBe('Comment on line 5');
  expect(composer.getAttribute('aria-label')).toBe('New comment on docs/guide.md, line 5');
  expect(composer.querySelector('.mr-comment-quote')).toBeNull();
  expect(ui.q('[data-mr-change="modified"]').classList).toContain('mr-targeted');
  ui.input('   ');
  expect(composer.querySelector<HTMLButtonElement>('.mr-submit')!.disabled).toBe(true);
  ui.input('Please explain the new limit.');
  composer.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  composer.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  composer.querySelector<HTMLButtonElement>('.mr-cancel')!.click();
  ui.key('Escape');
  expect(composer.isConnected).toBe(true);
  expect(post).toHaveBeenCalledExactlyOnceWith('Please explain the new limit.');
  expect(composer.querySelector('textarea')!.readOnly).toBe(true);
  pending.resolve({ url: `${location.origin}/thread/7` });
  await vi.waitFor(() => expect(ui.q('.mr-composer')).toBeNull());
  ui.flushFrame();
  expect(ui.q('.mr-thread.is-own.is-new').textContent).toContain('Please explain the new limit.');
  expect(ui.q('.mr-toast a').getAttribute('href')).toBe(`${location.origin}/thread/7`);
  expect(ui.q('.mr-targeted')).toBeNull();
  expect(ui.shadow().activeElement).toBe(ui.q('.mr-root'));
});

it('keeps a draft on Escape, keeps the reader open while it is unsent, and never retries a failed post', async () => {
  const post = vi.fn().mockRejectedValueOnce(new ReaderError('Revision changed.', 'Reload the review.')).mockResolvedValue({ url: '#posted' });
  await ui.open(review({ prepareComment: async () => ({ kind: 'inline', label: 'Inline', post }) }));
  const composer = await ui.commentOn();
  ui.input('Keep this draft');
  ui.key('Escape');
  const status = composer.querySelector('.mr-comment-status')!;
  expect(status.textContent).toContain('Draft kept');
  expect(ui.shadow().activeElement).toBe(ui.q('.mr-root'));
  await ui.tick();
  expect(composer.isConnected).toBe(true);
  ui.key('Escape');
  expect(document.querySelector('#galley-reader')).toBeTruthy();
  expect(ui.q('.mr-toast').textContent).toContain('unsent comment');
  expect(ui.shadow().activeElement).toBe(composer.querySelector('textarea'));
  composer.querySelector<HTMLButtonElement>('.mr-submit')!.click();
  await vi.waitFor(() => expect(status.textContent).toBe('Revision changed. Reload the review.'));
  expect(post).toHaveBeenCalledOnce();
  expect(composer.querySelector('textarea')!.value).toBe('Keep this draft');
  expect(composer.querySelector<HTMLButtonElement>('.mr-submit')!.disabled).toBe(false);
  composer.querySelector<HTMLButtonElement>('.mr-cancel')!.click();
  expect(composer.isConnected).toBe(false);
  ui.key('Escape');
  expect(document.querySelector('#galley-reader')).toBeNull();
});

it('ignores stale comment preparation after its editor is cancelled', async () => {
  const stale = deferred<CommentPlan>();
  const post = vi.fn(async () => ({ url: '#current' }));
  const stalePost = vi.fn(async () => ({ url: '#stale' }));
  const prepare = vi.fn().mockReturnValueOnce(stale.promise).mockResolvedValue({ kind: 'inline', label: 'Current target', post });
  await ui.open(review({ prepareComment: prepare }));
  ui.q('[data-mr-change="modified"]').dispatchEvent(new Event('pointerover', { bubbles: true }));
  ui.click('[data-act="comment-block"]');
  ui.click('.mr-composer .mr-cancel');
  const composer = await ui.commentOn('.mr-content h1');
  stale.resolve({ kind: 'file', label: 'Stale target', post: stalePost });
  await stale.promise;
  expect(composer.querySelector('.mr-comment-status')!.textContent).toContain('Current target');
  ui.input('Draft');
  composer.querySelector<HTMLButtonElement>('.mr-submit')!.click();
  await vi.waitFor(() => expect(ui.q('.mr-composer')).toBeNull());
  expect(post).toHaveBeenCalledExactlyOnceWith('Draft');
  expect(stalePost).not.toHaveBeenCalled();
});

it('surfaces unavailable commenting and preparation failures without enabling submission', async () => {
  await ui.open(review());
  let composer = await ui.commentOn();
  ui.input('Draft');
  expect(composer.querySelector('.mr-comment-status')!.textContent).toContain('unavailable');
  expect(composer.querySelector<HTMLButtonElement>('.mr-submit')!.disabled).toBe(true);
  await ui.open(
    review({
      prepareComment: async () => {
        throw new Error('Write scope missing');
      },
    }),
  );
  composer = await ui.commentOn();
  expect(composer.querySelector('.mr-comment-status')!.textContent).toBe('Write scope missing');
  expect(composer.querySelector<HTMLButtonElement>('.mr-submit')!.disabled).toBe(true);
  ui.key('Escape');
  expect(ui.q('.mr-composer')).toBeNull();
});

it('anchors and sanitises existing threads, preserving context and folding long conversations', async () => {
  const comments = Array.from({ length: 5 }, (_, i) => ({
    author: `Reviewer ${i}`,
    body: i === 0 ? '<script>bad()</script>\n\n![pixel](https://tracker.example/p.gif)' : `Reply ${i}`,
    createdAt: new Date(Date.now() - 86400_000 * i).toISOString(),
    url: '#thread',
  }));
  const thread: Thread = { doc: guide, side: 'head', line: 3, resolved: true, outdated: true, url: 'javascript:alert(1)', comments };
  await ui.open(
    review({
      loadThreads: async () => [
        thread,
        { ...thread, line: null, url: `${location.origin}/thread` },
        { ...thread, line: 2, url: 'https://elsewhere.example/thread' },
      ],
    }),
  );
  ui.flushFrame();
  expect(ui.q('.mr-content p').hidden).toBe(false);
  expect(ui.shadow().querySelectorAll('.mr-thread')).toHaveLength(3);
  expect([...ui.shadow().querySelectorAll('.mr-thread-link')].map((a) => a.getAttribute('href'))).toEqual([`${location.origin}/thread`]);
  expect(ui.q('.mr-thread script')).toBeNull();
  expect(ui.q('.mr-thread img').getAttribute('src')).toBeNull();
  expect(ui.q('.mr-thread.is-resolved').textContent).toContain('Outdated');
  expect(ui.q('.mr-thread a[href^="javascript"]')).toBeNull();
  ui.click('[data-act="toggle-thread"]');
  expect(ui.q('.mr-thread').classList).toContain('is-expanded');
  ui.click('[data-act="toggle-thread"]');
  expect(ui.q('[data-act="toggle-thread"]').textContent).toBe('3 more replies');
  ui.bounds(ui.q('.mr-article'), 100, 100);
  ui.q('.mr-root').dispatchEvent(new Event('galley:context'));
  ui.flushFrame();
  expect(ui.q('.mr-content .mr-thread')).toBeTruthy();
});

it('continues reading when loading threads fails', async () => {
  await ui.open(
    review({
      loadThreads: async () => {
        throw new Error('Offline');
      },
    }),
  );
  expect(ui.q('.mr-content')).toBeTruthy();
  expect(ui.q('.mr-message')).toBeNull();
});

it('offers a selected quote without opening the composer until requested and cancels it with Escape', async () => {
  const prepare = vi.fn(async (_target: CommentTarget) => ({ kind: 'inline' as const, label: 'Inline', post: vi.fn() }));
  await ui.open(review({ prepareComment: prepare }));
  const selected = ui.q('.mr-content ins');
  const range = document.createRange();
  range.selectNodeContents(selected);
  const selection = { isCollapsed: false, rangeCount: 1, getRangeAt: () => range };
  Object.defineProperty(ui.shadow(), 'getSelection', { value: () => selection });
  selected.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  expect(ui.q('.mr-select-chip').hidden).toBe(false);
  expect(ui.q('.mr-composer')).toBeNull();
  ui.key('Escape');
  expect(ui.q('.mr-select-chip').hidden).toBe(true);
  selected.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  ui.click('[data-act="comment-selection"]');
  await vi.waitFor(() => expect(prepare).toHaveBeenCalledOnce());
  expect(prepare.mock.calls[0][0]).toMatchObject({ side: 'head', startLine: 5, endLine: 5, quote: '20' });
  expect(ui.q('.mr-composer .mr-comment-quote').textContent).toBe('20');
  expect(ui.shadow().activeElement).toBe(ui.q('.mr-composer textarea'));
});

it('prevents a selection spanning old and new text from being posted against one version', async () => {
  await ui.open(review());
  const paragraph = ui.q('[data-mr-change="modified"]');
  const range = document.createRange();
  range.selectNodeContents(paragraph);
  const selection = { isCollapsed: false, rangeCount: 1, getRangeAt: () => range };
  Object.defineProperty(ui.shadow(), 'getSelection', { value: () => selection });
  paragraph.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  expect(ui.q<HTMLButtonElement>('.mr-select-chip').disabled).toBe(true);
  expect(ui.q('.mr-select-chip').title).toContain('one version');
  selection.isCollapsed = true;
  document.dispatchEvent(new Event('selectionchange'));
  ui.key('Escape');
  expect(ui.q('.mr-select-chip').hidden).toBe(true);
});

it('comments on the paragraph in focus with R and submits with Ctrl+Enter without page shortcuts', async () => {
  const post = vi.fn(async () => ({ url: '#posted' }));
  const prepare = vi.fn(async (_target: CommentTarget) => ({ kind: 'inline' as const, label: 'Inline', post }));
  await ui.open(review({ prepareComment: prepare }));
  ui.bounds(ui.q('h1'), 80);
  ui.bounds(ui.q('[data-mr-change="modified"]'), 230);
  ui.key('r');
  await vi.waitFor(() => expect(ui.q('.mr-composer .mr-comment-status').textContent).toContain('Inline'));
  expect(prepare.mock.calls[0][0].startLine).toBe(5);
  ui.flushFrame();
  ui.input('Review via keyboard');
  ui.key('Enter', { ctrlKey: true });
  await vi.waitFor(() => expect(ui.q('.mr-composer')).toBeNull());
  expect(post).toHaveBeenCalledExactlyOnceWith('Review via keyboard');
});

it('uses the old path and source coordinates when commenting on a removed file', async () => {
  const removed = { path: 'docs/new.md', oldPath: 'docs/old.md', status: 'removed' as const };
  const prepare = vi.fn(async (_target: CommentTarget) => ({ kind: 'inline' as const, label: 'Old version', post: vi.fn() }));
  await ui.open(review({ docs: [removed], load: async () => ({ base: '# Retired\n\nOld guidance.\n', head: '' }), prepareComment: prepare }));
  expect(ui.q('.mr-byline').textContent).toContain('Deleted documentYou are reading its last version');
  expect(ui.q('.mr-byline .mr-chip.is-removed')).toBeTruthy();
  const composer = await ui.commentOn('.mr-content p');
  expect(prepare.mock.calls[0][0]).toMatchObject({ doc: removed, side: 'base', startLine: 3, endLine: 3 });
  expect(composer.querySelector('.mr-comment-target')!.textContent).toBe('Comment on old line 3');
  expect(composer.getAttribute('aria-label')).toBe('New comment on docs/old.md, old line 3');
});

it('folds renamed, unchanged documents until asked, and warns about edits that Markdown cannot show', async () => {
  const renamed = { ...guide, oldPath: 'old.md', status: 'renamed' as const };
  await ui.open(review({ docs: [renamed], load: async () => ({ base: 'Same.', head: 'Same.' }) }));
  expect(ui.q('.mr-file-btn').title).toBe('Renamed: old.md → docs/guide.md');
  expect(ui.q('.mr-quiet-reason').textContent).toBe('Renamed from old.md, text unchanged.');
  ui.click('[data-act="show-quiet"]');
  await vi.waitFor(() => expect(ui.q('.mr-byline')?.textContent).toContain('Moved, text unchanged'));
  expect(ui.q('.mr-empty-changes')).toBeTruthy();
  await ui.open(review({ load: async () => ({ base: 'Text.\n\n<!-- old -->', head: 'Text.\n\n<!-- changed -->' }) }));
  expect(ui.q('.mr-chip.is-hidden').textContent).toContain('2 lines not shown');
  expect(ui.q('.mr-chip.is-hidden').getAttribute('href')).toContain('/diffs');
});

it('restores automatic colour scheme behavior and responds to system theme changes', async () => {
  await ui.open(review());
  ui.click('[data-value="sepia"]');
  expect(ui.q('.mr-root').dataset.theme).toBe('sepia');
  ui.click('[data-value="auto"]');
  Object.defineProperty(ui.media, 'matches', { value: true });
  ui.media.dispatchEvent(new Event('change'));
  expect(ui.q('.mr-root').classList).toContain('is-dark');
  ui.click('[data-value="light"]');
  ui.media.dispatchEvent(new Event('change'));
  expect(ui.q('.mr-root').dataset.theme).toBe('sepia');
  expect(ui.q('.mr-root').classList).not.toContain('is-dark');
});

it('updates the current file and progress indicator on scrolling, and follows document anchors locally', async () => {
  const head = '# Guide\n\n[Jump](#review-context)\n\n## Review context\n\nKept.\n';
  await ui.open(review({ docs: [guide, { ...guide, path: 'other.md' }], load: async () => ({ base: head.replace('Jump', 'Go'), head }) }));
  ui.click('[data-scope="all"]');
  expect(ui.q('.mr-content h2').id).toBe('user-content-review-context');
  ui.click('.mr-content a[href="#review-context"]');
  expect(ui.scroll).toHaveBeenCalledWith({ top: 204, behavior: 'smooth' });
  const root = ui.q('.mr-root');
  Object.defineProperty(root, 'scrollHeight', { value: 1600 });
  root.scrollTop = 400;
  ui.bounds(ui.q('[data-document="1"]'), 100);
  root.dispatchEvent(new Event('scroll'));
  ui.flushFrame();
  expect(ui.q('.mr-file-name').textContent).toBe('other.md');
  expect(ui.q('.mr-progress > div').style.transform).toBe('scaleX(0.5)');
  expect(ui.q('.mr-topbar').classList).toContain('is-scrolled');
  ui.key('[');
  expect(ui.q('.mr-file-name').textContent).toBe('guide.md');
});

it('loads an individually held image only on its explicit button', async () => {
  await ui.open(review({ load: async () => ({ base: '', head: '![first](https://one.example/p.png)\n\n![second](https://two.example/p.png)' }) }));
  ui.click('[data-act="load-image"]');
  expect(ui.q('img').getAttribute('src')).toBe('https://one.example/p.png');
  expect(ui.q('img[data-mr-src]').getAttribute('src')).toBeNull();
  expect(ui.q('[data-act="load-images"]')).toBeTruthy();
});

it('keeps several drafts, returns to one when its text is chosen again, and removes editors left empty', async () => {
  const prepare = vi.fn(async (_target: CommentTarget) => ({ kind: 'inline' as const, label: 'Inline', post: vi.fn() }));
  await ui.open(review({ prepareComment: prepare }));
  ui.bounds(ui.q('h1'), 80);
  ui.bounds(ui.q('[data-mr-change="modified"]'), 230);
  const first = await ui.commentOn();
  ui.input('First thought');
  const second = await ui.commentOn('.mr-content h1');
  expect(ui.shadow().querySelectorAll('.mr-composer')).toHaveLength(2);
  expect(first.querySelector('textarea')!.value).toBe('First thought');
  expect([...ui.shadow().querySelectorAll('.mr-targeted')]).toEqual([ui.q('.mr-content h1'), ui.q('[data-mr-change="modified"]')]);
  // Clicking away from an editor that was never used removes it; one with a draft stays.
  ui.q('.mr-root').focus();
  await ui.tick();
  expect(second.isConnected).toBe(false);
  expect(first.isConnected).toBe(true);
  expect(ui.q('.mr-content h1').classList).not.toContain('mr-targeted');
  // Choosing the same text again returns to its draft instead of opening another.
  ui.key('r');
  expect(ui.shadow().activeElement).toBe(first.querySelector('textarea'));
  expect(ui.shadow().querySelectorAll('.mr-composer')).toHaveLength(1);
  expect(prepare).toHaveBeenCalledTimes(2);
  // A block that already has an editor beside it offers no second control.
  ui.q('[data-mr-change="modified"]').dispatchEvent(new Event('pointerover', { bubbles: true }));
  expect(ui.q('.mr-comment-btn').hidden).toBe(true);
});

it('replies to a comment from its Reply action, prevents duplicate posts, and shows the sanitised reply', async () => {
  const pending = deferred<{ url: string }>();
  const reply = vi.fn(() => pending.promise);
  const thread: Thread = {
    doc: guide,
    side: 'head',
    line: 5,
    url: '#thread',
    comments: [{ author: 'Dana', body: 'Question?', createdAt: new Date().toISOString(), url: '#thread' }],
    reply,
  };
  await ui.open(review({ loadThreads: async () => [thread] }));
  // Pointing at a thread marks the text it belongs to.
  ui.q('.mr-thread').dispatchEvent(new Event('pointerover', { bubbles: true }));
  expect(ui.q('[data-mr-change="modified"]').classList).toContain('mr-linked');
  expect(ui.q('.mr-reply')).toBeNull();
  ui.click('.mr-reply-to');
  const box = ui.q<HTMLFormElement>('.mr-thread .mr-reply'),
    input = box.querySelector('textarea')!;
  expect(box.previousElementSibling).toBe(ui.q('.mr-thread-comment'));
  expect(box.querySelector('.mr-reply-context')!.textContent).toBe('Replying to Dana');
  expect(input.getAttribute('aria-label')).toBe('Reply to Dana');
  expect(input.value).toBe('');
  expect(ui.shadow().activeElement).toBe(input);
  expect(box.querySelector('.mr-comment-status')!.textContent).toMatch(/to reply$/);
  ui.input('  An answer <script>bad()</script>  ', '.mr-thread .mr-reply textarea');
  box.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  box.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  box.querySelector<HTMLButtonElement>('.mr-cancel')!.click();
  ui.key('Escape');
  expect(reply).toHaveBeenCalledExactlyOnceWith('An answer <script>bad()</script>');
  expect(input.readOnly).toBe(true);
  pending.resolve({ url: '#reply' });
  await vi.waitFor(() => expect(ui.q('.mr-toast').textContent).toContain('Reply posted'));
  expect(ui.shadow().querySelectorAll('.mr-thread')).toHaveLength(1);
  expect(ui.shadow().querySelectorAll('.mr-thread-comment')).toHaveLength(2);
  expect([...ui.shadow().querySelectorAll('.mr-thread-comment')].at(-1)!.classList).toContain('is-reply');
  expect(ui.q('.mr-thread script')).toBeNull();
  expect(thread.comments.at(-1)?.body).toBe('An answer <script>bad()</script>');
  expect(ui.q('.mr-thread .mr-reply')).toBeNull();
  expect(input.value).toBe('');
  expect(input.readOnly).toBe(false);
  // The conversation continues from the new reply.
  expect(ui.shadow().activeElement).toBe([...ui.shadow().querySelectorAll('.mr-reply-to')].at(-1));
});

it('names the person a reply answers, keeps each thread’s draft, and keeps a failed reply editable', async () => {
  const reply = vi.fn().mockRejectedValueOnce(new ReaderError('Permission denied.', 'Your draft is kept.')).mockResolvedValue({ url: '#reply' });
  const comments = [
    { author: 'Dana', body: 'Question?', createdAt: new Date().toISOString(), url: '#thread' },
    { author: 'Lee', body: 'Agreed.', createdAt: new Date().toISOString(), url: '#thread' },
  ];
  const threads: Thread[] = [5, null].map((line) => ({ doc: guide, side: 'head', line, url: '#thread', comments: [...comments], reply }));
  await ui.open(review({ loadThreads: async () => threads }));
  const answer = () => ui.q('.mr-file-threads .mr-thread-comment.is-reply .mr-reply-to');
  // Answering a reply opens the box under it and names its author.
  answer().click();
  const box = ui.q<HTMLFormElement>('.mr-file-threads .mr-reply'),
    file = box.querySelector('textarea')!;
  expect(file.value).toBe('@Lee ');
  expect(box.previousElementSibling).toBe(ui.q('.mr-file-threads .mr-thread-comment.is-reply'));
  expect(box.querySelector('.mr-reply-context')!.textContent).toBe('Replying to Lee');
  // A box with nothing but the mention closes on Escape, back to the action that opened it.
  ui.key('Escape');
  expect(box.hidden).toBe(true);
  expect(ui.shadow().activeElement).toBe(answer());
  answer().click();
  ui.input('@Lee File reply', '.mr-file-threads .mr-reply textarea');
  ui.key('Escape');
  expect(file.value).toBe('@Lee File reply');
  expect(box.querySelector('.mr-comment-status')!.textContent).toContain('Draft kept');
  expect(ui.shadow().activeElement).toBe(ui.q('.mr-root'));
  file.focus();
  ui.key('Enter', { ctrlKey: true });
  await vi.waitFor(() => expect(box.querySelector('.mr-comment-status')!.textContent).toBe('Permission denied. Your draft is kept.'));
  expect(reply).toHaveBeenCalledOnce();
  expect(file.readOnly).toBe(false);
  expect(file.value).toBe('@Lee File reply');
  // Another thread has its own box and draft.
  ui.click('.mr-threads .mr-reply-to');
  const other = ui.q<HTMLTextAreaElement>('.mr-threads .mr-reply textarea');
  expect(other.value).toBe('');
  ui.input('Another thought', '.mr-threads .mr-reply textarea');
  ui.click('.mr-threads .mr-reply .mr-cancel');
  expect(ui.q('.mr-threads .mr-reply').hidden).toBe(true);
  expect(other.value).toBe('');
  expect(file.value).toBe('@Lee File reply');
  ui.click('.mr-file-threads .mr-reply .mr-submit');
  await vi.waitFor(() => expect(file.value).toBe(''));
  expect(reply).toHaveBeenCalledTimes(2);
  expect(reply).toHaveBeenLastCalledWith('@Lee File reply');
});

it('keeps a new comment and a reply as separate drafts, and supports replies to a comment just posted', async () => {
  const reply = vi.fn(async () => ({ url: '#reply' }));
  const post = vi.fn(async () => ({ url: '#new', reply }));
  const thread: Thread = {
    doc: guide,
    side: 'head',
    line: 5,
    url: '#thread',
    comments: [{ author: 'Dana', body: 'Question?', createdAt: new Date().toISOString(), url: '#thread' }],
    reply,
  };
  await ui.open(review({ prepareComment: async () => ({ kind: 'inline', label: 'Inline', post }), loadThreads: async () => [thread] }));
  const composer = await ui.commentOn();
  ui.input('A new topic');
  ui.click('.mr-thread .mr-reply-to');
  ui.input('Reply draft', '.mr-thread .mr-reply textarea');
  await ui.tick();
  expect(composer.isConnected).toBe(true);
  expect(composer.querySelector('textarea')!.value).toBe('A new topic');
  composer.querySelector<HTMLButtonElement>('.mr-submit')!.click();
  expect(post).toHaveBeenCalledExactlyOnceWith('A new topic');
  await vi.waitFor(() => expect(ui.q('.mr-composer')).toBeNull());
  ui.flushFrame();
  expect(ui.q<HTMLTextAreaElement>('.mr-thread:not(.is-own) .mr-reply textarea').value).toBe('Reply draft');
  ui.click('.mr-thread.is-own .mr-reply-to');
  ui.input('Follow-up', '.mr-thread.is-own .mr-reply textarea');
  ui.key('Enter', { ctrlKey: true });
  await vi.waitFor(() => expect(reply).toHaveBeenCalledExactlyOnceWith('Follow-up'));
  expect(ui.q<HTMLTextAreaElement>('.mr-thread:not(.is-own) .mr-reply textarea').value).toBe('Reply draft');
});

it('comments on the selected words with R, and not on a selection that spans both versions', async () => {
  const prepare = vi.fn(async (_target: CommentTarget) => ({ kind: 'inline' as const, label: 'Inline', post: vi.fn() }));
  await ui.open(review({ prepareComment: prepare }));
  const range = document.createRange();
  range.selectNodeContents(ui.q('.mr-content ins'));
  const selection = { isCollapsed: false, rangeCount: 1, getRangeAt: () => range };
  Object.defineProperty(ui.shadow(), 'getSelection', { value: () => selection });
  ui.key('r');
  await vi.waitFor(() => expect(prepare).toHaveBeenCalledOnce());
  expect(prepare.mock.calls[0][0]).toMatchObject({ startLine: 5, quote: '20' });
  expect(ui.q('.mr-composer .mr-comment-quote').textContent).toBe('20');
  ui.q('.mr-root').focus();
  range.selectNodeContents(ui.q('[data-mr-change="modified"]'));
  ui.key('r');
  expect(ui.q<HTMLButtonElement>('.mr-select-chip').disabled).toBe(true);
  expect(ui.shadow().querySelectorAll('.mr-composer')).toHaveLength(1);
  expect(prepare).toHaveBeenCalledOnce();
});

it('keeps the comment control while the pointer crosses the margin to it, and drops it elsewhere', async () => {
  await ui.open(review({ prepareComment: async () => ({ kind: 'inline', label: 'Inline', post: vi.fn() }) }));
  const paragraph = ui.q('[data-mr-change="modified"]'),
    button = ui.q('.mr-comment-btn');
  const move = (target: Element, clientX: number, clientY: number, pointerType = 'mouse') => {
    const event = new MouseEvent('pointermove', { bubbles: true, composed: true, clientX, clientY });
    Object.defineProperty(event, 'pointerType', { value: pointerType });
    target.dispatchEvent(event);
  };
  paragraph.dispatchEvent(new Event('pointerover', { bubbles: true }));
  expect(button.hidden).toBe(false);
  expect(button.classList).toContain('is-lane');
  expect(button.textContent).toBe('Add a comment…');
  expect(button.getAttribute('aria-label')).toBe('Comment on line 5');
  move(paragraph, 500, 320);
  move(ui.q('.mr-main'), 965, 330);
  move(ui.q('.mr-main'), 965, 700, 'touch');
  expect(button.hidden).toBe(false);
  // Pointing at the control marks the paragraph it would comment on.
  button.dispatchEvent(new Event('pointerover', { bubbles: true }));
  expect(paragraph.classList).toContain('mr-linked');
  // Left of the text, away from the paragraph, it goes.
  move(ui.q('.mr-main'), 100, 700);
  expect(button.hidden).toBe(true);
  ui.q('.mr-main').dispatchEvent(new Event('pointerover', { bubbles: true }));
  expect(paragraph.classList).not.toContain('mr-linked');
  paragraph.dispatchEvent(new Event('pointerover', { bubbles: true }));
  ui.q('.mr-root').dispatchEvent(new Event('pointerleave'));
  expect(button.hidden).toBe(true);
});

it('turns the + and − beside changed code lines off and on from Review settings, and remembers it', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ codeFiles: true }));
  const code = { path: 'src/main.ts', oldPath: 'src/main.ts', kind: 'code' as const, status: 'modified' as const };
  await ui.open(review({ docs: [], codeDocs: [code], load: async () => ({ base: 'const value = 1;\n', head: 'const value = 2;\n' }) }));
  const toggle = ui.q('[data-act="signs"]');
  expect(toggle.getAttribute('aria-checked')).toBe('true');
  expect(ui.q('.mr-root').classList.contains('no-signs')).toBe(false);
  ui.click('[data-act="signs"]');
  expect(toggle.getAttribute('aria-checked')).toBe('false');
  expect(ui.q('.mr-root').classList.contains('no-signs')).toBe(true);
  // The signs stay in the rows, so line numbers and comment targets are untouched.
  expect([...ui.shadow().querySelectorAll('.mr-code-sign')].map((sign) => sign.textContent)).toEqual(['−', '+']);
  await vi.waitFor(() => expect(JSON.parse(localStorage.getItem('galley:settings')!).signs).toBe(false));
  ui.click('[data-act="signs"]');
  expect(ui.q('.mr-root').classList.contains('no-signs')).toBe(false);
});

it('offers a comment from the comments column level with any text, and keeps it on the way to the control', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ scope: 'all' }));
  await ui.open(
    review({
      load: async () => ({ base: 'First line.\n\nSecond line.\n\nThird line.\n', head: 'First line!\n\nSecond line.\n\nThird line!\n' }),
      prepareComment: async () => ({ kind: 'inline', label: 'Inline', post: vi.fn() }),
    }),
  );
  const [first, second, third] = [...ui.shadow().querySelectorAll<HTMLElement>('.mr-content p')];
  const button = ui.q('.mr-comment-btn');
  const main = ui.q('.mr-main');
  const pointer = (type: string, target: Element, clientX: number, clientY: number) => {
    const event = new MouseEvent(type, { bubbles: true, composed: true, clientX, clientY });
    Object.defineProperty(event, 'pointerType', { value: 'mouse' });
    target.dispatchEvent(event);
  };
  // The comments column starts where the text ends (960px); what is level with a point is the text there.
  Object.defineProperty(ShadowRoot.prototype, 'elementFromPoint', {
    configurable: true,
    value: (_x: number, y: number) => (y >= 500 ? third : y >= 400 ? main : first),
  });
  pointer('pointermove', main, 1100, 520);
  expect(button.getAttribute('aria-label')).toBe('Comment on line 5');
  expect(button.hidden).toBe(false);
  // Between blocks the nearest text within 48px takes it; farther from any, it stays put.
  pointer('pointermove', main, 1100, 450);
  expect(button.getAttribute('aria-label')).toBe('Comment on line 5');
  expect(button.hidden).toBe(false);
  pointer('pointermove', main, 1100, 445);
  expect(button.getAttribute('aria-label')).toBe('Comment on line 1');
  // Back over the text, away from the line, it goes.
  pointer('pointermove', main, 900, 520);
  expect(button.hidden).toBe(true);

  // From the first line towards its control below, passing over the second line keeps it.
  ui.bounds(button, 600, 1000);
  pointer('pointerover', first, 400, 310);
  expect(button.getAttribute('aria-label')).toBe('Comment on line 1');
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  pointer('pointerover', second, 700, 460);
  pointer('pointermove', second, 700, 460);
  expect(button.getAttribute('aria-label')).toBe('Comment on line 1');
  pointer('pointermove', main, 1010, 620);
  pointer('pointerover', button, 1100, 620);
  pointer('pointermove', button, 1100, 620);
  vi.advanceTimersByTime(400);
  expect(button.getAttribute('aria-label')).toBe('Comment on line 1');
  // Stopping on the second line on the way gives it the control.
  pointer('pointermove', first, 400, 310);
  pointer('pointermove', second, 700, 460);
  vi.advanceTimersByTime(400);
  expect(button.getAttribute('aria-label')).toBe('Comment on line 3');
  // Moving away from the control is not heading for it.
  pointer('pointerover', first, 400, 310);
  pointer('pointerover', second, 300, 460);
  expect(button.getAttribute('aria-label')).toBe('Comment on line 3');
  vi.useRealTimers();
});

it('comments on source files as on documents: beside the code when there is room, between the lines otherwise', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ codeFiles: true }));
  const code = { path: 'src/main.ts', oldPath: 'src/main.ts', kind: 'code' as const, status: 'modified' as const };
  const thread: Thread = {
    doc: code,
    side: 'head',
    line: 1,
    url: '#t',
    comments: [{ author: 'Dana', body: 'Why 2?', createdAt: new Date().toISOString(), url: '#t' }],
  };
  await ui.open(
    review({
      docs: [],
      codeDocs: [code],
      load: async () => ({ base: 'const value = 1;\n', head: 'const value = 2;\n' }),
      loadThreads: async () => [thread],
      prepareComment: async () => ({ kind: 'inline', label: 'Inline', post: vi.fn() }),
    }),
  );
  ui.flushFrame();
  expect(ui.q('.mr-root').classList).toContain('has-rail');
  expect(ui.q('.mr-threads .mr-thread').classList).toContain('is-code-card');
  const line = ui.q('.mr-code-line[data-mr-change="added"]');
  line.dispatchEvent(new Event('pointerover', { bubbles: true }));
  expect(ui.q('.mr-comment-btn').className).toBe('mr-comment-btn is-lane is-beside-code');
  const composer = await ui.commentOn('.mr-code-line[data-mr-change="added"]');
  expect(composer.parentElement).toBe(ui.q('.mr-threads'));
  expect(composer.classList).toContain('is-code-card');
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1100);
  ui.q('.mr-root').dispatchEvent(new Event('galley:context'));
  ui.flushFrame();
  expect(ui.q('.mr-root').classList).not.toContain('has-rail');
  expect(line.nextElementSibling).toBe(ui.q('.mr-code-lines .mr-thread'));
  expect(line.nextElementSibling?.nextElementSibling).toBe(composer);
  expect(composer.classList).not.toContain('is-code-card');
});

it('enlarges a diagram in a dialog, pauses reading shortcuts, and returns focus when it closes', async () => {
  await ui.open(review());
  const zoom = document.createElement('button');
  zoom.className = 'mr-diagram-zoom';
  zoom.dataset.act = 'zoom-diagram';
  const image = document.createElement('img');
  image.src = 'data:image/svg+xml,%3Csvg%2F%3E';
  image.alt = 'New version of Mermaid diagram.';
  image.width = 900;
  image.height = 300;
  zoom.append(image);
  ui.q('.mr-content').append(zoom);
  zoom.focus();
  zoom.click();
  const box = ui.q('.mr-lightbox'),
    enlarged = box.querySelector('img')!;
  expect(box.hidden).toBe(false);
  expect(enlarged.getAttribute('src')).toBe(image.getAttribute('src'));
  expect(enlarged.alt).toBe(image.alt);
  // The whole diagram fits the window: 900 × 300 grows until its width meets the margins.
  expect(enlarged.style.width).toBe('1216px');
  expect(ui.shadow().activeElement).toBe(ui.q('.mr-lightbox-close'));
  ui.scroll.mockClear();
  ui.key('j');
  expect(ui.scroll).not.toHaveBeenCalled();
  ui.key('Tab');
  expect(ui.shadow().activeElement!.closest('.mr-lightbox')).toBe(box);
  ui.key('Escape');
  expect(box.hidden).toBe(true);
  expect(enlarged.getAttribute('src')).toBeNull();
  expect(ui.shadow().activeElement).toBe(zoom);
  expect(document.querySelector('#galley-reader')).toBeTruthy();
  // Clicking the diagram itself keeps it open; the backdrop around it closes it.
  zoom.click();
  enlarged.click();
  expect(box.hidden).toBe(false);
  ui.click('.mr-lightbox-stage');
  expect(box.hidden).toBe(true);
});
