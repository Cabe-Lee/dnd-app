// Dice roller logic for dice-roller.html

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function initDiceRoller() {
  const diceTypes = [4, 6, 8, 10, 12, 20, 100];

  const dropdownEl = document.getElementById('dice-dropdown');

  function renderDiceDropdown(filterText) {
    if (!dropdownEl) return;

    const rect = diceInput.getBoundingClientRect();
    dropdownEl.style.left = `${rect.left + window.scrollX}px`;
    dropdownEl.style.top = `${rect.bottom + window.scrollY}px`;

    const q = (filterText ?? '').toString().trim();

    const lower = q.toLowerCase();

    const options = diceTypes
      .map((s) => ({ sides: s, label: `1d${s}` }))
      .filter((opt) => {
        if (!lower) return true;
        return opt.label.toLowerCase().includes(lower) || opt.sides.toString().includes(lower);
      });

    dropdownEl.innerHTML = '';

    if (options.length === 0) {
      dropdownEl.hidden = false;
      dropdownEl.innerHTML = '<div class="dropdown-item" style="opacity:0.7;cursor:default">No results</div>';
      return;
    }

    for (const opt of options) {
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      item.textContent = opt.label;
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        diceInput.value = opt.sides;
        dropdownEl.hidden = true;
      });
      dropdownEl.appendChild(item);
    }

    dropdownEl.hidden = false;
  }

  const rollBtn = document.getElementById('roll-button');
  const diceInput = document.getElementById('dice');

  diceInput.addEventListener('input', () => {
    renderDiceDropdown(diceInput.value);
  });

  diceInput.addEventListener('focus', () => {
    renderDiceDropdown(diceInput.value);
  });

  document.addEventListener('click', (e) => {
    if (!dropdownEl) return;
    const clickedInside = e.target === diceInput || dropdownEl.contains(e.target);
    if (!clickedInside) dropdownEl.hidden = true;
  });

  const diceNumInput = document.getElementById('dice-num');
  const modifierInput = document.getElementById('modifier');

  if (!rollBtn || !diceInput || !diceNumInput || !modifierInput) return;

  let resultEl = document.getElementById('dice-result');
  if (!resultEl) {
    resultEl = document.createElement('div');
    resultEl.id = 'dice-result';
    resultEl.style.cssText = [
      'margin-top:16px',
      'text-align:center',
      'font-size:1.5rem',
      'min-height:1.8em',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'width:100%'
    ].join(';');

    const wrapper = document.getElementById('dice-roller') || document.body;
    wrapper.appendChild(resultEl);
  }

  const roll = () => {
    const count = clampInt(diceNumInput.value, 1, 100, 1);
    const sides = clampInt(diceInput.value, 2, 10000, 20);
    const modifier = Number.parseInt(modifierInput.value, 10);
    const mod = Number.isNaN(modifier) ? 0 : modifier;

    const results = Array.from({ length: count }, () => rollDie(sides));
    const total = results.reduce((sum, n) => sum + n, 0);
    const finalTotal = total + mod;

    const modifierText = mod === 0 ? '' : ` ${mod > 0 ? '+' : '-'} ${Math.abs(mod)}`;

    if (count === 1) {
      resultEl.textContent = `Result: ${results[0]}${modifierText}. Final Total: ${finalTotal}`;
    } else {
      resultEl.textContent = `Result: ${results.join(', ')}. Total: ${total}${modifierText}. Final Total: ${finalTotal}`;
    }
  };

  rollBtn.addEventListener('click', roll);

  document.getElementById('dice-roller').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    roll();
  });
}


initDiceRoller();