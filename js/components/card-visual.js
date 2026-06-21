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
  'Chile':          '🇨🇱',
  'Colombia':       '🇨🇴',
  'Costa Rica':     '🇨🇷',
  'Croatia':        '🇭🇷',
  'Ecuador':        '🇪🇨',
  'Egypt':          '🇪🇬',
  'England':        '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'France':         '🇫🇷',
  'Germany':        '🇩🇪',
  'Ghana':          '🇬🇭',
  'Honduras':       '🇭🇳',
  'Iran':           '🇮🇷',
  'Japan':          '🇯🇵',
  'Kenya':          '🇰🇪',
  'Korea Republic': '🇰🇷',
  'Malaysia':       '🇲🇾',
  'Mali':           '🇲🇱',
  'Mexico':         '🇲🇽',
  'Morocco':        '🇲🇦',
  'Netherlands':    '🇳🇱',
  'New Zealand':    '🇳🇿',
  'Nigeria':        '🇳🇬',
  'Norway':         '🇳🇴',
  'Panama':         '🇵🇦',
  'Paraguay':       '🇵🇾',
  'Peru':           '🇵🇪',
  'Portugal':       '🇵🇹',
  'Qatar':          '🇶🇦',
  'Saudi Arabia':   '🇸🇦',
  'Senegal':        '🇸🇳',
  'Serbia':         '🇷🇸',
  'Slovenia':       '🇸🇮',
  'South Africa':   '🇿🇦',
  'Spain':          '🇪🇸',
  'Switzerland':    '🇨🇭',
  'United States':  '🇺🇸',
  'Uruguay':        '🇺🇾',
  'Venezuela':      '🇻🇪',
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
export function createCardElement(card, count) {
  const isOwned     = count >= 1;
  const isDuplicate = count >= 2;
  const isMissing   = count === 0;
  const isLight     = LIGHT_COLOUR_COUNTRIES.has(card.country);

  const wrapper = document.createElement('div');
  wrapper.className = [
    'panini-card',
    isOwned     ? 'panini-card--owned'     : '',
    isDuplicate ? 'panini-card--duplicate' : '',
    isMissing   ? 'panini-card--missing'   : '',
    isLight     ? 'card-dark-text'         : '',
  ].filter(Boolean).join(' ');

  wrapper.setAttribute('data-country', card.country);
  wrapper.setAttribute('data-card-id', card.id);
  wrapper.setAttribute('title', `#${card.id} ${card.playerName} (${card.country} — ${card.cardType})`);
  wrapper.setAttribute('role', 'img');
  wrapper.setAttribute('aria-label', `Card #${card.id}: ${card.playerName}, ${card.country}, ${card.cardType}${isMissing ? ', missing' : isDuplicate ? `, ${count} copies` : ', owned'}`);

  // Duplicate count badge (z-index above all card overlays)
  if (isDuplicate) {
    const dupeBadge = document.createElement('div');
    dupeBadge.className = 'panini-card__dupe-badge';
    dupeBadge.setAttribute('aria-hidden', 'true');
    dupeBadge.textContent = `×${count}`;
    dupeBadge.title = `You have ${count} copies — ${count - 1} available for swapping.`;
    wrapper.appendChild(dupeBadge);
  }

  // Main inner layout
  const inner = document.createElement('div');
  inner.className = 'panini-card__inner';

  // Top row
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

  // Middle: flag + country
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

  // Bottom bar: name + wordmark
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
  wrapper.appendChild(inner);

  return wrapper;
}
