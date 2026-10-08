// The reading palette, as the reader passes it to the sandboxed diagram frame. Shared by both sides,
// and free of dependencies, so neither bundle pulls in the other's code.

/** The reader's colours, so a diagram looks like part of the page it is on. */
export interface DiagramPalette {
  bg: string;
  fg: string;
  muted: string;
  soft: string;
  rule: string;
  code: string;
  accent: string;
}

export const PALETTE_KEYS = ['bg', 'fg', 'muted', 'soft', 'rule', 'code', 'accent'] as const;

/** Plain hex colours only: nothing in a palette can be read as CSS or as a URL. */
export function isPalette(value: unknown): value is DiagramPalette {
  if (typeof value !== 'object' || value === null) return false;
  const entries = Object.entries(value);
  return entries.length === PALETTE_KEYS.length && entries.every(([key, colour]) => (PALETTE_KEYS as readonly string[]).includes(key) && typeof colour === 'string' && /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(colour));
}
