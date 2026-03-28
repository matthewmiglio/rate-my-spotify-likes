import { getSession } from '@/lib/session'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET() {
  const userId = await getSession()
  if (!userId) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const supabase = getServiceSupabase()
  const { data: user } = await supabase
    .from('spotify_liker_users')
    .select('id, display_name, avatar_url')
    .eq('id', userId)
    .single()

  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 })
  }

  return Response.json({ user })
}
