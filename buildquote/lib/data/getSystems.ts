import { supabaseService } from '@/lib/supabase-service'

// ── Types ──────────────────────────────────────────────────────────────────

export type LibraryColour = {
  colour_name: string
  image_url: string | null
  sort_order: number
  is_stocked: boolean
}

export type LibraryProfile = {
  id: string
  profile_name: string | null
  name: string | null
  product_code: string | null
  dimensions: string | null
  length_mm: number | null
  width_mm: number | null
  height_mm: number | null
  thickness_mm: number | null
  uom: string | null
  supplier_pack_qty: number | null
  supplier_pack_uom: string | null
  sort_order: number
}

export type LibraryComponent = {
  id: string
  role: string
  notes: string | null
  sort_order: number
  components: {
    name: string
    sku: string | null
    description: string | null
    category: string | null
    uom: string | null
    procurement_route: string | null
  } | null
}

export type LibrarySystem = {
  id: string
  name: string
  product_code: string
  slug: string
  category: string
  subcategory: string | null
  description: string | null
  dimensions: string | null
  length_m: number | null
  double_sided: boolean
  hero_image_url: string | null
  hero_image_position_x: number | null
  hero_image_position_y: number | null
  // Optional swipeable hero gallery (hybrid-published cards). Index 0 is the
  // cover/share image; cards without one render the single hero as before.
  gallery_images?: {
    url: string
    og_jpg_url?: string | null
    alt: string
    caption?: string | null
  }[] | null
  australian_made: boolean | null
  bal_rating: string | null
  fire_rating: string | null
  moisture_resistant: boolean | null
  acoustic_rating: string | null
  structural_grade: string | null
  notes: string | null
  website_url: string | null
  install_guide_urls: { label: string; url: string }[] | null
  design_guide_url: string | null
  tech_data_url: string | null
  sort_order: number
  manufacturer: {
    name: string
    slug: string
    logo_url: string | null
    description?: string | null
  } | null
  system_colours: LibraryColour[]
  system_profiles: LibraryProfile[]
  system_components: LibraryComponent[]
}

// A supplier that stocks a given system (via the supplier_systems link table).
// Location is service-area based for now — suppliers carry suburb/region/state
// and a Google Maps embed URL, but no lat/lng, so there's no distance sort yet.
export type Stockist = {
  id: string
  name: string
  slug: string
  suburb: string | null
  state: string | null
  region: string | null
  address: string | null
  phone: string | null
  email: string | null
  website_url: string | null
  google_maps_url: string | null
  opening_hours: string | null
  delivery_info: string | null
  bio: string | null
  hero_photo_url: string | null
  // Postcodes this supplier services, used to flag "services your area".
  service_postcodes: string[]
}

// `suppliers.service_postcodes` is stored as text holding a JSON array
// (e.g. '["6281","6282"]'). Parse defensively — fall back to splitting on
// non-digits so a plain "6281, 6282" string still works.
function parseServicePostcodes(raw: string | string[] | null): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map(String)
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map(String)
  } catch { /* not JSON — fall through */ }
  return raw.split(/\D+/).filter(Boolean)
}

export type ManufacturerListItem = {
  id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  hero_image_url: string | null
  hero_image_position_y: number | null
  system_count: number
}

// ── Queries ────────────────────────────────────────────────────────────────

// Manufacturers with at least one system, for the SEO directory page.
// Reads Supabase directly (was previously fetched cross-origin from the MFP
// /api/manufacturers endpoint).
export async function getManufacturers(): Promise<ManufacturerListItem[]> {
  // Cookie-free client: these are public-catalogue reads used by ISR library
  // pages — touching cookies() would force them back to per-request rendering.
  const supabase = supabaseService

  const { data, error } = await supabase
    .from('manufacturers')
    .select('id, name, slug, description, logo_url, hero_image_url, hero_image_position_y, systems ( id )')
    .order('name')

  if (error || !data) {
    console.error('[getManufacturers]', error)
    return []
  }

  return (data as any[])
    .map(m => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      description: m.description,
      logo_url: m.logo_url,
      hero_image_url: m.hero_image_url,
      hero_image_position_y: m.hero_image_position_y ?? null,
      system_count: (m.systems || []).length,
    }))
    .filter(m => m.system_count > 0)
}

export async function getAllSystems(): Promise<LibrarySystem[]> {
  // Cookie-free client: these are public-catalogue reads used by ISR library
  // pages — touching cookies() would force them back to per-request rendering.
  const supabase = supabaseService

  const { data, error } = await supabase
    .from('manufacturers')
    .select(`
      name, slug, logo_url, description,
      systems (
        id, name, product_code, slug, category, subcategory,
        description, hero_image_url, hero_image_position_x, hero_image_position_y,
        australian_made, bal_rating, fire_rating, moisture_resistant,
        acoustic_rating, structural_grade, notes, sort_order,
        system_colours ( colour_name, image_url, sort_order, is_stocked ),
        system_profiles ( id, name, profile_name, product_code ),
        system_components ( id, components ( id, name ) )
      )
    `)
    .order('name')

  if (error || !data) {
    console.error('[getAllSystems]', error)
    return []
  }

  const systems: LibrarySystem[] = []

  for (const mfr of data as any[]) {
    for (const sys of (mfr.systems || [])) {
      systems.push({
        ...sys,
        double_sided: sys.double_sided ?? false,
        dimensions: null,
        length_m: null,
        website_url: null,
        install_guide_urls: null,
        design_guide_url: null,
        tech_data_url: null,
        manufacturer: { name: mfr.name, slug: mfr.slug, logo_url: mfr.logo_url, description: mfr.description ?? null },
        system_colours: ((sys.system_colours || []) as LibraryColour[])
          .sort((a, b) => a.sort_order - b.sort_order),
        system_profiles: sys.system_profiles || [],
        system_components: sys.system_components || [],
      })
    }
  }

  return systems.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}

// Suppliers who stock a given system, via the supplier_systems link table.
// Uses the service client: the portal `suppliers`/`supplier_systems` tables may
// not have anon SELECT policies, and this only ever runs server-side.
export async function getStockistsForSystem(systemId: string): Promise<Stockist[]> {
  const { data, error } = await supabaseService
    .from('supplier_systems')
    .select(`
      suppliers (
        id, name, slug, suburb, state, region, address,
        phone, email, website_url, google_maps_url,
        opening_hours, delivery_info, bio, hero_photo_url, service_postcodes
      )
    `)
    .eq('system_id', systemId)

  if (error || !data) {
    console.error('[getStockistsForSystem]', error)
    return []
  }

  type RawSupplier = Omit<Stockist, 'service_postcodes'> & {
    service_postcodes: string | string[] | null
  }

  // Dedupe in case a supplier is linked more than once.
  const seen = new Set<string>()
  const stockists: Stockist[] = []
  for (const row of data as unknown as { suppliers: RawSupplier | null }[]) {
    const s = row.suppliers
    if (!s || seen.has(s.id)) continue
    seen.add(s.id)
    stockists.push({ ...s, service_postcodes: parseServicePostcodes(s.service_postcodes) })
  }

  return stockists.sort((a, b) => a.name.localeCompare(b.name))
}

// Shared select + mapper for the full system detail card. `manufacturers!inner`
// lets us filter on the manufacturer slug (nested manufacturer/system routes).
const SYSTEM_DETAIL_SELECT = `
  id, name, product_code, slug, category, subcategory,
  description, dimensions, length_m, double_sided,
  hero_image_url, hero_image_position_x, hero_image_position_y,
  australian_made, bal_rating, fire_rating, moisture_resistant,
  acoustic_rating, structural_grade, notes, sort_order,
  website_url, install_guide_urls, design_guide_url, tech_data_url,
  manufacturers!inner ( name, slug, logo_url ),
  system_colours ( colour_name, image_url, sort_order, is_stocked ),
  system_profiles (
    id, profile_name, name, product_code, dimensions,
    length_mm, width_mm, height_mm, thickness_mm,
    uom, supplier_pack_qty, supplier_pack_uom, sort_order
  ),
  system_components (
    id, role, notes, sort_order,
    components ( name, sku, description, category, uom, procurement_route )
  )
`

function mapSystemDetail(sys: any): LibrarySystem {
  return {
    ...sys,
    double_sided: sys.double_sided ?? false,
    manufacturer: sys.manufacturers ?? null,
    system_colours: ((sys.system_colours || []) as LibraryColour[])
      .sort((a, b) => a.sort_order - b.sort_order),
    system_profiles: ((sys.system_profiles || []) as LibraryProfile[])
      .sort((a, b) => a.sort_order - b.sort_order),
    system_components: ((sys.system_components || []) as LibraryComponent[])
      .sort((a, b) => a.sort_order - b.sort_order),
  }
}

export async function getSystemBySlug(slug: string): Promise<LibrarySystem | null> {
  // Cookie-free client: these are public-catalogue reads used by ISR library
  // pages — touching cookies() would force them back to per-request rendering.
  const supabase = supabaseService
  const { data, error } = await supabase
    .from('systems').select(SYSTEM_DETAIL_SELECT).eq('slug', slug).maybeSingle()
  if (error || !data) {
    if (error) console.error('[getSystemBySlug]', error)
    return null
  }
  return mapSystemDetail(data as any)
}

// Nested route lookup: a system slug is only unique *within* its manufacturer,
// so both are required.
export async function getSystemByManufacturerAndSlug(
  mfrSlug: string,
  systemSlug: string,
): Promise<LibrarySystem | null> {
  // Cookie-free client: these are public-catalogue reads used by ISR library
  // pages — touching cookies() would force them back to per-request rendering.
  const supabase = supabaseService
  const { data, error } = await supabase
    .from('systems').select(SYSTEM_DETAIL_SELECT)
    .eq('slug', systemSlug)
    .eq('manufacturers.slug', mfrSlug)
    .maybeSingle()
  if (error || !data) {
    if (error) console.error('[getSystemByManufacturerAndSlug]', error)
    return null
  }
  return mapSystemDetail(data as any)
}

export type ManufacturerDetail = {
  id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  website_url: string | null
  hero_image_url: string | null
  hero_image_position_y: number | null
  hero_wide_image_url: string | null
  hero_wide_image_position_y: number | null
  seo_title: string | null
  seo_description: string | null
}

export async function getManufacturerBySlug(slug: string): Promise<ManufacturerDetail | null> {
  // Cookie-free client: these are public-catalogue reads used by ISR library
  // pages — touching cookies() would force them back to per-request rendering.
  const supabase = supabaseService
  const { data, error } = await supabase
    .from('manufacturers')
    .select('id, name, slug, description, logo_url, website_url, hero_image_url, hero_image_position_y, hero_wide_image_url, hero_wide_image_position_y, seo_title, seo_description')
    .eq('slug', slug)
    .maybeSingle()
  if (error || !data) {
    if (error) console.error('[getManufacturerBySlug]', error)
    return null
  }
  return data as ManufacturerDetail
}

// A manufacturer's systems for its landing-page grid — mirrors getAllSystems'
// shape (tile counts) but scoped to one manufacturer.
export async function getSystemsForManufacturer(mfrSlug: string): Promise<LibrarySystem[]> {
  // Cookie-free client: these are public-catalogue reads used by ISR library
  // pages — touching cookies() would force them back to per-request rendering.
  const supabase = supabaseService
  const { data, error } = await supabase
    .from('manufacturers')
    .select(`
      name, slug, logo_url, description,
      systems (
        id, name, product_code, slug, category, subcategory,
        description, hero_image_url, hero_image_position_x, hero_image_position_y,
        australian_made, bal_rating, fire_rating, moisture_resistant,
        acoustic_rating, structural_grade, notes, sort_order,
        system_colours ( colour_name, image_url, sort_order, is_stocked ),
        system_profiles ( id, name, profile_name, product_code ),
        system_components ( id, components ( id, name ) )
      )
    `)
    .eq('slug', mfrSlug)
    .maybeSingle()

  if (error || !data) {
    if (error) console.error('[getSystemsForManufacturer]', error)
    return []
  }

  const mfr = data as any
  const systems: LibrarySystem[] = (mfr.systems || []).map((sys: any) => ({
    ...sys,
    double_sided: sys.double_sided ?? false,
    dimensions: null,
    length_m: null,
    website_url: null,
    install_guide_urls: null,
    design_guide_url: null,
    tech_data_url: null,
    manufacturer: { name: mfr.name, slug: mfr.slug, logo_url: mfr.logo_url, description: mfr.description ?? null },
    system_colours: ((sys.system_colours || []) as LibraryColour[]).sort((a, b) => a.sort_order - b.sort_order),
    system_profiles: sys.system_profiles || [],
    system_components: sys.system_components || [],
  }))

  return systems.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}
