# Backlog

## Accounts, Sync & Cloud Storage
Per-user accounts with email/password login and cloud-synced collection data.
- Replace localStorage with Supabase (Postgres + auth + row-level security)
- Swap `store.js` calls for Supabase queries
- Replace password gate with proper sign-in / sign-up flow
- One-time migration path for existing localStorage collections
- Requires redeployment to Netlify/Vercel (can't host secrets on GitHub Pages)
- Sync button in header pushes/pulls collection + trades to cloud
- Do the full build in one go (accounts + sync + redeploy)

## eBay Card Pricing
Show estimated market value for cards in the lightbox or collection view.
- Cloudflare Worker to proxy eBay Browse API (keeps credentials off client)
- Needs eBay developer account + OAuth app credentials
- Display sold listings price range on card lightbox
