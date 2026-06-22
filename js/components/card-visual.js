// js/components/card-visual.js
// Renders a single Adrenalyn XL-style Panini card as a DOM element.

// Countries whose team colour is light — text in card middle must be dark.
const LIGHT_COLOUR_COUNTRIES = new Set([
  'Australia',   // #FFD700
  'Colombia',    // #FCD116
  'Ecuador',     // #FFD100
  'Germany',     // #FFCC00
]);

// Flag emoji map using Unicode regional indicator sequences
const FLAG_EMOJI = {
  'Algeria':        '🇩🇿',
  'Argentina':      '🇦🇷',
  'Australia':      '🇦🇺',
  'Austria':        '🇦🇹',
  'Belgium':        '🇧🇪',
  'Brazil':         '🇧🇷',
  'Canada':         '🇨🇦',
  'Cape Verde':     '🇨🇻',
  'Colombia':       '🇨🇴',
  'Croatia':        '🇭🇷',
  'Curaçao':        '🇨🇼',
  'Ecuador':        '🇪🇨',
  'Egypt':          '🇪🇬',
  'England':        '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'France':         '🇫🇷',
  'Germany':        '🇩🇪',
  'Ghana':          '🇬🇭',
  'Haiti':          '🇭🇹',
  'Iran':           '🇮🇷',
  'Ivory Coast':    '🇨🇮',
  'Japan':          '🇯🇵',
  'Jordan':         '🇯🇴',
  'Korea Republic': '🇰🇷',
  'Mexico':         '🇲🇽',
  'Morocco':        '🇲🇦',
  'Netherlands':    '🇳🇱',
  'New Zealand':    '🇳🇿',
  'Norway':         '🇳🇴',
  'Panama':         '🇵🇦',
  'Paraguay':       '🇵🇾',
  'Portugal':       '🇵🇹',
  'Qatar':          '🇶🇦',
  'Saudi Arabia':   '🇸🇦',
  'Scotland':       '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Senegal':        '🇸🇳',
  'South Africa':   '🇿🇦',
  'Spain':          '🇪🇸',
  'Switzerland':    '🇨🇭',
  'Tunisia':        '🇹🇳',
  'United States':  '🇺🇸',
  'Uruguay':        '🇺🇾',
  'Uzbekistan':     '🇺🇿',
  // Non-team entries
  'Contenders':     '⚽',
  'Denmark':        '🇩🇰',
  'Italy':          '🇮🇹',
  'Jamaica':        '🇯🇲',
  'Poland':         '🇵🇱',
  'Sweden':         '🇸🇪',
  'Turkey':         '🇹🇷',
  '-':              '🏆',
};

/**
 * Convert a card type string to a CSS class suffix.
 * e.g. "Fan Favourite" → "fan-favourite"
 * @param {string} cardType
 * @returns {string}
 */
function typeToClass(cardType) {
  return cardType.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Creates and returns a .panini-card DOM element.
 *
 * @param {{ id: number, playerName: string, country: string, cardType: string }} card
 * @param {number} count - Number of copies owned (0 = missing, 1 = owned, 2+ = duplicate)
 * @returns {HTMLElement}
 */
export function createCardElement(card, count, { isPending = false } = {}) {
  const isOwned     = count >= 1;
  const isDuplicate = count >= 2;
  const isMissing   = count === 0;

  // Outer wrap has no overflow:hidden so the badge can hang outside
  const outer = document.createElement('div');
  outer.className = 'panini-card-outer';
  outer.setAttribute('role', 'img');
  outer.setAttribute('aria-label', `Card #${card.id}: ${card.playerName}, ${card.country}, ${card.cardType}${isMissing ? ', missing' : isDuplicate ? `, ${count} copies` : ', owned'}`);

  const card_el = document.createElement('div');
  card_el.className = [
    'panini-card',
    isOwned     ? 'panini-card--owned'     : '',
    isDuplicate ? 'panini-card--duplicate' : '',
    isMissing   ? 'panini-card--missing'   : '',
  ].filter(Boolean).join(' ');

  card_el.setAttribute('data-country', card.country);
  card_el.setAttribute('data-card-id', card.id);
  card_el.setAttribute('title', `#${card.id} ${card.playerName} (${card.country} — ${card.cardType})`);

  // Real card photo
  const img = document.createElement('img');
  img.className = 'panini-card__photo';
  img.src = `assets/cards/${card.id}.jpg`;
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  img.loading = 'lazy';
  img.onerror = () => {
    img.style.display = 'none';
    card_el.classList.add('panini-card--no-photo');
    card_el.appendChild(buildFallbackInner(card));
  };
  card_el.appendChild(img);
  outer.appendChild(card_el);

  // Duplicate badge sits on the outer wrapper — never clipped
  if (isDuplicate) {
    const dupeBadge = document.createElement('div');
    dupeBadge.className = 'panini-card__dupe-badge';
    dupeBadge.setAttribute('aria-hidden', 'true');
    dupeBadge.textContent = `×${count}`;
    dupeBadge.title = `You have ${count} copies — ${count - 1} available for swapping.`;
    outer.appendChild(dupeBadge);
  }

  // Pending badge — card is locked in a pending trade
  if (isPending) {
    const pendingBadge = document.createElement('div');
    pendingBadge.className = 'panini-card__pending-badge';
    pendingBadge.setAttribute('aria-hidden', 'true');
    pendingBadge.textContent = 'PENDING';
    pendingBadge.title = 'This card is locked in a pending trade.';
    outer.appendChild(pendingBadge);
  }

  return outer;
}

function buildFallbackInner(card) {
  const isLight = LIGHT_COLOUR_COUNTRIES.has(card.country);
  const inner = document.createElement('div');
  inner.className = 'panini-card__inner' + (isLight ? ' card-dark-text' : '');

  const top = document.createElement('div');
  top.className = 'panini-card__top';
  top.setAttribute('aria-hidden', 'true');
  const numEl = document.createElement('span');
  numEl.className = 'panini-card__number';
  numEl.textContent = `#${card.id}`;
  const badgeEl = document.createElement('span');
  badgeEl.className = `panini-card__type-badge panini-card__type-badge--${typeToClass(card.cardType)}`;
  badgeEl.textContent = card.cardType;
  top.appendChild(numEl);
  top.appendChild(badgeEl);

  const middle = document.createElement('div');
  middle.className = 'panini-card__middle';
  middle.setAttribute('aria-hidden', 'true');
  const flagEl = document.createElement('span');
  flagEl.className = 'panini-card__flag';
  flagEl.textContent = FLAG_EMOJI[card.country] || '🏳';
  const countryEl = document.createElement('span');
  countryEl.className = 'panini-card__country';
  countryEl.textContent = card.country;
  middle.appendChild(flagEl);
  middle.appendChild(countryEl);

  const bottom = document.createElement('div');
  bottom.className = 'panini-card__bottom';
  bottom.setAttribute('aria-hidden', 'true');
  const nameEl = document.createElement('div');
  nameEl.className = 'panini-card__name';
  nameEl.textContent = card.playerName;
  const wordmarkEl = document.createElement('div');
  wordmarkEl.className = 'panini-card__wordmark';
  wordmarkEl.textContent = 'PANINI';
  bottom.appendChild(nameEl);
  bottom.appendChild(wordmarkEl);

  inner.appendChild(top);
  inner.appendChild(middle);
  inner.appendChild(bottom);
  return inner;
}
