# BuildQuote — Library & Request for Quotation

Turns a handwritten or uploaded materials list into a professional multi-format
Request for Quotation (RFQ) — sent straight to a supplier — plus a public,
searchable product library builders can quote straight from.

Built for Southwest WA builders; the pattern generalises to any trade where
someone turns a messy list into a structured supplier quote request.

---

## Why fork this

- **AI OCR/parse in one API route:** photo, PDF, spreadsheet, or typed/voice list
  in → structured line items out (`/api/parse`, OpenAI `gpt-4o`). No separate OCR
  service to stand up.
- **One send, three formats:** a single `/api/send` call builds the HTML email,
  a branded PDF, and a CSV, and dispatches via Resend — reusable pattern for any
  "structured data → email + attachments" flow.
- **Public product library is a real product surface, not a demo:** search/filter
  a manufacturer catalogue, build a shopping list (localStorage-backed, no login
  required), share it as a PNG, then one click converts it straight into an RFQ
  draft.
- Draft-based RFQ flow (`?draft=<uuid>` in the URL, no hidden localStorage state)
  is a clean, resumable, shareable pattern for any multi-step form.

---

## Who this is for

### Builders
- Start a quote request from scratch (`/rfq`), from a saved job, from a saved
  supplier, or resume a draft — five different entry points into the same flow.
- Upload a photo of a handwritten list, a PDF, a spreadsheet, or just type/speak
  it — AI turns it into an editable, structured line-item table.
- Send one RFQ email that already includes a print-ready PDF and an
  Excel-importable CSV, without building either by hand.
- **Just this piece:** the `/rfq` wizard alone works as a standalone "structured
  materials list → email + PDF + CSV" tool, even without ever touching the
  product library.

### Anyone browsing products (no login required)
- Search/filter a public library of manufacturer systems
  (`/library`) — sourced from **Data Studio**'s verified System Cards.
- Build a shopping list, share it as an image, or convert it directly into a
  pre-filled RFQ draft.
- **Just this piece:** `/library` is public and unauthenticated — usable as a
  standalone product-search/spec-reference surface even by someone who never
  sends an RFQ.

### Suppliers
- Don't use this repo directly — they're the *recipients* of what it sends. What
  matters to a supplier: their directory listing and RFQ inbox live in
  **Trade Desk**, and the account/reply-to details in the email come straight
  from what the builder filled in here.

### Manufacturers
- Also indirect — what shows up in `/library` is exactly what a manufacturer
  published in **Data Studio**; nothing about a product's data is editable here.

---

## How the three BuildQuote repos fit together

```
Data Studio          →   published System Card + knowledge.jsonld
                            │
                            ▼
                shared production Supabase
                            │
        ┌───────────────────┴───────────────────┐
        ▼                                         ▼
  This repo (buildquote.com.au)            Trade Desk (search.buildquote.com.au)
  /library renders the card,               supplier directory + supplier's
  shopping list → "Convert to RFQ"         own listing/RFQ inbox
        │                                         ▲
        └──── builder picks a supplier ───────────┘
              from the Trade Desk directory,
              RFQ email sent from here
```

- **This repo is the only one that sends an RFQ.** It reads catalogue data
  published by Data Studio and supplier info surfaced via Trade Desk, but owns
  the entire builder-facing flow end to end.
- **`/library` → `/rfq`:** "Convert to RFQ" creates a draft
  (`/api/create-draft` → `/api/save-draft-items`) and redirects to `/rfq?draft=`,
  so the shopping list and the RFQ wizard share the same draft record.
- **Supplier Directory link:** points out to Trade Desk
  (`search.buildquote.com.au/supplierdirectory`) rather than duplicating supplier
  data here.

## Live product surfaces

- [buildquote.com.au](https://buildquote.com.au) — this app
- [buildquote.com.au/library](https://buildquote.com.au/library) — public product
  library (this app)
- [search.buildquote.com.au](https://search.buildquote.com.au) — supplier
  directory + supplier portal (Trade Desk)
- [studio.buildquote.com.au](https://studio.buildquote.com.au) — manufacturer
  data ingestion (Data Studio)

---

## Stack

- Next.js 16.1.6 (App Router, React 19)
- Supabase (Postgres) — shared production project
- OpenAI `gpt-4o` — OCR/parse of uploaded materials lists (**not** Anthropic —
  migrated off Claude for this specific route)
- Resend — email dispatch
- pdf-lib / pdf-parse / pdf2pic, ExcelJS, Mammoth — file generation/parsing
- Tailwind CSS v4, custom design tokens

## Setup

```bash
cd buildquote
npm run dev   # http://localhost:3000
```

Required env vars (see [`CLAUDE.md`](CLAUDE.md#environment-variables) for the
full annotated list): Supabase URL/anon/service-role keys, `OPENAI_API_KEY`,
`RESEND_API_KEY` (+ `RESEND_FROM_EMAIL`), `NEXT_PUBLIC_APP_URL`,
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_MFP_URL`. No `.env.example`
exists yet in this repo — see Open source status below.

⚠️ `ANTHROPIC_API_KEY` is **not used** by this app (parsing was migrated to
OpenAI) — don't add it to your env config.

---

## Open source status

- **This repo was recently made public.** A full manual secrets audit (git
  history included, not just current tracked files) is strongly recommended
  before anyone builds against it or you advertise it as self-hostable — a
  pattern scan of tracked files at the time of writing found no committed real
  API keys, only placeholder examples in docs (e.g. `sk-ant-...`,
  `eyJ...` in `README.md`/`HANDOVER-MFP-CLEANUP.md`), but a scan is not a
  substitute for a full history audit.
- **License:** not yet chosen — **TODO**. Until a `LICENSE` file with a real
  license is added, standard copyright applies (no reuse rights are granted).
  See [`LICENSE`](LICENSE).
- No `.env.example` exists yet in this repo — add one (variable names only) as
  part of making this genuinely self-hostable.
