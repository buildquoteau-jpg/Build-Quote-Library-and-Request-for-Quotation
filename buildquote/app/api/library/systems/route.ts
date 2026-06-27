import { NextRequest, NextResponse } from 'next/server'
import { supabaseService as supabase } from '@/lib/supabase-service'

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
      query = query.or(
        `name.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%,subcategory.ilike.%${q}%`
      )
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
