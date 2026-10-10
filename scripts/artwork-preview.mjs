// A local, read-only preview of the mission artwork and repository documentation.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';
import { ARTWORK, CAPTURES, artworkHtml } from './artwork.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const documents = new Set(['README.md', 'PRIVACY.md', 'SECURITY.md', 'CONTRIBUTING.md', 'PUBLISHING.md', 'LICENSE', 'store/LISTING.md', 'store/ARTWORK.md']);
const images = new Set([...ARTWORK.map((art) => art.name), ...CAPTURES]);
const markdown = new MarkdownIt({ html: true });
markdown.renderer.rules.heading_open = (tokens, index, options, _env, renderer) => {
  const title = tokens[index + 1]?.content ?? '';
  tokens[index].attrSet(
    'id',
    title
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
      .trim()
      .replace(/\s+/g, '-'),
  );
  return renderer.renderToken(tokens, index, options);
};
const styles = `
*{box-sizing:border-box}body{margin:0;background:#f4f3eb;color:#25392f;font:16px/1.6 system-ui,-apple-system,sans-serif}
main{max-width:1150px;margin:0 auto;padding:32px 24px 80px}header{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:30px}
a{color:#35634a;text-underline-offset:3px}header a{font-size:14px}h1{font:400 42px/1.1 Georgia,serif;letter-spacing:-1px;margin:0 0 14px}
h2{font:400 28px/1.2 Georgia,serif;margin-top:38px}p{margin:12px 0}img{display:block;max-width:100%;height:auto}.hero{border-radius:8px}
.grid{display:grid;grid-template-columns:440px 1fr;gap:44px;align-items:center;margin:44px 0}.label{color:#6c796b;font-size:12px;margin-top:10px}
.markdown{max-width:960px}.markdown h1{margin-top:30px}.markdown h2{padding-top:10px;border-top:1px solid #dce1d5}.markdown h3{margin-top:30px}
.markdown img{margin:24px 0}.markdown pre{padding:18px;background:#e8ece1;overflow:auto;border-radius:8px}.markdown code{font:13px/1.6 ui-monospace,monospace}
.markdown table{width:100%;border-collapse:collapse;font-size:14px}.markdown th,.markdown td{padding:12px;text-align:left;vertical-align:top;border-bottom:1px solid #dce1d5}
.markdown kbd{font-size:12px;padding:2px 5px;border:1px solid #cbd3c2;border-radius:4px}.markdown ul{padding-left:22px}.markdown li{margin:9px 0}
@media(max-width:760px){main{padding:24px 16px 50px}h1{font-size:34px}header{align-items:flex-start}.grid{grid-template-columns:1fr;gap:20px}.markdown table{font-size:12px}.markdown th,.markdown td{padding:7px}}
`;
const shell = (title, content) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${styles}</style></head><body>${content}</body></html>`;

const server = createServer(async (req, res) => {
  if (req.method !== 'GET') {
    res.writeHead(405).end('Read-only preview');
    return;
  }
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;
  res.setHeader('cache-control', 'no-store');
  try {
    if (path.startsWith('/artwork/')) {
      const art = ARTWORK[Number(path.slice('/artwork/'.length))];
      if (!art) {
        res.writeHead(404).end('Artwork not found');
        return;
      }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(await artworkHtml(art));
      return;
    }
    const name = path.replace(/^\/store\/assets\//, '');
    if (path.startsWith('/store/assets/') && images.has(name)) {
      res.writeHead(200, { 'content-type': name.endsWith('.png') ? 'image/png' : 'image/jpeg' }).end(await readFile(`${root}store/assets/${name}`));
      return;
    }
    const doc = path === '/readme' ? 'README.md' : path.slice(1);
    if (documents.has(doc)) {
      // Badges remain in the GitHub README. This local preview never requests remote badge images.
      const source = (await readFile(`${root}${doc}`, 'utf8')).replace(/^\[!\[.*\n/gm, '');
      const content = markdown.render(source);
      res
        .writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        .end(
          shell(
            `Galley — ${doc}`,
            `<main class="markdown"><header><a href="/">← Mission & artwork</a><a href="https://github.com/m9rc1n/galley">Source on GitHub</a></header>${content}</main>`,
          ),
        );
      return;
    }
    if (path !== '/') {
      res.writeHead(404).end('Not found');
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(
      shell(
        'Galley — Mission & artwork',
        `<main>
<header><div><h1>Understand changes. Review in peace.</h1><p>Clearer code and document reviews for teams on GitHub and GitLab.</p></div><a href="/readme">Read the README →</a></header>
<img class="hero" src="/store/assets/readme-hero-1600x640.png" alt="Galley. Understand changes. Review in peace: the same review as a diff and as readable content with edits in context">
<p class="label">README hero and store marquee · a typeset illustration, labelled as one.</p>
<div class="grid"><div><img src="/store/assets/promo-small-440x280.jpg" alt="Galley small promotional tile"><p class="label">Store tile · 440 × 280</p></div>
<div><h2>Context for the change. Space for the discussion.</h2><p>Read documents and code, see edits in context, and discuss the details beside the relevant text.</p><p><strong>Built in the open.</strong> GPL-licensed, with source and limitations you can inspect.</p><p><strong>Private by default.</strong> Local rendering, no analytics and no Galley backend.</p><p><strong>Part of your workflow.</strong> Ordinary GitHub and GitLab review conversations.</p></div></div>
<h2>Before and after</h2><img src="/store/assets/before-after-1600x640.jpg" alt="The same merge request as a diff and in Galley"><p class="label">README · two real captures of the demo.</p>
<h2>The real reader</h2><img src="/store/assets/screenshot-1-read.jpg" alt="The real Galley reader with document changes and review threads"><p class="label">Store screenshot: a real reader capture under one line of copy.</p>
</main>`,
      ),
    );
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    if (!res.headersSent) res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Preview file not found');
  }
});
server.listen(Number(process.env.PORT ?? 4180), '127.0.0.1', () => console.log(`Galley artwork → http://localhost:${server.address().port}`));
