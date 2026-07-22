// Monsters library page — fetches from our own Extended Monster API
// (see monsters-api.js on the server), not directly from dnd5eapi.co.

const searchInput = document.getElementById('monster-search');
const gridEl = document.getElementById('monster-grid');
const statusEl = document.getElementById('monster-list-status');

let debounceTimer = null;
let latestRequestId = 0;

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

async function loadMonsters(query) {
  const requestId = ++latestRequestId;

  statusEl.textContent = 'Searching the bestiary…';
  gridEl.innerHTML = '';

  try {
    const url = query ? `/api/monsters?search=${encodeURIComponent(query)}` : '/api/monsters';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // A newer search has started since this one went out - ignore this stale response.
    if (requestId !== latestRequestId) return;

    // Support multiple response shapes: either an array or an object
    // with a `monsters` (or `results`) property. Be tolerant to avoid
    // silently showing an empty list if the API shape changes.
    const list = Array.isArray(data) ? data : (data.monsters || data.results || []);
    renderMonsters(list);
  } catch (error) {
    if (requestId !== latestRequestId) return;
    console.error('Failed to load monsters:', error);
    statusEl.textContent = 'Could not reach the monster API. Is the server running?';
  }
}

function renderMonsters(monsters) {
  if (!monsters.length) {
    statusEl.textContent = 'No monsters found. Maybe conjure one yourself?';
    return;
  }

  statusEl.textContent = `${monsters.length} monster${monsters.length === 1 ? '' : 's'} found.`;

  const frag = document.createDocumentFragment();

  monsters.forEach((m) => {
    const card = document.createElement('a');
    card.className = 'monster-card';
    card.href = `monster.html?id=${encodeURIComponent(m.id)}`;

    const thumbHtml = m.imageUrl
      ? `<img src="${escapeHtml(m.imageUrl)}" alt="${escapeHtml(m.name)}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'monster-card-placeholder',textContent:'☠'}))">`
      : '<span class="monster-card-placeholder">☠</span>';

    card.innerHTML = `
      <div class="monster-card-thumb">${thumbHtml}</div>
      <h3>${escapeHtml(m.name)}</h3>
      <span class="monster-badge monster-badge-${m.source}">${m.source === 'custom' ? 'Homebrew' : 'SRD'}</span>
    `;

    frag.appendChild(card);
  });

  gridEl.appendChild(frag);
}

searchInput?.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => loadMonsters(searchInput.value.trim()), 300);
});

loadMonsters('');