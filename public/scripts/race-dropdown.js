// Race dropdown logic for character-creation.html

import { fetchRacesAndSetupDropdown } from './races-api.js';

function initRaceDropdown() {
  const inputEl = document.getElementById('race-input');
  const dropdownEl = document.getElementById('race-dropdown');
  const slugEl = document.getElementById('race-slug-input');

  if (!inputEl || !dropdownEl || !slugEl) return;

  fetchRacesAndSetupDropdown({ inputEl, dropdownEl, slugEl }).catch(() => {
    dropdownEl.hidden = false;
    dropdownEl.innerHTML = '<div class="dropdown-item muted">Failed to load races.</div>';
  });
}

initRaceDropdown();