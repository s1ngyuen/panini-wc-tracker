// js/store-prices.js
// eBay price cache and App ID storage.

const CACHE_KEY = 'panini_ebay_prices';
const APPID_KEY = 'panini_ebay_appid';
const TTL       = 24 * 60 * 60 * 1000; // 24 hours

export function getAppId()      { return localStorage.getItem(APPID_KEY) || ''; }
export function setAppId(id)    { localStorage.setItem(APPID_KEY, id.trim()); }

// Returns: undefined = not cached / expired, null = cached but no listings, number = avg price
export function getCachedPrice(cardId) {
  const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  const entry = cache[String(cardId)];
  if (!entry) return undefined;
  if (Date.now() - entry.ts > TTL) return undefined;
  return entry.price;
}

export function getCachedCurrency(cardId) {
  const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  return cache[String(cardId)]?.currency ?? 'USD';
}

export function setCachedPrice(cardId, price, currency = 'USD') {
  const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  cache[String(cardId)] = { price, currency, ts: Date.now() };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export function clearPriceCache() {
  localStorage.removeItem(CACHE_KEY);
}

// Returns { priced, total, value, currency } for a set of cardIds
export function getPriceSummary(cardIds) {
  const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  let value    = 0;
  let priced   = 0;
  let currency = 'AUD';

  for (const id of cardIds) {
    const entry = cache[String(id)];
    if (!entry || Date.now() - entry.ts > TTL) continue;
    if (entry.price !== null && entry.price > 0) {
      value   += entry.price;
      currency = entry.currency;
      priced++;
    }
  }
  return { priced, total: cardIds.length, value, currency };
}
