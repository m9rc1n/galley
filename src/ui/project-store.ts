import { emptyThinking, parseThinking, type Thinking } from '../core/notes.ts';
import { ReaderError } from '../platforms/types.ts';

/**
 * Private notes about a repository, kept in extension storage on this device (ADR 0028). The key is a
 * fingerprint of the repository, so the list of keys never names what was read; the notes themselves
 * hold what the reader wrote, with the paths and headings it is about. Two copies: what the reader
 * saved, and a draft of unsaved changes to recover. Nothing is sent anywhere.
 */

const PREFIX = 'galley:project:';
/** Notes for one repository may take this much storage; beyond it, saving says so instead of failing silently. */
export const MAX_STORED_CHARS = 1_000_000;

export interface Copy {
  at: number;
  thinking: Thinking;
}

export interface Stored {
  saved: Copy | null;
  draft: Copy | null;
}

export async function digestText(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function projectKey(repository: string): Promise<string> {
  return `${PREFIX}${await digestText(repository)}`;
}

function area(): chrome.storage.StorageArea | null {
  return globalThis.chrome?.storage?.local ?? null;
}

function copy(value: unknown): Copy | null {
  const stored = value as Partial<Copy> | null;
  const thinking = parseThinking(stored?.thinking);
  return thinking && Number.isFinite(stored!.at) ? { at: stored!.at!, thinking } : null;
}

/** The saved notes and any unsaved draft. Unreadable storage reads as no notes, never as an error. */
export async function loadProject(repository: string): Promise<Stored> {
  const key = await projectKey(repository);
  let value: unknown;
  try {
    const store = area();
    value = store ? (await store.get(key))[key] : JSON.parse(localStorage.getItem(key) ?? 'null');
  } catch {
    value = null;
  }
  const stored = value as Partial<Stored> | null;
  return { saved: copy(stored?.saved), draft: copy(stored?.draft) };
}

/** Writes both copies, or removes the key when there is nothing to keep. Failures are thrown for the reader to see. */
export async function writeProject(repository: string, stored: Stored): Promise<void> {
  const key = await projectKey(repository);
  const store = area();
  if (!stored.saved && !stored.draft) {
    if (store) await store.remove(key);
    else localStorage.removeItem(key);
    return;
  }
  const json = JSON.stringify(stored);
  if (json.length > MAX_STORED_CHARS) throw new ReaderError('These notes are too large to save.', 'Remove some notes or shorten them, then save again.');
  if (store) await store.set({ [key]: stored });
  else localStorage.setItem(key, json);
}

/** How long after a change its draft is written, so typing does not write on every key. */
export const DRAFT_DELAY = 1_000;

/** Writes happen one at a time and in order, across readers, so a late draft never overwrites a save. */
let queue: Promise<unknown> = Promise.resolve();

/** Resolves when every write asked for so far has finished. */
export function storageIdle(): Promise<void> {
  return queue.then(() => {});
}

const failure = (err: unknown) =>
  err instanceof ReaderError
    ? `${err.message} ${err.hint}`
    : `Galley could not use this browser’s storage: ${err instanceof Error ? err.message : String(err)}`;

/**
 * One repository's notes while the reader is open: the saved copy, the changes since, and a draft of
 * those changes for recovery after a crash or a closed tab. A change is never saved until the reader
 * chooses Save; a draft left from an earlier visit is offered, never applied by itself.
 */
export class ProjectNotes {
  thinking: Thinking = emptyThinking();
  saved: Copy | null = null;
  /** Unsaved changes from an earlier visit, kept in storage until the reader recovers or discards them. */
  offer: Copy | null = null;
  dirty = false;
  error: string | null = null;
  private loaded = false;
  /** Changes made before storage answered, applied again on top of what it holds. */
  private readonly early: Array<(thinking: Thinking) => void> = [];
  private timer = 0;
  /** Counts changes, so a save knows whether something changed while it was written. */
  private version = 0;

  constructor(private readonly repository: string) {}

  async load(): Promise<void> {
    let stored: Stored = { saved: null, draft: null };
    try {
      stored = await loadProject(this.repository);
    } catch (err) {
      this.error = failure(err);
    }
    this.saved = stored.saved;
    this.offer = stored.draft;
    this.thinking = structuredClone(stored.saved?.thinking ?? emptyThinking());
    for (const change of this.early) change(this.thinking);
    this.loaded = true;
  }

  /** What the notes view says about saving. */
  get state(): string {
    if (this.dirty) return 'Unsaved changes';
    return this.saved ? `Saved ${when(this.saved.at)}` : 'Nothing saved yet';
  }

  change(mutate: (thinking: Thinking) => void): void {
    mutate(this.thinking);
    if (!this.loaded) this.early.push(mutate);
    this.dirty = true;
    this.version++;
    clearTimeout(this.timer);
    this.timer = window.setTimeout(() => void this.writeDraft(), DRAFT_DELAY);
  }

  async save(): Promise<boolean> {
    this.stopTimer();
    const saved = { at: Date.now(), thinking: structuredClone(this.thinking) };
    const version = this.version;
    // A draft offered for recovery stays recoverable until the reader decides about it.
    return this.write(
      () => ({ saved, draft: this.offer }),
      () => {
        this.saved = saved;
        // A change made while saving is still unsaved.
        this.dirty = this.version !== version;
      },
    );
  }

  /** The draft offered for recovery replaces what is open; it is still a change until saved. */
  recover(): void {
    this.thinking = structuredClone(this.offer!.thinking);
    this.offer = null;
    this.dirty = true;
  }

  discard(): Promise<boolean> {
    return this.write(
      () => ({ saved: this.saved, draft: this.dirty ? { at: Date.now(), thinking: this.thinking } : null }),
      () => {
        this.offer = null;
      },
    );
  }

  /** Every note, proposal and type for this repository, here and in storage. */
  deleteAll(): Promise<boolean> {
    this.stopTimer();
    return this.write(
      () => ({ saved: null, draft: null }),
      () => {
        this.thinking = emptyThinking();
        this.saved = this.offer = null;
        this.dirty = false;
      },
    );
  }

  /** The reader is closing: a draft still waiting is written now. */
  flush(): void {
    if (!this.timer) return;
    this.stopTimer();
    void this.writeDraft();
  }

  private stopTimer(): void {
    clearTimeout(this.timer);
    this.timer = 0;
  }

  private writeDraft(): Promise<boolean> {
    this.timer = 0;
    // Decided when its turn comes: after a save there is nothing to keep, and a draft offered for
    // recovery is not replaced by a newer one until the reader decides about it.
    return this.write(() => (this.dirty && !this.offer ? { saved: this.saved, draft: { at: Date.now(), thinking: this.thinking } } : null));
  }

  /** One write in the queue: what it writes is decided when its turn comes, and `done` follows it there. */
  private async write(make: () => Stored | null, done = () => {}): Promise<boolean> {
    const run = queue.then(async () => {
      const stored = make();
      if (stored) await writeProject(this.repository, stored);
      done();
    });
    queue = run.catch(() => {});
    try {
      await run;
    } catch (err) {
      this.error = failure(err);
      return false;
    }
    this.error = null;
    return true;
  }
}

export function when(at: number): string {
  return new Date(at).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' });
}
