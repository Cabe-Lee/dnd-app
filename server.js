const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');
const child_process = require('node:child_process');
const { handleMonstersApi } = require('./monsters-api');

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

closeExistingServerOnWindows(PORT);

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(reqUrl.pathname);

  // CORS headers for all API responses
  const setCors = () => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  };

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    setCors();
    res.statusCode = 204;
    res.end();
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
          // Handle nested objects (skills, savingThrows) with Object.assign
          if (updates.skills) Object.assign(characters[idx].skills, updates.skills);
          if (updates.savingThrows) Object.assign(characters[idx].savingThrows, updates.savingThrows);
          if (updates.abilityScores) characters[idx].abilityScores = updates.abilityScores;
          // Handle all other top-level fields (name, race, class, hitPointsLeft, etc.)
          Object.keys(updates).forEach(key => {
            if (key !== 'skills' && key !== 'savingThrows' && key !== 'abilityScores') {
              characters[idx][key] = updates[key];
            }
          });

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

  // API: DELETE /api/characters/:id — delete a character
  const deleteMatch = pathname.match(/^\/api\/characters\/(\d+)$/);
  if (req.method === 'DELETE' && deleteMatch) {
    setCors();
    const characterId = Number(deleteMatch[1]);
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

      characters.splice(idx, 1);

      fs.writeFile(dbPath, JSON.stringify(characters, null, 2), 'utf8', (writeErr) => {
        if (writeErr) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Could not delete character' }));
          return;
        }
        console.log(`Character ${characterId} deleted`);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true }));
      });
    });
    return;
  }

  // API: POST /api/signup — register a new user
  if (req.method === 'POST' && pathname === '/api/signup') {
    setCors();
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { username, email, password } = data;

        if (!username || !email || !password) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'All fields are required.' }));
          return;
        }

        const dbPath = path.join(ROOT_DIR, 'json', 'login.json');

        fs.readFile(dbPath, 'utf8', (readErr, raw) => {
          if (readErr) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Could not read account database.' }));
            return;
          }

          let users = {};
          try {
            users = JSON.parse(raw);
          } catch (e) {
            users = {};
          }

          // Check for duplicate username or email
          for (const key of Object.keys(users)) {
            if (users[key].username === username) {
              res.statusCode = 409;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'An account with this username already exists. Please choose a different username.' }));
              return;
            }
            if (users[key].email === email) {
              res.statusCode = 409;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'An account with this email address is already registered. Please use a different email.' }));
              return;
            }
          }

          // Generate a new user ID
          const userId = Object.keys(users).length > 0 
            ? Math.max(...Object.keys(users).map(Number)) + 1 
            : 1;

          users[userId] = { username, email, password };

          fs.writeFile(dbPath, JSON.stringify(users, null, 2), 'utf8', (writeErr) => {
            if (writeErr) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Could not save account.' }));
              return;
            }
            console.log(`User ${username} signed up with ID: ${userId}`);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, userId }));
          });
        });
      } catch (parseErr) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Invalid JSON.' }));
      }
    });
    return;
  }

  // API: GET /api/check-account — check if username or email is already taken
  if (req.method === 'GET' && pathname === '/api/check-account') {
    setCors();
    const reqUrl = new URL(req.url, `http://${req.headers.host}`);
    const username = reqUrl.searchParams.get('username');
    const email = reqUrl.searchParams.get('email');

    const dbPath = path.join(ROOT_DIR, 'json', 'login.json');

    fs.readFile(dbPath, 'utf8', (readErr, raw) => {
      if (readErr) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ available: true }));
        return;
      }

      let users = {};
      try {
        users = JSON.parse(raw);
      } catch (e) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ available: true }));
        return;
      }

      if (username) {
        for (const key of Object.keys(users)) {
          if (users[key].username === username) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ available: false, field: 'username', message: 'This username is already taken. Please choose another.' }));
            return;
          }
        }
      }

      if (email) {
        for (const key of Object.keys(users)) {
          if (users[key].email === email) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ available: false, field: 'email', message: 'This email is already registered. Please use a different email.' }));
            return;
          }
        }
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ available: true }));
    });
    return;
  }

  // API: POST /api/login — authenticate a user
  if (req.method === 'POST' && pathname === '/api/login') {
    setCors();
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { username, password } = data;

        if (!username || !password) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Username and password are required.' }));
          return;
        }

        const dbPath = path.join(ROOT_DIR, 'json', 'login.json');

        fs.readFile(dbPath, 'utf8', (readErr, raw) => {
          if (readErr) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Could not read account database.' }));
            return;
          }

          let users = {};
          try {
            users = JSON.parse(raw);
          } catch (e) {
            users = {};
          }

          let foundUser = null;
          for (const key of Object.keys(users)) {
            // Compare hashed passwords (both stored and incoming are SHA-256 hex strings)
            if (users[key].username === username && users[key].password === password) {
              foundUser = { id: Number(key), username: users[key].username, email: users[key].email };
              break;
            }
          }

          if (foundUser) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, user: foundUser }));
          } else {
            // Check if username exists at all (wrong password) or doesn't exist
            let usernameExists = false;
            for (const key of Object.keys(users)) {
              if (users[key].username === username) {
                usernameExists = true;
                break;
              }
            }
            if (usernameExists) {
              res.statusCode = 401;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Incorrect password. Please try again.' }));
            } else {
              res.statusCode = 401;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Account not found. Please check your username or sign up.' }));
            }
          }
        });
      } catch (parseErr) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Invalid JSON.' }));
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

  // Extended Monster API (see monsters-api.js) — SRD lookup, homebrew monsters, AI art
  if (pathname.startsWith('/api/monsters')) {
    setCors();
    handleMonstersApi(req, res, pathname, req.method)
      .then((handled) => {
        if (!handled) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'Not found.' }));
        }
      })
      .catch((error) => {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: error.message || 'Server error.' }));
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

    res.statusCode = 200;
    res.setHeader('Content-Type', contentTypeFor(filePath));
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}/pages/index.html`;
  console.log(`Server running: ${url}`);

  openOrRefresh(url);
});
