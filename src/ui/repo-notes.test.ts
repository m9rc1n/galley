import { expect, it, vi } from 'vitest';
import { emptyThinking, MAX_LINKS, MAX_NOTES, type Note } from '../core/notes.ts';
import { handbook, repoHarness, repository, words } from '../testing/repo.ts';
import { projectKey } from './project-store.ts';

const drawn = vi.hoisted(() => ({ renderDiagrams: vi.fn(), highlightCode: vi.fn(async () => {}) }));
vi.mock('./diagrams.ts', async (original) => ({ ...(await original<typeof import('./diagrams.ts')>()), renderDiagrams: drawn.renderDiagrams }));
vi.mock('./code.ts', async (original) => ({ ...(await original<typeof import('./code.ts')>()), highlightCode: drawn.highlightCode }));

const ui = repoHarness();
const spec = 'docs/specs/reading.md';
const id = 'github:https://github.com/acme/handbook';
const stored = async () => JSON.parse(localStorage.getItem(await projectKey(id)) ?? 'null');

const form = () => ui.q<HTMLFormElement>('form[data-act="add-note"]');
const field = <T>(name: string, from = form()) => from.elements.namedItem(name) as unknown as T;
async function addNote(text: string, options: { kind?: Note['kind']; anchor?: string; group?: string } = {}) {
  const radios = field<RadioNodeList>('kind');
  radios.value = options.kind ?? 'idea';
  field<HTMLTextAreaElement>('text').value = text;
  field<HTMLInputElement>('group').value = options.group ?? '';
  const select = field<HTMLSelectElement>('anchor');
  select.value = options.anchor === undefined ? '' : [...select.options].find((o) => o.textContent === options.anchor)!.value;
  const count = ui.all('.mr-note').length;
  form().requestSubmit();
  await vi.waitFor(() => expect(ui.all('article.mr-note').length).toBeGreaterThan(count));
}
const notes = () => ui.all('article.mr-note').map(words);
const card = (text: string) => ui.all('article.mr-note').find((note) => note.querySelector('.mr-note-text')!.textContent === text)!;
const showNotes = () => ui.click('[data-view="notes"]');

it('notes are private and start empty; a note from a document is about it, or one of its sections', async () => {
  await ui.open(repository(handbook, { start: { path: spec, folder: false } }));
  ui.press('Add a note', '.mr-byline button');
  expect(ui.q('.mr-repo-thinking').hidden).toBe(false);
  expect(ui.q('[data-view="notes"]').getAttribute('aria-pressed')).toBe('true');
  expect(ui.shadow().activeElement).toBe(field('text'));
  expect(words(ui.q('.mr-notes-head'))).toBe(
    'Your notes Private to this browser. Saved only when you choose Save, and shared only through an export you check first. Nothing saved yet Save Export… Delete all notes…',
  );
  expect(ui.q<HTMLButtonElement>('[data-act="save-notes"]').disabled).toBe(true);
  expect(ui.text('.mr-notes > .mr-repo-quiet')).toBe('No notes yet. Ideas, questions, assumptions, next experiments and alternatives you add appear here.');
  expect([...field<HTMLSelectElement>('anchor').options].map((o) => [o.textContent, o.selected])).toStrictEqual([
    ['No document', false],
    ['Reading', true],
    ['Reading § Reading', false],
    ['Reading § Goals', false],
  ]);

  // A blank note is not a note.
  field<HTMLTextAreaElement>('text').value = '  ';
  form().requestSubmit();
  expect(notes()).toStrictEqual([]);
  await addNote('Why read twice?', { kind: 'question', anchor: 'Reading § Goals', group: 'ignored for questions' });
  expect(notes()).toStrictEqual(['Question Your note Include in export Why read twice? About Reading § Goals · Written at this commit Connect… Edit Delete']);
  expect(ui.text('.mr-notes-kind h2')).toBe('Questions (1)');
  expect(ui.text('.mr-notes-state')).toBe('Unsaved changes');
  expect(ui.q<HTMLButtonElement>('[data-act="save-notes"]').disabled).toBe(false);
  expect(field<HTMLTextAreaElement>('text').value).toBe('');
  expect(ui.shadow().activeElement).toBe(field('text'));

  // The note leads back to what it is about.
  ui.press('Reading § Goals', '.mr-note-about button');
  await ui.settled();
  expect(ui.q('.mr-repo-read').hidden).toBe(false);
  expect(ui.q('#user-content-goals').classList).toContain('mr-repo-flash');
  // Focus left in the notes went back to the reader. N opens the notes, and N again goes back to reading.
  expect(ui.shadow().activeElement).toBe(ui.q('.mr-root'));
  ui.key('n');
  expect(ui.q('.mr-repo-thinking').hidden).toBe(false);
  ui.key('N');
  expect(ui.q('.mr-repo-read').hidden).toBe(false);
});

it('Save keeps notes in this browser; until then they are a draft, offered again next time', async () => {
  await ui.open(repository());
  showNotes();
  await addNote('Try a stream');
  expect(await stored()).toBe(null);
  ui.press('Save', '.mr-notes-head button');
  await vi.waitFor(() => expect(ui.text('.mr-toast')).toBe('Notes saved in this browser.'));
  expect(ui.text('.mr-notes-state')).toMatch(/^Saved [A-Z][a-z]{2} \d+, \d{4}/);
  expect((await stored()).saved.thinking.notes.map((n: Note) => n.text)).toStrictEqual(['Try a stream']);
  expect(localStorage.key(0)).toMatch(/^galley:project:[0-9a-f]{64}$/);

  // A change not saved is written as a draft when the reader closes, and offered when it opens again.
  await addNote('Measure it', { kind: 'experiment' });
  ui.close();
  await vi.waitFor(async () => expect((await stored()).draft).not.toBe(null));
  await ui.open(repository());
  showNotes();
  await vi.waitFor(() => expect(ui.q('.mr-notes-recover')).toBeTruthy());
  expect(words(ui.q('.mr-notes-recover'))).toMatch(/^You have unsaved notes from [A-Z][a-z]{2} \d+, \d{4}, .+\. Recover Discard$/);
  expect(notes().map((n) => n.split(' Your note')[0])).toStrictEqual(['Idea']);
  ui.press('Recover');
  expect(ui.text('.mr-toast')).toBe('Your unsaved notes are back. Save to keep them.');
  expect(ui.text('.mr-notes-kind:last-of-type h2')).toBe('Next experiments (1)');
  expect(ui.text('.mr-notes-state')).toBe('Unsaved changes');
  ui.press('Save', '.mr-notes-head button');
  await vi.waitFor(async () => expect((await stored()).draft).toBe(null));
  expect((await stored()).saved.thinking.notes).toHaveLength(2);
});

it('an offered draft can be discarded, and what the reader types survives the notes being drawn again', async () => {
  const key = await projectKey(id);
  const draft = { ...emptyThinking(), notes: [{ id: 'n1', kind: 'idea', text: 'Old idea', group: '', anchor: null, links: [], created: 1, updated: 1 }] };
  localStorage.setItem(key, JSON.stringify({ saved: null, draft: { at: Date.UTC(2026, 9, 1, 9), thinking: draft } }));
  await ui.open(repository());
  showNotes();
  await vi.waitFor(() => expect(ui.q('.mr-notes-recover')).toBeTruthy());
  field<HTMLTextAreaElement>('text').value = 'half a thought';
  field<HTMLTextAreaElement>('text').focus();
  ui.press('Discard', '.mr-notes-recover button');
  await vi.waitFor(() => expect(ui.text('.mr-toast')).toBe('Unsaved notes discarded.'));
  expect(ui.all('.mr-notes-recover')).toHaveLength(0);
  expect(localStorage.getItem(key)).toBe(null);
  expect(field<HTMLTextAreaElement>('text').value).toBe('half a thought');
  expect(ui.shadow().activeElement).toBe(field('text'));
});

it('notes can be edited, deleted and tentatively connected; alternatives to the same question sit side by side', async () => {
  await ui.open(repository());
  showNotes();
  await addNote('Keep the queue', { kind: 'alternative', group: ' Queue or stream? ' });
  await addNote('Stream events', { kind: 'alternative', group: 'Queue or stream?' });
  await addNote('Do nothing', { kind: 'alternative' });
  await addNote('Who reads it?', { kind: 'question' });
  expect(ui.all('.mr-notes-kind > h2').map((h) => h.textContent)).toStrictEqual(['Questions (1)', 'Alternatives (3)']);
  expect(ui.all('.mr-notes-compare').map((c) => [c.querySelector('h3')!.textContent, c.querySelectorAll('.mr-note').length])).toStrictEqual([
    ['Queue or stream?', 2],
    ['Alternatives without a question', 1],
  ]);
  expect([...ui.q('#mr-note-groups').querySelectorAll('option')].map((o) => o.value)).toStrictEqual(['Queue or stream?']);

  // A tentative connection, and its removal. One note's list of choices is open at a time.
  const open = (text: string) => (card(text).querySelector('[data-act="connect"]') as HTMLElement).click();
  const choices = (text: string) => card(text).querySelector<HTMLSelectElement>('[data-act="connect-note"]')!;
  open('Who reads it?');
  expect(ui.shadow().activeElement).toBe(choices('Who reads it?'));
  expect(ui.all('[data-act="connect-note"]')).toHaveLength(1);
  ui.press('Cancel', '.mr-note footer button');
  expect(ui.all('[data-act="connect-note"]')).toHaveLength(0);
  expect(ui.shadow().activeElement).toBe(card('Who reads it?').querySelector('[data-act="connect"]'));
  open('Who reads it?');
  expect([...choices('Who reads it?').options].map((o) => o.textContent)).toStrictEqual([
    'Choose…',
    'Alternative: Keep the queue',
    'Alternative: Stream events',
    'Alternative: Do nothing',
  ]);
  choices('Who reads it?').value = choices('Who reads it?').options[1].value;
  choices('Who reads it?').dispatchEvent(new Event('change', { bubbles: true }));
  expect(words(card('Who reads it?').querySelector('.mr-note-links')!)).toBe('Tentatively connected to Alternative: Keep the queue Disconnect');
  expect(ui.shadow().activeElement).toBe(card('Who reads it?').querySelector('[data-act="connect"]'));
  open('Who reads it?');
  expect([...choices('Who reads it?').options].map((o) => o.textContent)).not.toContain('Alternative: Keep the queue');
  ui.press('Cancel', '.mr-note footer button');
  (card('Who reads it?').querySelector('[data-act="disconnect"]') as HTMLElement).click();
  expect(card('Who reads it?').querySelector('.mr-note-links')).toBe(null);

  // Editing: blank text is refused, Cancel keeps the note, Save changes it.
  (card('Who reads it?').querySelector('[data-act="edit-note"]') as HTMLElement).click();
  const edit = () => ui.q<HTMLFormElement>('form[data-act="save-note"]');
  expect(ui.shadow().activeElement).toBe(field('text', edit()));
  ui.press('Cancel', 'form[data-act="save-note"] button');
  expect(ui.shadow().activeElement).toBe(card('Who reads it?').querySelector('[data-act="edit-note"]'));
  (card('Who reads it?').querySelector('[data-act="edit-note"]') as HTMLElement).click();
  field<HTMLTextAreaElement>('text', edit()).value = ' ';
  edit().requestSubmit();
  expect(ui.all('form[data-act="save-note"]')).toHaveLength(1);
  field<RadioNodeList>('kind', edit()).value = 'alternative';
  field<HTMLTextAreaElement>('text', edit()).value = 'Read it twice';
  field<HTMLInputElement>('group', edit()).value = 'Queue or stream?';
  edit().requestSubmit();
  expect(ui.all('.mr-notes-compare')[0].querySelectorAll('.mr-note')).toHaveLength(3);
  expect(ui.shadow().activeElement).toBe(card('Read it twice').querySelector('[data-act="edit-note"]'));
  (card('Read it twice').querySelector('[data-act="edit-note"]') as HTMLElement).click();
  field<RadioNodeList>('kind', edit()).value = 'assumption';
  edit().requestSubmit();
  expect(card('Read it twice').querySelector('.mr-note-kind')!.textContent).toBe('Assumption');

  // Deleting a note also removes connections to it.
  open('Keep the queue');
  const other = choices('Keep the queue');
  other.value = [...other.options].find((o) => o.textContent === 'Alternative: Stream events')!.value;
  other.dispatchEvent(new Event('change', { bubbles: true }));
  (card('Stream events').querySelector('[data-act="delete-note"]') as HTMLElement).click();
  expect(ui.text('.mr-toast')).toBe('Note deleted. Your saved notes keep it until you save.');
  expect(card('Keep the queue').querySelector('.mr-note-links')).toBe(null);
  expect(notes()).toHaveLength(3);
});

it('after a refresh, notes about a section that changed ask to be reconfirmed, and notes about one that is gone can be detached', async () => {
  const before: Record<string, string> = {
    'README.md': '# Handbook\n\nIntro.',
    'guide.md': '# Guide\n\nSteps.',
    'old.md': '# Old\n\nGone soon.',
    [spec]: '# Reading\n\n## Goals\n\nRead first.\n\n## Rollout\n\nLater.',
  };
  const after: Record<string, string> = { 'README.md': before['README.md'], 'guide.md': before['guide.md'], [spec]: '# Reading\n\n## Goals\n\nRead twice.\n' };
  const next = repository(after, { commit: 'beef000000000000000000000000000000000000' });
  // The guide cannot be read at the new commit: its notes say nothing rather than guess.
  vi.mocked(next.load).mockImplementation(async (path) => {
    if (path === 'guide.md') throw new Error('offline');
    return after[path];
  });
  const source = repository(before, { refresh: vi.fn(async () => next) });
  await ui.open(source);
  ui.click('[data-act="docs"]');
  await vi.waitFor(() => expect(ui.all('.mr-repo-outline button').length).toBe(4));
  ui.press(spec, '.mr-repo-outline button');
  await ui.settled();
  showNotes();
  await addNote('Goals are vague', { anchor: 'Reading § Goals' });
  await addNote('When is the rollout?', { kind: 'question', anchor: 'Reading § Rollout' });
  for (const [path, title] of [
    ['README.md', 'Handbook'],
    ['guide.md', 'Guide'],
    ['old.md', 'Old'],
  ]) {
    ui.click('[data-act="docs"]');
    ui.press(path, '.mr-repo-outline button');
    await ui.settled();
    showNotes();
    await addNote(`About ${title}`, { anchor: title });
  }
  // Before the refresh every note was written at the commit read.
  expect(ui.all('.mr-note-state').map((s) => s.textContent)).toStrictEqual(Array(5).fill('Written at this commit'));

  ui.click('[data-act="refresh"]');
  await vi.waitFor(() => expect(ui.all('.mr-note-state.is-unchanged')).toHaveLength(1));
  const state = (text: string) => words(card(text).querySelector('.mr-note-about')!);
  expect(state('Goals are vague')).toBe('About Reading § Goals · The section changed since you wrote this: reconfirm Reconfirm');
  expect(state('When is the rollout?')).toBe(
    'About Reading § Rollout · The section is gone at this commit: detach the note from it, or delete the note Detach',
  );
  expect(state('About Handbook')).toBe('About Handbook · Unchanged since you wrote this');
  expect(state('About Guide')).toBe('About Guide');
  expect(state('About Old')).toBe('About Old · The section is gone at this commit: detach the note from it, or delete the note Detach');

  // The map says so too, and leads back here.
  ui.click('[data-view="map"]');
  await vi.waitFor(() => expect(ui.q('.mr-map-since')).toBeTruthy());
  expect(words(ui.q('.mr-map-since'))).toContain('3 of your notes are about a section that changed or is gone. Look at them');
  ui.press('Look at them');
  expect(ui.q('.mr-repo-thinking').hidden).toBe(false);

  (card('Goals are vague').querySelector('[data-act="reconfirm"]') as HTMLElement).click();
  await vi.waitFor(() => expect(ui.text('.mr-toast')).toBe('Reconfirmed at beef000. Save your notes to keep it.'));
  expect(state('Goals are vague')).toBe('About Reading § Goals · Written at this commit');
  (card('When is the rollout?').querySelector('[data-act="detach"]') as HTMLElement).click();
  expect(card('When is the rollout?').querySelector('.mr-note-about')).toBe(null);
});

it('deleting every note asks first, and removes them here and from storage', async () => {
  await ui.open(repository());
  showNotes();
  await addNote('Try a stream');
  ui.press('Save', '.mr-notes-head button');
  await vi.waitFor(async () => expect(await stored()).not.toBe(null));
  ui.press('Delete all notes…');
  expect(words(ui.q('.mr-notes-confirm'))).toBe(
    'Delete every note, proposal and type you set for this repository, here and in storage? Delete all notes Keep them',
  );
  expect(ui.shadow().activeElement).toBe(ui.q('[data-act="confirm-delete-notes"]'));
  ui.press('Keep them');
  expect(ui.all('.mr-notes-confirm')).toHaveLength(0);
  expect(ui.shadow().activeElement).toBe(ui.q('[data-act="delete-notes"]'));
  ui.press('Delete all notes…');
  ui.click('[data-act="confirm-delete-notes"]');
  await vi.waitFor(() => expect(ui.text('.mr-toast')).toBe('Your notes for this repository are deleted.'));
  expect(notes()).toStrictEqual([]);
  expect(ui.text('.mr-notes-state')).toBe('Nothing saved yet');
  expect(await stored()).toBe(null);
});

it('storage that refuses a write says so, and the notes stay open and unsaved', async () => {
  const local = {
    get: vi.fn(async () => ({})),
    set: vi.fn(async () => {
      throw new Error('QUOTA_BYTES quota exceeded');
    }),
    remove: vi.fn(async () => {
      throw new Error('storage is gone');
    }),
  };
  vi.stubGlobal('chrome', { storage: { local } });
  await ui.open(repository());
  showNotes();
  await addNote('Try a stream');
  ui.press('Save', '.mr-notes-head button');
  await vi.waitFor(() => expect(ui.q('.mr-notes-head > .mr-repo-limit')).toBeTruthy());
  expect(ui.text('.mr-notes-head > .mr-repo-limit')).toBe('Galley could not use this browser’s storage: QUOTA_BYTES quota exceeded');
  expect(ui.text('.mr-notes-state')).toBe('Unsaved changes');
  ui.press('Delete all notes…');
  ui.click('[data-act="confirm-delete-notes"]');
  await vi.waitFor(() => expect(ui.text('.mr-notes-head > .mr-repo-limit')).toBe('Galley could not use this browser’s storage: storage is gone'));
  expect(notes()).toHaveLength(1);
  vi.unstubAllGlobals();
});

it('types the reader sets, and the components they propose, are kept with their notes and come back next time', async () => {
  await ui.open(repository(handbook, { start: { path: 'docs/adr/0001-use-markdown.md', folder: false } }));
  ui.click('[data-view="map"]');
  await vi.waitFor(() => expect(ui.q('.mr-map-status').textContent).toMatch(/^Built from all/));
  const select = ui.q<HTMLSelectElement>('[data-act="kind"]');
  select.value = 'runbook';
  select.dispatchEvent(new Event('change', { bubbles: true }));
  ui.click('[data-act="lens"][data-lens="architecture"]');
  const propose = ui.q<HTMLFormElement>('form[data-act="propose-entity"]');
  (propose.elements.namedItem('name') as HTMLInputElement).value = 'Renderer';
  propose.requestSubmit();
  showNotes();
  expect(ui.text('.mr-notes-state')).toBe('Unsaved changes');
  ui.press('Save', '.mr-notes-head button');
  await vi.waitFor(async () => expect(await stored()).not.toBe(null));
  ui.close();

  await ui.open(repository(handbook, { start: { path: 'docs/adr/0001-use-markdown.md', folder: false } }));
  ui.click('[data-view="map"]');
  await vi.waitFor(() => expect(ui.q('.mr-map-facts .mr-repo-kind')?.textContent).toBe('Runbook'));
  expect(ui.q('.mr-map-facts .mr-repo-kind').classList).toContain('is-reader');
  // A note can be connected to the reader's own component, by name.
  showNotes();
  await vi.waitFor(() => expect(ui.all('.mr-note')).toHaveLength(0));
  await addNote('Renderer owns layout');
  (card('Renderer owns layout').querySelector('[data-act="connect"]') as HTMLElement).click();
  const connect = card('Renderer owns layout').querySelector<HTMLSelectElement>('[data-act="connect-note"]')!;
  const option = [...connect.options].find((o) => o.textContent === 'Renderer (Component, proposed by you)')!;
  connect.value = option.value;
  connect.dispatchEvent(new Event('change', { bubbles: true }));
  expect(words(card('Renderer owns layout').querySelector('.mr-note-links')!)).toBe(
    'Tentatively connected to Renderer (Component, proposed by you) Disconnect',
  );
  // Removing the component removes the connection.
  ui.click('[data-view="map"]');
  ui.click('[data-act="lens"][data-lens="architecture"]');
  ui.press('Renderer', '.mr-lens-list .mr-lens-entity');
  ui.press('Remove this proposal');
  showNotes();
  expect(card('Renderer owns layout').querySelector('.mr-note-links')).toBe(null);
});

it('a repository keeps at most 500 notes, and says so', async () => {
  const many: Note[] = Array.from({ length: MAX_NOTES }, (_, i) => ({
    id: `n${i}`,
    kind: 'idea',
    text: `Idea ${i}`,
    group: '',
    anchor: null,
    // A note with as many connections as a note keeps offers no more.
    links: i ? [] : Array.from({ length: MAX_LINKS }, (_, j) => `n${j + 1}`),
    created: 1,
    updated: 1,
  }));
  localStorage.setItem(await projectKey(id), JSON.stringify({ saved: { at: 1, thinking: { ...emptyThinking(), notes: many } }, draft: null }));
  await ui.open(repository());
  showNotes();
  await vi.waitFor(() => expect(ui.text('.mr-notes-kind h2')).toBe(`Ideas (${MAX_NOTES})`));
  expect(card('Idea 0').querySelector('[data-act="connect"]')).toBe(null);
  expect(card('Idea 1').querySelector('[data-act="connect"]')).not.toBe(null);
  field<HTMLTextAreaElement>('text').value = 'One more';
  form().requestSubmit();
  await vi.waitFor(() => expect(ui.text('.mr-toast')).toBe('You have 500 notes, the most Galley keeps for one repository. Delete some to add more.'));
});

it('export shows exactly what leaves: only chosen notes, as Markdown or Mermaid, to copy, download or open as an issue', async () => {
  const clipboard = { writeText: vi.fn(async () => {}) };
  vi.stubGlobal('navigator', { ...navigator, clipboard });
  const created = vi.fn(() => 'blob:galley/1');
  const revoked = vi.fn();
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = created;
      static revokeObjectURL = revoked;
    },
  );
  const downloads: HTMLAnchorElement[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push(this);
  });
  await ui.open(repository(handbook, { start: { path: spec, folder: false } }));
  showNotes();
  await addNote('Why read twice?', { kind: 'question', anchor: 'Reading § Goals' });
  await addNote('Not for sharing');

  ui.press('Export…');
  expect(ui.q('.mr-repo-export').hidden).toBe(false);
  expect(ui.shadow().activeElement).toBe(ui.q('[data-act="close-export"]'));
  expect(ui.text('.mr-export-panel > .mr-repo-quiet')).toBe('Choose notes with Include in export first. Nothing else is ever included.');
  expect(ui.q('.mr-export-preview').textContent).toBe('');
  expect(ui.q<HTMLButtonElement>('[data-act="copy-export"]').disabled).toBe(true);
  expect(ui.q<HTMLButtonElement>('[data-act="download-export"]').disabled).toBe(true);
  expect(ui.text('.mr-export-share')).toBe('Share it as an issue Choose notes to share first.');
  ui.click('[data-act="close-export"]');
  expect(ui.q('.mr-repo-export').hidden).toBe(true);
  expect(ui.shadow().activeElement).toBe(ui.q('[data-act="export"]'));

  const choose = (text: string, on: boolean) => {
    const box = card(text).querySelector<HTMLInputElement>('[data-act="choose-note"]')!;
    box.checked = on;
    box.dispatchEvent(new Event('change', { bubbles: true }));
  };
  choose('Not for sharing', true);
  choose('Why read twice?', true);
  choose('Not for sharing', false);
  ui.press('Export…');
  expect(ui.text('.mr-export-panel > .mr-repo-quiet')).toBe('1 of 2 notes chosen. Only chosen notes are included: read the text before you share it.');
  const markdown = ui.q('.mr-export-preview').textContent!;
  expect(markdown).toContain('# Notes on acme/handbook');
  expect(markdown).toContain('read at main @ c0ffee1.');
  expect(markdown).toContain(
    '- **Question** (proposal): Why read twice?\n  - About: [Reading § Goals](https://github.com/acme/handbook/blob/c0ffee1/docs/specs/reading.md#goals) (documented; the note was written at c0ffee1)',
  );
  expect(markdown).not.toContain('Not for sharing');
  const issue = ui.q<HTMLAnchorElement>('.mr-export-share a');
  expect([issue.textContent, issue.target, issue.rel]).toStrictEqual(['Open a new issue…', '_blank', 'noopener noreferrer']);
  const url = new URL(issue.href);
  expect([url.origin + url.pathname, url.searchParams.get('title'), url.searchParams.get('body')]).toStrictEqual([
    'https://github.com/acme/handbook/issues/new',
    'Notes on acme/handbook',
    markdown,
  ]);
  expect(ui.text('.mr-export-share .mr-repo-quiet')).toBe(
    'Opens the new-issue form on GitHub in a new tab, with this text. Nothing is posted until you submit it there.',
  );

  ui.click('[data-act="copy-export"]');
  await vi.waitFor(() => expect(ui.text('.mr-toast')).toBe('Copied. Paste it where you choose.'));
  expect(clipboard.writeText).toHaveBeenCalledWith(markdown);
  clipboard.writeText.mockRejectedValueOnce(new Error('denied'));
  ui.click('[data-act="copy-export"]');
  await vi.waitFor(() => expect(ui.text('.mr-toast')).toBe('Galley could not copy. Select the text and copy it instead.'));

  ui.click('[data-act="download-export"]');
  expect(downloads.map((a) => [a.download, a.href])).toStrictEqual([['acme-handbook-notes.md', 'blob:galley/1']]);
  await vi.waitFor(() => expect(revoked).toHaveBeenCalledWith('blob:galley/1'));

  ui.click('[data-act="export-format"][data-format="mermaid"]');
  expect(ui.q('[data-format="mermaid"]').getAttribute('aria-pressed')).toBe('true');
  expect(ui.shadow().activeElement).toBe(ui.q('[data-format="mermaid"]'));
  expect(ui.q('.mr-export-preview').textContent).toBe(
    'flowchart LR\n  n1(["Question: Why read twice?"])\n  d1["Reading § Goals"]\n  n1 --- d1\n  classDef proposal stroke-dasharray: 4 3\n  class n1 proposal\n',
  );
  ui.click('[data-act="download-export"]');
  expect(downloads[1].download).toBe('acme-handbook-notes.mmd');
  // Esc closes the export before anything else.
  ui.key('Escape');
  expect(ui.q('.mr-repo-export').hidden).toBe(true);
  expect(ui.q('.mr-repo-thinking').hidden).toBe(false);
  vi.unstubAllGlobals();
});

it('text too long for an issue form is offered to copy instead', async () => {
  await ui.open(repository(handbook, { newIssue: () => `https://github.com/acme/handbook/issues/new?body=${'x'.repeat(9000)}` }));
  showNotes();
  await addNote('Long');
  const box = card('Long').querySelector<HTMLInputElement>('[data-act="choose-note"]')!;
  box.checked = true;
  box.dispatchEvent(new Event('change', { bubbles: true }));
  ui.press('Export…');
  expect(ui.text('.mr-export-share .mr-repo-quiet')).toBe('This text is too long to open in an issue form. Copy it instead.');
});

it('answers that arrive after the reader closed, or after the commit moved, change nothing', async () => {
  const next = repository(handbook, { commit: 'beef000000000000000000000000000000000000' });
  const source = repository(handbook, { start: { path: spec, folder: false }, refresh: vi.fn(async () => next) });
  await ui.open(source);
  showNotes();
  await addNote('About the goals', { anchor: 'Reading § Goals' });
  // A save still running when the reader closes is finished quietly.
  ui.press('Save', '.mr-notes-head button');
  ui.close();
  await vi.waitFor(async () => expect(await stored()).not.toBe(null));

  await ui.open(repository(handbook, { start: { path: spec, folder: false }, refresh: vi.fn(async () => next) }));
  showNotes();
  await vi.waitFor(() => expect(notes()).toHaveLength(1));
  // Checking anchors, then closing before the answer.
  showNotes();
  ui.close();
  await ui.open(repository(handbook, { start: { path: spec, folder: false }, refresh: vi.fn(async () => next) }));
  showNotes();
  await vi.waitFor(() => expect(notes()).toHaveLength(1));
  ui.click('[data-act="refresh"]');
  await vi.waitFor(() => expect(ui.q('.mr-note-state')?.textContent).toBe('Unchanged since you wrote this'));
});

it('a reconfirmation answered after the commit moved is dropped', async () => {
  const changed = { ...handbook, [spec]: handbook[spec].replace('Read [the decision]', 'Read again [the decision]') };
  const third = repository(changed, { commit: 'feed000000000000000000000000000000000000' });
  const second = repository(changed, { commit: 'beef000000000000000000000000000000000000', refresh: vi.fn(async () => third) });
  await ui.open(repository(handbook, { start: { path: spec, folder: false }, refresh: vi.fn(async () => second) }));
  showNotes();
  await addNote('About the goals', { anchor: 'Reading § Goals' });
  ui.click('[data-act="refresh"]');
  await vi.waitFor(() => expect(ui.all('[data-act="reconfirm"]')).toHaveLength(1));
  ui.click('[data-act="reconfirm"]');
  ui.click('[data-act="refresh"]');
  await vi.waitFor(() => expect(ui.text('.mr-repo-commit-label')).toBe('feed000'));
  await vi.waitFor(() => expect(ui.all('[data-act="reconfirm"]')).toHaveLength(1));
  expect(ui.text('.mr-toast')).not.toMatch(/^Reconfirmed/);
});

it('export links a note about a whole document to it, and names what a note is connected to', async () => {
  await ui.open(repository(handbook, { start: { path: spec, folder: false } }));
  showNotes();
  const long = `${'A question that goes on and on '.repeat(3)}?`;
  await addNote(long, { kind: 'question' });
  await addNote('About the whole spec', { anchor: 'Reading' });
  (card('About the whole spec').querySelector('[data-act="connect"]') as HTMLElement).click();
  const choices = card('About the whole spec').querySelector<HTMLSelectElement>('[data-act="connect-note"]')!;
  const option = [...choices.options].find((o) => o.textContent!.startsWith('Question: '))!;
  expect(option.textContent).toBe(`Question: ${long.slice(0, 59)}…`);
  choices.value = option.value;
  choices.dispatchEvent(new Event('change', { bubbles: true }));
  const box = card('About the whole spec').querySelector<HTMLInputElement>('[data-act="choose-note"]')!;
  box.checked = true;
  box.dispatchEvent(new Event('change', { bubbles: true }));
  ui.press('Export…');
  expect(ui.q('.mr-export-preview').textContent).toContain(
    `- **Idea** (proposal): About the whole spec\n  - About: [Reading](https://github.com/acme/handbook/blob/c0ffee1/docs/specs/reading.md) (documented; the note was written at c0ffee1)\n  - Tentatively connected to: Question: ${long.slice(0, 59)}…`,
  );
});

it('a connection to something not read in this session is left out of the export, never guessed', async () => {
  const saved = {
    ...emptyThinking(),
    notes: [{ id: 'n1', kind: 'idea', text: 'Scale the web service', group: '', anchor: null, links: ['service:web'], created: 1, updated: 1 }],
  };
  localStorage.setItem(await projectKey(id), JSON.stringify({ saved: { at: 1, thinking: saved }, draft: null }));
  await ui.open(repository());
  showNotes();
  await vi.waitFor(() => expect(notes()).toHaveLength(1));
  expect(card('Scale the web service').querySelector('.mr-note-links')).toBe(null);
  const box = card('Scale the web service').querySelector<HTMLInputElement>('[data-act="choose-note"]')!;
  box.checked = true;
  box.dispatchEvent(new Event('change', { bubbles: true }));
  ui.press('Export…');
  expect(ui.q('.mr-export-preview').textContent).toContain('- **Idea** (proposal): Scale the web service\n');
  expect(ui.q('.mr-export-preview').textContent).not.toContain('Tentatively connected');
});
