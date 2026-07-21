import { supabaseService } from '@/lib/supabase-service'
import type { LibrarySystem, Stockist } from '@/lib/data/getSystems'

// Hybrid publishing (Library V7): read path for cards published straight from
// Data Studio. Each published card is one immutable snapshot row in
// published_cards (written by Data Studio's publishCardLive via the
// publish_card RPC); the row's card_json is the full renderer-ready
// SystemCardSystem, so a card page needs exactly one indexed lookup — no
// joins, no per-section queries. Library pages run ISR and are re-rendered
// on publish via /api/revalidate-card.
//
// The card_json shape mirrors LibrarySystem deliberately (see Data Studio's
// components/system-card-renderer/types.ts) — the adapter below only fills
// v6-specific defaults.

type PublishedCardRow = {
  card_id: string
  version: string
  mfr_slug: string
  slug: string
  title: string
  mfr_name: string
  cover_url: string | null
  og_image_url: string | null
  card_json: Record<string, unknown>
  production_system_id: string | null
  published_at: string
}

export type PublishedCard = {
  system: LibrarySystem
  version: string
  ogImageUrl: string | null
  productionSystemId: string | null
  publishedAt: string
}

// Card publishing embeds stockists as a fallback copy, but the live page
// prefers the production supplier_systems join (stockists stay live —
// decision 2026-07-10), keyed by production_system_id when present.

function adaptPublishedCardJson(row: PublishedCardRow): LibrarySystem {
  const card = row.card_json as Partial<LibrarySystem> & {
    manufacturer?: { name: string; slug: string; logo_url: string | null } | null
  }
  return {
    id: (card.id as string) ?? row.card_id,
    name: card.name ?? row.title,
    product_code: card.product_code ?? '',
    slug: row.slug,
    category: card.category ?? '',
    subcategory: card.subcategory ?? null,
    description: card.description ?? null,
    dimensions: card.dimensions ?? null,
    length_m: card.length_m ?? null,
    double_sided: card.double_sided ?? false,
    hero_image_url: card.gallery_images?.[0]?.url ?? card.hero_image_url ?? row.cover_url,
    hero_image_position_x: card.hero_image_position_x ?? null,
    hero_image_position_y: card.hero_image_position_y ?? null,
    hero_image_zoom: card.hero_image_zoom ?? null,
    gallery_images: card.gallery_images ?? null,
    australian_made: card.australian_made ?? null,
    bal_rating: card.bal_rating ?? null,
    fire_rating: card.fire_rating ?? null,
    moisture_resistant: card.moisture_resistant ?? null,
    acoustic_rating: card.acoustic_rating ?? null,
    structural_grade: card.structural_grade ?? null,
    notes: card.notes ?? null,
    website_url: card.website_url ?? null,
    install_guide_urls: card.install_guide_urls ?? null,
    design_guide_url: card.design_guide_url ?? null,
    tech_data_url: card.tech_data_url ?? null,
    custom_document_links: card.custom_document_links ?? null,
    sort_order: card.sort_order ?? 0,
    manufacturer: card.manufacturer ?? { name: row.mfr_name, slug: row.mfr_slug, logo_url: null },
    system_colours: card.system_colours ?? [],
    system_profiles: card.system_profiles ?? [],
    system_components: card.system_components ?? [],
  }
}

const PUBLISHED_SELECT =
  'card_id, version, mfr_slug, slug, title, mfr_name, cover_url, og_image_url, card_json, production_system_id, published_at'

export async function getPublishedCard(
  mfrSlug: string,
  slug: string,
): Promise<PublishedCard | null> {
  const { data, error } = await supabaseService
    .from('published_cards')
    .select(PUBLISHED_SELECT)
    .eq('mfr_slug', mfrSlug)
    .eq('slug', slug)
    .eq('is_latest', true)
    .eq('status', 'published')
    .maybeSingle()

  if (error || !data) {
    // Table absent (migration not applied yet) degrades to the legacy path.
    if (error && !/does not exist/i.test(error.message)) {
      console.error('[getPublishedCard]', error)
    }
    return null
  }

  const row = data as unknown as PublishedCardRow
  return {
    system: adaptPublishedCardJson(row),
    version: row.version,
    ogImageUrl: row.og_image_url,
    productionSystemId: row.production_system_id,
    publishedAt: row.published_at,
  }
}

async function fetchPublishedRows(mfrSlug?: string): Promise<PublishedCardRow[]> {
  let query = supabaseService
    .from('published_cards')
    .select(PUBLISHED_SELECT)
    .eq('is_latest', true)
    .eq('status', 'published')
  if (mfrSlug) query = query.eq('mfr_slug', mfrSlug)

  const { data, error } = await query
  if (error || !data) {
    if (error && !/does not exist/i.test(error.message)) {
      console.error('[fetchPublishedRows]', error)
    }
    return []
  }
  return data as unknown as PublishedCardRow[]
}

export async function getPublishedSystemsForManufacturer(mfrSlug: string): Promise<LibrarySystem[]> {
  return (await fetchPublishedRows(mfrSlug)).map(adaptPublishedCardJson)
}

export async function getAllPublishedSystems(): Promise<LibrarySystem[]> {
  return (await fetchPublishedRows()).map(adaptPublishedCardJson)
}

// Stockists for a published card: live from the production supplier join when
// the card is linked to a legacy systems row. Cards never promoted to the
// systems table have no join rows — they fall back to the stockists embedded
// in the snapshot at publish time.
export function stockistsFromSnapshot(stockistsJson: unknown): Stockist[] {
  if (!Array.isArray(stockistsJson)) return []
  return (stockistsJson as Array<Record<string, unknown>>).map((s) => ({
    id: String(s.id ?? ''),
    name: String(s.name ?? ''),
    slug: String(s.id ?? ''),
    suburb: (s.suburb as string) ?? null,
    state: (s.state as string) ?? null,
    region: (s.region as string) ?? null,
    address: null,
    phone: (s.phone as string) ?? null,
    email: (s.trade_desk_email as string) ?? null,
    website_url: (s.website_url as string) ?? null,
    google_maps_url: (s.google_maps_url as string) ?? null,
    opening_hours: (s.opening_hours as string) ?? null,
    delivery_info: (s.delivery_info as string) ?? null,
    bio: null,
    hero_photo_url: null,
    service_postcodes: Array.isArray(s.service_postcodes) ? (s.service_postcodes as string[]).map(String) : [],
  }))
}

export async function getPublishedStockists(mfrSlug: string, slug: string): Promise<Stockist[]> {
  const { data } = await supabaseService
    .from('published_cards')
    .select('stockists_json')
    .eq('mfr_slug', mfrSlug)
    .eq('slug', slug)
    .eq('is_latest', true)
    .maybeSingle()
  return stockistsFromSnapshot((data as { stockists_json?: unknown } | null)?.stockists_json)
}
