// js/components/nav.js
// Fixed bottom navigation tab bar.

const NAV_ITEMS = [
  {
    id: 'card-input',
    label: 'Add Cards',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2"/>
      <line x1="12" y1="9" x2="12" y2="15"/>
      <line x1="9" y1="12" x2="15" y2="12"/>
    </svg>`,
  },
  {
    id: 'collection-grid',
    label: 'Collection',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>`,
  },
  {
    id: 'progress',
    label: 'Progress',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>`,
  },
  {
    id: 'missing',
    label: 'Missing',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <circle cx="12" cy="16" r="0.5" fill="currentColor"/>
    </svg>`,
  },
  {
    id: 'swap',
    label: 'Swaps',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M7 16V4m0 0L3 8m4-4l4 4"/>
      <path d="M17 8v12m0 0l4-4m-4 4l-4-4"/>
    </svg>`,
  },
];

let _activeId = 'card-input';
let _onNavigate = null;

/**
 * Initialise the bottom nav bar.
 * @param {string} activeView - initial active view id
 * @param {(viewId: string) => void} onNavigate - callback when a tab is clicked
 */
export function initNav(activeView, onNavigate) {
  _activeId = activeView;
  _onNavigate = onNavigate;

  const nav = document.getElementById('bottom-nav');
  if (!nav) return;

  nav.innerHTML = '';

  NAV_ITEMS.forEach(item => {
    const btn = document.createElement('button');
    btn.className = `nav-tab${item.id === _activeId ? ' active' : ''}`;
    btn.setAttribute('data-view', item.id);
    btn.setAttribute('aria-label', item.label);
    btn.setAttribute('aria-pressed', item.id === _activeId ? 'true' : 'false');
    btn.setAttribute('type', 'button');
    btn.innerHTML = `${item.icon}<span>${item.label}</span>`;

    btn.addEventListener('click', () => {
      setActive(item.id);
      if (_onNavigate) _onNavigate(item.id);
    });

    nav.appendChild(btn);
  });
}

/**
 * Update the active tab highlight without re-rendering the whole nav.
 * @param {string} viewId
 */
export function setActive(viewId) {
  _activeId = viewId;
  const nav = document.getElementById('bottom-nav');
  if (!nav) return;

  nav.querySelectorAll('.nav-tab').forEach(btn => {
    const isActive = btn.dataset.view === viewId;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}
