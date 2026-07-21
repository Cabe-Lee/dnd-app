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
  const snippet = `\n<script>\n  (function(){\n    const es = new EventSource('/__livereload');\n    es.onmessage = function(e){\n      if(e && e.data === 'reload'){\n        window.location.reload();\n      }\n    };\n  })();\n</script>\n`;
  if (html.includes('</body>')) {
    return html.replace('</body>', `${snippet}</body>`);
  }
  return html + snippet;
}

function watchPublicForChanges() {
  let timer = null;
  try {
    fs.watch(ROOT_DIR, { recursive: true }, () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => broadcastReload(), 100);
    });
  } catch {
    // ignore
  }
}

closeExistingServerOnWindows(PORT);

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(reqUrl.pathname);

  // CORS headers for all API responses
  const setCors = () => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  };

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    setCors();
    res.statusCode = 204;
    res.end();
    return;
  }

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

  // API: POST /api/characters — save new character
  if (req.method === 'POST' && pathname === '/api/characters') {
    setCors();
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const dbPath = path.join(ROOT_DIR, 'json', 'characters.json');

        fs.readFile(dbPath, 'utf8', (readErr, raw) => {
          if (readErr) {
            console.error('Failed to read characters.json:', readErr.message);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Could not read database' }));
            return;
          }

          let characters = [];
          try {
            characters = JSON.parse(raw);
          } catch (e) {
            console.error('Failed to parse characters.json:', e.message);
            characters = [];
          }

          const maxId = characters.reduce((max, c) => Math.max(max, c.id || 0), 0);
          data.id = maxId + 1;
          characters.push(data);

          fs.writeFile(dbPath, JSON.stringify(characters, null, 2), 'utf8', (writeErr) => {
            if (writeErr) {
              console.error('Failed to write characters.json:', writeErr.message);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Could not save character' }));
              return;
            }
            console.log('Character saved with ID:', data.id);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, id: data.id }));
          });
        });
      } catch (parseErr) {
        console.error('Failed to parse request body:', parseErr.message);
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // API: PUT /api/characters/:id — update a character (skills/saving throws/ability scores)
  const putMatch = pathname.match(/^\/api\/characters\/(\d+)$/);
  if (req.method === 'PUT' && putMatch) {
    setCors();
    const characterId = Number(putMatch[1]);
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const updates = JSON.parse(body);
        const dbPath = path.join(ROOT_DIR, 'json', 'characters.json');

        fs.readFile(dbPath, 'utf8', (readErr, raw) => {
          if (readErr) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Could not read database' }));
            return;
          }

          let characters = [];
          try {
            characters = JSON.parse(raw);
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Invalid database' }));
            return;
          }

          const idx = characters.findIndex(c => c.id === characterId);
          if (idx === -1) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Character not found' }));
            return;
          }

          // Merge updates into the character
          if (updates.skills) Object.assign(characters[idx].skills, updates.skills);
          if (updates.savingThrows) Object.assign(characters[idx].savingThrows, updates.savingThrows);
          if (updates.abilityScores) characters[idx].abilityScores = updates.abilityScores;

          fs.writeFile(dbPath, JSON.stringify(characters, null, 2), 'utf8', (writeErr) => {
            if (writeErr) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Could not save updates' }));
              return;
            }
            console.log(`Character ${characterId} updated`);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
          });
        });
      } catch (parseErr) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // API: GET /api/characters — list all characters
  if (req.method === 'GET' && pathname === '/api/characters') {
    setCors();
    const dbPath = path.join(ROOT_DIR, 'json', 'characters.json');
    fs.readFile(dbPath, 'utf8', (readErr, raw) => {
      if (readErr) {
        console.error('Failed to read characters.json:', readErr.message);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Could not read database' }));
        return;
      }
      try {
        const characters = JSON.parse(raw);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(characters));
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Invalid database' }));
      }
    });
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
