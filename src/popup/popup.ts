import { BUILT_IN_ORIGINS, siteScript, siteScriptId } from '../platforms/sites.ts';
import { getToken, migrateTokens, setToken } from '../platforms/tokens.ts';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function statusLine(on: boolean, text: string): HTMLElement {
  const line = el('div', undefined, 'status');
  line.append(el('span', undefined, on ? 'dot on' : 'dot'), el('span', text));
  return line;
}

async function isEnabled(origin: string): Promise<boolean> {
  const [granted, scripts] = await Promise.all([
    chrome.permissions.contains({ origins: [`${origin}/*`] }),
    chrome.scripting.getRegisteredContentScripts({ ids: [siteScriptId(origin)] }),
  ]);
  return granted && scripts.length > 0;
}

/** Self-hosted GitLab and GitHub Enterprise need a one-time permission for their domain. */
async function renderSite(origin: string | null, tabId: number | undefined): Promise<void> {
  const section = $('#site');
  section.replaceChildren();
  if (!origin) {
    section.append(statusLine(false, 'Open a GitHub or GitLab page to use Galley.'));
    return;
  }
  const host = new URL(origin).host;
  if (BUILT_IN_ORIGINS.has(origin)) {
    section.append(statusLine(true, `Ready to use on ${host}.`));
    return;
  }
  if (await isEnabled(origin)) {
    const off = el('button', 'Disable on this site', 'secondary');
    off.addEventListener('click', async () => {
      await chrome.scripting.unregisterContentScripts({ ids: [siteScriptId(origin)] }).catch(() => {});
      await chrome.permissions.remove({ origins: [`${origin}/*`] });
      await renderSite(origin, tabId);
    });
    section.append(statusLine(true, `Enabled on ${host}.`), off);
    return;
  }
  const on = el('button', `Enable on ${host}`);
  on.addEventListener('click', async () => {
    // Must be the first call in the click handler: the browser requires a user gesture.
    const granted = await chrome.permissions.request({ origins: [`${origin}/*`] });
    if (!granted) return;
    await chrome.scripting.registerContentScripts([siteScript(origin)]).catch(() => {});
    if (tabId !== undefined) await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }).catch(() => {});
    await renderSite(origin, tabId);
  });
  section.append(el('p', `Using self-hosted GitLab or GitHub Enterprise on ${host}?`, 'muted'), on);
}

/** A token for another site is only saved once the site answers like a GitHub Enterprise Server. */
async function checkEnterprise(origin: string): Promise<string | null> {
  try {
    const res = await fetch(`${origin}/api/v3/meta`, { credentials: 'omit', cache: 'no-store' });
    const meta = (await res.json()) as { installed_version?: unknown };
    if (res.ok && typeof meta.installed_version === 'string') return null;
  } catch {
    // Treated as "not GitHub Enterprise" below.
  }
  return `${new URL(origin).host} could not be verified as a GitHub Enterprise Server. The token was not saved. Check the site address before trying again.`;
}

async function renderToken(origin: string): Promise<void> {
  const section = $('#token');
  section.hidden = false;
  const host = new URL(origin).host;
  const github = origin === 'https://github.com';
  $('h2').firstChild!.textContent = github ? 'GitHub token ' : `GitHub token for ${host} `;
  $<HTMLAnchorElement>('#token-link').href = `${origin}/settings/personal-access-tokens/new`;
  const input = $<HTMLInputElement>('#token-input');
  const status = $('#token-status');
  // Name the exact site: a token pasted into a look-alike site's prompt is a stolen token.
  $('#token-site').textContent = github
    ? 'Galley sends it only to github.com.'
    : `Only save a token here if ${host} is your organisation’s GitHub Enterprise Server. Galley sends it only to ${host}.`;
  if (!origin.startsWith('https://')) {
    input.disabled = true;
    $<HTMLButtonElement>('#token-form button').disabled = true;
    status.replaceChildren(statusLine(false, 'To save a token, open this site using HTTPS.'));
    return;
  }
  const refresh = async () => {
    const saved = await getToken(origin);
    status.replaceChildren();
    input.value = '';
    input.placeholder = saved ? 'Replace the saved token…' : 'github_pat_…';
    if (saved) {
      const remove = el('button', 'Remove token', 'secondary');
      remove.addEventListener('click', async () => {
        await setToken(origin, null);
        await refresh();
      });
      status.append(statusLine(true, 'A token is saved for this site.'), remove);
    }
  };
  $('#token-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = input.value.trim();
    if (!value) return;
    const problem = github ? null : await checkEnterprise(origin);
    if (problem) {
      status.replaceChildren(statusLine(false, problem));
      return;
    }
    await setToken(origin, value);
    await refresh();
  });
  await refresh();
}

async function main(): Promise<void> {
  await migrateTokens().catch(() => {});
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let url: URL | null = null;
  try {
    url = tab?.url ? new URL(tab.url) : null;
  } catch {
    url = null;
  }
  const origin = url && /^https?:$/.test(url.protocol) ? url.origin : null;
  await renderSite(origin, tab?.id);
  // A token only matters for GitHub: github.com, or the current site if it is GitHub Enterprise.
  const enterprise = origin && !BUILT_IN_ORIGINS.has(origin) && url && /\/pull\/\d+/.test(url.pathname);
  if (origin !== 'https://gitlab.com') await renderToken(enterprise ? origin! : 'https://github.com');
}

if (__GALLEY_DEV__) {
  const tag = el('span', 'dev', 'dev');
  document.querySelector('.brand')!.append(tag);
}

void main();
