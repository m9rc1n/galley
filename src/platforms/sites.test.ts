import { afterEach, expect, it, vi } from 'vitest';
import { BUILT_IN_ORIGINS, restoreSites, siteScript, siteScriptId } from './sites.ts';

afterEach(() => vi.unstubAllGlobals());

function browser(origins: string[], registered: string[]) {
  const registerContentScripts = vi.fn(async () => undefined);
  vi.stubGlobal('chrome', {
    permissions: { getAll: async () => ({ origins }) },
    scripting: { getRegisteredContentScripts: async () => registered.map((id) => ({ id })), registerContentScripts },
  });
  return registerContentScripts;
}

it('restores the content script of every enabled site that an update cleared, and only those', async () => {
  const register = browser(
    ['https://github.com/*', 'https://gitlab.com/*', 'https://git.example.com/*', 'https://ghe.corp.example:8443/*', 'https://*/*'],
    [siteScriptId('https://git.example.com')],
  );
  expect(await restoreSites()).toEqual(['https://ghe.corp.example:8443']);
  expect(register).toHaveBeenCalledExactlyOnceWith([siteScript('https://ghe.corp.example:8443')]);
  expect(siteScript('https://ghe.corp.example:8443')).toEqual({
    id: 'galley-https-ghe-corp-example-8443', matches: ['https://ghe.corp.example:8443/*'], js: ['content.js'], runAt: 'document_idle', persistAcrossSessions: true,
  });
});

it('leaves the built-in sites to the manifest and does nothing when every enabled site is registered', async () => {
  const register = browser([...BUILT_IN_ORIGINS].map((origin) => `${origin}/*`), []);
  expect(await restoreSites()).toEqual([]);
  expect(register).not.toHaveBeenCalled();
});
