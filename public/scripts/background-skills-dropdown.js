// Background skill dropdowns for character-creation.html.
// Uses existing dropdown styling/classes and the shared dropdown setup pattern.

const skillItems = [
  { name: 'Acrobatics', slug: 'acrobatics' },
  { name: 'Animal Handling', slug: 'animal_handling' },
  { name: 'Arcana', slug: 'arcana' },
  { name: 'Athletics', slug: 'athletics' },
  { name: 'Deception', slug: 'deception' },
  { name: 'History', slug: 'history' },
  { name: 'Insight', slug: 'insight' },
  { name: 'Intimidation', slug: 'intimidation' },
  { name: 'Investigation', slug: 'investigation' },
  { name: 'Medicine', slug: 'medicine' },
  { name: 'Nature', slug: 'nature' },
  { name: 'Perception', slug: 'perception' },
  { name: 'Performance', slug: 'performance' },
  { name: 'Persuasion', slug: 'persuasion' },
  { name: 'Religion', slug: 'religion' },
  { name: 'Sleight of Hand', slug: 'sleight_of_hand' },
  { name: 'Stealth', slug: 'stealth' },
  { name: 'Survival', slug: 'survival' }
];

function normalize(str) {
  return (str ?? '').toString().toLowerCase().trim();
}

function setupTextDropdown({ inputEl, dropdownEl, items, emptyLabel = 'No matches' }) {
  let activeIndex = -1;

  function positionDropdown() {
    const rect = inputEl.getBoundingClientRect();
    dropdownEl.style.left = `${rect.left + window.scrollX}px`;
    dropdownEl.style.top = `${rect.bottom + window.scrollY + 4}px`;
    dropdownEl.style.minWidth = `${rect.width}px`;
  }

  function hide() {
    dropdownEl.hidden = true;
    dropdownEl.innerHTML = '';
  }

  function show(list) {
    positionDropdown();
    dropdownEl.innerHTML = '';
    dropdownEl.hidden = false;

    list.forEach((it) => {
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      item.textContent = it.name;
      item.dataset.name = it.name;
      item.dataset.slug = it.slug;
      dropdownEl.appendChild(item);
    });
  }

  function setActive(idx) {
    activeIndex = idx;
    const els = dropdownEl.querySelectorAll('.dropdown-item');
    els.forEach((el, i) => {
      if (i === activeIndex) el.setAttribute('aria-selected', 'true');
      else el.removeAttribute('aria-selected');
    });

    const item = els[activeIndex];
    if (!item) return;
    inputEl.value = item.dataset.name ?? '';
  }

  function render() {
    activeIndex = -1;
    const q = normalize(inputEl.value);

    const list = q
      ? items.filter((it) => normalize(it.name).includes(q)).slice(0, 18)
      : items.slice(0, 18);

    if (!list.length) {
      positionDropdown();
      dropdownEl.innerHTML = `<div class="dropdown-item muted">${emptyLabel}</div>`;
      dropdownEl.hidden = false;
      return;
    }

    show(list);
  }

  inputEl.addEventListener('focus', () => render());
  inputEl.addEventListener('input', () => render());

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hide();
      return;
    }

    const els = dropdownEl.querySelectorAll('.dropdown-item');

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (dropdownEl.hidden || els.length === 0) return;

      e.preventDefault();
      if (e.key === 'ArrowDown') setActive(Math.min(activeIndex + 1, els.length - 1));
      else setActive(Math.max(activeIndex - 1, 0));
      return;
    }

    if (e.key === 'Enter') {
      if (dropdownEl.hidden) return;
      const item = els[activeIndex];
      if (!item) return;
      inputEl.value = item.dataset.name ?? '';
      hide();
    }
  });

  dropdownEl.addEventListener('mousedown', (e) => {
    const item = e.target?.closest?.('.dropdown-item');
    if (!item) return;
    e.preventDefault();
    inputEl.value = item.dataset.name ?? '';
    hide();
  });

  document.addEventListener('click', (e) => {
    const clickedInside = inputEl.contains(e.target) || dropdownEl.contains(e.target);
    if (!clickedInside) hide();
  });

  window.addEventListener('resize', () => {
    if (!dropdownEl.hidden) positionDropdown();
  });

  window.addEventListener('scroll', () => {
    if (!dropdownEl.hidden) positionDropdown();
  }, true);
}

function setSkillCheckboxesFromText(selectedSkillName) {
  if (!selectedSkillName) return;

  const normalized = normalize(selectedSkillName);

  // Map dropdown skill names to the existing checkbox ids on the sheet.
  const skillNameToCheckboxId = {
    'acrobatics': 'acrobatics-input',
    'animal handling': 'animal-handling-input',
    'arcana': 'arcana-input',
    'athletics': 'athletics-input',
    'deception': 'deception-input',
    'history': 'history-input',
    'insight': 'insight-input',
    'intimidation': 'intimidation-input',
    'investigation': 'investigation-input',
    'medicine': 'medicine-input',
    'nature': 'nature-input',
    'perception': 'perception-input',
    'performance': 'performance-input',
    'persuasion': 'persuasion-input',
    'religion': 'religion-input',
    'sleight of hand': 'sleight-of-hand-input',
    'stealth': 'stealth-input',
    'survival': 'survival-input'
  };

  // Remove parenthetical extras if the user types them (e.g., "Acrobatics (DEX)").
  const cleaned = normalized
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const checkboxId = skillNameToCheckboxId[cleaned];
  if (!checkboxId) return;

  const checkbox = document.getElementById(checkboxId);
  if (!checkbox) return;

  checkbox.checked = true;
  checkbox.dispatchEvent(new Event('change', { bubbles: true }));
}

function init() {
  const input1 = document.getElementById('background-skill-1-input');
  const dd1 = document.getElementById('background-skill-1-dropdown');
  const input2 = document.getElementById('background-skill-2-input');
  const dd2 = document.getElementById('background-skill-2-dropdown');

  const attachSync = (inputEl) => {
    if (!inputEl) return;
    inputEl.addEventListener('input', () => {
      // Only turn on when it matches; do not try to turn off when cleared.
      setSkillCheckboxesFromText(inputEl.value);
    });
    inputEl.addEventListener('change', () => {
      setSkillCheckboxesFromText(inputEl.value);
    });
  };

  if (input1 && dd1) {
    setupTextDropdown({ inputEl: input1, dropdownEl: dd1, items: skillItems, emptyLabel: 'No skills found.' });
    attachSync(input1);
  }

  if (input2 && dd2) {
    setupTextDropdown({ inputEl: input2, dropdownEl: dd2, items: skillItems, emptyLabel: 'No skills found.' });
    attachSync(input2);
  }
}

init();


