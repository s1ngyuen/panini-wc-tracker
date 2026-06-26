// js/store-prices.js
// Loads prices from the static prices.json committed to the repo.

let _prices   = {};   // { "cardId": price | null }
let _currency = 'AUD';
let _updated  = '';
let _loaded   = false;

export async function loadPrices() {
  if (_loaded) return;
  try {
    const res  = await fetch('prices.json');
    if (!res.ok) return;
    const data = await res.json();
    _prices   = data.prices   ?? {};
    _currency = data.currency ?? 'AUD';
    _updated  = data.updated  ?? '';
    _loaded   = true;
  } catch { /* prices.json not found — silently skip */ }
}

export function getPrice(cardId) {
  const p = _prices[String(cardId)];
  return (p !== undefined && p !== null) ? p : null;
}

export function getCurrency() { return _currency; }
export function getUpdated()  { return _updated; }

export function getPriceSummary(cardIds) {
  let value = 0, priced = 0;
  for (const id of cardIds) {
    const p = getPrice(id);
    if (p !== null) { value += p; priced++; }
  }
  return { priced, total: cardIds.length, value, currency: _currency };
}
