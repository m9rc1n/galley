export class HttpError extends Error {
  readonly status: number;
  readonly url: string;
  readonly headers: Headers | null;
  constructor(
    status: number,
    url: string,
    headers: Headers | null,
  ) {
    super(`HTTP ${status} for ${url}`);
    this.status = status;
    this.url = url;
    this.headers = headers;
  }
}

type FirefoxContentGlobals = {
  content?: { fetch: typeof fetch };
  cloneInto?: <T>(value: T, target: object) => T;
};

/**
 * In Firefox, content-script fetches carry the extension's identity; `content.fetch` sends the
 * request as the page itself, which is what we want (same-origin cookies, same CORS rules).
 * Chrome content scripts already behave that way.
 */
function pageFetch(url: string, init: RequestInit): Promise<Response> {
  const g = globalThis as unknown as FirefoxContentGlobals;
  if (g.content && typeof g.content.fetch === 'function' && typeof g.cloneInto === 'function') {
    return g.content.fetch(url, g.cloneInto(init, g.content));
  }
  return fetch(url, init);
}

export async function request(url: string, init: RequestInit = {}): Promise<Response> {
  let res: Response;
  try {
    res = await pageFetch(url, { credentials: 'same-origin', ...init });
  } catch {
    throw new HttpError(0, url, null);
  }
  if (!res.ok) throw new HttpError(res.status, url, res.headers);
  return res;
}

export async function getText(url: string, init?: RequestInit): Promise<string> {
  return (await request(url, init)).text();
}

/** Parse in our own context (rather than `res.json()`) so Firefox never hands us page-owned objects. */
export async function getJson<T>(url: string, init?: RequestInit): Promise<{ data: T; headers: Headers }> {
  const res = await request(url, init);
  return { data: JSON.parse(await res.text()) as T, headers: res.headers };
}
