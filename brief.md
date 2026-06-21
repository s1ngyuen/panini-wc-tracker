# Project Brief: Panini World Cup Tracker

**Date:** 2026-06-19
**Status:** Approved

---

## Overview

A personal web app to track a Panini Adrenalyn XL FIFA World Cup 2026 card collection. The user can input cards as they open packs, instantly see if a card is a duplicate, view their completion progress, and run a swap analyser against a trading partner's card lists. Built for personal use now, with a clean migration path to multi-user later.

**Primary Goal:** Know exactly which cards you own and need, and instantly determine what trades you can make with a partner.
**Target Audience:** Personal use (single collector), potential expansion to other collectors later.

---

## Pages

| Page | Purpose |
|------|---------|
| Card Input | Type a card name or ID to add it to your collection; instantly flags duplicates vs new cards |
| Collection Grid | Visual CSS card grid showing owned/duplicate/missing status; filterable by team and card type |
| Progress | Overall % completion + breakdown by team and card type |
| Missing Cards | Filtered list of every card not yet owned, exportable as plain text |
| Swap Analyser | Input a trading partner's haves and wants; app matches against your duplicates and needs and outputs optimal trades |

### Key User Flows
- Open a pack → type card name or ID → get "New card!" or "Duplicate!" alert → collection updates
- Browse collection grid → filter by team/type → see owned/dupe/missing status per card
- Check progress dashboard for overall and per-team completion %
- Paste partner's card lists → get matched trade suggestions → copy as plain text for Messenger

---

## Content & Data

| Content Type | Static / Dynamic | Update Frequency |
|---|---|---|
| Card checklist (630 cards) | Static | Fixed — baked into app at build time |
| User collection (owned/dupe counts) | Dynamic | Updated every time user opens packs |

**Authentication required:** Simple password gate (v1)
**Forms:** Card input (name or ID search), swap analyser (two text inputs — partner haves + wants)
**External data / APIs:** None

---

## Data Schemas

**Seed data approach:** Real data (630-card checklist sourced from collectosk.com, baked into a JS data file)

### Card *(static)*

| Field | Type | Required |
|---|---|---|
| id | number | Yes |
| playerName | text | Yes |
| country | text | Yes |
| cardType | enum: Hero, Icon, Fan Favourite, Team Logo, Golden Baller, Contender, Master Rookie, Top Keeper, Defensive Rock, Midfield Maestro, Goal Machine, Mascot | Yes |

**Relationships:** None

### UserCollection *(dynamic)*

| Field | Type | Required |
|---|---|---|
| cardId | number → Card.id | Yes |
| count | number (0 = not owned, 1 = owned, 2+ = duplicate) | Yes |

**Relationships:** cardId belongs to Card
**Storage:** localStorage via `store.js` abstraction (async-ready for future Supabase migration)

---

## Design Direction

**Brand colours:** Black `#000000` + White `#FFFFFF` base; accents — Yellow `#F5E100`, Green `#00D15E`, Blue `#0033A0`
**Fonts:** Ultra-bold chunky rounded sans-serif (matching WC 2026 "WE ARE 26" identity)
**Visual style:** Bold & graphic — high contrast, WC 2026 identity language, diagonal/chevron pattern accents used sparingly
**Card visuals:** CSS recreation of Adrenalyn XL card template — team colour background, player name bar, card number, card type label, country. No stat bubbles.
**Reference sites:** WC 2026 design identity page; Adrenalyn card photo provided by user
**Avoid:** Colour overload — black/white as base, vibrant colours as accents only; generic football app aesthetic

---

## Technical Stack

| Layer | Choice |
|---|---|
| Frontend | Plain HTML + Tailwind CSS (CDN) + vanilla JS |
| Backend | None (v1) |
| CMS | None |
| Database | None (v1) — localStorage |
| Hosting | Local for now; hosting TBD |

**Storage abstraction:** `store.js` with async-compatible API for clean migration to Supabase (v2)
**Integrations:** None

---

## Constraints

**Timeline:** Not specified
**Budget:** Free / zero cost
**Scale / traffic expectations:** Personal use only (v1)

---

## Open Questions

- Hosting platform — to be decided before v2.
- Multi-user expansion — deferred to v2 (Supabase migration).
