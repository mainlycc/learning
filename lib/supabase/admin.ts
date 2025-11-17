import { createClient } from '@supabase/supabase-js'

// Admin client z service role key - używać tylko w Server Actions
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  }

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. This is required for admin operations.')
  }

  return createClient(
    supabaseUrl as string,
    serviceRoleKey as string,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

