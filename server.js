const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3010;
const ROOT = __dirname;

// MIME types for static file serving
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.otf': 'font/otf',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
};

const server = http.createServer((req, res) => {
  // ── Save endpoint ──────────────────────────────────────
  if (req.method === 'POST' && req.url === '/api/save') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { file, data } = JSON.parse(body);

        // Sanitize: only allow writes under data/
        const safePath = path.normalize(file).replace(/^(\.\.[\/\\])+/, '');
        if (!safePath.startsWith('data/') && !safePath.startsWith('data\\')) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Can only write to data/' }));
          return;
        }

        const fullPath = path.join(ROOT, safePath);
        const dir = path.dirname(fullPath);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));

        console.log(`Saved: ${safePath}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, path: safePath }));
      } catch (e) {
        console.error('Save error:', e.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ── List endpoint (for discovering saved courses) ──────
  if (req.method === 'GET' && req.url === '/api/courses') {
    const coursesDir = path.join(ROOT, 'data', 'courses');
    try {
      const files = fs.readdirSync(coursesDir).filter(f => f.endsWith('.json'));
      const courses = files.map(f => {
        const data = JSON.parse(fs.readFileSync(path.join(coursesDir, f), 'utf8'));
        return { file: f, ...data };
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(courses));
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('[]');
    }
    return;
  }

  // ── Static file serving ────────────────────────────────
  let filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  filePath = decodeURIComponent(filePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';

    // No caching in dev
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Desert Golfing dev server running at http://localhost:${PORT}`);
  console.log(`  Game:   http://localhost:${PORT}/index.html`);
  console.log(`  Editor: http://localhost:${PORT}/editor.html`);
  console.log(`  Save endpoint: POST /api/save`);
});
