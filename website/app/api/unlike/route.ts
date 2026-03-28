import { getSession } from '@/lib/session'
import { getValidToken, unlikeSongs } from '@/lib/spotify'
import { getServiceSupabase } from '@/lib/supabase'

export async function POST(request: Request) {
  const userId = await getSession()
  if (!userId) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { threshold } = await request.json()
  if (!threshold || threshold < 1 || threshold > 5) {
    return Response.json({ error: 'Invalid threshold' }, { status: 400 })
  }

  const supabase = getServiceSupabase()
  const { data: songsToUnlike, error } = await supabase.rpc('spotify_liker_get_songs_below_threshold', {
    p_user_id: userId,
    p_threshold: threshold,
  })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  if (!songsToUnlike || songsToUnlike.length === 0) {
    return Response.json({ unliked: 0 })
  }

  const accessToken = await getValidToken(userId)
  const trackIds = songsToUnlike.map((s: { spotify_track_id: string }) => s.spotify_track_id)
  await unlikeSongs(accessToken, trackIds)

  return Response.json({ unliked: trackIds.length, songs: songsToUnlike })
}
