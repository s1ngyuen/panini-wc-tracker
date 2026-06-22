// js/views/card-input.js
// Card Input view — search and add cards by ID or name.

import { CARDS, CARDS_BY_ID } from '../cards-data.js';
import { addCard, removeCard } from '../store.js';
import { showToast } from '../components/toast.js';
import { createCardElement } from '../components/card-visual.js';

// Module-level ref so we can remove the outside-click listener on remount
let _outsideClickHandler = null;

/**
 * Mount the Card Input view.
 * @param {HTMLElement} container - The view's root div
 */
export function mountCardInput(container) {
  container.innerHTML = '';

  // ── Heading ─────────────────────────────────────────────────────────────
  const heading = document.createElement('div');
  heading.className = 'px-4 pt-6 pb-2';
  heading.innerHTML = `
    <div class="section-heading-wrap">
      <div class="section-heading-bar"></div>
      <span class="fx" style="font-size:32px; text-transform:uppercase; letter-spacing:.04em; color:var(--text-primary); line-height:1;">Add Cards</span>
    </div>
    <p class="section-sub">Type a number or player name</p>
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
  input.setAttribute('aria-describedby', 'card-input-hint');

  const hint = document.createElement('p');
  hint.id = 'card-input-hint';
  hint.className = 'form-hint';
  hint.textContent = 'Accepts any card ID (1–630) or a player name. Partial names work too.';

  // Dropdown for multiple matches
  const dropdown = document.createElement('div');
  dropdown.className = 'search-dropdown mt-1';
  dropdown.hidden = true;
  dropdown.setAttribute('role', 'listbox');
  dropdown.setAttribute('aria-label', 'Matching cards');

  inputWrap.appendChild(input);
  inputWrap.appendChild(dropdown);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn-primary w-full mt-3';
  addBtn.textContent = 'Add to Collection';
  addBtn.setAttribute('aria-label', 'Add card to collection');

  formWrap.appendChild(label);
  formWrap.appendChild(inputWrap);
  formWrap.appendChild(hint);
  formWrap.appendChild(addBtn);
  container.appendChild(formWrap);

  // ── Last added card preview ──────────────────────────────────────────────
  const previewSection = document.createElement('div');
  previewSection.className = 'px-4 py-4';
  previewSection.id = 'last-added-preview';

  const emptyState = document.createElement('p');
  emptyState.className = 'text-center py-8 text-sm';
  emptyState.style.color = 'var(--text-muted)';
  emptyState.textContent = 'Open a pack and start typing.';
  previewSection.appendChild(emptyState);
  container.appendChild(previewSection);

  // ── State ────────────────────────────────────────────────────────────────
  let selectedCard = null;

  // ── Fuzzy search logic ───────────────────────────────────────────────────
  function searchCards(query) {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    const numeric = Number(trimmed);
    if (!isNaN(numeric) && Number.isInteger(numeric)) {
      // Exact numeric ID lookup
      const found = CARDS_BY_ID[numeric];
      return found ? [found] : [];
    }

    const lower = trimmed.toLowerCase();
    // Exact name match first, then includes fallback
    const exact    = CARDS.filter(c => c.playerName.toLowerCase() === lower);
    if (exact.length) return exact;
    const partial  = CARDS.filter(c => c.playerName.toLowerCase().includes(lower));
    return partial.slice(0, 8); // cap dropdown at 8
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
      item.setAttribute('data-card-id', card.id);

      const idSpan = document.createElement('span');
      idSpan.className = 'search-dropdown-item__id';
      idSpan.textContent = `#${card.id}`;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'font-semibold text-sm';
      nameSpan.textContent = card.playerName;

      const metaSpan = document.createElement('span');
      metaSpan.className = 'text-xs ml-auto';
      metaSpan.style.color = '#666';
      metaSpan.textContent = `${card.country}`;

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
      item.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectItem();
        }
      });

      dropdown.appendChild(item);
    });

    dropdown.hidden = false;
  }

  // ── Input events ─────────────────────────────────────────────────────────
  input.addEventListener('input', () => {
    const val = input.value;
    if (val.trim().length < 2) {
      dropdown.hidden = true;
      selectedCard = null;
      return;
    }
    const results = searchCards(val);
    if (results.length === 1) {
      selectedCard = results[0];
    } else {
      selectedCard = null;
    }
    updateDropdown(results);
  });

  // Close dropdown on Escape
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      dropdown.hidden = true;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
    if (e.key === 'ArrowDown' && !dropdown.hidden) {
      e.preventDefault();
      const first = dropdown.querySelector('.search-dropdown-item');
      if (first) first.focus();
    }
  });

  // Close dropdown when clicking outside — remove previous listener first to prevent accumulation
  if (_outsideClickHandler) {
    document.removeEventListener('click', _outsideClickHandler);
  }
  _outsideClickHandler = e => {
    if (!formWrap.contains(e.target)) {
      dropdown.hidden = true;
    }
  };
  document.addEventListener('click', _outsideClickHandler);

  // ── Add card handler ──────────────────────────────────────────────────────
  async function handleAdd() {
    const query = input.value.trim();

    if (!query) {
      showToast('Enter a card number or player name.', 'error');
      return;
    }
    if (query.length < 2) {
      showToast('Enter at least 2 characters to search.', 'error');
      return;
    }

    // Validate numeric range
    const numeric = Number(query);
    if (!isNaN(numeric) && Number.isInteger(numeric)) {
      if (numeric < 1 || numeric > 630) {
        showToast('Card numbers run from 1 to 630.', 'error');
        return;
      }
    }

    // Resolve card
    let card = selectedCard;
    if (!card) {
      const results = searchCards(query);
      if (results.length === 0) {
        showToast(`No card found for "${query}". Check the number or spelling and try again.`, 'error');
        return;
      }
      if (results.length > 1) {
        updateDropdown(results);
        showToast('Multiple matches — pick one from the list.', 'info');
        return;
      }
      card = results[0];
    }

    // Add to store
    const { count, isNew } = await addCard(card.id);

    // Toast feedback
    const binderPage = Math.ceil(card.id / 9);
    if (isNew) {
      showToast(`New card! #${card.id} ${card.playerName} → Binder page ${binderPage}.`, 'success');
    } else {
      showToast(`Dupe! You already have #${card.id} ${card.playerName}. Copy #${count} recorded.`, 'warning');
    }

    // Update last-added preview
    renderLastAdded(card, count);

    // Reset input
    input.value = '';
    selectedCard = null;
    dropdown.hidden = true;
    input.focus();
  }

  addBtn.addEventListener('click', handleAdd);

  // ── Render last-added card ────────────────────────────────────────────────
  function renderLastAdded(card, count) {
    previewSection.innerHTML = '';

    const label = document.createElement('p');
    label.className = 'form-label';
    label.textContent = 'Last added:';

    // Binder page callout
    const binderPage = Math.ceil(card.id / 9);
    const pageCallout = document.createElement('div');
    pageCallout.className = 'binder-page-callout';
    pageCallout.innerHTML = `
      <span class="binder-page-callout__label">Binder page</span>
      <span class="binder-page-callout__num">${binderPage}</span>
    `;

    const cardWrap = document.createElement('div');
    cardWrap.className = 'flex justify-center';
    const cardEl = createCardElement(card, count);
    cardWrap.appendChild(cardEl);

    const undoWrap = document.createElement('div');
    undoWrap.className = 'flex justify-center mt-3';

    const undoBtn = document.createElement('button');
    undoBtn.type = 'button';
    undoBtn.className = 'btn-secondary';
    undoBtn.setAttribute('aria-label', `Remove one copy of card #${card.id}`);
    undoBtn.textContent = '− Undo (remove one)';

    undoBtn.addEventListener('click', async () => {
      const { count: newCount } = await removeCard(card.id);
      if (newCount === 0) {
        showToast(`#${card.id} ${card.playerName} removed from collection.`, 'info');
        previewSection.innerHTML = '';
        const msg = document.createElement('p');
        msg.className = 'text-center py-8 text-sm';
        msg.style.color = '#555';
        msg.textContent = 'Card removed from collection.';
        previewSection.appendChild(msg);
      } else {
        showToast(`Removed one. You now have ${newCount}× #${card.id}.`, 'info');
        renderLastAdded(card, newCount);
      }
    });

    undoWrap.appendChild(undoBtn);
    previewSection.appendChild(label);
    previewSection.appendChild(pageCallout);
    previewSection.appendChild(cardWrap);
    previewSection.appendChild(undoWrap);
  }
}
