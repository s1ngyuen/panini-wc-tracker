// js/store-trades.js — CRUD for pending trades in localStorage.

const TRADES_KEY = 'panini_pending_trades';

function _load() {
  try { return JSON.parse(localStorage.getItem(TRADES_KEY) || '[]'); }
  catch { return []; }
}

function _save(trades) {
  localStorage.setItem(TRADES_KEY, JSON.stringify(trades));
}

export function getPendingTrades() { return _load(); }

export function addPendingTrade(trade) {
  const trades = _load();
  trades.unshift(trade);
  _save(trades);
}

export function updatePendingTrade(id, updates) {
  _save(_load().map(t => t.id === id ? { ...t, ...updates } : t));
}

export function removePendingTrade(id) {
  _save(_load().filter(t => t.id !== id));
}

/** Returns a Set of card IDs locked in pending iGive lists. */
export function getLockedCardIds() {
  return new Set(_load().flatMap(t => t.iGive ?? []));
}
