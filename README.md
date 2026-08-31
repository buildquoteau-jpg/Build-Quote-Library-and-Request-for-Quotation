# BuildQuote — Library & Request for Quotation

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-gpt--4o-412991?logo=openai&logoColor=white)
![Resend](https://img.shields.io/badge/Resend-email-000000?logo=resend&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)

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
- **Public product library — real, working mechanism, demo data for now:**
  search/filter a product catalogue, build a shopping list (localStorage-backed,
  no login required), share it as a PNG, then one click converts it straight
  into an RFQ draft. The library here runs on a small set of demo companies,
  not live manufacturer data — see [Open source status](#open-source-status).
- Draft-based RFQ flow (`?draft=<uuid>` in the URL, no hidden localStorage state)
  is a clean, resumable, shareable pattern for any multi-step form.

---

## About the creator

I spent a year working in administration at a local hardware supply store.
Answering a customer enquiry — by phone, email, or in person — often meant
drawing on several separate sources for the same product: a printed
catalogue, the manufacturer's website, our point-of-sale system. Each held
part of the picture.

When I later had time between roles, I used it to think through a solution
properly: what if a product's complete system information — profiles,
specifications, install guides, components, everything — lived in one
structured place instead of several?

Manufacturers reach the market through a wide mix of channels — websites,
printed brochures, product packaging, QR codes, flyers, take-cards, sample
boards, printed PDFs, and staff training. Each does its job well for its own
purpose. What [Data Studio](https://github.com/buildquoteau-jpg/BuildQuote-Manufacturer-Data-Studio)
aims to do is take that same information — wherever it currently lives — and
format it into one consistent, human-readable and machine-readable structure
that works across many categories of Australian building products.

I'm not a technical person by background. I educated myself on the latest
developments in AI-assisted technology by listening to podcasts, then
experimenting — taking what I'd learned and applying it directly to build. I
found this way of learning and building particularly suited me; there's
something about how AI-assisted development works that I connect with and
understand instinctively. It gave me a way to take the systems and solutions
that had existed only in my head and actually build working prototypes of
them.

Every part of the design and architecture across all three repositories —
not just the System Card itself, but how each system works and how they
connect — is my own, directed decision by decision at every step. There's a
real temptation, working this way, to keep iterating, pivoting, and adding
features indefinitely. Part of choosing to open-source this now is
recognising that process could continue forever — I'd rather ship something
genuinely useful than keep chasing a perfect result that never ships.

I think the timing is right, for three reasons: manufacturers retain control
of verifying their own data, the resulting data container is genuinely
modular and portable, and — particularly with the machine-readable layer I've
added most recently — AI agents are about to need exactly this kind of small,
verified, structured product data at scale.

I'm releasing this openly so it can reach the people it was built for —
manufacturers, suppliers, and developers working on related problems —
whether they adopt the full system or select the components of the code and
architecture that align with and enhance what their own company is building
digitally.

If you do put any part of this to use, I'd welcome hearing about it —
feedback from real-world use would be genuinely valuable.

**— Melia Knapp** · [meliagrace@gmail.com](mailto:meliagrace@gmail.com)

See it live: [buildquote.com.au](https://buildquote.com.au) ·
[buildquote.com.au/library](https://buildquote.com.au/library) ·
[search.buildquote.com.au](https://search.buildquote.com.au) ·
[studio.buildquote.com.au](https://studio.buildquote.com.au)

---

## Who this is for

### Builders
- Start a quote request from scratch
  ([`/rfq`](https://buildquote.com.au/rfq)), from a saved job, from a saved
  supplier, or resume a draft — five different entry points into the same flow.
- Upload a photo of a handwritten list, a PDF, a spreadsheet, or just type/speak
  it — AI turns it into an editable, structured line-item table.
- Send one RFQ email that already includes a print-ready PDF and an
  Excel-importable CSV, without building either by hand.
- **Just this piece:** the [`/rfq`](https://buildquote.com.au/rfq) wizard alone
  works as a standalone "structured materials list → email + PDF + CSV" tool,
  even without ever touching the product library.

### Anyone browsing products (no login required)
- Search/filter a public library of manufacturer systems
  ([`/library`](https://buildquote.com.au/library)) — the same shape of data
  **Data Studio** publishes as verified System Cards, currently populated with
  demo companies rather than live manufacturer data.
- Build a shopping list, share it as an image, or convert it directly into a
  pre-filled RFQ draft.
- **Just this piece:** [`/library`](https://buildquote.com.au/library) is
  public and unauthenticated — usable as a standalone product-search/
  spec-reference surface even by someone who never sends an RFQ.

### Suppliers
- Don't use this repo directly — they're the *recipients* of what it sends. What
  matters to a supplier: their directory listing and RFQ inbox live in
  **[Trade Desk](https://search.buildquote.com.au)**, and the account/reply-to
  details in the email come straight from what the builder filled in here.

### Manufacturers
- Also indirect — what shows up in
  [`/library`](https://buildquote.com.au/library) is exactly what a
  manufacturer published in **Data Studio**; nothing about a product's data is
  editable here.

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
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_MFP_URL`. Copy
[`buildquote/.env.example`](buildquote/.env.example) → `buildquote/.env.local`
and fill in values.

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
