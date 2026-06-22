import { createClient } from '@supabase/supabase-js'

// Server-only — never import in client components or pages rendered on the client.
// Uses the service role key which bypasses RLS; keep writes minimal and deliberate.
export const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
