// Development build only (`npm run dev`): background service worker for live reload.
//
// The dev manifest declares no content scripts. This worker registers them instead, so after each
// rebuild it can register them again, which makes Chrome read the new content.js from disk, and
// then refresh the active tab. No extension reload is needed (runtime.reload() is not reliable for
// unpacked extensions in current Chrome). Messages appear in this worker's console:
// chrome://extensions → mreadie (dev) → service worker.
const DEV_SERVER = 'ws://localhost:35729';
const MAIN_SCRIPT = 'mreadie-dev-main';

let socket: WebSocket | null = null;

async function ensureRegistered(): Promise<void> {
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [MAIN_SCRIPT] });
  if (existing.length) return;
  await chrome.scripting.registerContentScripts([
    { id: MAIN_SCRIPT, matches: __MREADIE_MATCHES__, js: ['content.js'], runAt: 'document_idle', persistAcrossSessions: true },
  ]);
}

/** Re-register every content script (ours and self-hosted sites enabled in the popup), then refresh the active tab. */
async function swapContentScripts(): Promise<void> {
  await ensureRegistered();
  const scripts = await chrome.scripting.getRegisteredContentScripts();
  await chrome.scripting.unregisterContentScripts({ ids: scripts.map((s) => s.id) });
  // mreadie only registers JavaScript (content.js), for its own sites and for self-hosted ones.
  await chrome.scripting.registerContentScripts(
    scripts.map(({ id, matches, excludeMatches, js, runAt, allFrames, persistAcrossSessions }) => ({
      id,
      matches,
      excludeMatches,
      js: js ?? ['content.js'],
      runAt,
      allFrames,
      persistAcrossSessions,
    })),
  );
  const tabs = await chrome.tabs.query({ active: true, url: scripts.flatMap((s) => s.matches ?? []) });
  for (const tab of tabs) if (tab.id !== undefined) await chrome.tabs.reload(tab.id);
  console.log(`mreadie dev: content script updated, refreshed ${tabs.length} tab${tabs.length === 1 ? '' : 's'}`);
}

function connect(): void {
  if (socket && socket.readyState <= WebSocket.OPEN) return;
  socket = new WebSocket(DEV_SERVER);
  socket.onopen = () => console.log('mreadie dev: connected to the dev server, live reload on');
  socket.onmessage = (event) => {
    if (event.data === 'content') swapContentScripts().catch((err) => console.error('mreadie dev: update failed', err));
  };
  socket.onclose = () => {
    socket = null;
    setTimeout(connect, 2000);
  };
}

// The dev server pings every 20 s, which keeps this worker alive while it runs. If the worker
// was stopped anyway (dev server not running yet), the alarm brings it back to reconnect.
chrome.alarms.create('mreadie-dev-reconnect', { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener(connect);
ensureRegistered().catch((err) => console.error('mreadie dev: could not register the content script', err));
connect();
