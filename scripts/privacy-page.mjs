// Renders PRIVACY.md into store/privacy-policy.html, a standalone page to host as the privacy policy URL.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import markdownit from 'markdown-it';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = await readFile(`${root}PRIVACY.md`, 'utf8');
const body = markdownit({ html: false, linkify: true, typographer: true }).render(source);

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>mreadie privacy policy</title>
<style>
  :root { color-scheme: light dark; --bg: #ffffff; --fg: #242424; --muted: #6b6b6b; --rule: #e6e6e6; }
  @media (prefers-color-scheme: dark) { :root { --bg: #121212; --fg: #e6e6e6; --muted: #a0a0a0; --rule: #2e2e2e; } }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 19px/1.6 Charter, "Bitstream Charter", "Sitka Text", Cambria, Georgia, serif; }
  main { max-width: 680px; margin: 0 auto; padding: 56px 16px 96px; }
  h1, h2 { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; letter-spacing: -0.015em; }
  h1 { font-size: 36px; line-height: 1.2; margin: 0 0 8px; }
  h2 { font-size: 22px; margin: 2em 0 0.4em; }
  p, ul { margin: 0 0 1em; }
  em { color: var(--muted); }
  a { color: inherit; }
</style>
</head>
<body>
<main>
${body}</main>
</body>
</html>
`;

await mkdir(`${root}store`, { recursive: true });
await writeFile(`${root}store/privacy-policy.html`, page);
console.log('store/privacy-policy.html written');
