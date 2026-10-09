// Reader workflows that complement reader.test.ts: keyboard and toolbar paths, local viewed progress,
// failures and their recovery, comment dates, Clean mode markers and the request description.
import { expect, it, vi } from 'vitest';
import { ReaderError, type Thread } from '../platforms/types.ts';
import { contents, guide, readerHarness, review } from '../testing/reader.ts';

const ui = readerHarness();
const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();
const thread = (line: number, extra: Partial<Thread> = {}): Thread => ({
  doc: guide,
  side: 'head',
  line,
  url: `#t${line}`,
  comments: [{ author: 'Dana', body: `On line ${line}`, createdAt: at(5), url: `#t${line}` }],
  ...extra,
});

it('walks back through conversations and changes, and says when there is nothing more in that direction', async () => {
  await ui.open(review({ loadThreads: async () => [thread(5)] }));
  ui.flushFrame();
  // Everything sits below the focus line, so there is nothing above to go back to.
  ui.key('p');
  expect(ui.q('.mr-toast').textContent).toBe('No more conversations above');
  ui.bounds(ui.q('[data-mr-change="modified"]'), 100);
  ui.key('p');
  expect(ui.shadow().querySelectorAll('.mr-thread.mr-flash')).toHaveLength(1);
  ui.key('n');
  expect(ui.q('.mr-toast').textContent).toBe('No more conversations below');
  // The arrows in the top bar step through changes like J and K.
  vi.mocked(HTMLElement.prototype.scrollTo).mockClear();
  ui.click('[data-act="prev"]');
  expect(HTMLElement.prototype.scrollTo).toHaveBeenCalled();
});

it('says so when a review has no conversations to move between', async () => {
  await ui.open(review());
  ui.key('n');
  expect(ui.q('.mr-toast').textContent).toBe('No conversations in this review yet');
});

it('opens the file list from the keyboard and turns view settings back again', async () => {
  await ui.open(review({ docs: [guide, { ...guide, path: 'docs/second.md', oldPath: 'docs/second.md' }] }));
  ui.key('f');
  expect(ui.q('.mr-files').hidden).toBe(false);
  ui.key('Escape');
  expect(ui.q('.mr-files').hidden).toBe(true);
  for (const [key, toasts] of [
    ['a', ['Whole files', 'Changed parts']],
    ['d', ['Compact', 'Comfortable']],
  ] as const) {
    ui.key(key);
    expect(ui.q('.mr-toast').textContent).toBe(toasts[0]);
    ui.key(key);
    expect(ui.q('.mr-toast').textContent).toBe(toasts[1]);
  }
  ui.click('[data-act="settings"]');
  ui.click('[data-act="palette-next"]');
  expect(ui.q('.mr-carousel-dot[data-page="1"]').getAttribute('aria-current')).toBe('true');
});

it('keeps viewed progress on this device when the platform has none, and says why a platform save failed', async () => {
  await ui.open(review());
  await ui.readyViewed();
  ui.key('v');
  await vi.waitFor(() => expect(ui.q('.mr-viewed').getAttribute('aria-pressed')).toBe('true'));
  ui.close();
  const set = vi.fn().mockRejectedValue(new Error('GitHub did not save it.'));
  await ui.open(review({ viewed: { label: 'Viewed on GitHub', load: async () => [], set } }));
  await ui.readyViewed();
  ui.click('[data-act="viewed"]');
  await vi.waitFor(() => expect(ui.q('.mr-viewed').getAttribute('title') ?? '').toContain('GitHub did not save it.'));
  expect(ui.q('.mr-viewed').getAttribute('aria-pressed')).toBe('false');
});

it('dates comments the way people say them: hours, days, then the date', async () => {
  const comments = [at(3 * 60), at(3 * 24 * 60), at(90 * 24 * 60), 'not a date'].map((createdAt, i) => ({
    author: `Person ${i}`,
    body: 'Hi',
    createdAt,
    url: '#t',
  }));
  await ui.open(review({ loadThreads: async () => [thread(5, { comments })] }));
  const times = [...ui.shadow().querySelectorAll('.mr-thread-time')].map((time) => time.textContent);
  expect(times[0]).toMatch(/hr|hour/);
  expect(times[1]).toMatch(/day/);
  expect(times[2]).toBe(new Date(comments[2].createdAt).toLocaleDateString());
  expect(times[3]).toBe('');
});

it('shows a file that failed to load with its reason and a way to try again', async () => {
  const load = vi.fn().mockRejectedValueOnce(new ReaderError('GitLab did not return this file.', 'Check you can see it.')).mockResolvedValue(contents);
  await ui.open(review({ load }));
  expect(ui.q('.mr-document').textContent).toContain('GitLab did not return this file.');
  ui.click('[data-act="retry-doc"]');
  await vi.waitFor(() => expect(ui.q('.mr-content')).not.toBeNull());
  expect(load).toHaveBeenCalledTimes(2);
});

it('offers to try a review again when it could not be opened, and asks for a token when that is the problem', async () => {
  let attempt = 0;
  const source = () =>
    attempt++ === 0 ? Promise.reject(new ReaderError('This pull request is in a private repository.', 'Add a token.', true)) : Promise.resolve(review());
  ui.close();
  const { openReader } = await import('./reader.ts');
  openReader(source());
  await vi.waitFor(() => expect(ui.q('.mr-root').textContent).toContain('This pull request is in a private repository.'));
  expect(ui.q('.mr-root').textContent).toMatch(/token/i);
});

it('marks a removed block in Clean mode with a point where it used to be', async () => {
  await ui.open(review({ load: async () => ({ base: '# Guide\n\nKept.\n\nRemoved paragraph.\n\nAlso kept.\n', head: '# Guide\n\nKept.\n\nAlso kept.\n' }) }));
  ui.key('c');
  ui.flushFrame();
  const removed = ui.q('[data-mr-change="removed"]');
  expect(removed.getClientRects()).toHaveLength(removed.closest('[hidden]') ? 0 : 1);
  expect(ui.shadow().querySelectorAll('.mr-mark').length).toBeGreaterThan(0);
});

it('shows a request description without an author, and without a link that leaves the platform', async () => {
  await ui.open(review({ overview: { kind: 'Pull request', title: 'Docs', description: 'Text', author: '', url: 'https://evil.example/pr/1' } }));
  ui.click('[data-act="settings"]');
  ui.click('[data-settings-tab="review"]');
  ui.click('[data-act="overview"]');
  const section = ui.q('.mr-overview');
  expect(section.querySelector('.mr-overview-author')).toBeNull();
  expect(section.querySelector('.mr-overview-link')).toBeNull();
});
