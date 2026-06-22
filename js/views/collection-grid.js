// js/views/collection-grid.js
// Collection grid view — all 630 cards with filter and status overlay.

import { CARDS, TEAMS, CARD_TYPES } from '../cards-data.js';
import { getCollection, removeCard } from '../store.js';
import { getPendingReceiveIds } from '../store-trades.js';
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
    <div class="section-heading-wrap">
      <div class="section-heading-bar"></div>
      <span class="fx" style="font-size:32px; text-transform:uppercase; letter-spacing:.04em; color:var(--text-primary); line-height:1;">Collection</span>
    </div>
  `;
  container.appendChild(header);

  // ── Progress summary ─────────────────────────────────────────────────────
  const progressWrap = document.createElement('div');
  progressWrap.className = 'collection-progress';
  progressWrap.innerHTML = `
    <div class="collection-progress__labels">
      <span class="collection-progress__count"></span>
      <span class="collection-progress__pct"></span>
    </div>
    <div class="collection-progress__bar-track">
      <div class="collection-progress__bar-fill"></div>
    </div>
  `;
  container.appendChild(progressWrap);

  const progressCount = progressWrap.querySelector('.collection-progress__count');
  const progressPct   = progressWrap.querySelector('.collection-progress__pct');
  const progressFill  = progressWrap.querySelector('.collection-progress__bar-fill');

  // ── Filter bar container ─────────────────────────────────────────────────
  const filterWrap = document.createElement('div');
  filterWrap.className = 'px-4 pb-3';
  container.appendChild(filterWrap);

  // ── Results count label ──────────────────────────────────────────────────
  const countLabel = document.createElement('p');
  countLabel.className = 'px-4 pb-2 text-xs font-semibold';
  countLabel.style.color = '#666';
  container.appendChild(countLabel);

  // ── Card lightbox ────────────────────────────────────────────────────────
  const lightbox = document.createElement('div');
  lightbox.className = 'card-lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', 'Card detail');
  lightbox.hidden = true;
  lightbox.innerHTML = `
    <div class="card-lightbox__backdrop"></div>
    <div class="card-lightbox__panel">
      <button class="card-lightbox__close" aria-label="Close">✕</button>
      <div class="card-lightbox__img-wrap">
        <img class="card-lightbox__img" alt="" />
      </div>
      <div class="card-lightbox__meta">
        <div class="card-lightbox__name"></div>
        <div class="card-lightbox__sub"></div>
        <div class="card-lightbox__status"></div>
      </div>
      <div class="card-lightbox__actions">
        <button class="card-lightbox__remove btn-danger" aria-label="Remove one copy from collection">Remove Card</button>
      </div>
    </div>
  `;
  document.body.appendChild(lightbox);

  const lbImg       = lightbox.querySelector('.card-lightbox__img');
  const lbName      = lightbox.querySelector('.card-lightbox__name');
  const lbSub       = lightbox.querySelector('.card-lightbox__sub');
  const lbStatus    = lightbox.querySelector('.card-lightbox__status');
  const lbRemoveBtn = lightbox.querySelector('.card-lightbox__remove');

  let _lbCard  = null;
  let _lbCount = 0;

  function updateLightboxStatus(count) {
    if (count === 0)      lbStatus.textContent = 'Missing';
    else if (count === 1) lbStatus.textContent = 'Owned';
    else                  lbStatus.textContent = `×${count} — ${count - 1} spare`;
    lbStatus.className = `card-lightbox__status card-lightbox__status--${count === 0 ? 'missing' : count >= 2 ? 'dupe' : 'owned'}`;
    lbRemoveBtn.disabled = count === 0;
  }

  function openLightbox(card, count) {
    _lbCard  = card;
    _lbCount = count;
    lbImg.src = `assets/cards/${card.id}.jpg`;
    lbImg.alt = card.playerName;
    lbName.textContent = card.playerName;
    lbSub.textContent  = `#${card.id} · ${card.country} · ${card.cardType}`;
    updateLightboxStatus(count);
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    lightbox.querySelector('.card-lightbox__close').focus();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = '';
    _lbCard  = null;
    _lbCount = 0;
  }

  lbRemoveBtn.addEventListener('click', async () => {
    if (!_lbCard) return;
    const confirmed = window.confirm(`Remove one copy of #${_lbCard.id} ${_lbCard.playerName} from your collection?`);
    if (!confirmed) return;
    const { count: newCount } = await removeCard(_lbCard.id);
    collection = await getCollection();
    _lbCount = newCount;
    updateLightboxStatus(newCount);
    renderGrid();
    if (newCount === 0) closeLightbox();
  });

  lightbox.querySelector('.card-lightbox__backdrop').addEventListener('click', closeLightbox);
  lightbox.querySelector('.card-lightbox__close').addEventListener('click', closeLightbox);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

  // ── Card grid ────────────────────────────────────────────────────────────
  const grid = document.createElement('div');
  grid.className = 'card-grid';
  grid.setAttribute('role', 'list');
  grid.setAttribute('aria-label', 'Card collection');
  container.appendChild(grid);

  // ── Load collection & render ─────────────────────────────────────────────
  let collection = await getCollection();
  let pendingReceiveIds = getPendingReceiveIds();
  let currentFilter = { country: '', cardType: '', status: '' };

  function getFilteredCards() {
    return CARDS.filter(card => {
      if (currentFilter.country  && card.country  !== currentFilter.country)  return false;
      if (currentFilter.cardType && card.cardType !== currentFilter.cardType) return false;
      if (currentFilter.status) {
        const count = collection[String(card.id)] ?? 0;
        if (currentFilter.status === 'owned'      && count < 1)  return false;
        if (currentFilter.status === 'missing'    && count > 0)  return false;
        if (currentFilter.status === 'duplicates' && count < 2)  return false;
      }
      return true;
    });
  }

  function buildCountLabel(filtered, filter) {
    const { country, cardType, status } = filter;
    if (!country && !cardType && !status) {
      countLabel.textContent = `Showing ${filtered.length} of 630 cards`;
    } else {
      const parts = [country, cardType, status].filter(Boolean);
      countLabel.textContent = `${filtered.length} cards · ${parts.join(' · ')}`;
    }
  }

  function updateProgress(filtered) {
    const owned = filtered.filter(c => (collection[String(c.id)] ?? 0) >= 1).length;
    const total = filtered.length;
    const pct   = total === 0 ? 0 : Math.round((owned / total) * 100);
    progressCount.textContent = `${owned} of ${total} cards`;
    progressPct.textContent   = `${pct}%`;
    progressFill.style.width  = `${pct}%`;
  }

  function renderGrid() {
    grid.innerHTML = '';
    const filtered = getFilteredCards();
    buildCountLabel(filtered, currentFilter);
    updateProgress(filtered);

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
      const el = createCardElement(card, count, { isPending: pendingReceiveIds.has(card.id) });
      el.setAttribute('role', 'listitem');
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => openLightbox(card, count));
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
    pendingReceiveIds = getPendingReceiveIds();
    renderGrid();
  };
}
