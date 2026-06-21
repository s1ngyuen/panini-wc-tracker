// js/store.js
// Async-compatible storage abstraction for the Panini WC 2026 Tracker.
// v1: synchronous localStorage wrapper.
// v2 migration: swap only this file for a Supabase implementation.

const STORAGE_KEY = 'panini_wc_collection';

/**
 * Load raw collection object from localStorage.
 * Returns plain object { [cardId]: count }.
 * @returns {{ [key: string]: number }}
 */
function _load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Persist the collection object to localStorage.
 * @param {{ [key: string]: number }} data
 */
function _save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('panini-wc-tracker: localStorage write failed', e);
  }
}

/**
 * Returns the full collection map: { [cardId]: count }
 * count 0 = not owned, 1 = owned once, 2+ = duplicate available.
 * @returns {Promise<{ [key: string]: number }>}
 */
export async function getCollection() {
  return _load();
}

/**
 * Adds one copy of cardId to the collection.
 * @param {number} cardId
 * @returns {Promise<{ count: number, isNew: boolean }>}
 */
export async function addCard(cardId) {
  const data = _load();
  const key = String(cardId);
  const prev = data[key] ?? 0;
  const count = prev + 1;
  data[key] = count;
  _save(data);
  return { count, isNew: prev === 0 };
}

/**
 * Decrements count for cardId (minimum 0).
 * @param {number} cardId
 * @returns {Promise<{ count: number }>}
 */
export async function removeCard(cardId) {
  const data = _load();
  const key = String(cardId);
  const prev = data[key] ?? 0;
  const count = Math.max(0, prev - 1);
  if (count === 0) {
    delete data[key];
  } else {
    data[key] = count;
  }
  _save(data);
  return { count };
}

/**
 * Returns the count for a single card. 0 if not owned.
 * @param {number} cardId
 * @returns {Promise<number>}
 */
export async function getCount(cardId) {
  const data = _load();
  return data[String(cardId)] ?? 0;
}

/**
 * Sets the count for a cardId directly (for bulk import / corrections).
 * @param {number} cardId
 * @param {number} count
 * @returns {Promise<void>}
 */
export async function setCardCount(cardId, count) {
  const data = _load();
  const key = String(cardId);
  if (count <= 0) {
    delete data[key];
  } else {
    data[key] = count;
  }
  _save(data);
}

/**
 * Returns cards with count === 0 (not owned).
 * @param {Array<{id: number, playerName: string, country: string, cardType: string}>} allCards
 * @returns {Promise<Array>}
 */
export async function getMissing(allCards) {
  const data = _load();
  return allCards.filter(c => (data[String(c.id)] ?? 0) === 0);
}

/**
 * Returns cards with count > 1 (spare copies available for swapping).
 * @param {Array<{id: number, playerName: string, country: string, cardType: string}>} allCards
 * @returns {Promise<Array>}
 */
export async function getDuplicates(allCards) {
  const data = _load();
  return allCards.filter(c => (data[String(c.id)] ?? 0) > 1);
}

/**
 * Clears the entire collection (with confirmation guard in the caller).
 * @returns {Promise<void>}
 */
export async function clearCollection() {
  _save({});
}
