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
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ── Swap algorithm ────────────────────────────────────────────────────────
  /**
   * Parse a raw text block into an array of matched Card objects.
   * @param {string} text
   * @returns {{ matched: Card[], unmatched: string[] }}
   */
  function parseInput(text) {
    const tokens = text
      .split(/[\n,;]+/)
      .map(t => t.trim().replace(/^[#\s]+/, '').trim())
      .filter(t => t.length > 0);

    const seen = new Set();
    const matched = [];
    const unmatched = [];

    tokens.forEach(token => {
      // Try numeric ID first
      const num = Number(token);
      if (!isNaN(num) && Number.isInteger(num) && num >= 1 && num <= 630) {
        const card = CARDS_BY_ID[num];
        if (card && !seen.has(card.id)) {
          seen.add(card.id);
          matched.push(card);
        } else if (!card) {
          unmatched.push(token);
        }
        return;
      }

      // Text search
      const lower = token.toLowerCase();
      let found = CARDS.find(c => c.playerName.toLowerCase() === lower);
      if (!found) {
        found = CARDS.find(c => c.playerName.toLowerCase().includes(lower));
      }

      if (found && !seen.has(found.id)) {
        seen.add(found.id);
        matched.push(found);
      } else if (!found) {
        unmatched.push(token);
      }
    });

    return { matched, unmatched };
  }

  /**
   * @param {string} havesText
   * @param {string} wantsText
   * @param {{ [key: string]: number }} collection
   */
  function runSwapAnalysis(havesText, wantsText, collection) {
    const userMissing    = new Set(CARDS.filter(c => (collection[String(c.id)] ?? 0) === 0).map(c => c.id));
    const userDuplicates = new Set(CARDS.filter(c => (collection[String(c.id)] ?? 0) > 1).map(c => c.id));

    const { matched: partnerHas,   unmatched: unmatchedHas  } = parseInput(havesText);
    const { matched: partnerWants, unmatched: unmatchedWants } = parseInput(wantsText);

    // Cards I can request: partner has them AND I'm missing them
    const youGet = partnerHas.filter(c => userMissing.has(c.id));

    // Cards I can offer: partner wants them AND I have spares
    const youGive = partnerWants.filter(c => userDuplicates.has(c.id));

    const unmatched = [...new Set([...unmatchedHas, ...unmatchedWants])];

    return { youGet, youGive, unmatched };
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

  function renderResults({ youGet, youGive, unmatched }) {
    resultsSection.innerHTML = '';

    // Results heading
    const rHeading = document.createElement('h2');
    rHeading.className = 'section-heading text-xl mb-2';
    rHeading.textContent = 'Swap Results';
    resultsSection.appendChild(rHeading);
    resultsSection.appendChild(Object.assign(document.createElement('span'), { className: 'chevron-accent' }));

    // No match state
    if (youGet.length === 0 && youGive.length === 0) {
      const noMatch = document.createElement('div');
      noMatch.className = 'rounded-lg p-4 text-center';
      noMatch.style.background = '#111';
      noMatch.innerHTML = `
        <p class="font-semibold text-sm mb-1" style="color:#aaa;">No swap matches found.</p>
        <p class="text-xs" style="color:#555;">Your partner's cards don't overlap with your missing cards or duplicates.<br>Try updating their list and running the analysis again.</p>
      `;
      resultsSection.appendChild(noMatch);
    } else {
      // Balance warning (threshold: difference > 3)
      const diff = Math.abs(youGet.length - youGive.length);
      if (diff > 3 && youGet.length > 0 && youGive.length > 0) {
        const balanceNote = document.createElement('div');
        balanceNote.className = 'rounded-lg p-3 mb-4 text-xs';
        balanceNote.style.cssText = 'background:#2a1a00; border:1px solid #ff6b00; color:#ff9944;';
        balanceNote.textContent = `Heads up: this trade isn't even — you're getting ${youGet.length} cards but giving ${youGive.length}. Worth a conversation before you commit.`;
        resultsSection.appendChild(balanceNote);
      }

      // One-sided messages
      if (youGet.length === 0 && youGive.length > 0) {
        const sideNote = document.createElement('p');
        sideNote.className = 'text-xs mb-4 px-1';
        sideNote.style.color = '#888';
        sideNote.textContent = `You can give ${youGive.length} card(s), but nothing from their list covers your missing cards.`;
        resultsSection.appendChild(sideNote);
      }
      if (youGive.length === 0 && youGet.length > 0) {
        const sideNote = document.createElement('p');
        sideNote.className = 'text-xs mb-4 px-1';
        sideNote.style.color = '#888';
        sideNote.textContent = `They have ${youGet.length} card(s) you need, but none of your dupes match what they want.`;
        resultsSection.appendChild(sideNote);
      }

      // Cards I want from partner
      const getSection = document.createElement('div');
      getSection.className = 'mb-5';

      const getHeading = document.createElement('h3');
      getHeading.className = 'text-sm font-black mb-1';
      getHeading.style.cssText = 'font-family:"Barlow Condensed",sans-serif; text-transform:uppercase; letter-spacing:.05em; color:var(--color-green);';
      getHeading.textContent = 'Cards I Want From You';

      const getSub = document.createElement('p');
      getSub.className = 'text-xs mb-3';
      getSub.style.color = '#666';
      getSub.textContent = `${youGet.length} card(s) your partner has that you're missing.`;

      getSection.appendChild(getHeading);
      getSection.appendChild(getSub);

      if (youGet.length === 0) {
        const none = document.createElement('p');
        none.className = 'text-xs px-3 py-2 rounded';
        none.style.cssText = 'background:#111; color:#555;';
        none.textContent = '(none)';
        getSection.appendChild(none);
      } else {
        youGet.forEach(c => getSection.appendChild(cardLine(c)));
      }
      resultsSection.appendChild(getSection);

      // Cards I can give
      const giveSection = document.createElement('div');
      giveSection.className = 'mb-5';

      const giveHeading = document.createElement('h3');
      giveHeading.className = 'text-sm font-black mb-1';
      giveHeading.style.cssText = 'font-family:"Barlow Condensed",sans-serif; text-transform:uppercase; letter-spacing:.05em; color:var(--color-yellow);';
      giveHeading.textContent = 'Cards I Can Give You';

      const giveSub = document.createElement('p');
      giveSub.className = 'text-xs mb-3';
      giveSub.style.color = '#666';
      giveSub.textContent = `${youGive.length} duplicate(s) your partner is looking for.`;

      giveSection.appendChild(giveHeading);
      giveSection.appendChild(giveSub);

      if (youGive.length === 0) {
        const none = document.createElement('p');
        none.className = 'text-xs px-3 py-2 rounded';
        none.style.cssText = 'background:#111; color:#555;';
        none.textContent = '(none)';
        giveSection.appendChild(none);
      } else {
        youGive.forEach(c => giveSection.appendChild(cardLine(c)));
      }
      resultsSection.appendChild(giveSection);
    }

    // Unmatched tokens
    if (unmatched.length > 0) {
      const unmatchedSection = document.createElement('div');
      unmatchedSection.className = 'mt-4 rounded-lg p-3';
      unmatchedSection.style.cssText = 'background:#1a0000; border:1px solid #440000;';

      const uHead = document.createElement('p');
      uHead.className = 'text-xs font-bold mb-1';
      uHead.style.color = '#ff6666';
      uHead.textContent = "Couldn't match these:";

      const uSub = document.createElement('p');
      uSub.className = 'text-xs mb-2';
      uSub.style.color = '#882222';
      uSub.textContent = "These entries didn't match any card in the set. Check the spelling or use the card ID instead.";

      unmatchedSection.appendChild(uHead);
      unmatchedSection.appendChild(uSub);

      unmatched.forEach(token => {
        const item = document.createElement('p');
        item.className = 'text-xs py-1';
        item.style.color = '#cc4444';
        item.textContent = `"${token}" — not found`;
        unmatchedSection.appendChild(item);
      });

      resultsSection.appendChild(unmatchedSection);
    }

    // Copy trade message button
    if (youGet.length > 0 || youGive.length > 0) {
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'btn-primary w-full mt-4';
      copyBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        Copy Trade Message
      `;

      copyBtn.addEventListener('click', async () => {
        const getLines = youGet.length > 0
          ? youGet.map(c => `#${c.id} ${c.playerName} (${c.country} — ${c.cardType})`).join('\n')
          : '(none)';
        const giveLines = youGive.length > 0
          ? youGive.map(c => `#${c.id} ${c.playerName} (${c.country} — ${c.cardType})`).join('\n')
          : '(none)';

        const text = `--- CARDS I WANT FROM YOU ---\n${getLines}\n\n--- CARDS I CAN GIVE YOU ---\n${giveLines}\n\nGenerated by WC 2026 Tracker`;

        try {
          await navigator.clipboard.writeText(text);
          showToast('Copied! Send it to your partner and sort the swap.', 'success');
        } catch {
          showToast("Couldn't copy automatically. Select the text above and copy it manually.", 'error');
        }
      });

      resultsSection.appendChild(copyBtn);
    }
  }
}
