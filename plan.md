# Technical Plan: Panini World Cup Tracker

**Date:** 2026-06-19
**Status:** Approved for build

---

## 1. Tech Stack Confirmation

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Plain HTML + Tailwind CSS (CDN) | No build step needed; single collector app with no routing complexity |
| Logic | Vanilla JS (ES modules, `type="module"`) | ES modules give clean import/export without a bundler; async store API future-proofs migration |
| State / Storage | `localStorage` via `store.js` abstraction | Abstraction layer allows drop-in Supabase swap in v2 with zero UI changes |
| Card data | Static `cards-data.js` baked in at project setup | 630 cards never change; no API call needed at runtime |
| Hosting (v1) | Local filesystem (`file://` compatible) or any static host | No server-side code; any CDN or local open will work |

No framework, no bundler, no npm required for v1.

---

## 2. File & Folder Structure

```
panini-wc-tracker/
├── brief.md
├── plan.md
├── content.md                   ← produced by content-writer agent
├── index.html                   ← single entry point; hosts all views
├── js/
│   ├── cards-data.js            ← static 630-card array (baked in)
│   ├── store.js                 ← async storage abstraction
│   ├── app.js                   ← bootstrap, password gate, view router
│   ├── views/
│   │   ├── card-input.js        ← Card Input view logic
│   │   ├── collection-grid.js   ← Collection Grid view logic
│   │   ├── progress.js          ← Progress view logic
│   │   ├── missing-cards.js     ← Missing Cards view logic
│   │   └── swap-analyser.js     ← Swap Analyser view logic
│   └── components/
│       ├── card-visual.js       ← renders a single CSS Adrenalyn XL card
│       ├── nav.js               ← bottom/top nav tab switcher
│       ├── toast.js             ← "New card!" / "Duplicate!" notification
│       └── filters.js           ← team + card type filter bar (shared)
├── css/
│   └── app.css                  ← custom CSS only: card visual template, flag sprites, animations
└── references/                  ← screenshots and reference images
```

`index.html` contains one `<div id="app">` root plus one `<div>` per view (all hidden by default). The JS view router shows/hides views — no page reloads.

---

## 3. Component / View Breakdown

### Views (one logical screen each)

| View | File | Purpose |
|---|---|---|
| Password Gate | inline in `app.js` | Full-screen overlay; hardcoded password check; dismissed on correct entry; stored in `sessionStorage` so refresh re-prompts |
| Card Input | `views/card-input.js` | Search/add cards by name or ID; shows result toast; updates store |
| Collection Grid | `views/collection-grid.js` | 630-card visual grid; filter by team and card type; status badge per card |
| Progress | `views/progress.js` | Overall % bar; team-by-team table; card-type breakdown |
| Missing Cards | `views/missing-cards.js` | Filtered list of uncollected cards; copy-to-clipboard export |
| Swap Analyser | `views/swap-analyser.js` | Two textareas (partner haves / partner wants); runs match algorithm; displays trade suggestions; copy export |

### Shared Components

| Component | File | Used By | Props / Inputs | Behaviour |
|---|---|---|---|---|
| Nav | `components/nav.js` | All views | `activeView` string | Tab bar with 5 nav items; updates active state; calls view router |
| CardVisual | `components/card-visual.js` | Collection Grid, Card Input result | `card` object, `status` (`owned`/`duplicate`/`missing`) | Renders CSS Adrenalyn XL card; applies team colour via data attribute; shows number, type label, country flag emoji, player name bar |
| Toast | `components/toast.js` | Card Input | `message` string, `type` (`success`/`warning`/`info`) | Slides in for 2.5s; auto-dismisses; stacks if rapid input |
| FilterBar | `components/filters.js` | Collection Grid, Missing Cards | `teams[]`, `cardTypes[]`, `onFilter` callback | Dropdowns/chips for team + card type; emits filter state |

### Layout (inline in `index.html`)

- Fixed top header with logo/title
- Scrollable content area per view
- Fixed bottom nav bar (mobile-first)

---

## 4. `store.js` API Design

All functions are `async` even though v1 bodies are synchronous localStorage wrappers. The call sites in view files must always `await` them so that swapping in a Supabase implementation requires only `store.js` changes.

```js
// store.js — public API

/**
 * Returns the full collection map: { [cardId: number]: count: number }
 * count 0 = not owned, 1 = owned once, 2+ = duplicates available
 */
export async function getCollection() {}

/**
 * Adds one copy of cardId to the collection.
 * Returns { isNew: boolean, count: number }
 * isNew = true if this is the first copy (count went from 0 to 1)
 */
export async function addCard(cardId) {}

/**
 * Sets the count for a cardId directly (used for bulk import / corrections).
 */
export async function setCardCount(cardId, count) {}

/**
 * Returns the count for a single card. 0 if not owned.
 */
export async function getCardCount(cardId) {}

/**
 * Clears the entire collection (with confirmation guard in caller).
 */
export async function clearCollection() {}

// Internal helpers (not exported):
// _load()  → parses localStorage JSON → returns plain object
// _save(data) → JSON.stringifies and writes to localStorage
```

localStorage key: `panini_wc_collection` — stores `{ [cardId]: count }` JSON object.

---

## 5. `cards-data.js` Structure

```js
// js/cards-data.js
// Auto-generated from collectosk.com data. Do not edit manually.
// 630 cards total across 42 teams.

export const CARDS = [
  // { id, playerName, country, cardType }
  { id: 1,   playerName: "Example Player", country: "Argentina", cardType: "Hero" },
  // ... 629 more entries
];

// Derived lookup map for O(1) access by card ID
export const CARDS_BY_ID = Object.fromEntries(CARDS.map(c => [c.id, c]));

// All unique team names (42 teams), sorted alphabetically
export const TEAMS = [...new Set(CARDS.map(c => c.country))].sort();

// All card type enum values (canonical order for display)
export const CARD_TYPES = [
  "Hero",
  "Icon",
  "Fan Favourite",
  "Team Logo",
  "Golden Baller",
  "Contender",
  "Master Rookie",
  "Top Keeper",
  "Defensive Rock",
  "Midfield Maestro",
  "Goal Machine",
  "Mascot",
];
```

Card type distribution per team:
- 12 base cards per team: 1 Fan Favourite + 1 Team Logo + 1 Icon + 9 Heroes
- Special cards (Golden Baller, Contender, Master Rookie, Top Keeper, Defensive Rock, Midfield Maestro, Goal Machine, Mascot) distributed across teams in the remaining IDs up to 630

---

## 6. Swap Analyser Algorithm

**Inputs:**
- `partnerHaves` — raw text from textarea (one card name or ID per line)
- `partnerWants` — raw text from textarea (one card name or ID per line)

**Algorithm outline:**

```
function runSwapAnalysis(partnerHavesText, partnerWantsText, collection, cards):

  1. PARSE inputs
     - tokenise each line; for each token:
       - if numeric → look up in CARDS_BY_ID
       - if text → fuzzy match against CARDS[].playerName (case-insensitive, trimmed)
       - collect matched Card objects; log unmatched tokens for display

  2. BUILD user state sets
     - userDuplicates = cards where collection[id] >= 2   (cards user can give away)
     - userMissing    = cards where collection[id] === 0  (cards user wants)

  3. COMPUTE trade legs
     - offersFromPartner = partnerHaves ∩ userMissing
       → cards partner has that user needs — user should REQUEST these
     - offersToPartner   = partnerWants ∩ userDuplicates
       → cards partner wants that user has spare — user can GIVE these

  4. BALANCE (optional v1 heuristic)
     - Count each leg. Flag if heavily unbalanced (e.g. partner wants 10, user wants 2).
     - No forced 1-for-1 enforcement in v1 — just present both lists.

  5. OUTPUT object:
     {
       youGet:    Card[],   // offersFromPartner
       youGive:   Card[],   // offersToPartner
       unmatched: string[], // tokens that couldn't be resolved
     }
```

**Text parsing rules:**
- Split on newline, comma, or semicolon
- Strip leading/trailing whitespace and punctuation
- Numeric tokens: direct CARDS_BY_ID lookup
- Text tokens: `String.prototype.toLowerCase()` comparison against `playerName.toLowerCase()`; if no exact match, try `includes()` match; return first hit or mark unmatched
- Duplicate tokens in input are deduplicated

**Export format (plain text for Messenger):**
```
--- CARDS I WANT FROM YOU ---
#12 Lionel Messi (Argentina — Icon)
#45 Kylian Mbappe (France — Hero)

--- CARDS I CAN GIVE YOU ---
#78 Vinicius Jr (Brazil — Hero)
#201 Pedri (Spain — Midfield Maestro)
```

---

## 7. Build Order for Frontend-Developer Agent

Tasks are numbered sequentially. Tasks at the same number can be built in parallel.

### Phase 1 — Foundation (must complete before anything else)

**Task 1.1** — Create `index.html`
- Full-page shell: `<head>` with Tailwind CDN, `app.css` link, `<body>` with `#app` root div, all five view container divs (`id="view-card-input"`, `id="view-collection-grid"`, `id="view-progress"`, `id="view-missing"`, `id="view-swap"`), all hidden initially
- Import `js/app.js` as `type="module"`
- Fixed header and fixed bottom nav placeholder (nav.js will populate)

**Task 1.2** — Create `js/cards-data.js`
- Populate the full 630-card `CARDS` array from collectosk.com data
- Export `CARDS`, `CARDS_BY_ID`, `TEAMS`, `CARD_TYPES` as specified in section 5
- This is a data-only file; no logic

**Task 1.3** — Create `js/store.js`
- Implement all five async functions from section 4
- localStorage key `panini_wc_collection`
- v1 bodies are synchronous wrappers; async signatures are mandatory

### Phase 2 — Core Infrastructure (after Phase 1)

**Task 2.1** — Create `js/components/nav.js`
- Renders 5 tab items into the `#nav` element
- Manages `active` highlight class
- Exports `initNav(activeView, onNavigate)` function

**Task 2.2** — Create `css/app.css`
- CSS-only Adrenalyn XL card template (`.panini-card` base class)
- Team colour variables as CSS custom properties (`--team-color`)
- Diagonal chevron accent overlay using `::before` / `::after` pseudo-elements
- Card status modifier classes: `.panini-card--owned`, `.panini-card--duplicate`, `.panini-card--missing`
- Toast animation keyframes
- Any Tailwind overrides or utility gaps

**Task 2.3** — Create `js/components/card-visual.js`
- Exports `renderCard(card, status)` → returns an HTMLElement
- Card visual structure:
  - Team-coloured background (inline CSS var or data-attribute `data-country`)
  - Top-left: card number (`#id`)
  - Top-right: card type label
  - Middle: country flag emoji + diagonal chevron accent
  - Bottom bar: player name in bold
  - Bottom-left corner: small "PANINI" wordmark text
- Status overlay: faint grey overlay for missing; gold badge for duplicate

**Task 2.4** — Create `js/components/toast.js`
- Exports `showToast(message, type)` — `type` is `"success"` | `"warning"` | `"info"`
- Appends toast element to `#toast-container`; auto-removes after 2.5 s
- Stacks multiple toasts vertically

**Task 2.5** — Create `js/app.js`
- Password gate: renders full-screen overlay on load; checks against hardcoded password; on success stores `sessionStorage.setItem('authed', '1')` and removes overlay
- View router: `showView(viewId)` function — hides all view containers, shows the target one, updates nav active state
- On app init: check `sessionStorage` auth, load nav, default to `view-card-input`

### Phase 3 — Views (after Phase 2; all five can be built in parallel)

**Task 3.1** — Create `js/views/card-input.js`
- Input field (accepts card ID number or player name text)
- On submit: search `CARDS_BY_ID` (if numeric) or fuzzy search `CARDS` by name (if text)
- If not found: show error toast
- If found: call `await store.addCard(cardId)`, show "New card!" (success) or "Duplicate! You now have N copies" (warning) toast
- Display last-added card using `renderCard()` below the input

**Task 3.2** — Create `js/views/collection-grid.js`
- On mount: `await store.getCollection()`, then render all 630 cards using `renderCard()`
- `FilterBar` component above grid: filter by `country` and `cardType`
- Re-renders filtered subset on filter change
- Cards sorted by `id` ascending within each filter result

**Task 3.3** — Create `js/views/progress.js`
- On mount: fetch collection; compute stats
- Overall: `owned / 630 * 100` percentage, animated fill bar
- Per-team table: team name, owned count, total count, % bar
- Per-card-type table: type name, owned, total, %
- No interactive elements; read-only display

**Task 3.4** — Create `js/views/missing-cards.js`
- On mount: fetch collection; filter `CARDS` where `collection[id] === 0`
- `FilterBar` for team and card type
- Renders plain text list (not card visuals — list format for readability)
- "Copy to clipboard" button: calls `generateMissingExport()` → plain text → `navigator.clipboard.writeText()`
- Export format: `#id PlayerName (Country — CardType)` one per line

**Task 3.5** — Create `js/views/swap-analyser.js`
- Two `<textarea>` inputs: "Partner's haves" and "Partner's wants"
- "Analyse" button: runs swap algorithm from section 6
- Results panel: two columns — "Cards I Want From You" and "Cards I Can Give You"
- Unmatched tokens listed below with warning styling
- "Copy trade message" button: generates Messenger-ready plain text block and copies to clipboard

**Task 3.6** — Create `js/components/filters.js`
- Exports `renderFilterBar(container, { teams, cardTypes, onChange })`
- Two `<select>` dropdowns: Team (default "All teams") and Card Type (default "All types")
- Calls `onChange({ country, cardType })` on any change

### Phase 4 — Polish & QA prep (after Phase 3)

**Task 4.1** — Wire all modules together in `app.js`
- Import all views; call each view's `init()` or `mount()` when its view becomes active
- Ensure nav state stays in sync with active view
- Test password gate flow end-to-end

**Task 4.2** — Apply WC 2026 design to `index.html` and `app.css`
- Header: black background, white/yellow logotype, chunky rounded font (Google Fonts: `Bebas Neue` or `Black Han Sans`)
- Nav: black bar, white icons/labels, yellow active indicator
- Body: black background with white content areas
- Chevron/diagonal accent on card visuals and section headers

**Task 4.3** — Populate `cards-data.js` with real data
- Verify 630 entries total
- Verify 42 unique country values
- Verify cardType values match the 12-value enum exactly
- Spot-check: 9 Heroes per team, 1 Icon, 1 Fan Favourite, 1 Team Logo per team

### Phase 5 — Review & Testing (after Phase 4; can run in parallel)

**Task 5.1** — UX review (ux-reviewer agent)
- Check card input speed (should feel instant)
- Check duplicate detection clarity
- Check swap analyser result readability on mobile

**Task 5.2** — Code review (code-reviewer agent)
- Verify async signatures in store.js are consistent across all call sites
- Check for XSS risks in any innerHTML usage (card names injected into DOM)
- Verify `sessionStorage` password gate cannot be bypassed by direct `sessionStorage` manipulation (acceptable in v1 — document the known limitation)

**Task 5.3** — QA test (qa-tester agent)
- Add a new card → verify "New card!" toast and collection updates
- Add the same card again → verify "Duplicate!" toast and count increments
- Filter collection grid by team → verify only that team's cards show
- Filter by card type → verify cross-filter works
- Progress view: add 3 cards → verify percentage updates
- Missing cards: confirm cards added are removed from missing list
- Swap analyser: input known card IDs → verify correct matches returned
- Copy export buttons: verify clipboard text matches expected format

---

## 8. Open Questions (unresolved before build)

| # | Question | Impact | Owner |
|---|---|---|---|
| 1 | What is the hardcoded password for the v1 password gate? | Blocks `app.js` Task 2.5 | User to confirm |
| 2 | Are the 630 card IDs sequential (1–630) or non-sequential? | Affects `cards-data.js` structure and `CARDS_BY_ID` lookup | Confirm from collectosk.com source data |
| 3 | What team colours map to each of the 42 countries? | Required for `--team-color` CSS variables in `app.css` | Content-writer or designer agent to produce a mapping table |
| 4 | Does the collection grid show all 630 cards at once (paginated?) or only owned cards by default? | Affects `collection-grid.js` initial render and performance | User to confirm; 630 DOM nodes is fine for v1 |
| 5 | Hosting platform for v1 local use — `file://` or a simple local server? | Affects whether ES module imports work without a server (ES modules require `http://` in most browsers) | User to confirm; recommend `npx serve` or VS Code Live Server |

---

## Notes for Agents

- **Content-writer agent**: Provide all UI labels, toast messages, nav labels, placeholder text, and the team-colour mapping table (42 teams × hex colour) needed by the designer.
- **Designer agent**: The card visual CSS in `app.css` is the highest-fidelity deliverable. Prioritise getting `.panini-card` and its pseudo-elements pixel-accurate against the Adrenalyn XL reference photo.
- **Frontend-developer agent**: Start with Tasks 1.2 (`cards-data.js`) and 1.3 (`store.js`) — everything else imports from these. Do not mock data; use the real 630-card array from the start.
- **All agents**: `store.js` functions must always be called with `await`. No synchronous calls to store functions anywhere in view or component files.
