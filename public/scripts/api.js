function getBaseUrl() {
  try {
    return import.meta?.env?.EXTERNAL_API_BASE_URL || window?.EXTERNAL_API_BASE_URL || 'https://www.dnd5eapi.co/api';
  } catch {
    return window?.EXTERNAL_API_BASE_URL || 'https://www.dnd5eapi.co/api';
  }
}

function normalize(str) {
  return (str ?? '').toString().toLowerCase().trim();
}

function setupTextDropdown({ inputEl, dropdownEl, hiddenUntilFirstUse = false, emptyLabel, items }) {
  let activeIndex = -1;

  function hide() {
    dropdownEl.hidden = true;
    dropdownEl.innerHTML = '';
  }

  function show(list) {
    dropdownEl.innerHTML = '';
    dropdownEl.hidden = false;

    const frag = document.createDocumentFragment();

    list.forEach((it) => {
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      item.textContent = it.name ?? '';
      item.dataset.slug = it.slug ?? '';
      item.dataset.name = it.name ?? '';
      frag.appendChild(item);
    });

    dropdownEl.appendChild(frag);
  }

  function setActive(idx) {
    activeIndex = idx;

    const els = dropdownEl.querySelectorAll('.dropdown-item');
    els.forEach((el, i) => {
      if (i === activeIndex) el.setAttribute('aria-selected', 'true');
      else el.removeAttribute('aria-selected');
    });

    const item = els[activeIndex];
    if (item?.dataset?.name !== undefined) {
      inputEl.value = item.dataset.name ?? '';
      if (items.slugEl) items.slugEl.value = item.dataset.slug ?? '';
    }
  }

  function render() {
    activeIndex = -1;
    const q = normalize(inputEl.value);

    const list = q
      ? items.filter((it) => normalize(it.name).includes(q)).slice(0, 12)
      : items.slice(0, 12);

    if (!list.length) {
      dropdownEl.innerHTML = `<div class="dropdown-item muted">${emptyLabel}</div>`;
      dropdownEl.hidden = false;
      return;
    }

    show(list);
  }

  if (!hiddenUntilFirstUse) {
    inputEl.addEventListener('focus', render);
  }

  inputEl.addEventListener('focus', () => {
    if (hiddenUntilFirstUse) render();
  });
  inputEl.addEventListener('input', render);

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hide();
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const els = dropdownEl.querySelectorAll('.dropdown-item');
      if (dropdownEl.hidden || els.length === 0) return;

      e.preventDefault();
      if (e.key === 'ArrowDown') setActive(Math.min(activeIndex + 1, els.length - 1));
      else setActive(Math.max(activeIndex - 1, 0));
      return;
    }

    if (e.key === 'Enter') {
      if (dropdownEl.hidden) return;
      const els = dropdownEl.querySelectorAll('.dropdown-item');
      if (activeIndex < 0 || activeIndex >= els.length) return;

      const item = els[activeIndex];
      inputEl.value = item.dataset.name ?? '';
      if (items.slugEl) items.slugEl.value = item.dataset.slug ?? '';
      hide();
    }
  });

  dropdownEl.addEventListener('mousedown', (e) => {
    const item = e.target?.closest?.('.dropdown-item');
    if (!item) return;

    e.preventDefault();
    inputEl.value = item.dataset.name ?? '';
    if (items.slugEl) items.slugEl.value = item.dataset.slug ?? '';
    hide();
  });

  document.addEventListener('click', (e) => {
    const clickedInside = inputEl.contains(e.target) || dropdownEl.contains(e.target);
    if (!clickedInside) hide();
  });
}

async function fetchClasses() {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/classes`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) ?? {};
  return data.results ?? [];
}

export async function fetchAndDisplayCharacters() {
  const inputEl = document.getElementById('class-input');
  const dropdownEl = document.getElementById('class-dropdown');
  const slugEl = document.getElementById('class-slug-input');

  if (!inputEl || !dropdownEl || !slugEl) return;

  dropdownEl.hidden = true;
  dropdownEl.innerHTML = '';
  slugEl.value = '';

  try {
    const classes = await fetchClasses();
    console.log('External API /classes results:', classes);

    setupTextDropdown({
      inputEl,
      dropdownEl,
      hiddenUntilFirstUse: false,
      emptyLabel: 'No classes found.',
      items: classes.map((c) => ({ name: c.name ?? '', slug: c.slug ?? '' })),
      slugEl
    });
  } catch (error) {
    console.error('Error fetching external API classes:', error);
    dropdownEl.hidden = false;
    dropdownEl.innerHTML = '<div class="dropdown-item muted">Failed to load classes.</div>';
  }
}