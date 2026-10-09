// Background worker: the only place that reads GitHub tokens and sends them to GitHub.
// Content scripts ask for specific API calls; the token never enters the page's renderer.
import { allowedRequest, fetchGitHub, FORWARDED_HEADERS, type ApiMessage, type ApiReply } from '../platforms/github-api.ts';
import { restoreSites } from '../platforms/sites.ts';
import { getToken, migrateTokens } from '../platforms/tokens.ts';

async function handle(message: ApiMessage, sender: chrome.runtime.MessageSender): Promise<ApiReply | { has: boolean }> {
  // Only Galley's own content scripts, and the site comes from the browser, not from the message.
  if (sender.id !== chrome.runtime.id || !sender.tab || !sender.url) return { error: 'Refused.' };
  const page = new URL(sender.url);
  const token = page.protocol === 'https:' ? await getToken(page.origin) : null;
  if (message.type === 'galley:has-token') return { has: Boolean(token) };
  if (!allowedRequest(page.origin, sender.url, message.url, message.method, message.body)) return { error: 'Galley does not make this request.' };
  try {
    const res = await fetchGitHub(message.url, message.method, message.body, token);
    const headers: Record<string, string> = {};
    for (const name of FORWARDED_HEADERS) {
      const value = res.headers.get(name);
      if (value !== null) headers[name] = value;
    }
    return { status: res.status, body: await res.text(), headers };
  } catch {
    return { status: 0, body: '', headers: {} };
  }
}

chrome.runtime.onMessage.addListener((message: ApiMessage, sender, reply) => {
  if (message?.type !== 'galley:github' && message?.type !== 'galley:has-token') return false;
  handle(message, sender).then(reply, (err) => reply({ error: err instanceof Error ? err.message : String(err) }));
  return true;
});

// Sites enabled from the popup lose their content script when the extension updates: restore them.
const restore = () => {
  restoreSites().catch(() => {
    // A site the browser cannot register for stays listed as off in the popup, where it can be enabled again.
  });
};
chrome.runtime.onInstalled.addListener(restore);
chrome.runtime.onStartup.addListener(restore);

migrateTokens().catch(() => {
  // Tokens stay where they were and are migrated on the next start.
});
