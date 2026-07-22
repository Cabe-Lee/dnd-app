// Monster detail + creation page.
// URL modes:
//   monster.html?id=goblin        -> view mode (fetches /api/monsters/:id)
//   monster.html?new=1            -> create-a-custom-monster form
//   monster.html                  -> neutral "pick or create one" message

const params = new URLSearchParams(window.location.search);
const monsterId = params.get('id');
const isCreateMode = params.get('new') === '1';

const viewSection = document.getElementById('monster-view');
const createSection = document.getElementById('monster-create-section');
const statusEl = document.getElementById('monster-view-status');

function show(el) { if (el) el.hidden = false; }
function hide(el) { if (el) el.hidden = true; }

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = (value === undefined || value === null || value === '') ? '—' : value;
}

function crTier(cr) {
  const n = crToNumber(cr);
  if (n === null) return 'low';
  if (n >= 15) return 'high';
  if (n >= 5) return 'mid';
  return 'low';
}

function crToNumber(cr) {
  if (cr === undefined || cr === null || cr === '') return null;
  if (typeof cr === 'number') return cr;
  const str = String(cr).trim();
  if (str.includes('/')) {
    const [num, den] = str.split('/').map(Number);
    if (!den) return null;
    return num / den;
  }
  const n = Number(str);
  return Number.isNaN(n) ? null : n;
}

function renderActions(listId, items) {
  const listEl = document.getElementById(listId);
  if (!listEl) return;
  listEl.innerHTML = '';

  if (!items || !items.length) {
    const li = document.createElement('li');
    li.className = 'hint';
    li.textContent = 'None.';
    listEl.appendChild(li);
    return;
  }

  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'stat-list-item';
    const h4 = document.createElement('h4');
    h4.textContent = item.name || 'Untitled';
    const p = document.createElement('p');
    p.textContent = item.desc || '';
    li.appendChild(h4);
    li.appendChild(p);
    listEl.appendChild(li);
  });
}

async function loadMonster(id) {
  show(viewSection);
  statusEl.hidden = true;

  try {
    const res = await fetch(`/api/monsters/${encodeURIComponent(id)}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    const monster = await res.json();
    renderMonster(monster);
  } catch (error) {
    hide(viewSection);
    statusEl.hidden = false;
    statusEl.textContent = `Could not load that monster: ${error.message}`;
  }
}

function renderMonster(monster) {
  setText('monster-name', monster.name);
  setText('monster-size', monster.size);
  setText('monster-type', monster.type);
  setText('monster-alignment', monster.alignment);
  setText('monster-ac', [monster.armorClass, monster.armorClassDesc ? `(${monster.armorClassDesc})` : '']
    .filter(Boolean).join(' '));
  setText('monster-hp', monster.hitPoints);
  setText('monster-hit-dice', monster.hitDice);
  setText('monster-speed', monster.speed);
  setText('monster-strength', monster.strength);
  setText('monster-dexterity', monster.dexterity);
  setText('monster-constitution', monster.constitution);
  setText('monster-intelligence', monster.intelligence);
  setText('monster-wisdom', monster.wisdom);
  setText('monster-charisma', monster.charisma);

  const crEl = document.getElementById('monster-cr');
  if (crEl) {
    crEl.textContent = monster.challengeRating || '—';
    crEl.dataset.tier = crTier(monster.challengeRating);
  }

  renderActions('monster-abilities', monster.specialAbilities);
  renderActions('monster-actions', monster.actions);
}

function setupCreateForm() {
  show(createSection);

  const actionsList = document.getElementById('actions-list');
  const addActionBtn = document.getElementById('add-action-btn');
  const form = document.getElementById('monster-create-form');
  const formStatus = document.getElementById('create-form-status');

  function addActionRow(name = '', desc = '') {
    const row = document.createElement('div');
    row.className = 'action-row';
    row.innerHTML = `
      <input type="text" class="action-name" placeholder="Action name (e.g. Bite)" value="${name}">
      <textarea class="action-desc" rows="1" placeholder="Melee Weapon Attack: +4 to hit...">${desc}</textarea>
      <button type="button" class="action-remove-btn">Remove</button>
    `;
    row.querySelector('.action-remove-btn').addEventListener('click', () => row.remove());
    actionsList.appendChild(row);
  }

  addActionBtn.addEventListener('click', () => addActionRow());
  addActionRow();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formStatus.hidden = true;

    const actions = Array.from(actionsList.querySelectorAll('.action-row'))
      .map((row) => ({
        name: row.querySelector('.action-name').value.trim(),
        desc: row.querySelector('.action-desc').value.trim(),
      }))
      .filter((a) => a.name);

    const body = {
      name: document.getElementById('m-name').value.trim(),
      size: document.getElementById('m-size').value,
      type: document.getElementById('m-type').value.trim(),
      alignment: document.getElementById('m-alignment').value.trim(),
      armorClass: Number(document.getElementById('m-ac').value) || undefined,
      armorClassDesc: document.getElementById('m-ac-desc').value.trim(),
      hitPoints: Number(document.getElementById('m-hp').value) || undefined,
      hitDice: document.getElementById('m-hit-dice').value.trim(),
      speed: document.getElementById('m-speed').value.trim(),
      strength: Number(document.getElementById('m-str').value) || undefined,
      dexterity: Number(document.getElementById('m-dex').value) || undefined,
      constitution: Number(document.getElementById('m-con').value) || undefined,
      intelligence: Number(document.getElementById('m-int').value) || undefined,
      wisdom: Number(document.getElementById('m-wis').value) || undefined,
      charisma: Number(document.getElementById('m-cha').value) || undefined,
      challengeRating: document.getElementById('m-cr').value.trim(),
      actions,
    };

    try {
      const res = await fetch('/api/monsters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      window.location.href = `monster.html?id=${encodeURIComponent(data.id)}`;
    } catch (error) {
      formStatus.hidden = false;
      formStatus.textContent = `Could not save this monster: ${error.message}`;
    }
  });
}

if (isCreateMode) {
  setupCreateForm();
} else if (monsterId) {
  loadMonster(monsterId);
} else {
  statusEl.hidden = false;
  statusEl.textContent = 'Pick a monster from the bestiary, or create one of your own.';
}