# BuildQuote explainer — shot list

Images for `/explainer-v2`. The film plays now with styled numbered
placeholders in every empty slot, so shots can land one at a time.

**To wire a shot in:** drop the file into `shots/`, then set its `src` in the
`SHOTS` manifest near the top of `index.html`. One line per shot.

```js
'S2-01': { src:'shots/S2-01.webp', title:'Trade counter', ar:'4/3' },
```

Run `index.html?shotlist` in a browser for the live version of this table, and
`index.html?shots` to preview the storyboard with every slot placeholdered.

**Formats.** Portrait 1170×2532 or larger, landscape 2560×1600 or larger. PNG
for UI captures, JPG or WebP for photography. Everything is resized and
re-encoded to its on-stage display size for the artifact build, so send the
largest version you have.

---

## Priority A — the six that make the film feel real

| Id | Shot | Ratio | Notes |
|---|---|---|---|
| `S1-01` | Feed on a phone showing a home clad in **vertical battens**, thumb mid-scroll, a BuildQuote card link in the caption | 9:19.5 | Must match **BQ CladMax · 90mm Vertical Batten**, the product the card in this section is built from |
| `S1-09` | Builder on site, phone in hand, ticking profiles on the card | 3:4 | Hi-vis, real site, real weather. Currently unplaced — see "Slots to add" below |
| `S2-01` | Trade counter — a couple talking to a rep across the desk | 4:3 | Warm, real store, real people. This is the opening image of Section 2 |
| `S2-08` | Kitchen table — customer and builder over a phone showing the review page | 4:3 | Evening light. The "conversation continues" beat |
| `S3-09` | Expanded verification card with the ✓ ✎ ⚑ controls visible | 16:9 | Optional — Section 3 currently renders this live, and the live version is sharper than a screenshot would be |
| `S4-01` | BuildQuote wordmark lockup | vector | SVG preferred. The end card currently sets it in type |

## Priority B — UI captures, straightforward to grab from the running apps

| Id | Shot |
|---|---|
| `S1-06` | iOS share sheet over the System Card, link visible |
| `S1-07` | Message thread with the card link unfurled as a rich preview |
| `S1-08` | Architect's laptop — card open in a desktop browser |
| `S2-02` | Trade Desk search, empty state with the example chips |
| `S2-06` | Send-review-link modal, Email / SMS / WhatsApp, SMS chosen |
| `S2-09` | Customer review page — measurements and timing form, part-filled |
| `S2-10` | "Quote request sent" confirmation |
| `S3-01` | Invitation to Data Studio in a manufacturer's inbox |
| `S3-02` | Data Studio login — navy gradient, BQ monogram |
| `S3-03` | Manufacturer dashboard — hero band and the four stat tiles |
| `S3-06` | Asset picker — hero image slot with the crop adjuster live |
| `S3-12` | Approval queue with a batch ready |

## Priority C — tight crops that add texture

| Id | Shot |
|---|---|
| `S2-04` | Cross-sell strip — "You may also be interested in" with category pills |
| `S3-04` | Progress rail: Submitted → Under Review → Manufacturer Verified → BuildQuote Approved |
| `S3-10` | Technical attributes — the BAL pill row |

---

## One shot to **replace**

`S3-DESK` (`shots/trade-desk-search.png`) currently shows the older Trade Desk
with "Add to quote prep" buttons. That UI has since been replaced by the shared
shopping list and the System Card V2 modal, so the screenshot is a generation
out of date. It appears small, in the four-up fan at 2:58 — legible enough that
a merchant who knows the product could notice. **Re-capture from the current
Trade Desk before this goes to Metcash.**

---

## Colour swatch photography — a separate, high-value ask

Every demo system currently carries `image_url: null` on its colours, so the
System Card renders colour *names* where photographs belong.

Wanted: flat-lit swatch photographs, square, consistent lighting, ~600×600.

| System | Colourways |
|---|---|
| BQ DeckMax Composite Decking | Silvertop Ash · Blackbutt · Spotted Gum · Charcoal · Merbau Dark |
| BQ CladMax Composite Cladding | Ironbark · Coastal Grey · Brushbox Natural · Slate Black · Warm White |
| BQ InForm VJ Lining | Primed · Vivid White · Antique White USA · Linen |

These upgrade the live product as well as the film — and they are precisely the
artefact Section 3 is about the manufacturer supplying, so the film gets more
persuasive as the real data fills in.

---

## Slots to add when the photography lands

Two Priority A shots have no slot in the film yet, because the live-rendered
card currently occupies their space and reads better empty than placeholdered:

- `S1-09` (builder on site) — intended for the Section 1 builder beat at ~0:50,
  as an inset beside the phone.
- `S3-09` (verification card) — Section 3 renders this live at ~2:47.

Both are additive. The film is complete without them.

---

## Already wired — real assets in the repo

| Id | File | Source |
|---|---|---|
| `CLAD-HERO` | `shots/cladmax-hero.jpg` | `public/manufacturers/bq-compform/system-cards/…/cladmax-composite-cladding` |
| `DECK-HERO` | `shots/deckmax-hero.jpg` | same package, `deckmax-composite-decking` |
| `SCREEN-HERO` | `shots/screenmax-hero.jpg` | same package, `screenmax-privacy-screening` |
| `PERG-HERO` | `shots/pergola-hero.jpg` | `bq-timberlock/…/glulam-hardwood-pergola` |
| `DOC-1` … `DOC-5` | `shots/doc-*.png|jpg` | `public/explainer/` — the cold-open paper pile |
| `S3-WIDGET` | `shots/supplier-website.png` | `public/presentation/presentation-assets/supplier-journey/` |
| `S3-DESK` | `shots/trade-desk-search.png` | same — **replace, see above** |
| `S3-RFQ` | `shots/rfq-supplier.png` | `public/explainer/` |

Seventeen more product hero photographs sit unused in
`public/manufacturers/*/system-cards/cards/*/assets/hero.jpg` if more product
imagery is wanted.
