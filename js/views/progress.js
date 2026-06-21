// js/views/progress.js
// Progress view — overall + per-team + per-type completion.

import { CARDS, TEAMS, CARD_TYPES } from '../cards-data.js';
import { getCollection } from '../store.js';

const TOTAL = 630;

/**
 * Mount the Progress view.
 * @param {HTMLElement} container
 */
export async function mountProgress(container) {
  container.innerHTML = '';

  const collection = await getCollection();
  const ownedCount = CARDS.filter(c => (collection[String(c.id)] ?? 0) >= 1).length;
  const pct = TOTAL > 0 ? ((ownedCount / TOTAL) * 100).toFixed(1) : '0.0';
  const isComplete = ownedCount === TOTAL;

  // ── Header ───────────────────────────────────────────────────────────────
  const header = document.createElement('div');
  header.className = 'px-4 pt-6 pb-2';
  header.innerHTML = `
    <h1 class="section-heading">Progress</h1>
    <span class="chevron-accent"></span>
    <p class="text-sm" style="color:#888; margin-top:-6px;">How close are you to completing the set?</p>
  `;
  container.appendChild(header);

  if (ownedCount === 0) {
    const zero = document.createElement('p');
    zero.className = 'px-4 py-8 text-center text-sm';
    zero.style.color = '#555';
    zero.textContent = 'No cards added yet. Start scanning packs in Add Cards.';
    container.appendChild(zero);
    return;
  }

  // ── Overall completion ───────────────────────────────────────────────────
  const overall = document.createElement('div');
  overall.className = 'px-4 pb-6';

  if (isComplete) {
    overall.innerHTML = `
      <div class="text-center py-6">
        <div class="text-5xl mb-2">🏆</div>
        <p class="font-black text-2xl" style="color:var(--color-yellow); font-family:'Barlow Condensed',sans-serif; text-transform:uppercase; letter-spacing:.05em;">Complete!</p>
        <p class="text-base mt-1" style="color:#ddd;">You've collected all 630 cards.</p>
        <p class="text-sm mt-1" style="color:#888;">Legendary. The full set is yours.</p>
      </div>
    `;
  } else {
    overall.innerHTML = `
      <div class="flex justify-between items-end mb-2">
        <span class="text-2xl font-black" style="font-family:'Barlow Condensed',sans-serif; color:#fff;">${ownedCount} <span class="text-base font-semibold" style="color:#888;">of ${TOTAL} cards collected</span></span>
        <span class="text-lg font-black" style="font-family:'Barlow Condensed',sans-serif; color:var(--color-yellow);">${pct}%</span>
      </div>
      <div class="progress-bar-track">
        <div class="progress-bar-fill" style="width: ${pct}%;"></div>
      </div>
    `;
  }
  container.appendChild(overall);

  // ── By Team ──────────────────────────────────────────────────────────────
  const teamSection = document.createElement('div');
  teamSection.className = 'px-4 pb-6';

  const teamHeading = document.createElement('h2');
  teamHeading.className = 'section-heading text-lg mb-4';
  teamHeading.textContent = 'By Team';
  teamSection.appendChild(teamHeading);

  // Build per-team totals
  const teamTotals = {};
  TEAMS.forEach(t => { teamTotals[t] = { total: 0, owned: 0 }; });
  CARDS.forEach(c => {
    if (teamTotals[c.country]) {
      teamTotals[c.country].total++;
      if ((collection[String(c.id)] ?? 0) >= 1) teamTotals[c.country].owned++;
    }
  });

  const teamTable = document.createElement('div');
  teamTable.className = 'flex flex-col gap-3';

  TEAMS.forEach(team => {
    const { total, owned } = teamTotals[team];
    const teamPct = total > 0 ? Math.round((owned / total) * 100) : 0;

    const row = document.createElement('div');
    row.innerHTML = `
      <div class="flex justify-between items-center mb-1">
        <span class="text-sm font-semibold" style="color:#ddd;">${escapeText(team)}</span>
        <span class="text-xs" style="color:#888;">${owned} / ${total} &nbsp;<strong style="color:${teamPct === 100 ? 'var(--color-green)' : '#aaa'};">${teamPct}%</strong></span>
      </div>
      <div class="progress-bar-track">
        <div class="progress-bar-fill" style="width:${teamPct}%; background:${teamPct === 100 ? 'var(--color-green)' : 'var(--color-blue)'};"></div>
      </div>
    `;
    teamTable.appendChild(row);
  });

  teamSection.appendChild(teamTable);
  container.appendChild(teamSection);

  // ── By Card Type ─────────────────────────────────────────────────────────
  const typeSection = document.createElement('div');
  typeSection.className = 'px-4 pb-6';

  const typeHeading = document.createElement('h2');
  typeHeading.className = 'section-heading text-lg mb-4';
  typeHeading.textContent = 'By Card Type';
  typeSection.appendChild(typeHeading);

  const typeTotals = {};
  CARD_TYPES.forEach(t => { typeTotals[t] = { total: 0, owned: 0 }; });
  CARDS.forEach(c => {
    if (typeTotals[c.cardType]) {
      typeTotals[c.cardType].total++;
      if ((collection[String(c.id)] ?? 0) >= 1) typeTotals[c.cardType].owned++;
    }
  });

  const typeTable = document.createElement('div');
  typeTable.className = 'flex flex-col gap-3';

  CARD_TYPES.forEach(type => {
    const { total, owned } = typeTotals[type];
    if (total === 0) return;
    const typePct = Math.round((owned / total) * 100);

    const row = document.createElement('div');
    row.innerHTML = `
      <div class="flex justify-between items-center mb-1">
        <span class="text-sm font-semibold" style="color:#ddd;">${escapeText(type)}</span>
        <span class="text-xs" style="color:#888;">${owned} / ${total} &nbsp;<strong style="color:${typePct === 100 ? 'var(--color-green)' : '#aaa'};">${typePct}%</strong></span>
      </div>
      <div class="progress-bar-track">
        <div class="progress-bar-fill progress-bar-fill--yellow" style="width:${typePct}%;"></div>
      </div>
    `;
    typeTable.appendChild(row);
  });

  typeSection.appendChild(typeTable);
  container.appendChild(typeSection);
}

/**
 * Safely escape text for use in innerHTML (no user data — just static strings
 * from the app's own constants, but defensive is good practice).
 * @param {string} str
 * @returns {string}
 */
function escapeText(str) {
  const d = document.createElement('span');
  d.textContent = str;
  return d.innerHTML;
}
