// Self-hosted GitLab and GitHub Enterprise sites the reader enabled from the toolbar popup.

/** Sites Galley runs on without asking: their content script is declared in the manifest. */
export const BUILT_IN_ORIGINS = new Set(['https://github.com', 'https://gitlab.com']);

/** The id of the content script registered for one enabled site. */
export function siteScriptId(origin: string): string {
  return `galley-${origin.replace(/[^a-z0-9]+/gi, '-')}`;
}

export function siteScript(origin: string): chrome.scripting.RegisteredContentScript {
  return { id: siteScriptId(origin), matches: [`${origin}/*`], js: ['content.js'], runAt: 'document_idle', persistAcrossSessions: true };
}

/**
 * The granted host permission is the record of an enabled site. Browsers clear registered content
 * scripts when an extension updates, which would make the reader ask for every site again, so the
 * background worker restores the missing ones from the permissions on install, update and start.
 */
export async function restoreSites(): Promise<string[]> {
  const { origins = [] } = await chrome.permissions.getAll();
  const registered = new Set((await chrome.scripting.getRegisteredContentScripts()).map((script) => script.id));
  const missing = origins
    .map((pattern) => pattern.replace(/\/\*$/, ''))
    .filter((origin) => /^https?:\/\/[^/*]+$/.test(origin) && !BUILT_IN_ORIGINS.has(origin) && !registered.has(siteScriptId(origin)));
  if (missing.length) await chrome.scripting.registerContentScripts(missing.map(siteScript));
  return missing;
}
