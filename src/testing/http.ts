import { vi } from 'vitest';

/** A JSON response, as `fetch` would return it. */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

/** Request headers as a plain object: Galley builds them that way, and tests read them that way. */
export function headersOf(init: RequestInit | undefined): Record<string, string> {
  return { ...(init?.headers as Record<string, string> | undefined) };
}

type Handler = (url: string, init: RequestInit | undefined) => Response | Promise<Response>;

/** Replace `fetch` for the current test. The handler gets the URL as a string; vitest restores `fetch` afterwards. */
export function mockFetch(handler: Handler) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => handler(input instanceof Request ? input.url : String(input), init));
}
