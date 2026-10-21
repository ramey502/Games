import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve('games/knockdown/build/web-mobile');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.wav': 'audio/wav',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
};
http
  .createServer((req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const file = path.resolve(
        root,
        '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname),
      );
      if (!file.startsWith(root + path.sep) || !statSync(file).isFile()) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, {
        'Content-Type': mime[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      createReadStream(file).pipe(res);
    } catch {
      res.writeHead(404).end();
    }
  })
  .listen(4173, '127.0.0.1', () => console.log('Game preview: http://127.0.0.1:4173'));
