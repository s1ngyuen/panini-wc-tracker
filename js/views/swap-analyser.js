// js/views/swap-analyser.js
// Swap Analyser view — match partner's haves/wants against user's collection.

import { CARDS, CARDS_BY_ID } from '../cards-data.js';
import { getCollection } from '../store.js';
import { showToast } from '../components/toast.js';

/**
 * Mount the Swap Analyser view.
 * @param {HTMLElement} container
 */
export function mountSwapAnalyser(container) {
  container.innerHTML = '';

  // ── Header ───────────────────────────────────────────────────────────────
  const header = document.createElement('div');
  header.className = 'px-4 pt-6 pb-2';
  header.innerHTML = `
    <div class="section-heading-wrap">
      <div class="section-heading-bar"></div>
      <span class="fx" style="font-size:32px; text-transform:uppercase; letter-spacing:.04em; color:var(--text-primary); line-height:1;">Swaps</span>
    </div>
    <p class="section-sub">Paste your partner's cards to plan the best trade</p>
  `;
  container.appendChild(header);

  // ── Help text ─────────────────────────────────────────────────────────────
  const help = document.createElement('div');
  help.className = 'px-4 pb-4';
  help.innerHTML = `
    <div style="background:#f9f9f9; padding:14px 16px; margin-bottom:16px; font-size:12px; color:var(--text-muted); line-height:1.7;">
      Enter card IDs or player names — one per line, or separated by commas.<br>
      We'll match them against your collection and your duplicates.<br>
      <span style="color:#555;">Example: <code style="color:#aaa;">42</code>, <code style="color:#aaa;">Messi</code>, <code style="color:#aaa;">Pedri, Bellingham</code></span>
    </div>
  `;
  container.appendChild(help);

  // ── Inputs ───────────────────────────────────────────────────────────────
  const inputsSection = document.createElement('div');
  inputsSection.className = 'px-4 pb-4 flex flex-col gap-4';

  // Partner haves
  const havesWrap = document.createElement('div');

  const havesLabel = document.createElement('label');
  havesLabel.setAttribute('for', 'swap-haves');
  havesLabel.className = 'form-label';
  havesLabel.textContent = 'Cards they HAVE';

  const havesHint = document.createElement('p');
  havesHint.className = 'form-hint';
  havesHint.textContent = 'These are cards your partner can offer you.';

  const havesTextarea = document.createElement('textarea');
  havesTextarea.id = 'swap-haves';
  havesTextarea.className = 'form-textarea';
  havesTextarea.placeholder = 'Paste card IDs or names here.\nOne per line or comma-separated.';
  havesTextarea.setAttribute('aria-label', 'Cards your partner has');
  havesTextarea.setAttribute('aria-describedby', 'swap-haves-hint');
  havesHint.id = 'swap-haves-hint';

  havesWrap.appendChild(havesLabel);
  havesWrap.appendChild(havesHint);
  havesWrap.appendChild(havesTextarea);

  // Partner wants
  const wantsWrap = document.createElement('div');

  const wantsLabel = document.createElement('label');
  wantsLabel.setAttribute('for', 'swap-wants');
  wantsLabel.className = 'form-label';
  wantsLabel.textContent = 'Cards they WANT';

  const wantsHint = document.createElement('p');
  wantsHint.className = 'form-hint';
  wantsHint.textContent = 'These are cards your partner is looking for.';

  const wantsTextarea = document.createElement('textarea');
  wantsTextarea.id = 'swap-wants';
  wantsTextarea.className = 'form-textarea';
  wantsTextarea.placeholder = 'Paste card IDs or names here.\nOne per line or comma-separated.';
  wantsTextarea.setAttribute('aria-label', 'Cards your partner wants');
  wantsTextarea.setAttribute('aria-describedby', 'swap-wants-hint');
  wantsHint.id = 'swap-wants-hint';

  wantsWrap.appendChild(wantsLabel);
  wantsWrap.appendChild(wantsHint);
  wantsWrap.appendChild(wantsTextarea);

  const analyseBtn = document.createElement('button');
  analyseBtn.type = 'button';
  analyseBtn.className = 'btn-primary w-full';
  analyseBtn.textContent = 'Analyse Swap';

  inputsSection.appendChild(havesWrap);
  inputsSection.appendChild(wantsWrap);
  inputsSection.appendChild(analyseBtn);
  container.appendChild(inputsSection);

  // ── Results section (hidden until analysis runs) ──────────────────────────
  const resultsSection = document.createElement('div');
  resultsSection.className = 'px-4 pb-8';
  resultsSection.hidden = true;
  container.appendChild(resultsSection);

  // ── Analyse handler ───────────────────────────────────────────────────────
  analyseBtn.addEventListener('click', async () => {
    const collection = await getCollection();

    const havesText = havesTextarea.value;
    const wantsText = wantsTextarea.value;

    if (!havesText.trim() && !wantsText.trim()) {
      showToast("Paste your partner's cards first.", 'error');
      return;
    }

    const result = runSwapAnalysis(havesText, wantsText, collection);
    renderResults(result);
    resultsSection.hidden = false;
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // ── Rarity tiers ─────────────────────────────────────────────────────────
  const RARITY_TIER = {
    'Golden Baller': 3,
    'Icon': 2, 'Fan Favourite': 2, 'Master Rookie': 2, 'Top Keeper': 2,
    'Defensive Rock': 2, 'Midfield Maestro': 2, 'Goal Machine': 2,
    'Mascot': 2, 'Official Emblem': 2, 'Eternos-22': 2,
    'Hero': 1, 'Contender': 1, 'Team Crest': 1,
  };
  const TIER_LABEL = { 3: 'Ultra Rare', 2: 'Special', 1: 'Base' };
  function tier(cardType) { return RARITY_TIER[cardType] ?? 1; }

  // ── Swap algorithm ────────────────────────────────────────────────────────
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

  function buildSuggestedOffer(youGet, myDuplicates) {
    // Group needed cards by card type
    const needByType = {};
    for (const card of youGet) {
      (needByType[card.cardType] = needByType[card.cardType] || []).push(card);
    }

    // Index my dupes by type and tier
    const dupsByType = {};
    const dupsByTier = { 1: [], 2: [], 3: [] };
    for (const card of myDuplicates) {
      (dupsByType[card.cardType] = dupsByType[card.cardType] || []).push(card);
      dupsByTier[tier(card.cardType)].push(card);
    }

    const used = new Set();
    const groups = [];

    for (const [type, needed] of Object.entries(needByType)) {
      const count = needed.length;
      const t = tier(type);

      // 1. Same card type
      const sameType = (dupsByType[type] || []).filter(d => !used.has(d.id)).slice(0, count);
      sameType.forEach(d => used.add(d.id));

      // 2. Fill with same tier
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

  function runSwapAnalysis(havesText, wantsText, collection) {
    const userMissing   = new Set(CARDS.filter(c => (collection[String(c.id)] ?? 0) === 0).map(c => c.id));
    const myDuplicates  = CARDS.filter(c => (collection[String(c.id)] ?? 0) > 1);

    const { matched: partnerHas,   unmatched: unmatchedHas  } = parseInput(havesText);
    const { matched: partnerWants, unmatched: unmatchedWants } = parseInput(wantsText);

    const youGet       = partnerHas.filter(c => userMissing.has(c.id));
    const tradeGroups  = buildSuggestedOffer(youGet, myDuplicates);
    const myDupSet     = new Set(myDuplicates.map(c => c.id));
    const partnerMatch = partnerWants.filter(c => myDupSet.has(c.id)); // what they want that I have

    const unmatched = [...new Set([...unmatchedHas, ...unmatchedWants])];

    return { youGet, tradeGroups, partnerMatch, unmatched };
  }

  // ── Render results ────────────────────────────────────────────────────────
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

  function renderResults({ youGet, tradeGroups, partnerMatch, unmatched }) {
    resultsSection.innerHTML = '';

    const totalOffer = tradeGroups.reduce((s, g) => s + g.offer.length, 0);
    const totalShortfall = tradeGroups.reduce((s, g) => s + g.shortfall, 0);

    if (youGet.length === 0) {
      const noMatch = document.createElement('div');
      noMatch.style.cssText = 'background:#f9f9f9; padding:16px; text-align:center;';
      noMatch.innerHTML = `<p style="color:#555; font-size:13px;">None of their cards are on your missing list.<br>Try updating their card list.</p>`;
      resultsSection.appendChild(noMatch);
    } else {

      // ── Trade groups (one per card type I need) ───────────────────────────
      for (const group of tradeGroups) {
        const block = document.createElement('div');
        block.style.cssText = 'margin-bottom:20px;';

        // Header row: "3 Icons for 3 Icons"
        const label = group.offer.length === group.need
          ? `${group.need} ${group.type}${group.need > 1 ? 's' : ''} for ${group.offer.length} ${
              group.offer[0]?.cardType === group.type ? group.type : TIER_LABEL[group.tier]
            }${group.offer.length > 1 ? 's' : ''}`
          : `${group.need} ${group.type}${group.need > 1 ? 's' : ''} — you can only offer ${group.offer.length}`;

        const groupHead = document.createElement('div');
        groupHead.style.cssText = 'display:flex; align-items:center; gap:8px; margin-bottom:8px;';
        groupHead.innerHTML = `
          <span style="font-family:var(--font-display); font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--gold);">${label}</span>
          ${totalShortfall > 0 && group.shortfall > 0 ? `<span style="font-size:11px; color:#c55; background:#fee; padding:2px 7px;">${group.shortfall} short</span>` : ''}
        `;
        block.appendChild(groupHead);

        // Two-column: You want | You offer
        const cols = document.createElement('div');
        cols.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:10px;';

        const wantCol = document.createElement('div');
        const offerCol = document.createElement('div');

        const wantHead = document.createElement('p');
        wantHead.style.cssText = 'font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:var(--green); margin-bottom:4px; font-family:var(--font-display);';
        wantHead.textContent = 'I want';
        wantCol.appendChild(wantHead);
        group.need > 0 && group.type && CARDS.filter(c => group.type === c.cardType && youGet.some(g => g.id === c.id))
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

        const divider = document.createElement('div');
        divider.style.cssText = 'height:1px; background:#eee; margin-top:16px;';
        block.appendChild(divider);

        resultsSection.appendChild(block);
      }

      // ── Summary banner ────────────────────────────────────────────────────
      const summary = document.createElement('div');
      summary.style.cssText = 'background:#f9f9f9; padding:12px 14px; margin-bottom:16px; font-size:12px;';
      summary.innerHTML = totalShortfall === 0
        ? `<span style="color:var(--green); font-weight:700;">Balanced trade:</span> You get <strong>${youGet.length}</strong> cards and offer <strong>${totalOffer}</strong> of equal rarity.`
        : `<span style="color:#c55; font-weight:700;">Uneven:</span> You need <strong>${youGet.length}</strong> cards but only have <strong>${totalOffer}</strong> dupes of matching rarity. You're <strong>${totalShortfall}</strong> short — negotiate with your partner.`;
      resultsSection.appendChild(summary);

      // ── Partner's explicit wants (if they entered any) ────────────────────
      if (partnerMatch.length > 0) {
        const pw = document.createElement('div');
        pw.style.cssText = 'margin-bottom:16px;';
        const pwHead = document.createElement('p');
        pwHead.style.cssText = 'font-family:var(--font-display); font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#888; margin-bottom:6px;';
        pwHead.textContent = "Also matches what they want";
        pw.appendChild(pwHead);
        partnerMatch.forEach(c => pw.appendChild(cardLine(c)));
        resultsSection.appendChild(pw);
      }
    }

    // ── Unmatched tokens ──────────────────────────────────────────────────
    if (unmatched.length > 0) {
      const um = document.createElement('div');
      um.style.cssText = 'background:#fff5f5; padding:12px 14px; margin-bottom:12px;';
      um.innerHTML = `<p style="font-size:11px; color:#c55; margin-bottom:4px; font-weight:700;">Couldn't match:</p>`;
      unmatched.forEach(token => {
        const item = document.createElement('p');
        item.style.cssText = 'font-size:11px; color:#c55;';
        item.textContent = `"${token}" — not found`;
        um.appendChild(item);
      });
      resultsSection.appendChild(um);
    }

    // ── Copy trade message ────────────────────────────────────────────────
    if (youGet.length > 0) {
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'btn-primary w-full mt-4';
      copyBtn.textContent = 'Copy Trade Message';

      copyBtn.addEventListener('click', async () => {
        const getNames  = youGet.map(c => `#${c.id} ${c.playerName}`).join(', ');
        const offerCards = tradeGroups.flatMap(g => g.offer);
        const giveNames = offerCards.length > 0
          ? offerCards.map(c => `#${c.id} ${c.playerName}`).join(', ')
          : '(none available)';

        const text = `Hi mate, I am looking for ${getNames} for ${giveNames}`;

        try {
          await navigator.clipboard.writeText(text);
          showToast('Copied! Send it to your partner.', 'success');
        } catch {
          showToast("Couldn't copy — select and copy manually.", 'error');
        }
      });

      resultsSection.appendChild(copyBtn);
    }
  }
}
