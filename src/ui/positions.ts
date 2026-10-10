import { readStored, writeStored } from './settings.ts';

const KEY = 'galley:positions';
/** Only the most recent reviews are remembered. */
const LIMIT = 50;

/** Fingerprints, never the review's address or a file's path: nothing readable about what was reviewed is kept. */
async function fingerprint(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

type Saved = Record<string, { file: string; offset: number; at: number }>;

async function all(): Promise<Saved> {
  const saved = await readStored<Saved>(KEY);
  return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
}

/** Where the reader was in a review: which of `paths`, and how far into it, in pixels from its top. */
export async function loadPosition(review: string, paths: string[]): Promise<{ path: string; offset: number } | null> {
  const saved = (await all())[await fingerprint(review)];
  if (!saved || typeof saved.file !== 'string' || !Number.isFinite(saved.offset)) return null;
  for (const path of paths) if ((await fingerprint(path)) === saved.file) return { path, offset: saved.offset };
  return null;
}

export async function savePosition(review: string, path: string, offset: number): Promise<void> {
  const saved = { ...(await all()), [await fingerprint(review)]: { file: await fingerprint(path), offset, at: Date.now() } };
  const recent = Object.entries(saved)
    .sort(([, a], [, b]) => b.at - a.at)
    .slice(0, LIMIT);
  await writeStored(KEY, Object.fromEntries(recent));
}
