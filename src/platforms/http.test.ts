import { expect, it, vi } from 'vitest';
import { getJson, getText, HttpError, request } from './http.ts';

it('uses page credentials by default and preserves explicit request options', async () => {
  const fetch = vi.fn(async () => new Response('body')); vi.stubGlobal('fetch', fetch);
  expect(await getText('https://gitlab.example/file')).toBe('body');
  expect(fetch).toHaveBeenCalledWith('https://gitlab.example/file', { credentials: 'same-origin' });
  await request('https://gitlab.example/file', { credentials: 'omit', method: 'POST', body: 'payload' });
  expect(fetch).toHaveBeenLastCalledWith('https://gitlab.example/file', { credentials: 'omit', method: 'POST', body: 'payload' });
});

it('uses Firefox page fetch with cloned options, parsing JSON in the extension context', async () => {
  const headers = new Headers({ 'x-next-page': '2' });
  const response = new Response('{"id":12}', { headers });
  const json = vi.spyOn(response, 'json');
  const page = { fetch: vi.fn(async () => response) };
  const clone = vi.fn((value) => value);
  vi.stubGlobal('content', page); vi.stubGlobal('cloneInto', clone); vi.stubGlobal('fetch', vi.fn());
  expect(await getJson('https://gitlab.example/api')).toEqual({ data: { id: 12 }, headers: response.headers });
  expect(clone).toHaveBeenCalledWith({ credentials: 'same-origin' }, page);
  expect(page.fetch).toHaveBeenCalledOnce();
  expect(fetch).not.toHaveBeenCalled(); expect(json).not.toHaveBeenCalled();
});

it('retains HTTP status and headers for rate-limit handling, distinguishing network errors', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 429, headers: { 'retry-after': '60' } })));
  await expect(request('https://gitlab.example/api')).rejects.toMatchObject({ status: 429, url: 'https://gitlab.example/api', headers: expect.any(Headers) });
  vi.mocked(fetch).mockRejectedValue(new Error('Offline'));
  await expect(request('https://gitlab.example/api')).rejects.toEqual(new HttpError(0, 'https://gitlab.example/api', null));
});
