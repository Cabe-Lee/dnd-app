// Homepage "Roll for Initiative" flourish — self-contained, no dependencies
// on the dice-roller page's script.
const rollBtn = document.getElementById('home-roll-btn');
const resultEl = document.getElementById('home-roll-result');

if (rollBtn && resultEl) {
  rollBtn.addEventListener('click', () => {
    const roll = Math.floor(Math.random() * 20) + 1;

    resultEl.innerHTML = '';
    const num = document.createElement('span');
    num.className = 'home-roll-num';
    num.textContent = String(roll);

    if (roll === 20) num.classList.add('is-crit');
    if (roll === 1) num.classList.add('is-fumble');

    resultEl.appendChild(num);
  });
}