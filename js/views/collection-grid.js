// js/views/collection-grid.js
// Collection grid view — all 630 cards with filter and status overlay.

import { CARDS, TEAMS, CARD_TYPES } from '../cards-data.js';
import { getCollection } from '../store.js';
import { createCardElement } from '../components/card-visual.js';
import { renderFilterBar } from '../components/filters.js';

/**
 * Mount the Collection Grid view.
 * @param {HTMLElement} container
 */
export async function mountCollectionGrid(container) {
  container.innerHTML = '';

  // ── Header ───────────────────────────────────────────────────────────────
  const header = document.createElement('div');
  header.className = 'px-4 pt-6 pb-2';
  header.innerHTML = `
    <h1 class="section-heading">My Collection</h1>
    <span class="chevron-accent"></span>
  `;
  container.appendChild(header);

  // ── Filter bar container ─────────────────────────────────────────────────
  const filterWrap = document.createElement('div');
  filterWrap.className = 'px-4 pb-3';
  container.appendChild(filterWrap);

  // ── Results count label ──────────────────────────────────────────────────
  const countLabel = document.createElement('p');
  countLabel.className = 'px-4 pb-2 text-xs font-semibold';
  countLabel.style.color = '#666';
  container.appendChild(countLabel);

  // ── Card grid ────────────────────────────────────────────────────────────
  const grid = document.createElement('div');
  grid.className = 'card-grid';
  grid.setAttribute('role', 'list');
  grid.setAttribute('aria-label', 'Card collection');
  container.appendChild(grid);

  // ── Load collection & render ─────────────────────────────────────────────
  let collection = await getCollection();
  let currentFilter = { country: '', cardType: '' };

  function getFilteredCards() {
    return CARDS.filter(card => {
      if (currentFilter.country  && card.country  !== currentFilter.country)  return false;
      if (currentFilter.cardType && card.cardType !== currentFilter.cardType) return false;
      return true;
    });
  }

  function buildCountLabel(filtered, filter) {
    const { country, cardType } = filter;
    if (!country && !cardType) {
      countLabel.textContent = `Showing ${filtered.length} of 630 cards`;
    } else {
      const parts = [country, cardType].filter(Boolean);
      countLabel.textContent = `${filtered.length} cards · ${parts.join(' · ')}`;
    }
  }

  function renderGrid() {
    grid.innerHTML = '';
    const filtered = getFilteredCards();
    buildCountLabel(filtered, currentFilter);

    if (filtered.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'w-full text-center py-12 text-sm';
      empty.style.color = '#555';
      empty.textContent = 'No cards match that filter. Try a different team or type.';
      grid.appendChild(empty);
      return;
    }

    // Use a DocumentFragment for performance (630 nodes)
    const frag = document.createDocumentFragment();
    filtered.forEach(card => {
      const count = collection[String(card.id)] ?? 0;
      const el = createCardElement(card, count);
      el.setAttribute('role', 'listitem');
      frag.appendChild(el);
    });
    grid.appendChild(frag);
  }

  // Render filter bar
  renderFilterBar(filterWrap, {
    teams: TEAMS,
    cardTypes: CARD_TYPES,
    onChange: filter => {
      currentFilter = filter;
      renderGrid();
    },
  });

  renderGrid();

  // Expose refresh so app.js can call it when the view becomes active
  container._refresh = async () => {
    collection = await getCollection();
    renderGrid();
  };
}
