// js/views/swap-analyser.js

import { CARDS, CARDS_BY_ID } from '../cards-data.js';
import { getCollection, addCard, removeCard } from '../store.js';
import {
  getPendingTrades, addPendingTrade, updatePendingTrade,
  removePendingTrade, getLockedCardIds, getPendingReceiveIds,
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

// ── FIFA world ranking (lower = better, used to sort "cards I want") ──────────
const NATION_RANK = {
  'Argentina':      1,
  'France':         2,
  'England':        3,
  'Brazil':         4,
  'Spain':          5,
  'Portugal':       6,
  'Netherlands':    7,
  'Belgium':        8,
  'Germany':        9,
  'Croatia':        10,
  'Uruguay':        11,
  'Colombia':       12,
  'Switzerland':    13,
  'Morocco':        14,
  'Japan':          15,
  'Mexico':         16,
  'United States':  17,
  'Senegal':        18,
  'Korea Republic': 19,
  'Austria':        20,
  'Denmark':        21,
  'Ecuador':        22,
  'Italy':          23,
  'Iran':           24,
  'Australia':      25,
  'Canada':         26,
  'Norway':         27,
  'Poland':         28,
  'Turkey':         29,
  'Qatar':          30,
  'Saudi Arabia':   31,
  'Ghana':          32,
  'Tunisia':        33,
  'Algeria':        34,
  'Egypt':          35,
  'Ivory Coast':    36,
  'South Africa':   37,
  'New Zealand':    38,
  'Sweden':         39,
  'Haiti':          40,
  'Cape Verde':     41,
  'Panama':         42,
  'Paraguay':       43,
  'Scotland':       44,
  'Jordan':         45,
  'Jamaica':        46,
  'Curaçao':        47,
  'Uzbekistan':     48,
};
function nationRank(country) { return NATION_RANK[country] ?? 99; }

// ── Parse card input text ─────────────────────────────────────────────────────
function cleanseText(raw) {
  return raw
    // Strip emoji and unicode symbols broadly
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FEFF}\u{200D}]/gu, '')
    // Strip common Facebook trade labels at line/token start
    .replace(/\b(i\s+have|i\s+offer|i\s+am\s+looking\s+for|i\s+need|looking\s+for|lf|iso|ft|for\s+trade|offering|offers?|haves?|wants?|needs?|dupes?|duplicates?|extras?|spares?)\s*[:\-]?\s*/gi, '')
    // Strip quantity markers like x2, (x2), ×2
    .replace(/[(\[]?\s*[x×]\s*\d+\s*[)\]]?/gi, '')
    // Strip content in parens if it looks like extra info (not a short name)
    .replace(/\([^)]{0,30}\)/g, '')
    // Strip standalone asterisks, dashes used as bullets
    .replace(/^\s*[-•*]\s*/gm, '')
    // Collapse whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseInput(text) {
  const tokens = cleanseText(text)
    .split(/[\n,;]+/)
    .map(t => t.trim().replace(/^[#\s]+/, '').trim())
    .filter(t => t.length > 0);

  const seen = new Set();
  const matched = [];
  const unmatched = [];

  tokens.forEach(token => {
    // Try pure number first
    const num = Number(token);
    if (!isNaN(num) && Number.isInteger(num) && num >= 1 && num <= 630) {
      const card = CARDS_BY_ID[num];
      if (card && !seen.has(card.id)) { seen.add(card.id); matched.push(card); }
      else if (!card) unmatched.push(token);
      return;
    }
    // Try extracting a leading number from token like "45 Messi"
    const leadNum = token.match(/^(\d+)/);
    if (leadNum) {
      const n = Number(leadNum[1]);
      if (n >= 1 && n <= 630 && CARDS_BY_ID[n]) {
        const card = CARDS_BY_ID[n];
        if (!seen.has(card.id)) { seen.add(card.id); matched.push(card); }
        return;
      }
    }
    // Name match
    const lower = token.toLowerCase();
    let found = CARDS.find(c => c.playerName.toLowerCase() === lower);
    if (!found) found = CARDS.find(c => c.playerName.toLowerCase().includes(lower) && lower.length >= 3);
    if (found && !seen.has(found.id)) { seen.add(found.id); matched.push(found); }
    else if (!found && token.length >= 2) unmatched.push(token);
  });

  return { matched, unmatched };
}

// ── Offer algorithm ───────────────────────────────────────────────────────────
// Rule: ONLY offer cards the partner has explicitly listed in their wants.
// Within that pool, match rarity tier to what I'm receiving.
// If they haven't entered wants, the offer is empty (can't guess what they need).
function buildSuggestedOffer(youGet, myDuplicates, partnerWants, lockedIds = new Set()) {
  if (partnerWants.length === 0) return [];

  const partnerWantIds = new Set(partnerWants.map(c => c.id));

  // Offer pool: only things they want, I have as a spare, and aren't locked
  const available = myDuplicates.filter(d =>
    partnerWantIds.has(d.id) && !lockedIds.has(d.id)
  );

  // Group what I need by rarity tier (not type) for a simpler balanced match
  const needByTier = { 1: [], 2: [], 3: [] };
  for (const card of youGet) {
    needByTier[tier(card.cardType)].push(card);
  }

  const availByTier = { 1: [], 2: [], 3: [] };
  for (const card of available) {
    availByTier[tier(card.cardType)].push(card);
  }

  const used = new Set();
  const groups = [];

  for (const t of [3, 2, 1]) {
    const needed = needByTier[t];
    if (needed.length === 0) continue;

    const offer = availByTier[t].filter(d => !used.has(d.id)).slice(0, needed.length);
    offer.forEach(d => used.add(d.id));

    groups.push({
      tierLabel: TIER_LABEL[t],
      tier: t,
      need: needed.length,
      needCards: needed,
      offer,
      shortfall: needed.length - offer.length,
    });
  }

  return groups;
}

// Equal-match mode: ignore rarity, just match card-for-card count
function buildEqualOffer(youGet, myDuplicates, partnerWants, lockedIds = new Set()) {
  if (partnerWants.length === 0) return [];
  const partnerWantIds = new Set(partnerWants.map(c => c.id));
  const available = myDuplicates.filter(d => partnerWantIds.has(d.id) && !lockedIds.has(d.id));
  const offer = available.slice(0, youGet.length);
  return [{
    tierLabel: 'Best match',
    tier: 0,
    need: youGet.length,
    needCards: youGet,
    offer,
    shortfall: youGet.length - offer.length,
    equalMode: true,
  }];
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

    const iGiveCards = (trade.iGive ?? []).map(id => CARDS_BY_ID[id]).filter(Boolean).sort((a, b) => a.id - b.id);
    const iGetCards  = (trade.iGet  ?? []).map(id => CARDS_BY_ID[id]).filter(Boolean).sort((a, b) => a.id - b.id);

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
        // Thumbnail strip
        const thumbRow = document.createElement('div');
        thumbRow.className = 'pending-trade-card__thumbs';
        cards.forEach(c => {
          const wrap = document.createElement('div');
          wrap.className = 'pending-trade-card__thumb-wrap';

          const img = document.createElement('img');
          img.src = `assets/cards/${c.id}.jpg`;
          img.alt = c.playerName;
          img.className = 'pending-trade-card__thumb';

          wrap.appendChild(img);
          thumbRow.appendChild(wrap);

          const tip = document.getElementById('card-zoom-tip');
          const tipImg = tip?.querySelector('img');

          wrap.addEventListener('mouseenter', () => {
            if (!tip || !tipImg) return;
            tipImg.src = `assets/cards/${c.id}.jpg`;
            tip.style.display = 'block';
          });
          wrap.addEventListener('mousemove', e => {
            if (!tip) return;
            tip.style.left = `${e.clientX + 14}px`;
            tip.style.top  = `${e.clientY + 14}px`;
          });
          wrap.addEventListener('mouseleave', () => {
            if (tip) tip.style.display = 'none';
          });
        });
        col.appendChild(thumbRow);
        // Names list below
        const names = document.createElement('div');
        names.className = 'pending-trade-card__card-line';
        names.textContent = cards.map(c => c.playerName).join(', ');
        col.appendChild(names);
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

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'btn-secondary';
    copyBtn.textContent = 'Copy Message';
    copyBtn.addEventListener('click', async () => {
      const iGiveCards = (trade.iGive ?? []).map(id => CARDS_BY_ID[id]).filter(Boolean).sort((a, b) => a.id - b.id);
      const iGetCards  = (trade.iGet  ?? []).map(id => CARDS_BY_ID[id]).filter(Boolean).sort((a, b) => a.id - b.id);
      const getLines  = iGetCards.map(c  => `#${c.id} ${c.playerName}`).join('\n');
      const giveLines = iGiveCards.map(c => `#${c.id} ${c.playerName}`).join('\n');
      const text = `Hi mate, I am looking for:\n${getLines}\n\nFor:\n${giveLines}`;
      try {
        await navigator.clipboard.writeText(text);
        showToast('Copied!', 'success');
      } catch {
        showToast("Couldn't copy — try manually.", 'error');
      }
    });

    actions.appendChild(copyBtn);
    actions.appendChild(editBtn);
    actions.appendChild(completeBtn);
    actions.appendChild(cancelBtn);
    wrap.appendChild(actions);
  }

  function renderEdit() {
    const draftGive = [...(trade.iGive ?? [])];
    const draftGet  = [...(trade.iGet  ?? [])];

    function buildEdit() {
      wrap.innerHTML = '';
      const edit = document.createElement('div');
      edit.className = 'pending-trade-card__edit';

      // Partner name
      const partnerLabel = document.createElement('label');
      partnerLabel.className = 'pending-trade-card__edit-label';
      partnerLabel.textContent = 'Partner name';
      const partnerInput = document.createElement('input');
      partnerInput.type = 'text';
      partnerInput.className = 'form-input';
      partnerInput.style.cssText = 'font-size:13px; margin-bottom:14px;';
      partnerInput.value = trade.partner || '';
      partnerInput.placeholder = 'e.g. John';
      edit.appendChild(partnerLabel);
      edit.appendChild(partnerInput);

      function buildCardSection(label, draft, accentClass) {
        const section = document.createElement('div');
        section.style.marginBottom = '14px';

        const lbl = document.createElement('label');
        lbl.className = 'pending-trade-card__edit-label';
        lbl.textContent = label;
        section.appendChild(lbl);

        const thumbsRow = document.createElement('div');
        thumbsRow.className = 'et-thumbs';

        function refreshThumbs() {
          thumbsRow.innerHTML = '';
          draft.forEach((id, idx) => {
            const card = CARDS_BY_ID[id];
            const wrap2 = document.createElement('div');
            wrap2.className = 'et-thumb-wrap';

            const img = document.createElement('img');
            img.src = `assets/cards/${id}.jpg`;
            img.className = 'pending-trade-card__thumb';
            img.alt = card ? card.playerName : `#${id}`;
            img.onerror = () => { img.style.display = 'none'; };
            wrap2.appendChild(img);

            const xBtn = document.createElement('button');
            xBtn.type = 'button';
            xBtn.className = 'et-thumb-remove';
            xBtn.textContent = '×';
            xBtn.setAttribute('aria-label', `Remove card ${id}`);
            xBtn.addEventListener('click', () => {
              draft.splice(idx, 1);
              refreshThumbs();
            });
            wrap2.appendChild(xBtn);
            thumbsRow.appendChild(wrap2);
          });
        }
        refreshThumbs();
        section.appendChild(thumbsRow);

        // Add card input
        const addRow = document.createElement('div');
        addRow.style.cssText = 'display:flex; gap:6px; margin-top:6px;';
        const addInput = document.createElement('input');
        addInput.type = 'text';
        addInput.className = 'form-input';
        addInput.style.cssText = 'font-size:12px; flex:1;';
        addInput.placeholder = 'Add card ID…';
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = `btn-secondary ${accentClass}`;
        addBtn.style.cssText = 'font-size:11px; padding:6px 10px; flex-shrink:0;';
        addBtn.textContent = 'Add';
        const doAdd = () => {
          const val = addInput.value.trim();
          const n = Number(val);
          if (!n || n < 1 || n > 630 || !CARDS_BY_ID[n]) {
            showToast('Enter a valid card ID (1–630).', 'error');
            return;
          }
          if (!draft.includes(n)) {
            draft.push(n);
            refreshThumbs();
          }
          addInput.value = '';
          addInput.focus();
        };
        addBtn.addEventListener('click', doAdd);
        addInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doAdd(); } });
        addRow.appendChild(addInput);
        addRow.appendChild(addBtn);
        section.appendChild(addRow);

        return section;
      }

      edit.appendChild(buildCardSection('I give', draftGive, 'et-add-give'));
      edit.appendChild(buildCardSection('I get',  draftGet,  'et-add-get'));

      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex; gap:8px;';

      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'btn-primary';
      saveBtn.style.flex = '1';
      saveBtn.textContent = 'Save';
      saveBtn.addEventListener('click', () => {
        trade.partner = partnerInput.value.trim();
        trade.iGive = [...draftGive];
        trade.iGet  = [...draftGet];
        updatePendingTrade(trade.id, { partner: trade.partner, iGive: trade.iGive, iGet: trade.iGet });
        showToast('Trade updated.', 'success');
        renderView();
      });

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'btn-secondary';
      cancelBtn.style.flex = '1';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.addEventListener('click', renderView);

      actions.appendChild(saveBtn);
      actions.appendChild(cancelBtn);
      edit.appendChild(actions);
      wrap.appendChild(edit);
    }

    buildEdit();
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
  header.className = 'px-4 py-8';
  header.innerHTML = `
    <div class="section-heading-wrap">
      <div class="section-heading-bar"></div>
      <div class="page-title-wrap"><span class="page-title-bg">Swaps</span><span class="fx page-title-fg">Swaps</span></div>
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
    <span style="font-family:var(--font-display); font-size:20px; text-transform:uppercase; letter-spacing:.04em; color:var(--text-primary);">Generate New Trade</span>
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

  // Auto-cleanse on paste for both textareas
  [havesTextarea, wantsTextarea].forEach(ta => {
    ta.addEventListener('paste', e => {
      e.preventDefault();
      const raw = e.clipboardData.getData('text');
      const cleaned = cleanseText(raw);
      const start = ta.selectionStart;
      const before = ta.value.slice(0, start);
      const after  = ta.value.slice(ta.selectionEnd);
      ta.value = before + cleaned + after;
      ta.selectionStart = ta.selectionEnd = start + cleaned.length;
    });
  });

  // Equal-match toggle
  const toggleWrap = document.createElement('div');
  toggleWrap.style.cssText = 'display:flex; align-items:center; gap:10px; padding:10px 0 2px;';
  toggleWrap.innerHTML = `
    <label class="eq-toggle" style="display:flex; align-items:center; gap:8px; cursor:pointer; user-select:none;">
      <span class="eq-toggle__track">
        <input type="checkbox" id="eq-mode-toggle" style="position:absolute;opacity:0;width:0;height:0;">
        <span class="eq-toggle__thumb"></span>
      </span>
      <span style="font-size:12px; color:var(--text-muted); font-family:var(--font-display); text-transform:uppercase; letter-spacing:.04em;">Optimise matches</span>
    </label>
  `;
  const eqCheckbox = toggleWrap.querySelector('#eq-mode-toggle');

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex; gap:8px;';

  const analyseBtn = document.createElement('button');
  analyseBtn.type = 'button';
  analyseBtn.className = 'btn-primary';
  analyseBtn.style.flex = '1';
  analyseBtn.textContent = 'Analyse Swap';

  const maxBtn = document.createElement('button');
  maxBtn.type = 'button';
  maxBtn.className = 'btn-secondary';
  maxBtn.style.flex = '1';
  maxBtn.textContent = 'Maximise Trade';

  btnRow.appendChild(analyseBtn);
  btnRow.appendChild(maxBtn);

  inputsSection.appendChild(partnerWrap);
  inputsSection.appendChild(havesWrap);
  inputsSection.appendChild(wantsWrap);
  inputsSection.appendChild(toggleWrap);
  inputsSection.appendChild(btnRow);
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
    if (!havesText.trim()) {
      showToast("Enter the cards they have first.", 'error');
      return;
    }

    const collection       = await getCollection();
    const lockedIds        = getLockedCardIds();
    const pendingReceiveIds = getPendingReceiveIds();

    // Cards with count 0, minus any already pending to receive (treat as owned)
    const userMissing  = new Set(
      CARDS
        .filter(c => (collection[String(c.id)] ?? 0) === 0 && !pendingReceiveIds.has(c.id))
        .map(c => c.id)
    );
    const myDuplicates = CARDS.filter(c => (collection[String(c.id)] ?? 0) > 1);
    const { matched: partnerHas,   unmatched: unmatchedHas  } = parseInput(havesText);
    const { matched: partnerWants, unmatched: unmatchedWants } = parseInput(wantsText);

    // Cards I want from them, sorted by FIFA nation rank (best nations first)
    const youGet = partnerHas
      .filter(c => userMissing.has(c.id))
      .sort((a, b) => nationRank(a.country) - nationRank(b.country));

    const equalMode   = eqCheckbox.checked;
    const tradeGroups = equalMode
      ? buildEqualOffer(youGet, myDuplicates, partnerWants, lockedIds)
      : buildSuggestedOffer(youGet, myDuplicates, partnerWants, lockedIds);
    const unmatched   = [...new Set([...unmatchedHas, ...unmatchedWants])];

    renderResults({ youGet, tradeGroups, unmatched, hasWants: partnerWants.length > 0, equalMode }, partnerInput.value.trim());
    resultsSection.hidden = false;
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  maxBtn.addEventListener('click', async () => {
    const havesText = havesTextarea.value;
    const wantsText = wantsTextarea.value;
    if (!havesText.trim()) {
      showToast("Enter the cards they have first.", 'error');
      return;
    }

    const collection        = await getCollection();
    const pendingReceiveIds = getPendingReceiveIds();

    const userMissing  = new Set(
      CARDS.filter(c => (collection[String(c.id)] ?? 0) === 0 && !pendingReceiveIds.has(c.id)).map(c => c.id)
    );
    const myDuplicates = CARDS.filter(c => (collection[String(c.id)] ?? 0) > 1);

    const { matched: partnerHas,   unmatched: unmatchedHas  } = parseInput(havesText);
    const { matched: partnerWants, unmatched: unmatchedWants } = parseInput(wantsText);

    const iWant   = partnerHas.filter(c => userMissing.has(c.id)).sort((a, b) => a.id - b.id);
    const iCanGive = myDuplicates.filter(c => partnerWants.some(w => w.id === c.id)).sort((a, b) => a.id - b.id);
    const unmatched = [...new Set([...unmatchedHas, ...unmatchedWants])];

    renderMaxResults({ iWant, iCanGive, unmatched }, partnerInput.value.trim());
    resultsSection.hidden = false;
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  function renderMaxResults({ iWant, iCanGive, unmatched }, partnerName) {
    resultsSection.innerHTML = '';

    if (iWant.length === 0 && iCanGive.length === 0) {
      resultsSection.innerHTML = `<div style="background:#f9f9f9;padding:16px;text-align:center;"><p style="color:#555;font-size:13px;">No overlap found between their cards and yours.</p></div>`;
      return;
    }

    function makeList(label, cards, labelColor) {
      const block = document.createElement('div');
      block.style.marginBottom = '20px';
      const head = document.createElement('p');
      head.style.cssText = `font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:${labelColor}; margin-bottom:6px; font-family:var(--font-display);`;
      head.textContent = `${label} (${cards.length})`;
      block.appendChild(head);
      if (cards.length === 0) {
        const none = document.createElement('p');
        none.style.cssText = 'font-size:12px; color:#aaa;';
        none.textContent = 'None';
        block.appendChild(none);
      } else {
        cards.forEach(c => block.appendChild(cardLine(c)));
      }
      return block;
    }

    resultsSection.appendChild(makeList('Cards I want from them', iWant, 'var(--green)'));
    resultsSection.appendChild(makeList('Cards I can give them', iCanGive, 'rgba(197,160,40,0.9)'));

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

    const actionRow = document.createElement('div');
    actionRow.style.cssText = 'display:flex; gap:8px; margin-top:8px;';

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'btn-secondary';
    copyBtn.style.flex = '1';
    copyBtn.textContent = 'Copy Message';
    copyBtn.addEventListener('click', async () => {
      const wantLines = iWant.map(c => `#${c.id} ${c.playerName}`).join('\n') || '(none)';
      const giveLines = iCanGive.map(c => `#${c.id} ${c.playerName}`).join('\n') || '(none)';
      try {
        await navigator.clipboard.writeText(`Hi mate, I am looking for:\n${wantLines}\n\nFor:\n${giveLines}`);
        showToast('Copied!', 'success');
      } catch {
        showToast("Couldn't copy.", 'error');
      }
    });

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn-primary';
    saveBtn.style.flex = '1';
    saveBtn.textContent = 'Save as Pending';
    saveBtn.addEventListener('click', async () => {
      addPendingTrade({
        id: `trade_${Date.now()}`,
        partner: partnerName || 'Unknown',
        createdAt: new Date().toISOString(),
        iGive: iCanGive.map(c => c.id),
        iGet:  iWant.map(c => c.id),
      });
      updateSwapBadge();
      showToast(`Trade with ${partnerName || 'partner'} saved.`, 'success');
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

  // ── Render results ───────────────────────────────────────────────────────
  function renderResults({ youGet, tradeGroups, unmatched, hasWants, equalMode }, partnerName) {
    resultsSection.innerHTML = '';

    const totalOffer     = tradeGroups.reduce((s, g) => s + g.offer.length, 0);
    const totalShortfall = tradeGroups.reduce((s, g) => s + g.shortfall, 0);

    if (youGet.length === 0) {
      resultsSection.innerHTML = `<div style="background:#f9f9f9; padding:16px; text-align:center;"><p style="color:#555; font-size:13px;">None of their cards are on your missing list.</p></div>`;
      return;
    }

    // Cards I want (nation-ranked)
    const wantBlock = document.createElement('div');
    wantBlock.style.marginBottom = '20px';
    const wantHead = document.createElement('p');
    wantHead.style.cssText = 'font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:var(--green); margin-bottom:6px; font-family:var(--font-display);';
    wantHead.textContent = `I want (${youGet.length}) — ranked by nation`;
    wantBlock.appendChild(wantHead);
    youGet.forEach(c => wantBlock.appendChild(cardLine(c)));
    wantBlock.insertAdjacentHTML('beforeend', '<div style="height:1px; background:#eee; margin-top:12px;"></div>');
    resultsSection.appendChild(wantBlock);

    // My offer
    const offerHeadEl = document.createElement('p');
    offerHeadEl.style.cssText = 'font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:rgba(197,160,40,0.9); margin-bottom:8px; font-family:var(--font-display);';

    if (!hasWants) {
      offerHeadEl.textContent = 'My offer';
      resultsSection.appendChild(offerHeadEl);
      const note = document.createElement('p');
      note.style.cssText = 'font-size:12px; color:#888; background:#f9f9f9; padding:12px;';
      note.textContent = "Enter their want list to see what you can offer — we only suggest cards they've asked for.";
      resultsSection.appendChild(note);
    } else if (tradeGroups.length === 0) {
      offerHeadEl.textContent = 'My offer';
      resultsSection.appendChild(offerHeadEl);
      const note = document.createElement('p');
      note.style.cssText = 'font-size:12px; color:#888; background:#f9f9f9; padding:12px;';
      note.textContent = "None of the cards they want match your duplicates.";
      resultsSection.appendChild(note);
    } else {
      offerHeadEl.textContent = `My offer (${totalOffer} cards)`;
      resultsSection.appendChild(offerHeadEl);

      for (const group of tradeGroups) {
        const block = document.createElement('div');
        block.style.marginBottom = '12px';

        if (!group.equalMode) {
          const label = document.createElement('p');
          label.style.cssText = 'font-family:var(--font-display); font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--gold); margin-bottom:4px;';
          label.innerHTML = `${group.tierLabel}${group.shortfall > 0 ? ` <span style="color:#c55; background:#fee; padding:1px 6px; font-size:10px;">${group.shortfall} short</span>` : ''}`;
          block.appendChild(label);
        }

        group.offer.forEach(c => block.appendChild(cardLine(c)));
        if (group.offer.length === 0) {
          const none = document.createElement('p');
          none.style.cssText = 'font-size:11px; color:#aaa;';
          none.textContent = 'No matching dupes available';
          block.appendChild(none);
        }
        resultsSection.appendChild(block);
      }

      // Summary
      const summary = document.createElement('div');
      summary.style.cssText = 'background:#f9f9f9; padding:12px 14px; margin:12px 0 16px; font-size:12px;';
      if (equalMode) {
        summary.innerHTML = totalShortfall === 0
          ? `<span style="color:var(--green); font-weight:700;">Even trade:</span> ${youGet.length} cards each.`
          : `<span style="color:#c55; font-weight:700;">Uneven:</span> You want <strong>${youGet.length}</strong> but can only match <strong>${totalOffer}</strong> — <strong>${totalShortfall}</strong> short.`;
      } else {
        summary.innerHTML = totalShortfall === 0
          ? `<span style="color:var(--green); font-weight:700;">Balanced:</span> You get <strong>${youGet.length}</strong> cards, offer <strong>${totalOffer}</strong> of matching rarity.`
          : `<span style="color:#c55; font-weight:700;">Uneven:</span> You want <strong>${youGet.length}</strong> but can only offer <strong>${totalOffer}</strong> — <strong>${totalShortfall}</strong> short.`;
      }
      resultsSection.appendChild(summary);
    }

    // Unmatched tokens
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
      const getLines   = youGet.map(c => `#${c.id} ${c.playerName}`).join('\n');
      const offerCards = tradeGroups.flatMap(g => g.offer);
      const giveLines  = offerCards.length > 0 ? offerCards.map(c => `#${c.id} ${c.playerName}`).join('\n') : '(none available)';
      try {
        await navigator.clipboard.writeText(`Hi mate, I am looking for:\n${getLines}\n\nFor:\n${giveLines}`);
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
