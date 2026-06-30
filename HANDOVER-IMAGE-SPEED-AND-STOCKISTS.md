# Handover — Image Speed + Local Stockist Feature

Written 2026-06-30 for the next session. Two independent topics. The image-speed
one is a contained refactor; the stockist one needs a **brainstorm + a live schema
dump** before any code.

Working dir: `C:\Users\Melia Borg\Desktop\Repositries\Build-Quote-v6\Build-Quote-v6\buildquote\`
Run dev: `cd buildquote && npm run dev` → http://localhost:3000
Branch: `main` (the library/parse/voice/PNG/draft-persistence work is merged + deployed).

---

## Topic 1 — Image loading speed (the `next/image` migration)

### Where it stands
Product images currently render as plain `<img>` tags. In the last session I added
`loading="lazy"` + `decoding="async"` + `sizes` to the grid tiles, which stops the
whole grid loading at once. That's the cheap win and it's **already shipped**. The
*bigger* win — automatic resizing + WebP/AVIF — is not done.

### Why `next/image` is the bigger win
The source images are full-resolution manufacturer photos served straight from
external CDNs. `next/image` would:
- resize to the actual displayed size (tiles are ~280px wide, heroes ~full width),
- convert to WebP/AVIF on the fly,
- lazy-load + set correct `sizes` automatically.

Typically a 5–10× payload reduction on a media-heavy page like `/library`.

### The two things that make it non-trivial (why it was deferred)
1. **External-host allowlist.** `next/image` only optimises hosts listed in
   `next.config.ts → images.remotePatterns`. The library aggregates imagery from
   *many* CDNs (Supabase, Wix, manufacturer sites…). Options:
   - List each host explicitly (brittle as new manufacturers are added), **or**
   - Allow all HTTPS hosts: `remotePatterns: [{ protocol: 'https', hostname: '**' }]`
     — simplest, and image bytes can't execute code so the risk is low. The CSP in
     `next.config.ts` already allows `img-src 'self' data: https:`, so CSP won't block it.
   - Caveat: some external CDNs block hot-linking / the optimizer's fetch. Spot-check
     a few real `hero_image_url`s after switching.
2. **Layout — `fill` mode.** Both image spots use absolute-positioned `<img>` with
   `objectFit: cover` + `objectPosition: {posX}% {posY}%`. Converting to
   `<Image fill style={{ objectFit:'cover', objectPosition:`${posX}% ${posY}%` }} />`
   needs the parent to stay `position: relative` (it is) and a correct `sizes` prop.
   This must be **eyeballed on a real device** (you test on prod), because `fill`
   + objectPosition can shift framing vs the current `<img>`.

### Files to change
- `components/library/SystemCardTileUI.tsx` — the grid tile hero `<img>` (~line 55).
  Above-the-fold tiles should be `priority`/eager; the rest stay lazy.
- `components/library/SystemCardUI.tsx` — the per-system detail hero `<img>` (~line 540).
- `next.config.ts` — add the `images.remotePatterns` block.
- Guard the empty/`\r\n` `hero_image_url` case already handled via `.trim()`.

### How to verify
- `npx tsc --noEmit` then `npm run dev`, open `/library`, DevTools → Network → Img:
  confirm requests now hit `/_next/image?url=…&w=…` and come back as WebP, smaller.
- Compare tile + hero framing against current prod on a phone before merging.

### Decision to surface to the user first
"Allow all HTTPS hosts" vs "explicit allowlist." Recommend **allow-all** for a
multi-CDN library; revisit if they want it locked down.

---

## Topic 2 — Local stockist feature ("See local stockists")

### Goal
On a system/product page, show the **local WA suppliers who stock that product**,
ideally with location (address + map). Today the button is a disabled placeholder.

- Placeholder lives in `components/library/SystemCardUI.tsx:641`
  ("See local stockists · Coming soon").
- CLAUDE.md lists `/suppliers` route as a known gap (not built).

### ⚠️ DO THIS FIRST: get a live schema dump
**Do not trust the migration files** — they're spread across two repos (BuildQuote +
the manufacturer-portal repo) and are not a reliable picture of the live DB. Ask the
user to run a schema dump in the Supabase SQL editor and paste it back, e.g.:

```sql
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('suppliers','supplier_systems','manufacturers','systems',
                     'supplier_locations','portal_contacts')
order by table_name, ordinal_position;
```
Also worth: `select count(*) from supplier_systems;` to see if the link table is
actually populated, and a few sample rows of `suppliers` to see what location data
exists.

### What the schema (schema.sql, may be stale) suggests already exists
- **`suppliers`** — MFP-portal suppliers (distinct from `builder_suppliers`). Has
  `name, slug, website_url, email, phone, address, suburb, state, abn, …`.
  **No lat/lng column seen** — mapping would need geocoding or a new column.
- **`supplier_systems`** — `(supplier_id, system_id)` join. This is the backbone:
  *"which suppliers stock which system."* Suppliers pick their products in the MFP
  portal, which should populate this. **Confirm it's populated** via the dump.
- **`manufacturers`**, **`systems`** — products; a system has `manufacturer_id`.
- `data/suppliers.json` + `data/manufacturers.json` — static WA seed data (Bunnings
  branches etc. with addresses) from before the Supabase migration; useful as
  reference/fallback, but the **live `suppliers` + `supplier_systems` tables are the
  source of truth**.
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` exists; `components/builder/SuppliersTab.tsx` has
  a "Find on Map" pattern to crib from. (Maps key not yet domain-restricted — gap.)

### Open questions for the brainstorm (the "robust, break-free flow")
1. **The link table — is `supplier_systems` the right grain, or do we need
   supplier↔manufacturer (stocks the brand) AND supplier↔system (stocks the exact
   product)?** A supplier may stock a whole manufacturer's range without per-system
   rows. Decide: match stockists by `system_id`, fall back to `manufacturer_id`?
2. **Location data + distance.** suppliers has address but (likely) no lat/lng. For
   "local" / nearest, do we geocode addresses (store lat/lng — needs a column +
   backfill) or just group by `suburb`/region? Distance-sort needs coordinates.
3. **Populated?** If suppliers haven't selected products in the portal yet,
   `supplier_systems` may be sparse — the feature would look empty. Need a fallback
   (e.g. show manufacturer-level stockists, or "no local stockists listed yet").
4. **Route shape.** Inline expandable on the system card vs a dedicated
   `/suppliers?system=<slug>` page (better for SEO). CLAUDE.md already reserves
   `/suppliers`.
5. **Does selecting a stockist feed the RFQ flow?** Natural tie-in: "Request a quote
   from this stockist" → prefill supplier into a draft (the supplier-snapshot work
   from this session already persists supplier name/email/account on the draft).

### Suggested first steps for next session
1. Get the schema dump + row counts (above).
2. Brainstorm the data grain + location strategy with the user using the answers.
3. Only then: build the read path (a `getStockistsForSystem(systemId)` in
   `lib/data/`), wire the `SystemCardUI` button, and decide inline-vs-`/suppliers`.

---

## Useful context from the just-completed session
- Auth model: `/library` + shopping list public; `/rfq` login-gated in `proxy.ts`.
- Draft writes (`/api/save-draft-items`) are owner-checked and support
  `mode: 'replace' | 'append'`. Reads (`get-draft-items`) are still UUID-as-bearer.
- Supplier snapshot (name/email/account) now persists on `rfq_drafts`
  (migration `20260630_supplier_account_on_drafts.sql`, already run in Supabase).
- All AI parse/OCR uses **OpenAI gpt-4o** (NOT Anthropic — prod has no Anthropic key).
