// Zero-dependency static file server for previewing and rendering.
// Usage: node tools/serve.js [port]   (default 8090, serves the project root)
const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.woff2': 'font/woff2',
  '.srt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
};

function startServer(port, root) {
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') {
      // redirect (not rewrite) so relative paths inside src/index.html resolve correctly
      res.writeHead(301, { Location: '/src/index.html' });
      return res.end();
    }
    if (urlPath === '/api/library') {
      // List library asset ids per category (room / characters / props JSONs)
      // for the 3D Model View page.
      const out = { rooms: [], characters: [], props: [] };
      const dirs = { rooms: 'room', characters: 'characters', props: 'props' };
      for (const [key, sub] of Object.entries(dirs)) {
        try {
          const dir = path.join(root, 'library', sub);
          for (const f of fs.readdirSync(dir).sort()) {
            if (f.endsWith('.json')) out[key].push(f.replace(/\.json$/, ''));
          }
        } catch (e) { /* missing library subfolder */ }
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify(out));
    }
    if (urlPath === '/api/episodes') {
      // List available episodes (episodes/*/scenario.json) for the picker UI.
      const list = [];
      try {
        const dir = path.join(root, 'episodes');
        for (const name of fs.readdirSync(dir).sort()) {
          try {
            const s = JSON.parse(fs.readFileSync(path.join(dir, name, 'scenario.json'), 'utf8'));
            list.push({ id: name, title: s.title || name, subtitle: s.subtitle || '' });
          } catch (e) { /* skip folders without a valid scenario.json */ }
        }
      } catch (e) { /* no episodes/ dir yet */ }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify(list));
    }
    const filePath = path.join(root, urlPath);
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end('Not found: ' + urlPath);
      }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(data);
    });
  });
  server.listen(port);
  return server;
}

if (require.main === module) {
  const port = Number(process.argv[2]) || 8090;
  const root = path.join(__dirname, '..');
  startServer(port, root);
  console.log('Preview running at  http://127.0.0.1:' + port + '/');
  console.log('Open in a browser. Press Ctrl+C to stop.');
}

module.exports = { startServer };
