# Content: Panini WC 2026 Tracker

**Date:** 2026-06-19
**Status:** Ready for build

---

## Tone of Voice Rules

1. Talk like a fellow collector, not a product page — direct, practical, a little excited when things go well.
2. Short labels, zero waffle. Every word earns its place in the UI.
3. Football language is natural here: dupes, swaps, missing cards. Use it without over-explaining.

---

## Global / App Shell

### App Identity

```
App title:   WC 2026 Tracker
Tagline:     Your Panini Adrenalyn XL collection, sorted.
```

### Navigation Tab Labels

| Tab | Label | Icon hint |
|-----|-------|-----------|
| Card Input | Add Cards | + / pack icon |
| Collection Grid | Collection | grid icon |
| Progress | Progress | bar chart icon |
| Missing Cards | Missing | list / minus icon |
| Swap Analyser | Swaps | swap / arrows icon |

### Header (persistent)

```
Logo text:     WC 2026
Sub-label:     Adrenalyn XL Tracker
```

---

## Password Gate Screen

```
Page heading:     Your Collection Awaits
Instruction:      Enter your password to unlock your tracker.
Input label:      Password
Input placeholder: Enter password
Button label:     Unlock
```

**Error message (wrong password):**
```
Wrong password. Try again.
```

**Session note (not shown to user — internal behaviour):**
Auth is stored in sessionStorage. Refreshing the page re-prompts. This is by design.

---

## Card Input View

### Head & Meta

```html
<title>Add Cards — WC 2026 Adrenalyn XL Tracker</title>
<meta name="description" content="Type a card ID or player name to add it to your collection. New cards and duplicates are flagged instantly.">
```

```
og:title:       Add Cards — WC 2026 Tracker
og:description: Scan a card ID or name, see if it's new or a dupe, and keep your collection up to date.
og:image alt:   Card input screen of the Panini WC 2026 Tracker app
```

### View Copy

```
Heading:     Add a Card
Subheading:  Type a card number or player name. We'll tell you if it's new or a dupe.
```

**Search field:**
```
Label:        Card number or player name
Placeholder:  e.g. 42 or Messi
Helper text:  Accepts any card ID (1–630) or a player name. Partial names work too.
```

**Submit button:**
```
Label:  Add to Collection
```

**Empty state (before any card has been added this session):**
```
Open a pack and start typing.
```

**Last-added card label (shown beneath input after a successful add):**
```
Last added:
```

---

### Toast Messages

**New card added successfully:**
```
Type:     success
Message:  New card! #[id] [Player Name] added to your collection.
```
Example render: `New card! #42 Bukayo Saka added to your collection.`

**Duplicate detected:**
```
Type:     warning
Message:  Dupe! You already have #[id] [Player Name]. Copy #[count] recorded.
```
Example render: `Dupe! You already have #42 Bukayo Saka. Copy #2 recorded.`

**Card not found:**
```
Type:     info (error styling)
Message:  No card found for "[input]". Check the number or spelling and try again.
```

---

## Collection Grid View

### Head & Meta

```html
<title>Collection — WC 2026 Adrenalyn XL Tracker</title>
<meta name="description" content="Browse all 630 Adrenalyn XL cards. Filter by team or card type and see owned, duplicate, and missing status at a glance.">
```

```
og:title:       Collection Grid — WC 2026 Tracker
og:description: Your full 630-card Adrenalyn XL collection at a glance. Filter by team or type.
og:image alt:   Collection grid showing owned and missing Panini WC 2026 cards
```

### View Copy

```
Heading:  My Collection
```

### Filter Bar Labels

```
Team dropdown default:      All Teams
Card type dropdown default: All Types
Active filter chip prefix:  [Team name] · [Type name]
Clear filters label:        Clear
```

**Card type filter options (canonical order):**
```
All Types
Hero
Icon
Fan Favourite
Team Logo
Golden Baller
Contender
Master Rookie
Top Keeper
Defensive Rock
Midfield Maestro
Goal Machine
Mascot
```

### Card Status Labels (badge/overlay text)

```
Owned:          Owned
Duplicate (×2): ×2
Duplicate (×3): ×3
Duplicate (×N): ×[N]
Missing:        Missing
```

Tooltip on duplicate badge (shown on hover/tap):
```
You have [N] copies — [N–1] available for swapping.
```

### Results count label (above grid):

```
Showing [X] of 630 cards
```
When filtered:
```
[X] cards · [Team] · [Type]
```

### Empty State (no cards owned yet, no filter applied):

```
You haven't added any cards yet.
Open a pack and head to Add Cards to get started.
```

### Empty State (filter returns no owned cards):

```
No [Type] cards from [Team] in your collection yet.
```

Generic filtered empty state:
```
No cards match that filter. Try a different team or type.
```

---

## Progress View

### Head & Meta

```html
<title>Progress — WC 2026 Adrenalyn XL Tracker</title>
<meta name="description" content="Track your overall completion and see how far through each team and card type you are.">
```

```
og:title:       Progress — WC 2026 Tracker
og:description: Your overall WC 2026 Adrenalyn XL completion percentage, broken down by team and card type.
og:image alt:   Progress dashboard showing collection completion percentage
```

### View Copy

```
Heading:    Progress
Subheading: How close are you to completing the set?
```

**Overall completion counter:**
```
[X] of 630 cards collected
[XX.X%] complete
```

**Section headings:**
```
By Team
By Card Type
```

**Progress bar label pattern (per row):**
```
[Team / Type name]    [X] / [Total]    [XX%]
```

**Zero state (0 cards collected):**
```
No cards added yet. Start scanning packs in Add Cards.
```

**Completion celebration (100%):**
```
Complete! You've collected all 630 cards.
Legendary. The full set is yours.
```

---

## Missing Cards View

### Head & Meta

```html
<title>Missing Cards — WC 2026 Adrenalyn XL Tracker</title>
<meta name="description" content="See every card you still need. Filter by team or type, then copy the list straight to Messenger.">
```

```
og:title:       Missing Cards — WC 2026 Tracker
og:description: Every card you still need, filterable by team and type. One tap to copy for swapping.
og:image alt:   Missing cards list for Panini WC 2026 Adrenalyn XL
```

### View Copy

```
Heading:    Missing Cards
Subheading: [X] cards still to find.
```

When filtered:
```
Subheading: [X] missing [Type] cards from [Team].
```

**Card count label:**
```
[X] missing cards
```

**Export button label:**
```
Copy Missing List
```

**Copy success feedback (inline or toast):**
```
Copied! Paste it into Messenger and start hunting.
```

### Exported Plain-Text Format

This is what gets copied to the clipboard:

```
My Missing Cards — Panini Adrenalyn XL WC 2026

#12 Riyad Mahrez (Algeria — Icon)
#34 Lionel Messi (Argentina — Fan Favourite)
#87 Vinicius Jr (Brazil — Hero)
#201 Pedri (Spain — Midfield Maestro)

[X] cards needed · Generated by WC 2026 Tracker
```

Rules:
- One card per line, format: `#[id] [Player Name] ([Country] — [Card Type])`
- Header line always first
- Footer line always last with card count
- If a team/type filter is active, add a filter note on line 2:
  `Filtered: [Team] · [Type]`

### Empty State (all cards collected):

```
You've got them all. The set is complete.
```

---

## Swap Analyser View

### Head & Meta

```html
<title>Swap Analyser — WC 2026 Adrenalyn XL Tracker</title>
<meta name="description" content="Paste a trading partner's card list and instantly see what you can swap. Copy the result straight to Messenger.">
```

```
og:title:       Swap Analyser — WC 2026 Tracker
og:description: Paste your trading partner's haves and wants. The tracker matches them against your collection and dupes.
og:image alt:   Swap analyser results screen showing cards to get and give
```

### View Copy

```
Heading:    Swap Analyser
Subheading: Paste your partner's cards and we'll work out the best trade.
```

**Help text (shown beneath the heading, above the inputs):**
```
Enter card IDs or player names — one per line, or separated by commas.
We'll match them against your collection and your duplicates.

Example:
  42
  Messi
  Pedri, Bellingham
```

**Input A — Partner's haves:**
```
Label:        Cards they HAVE
Placeholder:  Paste card IDs or names here.
              One per line or comma-separated.
Helper text:  These are cards your partner can offer you.
```

**Input B — Partner's wants:**
```
Label:        Cards they WANT
Placeholder:  Paste card IDs or names here.
              One per line or comma-separated.
Helper text:  These are cards your partner is looking for.
```

**Analyse button:**
```
Label:  Analyse Swap
```

### Results Section

**Results heading:**
```
Swap Results
```

**Column heading — cards user will receive:**
```
Cards I Want From You
```
Sub-label:
```
[X] card(s) your partner has that you're missing.
```

**Column heading — cards user will give:**
```
Cards I Can Give You
```
Sub-label:
```
[X] duplicate(s) your partner is looking for.
```

**Balance note (shown when counts differ significantly):**
```
Heads up: this trade isn't even — you're getting [X] cards but giving [Y].
Worth a conversation before you commit.
```

**No matches found (neither column has results):**
```
No swap matches found.
Your partner's cards don't overlap with your missing cards or duplicates.
Try updating their list and running the analysis again.
```

**Partial match — only one side has results:**
```
You can give [X] card(s), but nothing from their list covers your missing cards.
```
or:
```
They have [X] card(s) you need, but none of your dupes match what they want.
```

**Unmatched tokens warning (shown below results):**
```
Heading:   Couldn't match these:
Sub-text:  These entries didn't match any card in the set. Check the spelling or use the card ID instead.
```
Per unmatched item:
```
"[original input text]" — not found
```

**Export button:**
```
Label:  Copy Trade Message
```

**Copy success feedback:**
```
Copied! Send it to your partner and sort the swap.
```

### Exported Plain-Text Format (Messenger-ready)

```
--- CARDS I WANT FROM YOU ---
#12 Riyad Mahrez (Algeria — Icon)
#45 Kylian Mbappé (France — Hero)

--- CARDS I CAN GIVE YOU ---
#78 Vinicius Jr (Brazil — Hero)
#201 Pedri (Spain — Midfield Maestro)

Generated by WC 2026 Tracker
```

Rules:
- Section headers in ALL CAPS with dashes
- One card per line: `#[id] [Player Name] ([Country] — [Card Type])`
- Em dash (—) between country and card type
- Footer line always appended
- If a section is empty, include the header and write `(none)` on the next line

---

## Global / Shared Copy

### Loading States

**Full-screen initial load:**
```
Loading your collection...
```

**View-level loading (inline spinner label):**
```
Loading...
```

### Generic Error Messages

**Generic runtime error:**
```
Something went wrong. Refresh the page and try again.
If the problem continues, your collection data is still safe in localStorage.
```

**localStorage unavailable:**
```
Storage isn't available in this browser.
Try disabling private/incognito mode, or switch to a supported browser.
```

### Copy to Clipboard

**Success toast / feedback:**
```
Copied to clipboard!
```

**Failure fallback:**
```
Couldn't copy automatically. Select the text above and copy it manually.
```

### Form Validation — Card Input Field

| Condition | Message |
|-----------|---------|
| Empty submission | Enter a card number or player name. |
| Input too short (< 2 chars) | Enter at least 2 characters to search. |
| Card ID out of range (< 1 or > 630) | Card numbers run from 1 to 630. |

### 404 / Not Found (if routing is ever added)

```
Heading:  That page doesn't exist.
Body:     Head back to Add Cards to pick up where you left off.
CTA:      Go to Add Cards
```

### Reset / Clear Collection

**Confirmation prompt (called before `clearCollection()`):**
```
Are you sure? This will delete your entire collection from this device.
This cannot be undone.
```

**Confirm button:**
```
Yes, clear everything
```

**Cancel button:**
```
Keep my collection
```

**Success message after clear:**
```
Collection cleared. Fresh start.
```

---

## Notes on Assumptions

The following sections involved content decisions where the brief was silent. Review these before build:

1. **App title capitalisation** — "WC 2026 Tracker" chosen over "Panini WC 2026 Tracker" to keep the header label tight. Full "Panini Adrenalyn XL" branding appears in exported text and meta descriptions where space allows.

2. **Password screen heading** — "Your Collection Awaits" treats this as a personal, low-stakes unlock rather than a security prompt, which fits the single-collector context. If the tone feels too marketing-ish, replace with "Unlock Your Tracker".

3. **Duplicate badge copy** — Showing `×2`, `×3` etc. on the card badge keeps the grid uncluttered. The full "You have N copies" language is in the tooltip only. Flag if the badge alone is insufficient at a glance.

4. **Balance warning in Swap Analyser** — The plan notes flagging imbalanced trades but gives no threshold. This copy fires if the difference between youGet and youGive counts is greater than 3. Adjust the threshold in `swap-analyser.js` as needed.

5. **Completion celebration copy** — "Legendary. The full set is yours." is short and punchy. If you want something more elaborate (confetti + longer message), flag it for the UX reviewer.

6. **Reset/clear collection copy** — The plan doesn't specify a reset flow, but `clearCollection()` is in the store API. Copy is included here as a precaution. Remove if the feature isn't exposed in the UI.
