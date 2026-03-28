import { getSession } from '@/lib/session'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET() {
  const userId = await getSession()
  if (!userId) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const supabase = getServiceSupabase()
  const { data: songs } = await supabase
    .from('spotify_liker_songs')
    .select('*, spotify_liker_ratings(rating, updated_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  // Remap spotify_liker_ratings -> ratings for frontend consistency
  // The join returns an object (not array) due to the unique constraint on song_id
  const mapped = (songs || []).map((s: Record<string, unknown>) => {
    const { spotify_liker_ratings, ...rest } = s
    const ratings = spotify_liker_ratings
      ? Array.isArray(spotify_liker_ratings) ? spotify_liker_ratings : [spotify_liker_ratings]
      : []
    return { ...rest, ratings }
  })

  return Response.json({ songs: mapped })
}

export async function POST(request: Request) {
  const userId = await getSession()
  if (!userId) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { song_id, rating } = await request.json()
  if (!song_id || !rating || rating < 1 || rating > 7) {
    return Response.json({ error: 'Invalid rating' }, { status: 400 })
  }

  const supabase = getServiceSupabase()
  const { error } = await supabase.rpc('spotify_liker_upsert_rating', {
    p_user_id: userId,
    p_song_id: song_id,
    p_rating: rating,
  })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}
