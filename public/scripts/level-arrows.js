// Level up/down arrows for character-creation.html (levels 1-20)

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

// D&D 5e Proficiency Bonus progression by character level.
// level 1-4 => +2, 5-8 => +3, 9-12 => +4, 13-16 => +5, 17-20 => +6
function getProficiencyBonus(level) {
  const lvl = clampInt(level, 1, 20, 1);
  if (lvl <= 4) return 2;
  if (lvl <= 8) return 3;
  if (lvl <= 12) return 4;
  if (lvl <= 16) return 5;
  return 6;
}

function initLevelArrows() {
  const inputEl = document.getElementById('level-input');
  const upBtn = document.getElementById('level-up');
  const downBtn = document.getElementById('level-down');
  const proficiencyEl = document.getElementById('proficiency-bonus-input');
  if (!inputEl || !upBtn || !downBtn || !proficiencyEl) return;

  const MIN = 1;
  const MAX = 20;

  function syncProficiency() {
    const currentRaw = inputEl.value;
    const current = currentRaw === '' ? MIN : clampInt(currentRaw, MIN, MAX, MIN);
    const pb = getProficiencyBonus(current);
    proficiencyEl.value = String(pb);
  }

  function bump(delta) {
    const currentRaw = inputEl.value;
    const current = currentRaw === '' ? MIN : clampInt(currentRaw, MIN, MAX, MIN);
    const next = clampInt(current + delta, MIN, MAX, MIN);
    inputEl.value = String(next);
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  }

  upBtn.addEventListener('click', () => bump(1));
  downBtn.addEventListener('click', () => bump(-1));

  inputEl.addEventListener('input', syncProficiency);

  syncProficiency();
}

initLevelArrows();