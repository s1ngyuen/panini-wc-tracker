// js/components/nav.js
// Header navigation — split across left and right nav containers.

const LEFT_ITEMS = [];

const RIGHT_ITEMS = [
  { id: 'collection-grid', label: 'Collection' },
  { id: 'progress',        label: 'Progress'   },
  { id: 'missing',         label: 'Missing'    },
  { id: 'swap',            label: 'Swaps'      },
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
  btn.addEventListener('click', () => {
    setActive(item.id);
    if (_onNavigate) _onNavigate(item.id);
  });
  return btn;
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
