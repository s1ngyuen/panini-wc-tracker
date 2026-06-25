// js/views/collection-grid.js
// Collection grid view — all 630 cards with filter and status overlay.

import { CARDS, TEAMS, CARD_TYPES, BONUS_CARDS } from '../cards-data.js';
import { getCollection, removeCard } from '../store.js';
import { getPendingReceiveIds } from '../store-trades.js';
import { createCardElement } from '../components/card-visual.js';
import { renderFilterBar } from '../components/filters.js';
import { buildProgressContent } from './progress.js';
import { showToast } from '../components/toast.js';

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

  // ── Progress summary (clickable → opens breakdown modal) ─────────────────
  const progressWrap = document.createElement('div');
  progressWrap.className = 'collection-progress';
  progressWrap.setAttribute('role', 'button');
  progressWrap.setAttribute('tabindex', '0');
  progressWrap.setAttribute('aria-label', 'View progress breakdown');
  progressWrap.innerHTML = `
    <div class="collection-progress__labels">
      <span class="collection-progress__count"></span>
      <span class="collection-progress__pct"></span>
    </div>
    <div class="collection-progress__bar-track">
      <div class="collection-progress__bar-fill"></div>
      <div class="collection-progress__bar-pending"></div>
    </div>
    <div class="collection-progress__key" hidden>
      <span class="collection-progress__key-owned"></span>
      <span class="collection-progress__key-pending"></span>
    </div>
    <div class="collection-progress__hint">Tap for full breakdown</div>
  `;
  container.appendChild(progressWrap);

  // ── Quick stat tiles ──────────────────────────────────────────────────────
  const statTilesWrap = document.createElement('div');
  statTilesWrap.className = 'collection-stat-tiles';
  statTilesWrap.innerHTML = `
    <div class="cst-tile">
      <span class="cst-tile__num cst-total">—</span>
      <span class="cst-tile__label">Total cards</span>
    </div>
    <div class="cst-tile">
      <span class="cst-tile__num cst-unique">—</span>
      <span class="cst-tile__label">Unique</span>
    </div>
    <div class="cst-tile">
      <span class="cst-tile__num cst-need">—</span>
      <span class="cst-tile__label">Still need</span>
    </div>
    <div class="cst-tile">
      <span class="cst-tile__num cst-dupe">—</span>
      <span class="cst-tile__label">Duplicates</span>
    </div>
  `;
  container.appendChild(statTilesWrap);

  const cstTotal  = statTilesWrap.querySelector('.cst-total');
  const cstUnique = statTilesWrap.querySelector('.cst-unique');
  const cstNeed   = statTilesWrap.querySelector('.cst-need');
  const cstDupe   = statTilesWrap.querySelector('.cst-dupe');

  const progressCount      = progressWrap.querySelector('.collection-progress__count');
  const progressPct        = progressWrap.querySelector('.collection-progress__pct');
  const progressFill       = progressWrap.querySelector('.collection-progress__bar-fill');
  const progressPendingBar = progressWrap.querySelector('.collection-progress__bar-pending');
  const progressKey        = progressWrap.querySelector('.collection-progress__key');
  const progressKeyOwned   = progressWrap.querySelector('.collection-progress__key-owned');
  const progressKeyPending = progressWrap.querySelector('.collection-progress__key-pending');

  // ── Progress breakdown modal ──────────────────────────────────────────────
  const progressModal = document.createElement('div');
  progressModal.className = 'progress-modal';
  progressModal.setAttribute('role', 'dialog');
  progressModal.setAttribute('aria-modal', 'true');
  progressModal.setAttribute('aria-label', 'Progress breakdown');
  progressModal.hidden = true;
  progressModal.innerHTML = `
    <div class="progress-modal__backdrop"></div>
    <div class="progress-modal__panel">
      <div class="progress-modal__handle"></div>
      <div class="progress-modal__header">
        <span class="fx progress-modal__title">Progress</span>
        <button class="progress-modal__close" aria-label="Close">✕</button>
      </div>
      <div class="progress-modal__body"></div>
    </div>
  `;
  document.body.appendChild(progressModal);

  const pmBody = progressModal.querySelector('.progress-modal__body');

  function openProgressModal() {
    buildProgressContent(pmBody, collection, getPendingReceiveIds());
    progressModal.hidden = false;
    document.body.style.overflow = 'hidden';
    progressModal.querySelector('.progress-modal__close').focus();
  }

  function closeProgressModal() {
    progressModal.hidden = true;
    document.body.style.overflow = '';
  }

  progressWrap.addEventListener('click', openProgressModal);
  progressWrap.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProgressModal(); } });
  progressModal.querySelector('.progress-modal__backdrop').addEventListener('click', closeProgressModal);
  progressModal.querySelector('.progress-modal__close').addEventListener('click', closeProgressModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !progressModal.hidden) closeProgressModal(); });

  // ── Trading message button ───────────────────────────────────────────────
  const tradingMsgBtn = document.createElement('button');
  tradingMsgBtn.type = 'button';
  tradingMsgBtn.className = 'btn-secondary trading-msg-btn';
  tradingMsgBtn.textContent = 'Generate Trading Message';
  container.appendChild(tradingMsgBtn);

  tradingMsgBtn.addEventListener('click', async () => {
    const current    = await getCollection();
    const missing    = CARDS.filter(c => (current[String(c.id)] ?? 0) === 0);
    const duplicates = CARDS.filter(c => (current[String(c.id)] ?? 0) >= 2);

    const needList  = missing.map(c => `#${c.id}`).join(', ') || 'None';
    const dupeList  = duplicates.map(c => `#${c.id}`).join(', ') || 'None';

    const msg = `I am looking for: ${needList}\n\nI have duplicates of: ${dupeList}`;

    navigator.clipboard.writeText(msg).then(() => {
      showToast('Trading message copied to clipboard!', 'success');
    }).catch(() => {
      // Fallback for browsers without clipboard API
      const ta = document.createElement('textarea');
      ta.value = msg;
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      showToast('Trading message copied!', 'success');
    });
  });

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
        <div class="card-lightbox__qty-row" hidden>
          <button class="card-lightbox__qty-btn" data-dir="-" aria-label="Remove fewer">−</button>
          <span class="card-lightbox__qty-val">1</span>
          <button class="card-lightbox__qty-btn" data-dir="+" aria-label="Remove more">+</button>
        </div>
        <button class="card-lightbox__remove" aria-label="Remove copies from collection">Remove Card</button>
      </div>
    </div>
  `;
  document.body.appendChild(lightbox);

  const lbImg       = lightbox.querySelector('.card-lightbox__img');
  const lbName      = lightbox.querySelector('.card-lightbox__name');
  const lbSub       = lightbox.querySelector('.card-lightbox__sub');
  const lbStatus    = lightbox.querySelector('.card-lightbox__status');
  const lbRemoveBtn = lightbox.querySelector('.card-lightbox__remove');
  const lbQtyRow    = lightbox.querySelector('.card-lightbox__qty-row');
  const lbQtyVal    = lightbox.querySelector('.card-lightbox__qty-val');

  let _lbCard  = null;
  let _lbCount = 0;
  let _lbQty   = 1;

  function updateQty(qty) {
    _lbQty = Math.max(1, Math.min(qty, _lbCount));
    lbQtyVal.textContent = _lbQty;
    lbRemoveBtn.textContent = _lbQty === 1 ? 'Remove Card' : `Remove ${_lbQty} Copies`;
    lightbox.querySelector('[data-dir="-"]').disabled = _lbQty <= 1;
    lightbox.querySelector('[data-dir="+"]').disabled = _lbQty >= _lbCount;
  }

  function updateLightboxStatus(count) {
    if (count === 0)      lbStatus.textContent = 'Missing';
    else if (count === 1) lbStatus.textContent = 'Owned';
    else                  lbStatus.textContent = `×${count} — ${count - 1} spare`;
    lbStatus.className = `card-lightbox__status card-lightbox__status--${count === 0 ? 'missing' : count >= 2 ? 'dupe' : 'owned'}`;
    lbRemoveBtn.disabled = count === 0;
    // Show qty stepper only when more than 1 copy
    lbQtyRow.hidden = count <= 1;
    if (count > 1) updateQty(Math.min(_lbQty, count));
    else { _lbQty = 1; lbRemoveBtn.textContent = 'Remove Card'; }
  }

  function openLightbox(card, count) {
    _lbCard  = card;
    _lbCount = count;
    _lbQty   = 1;
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
    _lbQty   = 1;
  }

  lbQtyRow.querySelector('[data-dir="-"]').addEventListener('click', () => updateQty(_lbQty - 1));
  lbQtyRow.querySelector('[data-dir="+"]').addEventListener('click', () => updateQty(_lbQty + 1));

  lbRemoveBtn.addEventListener('click', async () => {
    if (!_lbCard) return;
    const label = _lbQty === 1
      ? `Remove 1 copy of #${_lbCard.id} ${_lbCard.playerName} from your collection?`
      : `Remove ${_lbQty} copies of #${_lbCard.id} ${_lbCard.playerName} from your collection?`;
    if (!window.confirm(label)) return;
    let newCount = _lbCount;
    for (let i = 0; i < _lbQty; i++) {
      const result = await removeCard(_lbCard.id);
      newCount = result.count;
    }
    collection = await getCollection();
    _lbCount = newCount;
    _lbQty   = 1;
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

  // ── Bonus cards section (appended once, updated on refresh) ──────────────
  const bonusSection = document.createElement('div');
  bonusSection.className = 'bonus-cards-section';
  container.appendChild(bonusSection);

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
    const total   = filtered.length;
    const owned   = filtered.filter(c => (collection[String(c.id)] ?? 0) >= 1).length;
    const pending = filtered.filter(c => (collection[String(c.id)] ?? 0) === 0 && pendingReceiveIds.has(c.id)).length;
    const combined = owned + pending;

    const ownedPct   = total === 0 ? 0 : (owned   / total) * 100;
    const pendingPct = total === 0 ? 0 : (pending / total) * 100;
    const combinedPct = Math.round(ownedPct + pendingPct);

    progressFill.style.width        = `${ownedPct}%`;
    progressPendingBar.style.width  = `${pendingPct}%`;

    const hasPending = pending > 0;
    progressCount.innerHTML = `<span class="cp-owned-n">${combined}${hasPending ? '*' : ''}</span><span class="cp-total"> of ${total} cards</span>`;
    progressPct.textContent   = `${combinedPct}%`;

    progressKey.hidden = !hasPending;
    if (hasPending) {
      progressKeyOwned.textContent   = `${owned} owned`;
      progressKeyPending.textContent = `${pending} pending`;
    }

    const totalOwned = filtered.reduce((sum, c) => sum + (collection[String(c.id)] ?? 0), 0);
    const dupCount   = filtered.reduce((sum, c) => sum + Math.max(0, (collection[String(c.id)] ?? 0) - 1), 0);
    cstTotal.textContent  = totalOwned;
    cstUnique.textContent = owned;
    cstNeed.textContent   = total - owned;
    cstDupe.textContent   = dupCount;
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

  // ── Render bonus cards section ───────────────────────────────────────────
  function renderBonusSection() {
    bonusSection.innerHTML = '';

    const ownedBonus = BONUS_CARDS.filter(c => (collection[String(c.id)] ?? 0) >= 1).length;
    if (ownedBonus === 0) return;

    const heading = document.createElement('div');
    heading.className = 'px-4 pt-6 pb-2';
    heading.innerHTML = `
      <div class="section-heading-wrap">
        <div class="section-heading-bar"></div>
        <span class="fx" style="font-size:28px; text-transform:uppercase; letter-spacing:.04em; color:var(--text-primary); line-height:1;">Special Cards</span>
      </div>
    `;
    bonusSection.appendChild(heading);

    const categories = [...new Set(BONUS_CARDS.map(c => c.bonusCategory))];
    categories.forEach(cat => {
      const cards = BONUS_CARDS.filter(c => c.bonusCategory === cat);
      const ownedInCat = cards.filter(c => (collection[String(c.id)] ?? 0) >= 1).length;
      if (ownedInCat === 0) return;

      const catLabel = document.createElement('p');
      catLabel.className = 'bonus-cat-label';
      catLabel.textContent = `${cat} · ${ownedInCat} / ${cards.length}`;
      bonusSection.appendChild(catLabel);

      const catGrid = document.createElement('div');
      catGrid.className = 'card-grid';
      catGrid.setAttribute('role', 'list');

      const frag = document.createDocumentFragment();
      cards.forEach(card => {
        const count = collection[String(card.id)] ?? 0;
        if (count === 0) return;
        const el = createCardElement(card, count);
        el.setAttribute('role', 'listitem');
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => openLightbox(card, count));
        frag.appendChild(el);
      });
      catGrid.appendChild(frag);
      bonusSection.appendChild(catGrid);
    });
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
  renderBonusSection();

  // Expose refresh so app.js can call it when the view becomes active
  container._refresh = async () => {
    collection = await getCollection();
    pendingReceiveIds = getPendingReceiveIds();
    renderGrid();
    renderBonusSection();
  };
}
