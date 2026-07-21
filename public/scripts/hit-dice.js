function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function abilityModifier(score) {
  const s = Number.parseInt(score, 10);
  if (Number.isNaN(s)) return null;
  return Math.floor((s - 10) / 2);
}

function initHitDice() {
  const hitDiceLevelInput = document.getElementById('hit-dice-level-input');
  const hitDiceDieSelect = document.getElementById('hit-dice-input');
  const rollBtn = document.getElementById('hit-dice-roll');
  const fullBtn = document.getElementById('hit-dice-full');
  const hpInput = document.getElementById('hp-input');
  const conInput = document.getElementById('constitution-input');

  if (!hitDiceLevelInput || !hitDiceDieSelect || !rollBtn || !fullBtn || !hpInput || !conInput) return;

  const sides = () => clampInt(hitDiceDieSelect.value, 2, 10000, 8);

  const rollDie = (s) => Math.floor(Math.random() * s) + 1;

  const getConMod = () => {
    const conVal = conInput.value;
    if (conVal === '' || conVal === null || conVal === undefined) return 0;
    const mod = abilityModifier(conVal);
    return mod === null || Number.isNaN(mod) ? 0 : mod;
  };

  const setHp = (next) => {
    hpInput.value = String(next);
    hpInput.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const rollHitPoints = () => {
    const count = clampInt(hitDiceLevelInput.value, 1, 20, 1);
    const s = sides();

    const results = Array.from({ length: count }, () => rollDie(s));
    const total = results.reduce((sum, n) => sum + n, 0);

    // Total: rolled hit dice + (CON modifier per hit die).
    // Your comment indicates: "use the constitution modifier".
    const conMod = getConMod();
    const finalTotal = total + conMod * count;

    setHp(finalTotal);
  };

  const takeFullAmount = () => {
    const count = clampInt(hitDiceLevelInput.value, 1, 20, 1);
    const s = sides();

    // Max hit dice + (CON modifier per hit die).
    const conMod = getConMod();
    const finalTotal = s * count + conMod * count;

    setHp(finalTotal);
  };

  rollBtn.addEventListener('click', rollHitPoints);
  fullBtn.addEventListener('click', takeFullAmount);
}

initHitDice();

