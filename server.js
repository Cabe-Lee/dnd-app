const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');
const child_process = require('node:child_process');

const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = path.join(__dirname, 'public');

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js': return 'text/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg': return 'image/jpeg';
    case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.svg': return 'image/svg+xml';
    case '.txt': return 'text/plain; charset=utf-8';
    default: return 'application/octet-stream';
  }
}

function safeJoin(root, requestPath) {
  const normalized = path.normalize(requestPath).replace(/^([\\/])+/, '');
  const fullPath = path.join(root, normalized);
  if (!fullPath.startsWith(root)) return null;
  return fullPath;
}

function closeExistingServerOnWindows(port) {
  if (process.platform !== 'win32') return;

  try {
    const cmd = `netstat -ano | findstr :${port}`;
    const output = child_process.execSync(cmd, { stdio: ['pipe', 'pipe', 'ignore'], encoding: 'utf8' });

    const pids = new Set(
      output
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => line.split(/\s+/).pop())
        .filter(pid => pid && pid !== '0')
    );

    for (const pid of pids) {
      child_process.execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
    }
  } catch {
    // ignore
  }
}

function openOrRefresh(url) {
  if (process.platform !== 'win32') return;
  try {
    child_process.exec(`start "" "${url}"`);
  } catch {
    // ignore
  }
}

// --- Live reload (simple) ---
const clients = new Set();
function broadcastReload() {
  const msg = 'reload';
  for (const res of clients) {
    try {
      res.write(`data: ${msg}\n\n`);
    } catch {
      clients.delete(res);
    }
  }
}

function injectLiveReload(html) {
  // Inject after closing </body> if possible, else append.
  const snippet = `\n<script>\n  (function(){\n    const es = new EventSource('/__livereload');\n    es.onmessage = function(e){\n      if(e && e.data === 'reload'){\n        window.location.reload();\n      }\n    };\n  })();\n</script>\n`;
  if (html.includes('</body>')) {
    return html.replace('</body>', `${snippet}</body>`);
  }
  return html + snippet;
}

function watchPublicForChanges() {
  // Watch for any file changes under public/ and trigger reload.
  // fs.watch can emit lots of events; a small debounce helps.
  let timer = null;
  try {
    fs.watch(ROOT_DIR, { recursive: true }, () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => broadcastReload(), 100);
    });
  } catch {
    // If recursive watch fails on some platforms, do nothing.
  }
}

closeExistingServerOnWindows(PORT);

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(reqUrl.pathname);

  // SSE endpoint
  if (pathname === '/__livereload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write('\n');

    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  if (pathname === '/' || pathname === '') pathname = '/pages/index.html';

  const filePath = safeJoin(ROOT_DIR, pathname);
  if (!filePath) {
    res.statusCode = 400;
    res.end('Bad Request');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    // Live-reload injection for HTML
    if (path.extname(filePath).toLowerCase() === '.html') {
      fs.readFile(filePath, 'utf8', (readErr, raw) => {
        if (readErr) {
          res.statusCode = 500;
          res.end('Server Error');
          return;
        }
        const html = injectLiveReload(raw);
        res.statusCode = 200;
        res.setHeader('Content-Type', contentTypeFor(filePath));
        res.end(html);
      });
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', contentTypeFor(filePath));
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}/pages/index.html`;
  console.log(`Server running: ${url}`);

  watchPublicForChanges();
  openOrRefresh(url);
});