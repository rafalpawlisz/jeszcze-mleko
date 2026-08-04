// Static server for local development: node serve.js
//
// Built-in Node modules only — no npm install. Not meant for production, the
// app is hosted on GitHub Pages.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const PORT = Number(process.argv[2]) || 8000;
const ROOT = resolve(import.meta.dirname);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === '/' ? '/index.html' : url.pathname;

  // Two traps here, both of which this used to walk straight into.
  //
  // new URL() collapses "../" for us, but it does NOT decode "%2e%2e%2f" — so
  // decoding before resolving reintroduced an escape that normalisation had
  // already dealt with. Decode first, then resolve, and let resolve() flatten
  // whatever the decoding brought back.
  //
  // And the containment check needs the separator: plain startsWith(ROOT) also
  // accepts a sibling directory whose name merely begins with ROOT's.
  let filePath;
  try {
    filePath = resolve(ROOT, `.${decodeURIComponent(requested)}`);
  } catch {
    res.writeHead(400).end('Bad request'); // malformed percent-encoding
    return;
  }

  if (filePath !== ROOT && !filePath.startsWith(ROOT + sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const body = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath)] || 'application/octet-stream',
      // No caching — otherwise the browser keeps stale files after an edit.
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404');
  }
}).listen(PORT, () => {
  console.log(`Jeszcze Mleko: http://localhost:${PORT}`);
});
