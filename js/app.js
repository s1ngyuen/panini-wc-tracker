// js/app.js
// Bootstrap, password gate, and view router for Panini WC 2026 Tracker.
// NOTE: This file uses ES modules — it must be served over http://, not file://.
// Run: python3 -m http.server 8000  (then open http://localhost:8000)

import { initNav, setActive } from './components/nav.js';
import { mountCardInput }     from './views/card-input.js';
import { mountCollectionGrid } from './views/collection-grid.js';
import { mountProgress }      from './views/progress.js';
import { mountSwapAnalyser }  from './views/swap-analyser.js';
import { clearCollection, getCollection }    from './store.js';

const STORAGE_KEY = 'panini_wc_collection';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PASSWORD = 'panini2026';
const SESSION_KEY = 'panini_authed';
const DEFAULT_VIEW = 'collection-grid';

// Map view IDs to their mount functions and the container element IDs
const VIEWS = {
  'collection-grid':  { mountFn: mountCollectionGrid, containerId: 'view-collection-grid' },
  'progress':         { mountFn: mountProgress,       containerId: 'view-progress' },
  'swap':             { mountFn: mountSwapAnalyser,   containerId: 'view-swap' },
};

let activeViewId = null;

// ─────────────────────────────────────────────────────────────────────────────
// View Router
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Show a view by its ID, hiding all others.
 * Re-mounts if the view's container was previously mounted
 * (for views that need live data refresh).
 * @param {string} viewId
 */
async function showView(viewId) {
  if (!VIEWS[viewId]) return;
  activeViewId = viewId;
  setActive(viewId);

  // Hide all view containers
  Object.values(VIEWS).forEach(({ containerId }) => {
    const el = document.getElementById(containerId);
    if (el) el.hidden = true;
  });

  const { mountFn, containerId } = VIEWS[viewId];
  const container = document.getElementById(containerId);
  if (!container) return;

  container.hidden = false;

  // Scroll to top of view
  window.scrollTo({ top: 0 });

  // If view exposes a _refresh method (was already mounted), call it.
  // Otherwise, mount it fresh.
  if (container._refresh) {
    await container._refresh();
  } else {
    await mountFn(container);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Password Gate
// ─────────────────────────────────────────────────────────────────────────────

function isAuthenticated() {
  return sessionStorage.getItem(SESSION_KEY) === '1';
}

function unlockApp() {
  sessionStorage.setItem(SESSION_KEY, '1');
  const gate = document.getElementById('password-gate');
  if (gate) {
    gate.classList.add('fade-out');
    gate.addEventListener('transitionend', () => gate.remove(), { once: true });
  }
  startApp();
}

function renderPasswordGate() {
  const gate = document.getElementById('password-gate');
  if (!gate) return;

  gate.innerHTML = `
    <div style="max-width:360px; width:90%; text-align:center;">
      <div style="font-family:'Bebas Neue',sans-serif; font-size:48px; color:var(--accent-primary); letter-spacing:.04em; line-height:1; text-transform:uppercase;">WC 2026</div>
      <div style="font-family:'Open Sans',sans-serif; font-weight:700; font-size:11px; color:var(--text-muted); letter-spacing:.2em; text-transform:uppercase; margin-bottom:32px;">FIFA Adrenalyn XL</div>

      <h1 style="font-family:'Bebas Neue',sans-serif; font-size:26px; color:var(--text-primary); text-transform:uppercase; letter-spacing:.04em; margin-bottom:8px;">Your Collection Awaits</h1>
      <p style="font-size:14px; color:#666; margin-bottom:24px;">Enter your password to unlock your tracker.</p>

      <div style="margin-bottom:12px; text-align:left;">
        <label for="gate-password" style="display:block; font-size:12px; font-weight:600; color:#888; margin-bottom:6px; text-transform:uppercase; letter-spacing:.06em;">Password</label>
        <input
          id="gate-password"
          type="password"
          class="form-input"
          placeholder="Enter password"
          autocomplete="current-password"
          style=""
        />
      </div>

      <p id="gate-error" style="color:#ff4444; font-size:13px; min-height:20px; margin-bottom:8px;"></p>

      <button id="gate-submit" type="button" class="btn-primary w-full">Unlock</button>
    </div>
  `;

  const input  = gate.querySelector('#gate-password');
  const errMsg = gate.querySelector('#gate-error');
  const btn    = gate.querySelector('#gate-submit');

  function attempt() {
    const val = input.value;
    if (val === PASSWORD) {
      errMsg.textContent = '';
      unlockApp();
    } else {
      errMsg.textContent = 'Wrong password. Try again.';
      input.value = '';
      input.focus();
    }
  }

  btn.addEventListener('click', attempt);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') attempt();
  });

  // Focus password field immediately
  setTimeout(() => input.focus(), 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// Clear Collection (exposed via Settings in header)
// ─────────────────────────────────────────────────────────────────────────────

function hookClearCollection() {
  const btn = document.getElementById('clear-collection-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const confirmed = window.confirm(
      'Are you sure? This will delete your entire collection from this device.\nThis cannot be undone.'
    );
    if (!confirmed) return;
    await clearCollection();
    // Re-mount active view
    const { containerId } = VIEWS[activeViewId] || {};
    if (containerId) {
      const container = document.getElementById(containerId);
      if (container) {
        delete container._refresh;
      }
    }
    showView(activeViewId || DEFAULT_VIEW);
    // Show brief confirmation via alert (no showToast since user just cleared data)
    alert('Collection cleared. Fresh start.');
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Export / Import
// ─────────────────────────────────────────────────────────────────────────────

function hookExportImport() {
  // Export — download collection as JSON file
  document.getElementById('export-collection-btn')?.addEventListener('click', async () => {
    const data = await getCollection();
    const json = JSON.stringify(data);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'panini-collection.json' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  // Import modal
  const modal     = document.getElementById('import-modal');
  const textarea  = document.getElementById('import-json');
  const errorEl   = document.getElementById('import-error');

  document.getElementById('import-collection-btn')?.addEventListener('click', () => {
    textarea.value = '';
    errorEl.textContent = '';
    modal.style.display = 'flex';
    setTimeout(() => textarea.focus(), 50);
  });

  document.getElementById('import-cancel-btn')?.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  document.getElementById('import-confirm-btn')?.addEventListener('click', async () => {
    try {
      const parsed = JSON.parse(textarea.value.trim());
      if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid format');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      modal.style.display = 'none';
      // Refresh active view
      const { containerId } = VIEWS[activeViewId] || {};
      if (containerId) delete document.getElementById(containerId)?._refresh;
      showView(activeViewId || DEFAULT_VIEW);
      alert(`Imported ${Object.keys(parsed).length} cards successfully.`);
    } catch {
      errorEl.textContent = 'Invalid JSON — paste the exact text from your Export file.';
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// App Init
// ─────────────────────────────────────────────────────────────────────────────

async function startApp() {
  // Init nav with view router callback
  initNav(DEFAULT_VIEW, viewId => showView(viewId));

  // Hook clear collection button
  hookClearCollection();

  // Hook Add Cards modal
  const addCardsModal   = document.getElementById('add-cards-modal');
  const addCardsContent = document.getElementById('add-cards-modal-content');
  let addCardsMounted   = false;

  function openAddCards() {
    if (!addCardsMounted) {
      mountCardInput(addCardsContent);
      addCardsMounted = true;
    }
    addCardsModal.style.display = 'flex';
    addCardsModal.querySelector('input')?.focus();
  }

  document.getElementById('add-cards-btn')?.addEventListener('click', openAddCards);
  document.getElementById('add-cards-close-btn')?.addEventListener('click', () => {
    addCardsModal.style.display = 'none';
  });
  addCardsModal?.addEventListener('click', e => {
    if (e.target === addCardsModal) addCardsModal.style.display = 'none';
  });

  // Hook export / import
  hookExportImport();

  // Show default view
  await showView(DEFAULT_VIEW);
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry Point
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  if (isAuthenticated()) {
    // Already unlocked this session — remove gate and start
    const gate = document.getElementById('password-gate');
    if (gate) gate.remove();
    startApp();
  } else {
    renderPasswordGate();
  }
});
