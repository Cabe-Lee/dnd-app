// Shared race API + dropdown setup

function getBaseUrl() {
  try {
    return import.meta?.env?.EXTERNAL_API_BASE_URL || window?.EXTERNAL_API_BASE_URL || 'https://www.dnd5eapi.co/api';
  } catch {
    return window?.EXTERNAL_API_BASE_URL || 'https://www.dnd5eapi.co/api';
  }
}

async function fetchRaces() {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/races`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) ?? {};
  return data.results ?? [];
}

function normalize(str) {
  return (str ?? '').toString().toLowerCase().trim();
}

export async function fetchRacesAndSetupDropdown({ inputEl, dropdownEl, slugEl }) {
  function hide() {
    dropdownEl.hidden = true;
    dropdownEl.innerHTML = '';
  }


  function show(list) {
    dropdownEl.innerHTML = '';
    dropdownEl.hidden = false;

    const frag = document.createDocumentFragment();

    list.forEach((r) => {
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      item.textContent = r.name ?? '';
      item.dataset.slug = (r.slug ?? '') || (r.url ? r.url.split('/').filter(Boolean).pop() : '');
      item.dataset.name = r.name ?? '';
      frag.appendChild(item);
    });

    dropdownEl.appendChild(frag);
  }

  let activeIndex = -1;

  function setActive(idx) {
    activeIndex = idx;

    const items = dropdownEl.querySelectorAll('.dropdown-item');
    items.forEach((el, i) => {
      if (i === activeIndex) {
        el.setAttribute('aria-selected', 'true');
      } else {
        el.removeAttribute('aria-selected');
      }
    });

    const item = items[activeIndex];
    if (item?.dataset?.name !== undefined) {
      inputEl.value = item.dataset.name ?? '';
      slugEl.value = item.dataset.slug ?? '';
    }
  }

  function render() {
    activeIndex = -1;
    const q = normalize(inputEl.value);

    const list = q
      ? races.filter((r) => normalize(r.name).includes(q)).slice(0, 12)
      : races.slice(0, 12);

    if (list.length === 0) {
      show([]);
      dropdownEl.innerHTML = '<div class="dropdown-item muted">No races found.</div>';
      return;
    }

    show(list);
  }

  inputEl.addEventListener('focus', () => {
    render();
  });


  inputEl.addEventListener('input', () => {
    render();
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hide();
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const items = dropdownEl.querySelectorAll('.dropdown-item');
      if (dropdownEl.hidden || items.length === 0) return;

      e.preventDefault();

      if (e.key === 'ArrowDown') {
        setActive(Math.min(activeIndex + 1, items.length - 1));
      } else {
        setActive(Math.max(activeIndex - 1, 0));
      }
      return;
    }

    if (e.key === 'Enter') {
      if (dropdownEl.hidden) return;
      const items = dropdownEl.querySelectorAll('.dropdown-item');
      if (activeIndex < 0 || activeIndex >= items.length) return;

      const item = items[activeIndex];
      inputEl.value = item.dataset.name ?? '';
      slugEl.value = item.dataset.slug ?? '';
      hide();
    }
  });

  dropdownEl.addEventListener('mousedown', (e) => {
    const item = e.target?.closest?.('.dropdown-item');
    if (!item) return;

    e.preventDefault();
    inputEl.value = item.dataset.name ?? '';
    slugEl.value = item.dataset.slug ?? '';
    hide();
  });

  document.addEventListener('click', (e) => {
    const clickedInside = inputEl.contains(e.target) || dropdownEl.contains(e.target);
    if (!clickedInside) hide();
  });

  const races = await fetchRaces();
  dropdownEl.hidden = true;
  dropdownEl.innerHTML = '';
  slugEl.value = '';
}