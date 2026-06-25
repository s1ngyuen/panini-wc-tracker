// js/views/missing-cards.js
// Missing Cards view — list of uncollected cards with export.

import { CARDS, TEAMS, CARD_TYPES } from '../cards-data.js';
import { getCollection } from '../store.js';
import { showToast } from '../components/toast.js';
import { renderFilterBar } from '../components/filters.js';

/**
 * Mount the Missing Cards view.
 * @param {HTMLElement} container
 */
export async function mountMissingCards(container) {
  container.innerHTML = '';

  let collection = await getCollection();
  let currentFilter = { country: '', cardType: '' };

  // ── Header ───────────────────────────────────────────────────────────────
  const header = document.createElement('div');
  header.className = 'px-4 pt-6 pb-2';

  header.innerHTML = `
    <div class="section-heading-wrap">
      <div class="section-heading-bar"></div>
      <span class="fx page-title">Missing</span>
    </div>
  `;

  const subheading = document.createElement('p');
  subheading.id = 'missing-subheading';
  subheading.className = 'section-sub';

  header.appendChild(subheading);
  container.appendChild(header);

  // ── Toolbar: filter + export ─────────────────────────────────────────────
  const toolbar = document.createElement('div');
  toolbar.className = 'px-4 pb-3 flex flex-col gap-3';

  const filterWrap = document.createElement('div');
  toolbar.appendChild(filterWrap);

  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.className = 'btn-secondary w-full';
  exportBtn.setAttribute('aria-label', 'Copy missing cards list to clipboard');
  exportBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
    Copy Missing List
  `;
  toolbar.appendChild(exportBtn);
  container.appendChild(toolbar);

  // ── List container ───────────────────────────────────────────────────────
  const listContainer = document.createElement('div');
  listContainer.setAttribute('aria-live', 'polite');
  listContainer.setAttribute('aria-label', 'Missing cards list');
  container.appendChild(listContainer);

  // ── Render logic ─────────────────────────────────────────────────────────
  function getMissingCards() {
    return CARDS.filter(card => {
      const owned = (collection[String(card.id)] ?? 0) >= 1;
      if (owned) return false;
      if (currentFilter.country  && card.country  !== currentFilter.country)  return false;
      if (currentFilter.cardType && card.cardType !== currentFilter.cardType) return false;
      return true;
    });
  }

  function buildSubheading(missing, filter) {
    const { country, cardType } = filter;
    if (!country && !cardType) {
      subheading.textContent = `${missing.length} cards still to find.`;
    } else {
      const parts = [country && `from ${country}`, cardType && cardType].filter(Boolean);
      subheading.textContent = `${missing.length} missing ${parts.join(' ')} cards.`;
    }
  }

  function renderList() {
    listContainer.innerHTML = '';
    const missing = getMissingCards();
    buildSubheading(missing, currentFilter);

    const totalMissing = CARDS.filter(c => (collection[String(c.id)] ?? 0) === 0).length;

    if (totalMissing === 0) {
      const allDone = document.createElement('p');
      allDone.className = 'text-center py-12 text-sm';
      allDone.style.color = '#00D15E';
      allDone.textContent = "You've got them all. The set is complete.";
      listContainer.appendChild(allDone);
      return;
    }

    if (missing.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'text-center py-12 text-sm px-4';
      empty.style.color = '#555';
      empty.textContent = 'No cards match that filter. Try a different team or type.';
      listContainer.appendChild(empty);
      return;
    }

    const frag = document.createDocumentFragment();
    missing.forEach(card => {
      const row = document.createElement('div');
      row.className = 'missing-row';

      const idEl = document.createElement('span');
      idEl.className = 'missing-row__id';
      idEl.textContent = `#${card.id}`;

      const nameEl = document.createElement('span');
      nameEl.className = 'missing-row__name';
      nameEl.textContent = card.playerName;

      const metaEl = document.createElement('span');
      metaEl.className = 'missing-row__meta';
      metaEl.textContent = `${card.country} — ${card.cardType}`;

      row.appendChild(idEl);
      row.appendChild(nameEl);
      row.appendChild(metaEl);
      frag.appendChild(row);
    });
    listContainer.appendChild(frag);
  }

  // ── Export handler ───────────────────────────────────────────────────────
  exportBtn.addEventListener('click', async () => {
    const missing = getMissingCards();
    const { country, cardType } = currentFilter;
    const filterLine = (country || cardType)
      ? `Filtered: ${[country, cardType].filter(Boolean).join(' · ')}\n`
      : '';

    const lines = missing.map(c => `#${c.id} ${c.playerName} (${c.country} — ${c.cardType})`).join('\n');

    const text = [
      'My Missing Cards — Panini Adrenalyn XL WC 2026',
      filterLine ? filterLine.trim() : '',
      '',
      lines,
      '',
      `${missing.length} cards needed · Generated by WC 2026 Tracker`,
    ].filter((l, i) => !(i === 1 && l === '')).join('\n');

    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied! Paste it into Messenger and start hunting.', 'success');
    } catch {
      showToast("Couldn't copy automatically. Select the text above and copy it manually.", 'error');
    }
  });

  // ── Filter bar ───────────────────────────────────────────────────────────
  renderFilterBar(filterWrap, {
    teams: TEAMS,
    cardTypes: CARD_TYPES,
    onChange: filter => {
      currentFilter = filter;
      renderList();
    },
  });

  renderList();

  // Expose refresh so app.js can call when view becomes active
  container._refresh = async () => {
    collection = await getCollection();
    renderList();
  };
}
