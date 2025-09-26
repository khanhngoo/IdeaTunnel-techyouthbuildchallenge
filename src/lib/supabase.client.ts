import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const isValidUrl = /^https?:\/\//.test(url)

export const supabase = (isValidUrl && !!anon) ? createClient(url, anon) : null

if (!supabase) {
  if (typeof window !== 'undefined') {
    if (!isValidUrl) console.warn('[Supabase] Invalid or missing NEXT_PUBLIC_SUPABASE_URL')
    if (!anon) console.warn('[Supabase] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
}

export function isSupabaseConfigured(): boolean {
  return !!supabase
}

export async function getSession() {
  if (!supabase) return { data: { session: null }, error: null } as const
  return await supabase.auth.getSession()
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await getSession()
  return data.session?.user?.id ?? null
}

export async function ensureUserBootstrap(): Promise<{ workspaceId: string | null }> {
  if (!supabase) return { workspaceId: null }
  const userId = await getCurrentUserId()
  if (!userId) return { workspaceId: null }
  // Upsert profile
  await supabase.from('profiles').upsert({ id: userId }, { onConflict: 'id' })
  // Find existing workspace
  const { data: ws } = await supabase.from('workspaces').select('id').eq('owner_id', userId).limit(1).maybeSingle()
  if (ws?.id) return { workspaceId: ws.id }
  // Create one if missing
  const { data: created } = await supabase.from('workspaces').insert({ owner_id: userId, title: 'My Workspace' }).select('id').single()
  return { workspaceId: created?.id ?? null }
}


