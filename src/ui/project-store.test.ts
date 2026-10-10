import { afterEach, expect, it, vi } from 'vitest';
import { emptyThinking } from '../core/notes.ts';
import { DRAFT_DELAY, digestText, loadProject, MAX_STORED_CHARS, ProjectNotes, projectKey, storageIdle, writeProject } from './project-store.ts';

afterEach(() => localStorage.clear());

const thinking = {
  ...emptyThinking(),
  notes: [{ id: 'n1', kind: 'idea' as const, text: 'Try a stream', group: '', anchor: null, links: [], created: 1, updated: 2 }],
};

it('keys never name the repository: they are a fingerprint of it', async () => {
  const key = await projectKey('github:https://github.com/acme/handbook');
  expect(key).toMatch(/^galley:project:[0-9a-f]{64}$/);
  expect(key).not.toContain('acme');
  expect(await digestText('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

it('saves, recovers and deletes notes in the demo’s local storage, ignoring anything malformed', async () => {
  const id = 'github:https://github.com/acme/handbook';
  expect(await loadProject(id)).toStrictEqual({ saved: null, draft: null });
  await writeProject(id, { saved: { at: 5, thinking }, draft: { at: 6, thinking: emptyThinking() } });
  expect(await loadProject(id)).toStrictEqual({ saved: { at: 5, thinking }, draft: { at: 6, thinking: emptyThinking() } });
  const key = await projectKey(id);
  localStorage.setItem(key, JSON.stringify({ saved: { at: 'later', thinking }, draft: { at: 1, thinking: 'x' } }));
  expect(await loadProject(id)).toStrictEqual({ saved: null, draft: null });
  localStorage.setItem(key, '{not json');
  expect(await loadProject(id)).toStrictEqual({ saved: null, draft: null });
  await writeProject(id, { saved: null, draft: null });
  expect(localStorage.getItem(key)).toBe(null);
});

it('uses the extension’s own storage when there is one, and says when notes are too large to keep', async () => {
  const data = new Map<string, unknown>();
  const local = {
    get: vi.fn(async (key: string) => (data.has(key) ? { [key]: data.get(key) } : {})),
    set: vi.fn(async (items: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(items)) data.set(key, value);
    }),
    remove: vi.fn(async (key: string) => data.delete(key)),
  };
  vi.stubGlobal('chrome', { storage: { local } });
  const id = 'gitlab:https://gitlab.com/a/b';
  await writeProject(id, { saved: { at: 1, thinking }, draft: null });
  expect(await loadProject(id)).toStrictEqual({ saved: { at: 1, thinking }, draft: null });
  expect(localStorage.length).toBe(0);
  const huge = { ...emptyThinking(), notes: [{ ...thinking.notes[0], text: 'x'.repeat(MAX_STORED_CHARS) }] };
  await expect(writeProject(id, { saved: { at: 2, thinking: huge }, draft: null })).rejects.toThrow('These notes are too large to save.');
  local.set.mockRejectedValueOnce(new Error('QUOTA_BYTES quota exceeded'));
  await expect(writeProject(id, { saved: { at: 3, thinking }, draft: null })).rejects.toThrow('QUOTA_BYTES quota exceeded');
  local.get.mockRejectedValueOnce(new Error('unavailable'));
  expect(await loadProject(id)).toStrictEqual({ saved: null, draft: null });
  await writeProject(id, { saved: null, draft: null });
  expect(data.size).toBe(0);
});

const repo = 'github:https://github.com/acme/notes';
const idea = (text: string) => ({ id: text, kind: 'idea' as const, text, group: '', anchor: null, links: [], created: 1, updated: 1 });

it('a change is a draft: written a moment later, never saved until the reader chooses Save', async () => {
  vi.useFakeTimers();
  const notes = new ProjectNotes(repo);
  await notes.load();
  expect([notes.state, notes.dirty, notes.saved, notes.offer]).toStrictEqual(['Nothing saved yet', false, null, null]);
  notes.change((thinking) => thinking.notes.push(idea('One')));
  notes.change((thinking) => thinking.notes.push(idea('Two')));
  expect(notes.state).toBe('Unsaved changes');
  expect(await loadProject(repo)).toStrictEqual({ saved: null, draft: null });
  await vi.advanceTimersByTimeAsync(DRAFT_DELAY);
  await storageIdle();
  const stored = await loadProject(repo);
  expect([stored.saved, stored.draft!.thinking.notes.map((n) => n.text)]).toStrictEqual([null, ['One', 'Two']]);
  expect(await notes.save()).toBe(true);
  expect(notes.state).toMatch(/^Saved /);
  expect(await loadProject(repo)).toMatchObject({ saved: { thinking: { notes: [{ text: 'One' }, { text: 'Two' }] } }, draft: null });
  // Nothing waits to be written: closing writes nothing.
  notes.flush();
  await storageIdle();
  expect((await loadProject(repo)).draft).toBe(null);
  vi.useRealTimers();
});

it('changes made before storage answers are kept on top of what it holds', async () => {
  await writeProject(repo, { saved: { at: 1, thinking: { ...emptyThinking(), notes: [idea('Saved')], docKinds: [['a.md', 'spec']] } }, draft: null });
  const notes = new ProjectNotes(repo);
  const loading = notes.load();
  notes.change((thinking) => thinking.docKinds.push(['b.md', 'guide']));
  await loading;
  expect(notes.thinking.docKinds).toStrictEqual([
    ['a.md', 'spec'],
    ['b.md', 'guide'],
  ]);
  expect(notes.thinking.notes.map((n) => n.text)).toStrictEqual(['Saved']);
  expect(notes.dirty).toBe(true);
  notes.flush();
  await storageIdle();
  expect((await loadProject(repo)).draft!.thinking.docKinds).toHaveLength(2);
});

it('a draft offered for recovery is kept until the reader decides, even through a save', async () => {
  await writeProject(repo, {
    saved: { at: 1, thinking: { ...emptyThinking(), notes: [idea('Saved')] } },
    draft: { at: 2, thinking: { ...emptyThinking(), notes: [idea('Draft')] } },
  });
  const notes = new ProjectNotes(repo);
  await notes.load();
  expect(notes.offer!.thinking.notes.map((n) => n.text)).toStrictEqual(['Draft']);
  notes.change((thinking) => thinking.notes.push(idea('New')));
  // No newer draft replaces the offered one.
  notes.flush();
  await storageIdle();
  expect((await loadProject(repo)).draft!.thinking.notes.map((n) => n.text)).toStrictEqual(['Draft']);
  expect(await notes.save()).toBe(true);
  expect((await loadProject(repo)).draft!.thinking.notes.map((n) => n.text)).toStrictEqual(['Draft']);
  // Discarding it with nothing unsaved leaves only the saved copy.
  expect(await notes.discard()).toBe(true);
  expect(await loadProject(repo)).toMatchObject({ saved: { thinking: { notes: [{ text: 'Saved' }, { text: 'New' }] } }, draft: null });
  expect(notes.offer).toBe(null);
  // Recovering a draft opens it as unsaved changes; deleting everything leaves nothing anywhere.
  await writeProject(repo, { saved: null, draft: { at: 3, thinking: { ...emptyThinking(), notes: [idea('Later')] } } });
  await notes.load();
  notes.recover();
  expect([notes.thinking.notes.map((n) => n.text), notes.dirty, notes.offer]).toStrictEqual([['Later'], true, null]);
  expect(await notes.deleteAll()).toBe(true);
  expect([notes.thinking, notes.saved, notes.offer, notes.dirty]).toStrictEqual([emptyThinking(), null, null, false]);
  expect(await loadProject(repo)).toStrictEqual({ saved: null, draft: null });
});

it('storage that cannot be read or written is said, and nothing is lost from the open notes', async () => {
  vi.stubGlobal('crypto', { subtle: { digest: () => Promise.reject(new Error('insecure context')) } });
  const notes = new ProjectNotes(repo);
  await notes.load();
  expect(notes.error).toBe('Galley could not use this browser’s storage: insecure context');
  notes.change((thinking) => thinking.notes.push(idea('Kept')));
  expect(await notes.save()).toBe(false);
  expect(await notes.discard()).toBe(false);
  expect(await notes.deleteAll()).toBe(false);
  expect(notes.thinking.notes.map((n) => n.text)).toStrictEqual(['Kept']);
  expect(notes.dirty).toBe(true);
  vi.unstubAllGlobals();
  // A failure that is not an error object is still said.
  vi.stubGlobal('crypto', { subtle: { digest: () => Promise.reject('locked') } });
  expect(await notes.save()).toBe(false);
  expect(notes.error).toBe('Galley could not use this browser’s storage: locked');
  vi.unstubAllGlobals();
  expect(await notes.save()).toBe(true);
  expect(notes.error).toBe(null);
});

it('too much to save is said with what to do about it', async () => {
  const notes = new ProjectNotes(repo);
  await notes.load();
  notes.change((thinking) => thinking.notes.push(...Array.from({ length: 300 }, (_, i) => ({ ...idea(`n${i}`), text: 'x'.repeat(3_900) }))));
  expect(await notes.save()).toBe(false);
  expect(notes.error).toBe('These notes are too large to save. Remove some notes or shorten them, then save again.');
});

it('a change made while saving stays unsaved, and its draft keeps the copy just saved', async () => {
  const notes = new ProjectNotes(repo);
  await notes.load();
  notes.change((thinking) => thinking.notes.push(idea('One')));
  const saving = notes.save();
  notes.change((thinking) => thinking.notes.push(idea('Two')));
  notes.flush();
  expect(await saving).toBe(true);
  await storageIdle();
  expect(notes.dirty).toBe(true);
  const stored = await loadProject(repo);
  expect([stored.saved!.thinking.notes.map((n) => n.text), stored.draft!.thinking.notes.map((n) => n.text)]).toStrictEqual([['One'], ['One', 'Two']]);
});
