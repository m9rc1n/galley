// Builds the extension for Chrome and Firefox into dist/<browser>, plus the demo bundle.
//   node scripts/build.mjs           one-off build
//   node scripts/build.mjs --watch   rebuild on change
//   node scripts/build.mjs --zip     also write store-ready zips to dist/
import { execFileSync } from 'node:child_process';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(await readFile(`${root}package.json`, 'utf8'));
const watch = process.argv.includes('--watch');
const zip = process.argv.includes('--zip');

const common = {
  absWorkingDir: root,
  bundle: true,
  format: 'iife',
  target: ['chrome111', 'firefox128', 'safari16'],
  loader: { '.css': 'text', '.woff2': 'binary' },
  charset: 'utf8',
  legalComments: 'eof',
  logLevel: 'warning',
  metafile: true,
  define: { __GALLEY_DEV__: 'false' },
  // Folds constants so dev-only branches disappear; names and whitespace stay readable for store review.
  minifySyntax: true,
};

const bundles = [
  { name: 'content', entryPoints: ['src/content/main.ts'], outfile: 'dist/.build/content.js', shipped: true },
  { name: 'popup', entryPoints: ['src/popup/popup.ts'], outfile: 'dist/.build/popup.js', shipped: true },
  { name: 'background', entryPoints: ['src/background/worker.ts'], outfile: 'dist/.build/background.js', shipped: true },
  // Mermaid and highlight.js run only inside sandboxed frames (src/ui/sandbox.ts), never in the page.
  { name: 'diagram-frame', entryPoints: ['src/ui/diagram-frame.ts'], outfile: 'dist/.build/diagram-frame.js', shipped: true },
  { name: 'highlight-frame', entryPoints: ['src/ui/highlight-frame.ts'], outfile: 'dist/.build/highlight-frame.js', shipped: true },
  { name: 'demo', entryPoints: ['demo/main.ts'], outfile: 'demo/build/demo.js', shipped: false },
];
const FRAMES = ['diagram-frame', 'highlight-frame'];
const metafiles = new Map();

/** License texts of every npm package that ends up inside the shipped bundles. */
async function thirdPartyNotices() {
  const dirs = new Set();
  for (const b of bundles.filter((b) => b.shipped)) {
    for (const input of Object.keys(metafiles.get(b.name)?.inputs ?? {})) {
      const m = /^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//.exec(input);
      if (m) dirs.add(m[1]);
    }
  }
  let text = 'Galley includes the following open-source software.\n\n';
  for (const dir of [...dirs].sort()) {
    const meta = JSON.parse(await readFile(`${root}${dir}/package.json`, 'utf8'));
    const file = (await readdir(`${root}${dir}`)).find((f) => /^(licen[cs]e|copying)(?:[-_.][\w-]+)?(?:\.(md|txt))?$/i.test(f));
    const url = meta.homepage ?? meta.repository?.url ?? meta.repository ?? '';
    text += `${'-'.repeat(72)}\n${meta.name} ${meta.version} — ${meta.license ?? 'see below'}\n${url}\n\n`;
    text += file ? `${(await readFile(`${root}${dir}/${file}`, 'utf8')).trim()}\n\n` : 'License text not included in the package.\n\n';
  }
  for (const font of ['Newsreader', 'DM-Sans']) {
    text += `${'-'.repeat(72)}\n${font} — SIL Open Font License 1.1\n\n`;
    text += `${(await readFile(`${root}src/ui/fonts/${font}-OFL.txt`, 'utf8')).trim()}\n\n`;
  }
  return text;
}

/** Token storage must only ever run in the popup and the background worker, never inside a web page. */
function checkTokenIsolation() {
  for (const name of ['content', 'diagram-frame', 'highlight-frame']) {
    const inputs = Object.keys(metafiles.get(name)?.inputs ?? {});
    const leak = inputs.find((input) => /src\/(platforms\/tokens|background\/)/.test(input));
    if (leak) throw new Error(`${name}.js must not include ${leak}: GitHub tokens would be reachable from the page.`);
  }
}

async function assemble() {
  if (!bundles.every((bundle) => metafiles.has(bundle.name))) return;
  checkTokenIsolation();
  await mkdir(`${root}demo/build`, { recursive: true });
  for (const frame of FRAMES) {
    await cp(`${root}dist/.build/${frame}.js`, `${root}demo/build/${frame}.js`);
    await cp(`${root}src/ui/${frame}.html`, `${root}demo/build/${frame}.html`);
  }
  const manifest = JSON.parse(await readFile(`${root}src/manifest.json`, 'utf8'));
  manifest.version = pkg.version;
  const notices = await thirdPartyNotices();
  for (const browser of ['chrome', 'firefox']) {
    const out = `${root}dist/${browser}`;
    await rm(out, { recursive: true, force: true });
    await mkdir(out, { recursive: true });
    await cp(`${root}dist/.build/content.js`, `${out}/content.js`);
    for (const frame of FRAMES) {
      await cp(`${root}dist/.build/${frame}.js`, `${out}/${frame}.js`);
      await cp(`${root}src/ui/${frame}.html`, `${out}/${frame}.html`);
    }
    await cp(`${root}dist/.build/popup.js`, `${out}/popup.js`);
    await cp(`${root}dist/.build/background.js`, `${out}/background.js`);
    await cp(`${root}src/popup/popup.html`, `${out}/popup.html`);
    await cp(`${root}src/popup/popup.css`, `${out}/popup.css`);
    await cp(`${root}src/icons`, `${out}/icons`, { recursive: true });
    await writeFile(`${out}/THIRD_PARTY_NOTICES.txt`, notices);
    const m = structuredClone(manifest);
    // Chrome runs the background as a service worker; Firefox as an event page script.
    m.background = browser === 'firefox' ? { scripts: ['background.js'] } : { service_worker: 'background.js' };
    if (browser === 'firefox') {
      delete m.minimum_chrome_version;
      for (const resource of m.web_accessible_resources ?? []) delete resource.use_dynamic_url;
      // Firefox has no sandbox pages. The frame's sandbox attribute gives it an opaque origin without
      // extension APIs there, and the page's own meta CSP still blocks network access.
      delete m.sandbox;
      delete m.content_security_policy;
      m.browser_specific_settings = {
        gecko: { id: 'galley@m9rc1n.github.io', strict_min_version: '128.0', data_collection_permissions: { required: ['none'] } },
      };
    }
    await writeFile(`${out}/manifest.json`, `${JSON.stringify(m, null, 2)}\n`);
    if (zip) {
      const file = `${root}dist/galley-${browser}-${pkg.version}.zip`;
      await rm(file, { force: true });
      execFileSync('zip', ['-qrX', file, '.'], { cwd: out });
    }
  }
  console.log(`Galley ${pkg.version} built → dist/chrome, dist/firefox${zip ? ' (+ zips)' : ''}`);
}

if (watch) {
  let pending = 0;
  const track = (name) => ({
    name: 'assemble',
    setup: (b) =>
      b.onEnd((result) => {
        if (result.metafile) metafiles.set(name, result.metafile);
        clearTimeout(pending);
        pending = setTimeout(assemble, 50);
      }),
  });
  for (const { name, shipped, ...b } of bundles) await (await esbuild.context({ ...common, ...b, plugins: [track(name)] })).watch();
  console.log('watching for changes…');
} else {
  await Promise.all(
    bundles.map(async ({ name, shipped, ...b }) => metafiles.set(name, (await esbuild.build({ ...common, ...b })).metafile)),
  );
  await assemble();
}
