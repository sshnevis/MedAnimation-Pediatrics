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
