import fs from 'fs'
import path from 'path'
import type { LibrarySystem, Stockist } from '@/lib/data/getSystems'

// Experimental: renders a BuildQuote Data Studio static "System Card" package
// (installed under public/manufacturers/<slug>/system-cards/cards/<card-slug>/)
// as a LibrarySystem, so it can sit next to the live Supabase-backed cards on
// /library using the exact same SystemCardUI + ShoppingListProvider. Each
// entry's `slug` is suffixed "-static" so it can never collide with a live
// `systems` row slug.
//
// This is a hand-registered list (not a directory scan) so a new package
// only appears in the library once someone deliberately wires it up here.
const STATIC_CARDS: { manufacturerSlug: string; cardPath: string; slugSuffix: string }[] = [
  {
    manufacturerSlug: 'bq-inform',
    cardPath: 'manufacturers/bq-inform/system-cards/cards/vj-lining',
    slugSuffix: '-static',
  },
]

type PackageCardJson = {
  id: string
  name: string
  product_code: string
  slug: string
  category: string
  subcategory: string | null
  description: string | null
  hero_image_url: string | null
  hero_image_position_x: number | null
  hero_image_position_y: number | null
  australian_made: boolean | null
  bal_rating: string | null
  fire_rating: string | null
  moisture_resistant: boolean | null
  acoustic_rating: string | null
  structural_grade: string | null
  notes: string | null
  website_url: string | null
  install_guide_urls: { url: string; label: string }[] | null
  design_guide_url: string | null
  tech_data_url: string | null
  manufacturer: { name: string; slug: string; logo_url: string | null }
  system_colours: LibrarySystem['system_colours']
  system_profiles: LibrarySystem['system_profiles']
  system_components: LibrarySystem['system_components']
  local_stockists: {
    id: string
    name: string
    suburb: string | null
    state: string | null
    region: string | null
    phone: string | null
    website_url: string | null
    google_maps_url: string | null
    opening_hours: string | null
    delivery_info: string | null
    service_postcodes: string[]
    trade_desk_email: string | null
  }[]
}

function loadCardJson(cardPath: string): PackageCardJson | null {
  try {
    const file = path.join(process.cwd(), 'public', cardPath, 'card.json')
    const raw = fs.readFileSync(file, 'utf8')
    return JSON.parse(raw) as PackageCardJson
  } catch (e) {
    console.error('[staticSystemCards] failed to load', cardPath, e)
    return null
  }
}

// card.json stores hero_image_url as a path relative to its own folder
// (e.g. "./assets/hero.webp") — resolve it to the absolute buildquote.com.au
// URL the installed package is actually served from. Absolute (not
// site-relative) matters here: og:image / twitter:image in generateMetadata
// require a full https:// URL or link-preview crawlers won't render it.
//
// Also prefers a sibling .jpg over .webp when one exists: on-page display
// (next/image, browsers) handles webp fine, but some link-preview crawlers
// (notably WhatsApp's own client, as opposed to Meta's Sharing Debugger)
// have shown inconsistent support for webp og:image — jpg is universally
// safe. Falls back to the original path if no .jpg sibling was generated.
function resolveAssetUrl(cardPath: string, relativeUrl: string | null): string | null {
  if (!relativeUrl) return null
  if (/^https?:\/\//i.test(relativeUrl)) return relativeUrl
  let cleaned = relativeUrl.replace(/^\.\//, '')

  if (/\.webp$/i.test(cleaned)) {
    const jpgCleaned = cleaned.replace(/\.webp$/i, '.jpg')
    const jpgFile = path.join(process.cwd(), 'public', cardPath, jpgCleaned)
    if (fs.existsSync(jpgFile)) cleaned = jpgCleaned
  }

  return `https://buildquote.com.au/${cardPath}/${cleaned}`
}

function toLibrarySystem(card: PackageCardJson, cardPath: string, slugSuffix: string): LibrarySystem {
  return {
    id: card.id,
    name: card.name,
    product_code: card.product_code,
    slug: `${card.slug}${slugSuffix}`,
    category: card.category,
    subcategory: card.subcategory,
    description: card.description,
    dimensions: null,
    length_m: null,
    double_sided: false,
    hero_image_url: resolveAssetUrl(cardPath, card.hero_image_url),
    hero_image_position_x: card.hero_image_position_x,
    hero_image_position_y: card.hero_image_position_y,
    australian_made: card.australian_made,
    bal_rating: card.bal_rating,
    fire_rating: card.fire_rating,
    moisture_resistant: card.moisture_resistant,
    acoustic_rating: card.acoustic_rating,
    structural_grade: card.structural_grade,
    notes: card.notes,
    website_url: card.website_url,
    install_guide_urls: card.install_guide_urls,
    design_guide_url: card.design_guide_url,
    tech_data_url: card.tech_data_url,
    sort_order: 9999,
    manufacturer: card.manufacturer,
    system_colours: card.system_colours,
    system_profiles: card.system_profiles,
    system_components: card.system_components,
  }
}

export function getStaticSystemsForManufacturer(manufacturerSlug: string): LibrarySystem[] {
  return STATIC_CARDS
    .filter(c => c.manufacturerSlug === manufacturerSlug)
    .map(c => {
      const card = loadCardJson(c.cardPath)
      return card ? toLibrarySystem(card, c.cardPath, c.slugSuffix) : null
    })
    .filter((s): s is LibrarySystem => s !== null)
}

export function getStaticSystemByManufacturerAndSlug(manufacturerSlug: string, systemSlug: string): LibrarySystem | null {
  return getStaticSystemsForManufacturer(manufacturerSlug).find(s => s.slug === systemSlug) ?? null
}

// The static package isn't in the `systems` table, so it has no row in the
// supplier_systems join table either — its stockist list is instead read
// straight out of card.json's own local_stockists.
export function getStaticStockists(manufacturerSlug: string, systemSlug: string): Stockist[] {
  const match = STATIC_CARDS.find(c => c.manufacturerSlug === manufacturerSlug)
  if (!match) return []

  const card = loadCardJson(match.cardPath)
  if (!card) return []

  const cardSlugWithSuffix = `${card.slug}${match.slugSuffix}`
  if (cardSlugWithSuffix !== systemSlug) return []

  return (card.local_stockists ?? []).map(s => ({
    id: s.id,
    name: s.name,
    slug: s.id,
    suburb: s.suburb,
    state: s.state,
    region: s.region,
    address: null,
    phone: s.phone,
    email: s.trade_desk_email,
    website_url: s.website_url,
    google_maps_url: s.google_maps_url,
    opening_hours: s.opening_hours,
    delivery_info: s.delivery_info,
    bio: null,
    hero_photo_url: null,
    service_postcodes: s.service_postcodes ?? [],
  }))
}
