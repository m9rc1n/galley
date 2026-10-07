/**
 * chrome.storage.local key written after a token is saved or removed, so open reviews on that site
 * reload with it. It holds only the site and a time, never the token: content scripts can read it.
 */
export const TOKENS_CHANGED = 'galley:tokens-changed';

export interface TokensChanged {
  origin: string;
  at: number;
}
