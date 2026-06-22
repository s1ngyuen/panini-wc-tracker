// js/views/swap-analyser.js

import { CARDS, CARDS_BY_ID } from '../cards-data.js';
import { getCollection, addCard, removeCard } from '../store.js';
import {
  getPendingTrades, addPendingTrade, updatePendingTrade,
  removePendingTrade, getLockedCardIds,
} from '../store-trades.js';
import { showToast } from '../components/toast.js';
import { updateSwapBadge } from '../components/nav.js';

// ── Rarity tiers ──────────────────────────────────────────────────────────────
const RARITY_TIER = {
  'Golden Baller': 3,
  'Icon': 2, 'Fan Favourite': 2, 'Master Rookie': 2, 'Top Keeper': 2,
  'Defensive Rock': 2, 'Midfield Maestro': 2, 'Goal Machine': 2,
  'Mascot': 2, 'Official Emblem': 2, 'Eternos-22': 2,
  'Hero': 1, 'Contender': 1, 'Team Crest': 1,
};
const TIER_LABEL = { 3: 'Ultra Rare', 2: 'Special', 1: 'Base' };
function tier(cardType) { return RARITY_TIER[cardType] ?? 1; }

// ── Parse card input text ─────────────────────────────────────────────────────
function parseInput(text) {
  const tokens = text
    .split(/[\n,;]+/)
    .map(t => t.trim().replace(/^[#\s]+/, '').trim())
    .filter(t => t.length > 0);

  const seen = new Set();
  const matched = [];
  const unmatched = [];

  tokens.forEach(token => {
    const num = Number(token);
    if (!isNaN(num) && Number.isInteger(num) && num >= 1 && num <= 630) {
      const card = CARDS_BY_ID[num];
      if (card && !seen.has(card.id)) { seen.add(card.id); matched.push(card); }
      else if (!card) unmatched.push(token);
      return;
    }
    const lower = token.toLowerCase();
    let found = CARDS.find(c => c.playerName.toLowerCase() === lower);
    if (!found) found = CARDS.find(c => c.playerName.toLowerCase().includes(lower));
    if (found && !seen.has(found.id)) { seen.add(found.id); matched.push(found); }
    else if (!found) unmatched.push(token);
  });

  return { matched, unmatched };
}

// ── Offer algorithm: nation-completion priority + rarity balance ───────────────
function buildSuggestedOffer(youGet, myDuplicates, lockedIds = new Set()) {
  const available = myDuplicates.filter(d => !lockedIds.has(d.id));

  // Prioritise giving cards from the same nations I'm receiving — helps both
  // parties complete their nation sets
  const receivingNations = new Set(youGet.map(c => c.country));
  const nationFirst = cards => [
    ...cards.filter(c => receivingNations.has(c.country)),
    ...cards.filter(c => !receivingNations.has(c.country)),
  ];

  const needByType = {};
  for (const card of youGet) {
    (needByType[card.cardType] = needByType[card.cardType] || []).push(card);
  }

  const dupsByType = {};
  const dupsByTier = { 1: [], 2: [], 3: [] };
  for (const card of available) {
    (dupsByType[card.cardType] = dupsByType[card.cardType] || []).push(card);
    dupsByTier[tier(card.cardType)].push(card);
  }
  for (const t in dupsByType) dupsByType[t] = nationFirst(dupsByType[t]);
  for (const t of [1, 2, 3]) dupsByTier[t] = nationFirst(dupsByTier[t]);

  const used = new Set();
  const groups = [];

  for (const [type, needed] of Object.entries(needByType)) {
    const count = needed.length;
    const t = tier(type);

    const sameType = (dupsByType[type] || []).filter(d => !used.has(d.id)).slice(0, count);
    sameType.forEach(d => used.add(d.id));

    let offer = [...sameType];
    if (offer.length < count) {
      const fill = dupsByTier[t].filter(d => !used.has(d.id)).slice(0, count - offer.length);
      fill.forEach(d => used.add(d.id));
      offer = [...offer, ...fill];
    }

    groups.push({ type, tier: t, need: count, offer, shortfall: count - offer.length });
  }

  return groups;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function cardLine(card) {
  const row = document.createElement('div');
  row.className = 'swap-result-row';

  const idEl = document.createElement('span');
  idEl.className = 'swap-result-row__id';
  idEl.textContent = `#${card.id}`;

  const nameEl = document.createElement('span');
  nameEl.className = 'swap-result-row__name';
  nameEl.textContent = card.playerName;

  const metaEl = document.createElement('span');
  metaEl.className = 'swap-result-row__meta';
  metaEl.textContent = `${card.country} — ${card.cardType}`;

  row.appendChild(idEl);
  row.appendChild(nameEl);
  row.appendChild(metaEl);
  return row;
}

function relativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ── Pending trade card ────────────────────────────────────────────────────────
function renderTradeCard(trade, { onComplete, onRefresh }) {
  const wrap = document.createElement('div');
  wrap.className = 'pending-trade-card';

  function renderView() {
    wrap.innerHTML = '';

    const iGiveCards = (trade.iGive ?? []).map(id => CARDS_BY_ID[id]).filter(Boolean);
    const iGetCards  = (trade.iGet  ?? []).map(id => CARDS_BY_ID[id]).filter(Boolean);

    const header = document.createElement('div');
    header.className = 'pending-trade-card__header';
    header.innerHTML = `
      <span class="pending-trade-card__partner">${trade.partner || 'Unknown'}</span>
      <span class="pending-trade-card__age">${relativeTime(trade.createdAt)}</span>
    `;
    wrap.appendChild(header);

    const cols = document.createElement('div');
    cols.className = 'pending-trade-card__cols';

    [
      { label: `I give (${iGiveCards.length})`, cards: iGiveCards, mod: '' },
      { label: `I get (${iGetCards.length})`,   cards: iGetCards,  mod: '--get' },
    ].forEach(({ label, cards, mod }) => {
      const col = document.createElement('div');
      const head = document.createElement('div');
      head.className = `pending-trade-card__col-head${mod ? ' pending-trade-card__col-head' + mod : ''}`;
      head.textContent = label;
      col.appendChild(head);
      if (cards.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'pending-trade-card__card-line';
        empty.style.color = '#aaa';
        empty.textContent = 'None';
        col.appendChild(empty);
      } else {
        cards.forEach(c => {
          const el = document.createElement('div');
          el.className = 'pending-trade-card__card-line';
          el.textContent = `#${c.id} ${c.playerName}`;
          col.appendChild(el);
        });
      }
      cols.appendChild(col);
    });
    wrap.appendChild(cols);

    const actions = document.createElement('div');
    actions.className = 'pending-trade-card__actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn-secondary';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', renderEdit);

    const completeBtn = document.createElement('button');
    completeBtn.type = 'button';
    completeBtn.className = 'btn-primary';
    completeBtn.textContent = '✓ Trade Done';
    completeBtn.addEventListener('click', () => {
      if (!confirm(`Mark trade with ${trade.partner || 'partner'} as complete? Your collection will be updated.`)) return;
      onComplete(trade);
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn-danger';
    cancelBtn.textContent = '✗ Cancel';
    cancelBtn.addEventListener('click', () => {
      if (!confirm('Remove this pending trade?')) return;
      removePendingTrade(trade.id);
      onRefresh();
    });

    actions.appendChild(editBtn);
    actions.appendChild(completeBtn);
    actions.appendChild(cancelBtn);
    wrap.appendChild(actions);
  }

  function renderEdit() {
    wrap.innerHTML = '';
    wrap.innerHTML = `
      <div class="pending-trade-card__edit">
        <label class="pending-trade-card__edit-label">Partner name</label>
        <input id="et-partner" type="text" class="form-input" style="font-size:13px; margin-bottom:10px;" value="${trade.partner || ''}" placeholder="e.g. John" />
        <label class="pending-trade-card__edit-label">I give (card IDs, comma-separated)</label>
        <input id="et-give" type="text" class="form-input" style="font-size:13px; margin-bottom:10px;" value="${(trade.iGive ?? []).join(', ')}" placeholder="42, 87, 123" />
        <label class="pending-trade-card__edit-label">I get (card IDs, comma-separated)</label>
        <input id="et-get" type="text" class="form-input" style="font-size:13px; margin-bottom:12px;" value="${(trade.iGet ?? []).join(', ')}" placeholder="55, 66, 77" />
        <div style="display:flex; gap:8px;">
          <button id="et-save" type="button" class="btn-primary" style="flex:1;">Save</button>
          <button id="et-cancel" type="button" class="btn-secondary" style="flex:1;">Cancel</button>
        </div>
      </div>
    `;

    wrap.querySelector('#et-save').addEventListener('click', () => {
      trade.partner = wrap.querySelector('#et-partner').value.trim();
      trade.iGive = wrap.querySelector('#et-give').value.split(/[\s,;]+/).map(Number).filter(n => n >= 1 && n <= 630);
      trade.iGet  = wrap.querySelector('#et-get').value.split(/[\s,;]+/).map(Number).filter(n => n >= 1 && n <= 630);
      updatePendingTrade(trade.id, { partner: trade.partner, iGive: trade.iGive, iGet: trade.iGet });
      showToast('Trade updated.', 'success');
      renderView();
    });

    wrap.querySelector('#et-cancel').addEventListener('click', renderView);
  }

  renderView();
  return wrap;
}

// ── Custom trade form ─────────────────────────────────────────────────────────
function renderCustomTradeForm(container, { onSave, onCancel }) {
  container.innerHTML = '';
  const form = document.createElement('div');
  form.className = 'pending-trade-card';
  form.style.marginBottom = '12px';
  form.innerHTML = `
    <p class="pending-trade-card__form-title">New Custom Trade</p>
    <label class="pending-trade-card__edit-label">Partner name</label>
    <input id="ct-partner" type="text" class="form-input" style="font-size:13px; margin-bottom:10px;" placeholder="e.g. John" />
    <label class="pending-trade-card__edit-label">Cards I give (IDs or names)</label>
    <textarea id="ct-give" class="form-textarea" style="font-size:12px; min-height:56px; margin-bottom:10px;" placeholder="42, Messi, 87"></textarea>
    <label class="pending-trade-card__edit-label">Cards I get (IDs or names)</label>
    <textarea id="ct-get" class="form-textarea" style="font-size:12px; min-height:56px; margin-bottom:12px;" placeholder="55, Ronaldo, 66"></textarea>
    <div style="display:flex; gap:8px;">
      <button id="ct-save" type="button" class="btn-primary" style="flex:1;">Save Trade</button>
      <button id="ct-cancel" type="button" class="btn-secondary" style="flex:1;">Cancel</button>
    </div>
  `;

  form.querySelector('#ct-save').addEventListener('click', () => {
    const partner = form.querySelector('#ct-partner').value.trim();
    const { matched: iGiveCards } = parseInput(form.querySelector('#ct-give').value);
    const { matched: iGetCards  } = parseInput(form.querySelector('#ct-get').value);
    if (iGiveCards.length === 0 && iGetCards.length === 0) {
      showToast('Enter at least one card in give or get.', 'error');
      return;
    }
    addPendingTrade({
      id: `trade_${Date.now()}`,
      partner: partner || 'Unknown',
      createdAt: new Date().toISOString(),
      iGive: iGiveCards.map(c => c.id),
      iGet: iGetCards.map(c => c.id),
    });
    updateSwapBadge();
    showToast('Custom trade saved.', 'success');
    onSave();
  });

  form.querySelector('#ct-cancel').addEventListener('click', onCancel);
  container.appendChild(form);
}

// ── Pending trades section ────────────────────────────────────────────────────
function renderPendingSection(container, { onComplete, onRefresh }) {
  container.innerHTML = '';

  const trades = getPendingTrades();

  const head = document.createElement('div');
  head.className = 'px-4 pb-3';
  head.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between;">
      <span style="font-family:var(--font-display); font-size:20px; text-transform:uppercase; letter-spacing:.04em; color:var(--text-primary);">
        Pending Trades${trades.length > 0 ? ` <span style="color:var(--accent);">(${trades.length})</span>` : ''}
      </span>
      <button id="add-custom-btn" type="button" class="btn-secondary" style="font-size:11px; padding:5px 12px;">+ Custom</button>
    </div>
  `;
  container.appendChild(head);

  const customFormWrap = document.createElement('div');
  customFormWrap.className = 'px-4';
  container.appendChild(customFormWrap);

  head.querySelector('#add-custom-btn').addEventListener('click', () => {
    renderCustomTradeForm(customFormWrap, {
      onSave:   () => { customFormWrap.innerHTML = ''; onRefresh(); },
      onCancel: () => { customFormWrap.innerHTML = ''; },
    });
    customFormWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  if (trades.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'px-4 pb-4 text-sm';
    empty.style.color = 'var(--text-muted)';
    empty.textContent = 'No pending trades. Analyse a swap below and save it, or add a custom trade above.';
    container.appendChild(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'px-4 pb-2 flex flex-col gap-3';
  container.appendChild(list);

  trades.forEach(trade => list.appendChild(renderTradeCard(trade, { onComplete, onRefresh })));
}

// ── Main view ─────────────────────────────────────────────────────────────────
export async function mountSwapAnalyser(container) {
  container.innerHTML = '';

  // Header
  const header = document.createElement('div');
  header.className = 'px-4 pt-6 pb-3';
  header.innerHTML = `
    <div class="section-heading-wrap">
      <div class="section-heading-bar"></div>
      <span class="fx" style="font-size:32px; text-transform:uppercase; letter-spacing:.04em; color:var(--text-primary); line-height:1;">Swaps</span>
    </div>
  `;
  container.appendChild(header);

  // Pending section
  const pendingSection = document.createElement('div');
  container.appendChild(pendingSection);

  // Divider
  const divider = document.createElement('div');
  divider.style.cssText = 'border-top:2px solid var(--surface-high); margin:4px 16px 20px;';
  container.appendChild(divider);

  // Analyse heading
  const analyseHead = document.createElement('div');
  analyseHead.className = 'px-4 pb-3';
  analyseHead.innerHTML = `
    <span style="font-family:var(--font-display); font-size:20px; text-transform:uppercase; letter-spacing:.04em; color:var(--text-primary);">Analyse New Trade</span>
    <p class="form-hint" style="margin-top:4px;">Cards currently in pending trades are excluded from suggestions.</p>
  `;
  container.appendChild(analyseHead);

  // Inputs
  const inputsSection = document.createElement('div');
  inputsSection.className = 'px-4 pb-4 flex flex-col gap-4';

  function makeField(id, labelText, type = 'textarea', placeholder = '') {
    const wrap = document.createElement('div');
    const label = document.createElement('label');
    label.setAttribute('for', id);
    label.className = 'form-label';
    label.textContent = labelText;
    wrap.appendChild(label);
    let input;
    if (type === 'input') {
      input = document.createElement('input');
      input.type = 'text';
      input.className = 'form-input';
    } else {
      input = document.createElement('textarea');
      input.className = 'form-textarea';
    }
    input.id = id;
    input.placeholder = placeholder;
    wrap.appendChild(input);
    return { wrap, input };
  }

  const { wrap: partnerWrap, input: partnerInput } = makeField('swap-partner', 'Partner name (optional)', 'input', 'e.g. John');
  const { wrap: havesWrap, input: havesTextarea }  = makeField('swap-haves', 'Cards they HAVE (they offer you)', 'textarea', 'Card IDs or names — one per line or comma-separated');
  const { wrap: wantsWrap, input: wantsTextarea }  = makeField('swap-wants', 'Cards they WANT (from you)', 'textarea', 'Card IDs or names — one per line or comma-separated');

  const analyseBtn = document.createElement('button');
  analyseBtn.type = 'button';
  analyseBtn.className = 'btn-primary w-full';
  analyseBtn.textContent = 'Analyse Swap';

  inputsSection.appendChild(partnerWrap);
  inputsSection.appendChild(havesWrap);
  inputsSection.appendChild(wantsWrap);
  inputsSection.appendChild(analyseBtn);
  container.appendChild(inputsSection);

  // Results
  const resultsSection = document.createElement('div');
  resultsSection.className = 'px-4 pb-8';
  resultsSection.hidden = true;
  container.appendChild(resultsSection);

  // ── Refresh pending section ──────────────────────────────────────────────
  async function refreshAll() {
    renderPendingSection(pendingSection, {
      onComplete: async trade => {
        for (const id of (trade.iGive ?? [])) await removeCard(id);
        for (const id of (trade.iGet  ?? [])) await addCard(id);
        removePendingTrade(trade.id);
        updateSwapBadge();
        showToast(`Trade with ${trade.partner || 'partner'} complete — collection updated.`, 'success');
        await refreshAll();
      },
      onRefresh: refreshAll,
    });
    updateSwapBadge();
  }

  await refreshAll();

  // ── Analyse ──────────────────────────────────────────────────────────────
  analyseBtn.addEventListener('click', async () => {
    const havesText = havesTextarea.value;
    const wantsText = wantsTextarea.value;
    if (!havesText.trim() && !wantsText.trim()) {
      showToast("Paste your partner's cards first.", 'error');
      return;
    }

    const collection = await getCollection();
    const lockedIds  = getLockedCardIds();

    const userMissing   = new Set(CARDS.filter(c => (collection[String(c.id)] ?? 0) === 0).map(c => c.id));
    const myDuplicates  = CARDS.filter(c => (collection[String(c.id)] ?? 0) > 1);
    const { matched: partnerHas,   unmatched: unmatchedHas  } = parseInput(havesText);
    const { matched: partnerWants, unmatched: unmatchedWants } = parseInput(wantsText);

    const youGet       = partnerHas.filter(c => userMissing.has(c.id));
    const tradeGroups  = buildSuggestedOffer(youGet, myDuplicates, lockedIds);
    const myDupSet     = new Set(myDuplicates.map(c => c.id));
    const partnerMatch = partnerWants.filter(c => myDupSet.has(c.id) && !lockedIds.has(c.id));
    const unmatched    = [...new Set([...unmatchedHas, ...unmatchedWants])];

    renderResults({ youGet, tradeGroups, partnerMatch, unmatched }, partnerInput.value.trim());
    resultsSection.hidden = false;
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // ── Render results ───────────────────────────────────────────────────────
  function renderResults({ youGet, tradeGroups, partnerMatch, unmatched }, partnerName) {
    resultsSection.innerHTML = '';

    const totalOffer     = tradeGroups.reduce((s, g) => s + g.offer.length, 0);
    const totalShortfall = tradeGroups.reduce((s, g) => s + g.shortfall, 0);

    if (youGet.length === 0) {
      resultsSection.innerHTML = `<div style="background:#f9f9f9; padding:16px; text-align:center;"><p style="color:#555; font-size:13px;">None of their cards are on your missing list.<br>Try updating their card list.</p></div>`;
      return;
    }

    for (const group of tradeGroups) {
      const block = document.createElement('div');
      block.style.marginBottom = '20px';

      const label = group.offer.length === group.need
        ? `${group.need} ${group.type}${group.need > 1 ? 's' : ''} for ${group.offer.length} ${
            group.offer[0]?.cardType === group.type ? group.type : TIER_LABEL[group.tier]
          }${group.offer.length > 1 ? 's' : ''}`
        : `${group.need} ${group.type}${group.need > 1 ? 's' : ''} — only ${group.offer.length} available`;

      const groupHead = document.createElement('div');
      groupHead.style.cssText = 'display:flex; align-items:center; gap:8px; margin-bottom:8px;';
      groupHead.innerHTML = `
        <span style="font-family:var(--font-display); font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--gold);">${label}</span>
        ${group.shortfall > 0 ? `<span style="font-size:11px; color:#c55; background:#fee; padding:2px 7px;">${group.shortfall} short</span>` : ''}
      `;
      block.appendChild(groupHead);

      const cols = document.createElement('div');
      cols.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:10px;';

      const wantCol  = document.createElement('div');
      const offerCol = document.createElement('div');

      const wantHead = document.createElement('p');
      wantHead.style.cssText = 'font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:var(--green); margin-bottom:4px; font-family:var(--font-display);';
      wantHead.textContent = 'I want';
      wantCol.appendChild(wantHead);
      CARDS.filter(c => c.cardType === group.type && youGet.some(g => g.id === c.id))
        .forEach(c => wantCol.appendChild(cardLine(c)));

      const offerHead = document.createElement('p');
      offerHead.style.cssText = 'font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:rgba(197,160,40,0.8); margin-bottom:4px; font-family:var(--font-display);';
      offerHead.textContent = 'I offer';
      offerCol.appendChild(offerHead);
      if (group.offer.length > 0) {
        group.offer.forEach(c => offerCol.appendChild(cardLine(c)));
      } else {
        const none = document.createElement('p');
        none.style.cssText = 'font-size:11px; color:#aaa; padding:4px 0;';
        none.textContent = 'No dupes available';
        offerCol.appendChild(none);
      }

      cols.appendChild(wantCol);
      cols.appendChild(offerCol);
      block.appendChild(cols);
      block.insertAdjacentHTML('beforeend', '<div style="height:1px; background:#eee; margin-top:16px;"></div>');
      resultsSection.appendChild(block);
    }

    // Summary banner
    const summary = document.createElement('div');
    summary.style.cssText = 'background:#f9f9f9; padding:12px 14px; margin-bottom:16px; font-size:12px;';
    summary.innerHTML = totalShortfall === 0
      ? `<span style="color:var(--green); font-weight:700;">Balanced trade:</span> You get <strong>${youGet.length}</strong> cards and offer <strong>${totalOffer}</strong> of equal rarity.`
      : `<span style="color:#c55; font-weight:700;">Uneven:</span> You need <strong>${youGet.length}</strong> but only have <strong>${totalOffer}</strong> matching dupes. You're <strong>${totalShortfall}</strong> short.`;
    resultsSection.appendChild(summary);

    // Partner explicit wants
    if (partnerMatch.length > 0) {
      const pw = document.createElement('div');
      pw.style.marginBottom = '16px';
      pw.innerHTML = `<p style="font-family:var(--font-display); font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#888; margin-bottom:6px;">Also matches what they want</p>`;
      partnerMatch.forEach(c => pw.appendChild(cardLine(c)));
      resultsSection.appendChild(pw);
    }

    // Unmatched
    if (unmatched.length > 0) {
      const um = document.createElement('div');
      um.style.cssText = 'background:#fff5f5; padding:12px 14px; margin-bottom:12px;';
      um.innerHTML = `<p style="font-size:11px; color:#c55; margin-bottom:4px; font-weight:700;">Couldn't match:</p>`;
      unmatched.forEach(token => {
        const p = document.createElement('p');
        p.style.cssText = 'font-size:11px; color:#c55;';
        p.textContent = `"${token}" — not found`;
        um.appendChild(p);
      });
      resultsSection.appendChild(um);
    }

    // Action buttons
    const actionRow = document.createElement('div');
    actionRow.style.cssText = 'display:flex; gap:8px; margin-top:8px;';

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'btn-secondary';
    copyBtn.style.flex = '1';
    copyBtn.textContent = 'Copy Message';
    copyBtn.addEventListener('click', async () => {
      const getNames   = youGet.map(c => `#${c.id} ${c.playerName}`).join(', ');
      const offerCards = tradeGroups.flatMap(g => g.offer);
      const giveNames  = offerCards.length > 0 ? offerCards.map(c => `#${c.id} ${c.playerName}`).join(', ') : '(none available)';
      try {
        await navigator.clipboard.writeText(`Hi mate, I am looking for ${getNames} for ${giveNames}`);
        showToast('Copied! Send it to your partner.', 'success');
      } catch {
        showToast("Couldn't copy — select and copy manually.", 'error');
      }
    });

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn-primary';
    saveBtn.style.flex = '1';
    saveBtn.textContent = 'Save as Pending';
    saveBtn.addEventListener('click', async () => {
      const offerCards = tradeGroups.flatMap(g => g.offer);
      addPendingTrade({
        id: `trade_${Date.now()}`,
        partner: partnerName || 'Unknown',
        createdAt: new Date().toISOString(),
        iGive: offerCards.map(c => c.id),
        iGet: youGet.map(c => c.id),
      });
      updateSwapBadge();
      showToast(`Trade with ${partnerName || 'partner'} saved as pending.`, 'success');
      havesTextarea.value = '';
      wantsTextarea.value = '';
      partnerInput.value  = '';
      resultsSection.hidden = true;
      await refreshAll();
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    actionRow.appendChild(copyBtn);
    actionRow.appendChild(saveBtn);
    resultsSection.appendChild(actionRow);
  }

  container._refresh = refreshAll;
}
