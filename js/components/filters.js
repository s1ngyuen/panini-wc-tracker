// js/components/filters.js
// Shared filter bar: Team dropdown + Card Type dropdown.

/**
 * Render a filter bar into a container element.
 *
 * @param {HTMLElement} container - Where to mount the filter bar
 * @param {{
 *   teams: string[],
 *   cardTypes: string[],
 *   onChange: (filter: { country: string, cardType: string }) => void
 * }} options
 */
export function renderFilterBar(container, { teams, cardTypes, onChange }) {
  container.innerHTML = '';

  const state = { country: '', cardType: '', status: '' };

  const bar = document.createElement('div');
  bar.className = 'flex flex-wrap gap-2 items-center justify-end';

  // ── Team select ────────────────────────────────────────────────────────
  const teamLabel = document.createElement('label');
  teamLabel.setAttribute('for', 'filter-team');
  teamLabel.className = 'sr-only';
  teamLabel.textContent = 'Filter by team';

  const teamSelect = document.createElement('select');
  teamSelect.id = 'filter-team';
  teamSelect.className = 'filter-select';
  teamSelect.setAttribute('aria-label', 'Filter by team');

  const allTeamsOpt = document.createElement('option');
  allTeamsOpt.value = '';
  allTeamsOpt.textContent = 'All Teams';
  teamSelect.appendChild(allTeamsOpt);

  teams.forEach(team => {
    const opt = document.createElement('option');
    opt.value = team;
    opt.textContent = team;
    teamSelect.appendChild(opt);
  });

  teamSelect.addEventListener('change', () => {
    state.country = teamSelect.value;
    onChange({ ...state });
    updateClear();
  });

  // ── Card type select ───────────────────────────────────────────────────
  const typeLabel = document.createElement('label');
  typeLabel.setAttribute('for', 'filter-type');
  typeLabel.className = 'sr-only';
  typeLabel.textContent = 'Filter by card type';

  const typeSelect = document.createElement('select');
  typeSelect.id = 'filter-type';
  typeSelect.className = 'filter-select';
  typeSelect.setAttribute('aria-label', 'Filter by card type');

  const allTypesOpt = document.createElement('option');
  allTypesOpt.value = '';
  allTypesOpt.textContent = 'All Types';
  typeSelect.appendChild(allTypesOpt);

  cardTypes.forEach(type => {
    const opt = document.createElement('option');
    opt.value = type;
    opt.textContent = type;
    typeSelect.appendChild(opt);
  });

  typeSelect.addEventListener('change', () => {
    state.cardType = typeSelect.value;
    onChange({ ...state });
    updateClear();
  });

  // ── Status select ──────────────────────────────────────────────────────
  const statusLabel = document.createElement('label');
  statusLabel.setAttribute('for', 'filter-status');
  statusLabel.className = 'sr-only';
  statusLabel.textContent = 'Filter by status';

  const statusSelect = document.createElement('select');
  statusSelect.id = 'filter-status';
  statusSelect.className = 'filter-select';
  statusSelect.setAttribute('aria-label', 'Filter by status');

  [['', 'All Cards'], ['owned', 'Owned'], ['missing', 'Missing'], ['duplicates', 'Duplicates']].forEach(([val, label]) => {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = label;
    statusSelect.appendChild(opt);
  });

  statusSelect.addEventListener('change', () => {
    state.status = statusSelect.value;
    onChange({ ...state });
    updateClear();
  });

  // ── Clear button ───────────────────────────────────────────────────────
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'btn-secondary text-sm px-3 py-2';
  clearBtn.textContent = 'Clear';
  clearBtn.hidden = true;
  clearBtn.setAttribute('aria-label', 'Clear all filters');

  clearBtn.addEventListener('click', () => {
    teamSelect.value = '';
    typeSelect.value = '';
    statusSelect.value = '';
    state.country = '';
    state.cardType = '';
    state.status = '';
    onChange({ ...state });
    clearBtn.hidden = true;
  });

  function updateClear() {
    clearBtn.hidden = !state.country && !state.cardType && !state.status;
  }

  bar.appendChild(teamLabel);
  bar.appendChild(teamSelect);
  bar.appendChild(typeLabel);
  bar.appendChild(typeSelect);
  bar.appendChild(statusLabel);
  bar.appendChild(statusSelect);
  bar.appendChild(clearBtn);

  container.appendChild(bar);
}
