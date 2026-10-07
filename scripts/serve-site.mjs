// Preview the built website; basePath also lets browser checks exercise a Pages project URL.
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const directory = fileURLToPath(new URL('../dist/site/', import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

export function startSiteServer(port = Number(process.env.PORT ?? 4185), basePath = '') {
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
      if (basePath && !pathname.startsWith(`${basePath}/`)) {
        res.writeHead(404).end('Not found');
        return;
      }
      const path = pathname.slice(basePath.length);
      const file = resolve(directory, `.${path.endsWith('/') ? `${path}index.html` : path}`);
      if (!file.startsWith(`${resolve(directory)}${sep}`)) {
        res.writeHead(403).end('Forbidden');
        return;
      }
      const body = await readFile(file);
      res
        .writeHead(200, {
          'content-type': types[extname(file)] ?? 'application/octet-stream',
          'cache-control': 'no-store',
        })
        .end(body);
    } catch {
      res.writeHead(404).end('Not found');
    }
  });
  return new Promise((resolveServer) => server.listen(port, '127.0.0.1', () => resolveServer(server)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = await startSiteServer();
  console.log(`Galley website → http://localhost:${server.address().port}`);
}
