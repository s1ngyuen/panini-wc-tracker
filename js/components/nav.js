// js/components/nav.js
// Header navigation — split across left and right nav containers.

import { getPendingTrades } from '../store-trades.js';

const LEFT_ITEMS = [
  { id: 'collection-grid', label: 'Collection' },
];

const RIGHT_ITEMS = [
  { id: 'progress', label: 'Progress' },
  { id: 'swap',     label: 'Swaps'    },
];

const ALL_ITEMS = [...LEFT_ITEMS, ...RIGHT_ITEMS];

let _activeId    = 'collection-grid';
let _onNavigate  = null;

function makeTab(item) {
  const btn = document.createElement('button');
  btn.className = `nav-tab${item.id === _activeId ? ' active' : ''}`;
  btn.dataset.view = item.id;
  btn.type = 'button';
  btn.setAttribute('aria-label', item.label);
  btn.setAttribute('aria-pressed', item.id === _activeId ? 'true' : 'false');
  btn.textContent = item.label;

  if (item.id === 'swap') {
    const count = getPendingTrades().length;
    if (count > 0) {
      const badge = document.createElement('span');
      badge.className = 'nav-tab__badge';
      badge.textContent = count;
      btn.appendChild(badge);
    }
  }

  btn.addEventListener('click', () => {
    setActive(item.id);
    if (_onNavigate) _onNavigate(item.id);
  });
  return btn;
}

/** Call after any pending trade change to keep the badge in sync. */
export function updateSwapBadge() {
  const count = getPendingTrades().length;
  document.querySelectorAll('.nav-tab[data-view="swap"]').forEach(btn => {
    btn.querySelector('.nav-tab__badge')?.remove();
    if (count > 0) {
      const badge = document.createElement('span');
      badge.className = 'nav-tab__badge';
      badge.textContent = count;
      btn.appendChild(badge);
    }
  });
}

/**
 * Initialise the nav.
 * @param {string} activeView
 * @param {(viewId: string) => void} onNavigate
 */
export function initNav(activeView, onNavigate) {
  _activeId   = activeView;
  _onNavigate = onNavigate;

  const left  = document.getElementById('nav-left');
  const right = document.getElementById('nav-right');
  if (!left || !right) return;

  left.innerHTML  = '';
  right.innerHTML = '';

  LEFT_ITEMS.forEach(item  => left.appendChild(makeTab(item)));
  RIGHT_ITEMS.forEach(item => right.appendChild(makeTab(item)));
}

/**
 * Update the active tab highlight.
 * @param {string} viewId
 */
export function setActive(viewId) {
  _activeId = viewId;

  const containers = [
    document.getElementById('nav-left'),
    document.getElementById('nav-right'),
  ];

  containers.forEach(container => {
    if (!container) return;
    container.querySelectorAll('.nav-tab').forEach(btn => {
      const isActive = btn.dataset.view === viewId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  });
}
