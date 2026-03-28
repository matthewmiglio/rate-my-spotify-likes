import { getSession } from '@/lib/session'
import { getValidToken, fetchAllLikedSongs } from '@/lib/spotify'
import { getServiceSupabase } from '@/lib/supabase'

export async function POST() {
  const userId = await getSession()
  if (!userId) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const accessToken = await getValidToken(userId)
    const songs = await fetchAllLikedSongs(accessToken)
    const supabase = getServiceSupabase()

    // Use the RPC for bulk upsert
    const { error } = await supabase.rpc('spotify_liker_upsert_songs', {
      p_user_id: userId,
      p_songs: songs,
    })

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ synced: songs.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
