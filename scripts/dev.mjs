// Development build for your local Chrome: dist/dev, rebuilt on every change, with live reload.
//   npm run dev   then, once: chrome://extensions → Developer mode → Load unpacked → dist/dev
// The dev build is called "Galley (dev)", has an orange icon and DEV badges, and includes source
// maps. After each rebuild of the content script, the dev worker swaps it in and refreshes the
// active GitHub/GitLab tab (see src/dev/reload.ts). The popup picks up changes when reopened.
import { createHash } from 'node:crypto';
import { watch } from 'node:fs';
import { cp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { ORANGE, writeIcons } from './icons.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = `${root}dist/dev`;
const PORT = 35729;
const pkg = JSON.parse(await readFile(`${root}package.json`, 'utf8'));
const time = () => new Date().toLocaleTimeString();

// ---------------------------------------------------------------- live reload
// A minimal WebSocket server: the dev build's service worker connects and waits for "reload".
const clients = new Set();
const server = createServer((_, res) => res.end('Galley dev reload server\n'));
server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key || !String(req.headers.origin ?? '').startsWith('chrome-extension://')) {
    socket.destroy();
    return;
  }
  const accept = createHash('sha1').update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
  if (!clients.size) console.log(`${time()}  Chrome connected: live reload is on`);
  clients.add(socket);
  const drop = () => clients.delete(socket);
  socket.on('close', drop);
  socket.on('error', drop);
  socket.on('data', (frame) => {
    if ((frame[0] & 0x0f) === 0x8) socket.end(); // close frame
  });
});

function send(text) {
  const payload = Buffer.from(text);
  const frame = Buffer.concat([Buffer.from([0x81, payload.length]), payload]);
  for (const socket of clients) socket.write(frame);
}
setInterval(() => send('ping'), 20_000); // also keeps the extension's service worker awake

// ---------------------------------------------------------------- build
async function writeStatic() {
  const manifest = JSON.parse(await readFile(`${root}src/manifest.json`, 'utf8'));
  manifest.name = 'Galley (dev)';
  manifest.short_name = 'Galley dev';
  manifest.version = pkg.version;
  manifest.version_name = `${pkg.version}-dev`;
  manifest.action.default_title = 'Galley (dev)';
  manifest.background = { service_worker: 'dev-reload.js' };
  manifest.permissions = [...manifest.permissions, 'alarms'];
  // Content scripts are registered by the dev worker instead, so they can be swapped after rebuilds.
  delete manifest.content_scripts;
  await writeFile(`${out}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
  await cp(`${root}src/popup/popup.html`, `${out}/popup.html`);
  await cp(`${root}src/popup/popup.css`, `${out}/popup.css`);
}

const NEEDS_MANUAL_RELOAD = 'reload "Galley (dev)" once on chrome://extensions to apply it';
const done = {
  content: () => {
    console.log(`${time()}  content script rebuilt${clients.size ? ' → refreshing the active tab' : ''}`);
    send('content');
  },
  popup: () => console.log(`${time()}  popup rebuilt → reopen the popup to see it`),
  worker: () => console.log(`${time()}  dev worker rebuilt → ${NEEDS_MANUAL_RELOAD}`),
};
const timers = {};
function after(kind) {
  clearTimeout(timers[kind]);
  timers[kind] = setTimeout(done[kind], 150);
}

await rm(out, { recursive: true, force: true });
await writeIcons(`${out}/icons`, ORANGE);
await writeStatic();
const matches = JSON.parse(await readFile(`${root}src/manifest.json`, 'utf8')).content_scripts.flatMap((c) => c.matches);

const notify = (kind) => ({
  name: 'notify',
  setup(build) {
    let initial = true; // the first build happens at startup; only report rebuilds
    build.onEnd(async (result) => {
      if (result.errors.length) {
        const text = await esbuild.formatMessages(result.errors, { kind: 'error', color: true });
        console.log(text.join('\n'));
      } else if (!initial) {
        after(kind);
      }
      initial = false;
    });
  },
});

for (const [entry, file, kind] of [
  ['src/content/main.ts', 'content.js', 'content'],
  ['src/popup/popup.ts', 'popup.js', 'popup'],
  ['src/dev/reload.ts', 'dev-reload.js', 'worker'],
]) {
  const ctx = await esbuild.context({
    absWorkingDir: root,
    entryPoints: [entry],
    outfile: `${out}/${file}`,
    bundle: true,
    format: 'iife',
    target: ['chrome111'],
    loader: { '.css': 'text' },
    charset: 'utf8',
    sourcemap: 'inline',
    logLevel: 'silent',
    define: { __GALLEY_DEV__: 'true', __GALLEY_MATCHES__: JSON.stringify(matches) },
    plugins: [notify(kind)],
  });
  await ctx.watch();
}

// Popup markup, styles and the manifest are copied rather than bundled; watch them too.
watch(`${root}src/popup`, (_, name) => {
  if (name && /\.(html|css)$/.test(name)) writeStatic().then(done.popup, console.error);
});
watch(`${root}src/manifest.json`, () => {
  writeStatic().then(() => console.log(`${time()}  manifest changed → ${NEEDS_MANUAL_RELOAD}`), console.error);
});

server.on('error', (err) => {
  console.error(`Live reload is off: ${err.code === 'EADDRINUSE' ? `port ${PORT} is already in use` : err.message}`);
});
server.listen(PORT, '127.0.0.1', () => {
  console.log(`
Galley ${pkg.version} dev build → ${out}

  First time only:
    1. Open chrome://extensions and switch on Developer mode (top right).
    2. Click "Load unpacked" and choose the folder above.
    3. Turn off the store version of Galley, if you have it, while you develop.

  Then edit anything in src/. Each save rebuilds; content script changes refresh the active
  GitHub or GitLab tab automatically. Leave this running; stop it with Ctrl+C.

Live reload: ws://localhost:${PORT} (waiting for Chrome…)`);
});
