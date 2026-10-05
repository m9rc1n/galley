import { applyPatch, parsePatch, reversePatch } from 'diff';

/**
 * Rebuild the "before" version of a file from its "after" version and the unified patch between
 * them (GitHub's pull-request files API returns hunks only, without file headers).
 * Returns null when the patch does not apply, e.g. if the branch moved while we were loading.
 */
export function reconstructBase(head: string, patch: string): string | null {
  try {
    const parsed = parsePatch(patch);
    if (parsed.length !== 1) return null;
    const result = applyPatch(head, reversePatch(parsed[0]));
    return result === false ? null : result;
  } catch {
    return null;
  }
}
