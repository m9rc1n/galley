// Reads from GitHub shared by pull requests and repositories: brief retries for transient failures,
// same-origin raw files, and what a failed request means for the reader.
import { getText, HttpError } from './http.ts';
import { ReaderError } from './types.ts';

const READ_RETRY_DELAYS = [250, 750];

/** Briefly retry transient reads, keeping the same URL/revision. Writes never pass through here. */
export async function readWithRetry<T>(read: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await read();
    } catch (err) {
      if (!(err instanceof HttpError) || attempt >= READ_RETRY_DELAYS.length) throw err;
      const retryAfter = err.headers?.get('retry-after');
      if (err.status === 403 || err.status === 429) {
        // Secondary limits may name a short cooldown. Quota and permission failures need action.
        if (!retryAfter || err.headers?.get('x-ratelimit-remaining') === '0' || err.headers?.get('x-github-sso')) throw err;
      } else if (![0, 408, 500, 502, 503, 504].includes(err.status)) throw err;
      const cooldown = Number(retryAfter ?? '0') * 1000;
      // Do not retry before GitHub's requested cooldown or leave the reader waiting for a long one.
      if (!Number.isFinite(cooldown) || cooldown < 0 || cooldown > 2000) throw err;
      await new Promise((resolve) => setTimeout(resolve, Math.max(READ_RETRY_DELAYS[attempt], cooldown)));
    }
  }
}

/** A file read same-origin with the reader's GitHub session, retried briefly when the connection fails. */
export function readRawFile(url: string): Promise<string> {
  return readWithRetry(async () => {
    try {
      return await getText(url, { cache: 'no-store' });
    } catch (err) {
      // A connection can also fail while consuming an otherwise successful response body.
      if (err instanceof TypeError) throw new HttpError(0, url, null);
      throw err;
    }
  });
}

/** What a failed GitHub request means for the reader; `notFound` explains a 404 in this context. */
export function explainGitHub(err: unknown, hasToken: boolean, notFound: () => ReaderError): Error {
  if (!(err instanceof HttpError)) return err instanceof Error ? err : new Error(String(err));
  const remaining = err.headers?.get('x-ratelimit-remaining');
  if ((err.status === 403 || err.status === 429) && remaining === '0') {
    return new ReaderError(
      'GitHub API rate limit reached.',
      hasToken
        ? 'Wait a few minutes and try again.'
        : 'Without a token GitHub allows 60 requests per hour. Add a read-only token in the Galley toolbar popup to raise the limit.',
      !hasToken,
    );
  }
  if (err.status === 403 && err.headers?.get('x-github-sso')) {
    return new ReaderError('Your GitHub token is not authorized for this organization.', 'Authorize the token for SSO in your GitHub token settings.', true);
  }
  if (err.status === 401) return new ReaderError('GitHub rejected the token.', 'Replace it in the Galley toolbar popup.', true);
  if (err.status === 404) return notFound();
  if (err.status === 0) return new ReaderError('Could not reach GitHub.', 'Check your connection and try again.');
  return new ReaderError(`GitHub returned an error (${err.status}).`, 'Try again in a moment.');
}
