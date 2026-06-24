// js/views/progress.js
// Progress view — stat tiles + per-team/type colored bars.

import { CARDS, TEAMS, CARD_TYPES } from '../cards-data.js';
import { getCollection } from '../store.js';

const TOTAL = 630;

const TEAM_COLORS = {
  'Algeria':        { fill: '#006233', track: '#D9EFE5' },
  'Argentina':      { fill: '#6DAEDB', track: '#EAF4FB' },
  'Australia':      { fill: '#FFD700', track: '#FFFBE0' },
  'Austria':        { fill: '#ED2939', track: '#FFE0E2' },
  'Belgium':        { fill: '#1A1A1A', track: '#F0F0F0' },
  'Brazil':         { fill: '#009C3B', track: '#D9F0E4' },
  'Canada':         { fill: '#FF0000', track: '#FFCECE' },
  'Cape Verde':     { fill: '#003893', track: '#D9E5F8' },
  'Colombia':       { fill: '#FCD116', track: '#FFFBE0' },
  'Croatia':        { fill: '#FF0000', track: '#FFCECE' },
  'Ecuador':        { fill: '#FFD100', track: '#FFFBE0' },
  'Egypt':          { fill: '#C8102E', track: '#FDDDE0' },
  'England':        { fill: '#CF142B', track: '#FDDEE1' },
  'FIFA':           { fill: '#0033A0', track: '#D9E3F5' },
  'France':         { fill: '#EF233C', track: '#FFE8EA' },
  'Germany':        { fill: '#1A1A1A', track: '#FFF2B2' },
  'Ghana':          { fill: '#006B3F', track: '#D9EEE6' },
  'Haiti':          { fill: '#00209F', track: '#D9E2F5' },
  'Iran':           { fill: '#239F40', track: '#DDF1E3' },
  'Ivory Coast':    { fill: '#F77F00', track: '#FFF0DE' },
  'Japan':          { fill: '#BC002D', track: '#FDDDE0' },
  'Jordan':         { fill: '#007A3D', track: '#D9EEE6' },
  'Korea Republic': { fill: '#C60C30', track: '#FDDDE0' },
  'Mexico':         { fill: '#006847', track: '#D9EEE6' },
  'Morocco':        { fill: '#C1272D', track: '#FDDDE0' },
  'Netherlands':    { fill: '#FF4F00', track: '#FFE4D9' },
  'New Zealand':    { fill: '#1A1A1A', track: '#F0F0F0' },
  'Norway':         { fill: '#EF2B2D', track: '#FFE0E0' },
  'Panama':         { fill: '#D21034', track: '#FDDDE0' },
  'Paraguay':       { fill: '#D52B1E', track: '#FDDDE0' },
  'Portugal':       { fill: '#006600', track: '#D9EDD9' },
  'Qatar':          { fill: '#8D153A', track: '#F2D9E0' },
  'Saudi Arabia':   { fill: '#006C35', track: '#D9EEE6' },
  'Scotland':       { fill: '#003082', track: '#D9E3F8' },
  'Senegal':        { fill: '#00853F', track: '#D9EEE6' },
  'South Africa':   { fill: '#007A4D', track: '#D9EEE6' },
  'Spain':          { fill: '#AA151B', track: '#FFF3CC' },
  'Switzerland':    { fill: '#FF0000', track: '#FFCEC0' },
  'Tunisia':        { fill: '#E70013', track: '#FFD9D9' },
  'United States':  { fill: '#002868', track: '#D9E1F5' },
  'Uruguay':        { fill: '#5CB8E4', track: '#E0F3FC' },
  'Uzbekistan':     { fill: '#1EB53A', track: '#DDF5E3' },
};

const TYPE_COLORS = {
  'Hero':              { fill: '#304FFE', track: '#E4EAFF' },
  'Icon':              { fill: '#FF6B6B', track: '#FFE8E8' },
  'Fan Favourite':     { fill: '#9B59B6', track: '#F0E6F8' },
  'Team Crest':        { fill: '#4A5280', track: '#ECEEF8' },
  'Golden Baller':     { fill: '#F5C400', track: '#FFFBE0' },
  'Contender':         { fill: '#4ECDC4', track: '#E0F7F6' },
  'Master Rookie':     { fill: '#00BFA5', track: '#E0F7F4' },
  'Top Keeper':        { fill: '#3B82F6', track: '#DBEAFE' },
  'Defensive Rock':    { fill: '#FF6B00', track: '#FFE4D9' },
  'Midfield Maestro':  { fill: '#4ECDC4', track: '#E0F7F6' },
  'Goal Machine':      { fill: '#FF6B6B', track: '#FFE8E8' },
  'Mascot':            { fill: '#9B59B6', track: '#F0E6F8' },
  'Official Emblem':   { fill: '#C5A028', track: '#FFF3CC' },
  'Eternos 22':        { fill: '#10164F', track: '#E4EAFF' },
};

const TEAM_FLAGS = {
  'Algeria': '🇩🇿', 'Argentina': '🇦🇷', 'Australia': '🇦🇺', 'Austria': '🇦🇹',
  'Belgium': '🇧🇪', 'Brazil': '🇧🇷', 'Canada': '🇨🇦', 'Cape Verde': '🇨🇻',
  'Colombia': '🇨🇴', 'Croatia': '🇭🇷', 'Ecuador': '🇪🇨', 'Egypt': '🇪🇬',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'FIFA': '🌍', 'France': '🇫🇷', 'Germany': '🇩🇪',
  'Ghana': '🇬🇭', 'Haiti': '🇭🇹', 'Iran': '🇮🇷', 'Ivory Coast': '🇨🇮',
  'Japan': '🇯🇵', 'Jordan': '🇯🇴', 'Korea Republic': '🇰🇷', 'Mexico': '🇲🇽',
  'Morocco': '🇲🇦', 'Netherlands': '🇳🇱', 'New Zealand': '🇳🇿', 'Norway': '🇳🇴',
  'Panama': '🇵🇦', 'Paraguay': '🇵🇾', 'Portugal': '🇵🇹', 'Qatar': '🇶🇦',
  'Saudi Arabia': '🇸🇦', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Senegal': '🇸🇳', 'South Africa': '🇿🇦',
  'Spain': '🇪🇸', 'Switzerland': '🇨🇭', 'Tunisia': '🇹🇳', 'United States': '🇺🇸',
  'Uruguay': '🇺🇾', 'Uzbekistan': '🇺🇿',
};

/**
 * Render full progress breakdown into `container` using a pre-loaded collection.
 * Sync — no network or storage calls. Called from the progress modal.
 */
export function buildProgressContent(container, collection, pendingReceiveIds = new Set()) {
  container.innerHTML = '';

  const ownedCount   = CARDS.filter(c => (collection[String(c.id)] ?? 0) >= 1).length;
  const pendingCount = CARDS.filter(c => (collection[String(c.id)] ?? 0) === 0 && pendingReceiveIds.has(c.id)).length;
  const dupCount     = CARDS.reduce((sum, c) => {
    const n = collection[String(c.id)] ?? 0;
    return sum + Math.max(0, n - 1);
  }, 0);
  const needCount    = TOTAL - ownedCount - pendingCount;
  const pct          = TOTAL > 0 ? ((ownedCount / TOTAL) * 100).toFixed(1) : '0.0';
  const pendingPct   = TOTAL > 0 ? ((pendingCount / TOTAL) * 100).toFixed(1) : '0.0';

  // ── Stat tiles ──────────────────────────────────────────────────────────
  const tilesBlock = document.createElement('div');
  tilesBlock.className = 'overall-block';
  tilesBlock.innerHTML = `
    <div class="overall-tiles">
      <div class="stat-tile">
        <div class="stat-tile__label">Cards collected</div>
        <span class="fx-c stat-tile__num" style="color:var(--accent);">${ownedCount} <span style="color:rgba(197,160,40,0.55);">of ${TOTAL}</span></span>
      </div>
      <div class="stat-tile">
        <div class="stat-tile__label">Still need</div>
        <span class="fx-c stat-tile__num" style="color:#111111;">${needCount < 0 ? 0 : needCount}</span>
      </div>
      <div class="stat-tile">
        <div class="stat-tile__label">Pending trades</div>
        <span class="fx-c stat-tile__num" style="color:var(--accent-coral);">${pendingCount}</span>
      </div>
      <div class="stat-tile">
        <div class="stat-tile__label">Duplicates</div>
        <span class="fx-c stat-tile__num" style="color:#111111;">${dupCount}</span>
      </div>
    </div>
    <div class="progress-track" style="--track:#E4EAFF; --fill:var(--accent); position:relative; overflow:hidden;">
      <div class="progress-fill" style="width:${pct}%"></div>
      <div class="progress-fill" style="width:${pendingPct}%; background:var(--accent-coral); opacity:0.55; position:absolute; left:${pct}%; top:0; height:100%;"></div>
    </div>
    ${pendingCount > 0 ? `
    <div style="display:flex;gap:12px;margin-top:6px;font-size:10px;color:var(--text-muted);">
      <span style="display:flex;align-items:center;gap:4px;"><span style="display:inline-block;width:10px;height:10px;background:var(--accent);border-radius:2px;"></span>Owned ${pct}%</span>
      <span style="display:flex;align-items:center;gap:4px;"><span style="display:inline-block;width:10px;height:10px;background:var(--accent-coral);opacity:0.75;border-radius:2px;"></span>Pending ${pendingPct}%</span>
    </div>` : ''}
  `;
  container.appendChild(tilesBlock);

  if (ownedCount === 0) {
    const zero = document.createElement('p');
    zero.style.cssText = 'padding:32px 0; color:var(--text-muted); font-size:14px; text-align:center;';
    zero.textContent = 'No cards yet. Start adding packs in Add Cards.';
    container.appendChild(zero);
    return;
  }

  // ── Per-team totals ──────────────────────────────────────────────────────
  const teamTotals = {};
  TEAMS.forEach(t => { teamTotals[t] = { total: 0, owned: 0, pending: 0 }; });
  CARDS.forEach(c => {
    if (teamTotals[c.country]) {
      teamTotals[c.country].total++;
      const n = collection[String(c.id)] ?? 0;
      if (n >= 1) teamTotals[c.country].owned++;
      else if (pendingReceiveIds.has(c.id)) teamTotals[c.country].pending++;
    }
  });

  const typeTotals = {};
  CARD_TYPES.forEach(t => { typeTotals[t] = { total: 0, owned: 0, pending: 0 }; });
  CARDS.forEach(c => {
    if (typeTotals[c.cardType]) {
      typeTotals[c.cardType].total++;
      const n = collection[String(c.id)] ?? 0;
      if (n >= 1) typeTotals[c.cardType].owned++;
      else if (pendingReceiveIds.has(c.id)) typeTotals[c.cardType].pending++;
    }
  });

  const twoCol = document.createElement('div');
  twoCol.className = 'progress-two-col';

  // By Team column
  const teamCol = document.createElement('div');
  teamCol.style.cssText = 'flex:1; min-width:0;';
  teamCol.innerHTML = `
    <div class="category-heading">
      <span class="fx category-heading__text">By Team</span>
    </div>
    <div class="prog-rows" id="pm-team-rows"></div>
  `;
  const teamRows = teamCol.querySelector('#pm-team-rows');
  TEAMS.forEach(team => {
    const { total, owned, pending } = teamTotals[team];
    if (total === 0) return;
    const p  = Math.round((owned / total) * 100);
    const pp = Math.round((pending / total) * 100);
    const colors = TEAM_COLORS[team] || { fill: '#304FFE', track: '#E4EAFF' };
    const flag = TEAM_FLAGS[team] || '';
    const row = document.createElement('div');
    row.className = 'prog-row prog-row--team';
    row.style.cssText = `--fill:${colors.fill}; --track:${colors.track};`;
    row.innerHTML = `
      <span class="prog-row__flag">${flag}</span>
      <span class="prog-row__name">${escapeText(team)}</span>
      <div class="progress-track prog-row__bar" style="position:relative;overflow:hidden;">
        <div class="progress-fill" style="width:${p}%"></div>
        ${pending > 0 ? `<div class="progress-fill" style="width:${pp}%;background:var(--accent-coral);opacity:0.55;position:absolute;left:${p}%;top:0;height:100%;"></div>` : ''}
      </div>
      <span class="prog-row__fraction"><span class="prog-row__owned-n">${owned}</span>${pending > 0 ? `<span class="prog-row__pending-count">+${pending}</span>` : ''}<span class="prog-row__of"> / ${total}</span></span>
      <span class="prog-row__pct">${p}%</span>
    `;
    teamRows.appendChild(row);
  });

  // By Card Type column
  const typeCol = document.createElement('div');
  typeCol.style.cssText = 'flex:1; min-width:0;';
  typeCol.innerHTML = `
    <div class="category-heading">
      <span class="fx category-heading__text">By Card Type</span>
    </div>
    <div class="prog-rows" id="pm-type-rows"></div>
  `;
  const typeRows = typeCol.querySelector('#pm-type-rows');
  CARD_TYPES.forEach(type => {
    const { total, owned, pending } = typeTotals[type];
    if (total === 0) return;
    const p  = Math.round((owned / total) * 100);
    const pp = Math.round((pending / total) * 100);
    const colors = TYPE_COLORS[type] || { fill: '#304FFE', track: '#E4EAFF' };
    const row = document.createElement('div');
    row.style.cssText = `--fill:${colors.fill}; --track:${colors.track};`;
    row.className = 'prog-row';
    row.innerHTML = `
      <span class="prog-row__name">${escapeText(type)}</span>
      <div class="progress-track prog-row__bar" style="position:relative;overflow:hidden;">
        <div class="progress-fill" style="width:${p}%"></div>
        ${pending > 0 ? `<div class="progress-fill" style="width:${pp}%;background:var(--accent-coral);opacity:0.55;position:absolute;left:${p}%;top:0;height:100%;"></div>` : ''}
      </div>
      <span class="prog-row__fraction"><span class="prog-row__owned-n">${owned}</span>${pending > 0 ? `<span class="prog-row__pending-count">+${pending}</span>` : ''}<span class="prog-row__of"> / ${total}</span></span>
      <span class="prog-row__pct">${p}%</span>
    `;
    typeRows.appendChild(row);
  });

  twoCol.appendChild(teamCol);
  twoCol.appendChild(typeCol);
  container.appendChild(twoCol);
}

function escapeText(str) {
  const d = document.createElement('span');
  d.textContent = str;
  return d.innerHTML;
}
