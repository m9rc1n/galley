// Turns store/LISTING.md into store/submit-helper.html: the same fields, in dashboard order, each
// with a Copy button (code blocks) or click-to-copy (inline code), plus the file paths to upload.
// The page is for you to keep open next to the Chrome Web Store dashboard; it is git-ignored.
//   npm run submit-helper
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import markdownit from 'markdown-it';

const root = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(await readFile(`${root}package.json`, 'utf8'));
const md = markdownit({ html: false, linkify: true });

// Real checkboxes for the "- [x] ..." items in the data-usage section.
const body = md
  .render(await readFile(`${root}store/LISTING.md`, 'utf8'))
  .replace(/<li>\[x\] /g, '<li><input type="checkbox" checked disabled> ')
  .replace(/<li>\[ \] /g, '<li><input type="checkbox" disabled> ');

const zip = `${root}dist/galley-chrome-${pkg.version}.zip`;
const assets = `${root}store/assets`;
const dashboard = 'https://chrome.google.com/webstore/devconsole';

const esc = (s) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Galley: store submission helper</title>
<style>
  :root { color-scheme: light dark; --bg: #fff; --fg: #1f2328; --muted: #59636e; --rule: #d1d9e0; --soft: #f6f8fa; --ok: #1a7f37; --accent: #0969da; }
  @media (prefers-color-scheme: dark) { :root { --bg: #0d1117; --fg: #e6edf3; --muted: #9198a1; --rule: #3d444d; --soft: #151b23; --ok: #3fb950; --accent: #4493f8; } }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 820px; margin: 0 auto; padding: 32px 20px 120px; }
  h1 { margin: 0 0 6px; font-size: 26px; }
  h2 { margin: 2.2em 0 .5em; padding-top: .6em; border-top: 1px solid var(--rule); font-size: 20px; }
  a { color: var(--accent); }
  p, ul { margin: .6em 0; }
  code { padding: .1em .35em; border-radius: 5px; background: var(--soft); font: 13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  p code, li code, td code { cursor: copy; }
  p code:hover, li code:hover, td code:hover { outline: 1px solid var(--accent); }
  .pre { position: relative; margin: .6em 0 1.2em; }
  pre { margin: 0; padding: 14px 80px 14px 16px; overflow-x: auto; border: 1px solid var(--rule); border-radius: 8px; background: var(--soft); white-space: pre-wrap; word-break: break-word; }
  pre code { padding: 0; background: none; font-size: 13px; }
  .copy { position: absolute; top: 8px; right: 8px; padding: 4px 12px; border: 1px solid var(--rule); border-radius: 6px; background: var(--bg); color: var(--fg); font: 600 12px system-ui, sans-serif; cursor: pointer; }
  .copy:hover { border-color: var(--accent); }
  .copy.done { border-color: var(--ok); color: var(--ok); }
  table { width: 100%; border-collapse: collapse; margin: .8em 0; }
  th, td { padding: 6px 10px; border-bottom: 1px solid var(--rule); text-align: left; }
  .start { margin: 18px 0 0; padding: 14px 18px; border: 1px solid var(--rule); border-radius: 10px; background: var(--soft); }
  .start ol { margin: .4em 0 0; padding-left: 1.3em; }
  .start li { margin: .5em 0; }
  .path { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
  .path code { flex: 1; overflow-x: auto; white-space: nowrap; }
  .path button { flex: none; padding: 3px 10px; border: 1px solid var(--rule); border-radius: 6px; background: var(--bg); color: var(--fg); font: 600 12px system-ui, sans-serif; cursor: pointer; }
  li input[type=checkbox] { margin-right: .4em; }
  #toast { position: fixed; left: 50%; bottom: 24px; padding: 8px 16px; border-radius: 999px; background: #1f2328; color: #fff; font-size: 13px; opacity: 0; transform: translate(-50%, 8px); transition: .15s; pointer-events: none; }
  #toast.show { opacity: 1; transform: translate(-50%, 0); }
</style>
</head>
<body>
<main>
<h1>Galley: store submission helper</h1>
<p>Generated from <code>store/LISTING.md</code>. Keep this page open next to the dashboard: press <b>Copy</b> on a block, or click any <code>inline code</code> to copy it.</p>

<div class="start">
  <b>Start here</b>
  <ol>
    <li>Open the <a href="${dashboard}/00462856-16c4-4557-aff6-8c2d27cda780" target="_blank" rel="noopener">Galley item in your dashboard</a> and choose <b>Package → Upload new package</b>.
      <div class="path"><code>${esc(zip)}</code><button data-copy="${esc(zip)}">Copy path</button></div>
      In the file dialog press <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>G</kbd> and paste this path.</li>
    <li>Images for the <b>Store listing</b> tab are in this folder (select several files at once in the picker):
      <div class="path"><code>${esc(assets)}</code><button data-copy="${esc(assets)}">Copy path</button></div></li>
    <li>Then work through the sections below, top to bottom.</li>
  </ol>
</div>

${body}
</main>
<div id="toast">Copied</div>
<script>
  const toast = document.getElementById('toast');
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); }
    catch { const t = document.createElement('textarea'); t.value = text; document.body.append(t); t.select(); document.execCommand('copy'); t.remove(); }
    toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 900);
  }
  for (const pre of document.querySelectorAll('pre')) {
    const wrap = document.createElement('div'); wrap.className = 'pre';
    pre.replaceWith(wrap); wrap.append(pre);
    const b = document.createElement('button'); b.className = 'copy'; b.textContent = 'Copy';
    b.onclick = async () => { await copy(pre.textContent.replace(/\\n$/, '')); b.textContent = 'Copied'; b.classList.add('done'); setTimeout(() => { b.textContent = 'Copy'; b.classList.remove('done'); }, 1500); };
    wrap.append(b);
  }
  for (const c of document.querySelectorAll('p code, li code, td code')) c.onclick = () => copy(c.textContent);
  for (const b of document.querySelectorAll('button[data-copy]')) b.onclick = () => copy(b.dataset.copy);
</script>
</body>
</html>
`;

await writeFile(`${root}store/submit-helper.html`, page);
console.log('store/submit-helper.html written');
