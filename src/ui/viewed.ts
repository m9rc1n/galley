import type { DocContents, DocRef } from '../platforms/types.ts';

/** Store only a fingerprint, never repository content. A changed file gets a new key. */
export async function viewedKey(review: string, doc: DocRef, contents: DocContents): Promise<string> {
  const input = JSON.stringify([review, doc.path, doc.oldPath, doc.status, contents.base, contents.head]);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return `galley:viewed:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

export async function loadViewed(key: string): Promise<boolean> {
  const area = globalThis.chrome?.storage?.local;
  return area ? (await area.get(key))[key] === true : localStorage.getItem(key) === 'true';
}

/** Surface persistence errors so the UI never claims progress was saved when it wasn't. */
export async function saveViewed(key: string, viewed: boolean): Promise<void> {
  const area = globalThis.chrome?.storage?.local;
  if (area) {
    if (viewed) await area.set({ [key]: true });
    else await area.remove(key);
  } else {
    if (viewed) localStorage.setItem(key, 'true');
    else localStorage.removeItem(key);
  }
}
