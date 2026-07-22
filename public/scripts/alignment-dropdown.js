import { fetchAlignmentsAndSetupDropdown } from './alignment-api.js';

function initAlignmentDropdown() {
  const inputEl = document.getElementById('alignment-input');
  const dropdownEl = document.getElementById('alignment-dropdown');
  const slugEl = document.getElementById('alignment-slug-input');

  if (!inputEl || !dropdownEl || !slugEl) return;

  fetchAlignmentsAndSetupDropdown({ inputEl, dropdownEl, slugEl }).catch(() => {
    dropdownEl.hidden = true;
    dropdownEl.innerHTML = '';
  });
}

initAlignmentDropdown();

