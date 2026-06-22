import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  let { data: profile } = await supabase
    .from('builders')
    .select('*')
    .eq('id', user!.id)
    .single()

  // Auto-create profile if missing (e.g. registered before SQL migration ran)
  if (!profile) {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: newProfile } = await admin
      .from('builders')
      .insert({ id: user!.id, email: user!.email })
      .select()
      .single()
    profile = newProfile
  }

  return <DashboardClient user={user!} profile={profile} />
}
