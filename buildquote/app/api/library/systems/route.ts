import { NextRequest, NextResponse } from 'next/server'
import { supabaseService as supabase } from '@/lib/supabase-service'
import { cleanSearchQuery, expandSearchTerms } from '@/lib/searchSynonyms'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q        = searchParams.get('q')?.trim() ?? ''
  const category = searchParams.get('category')?.trim() ?? ''

  try {
    let query = supabase
      .from('systems')
      .select(`
        id, name, slug, category, subcategory, description,
        hero_image_url, hero_image_position_x, hero_image_position_y,
        sort_order,
        manufacturers ( name, slug, logo_url ),
        system_colours ( colour_name, image_url, sort_order, is_stocked ),
        system_profiles ( id ),
        system_components ( id, components ( id ) )
      `)
      .order('sort_order', { ascending: true })

    if (category) {
      query = query.eq('category', category)
    }

    if (q) {
      // Clean conversational phrasing ("I need BAL 29 cladding" → "BAL 29 cladding"),
      // then expand into builder-vocabulary synonyms and OR-search every term across
      // the text + attribute columns. Shares the exact same dictionary the instant
      // client-side search uses (lib/searchSynonyms.ts) so behaviour stays in sync.
      const cleaned = cleanSearchQuery(q)
      const terms = expandSearchTerms(cleaned)
      const safe = (terms.length > 0 ? terms : [cleaned])
        // ilike treats % and , as special inside .or() — strip them to avoid breaking the filter.
        .map(t => t.replace(/[%,]/g, '').trim())
        .filter(Boolean)
      if (safe.length > 0) {
        const conditions = safe
          .map(w => `name.ilike.%${w}%,description.ilike.%${w}%,category.ilike.%${w}%,subcategory.ilike.%${w}%,bal_rating.ilike.%${w}%,fire_rating.ilike.%${w}%,structural_grade.ilike.%${w}%`)
          .join(',')
        query = query.or(conditions)
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('[api/library/systems]', error)
      return NextResponse.json({ error: 'Query failed' }, { status: 500 })
    }

    const systems = (data ?? []).map((sys: any) => ({
      ...sys,
      double_sided: false,
      dimensions: null,
      length_m: null,
      australian_made: null,
      bal_rating: null,
      fire_rating: null,
      moisture_resistant: null,
      acoustic_rating: null,
      structural_grade: null,
      notes: null,
      website_url: null,
      install_guide_urls: null,
      design_guide_url: null,
      tech_data_url: null,
      custom_document_links: null,
      product_code: '',
      manufacturer: sys.manufacturers ?? null,
      system_colours: ((sys.system_colours ?? []) as any[])
        .sort((a: any, b: any) => a.sort_order - b.sort_order),
      system_profiles: sys.system_profiles ?? [],
      system_components: sys.system_components ?? [],
    }))

    return NextResponse.json(systems)
  } catch (err) {
    console.error('[api/library/systems] unexpected', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
