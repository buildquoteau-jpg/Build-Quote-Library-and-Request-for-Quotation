// ─────────────────────────────────────────────────────────────────────────────
// Conversational search layer for the BuildQuote library.
//
// 100% deterministic, no AI, no network. Pure functions over the systems that are
// already loaded in the browser (`initialSystems`). This is the "make the search
// feel intelligent" layer:
//
//   raw query  ──cleanSearchQuery──▶  cleaned phrase
//   cleaned    ──expandSearchTerms─▶  base tokens + synonyms (builder vocab)
//   systems    ──searchLibrarySystems▶ relevance-ranked matches + intent + copy
//
// EDIT ME FREELY: the SYNONYMS list below is meant to be hand-tuned for SW WA
// builder language. Add a concept, add triggers/expansions/chips, done. No other
// file needs to change.
// ─────────────────────────────────────────────────────────────────────────────

import type { LibrarySystem } from '@/lib/data/getSystems'

// ── Types ────────────────────────────────────────────────────────────────────

export type SearchChip = { label: string; query: string }

export type SearchIntent = {
  raw: string
  cleaned: string
  /** Every term we search on — base tokens from the query plus synonym expansions. */
  terms: string[]
  /** Builder-language concepts the query matched, e.g. "waterproofing", "BAL / bushfire". */
  concepts: { id: string; label: string }[]
}

export type LibrarySearchResult = {
  systems: LibrarySystem[]
  intent: SearchIntent
  /**
   * true  → at least one result matched a word the user actually typed (high confidence).
   * false → results come only from synonym expansion ("closest matches").
   */
  exact: boolean
}

type Concept = {
  id: string
  /** Human label shown in the interpretation panel / chips. */
  label: string
  /** If any trigger appears in the cleaned query, the concept fires. Lowercase. */
  triggers: string[]
  /** Extra terms folded into the search when the concept fires. Lowercase. */
  expand: string[]
  /** Refinement chips offered when this concept fires (label doubles as the query). */
  chips: string[]
}

// ── The dictionary ───────────────────────────────────────────────────────────
// Order matters only for which concept is treated as "primary" in the summary
// (first fired wins), so put the more specific concepts higher.

const SYNONYMS: Concept[] = [
  {
    id: 'bal',
    label: 'BAL / bushfire',
    triggers: ['bal', 'bal29', 'bal-29', 'bal 29', 'bal40', 'bal 40', 'bushfire', 'fire rated', 'flame zone'],
    expand: ['bal', 'bushfire', 'fire rated', 'fire rating', 'external wall', 'external cladding', 'non-combustible', 'fibre cement'],
    chips: ['BAL-rated cladding', 'External cladding', 'Fibre cement', 'Fire rated'],
  },
  {
    id: 'waterproofing',
    label: 'Waterproofing / wet area',
    triggers: ['waterproof', 'waterproofing', 'tanking', 'membrane', 'wet area', 'water resistant', 'damp'],
    expand: ['waterproofing', 'membrane', 'wet area', 'tanking', 'primer', 'sealant', 'flashing', 'bathroom', 'balcony', 'moisture'],
    chips: ['Waterproofing', 'Wet area lining', 'Membranes', 'Sealants & tapes'],
  },
  {
    id: 'bathroom',
    label: 'Bathroom / wet area',
    triggers: ['bathroom', 'shower', 'ensuite', 'laundry', 'wet room', 'tile', 'tiling', 'retile', 're-tile'],
    expand: ['bathroom', 'wet area', 'waterproofing', 'membrane', 'primer', 'sealant', 'tape', 'tile substrate', 'fibre cement', 'wet area lining'],
    chips: ['Waterproofing', 'Wet area lining', 'Membranes', 'Sealants & tapes'],
  },
  {
    id: 'vertical-lining',
    label: 'Vertical lining / cladding',
    triggers: ['vertical lining', 'vertical cladding', 'vertical', 'lining', 'wall lining', 'groove', 'panel lining'],
    expand: ['vertical', 'lining', 'cladding', 'wall lining', 'internal lining', 'external lining', 'fibre cement', 'groove', 'panel'],
    chips: ['Vertical cladding', 'Wall lining', 'Fibre cement', 'Internal lining'],
  },
  {
    id: 'cladding',
    label: 'Cladding / external wall',
    triggers: ['cladding', 'clad', 'facade', 'weatherboard', 'external wall', 'wall panel', 'lining board'],
    expand: ['cladding', 'external wall', 'wall lining', 'fibre cement', 'weatherboard', 'facade', 'lining board', 'panel'],
    chips: ['External cladding', 'Weatherboard', 'Fibre cement', 'Vertical cladding'],
  },
  {
    id: 'decking',
    label: 'Decking',
    triggers: ['decking', 'deck', 'deck board', 'composite deck', 'verandah', 'patio'],
    expand: ['decking', 'deck board', 'composite decking', 'timber decking', 'joist', 'bearer', 'stirrup', 'post', 'screws', 'fixings'],
    chips: ['Composite decking', 'Timber decking', 'Decking screws', 'Joists & bearers'],
  },
  {
    id: 'framing',
    label: 'Framing / structural',
    triggers: ['framing', 'frame', 'stud', 'wall frame', 'structural', 'bearer', 'joist', 'lintel', 'truss'],
    expand: ['framing', 'wall frame', 'stud', 'plate', 'lintel', 'nogging', 'bracing', 'tie down', 'joist', 'bearer', 'structural'],
    chips: ['Wall framing', 'Bracing', 'Tie-down', 'Structural'],
  },
  {
    id: 'flooring',
    label: 'Flooring / subfloor',
    triggers: ['flooring', 'floor', 'subfloor', 'sub-floor', 'underlay', 'floor sheet', 'particleboard', 'yellow tongue'],
    expand: ['flooring', 'subfloor', 'floor sheet', 'particleboard', 'underlay', 'fibre cement', 'compressed sheet'],
    chips: ['Subfloor sheeting', 'Compressed sheet', 'Underlay', 'Fibre cement'],
  },
  {
    id: 'insulation',
    label: 'Insulation',
    triggers: ['insulation', 'insulate', 'batts', 'thermal', 'r value', 'r-value', 'sarking', 'wrap'],
    expand: ['insulation', 'thermal', 'acoustic', 'batts', 'sarking', 'wall wrap', 'building wrap', 'vapour'],
    chips: ['Wall insulation', 'Acoustic insulation', 'Wall wrap', 'Sarking'],
  },
  {
    id: 'roofing',
    label: 'Roofing',
    triggers: ['roof', 'roofing', 'gutter', 'fascia', 'eave', 'ridge', 'flashing', 'soffit'],
    expand: ['roofing', 'roof sheet', 'flashing', 'fascia', 'gutter', 'ridge', 'eave', 'soffit', 'sarking'],
    chips: ['Roof sheeting', 'Flashings', 'Fascia & gutter', 'Eaves lining'],
  },
  {
    id: 'plasterboard',
    label: 'Plasterboard / internal lining',
    triggers: ['plasterboard', 'gyprock', 'gib', 'gib board', 'internal wall', 'ceiling lining', 'cornice', 'villaboard'],
    expand: ['plasterboard', 'internal lining', 'wall lining', 'ceiling', 'cornice', 'wet area board', 'villaboard', 'fibre cement'],
    chips: ['Internal lining', 'Wet area board', 'Ceiling lining', 'Cornice'],
  },
  {
    id: 'fixings',
    label: 'Fixings / fasteners',
    triggers: ['fixing', 'fixings', 'fastener', 'screw', 'screws', 'nail', 'bracket', 'stirrup', 'bolt', 'anchor'],
    expand: ['fixings', 'fasteners', 'screws', 'nails', 'bracket', 'stirrup', 'bolt', 'anchor', 'tie'],
    chips: ['Screws', 'Brackets', 'Post stirrups', 'Anchors'],
  },
  {
    id: 'sealants',
    label: 'Sealants & adhesives',
    triggers: ['sealant', 'silicone', 'adhesive', 'glue', 'caulk', 'tape', 'primer', 'render'],
    expand: ['sealant', 'silicone', 'adhesive', 'primer', 'tape', 'flashing tape', 'joint'],
    chips: ['Sealants', 'Adhesives', 'Primers', 'Joint tape'],
  },
  {
    id: 'fibre-cement',
    label: 'Fibre cement',
    triggers: ['fibre cement', 'fiber cement', 'fc sheet', 'compressed sheet', 'cement sheet', 'hardie', 'eterpan'],
    expand: ['fibre cement', 'cement sheet', 'compressed sheet', 'cladding', 'lining', 'wet area'],
    chips: ['Fibre cement cladding', 'Compressed sheet', 'Wet area board', 'Lining'],
  },
]

// Generic chips when the query doesn't match any concept — keeps the user moving
// instead of hitting a dead end.
const FALLBACK_CHIPS: SearchChip[] = [
  { label: 'Cladding', query: 'cladding' },
  { label: 'Waterproofing', query: 'waterproofing' },
  { label: 'Decking', query: 'decking' },
  { label: 'Internal lining', query: 'internal lining' },
]

// Tokens that carry no search value. Short tokens (<2 chars) are dropped anyway.
const STOP = new Set([
  'the', 'and', 'for', 'with', 'this', 'that', 'from', 'into', 'are', 'was',
  'not', 'you', 'but', 'any', 'some', 'need', 'want', 'looking', 'find', 'show',
  'get', 'have', 'can', 'please', 'about', 'what', 'which', 'will', 'would',
  'good', 'best', 'cheap', 'new', 'use', 'used', 'job', 'product', 'products',
  'system', 'systems', 'something', 'anything', 'around', 'near', 'local',
])

// ── Query cleanup ────────────────────────────────────────────────────────────

// Leading conversational phrases stripped repeatedly until the query stabilises,
// so "I'm looking for some waterproofing please" → "waterproofing".
const PREFIX_PATTERNS: RegExp[] = [
  /^(hi|hey|hello|ok|okay)\b[,\s]*/i,
  /^(i'?m|i am)\s+/i,
  /^(i'?d|i would)\s+like\s+(to\s+)?/i,
  /^(i\s+)?(just\s+)?(want|wanted|need|needed|looking\s+for|searching\s+for|trying\s+to\s+find|after|require)\s+/i,
  /^(find|show|get|give)\s+(me\s+)?/i,
  /^(do\s+you\s+have|have\s+you\s+got|can\s+i\s+(get|have)|could\s+i\s+(get|have)|can\s+you\s+(show|find|get)(\s+me)?|where\s+can\s+i\s+(get|find|buy)|is\s+there)\s+/i,
  /^(some|a|an|the)\s+/i,
  /^(products?|systems?|something|anything)\s+(for|to|that)\s+/i,
  /^(for|to)\s+/i,
]

export function cleanSearchQuery(raw: string): string {
  let q = (raw || '').trim()
  if (!q) return ''

  // Strip trailing politeness.
  q = q.replace(/[\s,]+(please|pls|thanks|thank\s+you|cheers|mate)\s*[.!?]*$/i, '').trim()

  // Strip leading conversational lead-ins, looping until stable.
  let prev = ''
  while (q && q !== prev) {
    prev = q
    for (const re of PREFIX_PATTERNS) q = q.replace(re, '')
    q = q.trim()
  }

  // Tidy stray punctuation/whitespace.
  q = q.replace(/\s{2,}/g, ' ').replace(/^[\s,.!?]+|[\s,.!?]+$/g, '').trim()

  // If we stripped everything (e.g. the query was pure filler), keep the original.
  return q || raw.trim()
}

// ── Term expansion ───────────────────────────────────────────────────────────

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(t => t.length >= 2 && !STOP.has(t))
}

function firedConcepts(cleaned: string): Concept[] {
  const hay = ` ${cleaned.toLowerCase()} `
  const tokens = new Set(tokenize(cleaned))
  return SYNONYMS.filter(c =>
    c.triggers.some(t =>
      t.includes(' ') ? hay.includes(` ${t} `) || cleaned.toLowerCase().includes(t) : tokens.has(t),
    ),
  )
}

/** Base tokens from the query plus synonym expansions, deduped (lowercase). */
export function expandSearchTerms(cleaned: string): string[] {
  const base = tokenize(cleaned)
  const out = new Set(base)
  for (const c of firedConcepts(cleaned)) for (const t of c.expand) out.add(t.toLowerCase())
  // A multi-word cleaned phrase is also useful as a whole-phrase term.
  if (base.length === 0 && cleaned.trim()) out.add(cleaned.trim().toLowerCase())
  return Array.from(out)
}

export function getSearchIntent(raw: string): SearchIntent {
  const cleaned = cleanSearchQuery(raw)
  return {
    raw,
    cleaned,
    terms: expandSearchTerms(cleaned),
    concepts: firedConcepts(cleaned).map(c => ({ id: c.id, label: c.label })),
  }
}

// ── Scoring & ranking ────────────────────────────────────────────────────────

// Field weights — a hit in the product name is worth far more than one buried in
// a description, so the most on-topic systems float to the top.
const W = {
  name: 12,
  category: 7,
  attribute: 7,
  manufacturer: 4,
  profile: 4,
  component: 3,
  description: 2,
  notes: 1.5,
} as const

// Synonym hits count, but at half weight, so a system that literally contains the
// typed word always outranks one pulled in only by association.
const SYNONYM_FACTOR = 0.5

type Field = { text: string; weight: number; strong: boolean }

function systemFields(s: LibrarySystem): Field[] {
  const fields: Field[] = [
    { text: s.name || '', weight: W.name, strong: true },
    { text: s.category || '', weight: W.category, strong: true },
    { text: s.subcategory || '', weight: W.category, strong: true },
    { text: s.bal_rating || '', weight: W.attribute, strong: true },
    { text: s.fire_rating || '', weight: W.attribute, strong: true },
    { text: s.acoustic_rating || '', weight: W.attribute, strong: true },
    { text: s.structural_grade || '', weight: W.attribute, strong: true },
    { text: s.manufacturer?.name || '', weight: W.manufacturer, strong: false },
    { text: s.description || '', weight: W.description, strong: false },
    { text: s.notes || '', weight: W.notes, strong: false },
  ]
  // Moisture-resistant flag → make it discoverable via waterproofing vocabulary.
  if (s.moisture_resistant) {
    fields.push({ text: 'moisture resistant water resistant wet area waterproof', weight: W.attribute, strong: false })
  }
  // Profile names / codes (e.g. "Axon", "Stria", product codes).
  for (const p of s.system_profiles || []) {
    const t = [p.name, (p as any).profile_name, (p as any).product_code].filter(Boolean).join(' ')
    if (t) fields.push({ text: t, weight: W.profile, strong: false })
  }
  // Accessory / component names so "stirrup", "screws" etc. find their systems.
  for (const c of s.system_components || []) {
    const t = c.components?.name || ''
    if (t) fields.push({ text: t, weight: W.component, strong: false })
  }
  return fields
}

type Scored = { system: LibrarySystem; score: number; strong: boolean }

function scoreSystem(s: LibrarySystem, baseTerms: Set<string>, allTerms: string[], cleaned: string): Scored {
  const fields = systemFields(s).map(f => ({ ...f, text: f.text.toLowerCase() }))
  let score = 0
  let strong = false

  for (const term of allTerms) {
    const isBase = baseTerms.has(term)
    const factor = isBase ? 1 : SYNONYM_FACTOR
    for (const f of fields) {
      if (f.text.includes(term)) {
        score += f.weight * factor
        // A typed word landing in a high-signal field = confident match.
        if (isBase && f.strong) strong = true
      }
    }
  }

  // Whole-phrase bonuses — "fibre cement cladding" sitting verbatim in the name
  // or category is the strongest possible signal.
  const phrase = cleaned.toLowerCase().trim()
  if (phrase) {
    if ((s.name || '').toLowerCase().includes(phrase)) { score += 25; strong = true }
    else if ((s.category || '').toLowerCase().includes(phrase)) { score += 14; strong = true }
  }

  return { system: s, score, strong }
}

/**
 * The main entry point. Returns relevance-ranked systems plus the parsed intent
 * and a confidence flag. Never throws; an empty/whitespace query returns all
 * systems untouched.
 */
export function searchLibrarySystems(raw: string, systems: LibrarySystem[]): LibrarySearchResult {
  const intent = getSearchIntent(raw)
  const cleaned = intent.cleaned
  const baseTerms = new Set(tokenize(cleaned))
  const allTerms = intent.terms

  if (!cleaned || allTerms.length === 0) {
    return { systems, intent, exact: false }
  }

  const scored = systems
    .map(s => scoreSystem(s, baseTerms, allTerms, cleaned))
    .filter(r => r.score > 0)
    .sort((a, b) =>
      b.score - a.score ||
      (a.system.sort_order ?? 0) - (b.system.sort_order ?? 0) ||
      (a.system.name || '').localeCompare(b.system.name || ''),
    )

  return {
    systems: scored.map(r => r.system),
    intent,
    exact: scored.some(r => r.strong),
  }
}

// ── Conversational copy (Layer 4 + safety language, Layer 9) ──────────────────

// What we call each concept in plain English inside the summary sentence.
const CONCEPT_PHRASE: Record<string, string> = {
  bal: 'BAL-rated and bushfire-related external systems',
  waterproofing: 'waterproofing and wet-area systems',
  bathroom: 'wet-area and waterproofing systems that may suit a bathroom',
  'vertical-lining': 'lining and cladding systems that may suit vertical wall applications',
  cladding: 'cladding and external wall systems',
  decking: 'decking systems, boards and sub-frame components',
  framing: 'framing and structural components',
  flooring: 'flooring and subfloor systems',
  insulation: 'insulation and thermal/acoustic products',
  roofing: 'roofing systems, flashings and accessories',
  plasterboard: 'internal lining and ceiling systems',
  fixings: 'fixings and fasteners',
  sealants: 'sealants, adhesives and tapes',
  'fibre-cement': 'fibre cement sheet, cladding and lining systems',
}

/**
 * Plain-English interpretation shown above the result cards. Always stays inside
 * BuildQuote's product-finding lane — never asserts compliance or suitability.
 */
export function getConversationalSummary(intent: SearchIntent, count: number, exact: boolean): string {
  const phrase =
    (intent.concepts[0] && CONCEPT_PHRASE[intent.concepts[0].id]) ||
    `product systems related to “${intent.cleaned}”`

  if (count === 0) {
    return `The library doesn’t have a direct match for “${intent.cleaned}” yet. Try a broader product type, or one of the suggestions below — and check with a supplier or manufacturer.`
  }
  if (!exact) {
    return `No exact match — showing the closest ${phrase} from the BuildQuote library. Open the manufacturer guides to confirm suitability for your project.`
  }
  return `Showing ${phrase} from the BuildQuote library. Open a manufacturer’s guide to confirm suitability, then add products to your list or request a quote.`
}

/** Clickable refinement chips derived from the matched concepts. */
export function getSuggestedChips(intent: SearchIntent): SearchChip[] {
  const seen = new Set<string>()
  const chips: SearchChip[] = []
  for (const { id } of intent.concepts) {
    const concept = SYNONYMS.find(c => c.id === id)
    if (!concept) continue
    for (const label of concept.chips) {
      const key = label.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      chips.push({ label, query: label })
    }
  }
  // Top up with generic chips if the query was vague.
  for (const chip of FALLBACK_CHIPS) {
    if (chips.length >= 6) break
    if (seen.has(chip.label.toLowerCase())) continue
    seen.add(chip.label.toLowerCase())
    chips.push(chip)
  }
  return chips.slice(0, 6)
}
