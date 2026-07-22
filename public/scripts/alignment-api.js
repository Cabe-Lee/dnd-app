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

async function fetchAlignments() {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/2014/alignments`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) ?? {};
  return data.results ?? [];
}

export async function fetchAlignmentsAndSetupDropdown({ inputEl, dropdownEl, slugEl }) {
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

    const frag = document.createDocumentFragment();

    list.forEach((a) => {
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      item.textContent = a.name ?? '';
      item.dataset.slug = a.slug ?? '';
      item.dataset.name = a.name ?? '';
      frag.appendChild(item);
    });

    dropdownEl.appendChild(frag);
  }

  let activeIndex = -1;

  function setActive(idx) {
    activeIndex = idx;

    const items = dropdownEl.querySelectorAll('.dropdown-item');
    items.forEach((el, i) => {
      if (i === activeIndex) el.setAttribute('aria-selected', 'true');
      else el.removeAttribute('aria-selected');
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
      ? alignments.filter((a) => normalize(a.name).includes(q)).slice(0, 12)
      : alignments.slice(0, 12);

    if (list.length === 0) {
      positionDropdown();
      dropdownEl.innerHTML = '<div class="dropdown-item muted">No alignments found.</div>';
      dropdownEl.hidden = false;
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
      if (e.key === 'ArrowDown') setActive(Math.min(activeIndex + 1, items.length - 1));
      else setActive(Math.max(activeIndex - 1, 0));
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

  window.addEventListener('resize', () => {
    if (!dropdownEl.hidden) positionDropdown();
  });

  window.addEventListener('scroll', () => {
    if (!dropdownEl.hidden) positionDropdown();
  }, true);

  // Initial data/state (keep dropdown hidden until interaction)
  const results = await fetchAlignments();

  const order = [
    'lawful-good',
    'neutral-good',
    'chaotic-good',
    'lawful-neutral',
    'neutral',
    'chaotic-neutral',
    'lawful-evil',
    'neutral-evil',
    'chaotic-evil'
  ];

  const alignments = results
    .map((r) => {
      const slug = (r.slug ?? '') || (r.url ? r.url.split('/').filter(Boolean).pop() : '');
      return { name: r.name, slug };
    })
    .sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));

  dropdownEl.hidden = true;

  dropdownEl.innerHTML = '';
  slugEl.value = '';

  // render will be triggered by focus/input
}
