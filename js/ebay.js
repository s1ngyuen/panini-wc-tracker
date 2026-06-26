// js/ebay.js
// eBay Finding API price fetcher via JSONP (no CORS issues).
// Requires a free eBay Developer App ID from developer.ebay.com

import { getAppId, getCachedPrice, setCachedPrice } from './store-prices.js';

const TIMEOUT_MS = 8000;
const BATCH_SIZE = 5;
const BATCH_DELAY = 200;

function buildQuery(card) {
  if (card.playerName === 'Team Crest') {
    return `panini adrenalyn xl world cup 2026 team crest ${card.country}`;
  }
  return `panini adrenalyn xl world cup 2026 ${card.playerName}`;
}

export function fetchEbayPrice(card) {
  return new Promise((resolve) => {
    const cached = getCachedPrice(card.id);
    if (cached !== undefined) { resolve(cached); return; }

    const appId = getAppId();
    if (!appId) { resolve(null); return; }

    const cbName = `_ebay_${card.id}_${Date.now()}`;
    const params = new URLSearchParams({
      'OPERATION-NAME':             'findCompletedItems',
      'SERVICE-VERSION':            '1.0.0',
      'SECURITY-APPNAME':           appId,
      'RESPONSE-DATA-FORMAT':       'JSON',
      'callback':                   cbName,
      'keywords':                   buildQuery(card),
      'itemFilter(0).name':         'SoldItemsOnly',
      'itemFilter(0).value':        'true',
      'sortOrder':                  'EndTimeSoonest',
      'paginationInput.entriesPerPage': '10',
    });

    const script = document.createElement('script');
    let done = false;

    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      delete window[cbName];
      script.remove();
      resolve(null);
    }, TIMEOUT_MS);

    window[cbName] = (data) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      delete window[cbName];
      script.remove();

      const items = data?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item ?? [];
      if (items.length === 0) {
        setCachedPrice(card.id, null);
        resolve(null);
        return;
      }

      const prices = items
        .map(i => parseFloat(i.sellingStatus?.[0]?.currentPrice?.[0]?.['__value__'] ?? 0))
        .filter(p => p > 0);

      const avg      = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
      const currency = items[0]?.sellingStatus?.[0]?.currentPrice?.[0]?.['@currencyId'] ?? 'USD';

      setCachedPrice(card.id, avg, currency);
      resolve(avg);
    };

    script.onerror = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      delete window[cbName];
      resolve(null);
    };

    script.src = `https://svcs.ebay.com/services/search/FindingService/v1?${params}`;
    document.head.appendChild(script);
  });
}

// Fetch prices for multiple cards in small batches.
// onProgress(done, total) called after each batch.
export async function fetchPricesForCards(cards, { onProgress } = {}) {
  const results = {};

  for (let i = 0; i < cards.length; i += BATCH_SIZE) {
    const batch  = cards.slice(i, i + BATCH_SIZE);
    const prices = await Promise.all(batch.map(c => fetchEbayPrice(c)));
    batch.forEach((c, j) => { results[c.id] = prices[j]; });
    onProgress?.(Math.min(i + BATCH_SIZE, cards.length), cards.length);
    if (i + BATCH_SIZE < cards.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY));
    }
  }
  return results;
}
