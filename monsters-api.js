// monsters-api.js
//
// "Extended" Monster API - wraps the public D&D 5e API (dnd5eapi.co) with:
//   - a combined, searchable monster list (SRD monsters + your homebrew ones)
//   - full stat blocks in one consistent shape, regardless of source
//   - custom ("homebrew") monster creation, saved to a local JSON file
//   - AI-generated monster art, saved to disk and linked to the monster
//
// Routes:
//   GET    /api/monsters                 list monsters. Optional ?search=name
//   GET    /api/monsters/:id             full stat block for one monster
//   POST   /api/monsters                 create a custom monster (JSON body)
//   POST   /api/monsters/:id/image       generate + save an AI image
//
// Storage: public/json/custom-monsters.json (your homebrew monsters)
//          public/json/monster-images.json  (generated image lookup for SRD monsters)
//          public/images/monsters/*.png     (the generated image files)

const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, 'public', 'json');
const IMAGES_DIR = path.join(__dirname, 'public', 'images', 'monsters');
const CUSTOM_MONSTERS_FILE = path.join(DATA_DIR, 'custom-monsters.json');
const IMAGE_MAP_FILE = path.join(DATA_DIR, 'monster-images.json');

function getExternalApiBase() {
  return process.env.EXTERNAL_API_BASE_URL || 'https://www.dnd5eapi.co/api';
}

// The SRD image set lives under /api/2014/monsters/{index}.png regardless
// of which version of the base API you're pointed at. Not every SRD
// monster has official art - a 404 here is expected and handled client-side.
function getSrdImageUrl(monsterId) {
  try {
    const origin = new URL(getExternalApiBase()).origin;
    return `${origin}/api/2014/monsters/${encodeURIComponent(monsterId)}.png`;
  } catch {
    return null;
  }
}
function getOpenAiKey() {
  return process.env.OPENAI_API_KEY || '';
}
function getOpenAiImageModel() {
  return process.env.OPENAI_IMAGE_MODEL || 'dall-e-3';
}

// ---------- tiny file-backed storage helpers ----------
function ensureDataFiles() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  if (!fs.existsSync(CUSTOM_MONSTERS_FILE)) fs.writeFileSync(CUSTOM_MONSTERS_FILE, '[]\n');
  if (!fs.existsSync(IMAGE_MAP_FILE)) fs.writeFileSync(IMAGE_MAP_FILE, '{}\n');
}

function readJsonFile(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function loadCustomMonsters() {
  ensureDataFiles();
  return readJsonFile(CUSTOM_MONSTERS_FILE, []);
}
function saveCustomMonsters(list) {
  writeJsonFile(CUSTOM_MONSTERS_FILE, list);
}
function loadImageMap() {
  ensureDataFiles();
  return readJsonFile(IMAGE_MAP_FILE, {});
}
function saveImageMap(map) {
  writeJsonFile(IMAGE_MAP_FILE, map);
}

// ---------- small helpers ----------
function slugify(name) {
  const slug = String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || 'monster';
}

function uniqueSlug(name, existingIds) {
  const base = slugify(name);
  let candidate = base;
  let n = 2;
  while (existingIds.has(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 2_000_000) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function readJsonBody(req) {
  const raw = await readRequestBody(req);
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

// ---------- external D&D 5e API (dnd5eapi.co) ----------
let externalListCache = null; // { at: timestamp, items: [{id, name}] }
const EXTERNAL_LIST_TTL_MS = 10 * 60 * 1000; // 10 minutes, so testing doesn't hammer the public API

async function fetchExternalMonsterList() {
  if (externalListCache && Date.now() - externalListCache.at < EXTERNAL_LIST_TTL_MS) {
    return externalListCache.items;
  }
  const res = await fetch(`${getExternalApiBase()}/monsters`);
  if (!res.ok) throw new Error(`External API list failed: HTTP ${res.status}`);
  const data = await res.json();
  const items = (data.results || []).map((m) => ({ id: m.index, name: m.name }));
  externalListCache = { at: Date.now(), items };
  return items;
}

async function fetchExternalMonsterDetail(id) {
  const res = await fetch(`${getExternalApiBase()}/monsters/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`External API detail failed: HTTP ${res.status}`);
  return res.json();
}

// ---------- normalize both sources into one consistent shape ----------
function formatSpeed(speed) {
  if (!speed || typeof speed !== 'object') return String(speed || '');
  return Object.entries(speed)
    .map(([key, val]) => (key === 'walk' ? val : `${key} ${val}`))
    .join(', ');
}

function formatChallengeRating(cr) {
  if (cr === undefined || cr === null || cr === '') return '';
  if (cr === 0.125) return '1/8';
  if (cr === 0.25) return '1/4';
  if (cr === 0.5) return '1/2';
  return String(cr);
}

function normalizeExternalMonster(raw, imageMap) {
  const acEntry = Array.isArray(raw.armor_class) ? raw.armor_class[0] : null;
  return {
    id: raw.index,
    source: 'external',
    name: raw.name,
    size: raw.size || '',
    type: raw.subtype ? `${raw.type} (${raw.subtype})` : (raw.type || ''),
    alignment: raw.alignment || '',
    armorClass: acEntry ? acEntry.value : (raw.armor_class ?? ''),
    armorClassDesc: acEntry ? (acEntry.desc || acEntry.type || '') : '',
    hitPoints: raw.hit_points ?? '',
    hitDice: raw.hit_points_roll || raw.hit_dice || '',
    speed: formatSpeed(raw.speed),
    strength: raw.strength,
    dexterity: raw.dexterity,
    constitution: raw.constitution,
    intelligence: raw.intelligence,
    wisdom: raw.wisdom,
    charisma: raw.charisma,
    challengeRating: formatChallengeRating(raw.challenge_rating),
    actions: (raw.actions || []).map((a) => ({ name: a.name, desc: a.desc })),
    specialAbilities: (raw.special_abilities || []).map((a) => ({ name: a.name, desc: a.desc })),
    imageUrl: imageMap[raw.index] || getSrdImageUrl(raw.index),
  };
}

function normalizeCustomMonster(m) {
  return {
    id: m.id,
    source: 'custom',
    name: m.name || '',
    size: m.size || '',
    type: m.type || '',
    alignment: m.alignment || '',
    armorClass: m.armorClass ?? '',
    armorClassDesc: m.armorClassDesc || '',
    hitPoints: m.hitPoints ?? '',
    hitDice: m.hitDice || '',
    speed: m.speed || '',
    strength: m.strength,
    dexterity: m.dexterity,
    constitution: m.constitution,
    intelligence: m.intelligence,
    wisdom: m.wisdom,
    charisma: m.charisma,
    challengeRating: m.challengeRating || '',
    actions: Array.isArray(m.actions) ? m.actions : [],
    specialAbilities: Array.isArray(m.specialAbilities) ? m.specialAbilities : [],
    imageUrl: m.imageUrl || null,
  };
}

// ---------- AI image generation ----------
function buildImagePrompt(monster) {
  const bits = [
    `A menacing fantasy illustration of "${monster.name}"`,
    monster.size && monster.type ? `a ${String(monster.size).toLowerCase()} ${monster.type}` : null,
    monster.alignment ? `(${monster.alignment})` : null,
    'dark dramatic lighting, detailed fantasy concept art, painterly style, ominous atmosphere',
  ].filter(Boolean);
  return bits.join(', ');
}

async function generateMonsterImage(monster, customPrompt) {
  const apiKey = getOpenAiKey();
  if (!apiKey) {
    const err = new Error('Missing OPENAI_API_KEY. Add it to your .env file to enable AI image generation.');
    err.code = 'NO_API_KEY';
    throw err;
  }

  const prompt = (customPrompt && customPrompt.trim()) || buildImagePrompt(monster);

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: getOpenAiImageModel(),
      prompt,
      size: '1024x1024',
      n: 1,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || `Image API request failed: HTTP ${res.status}`;
    throw new Error(message);
  }

  const entry = data.data?.[0];
  if (!entry) throw new Error('Image API returned no image data.');

  let buffer;
  if (entry.b64_json) {
    buffer = Buffer.from(entry.b64_json, 'base64');
  } else if (entry.url) {
    const imgRes = await fetch(entry.url);
    if (!imgRes.ok) throw new Error('Failed to download the generated image.');
    buffer = Buffer.from(await imgRes.arrayBuffer());
  } else {
    throw new Error('Image API response did not include image data.');
  }

  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  const fileName = `${monster.id}.png`;
  fs.writeFileSync(path.join(IMAGES_DIR, fileName), buffer);

  return `/images/monsters/${fileName}`;
}

// ---------- route handler ----------
// Returns true if this module handled the request, false if the caller
// (server.js) should fall through to normal static file serving.
async function handleMonstersApi(req, res, pathname, method) {
  if (!pathname.startsWith('/api/monsters')) return false;

  ensureDataFiles();
  const parts = pathname.split('/').filter(Boolean); // ['api','monsters', maybe id, maybe 'image']

  try {
    // GET /api/monsters?search=...
    if (method === 'GET' && parts.length === 2) {
      const reqUrl = new URL(req.url, `http://${req.headers.host}`);
      const search = (reqUrl.searchParams.get('search') || '').toLowerCase().trim();

      const customList = loadCustomMonsters();
      let externalList = [];
      try {
        externalList = await fetchExternalMonsterList();
      } catch (error) {
        // Don't let a hiccup in the third-party API take down your own homebrew list.
        console.error('Could not reach the external D&D API:', error.message);
      }
      const imageMap = loadImageMap();

      let combined = [
        ...customList.map((m) => ({ id: m.id, name: m.name, source: 'custom', imageUrl: m.imageUrl || null })),
        ...externalList.map((m) => ({ id: m.id, name: m.name, source: 'external', imageUrl: imageMap[m.id] || getSrdImageUrl(m.id) })),
      ];

      if (search) {
        combined = combined.filter((m) => m.name.toLowerCase().includes(search));
      }

      sendJson(res, 200, { count: combined.length, monsters: combined });
      return true;
    }

    // POST /api/monsters  (create a custom monster)
    if (method === 'POST' && parts.length === 2) {
      const body = await readJsonBody(req);
      if (!body.name || !String(body.name).trim()) {
        sendJson(res, 400, { error: 'A monster name is required.' });
        return true;
      }

      const customList = loadCustomMonsters();
      const existingIds = new Set(customList.map((m) => m.id));
      const id = uniqueSlug(body.name, existingIds);

      const monster = {
        id,
        name: String(body.name).trim(),
        size: body.size || '',
        type: body.type || '',
        alignment: body.alignment || '',
        armorClass: body.armorClass ?? '',
        armorClassDesc: body.armorClassDesc || '',
        hitPoints: body.hitPoints ?? '',
        hitDice: body.hitDice || '',
        speed: body.speed || '',
        strength: body.strength ?? null,
        dexterity: body.dexterity ?? null,
        constitution: body.constitution ?? null,
        intelligence: body.intelligence ?? null,
        wisdom: body.wisdom ?? null,
        charisma: body.charisma ?? null,
        challengeRating: body.challengeRating || '',
        actions: Array.isArray(body.actions) ? body.actions.filter((a) => a && a.name) : [],
        imageUrl: null,
        createdAt: new Date().toISOString(),
      };

      customList.push(monster);
      saveCustomMonsters(customList);

      sendJson(res, 201, normalizeCustomMonster(monster));
      return true;
    }

    // GET /api/monsters/:id
    if (method === 'GET' && parts.length === 3) {
      const id = decodeURIComponent(parts[2]);
      const customList = loadCustomMonsters();
      const custom = customList.find((m) => m.id === id);

      if (custom) {
        sendJson(res, 200, normalizeCustomMonster(custom));
        return true;
      }

      const raw = await fetchExternalMonsterDetail(id);
      if (!raw) {
        sendJson(res, 404, { error: `No monster found with id "${id}".` });
        return true;
      }

      const imageMap = loadImageMap();
      sendJson(res, 200, normalizeExternalMonster(raw, imageMap));
      return true;
    }

    // POST /api/monsters/:id/image  (generate + save AI art)
    if (method === 'POST' && parts.length === 4 && parts[3] === 'image') {
      const id = decodeURIComponent(parts[2]);
      const body = await readJsonBody(req).catch(() => ({}));

      const customList = loadCustomMonsters();
      const customIndex = customList.findIndex((m) => m.id === id);

      let monsterForPrompt;
      if (customIndex !== -1) {
        monsterForPrompt = normalizeCustomMonster(customList[customIndex]);
      } else {
        const raw = await fetchExternalMonsterDetail(id);
        if (!raw) {
          sendJson(res, 404, { error: `No monster found with id "${id}".` });
          return true;
        }
        monsterForPrompt = normalizeExternalMonster(raw, {});
      }

      const imageUrl = await generateMonsterImage(monsterForPrompt, body.prompt);

      if (customIndex !== -1) {
        customList[customIndex].imageUrl = imageUrl;
        saveCustomMonsters(customList);
      } else {
        const imageMap = loadImageMap();
        imageMap[id] = imageUrl;
        saveImageMap(imageMap);
      }

      sendJson(res, 200, { id, imageUrl });
      return true;
    }

    sendJson(res, 404, { error: 'Not found.' });
    return true;
  } catch (error) {
    const status = error.code === 'NO_API_KEY' ? 400 : 500;
    sendJson(res, status, { error: error.message || 'Internal server error.' });
    return true;
  }
}

module.exports = { handleMonstersApi };