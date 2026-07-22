const abilityOrder = ['strength-input', 'dexterity-input', 'constitution-input', 'intelligence-input', 'wisdom-input', 'charisma-input'];

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function getAbilityIndexByInputId(inputId) {
  return abilityOrder.indexOf(inputId);
}

function swapValuesByInputIds(aId, bId) {
  const a = document.getElementById(aId);
  const b = document.getElementById(bId);
  if (!a || !b) return;

  const av = a.value;
  const bv = b.value;

  a.value = bv;
  b.value = av;

  a.dispatchEvent(new Event('input', { bubbles: true }));
  b.dispatchEvent(new Event('input', { bubbles: true }));
}

function initAbilitySwaps() {
  const map = {
    strength: { down: 'dexterity' },
    dexterity: { up: 'strength', down: 'constitution' },
    constitution: { up: 'dexterity', down: 'intelligence' },
    intelligence: { up: 'constitution', down: 'wisdom' },
    wisdom: { up: 'intelligence', down: 'charisma' },
    charisma: { up: "wisdom" }
  };

  const buttonMap = {
    strength: { down: 'strength-down-btn' },
    dexterity: { up: 'dexterity-up-btn', down: 'dexterity-down-btn' },
    constitution: { up: 'constitution-up-btn', down: 'constitution-down-btn' },
    intelligence: { up: 'intelligence-up-btn', down: 'intelligence-down-btn' },
    wisdom: { up: 'wisdom-up-btn', down: 'wisdom-down-btn' },
    charisma: { up: 'charisma-up-btn' }
  };

  const legacyButtonMap = {
    strength: { down: 'strength-down' },
    dexterity: { up: 'dexterity-up', down: 'dexterity-down' },
    constitution: { up: 'constitution-up', down: 'constitution-down' },
    intelligence: { up: 'intelligence-up', down: 'intelligence-down' },
    wisdom: { up: 'wisdom-up', down: 'wisdom-down' },
    charisma: { up: 'charisma-up' }
  };

  const abilityKeyToInputId = {
    strength: 'strength-input',
    dexterity: 'dexterity-input',
    constitution: 'constitution-input',
    intelligence: 'intelligence-input',
    wisdom: 'wisdom-input',
    charisma: 'charisma-input'
  };

  const wire = (abilityKey, dir, buttonId) => {
    const targetKey = map[abilityKey]?.[dir];
    if (!buttonId || !targetKey) return;

    const btn = document.getElementById(buttonId);
    if (!btn) return;

    const fromId = abilityKeyToInputId[abilityKey];
    const toId = abilityKeyToInputId[targetKey];
    btn.addEventListener('click', () => swapValuesByInputIds(fromId, toId));
  };

  Object.keys(legacyButtonMap).forEach((abilityKey) => {
    wire(abilityKey, 'up', legacyButtonMap[abilityKey].up);
    wire(abilityKey, 'down', legacyButtonMap[abilityKey].down);
  });
}

initAbilitySwaps();

