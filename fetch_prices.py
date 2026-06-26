#!/usr/bin/env python3
"""
One-time eBay price fetch for Panini WC 2026 Adrenalyn XL cards.
Saves results to prices.json — commit that file and you're done.

Usage:
  python3 fetch_prices.py YOUR-EBAY-APP-ID
"""

import sys, re, json, time, requests
from datetime import datetime

APP_ID = sys.argv[1] if len(sys.argv) > 1 else ''
if not APP_ID:
    print('Usage: python3 fetch_prices.py YOUR-EBAY-APP-ID')
    sys.exit(1)

# ── Parse card list from JS source ──────────────────────────────────────────
with open('js/cards-data.js', 'r') as f:
    src = f.read()

cards = []
for m in re.finditer(
    r'\{\s*id:\s*(\d+),\s*playerName:\s*"([^"]+)",\s*country:\s*"([^"]+)",\s*cardType:\s*"([^"]+)"',
    src
):
    cards.append({
        'id':         int(m.group(1)),
        'playerName': m.group(2),
        'country':    m.group(3),
        'cardType':   m.group(4),
    })

print(f'Loaded {len(cards)} cards\n')

# ── eBay search ──────────────────────────────────────────────────────────────
def build_query(card):
    if card['playerName'] == 'Team Crest':
        return f"panini adrenalyn xl world cup 2026 team crest {card['country']}"
    return f"panini adrenalyn xl world cup 2026 {card['playerName']}"

def fetch_price(card):
    params = {
        'OPERATION-NAME':             'findCompletedItems',
        'SERVICE-VERSION':            '1.0.0',
        'SECURITY-APPNAME':           APP_ID,
        'RESPONSE-DATA-FORMAT':       'JSON',
        'keywords':                   build_query(card),
        'itemFilter(0).name':         'SoldItemsOnly',
        'itemFilter(0).value':        'true',
        'sortOrder':                  'EndTimeSoonest',
        'paginationInput.entriesPerPage': '10',
    }
    try:
        resp  = requests.get(
            'https://svcs.ebay.com/services/search/FindingService/v1',
            params=params, timeout=12
        )
        data  = resp.json()
        items = (data.get('findCompletedItemsResponse', [{}])[0]
                     .get('searchResult', [{}])[0]
                     .get('item', []))
        if not items:
            return None, 'AUD'

        prices = []
        for item in items:
            try:
                p = float(item['sellingStatus'][0]['currentPrice'][0]['__value__'])
                if p > 0:
                    prices.append(p)
            except (KeyError, IndexError, ValueError):
                pass

        if not prices:
            return None, 'AUD'

        avg      = round(sum(prices) / len(prices), 2)
        currency = items[0]['sellingStatus'][0]['currentPrice'][0].get('@currencyId', 'AUD')
        return avg, currency

    except Exception as e:
        print(f'  error: {e}')
        return None, 'AUD'

# ── Fetch all cards ──────────────────────────────────────────────────────────
prices   = {}
currency = 'AUD'

for i, card in enumerate(cards, 1):
    price, cur = fetch_price(card)
    prices[str(card['id'])] = price
    currency = cur or currency
    tag = f"${price:.2f} {cur}" if price else "—"
    print(f"[{i:>3}/{len(cards)}] #{card['id']:>3}  {card['playerName']:<30}  {tag}")
    time.sleep(0.1)   # 10 req/s — well within rate limits

# ── Write output ─────────────────────────────────────────────────────────────
out = {
    'updated':  datetime.now().strftime('%Y-%m-%d'),
    'currency': currency,
    'prices':   prices,
}
with open('prices.json', 'w') as f:
    json.dump(out, f)

priced = sum(1 for p in prices.values() if p is not None)
total  = sum(p for p in prices.values() if p is not None)
print(f'\n✓ Done: {priced}/{len(cards)} cards priced  |  Total value: ${total:.2f} {currency}')
print('  Commit prices.json and push — no more API calls needed.')
