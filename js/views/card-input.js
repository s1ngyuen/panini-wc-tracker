// js/views/card-input.js

import { CARDS, CARDS_BY_ID, BONUS_CARDS, BONUS_CARDS_BY_ID } from '../cards-data.js';
import { addCard, removeCard, getCollection } from '../store.js';
import { showToast } from '../components/toast.js';

let _outsideClickHandler = null;

export function mountCardInput(container) {
  container.innerHTML = '';

  // ── Heading ─────────────────────────────────────────────────────────────
  const heading = document.createElement('div');
  heading.className = 'px-4 pt-6 pb-2';
  heading.innerHTML = `
    <div class="section-heading-wrap">
      <div class="section-heading-bar"></div>
      <span class="fx page-title">Add Cards</span>
    </div>
    <p class="section-sub">Add card(s) to your collection here.</p>
  `;
  container.appendChild(heading);

  // ── Search form ──────────────────────────────────────────────────────────
  const formWrap = document.createElement('div');
  formWrap.className = 'px-4 pb-4';

  const label = document.createElement('label');
  label.setAttribute('for', 'card-search-input');
  label.className = 'form-label';
  label.textContent = 'Card number or player name';

  const inputWrap = document.createElement('div');
  inputWrap.className = 'relative';

  const input = document.createElement('input');
  input.id = 'card-search-input';
  input.type = 'search';
  input.className = 'form-input pr-12';
  input.placeholder = 'e.g. 42 or Messi';
  input.autocomplete = 'off';
  input.autocorrect = 'off';
  input.autocapitalize = 'off';
  input.spellcheck = false;
  input.setAttribute('aria-label', 'Card number or player name');

  const dropdown = document.createElement('div');
  dropdown.className = 'search-dropdown mt-1';
  dropdown.hidden = true;
  dropdown.setAttribute('role', 'listbox');

  inputWrap.appendChild(input);
  inputWrap.appendChild(dropdown);

  const addToListBtn = document.createElement('button');
  addToListBtn.type = 'button';
  addToListBtn.className = 'btn-secondary w-full mt-3';
  addToListBtn.textContent = '+ Add to List';

  formWrap.appendChild(label);
  formWrap.appendChild(inputWrap);
  formWrap.appendChild(addToListBtn);
  container.appendChild(formWrap);

  // ── Staging area ─────────────────────────────────────────────────────────
  const stagingSection = document.createElement('div');
  stagingSection.className = 'px-4 pb-4';
  container.appendChild(stagingSection);

  // ── State ────────────────────────────────────────────────────────────────
  let selectedCard = null;
  const stagedCards = [];
  let collection = {};
  getCollection().then(c => { collection = c; renderStaging(); });

  // ── Search logic ─────────────────────────────────────────────────────────
  const ALL_CARDS = [...CARDS, ...BONUS_CARDS];

  function searchCards(query) {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];
    const numeric = Number(trimmed);
    if (!isNaN(numeric) && Number.isInteger(numeric)) {
      const found = CARDS_BY_ID[numeric] || BONUS_CARDS_BY_ID[String(numeric)];
      return found ? [found] : [];
    }
    // Exact bonus card ID match (e.g. "DB1", "LE-LM", "624b")
    const upperTrimmed = trimmed.toUpperCase();
    const bonusById = BONUS_CARDS_BY_ID[upperTrimmed] || BONUS_CARDS_BY_ID[trimmed];
    if (bonusById) return [bonusById];
    // Name search across all cards
    const lower = trimmed.toLowerCase();
    const exact = ALL_CARDS.filter(c => c.playerName.toLowerCase() === lower);
    if (exact.length) return exact.slice(0, 8);
    return ALL_CARDS.filter(c => c.playerName.toLowerCase().includes(lower)).slice(0, 8);
  }

  function updateDropdown(results) {
    dropdown.innerHTML = '';
    if (results.length <= 1) {
      dropdown.hidden = true;
      if (results.length === 1) selectedCard = results[0];
      return;
    }
    selectedCard = null;
    results.forEach(card => {
      const item = document.createElement('div');
      item.className = 'search-dropdown-item';
      item.setAttribute('role', 'option');
      item.setAttribute('tabindex', '0');

      const idSpan = document.createElement('span');
      idSpan.className = 'search-dropdown-item__id';
      idSpan.textContent = `#${card.id}`;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'font-semibold text-sm';
      nameSpan.textContent = card.playerName;

      const metaSpan = document.createElement('span');
      metaSpan.className = 'text-xs ml-auto';
      metaSpan.style.color = '#666';
      metaSpan.textContent = card.country;

      item.appendChild(idSpan);
      item.appendChild(nameSpan);
      item.appendChild(metaSpan);

      const selectItem = () => {
        selectedCard = card;
        input.value = card.playerName;
        dropdown.hidden = true;
        input.focus();
      };
      item.addEventListener('click', selectItem);
      item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectItem(); } });
      dropdown.appendChild(item);
    });
    dropdown.hidden = false;
  }

  input.addEventListener('input', () => {
    const val = input.value;
    if (val.trim().length < 2) { dropdown.hidden = true; selectedCard = null; return; }
    const results = searchCards(val);
    if (results.length === 1) selectedCard = results[0];
    else selectedCard = null;
    updateDropdown(results);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') dropdown.hidden = true;
    if (e.key === 'Enter') { e.preventDefault(); handleAddToList(); }
    if (e.key === 'ArrowDown' && !dropdown.hidden) {
      e.preventDefault();
      dropdown.querySelector('.search-dropdown-item')?.focus();
    }
  });

  if (_outsideClickHandler) document.removeEventListener('click', _outsideClickHandler);
  _outsideClickHandler = e => { if (!formWrap.contains(e.target)) dropdown.hidden = true; };
  document.addEventListener('click', _outsideClickHandler);

  // ── Add to list ───────────────────────────────────────────────────────────
  function handleAddToList() {
    const query = input.value.trim();
    if (!query || query.length < 2) { showToast('Enter a card number or name.', 'error'); return; }

    const numeric = Number(query);
    if (!isNaN(numeric) && Number.isInteger(numeric) && numeric < 1) {
      showToast('Invalid card number.', 'error'); return;
    }

    let card = selectedCard;
    if (!card) {
      const results = searchCards(query);
      if (results.length === 0) { showToast(`No card found for "${query}".`, 'error'); return; }
      if (results.length > 1) { updateDropdown(results); showToast('Multiple matches — pick one from the list.', 'info'); return; }
      card = results[0];
    }

    stagedCards.unshift(card);
    input.value = '';
    selectedCard = null;
    dropdown.hidden = true;
    input.focus();
    renderStaging();
  }

  addToListBtn.addEventListener('click', handleAddToList);

  // ── Render staging list ───────────────────────────────────────────────────
  function renderStaging() {
    stagingSection.innerHTML = '';

    if (stagedCards.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'text-sm text-center py-4';
      empty.style.color = 'var(--text-muted)';
      empty.textContent = 'No cards in your list yet.';
      stagingSection.appendChild(empty);
      return;
    }

    const listLabel = document.createElement('p');
    listLabel.className = 'form-label';
    listLabel.textContent = `Cards to add (${stagedCards.length})`;
    stagingSection.appendChild(listLabel);

    const list = document.createElement('div');
    list.className = 'bulk-add-list';
    stagingSection.appendChild(list);

    stagedCards.forEach((card, idx) => {
      const owned = collection[String(card.id)] ?? 0;
      // count how many times this card already appears earlier in the staged list
      const stagedBefore = stagedCards.slice(0, idx).filter(c => c.id === card.id).length;
      const effectiveOwned = owned + stagedBefore;
      const isNew = effectiveOwned === 0;

      const row = document.createElement('div');
      row.className = 'bulk-add-row';

      const thumb = document.createElement('img');
      thumb.src = `assets/cards/${card.id}.jpg`;
      thumb.alt = card.playerName;
      thumb.className = 'bulk-add-row__thumb';

      const info = document.createElement('div');
      info.className = 'bulk-add-row__info';
      info.innerHTML = `<span class="bulk-add-row__name">${card.playerName}</span><span class="bulk-add-row__meta">#${card.id} · ${card.country}</span>`;

      const badge = document.createElement('span');
      badge.className = `bulk-add-row__badge bulk-add-row__badge--${isNew ? 'new' : 'dupe'}`;
      badge.textContent = isNew ? 'NEW' : 'DUPE';

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'bulk-add-row__remove';
      removeBtn.setAttribute('aria-label', `Remove ${card.playerName} from list`);
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', () => {
        stagedCards.splice(idx, 1);
        renderStaging();
      });

      row.appendChild(thumb);
      row.appendChild(info);
      row.appendChild(badge);
      row.appendChild(removeBtn);
      list.appendChild(row);
    });

    // Commit button
    const commitBtn = document.createElement('button');
    commitBtn.type = 'button';
    commitBtn.className = 'btn-primary w-full mt-4';
    commitBtn.textContent = `Add ${stagedCards.length} card${stagedCards.length > 1 ? 's' : ''} to Collection`;
    commitBtn.addEventListener('click', handleCommit);
    stagingSection.appendChild(commitBtn);
  }

  // ── Commit all staged cards ───────────────────────────────────────────────
  async function handleCommit() {
    if (stagedCards.length === 0) return;

    const confirmed = window.confirm(
      `Add ${stagedCards.length} card${stagedCards.length > 1 ? 's' : ''} to your collection?\n\n` +
      stagedCards.map(c => `• #${c.id} ${c.playerName}`).join('\n')
    );
    if (!confirmed) return;

    const binderPages = new Set();
    let newCount = 0;
    let dupeCount = 0;

    for (const card of stagedCards) {
      const { isNew } = await addCard(card.id);
      const page = Math.ceil(card.id / 9);
      if (Number.isFinite(page) && page >= 1 && page <= 70) binderPages.add(page);
      if (isNew) newCount++; else dupeCount++;
    }

    const pageList = [...binderPages].sort((a, b) => a - b).join(', ');
    showToast(
      `Added ${newCount} new${dupeCount > 0 ? ` + ${dupeCount} dupe${dupeCount > 1 ? 's' : ''}` : ''}. Binder pages: ${pageList}.`,
      'success'
    );

    stagedCards.length = 0;
    collection = await getCollection();
    renderStaging();
    input.focus();
  }

  // Initial render
  renderStaging();
}
