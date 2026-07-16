const abilityIds = [
  'strength-input',
  'dexterity-input',
  'constitution-input',
  'intelligence-input',
  'wisdom-input',
  'charisma-input'
];

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function abilityModifier(score) {
  const s = Number.parseInt(score, 10);
  if (Number.isNaN(s)) return null;
  return Math.floor((s - 10) / 2);
}

function ensureModifierSpanForInput(inputEl) {
  let span = inputEl.parentElement?.querySelector?.(`span.modifier[data-for="${inputEl.id}"]`);
  if (span) return span;

  span = document.createElement('span');
  span.className = 'modifier';
  span.dataset.for = inputEl.id;
  span.style.marginLeft = '8px';
  span.style.fontWeight = '600';

  if (inputEl.nextSibling) inputEl.parentElement.insertBefore(span, inputEl.nextSibling);
  else inputEl.parentElement.appendChild(span);

  return span;
}

function setAbilityScores(scoresByAbility) {
  const map = [
    ['strength-input', scoresByAbility.strength],
    ['dexterity-input', scoresByAbility.dexterity],
    ['constitution-input', scoresByAbility.constitution],
    ['intelligence-input', scoresByAbility.intelligence],
    ['wisdom-input', scoresByAbility.wisdom],
    ['charisma-input', scoresByAbility.charisma]
  ];

  map.forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (!el) return;

    if (value === '' || value === null || value === undefined || Number.isNaN(Number.parseInt(value, 10))) {
      el.value = '';
      ensureModifierSpanForInput(el).textContent = '(0)';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    const clamped = clampInt(value, 1, 9999, 10);
    el.value = String(clamped);

    const mod = abilityModifier(clamped);
    const span = ensureModifierSpanForInput(el);
    span.textContent = mod === null || Number.isNaN(mod) ? '' : `(${mod > 0 ? '+' : ''}${mod})`;

    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function removePointBuyButtons() {
  abilityIds.forEach((id) => {
    const inputEl = document.getElementById(id);
    const parent = inputEl?.parentElement;
    if (!parent) return;
    parent.querySelectorAll(`button[data-pb-for="${id}"]`).forEach((b) => b.remove());
  });
}

function renderBudgetCounter(budgetCounterEl, totalBudget, getCurrentAbilityPointCost) {
  if (!budgetCounterEl) return;
  const used = getCurrentAbilityPointCost();
  const left = totalBudget - used;
  budgetCounterEl.textContent = `Point Buy: ${left} points left (used ${used}/${totalBudget})`;
  budgetCounterEl.style.color = left < 0 ? 'crimson' : '';
}

function initAbilityScores() {
  const standardBtn = document.getElementById('standard-array');
  const pointBuyBtn = document.getElementById('point-buy');
  const rollForStatsBtn = document.getElementById('roll-for-stats');
  const resetBtn = document.getElementById('reset-stats');

  const standardArray = [15, 14, 13, 12, 10, 8];

  abilityIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    const span = ensureModifierSpanForInput(el);
    span.textContent = el.value ? '' : '(-1)';

    el.addEventListener('input', () => {
      const raw = el.value;
      if (raw === '') {
        span.textContent = '(-1)';
        return;
      }
      const parsed = Number.parseInt(raw, 10);
      if (Number.isNaN(parsed)) {
        span.textContent = '(0)';
        return;
      }
      const mod = abilityModifier(parsed);
      span.textContent = `(${mod > 0 ? '+' : ''}${mod})`;
    });
  });

  const budget = { totalBudget: 27 };

  const budgetCounterEl = (() => {
    const pcStatsForm = document.getElementById('pc-stats-form');
    if (!pcStatsForm) return null;

    const heading = Array.from(pcStatsForm.querySelectorAll('p')).find((p) => p.textContent?.trim() === 'Ability Scores');
    if (!heading) return null;

    let counter = pcStatsForm.querySelector('#point-buy-budget');
    if (!counter) {
      counter = document.createElement('div');
      counter.id = 'point-buy-budget';
      counter.style.margin = '8px 0';
      counter.style.fontWeight = '600';
      counter.textContent = `Point Buy: ${budget.totalBudget} points available`;
      pcStatsForm.insertBefore(counter, heading);
    }

    counter.style.display = 'none';
    return counter;
  })();

  const pointCostByScore = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
  const pointMinScore = 8;
  const pointMaxScore = 15;

  const getCurrentAbilityValue = (inputEl) => {
    const raw = inputEl.value;
    if (raw === '') return pointMinScore;
    const n = Number.parseInt(raw, 10);
    return Number.isNaN(n) ? pointMinScore : n;
  };

  const getPointCostForScore = (score) => {
    const clamped = clampInt(score, 8, 15, 8);
    return pointCostByScore[clamped] ?? 0;
  };

  const getCurrentAbilityPointCost = () => {
    return abilityIds.reduce((sum, id) => {
      const inputEl = document.getElementById(id);
      if (!inputEl) return sum;
      const s = getCurrentAbilityValue(inputEl);
      return sum + getPointCostForScore(s);
    }, 0);
  };

  const setAbilityInputValue = (inputEl, nextVal, { min, max, fallback } = {}) => {
    const clamped = clampInt(nextVal, min ?? 1, max ?? 9999, fallback ?? 8);
    inputEl.value = String(clamped);
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const swapInputs = (fromId, toId) => {
    const a = document.getElementById(fromId);
    const b = document.getElementById(toId);
    if (!a || !b) return;
    const av = Number.parseInt(a.value, 10);
    const bv = Number.parseInt(b.value, 10);
    if (Number.isNaN(av) || Number.isNaN(bv)) return;
    a.value = String(bv);
    b.value = String(av);
    a.dispatchEvent(new Event('input', { bubbles: true }));
    b.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const standardPairs = {
    strength: { up: null, down: 'dexterity' },
    dexterity: { up: 'constitution', down: 'strength' },
    constitution: { up: 'intelligence', down: 'dexterity' },
    intelligence: { up: 'wisdom', down: 'constitution' },
    wisdom: { up: 'charisma', down: 'intelligence' },
    charisma: { up: 'wisdom', down: null }
  };

  const swapIdMap = {
    strength: 'strength-input',
    dexterity: 'dexterity-input',
    constitution: 'constitution-input',
    intelligence: 'intelligence-input',
    wisdom: 'wisdom-input',
    charisma: 'charisma-input'
  };

  const swapButtonIdMap = {
    strength: { up: 'strength-up-btn', down: 'strength-down-btn' },
    dexterity: { up: 'dexterity-up-btn', down: 'dexterity-down-btn' },
    constitution: { up: 'constitution-up-btn', down: 'constitution-down-btn' },
    intelligence: { up: 'intelligence-up-btn', down: 'intelligence-down-btn' },
    wisdom: { up: 'wisdom-up-btn', down: 'wisdom-down-btn' },
    charisma: { up: 'charisma-up-btn', down: 'charisma-down-btn' }
  };

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      removePointBuyButtons();
      if (budgetCounterEl) budgetCounterEl.style.display = 'none';

      abilityIds.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
  }

  if (rollForStatsBtn) {
    rollForStatsBtn.addEventListener('click', () => {
      removePointBuyButtons();
      if (budgetCounterEl) budgetCounterEl.style.display = 'none';

      const rollDie = () => Math.floor(Math.random() * 6) + 1;
      const roll3d6 = () => rollDie() + rollDie() + rollDie();

      setAbilityScores({
        strength: roll3d6(),
        dexterity: roll3d6(),
        constitution: roll3d6(),
        intelligence: roll3d6(),
        wisdom: roll3d6(),
        charisma: roll3d6()
      });
    });
  }

  if (standardBtn) {
    standardBtn.addEventListener('click', () => {
      removePointBuyButtons();
      if (budgetCounterEl) budgetCounterEl.style.display = 'none';

      const available = shuffleInPlace([...standardArray]);

      setAbilityScores({
        strength: available[0],
        dexterity: available[1],
        constitution: available[2],
        intelligence: available[3],
        wisdom: available[4],
        charisma: available[5]
      });

      const makeSwapForAbility = (abilityKey) => {
        const allowed = standardPairs[abilityKey] || {};

        const upBtnId = swapButtonIdMap[abilityKey]?.up;
        const downBtnId = swapButtonIdMap[abilityKey]?.down;

        const setHidden = (btnId, hidden) => {
          const btn = document.getElementById(btnId);
          if (btn) btn.hidden = hidden;
        };

        setHidden(upBtnId, true);
        setHidden(downBtnId, true);

        const makeHandler = (fromKey, toKey) => () => {
          const fromId = swapIdMap[fromKey];
          const toId = swapIdMap[toKey];
          swapInputs(fromId, toId);
        };

        if (allowed.down) {
          setHidden(downBtnId, false);
          const btn = document.getElementById(downBtnId);
          if (btn) btn.addEventListener('click', makeHandler(abilityKey, allowed.down), { once: false });
        }

        if (allowed.up) {
          setHidden(upBtnId, false);
          const btn = document.getElementById(upBtnId);
          if (btn) btn.addEventListener('click', makeHandler(abilityKey, allowed.up), { once: false });
        }
      };

      makeSwapForAbility('strength');
      makeSwapForAbility('dexterity');
      makeSwapForAbility('constitution');
      makeSwapForAbility('intelligence');
      makeSwapForAbility('wisdom');
      makeSwapForAbility('charisma');
    });
  }

  if (pointBuyBtn) {
    pointBuyBtn.addEventListener('click', () => {
      removePointBuyButtons();

      if (budgetCounterEl) budgetCounterEl.style.display = '';

      abilityIds.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        setAbilityInputValue(el, pointMinScore, { min: pointMinScore, max: pointMaxScore, fallback: pointMinScore });
      });

      abilityIds.forEach((id) => {
        const inputEl = document.getElementById(id);
        if (!inputEl) return;

        const parent = inputEl.parentElement;
        if (!parent) return;

        const minusBtn = document.createElement('button');
        minusBtn.type = 'button';
        minusBtn.textContent = '-';
        minusBtn.dataset.pbFor = id;
        minusBtn.style.marginLeft = '8px';

        const plusBtn = document.createElement('button');
        plusBtn.type = 'button';
        plusBtn.textContent = '+';
        plusBtn.dataset.pbFor = id;
        plusBtn.style.marginLeft = '6px';

        minusBtn.addEventListener('click', () => {
          const cur = getCurrentAbilityValue(inputEl);
          const next = cur - 1;
          if (next < pointMinScore) return;
          setAbilityInputValue(inputEl, next, { min: pointMinScore, max: pointMaxScore, fallback: pointMinScore });
          renderBudgetCounter(budgetCounterEl, budget.totalBudget, getCurrentAbilityPointCost);
        });

        plusBtn.addEventListener('click', () => {
          const cur = getCurrentAbilityValue(inputEl);
          const next = cur + 1;
          if (next > pointMaxScore) return;

          const usedBefore = getCurrentAbilityPointCost();
          const beforeCost = getPointCostForScore(cur);
          const afterCost = getPointCostForScore(next);
          const delta = afterCost - beforeCost;

          if (budget.totalBudget - usedBefore - delta < 0) return;

          setAbilityInputValue(inputEl, next, { min: pointMinScore, max: pointMaxScore, fallback: pointMinScore });
          renderBudgetCounter(budgetCounterEl, budget.totalBudget, getCurrentAbilityPointCost);
        });

        parent.appendChild(minusBtn);
        parent.appendChild(plusBtn);
      });

      renderBudgetCounter(budgetCounterEl, budget.totalBudget, getCurrentAbilityPointCost);
    });
  }
}

initAbilityScores();

