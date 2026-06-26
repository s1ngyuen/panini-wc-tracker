// js/views/collection-grid.js
// Collection grid view — all 630 cards with filter and status overlay.

import { CARDS, TEAMS, CARD_TYPES, BONUS_CARDS } from '../cards-data.js';
import { getCollection, removeCard } from '../store.js';
import { getPendingReceiveIds, getPendingTrades } from '../store-trades.js';
import { createCardElement } from '../components/card-visual.js';
import { renderFilterBar } from '../components/filters.js';
import { buildProgressContent } from './progress.js';
import { showToast } from '../components/toast.js';
import { loadPrices, getPrice, getCurrency, getUpdated, getPriceSummary } from '../store-prices.js';

/**
 * Mount the Collection Grid view.
 * @param {HTMLElement} container
 */
export async function mountCollectionGrid(container) {
  container.innerHTML = '';

  // ── Header ───────────────────────────────────────────────────────────────
  const header = document.createElement('div');
  header.className = 'px-4 py-4';
  header.innerHTML = `
    <div class="section-heading-wrap">
      <div class="section-heading-bar"></div>
      <span class="fx page-title">Collection</span>
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
      <span class="cst-tile__num cst-pending">—</span>
      <span class="cst-tile__label">Pending trade</span>
    </div>
    <div class="cst-tile">
      <span class="cst-tile__num cst-need">—</span>
      <span class="cst-tile__label">Still need</span>
    </div>
    <div class="cst-tile">
      <span class="cst-tile__num cst-dupe">—</span>
      <span class="cst-tile__label">Duplicates</span>
    </div>
    <div class="cst-tile">
      <span class="cst-tile__num cst-value">—</span>
      <span class="cst-tile__label">Est. Value</span>
    </div>
  `;
  container.appendChild(statTilesWrap);

  const cstTotal   = statTilesWrap.querySelector('.cst-total');
  const cstUnique  = statTilesWrap.querySelector('.cst-unique');
  const cstPending = statTilesWrap.querySelector('.cst-pending');
  const cstNeed    = statTilesWrap.querySelector('.cst-need');
  const cstDupe    = statTilesWrap.querySelector('.cst-dupe');
  const cstValue   = statTilesWrap.querySelector('.cst-value');

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

  // ── Collection tab bar ───────────────────────────────────────────────────
  const collTabBar = document.createElement('div');
  collTabBar.className = 'gen-tab-bar px-4';
  collTabBar.innerHTML = `
    <button class="gen-tab gen-tab--active" data-tab="all">All Cards</button>
    <button class="gen-tab" data-tab="core">Core Collection</button>
    <button class="gen-tab" data-tab="upgrades">Upgrade Cards</button>
    <button class="gen-tab" data-tab="le">Limited Edition</button>
    <button class="gen-tab" data-tab="wcm">WC Masters</button>
    <button class="gen-tab" data-tab="special">Special Cards</button>
    <button class="gen-tab" data-tab="dupes">Duplicates</button>
  `;
  container.appendChild(collTabBar);

  let activeTab = 'all';

  // ── Duplicates panel ─────────────────────────────────────────────────────
  const dupesPanel = document.createElement('div');
  dupesPanel.className = 'coll-panel';
  dupesPanel.hidden = true;
  container.appendChild(dupesPanel);

  // ── All Cards overview panel ─────────────────────────────────────────────
  const allCardsPanel = document.createElement('div');
  allCardsPanel.className = 'coll-panel';
  container.appendChild(allCardsPanel);

  // ── Core Collection panel ────────────────────────────────────────────────
  const corePanel = document.createElement('div');
  corePanel.className = 'coll-panel';
  corePanel.hidden = true;
  container.appendChild(corePanel);

  // ── Filter bar container ─────────────────────────────────────────────────
  const filterWrap = document.createElement('div');
  filterWrap.className = 'px-4 pb-3';
  corePanel.appendChild(filterWrap);

  // ── Results count label ──────────────────────────────────────────────────
  const countLabel = document.createElement('p');
  countLabel.className = 'px-4 pb-2 text-xs font-semibold';
  countLabel.style.color = '#666';
  corePanel.appendChild(countLabel);

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
        <div class="card-lightbox__price" hidden></div>
        <div class="card-lightbox__price-label" hidden>Avg eBay sold price</div>
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

  const lbImg        = lightbox.querySelector('.card-lightbox__img');
  const lbName       = lightbox.querySelector('.card-lightbox__name');
  const lbSub        = lightbox.querySelector('.card-lightbox__sub');
  const lbStatus     = lightbox.querySelector('.card-lightbox__status');
  const lbPrice      = lightbox.querySelector('.card-lightbox__price');
  const lbPriceLabel = lightbox.querySelector('.card-lightbox__price-label');
  const lbRemoveBtn  = lightbox.querySelector('.card-lightbox__remove');
  const lbQtyRow     = lightbox.querySelector('.card-lightbox__qty-row');
  const lbQtyVal     = lightbox.querySelector('.card-lightbox__qty-val');

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

    const price = getPrice(card.id);
    if (price !== null) {
      const sym = getCurrency() === 'AUD' ? 'A$' : '$';
      lbPrice.textContent      = `${sym}${price.toFixed(2)}`;
      lbPriceLabel.textContent = `Avg eBay sold price · ${getUpdated()}`;
      lbPrice.hidden      = false;
      lbPriceLabel.hidden = false;
    } else {
      lbPrice.hidden      = true;
      lbPriceLabel.hidden = true;
    }

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
  corePanel.appendChild(grid);

  // ── Special card tab definitions ─────────────────────────────────────────
  const SPECIAL_TABS = [
    { key: 'upgrades', cats: ['Hero Updates'] },
    { key: 'le',       cats: ['Limited Edition', 'LE Hologram'] },
    { key: 'wcm',      cats: ['WC Masters'] },
    { key: 'special',  cats: ['Emblem Variants', 'Scandinavian Stars'] },
  ];

  // ── Build one panel per special tab ─────────────────────────────────────
  const specialPanels = {};

  SPECIAL_TABS.forEach(({ key, cats }) => {
    const panel = document.createElement('div');
    panel.className = 'coll-panel';
    panel.hidden = true;
    container.appendChild(panel);

    const spFilterWrap = document.createElement('div');
    spFilterWrap.className = 'px-4 pb-3';
    spFilterWrap.innerHTML = `
      <div class="flex gap-2 items-center">
        <select class="sp-status filter-select flex-1" aria-label="Filter by status">
          <option value="">All Cards</option>
          <option value="owned">Owned</option>
          <option value="missing">Missing</option>
        </select>
        <button class="sp-clear btn-secondary text-sm px-3 py-2" hidden>Clear</button>
      </div>
    `;
    panel.appendChild(spFilterWrap);

    const section = document.createElement('div');
    section.className = 'bonus-cards-section';
    panel.appendChild(section);

    let spStatus = '';
    const statusSel = spFilterWrap.querySelector('.sp-status');
    const clearBtn  = spFilterWrap.querySelector('.sp-clear');

    statusSel.addEventListener('change', () => {
      spStatus = statusSel.value;
      clearBtn.hidden = !spStatus;
      renderBonusForPanel(section, cats, spStatus);
    });
    clearBtn.addEventListener('click', () => {
      statusSel.value = '';
      spStatus = '';
      clearBtn.hidden = true;
      renderBonusForPanel(section, cats, spStatus);
    });

    specialPanels[key] = { panel, section, cats, getStatus: () => spStatus };
  });

  // ── Tab switching ────────────────────────────────────────────────────────
  function showCollTab(tab) {
    activeTab = tab;
    collTabBar.querySelectorAll('.gen-tab').forEach(btn => {
      btn.className = `gen-tab${btn.dataset.tab === tab ? ' gen-tab--active' : ''}`;
    });
    allCardsPanel.hidden = tab !== 'all';
    corePanel.hidden     = tab !== 'core';
    dupesPanel.hidden    = tab !== 'dupes';
    SPECIAL_TABS.forEach(({ key }) => {
      specialPanels[key].panel.hidden = tab !== key;
    });
    if (tab === 'all')   renderAllCardsOverview();
    if (tab === 'dupes') renderDupesPanel();
    updateStatsForTab(tab);
  }

  collTabBar.querySelectorAll('.gen-tab').forEach(btn => {
    btn.addEventListener('click', () => showCollTab(btn.dataset.tab));
  });

  // ── Load collection & prices ─────────────────────────────────────────────
  await loadPrices();
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

    progressKey.hidden = false;
    progressKeyOwned.textContent   = `${owned} owned`;
    progressKeyPending.textContent = `${pending} pending`;

    const totalOwned = filtered.reduce((sum, c) => sum + (collection[String(c.id)] ?? 0), 0);
    const dupCount   = filtered.reduce((sum, c) => sum + Math.max(0, (collection[String(c.id)] ?? 0) - 1), 0);
    cstTotal.textContent   = totalOwned;
    cstUnique.textContent  = owned;
    cstPending.textContent = pending;
    cstNeed.textContent    = total - owned - pending;
    cstDupe.textContent    = dupCount;
    updateValueTile();
  }

  function updateValueTileForCards(cardSet) {
    const allOwned = cardSet.flatMap(c => Array(collection[String(c.id)] ?? 0).fill(c.id));
    const { priced, value, currency } = getPriceSummary(allOwned);
    if (priced === 0) {
      cstValue.textContent = '—';
    } else {
      const sym = currency === 'AUD' ? 'A$' : '$';
      cstValue.textContent = `${sym}${value.toFixed(0)}`;
    }
  }

  function updateValueTile() {
    updateValueTileForCards([...CARDS, ...BONUS_CARDS]);
  }

  function updateStatsForTab(tab) {
    if (tab === 'core') {
      updateProgress(getFilteredCards());
      return;
    }
    let cardSet;
    if (tab === 'all') {
      cardSet = [...CARDS, ...BONUS_CARDS];
    } else if (tab === 'dupes') {
      cardSet = [...CARDS, ...BONUS_CARDS].filter(c => (collection[String(c.id)] ?? 0) >= 2);
    } else {
      const def = SPECIAL_TABS.find(t => t.key === tab);
      cardSet = def ? BONUS_CARDS.filter(c => def.cats.includes(c.bonusCategory)) : [];
    }
    const total      = cardSet.length;
    const owned      = cardSet.filter(c => (collection[String(c.id)] ?? 0) >= 1).length;
    const pending    = tab === 'all'
      ? CARDS.filter(c => (collection[String(c.id)] ?? 0) === 0 && pendingReceiveIds.has(c.id)).length
      : 0;
    const combined   = owned + pending;
    const ownedPct   = total === 0 ? 0 : (owned   / total) * 100;
    const pendingPct = total === 0 ? 0 : (pending  / total) * 100;
    const combinedPct = Math.round(ownedPct + pendingPct);

    progressFill.style.width       = `${ownedPct}%`;
    progressPendingBar.style.width = `${pendingPct}%`;

    const hasPending = pending > 0;
    progressCount.innerHTML = `<span class="cp-owned-n">${combined}${hasPending ? '*' : ''}</span><span class="cp-total"> of ${total} cards</span>`;
    progressPct.textContent = `${combinedPct}%`;
    progressKey.hidden = false;
    progressKeyOwned.textContent   = `${owned} owned`;
    progressKeyPending.textContent = `${pending} pending`;

    const totalCopies = cardSet.reduce((s, c) => s + (collection[String(c.id)] ?? 0), 0);
    const dupes       = cardSet.reduce((s, c) => s + Math.max(0, (collection[String(c.id)] ?? 0) - 1), 0);
    cstTotal.textContent   = totalCopies;
    cstUnique.textContent  = owned;
    cstPending.textContent = pending;
    cstNeed.textContent    = total - owned - pending;
    cstDupe.textContent    = dupes;
    updateValueTileForCards(cardSet);
  }

  function renderAllCardsOverview() {
    allCardsPanel.innerHTML = '';
    const overviewDiv = document.createElement('div');
    overviewDiv.className = 'all-cards-overview';

    const catDefs = [
      { label: 'Core Collection', tabKey: 'core', cards: CARDS },
      ...SPECIAL_TABS.map(({ key, cats }) => ({
        label: key === 'upgrades' ? 'Upgrade Cards'
             : key === 'le'       ? 'Limited Edition'
             : key === 'wcm'      ? 'WC Masters'
             :                      'Special Cards',
        tabKey: key,
        cards: BONUS_CARDS.filter(c => cats.includes(c.bonusCategory)),
      }))
    ];

    catDefs.forEach(({ label, tabKey, cards }) => {
      const total = cards.length;
      const owned = cards.filter(c => (collection[String(c.id)] ?? 0) >= 1).length;
      const pct   = total === 0 ? 0 : Math.round((owned / total) * 100);

      const row = document.createElement('div');
      row.className = 'all-cards-row';
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');
      row.innerHTML = `
        <div class="all-cards-row__header">
          <span class="all-cards-row__label">${label}</span>
          <span class="all-cards-row__count">${owned} / ${total}</span>
        </div>
        <div class="all-cards-row__bar-wrap">
          <div class="all-cards-row__bar">
            <div class="all-cards-row__fill" style="width:${pct}%"></div>
          </div>
          <span class="all-cards-row__pct">${pct}%</span>
        </div>
      `;
      row.addEventListener('click', () => showCollTab(tabKey));
      row.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showCollTab(tabKey); }
      });
      overviewDiv.appendChild(row);
    });

    allCardsPanel.appendChild(overviewDiv);
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

  // ── Render bonus cards into a panel section ──────────────────────────────
  function renderBonusForPanel(section, cats, status) {
    section.innerHTML = '';
    let totalShown = 0;

    cats.forEach(cat => {
      const allInCat = BONUS_CARDS.filter(c => c.bonusCategory === cat);
      const filtered = allInCat.filter(c => {
        const count = collection[String(c.id)] ?? 0;
        if (status === 'owned'   && count < 1)  return false;
        if (status === 'missing' && count >= 1) return false;
        return true;
      });

      if (filtered.length === 0) return;
      totalShown += filtered.length;

      const ownedInCat = allInCat.filter(c => (collection[String(c.id)] ?? 0) >= 1).length;

      // Only show category label when the tab shows multiple categories
      if (cats.length > 1) {
        const catLabel = document.createElement('p');
        catLabel.className = 'bonus-cat-label';
        catLabel.textContent = `${cat} · ${ownedInCat} / ${allInCat.length}`;
        section.appendChild(catLabel);
      }

      const catGrid = document.createElement('div');
      catGrid.className = 'card-grid';
      catGrid.setAttribute('role', 'list');

      const frag = document.createDocumentFragment();
      filtered.forEach(card => {
        const count = collection[String(card.id)] ?? 0;
        const el = createCardElement(card, count);
        el.setAttribute('role', 'listitem');
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => openLightbox(card, count));
        frag.appendChild(el);
      });
      catGrid.appendChild(frag);
      section.appendChild(catGrid);
    });

    if (totalShown === 0) {
      const empty = document.createElement('p');
      empty.className = 'w-full text-center py-12 text-sm px-4';
      empty.style.color = '#555';
      empty.textContent = 'No cards match that filter.';
      section.appendChild(empty);
    }
  }

  function renderAllBonusPanels() {
    SPECIAL_TABS.forEach(({ key }) => {
      const { section, cats, getStatus } = specialPanels[key];
      renderBonusForPanel(section, cats, getStatus());
    });
  }

  function renderDupesPanel() {
    dupesPanel.innerHTML = '';
    const allCards = [...CARDS, ...BONUS_CARDS];
    const duped    = allCards.filter(c => (collection[String(c.id)] ?? 0) >= 2);

    if (duped.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'w-full text-center py-12 text-sm px-4';
      empty.style.color = '#555';
      empty.textContent = 'No duplicates yet.';
      dupesPanel.appendChild(empty);
      return;
    }

    const dupeGrid = document.createElement('div');
    dupeGrid.className = 'card-grid px-4 pt-2 pb-4';
    dupeGrid.setAttribute('role', 'list');

    const frag = document.createDocumentFragment();
    duped.forEach(card => {
      const count = collection[String(card.id)] ?? 0;
      const el = createCardElement(card, count);
      el.setAttribute('role', 'listitem');
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => openLightbox(card, count));
      frag.appendChild(el);
    });
    dupeGrid.appendChild(frag);
    dupesPanel.appendChild(dupeGrid);
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
  renderAllBonusPanels();
  renderAllCardsOverview();
  updateStatsForTab('all');

  // Expose refresh so app.js can call it when the view becomes active
  container._refresh = async () => {
    collection = await getCollection();
    pendingReceiveIds = getPendingReceiveIds();
    renderGrid();
    renderAllBonusPanels();
    if (activeTab === 'all')   renderAllCardsOverview();
    if (activeTab === 'dupes') renderDupesPanel();
    if (activeTab !== 'core')  updateStatsForTab(activeTab);
  };
}
