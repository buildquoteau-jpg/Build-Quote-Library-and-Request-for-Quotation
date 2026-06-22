import { NextRequest, NextResponse } from 'next/server'
import { supabaseService as supabase } from '@/lib/supabase-service'

export async function POST(req: NextRequest) {
  try {
    const { email, rfqId } = await req.json()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: 'Invalid email' }, { status: 400 })
    }

    const { error } = await supabase
      .from('community_signups')
      .insert({ email, rfq_id: rfqId || null })

    if (error) {
      console.error('Community signup error:', error)
      return NextResponse.json({ success: false, error: 'Could not save your signup. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Community signup error:', e)
    return NextResponse.json({ success: false, error: 'Could not save your signup. Please try again.' }, { status: 500 })
  }
}
