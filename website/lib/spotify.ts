import { getServiceSupabase } from './supabase'

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'

// Exchange authorization code for tokens
export async function exchangeCode(code: string) {
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    }),
  })
  if (!res.ok) throw new Error('Failed to exchange code')
  return res.json() as Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
  }>
}

// Refresh an expired access token
export async function refreshAccessToken(refreshToken: string) {
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  if (!res.ok) throw new Error('Failed to refresh token')
  return res.json() as Promise<{
    access_token: string
    expires_in: number
    refresh_token?: string
  }>
}

// Get a valid access token for a user, refreshing if needed
export async function getValidToken(userId: string) {
  const supabase = getServiceSupabase()
  const { data: user } = await supabase
    .from('spotify_liker_users')
    .select('access_token, refresh_token, token_expires_at')
    .eq('id', userId)
    .single()

  if (!user) throw new Error('User not found')

  const expiresAt = new Date(user.token_expires_at).getTime()
  if (Date.now() < expiresAt - 60_000) {
    return user.access_token
  }

  // Token expired or about to expire — refresh
  const tokens = await refreshAccessToken(user.refresh_token)
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await supabase
    .from('spotify_liker_users')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? user.refresh_token,
      token_expires_at: newExpiresAt,
    })
    .eq('id', userId)

  return tokens.access_token
}

// Fetch the current Spotify user profile
export async function getSpotifyProfile(accessToken: string) {
  const res = await fetch(`${SPOTIFY_API_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Failed to fetch profile')
  return res.json() as Promise<{ id: string; display_name: string; images?: { url: string }[] }>
}

// Fetch ALL liked songs (handles pagination)
export async function fetchAllLikedSongs(accessToken: string) {
  const songs: Array<{
    spotify_track_id: string
    track_name: string
    artist_name: string
    album_name: string
    album_art_url: string
    preview_url: string | null
    added_at: string
  }> = []

  let url: string | null = `${SPOTIFY_API_BASE}/me/tracks?limit=50`

  while (url) {
    const res: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) throw new Error('Failed to fetch liked songs')
    const data = await res.json()

    for (const item of data.items) {
      const track = item.track
      songs.push({
        spotify_track_id: track.id,
        track_name: track.name,
        artist_name: track.artists.map((a: { name: string }) => a.name).join(', '),
        album_name: track.album.name,
        album_art_url: track.album.images?.[0]?.url ?? '',
        preview_url: track.preview_url,
        added_at: item.added_at,
      })
    }

    url = data.next
  }

  return songs
}

// Unlike songs by their Spotify track IDs (max 50 per request)
export async function unlikeSongs(accessToken: string, trackIds: string[]) {
  for (let i = 0; i < trackIds.length; i += 50) {
    const batch = trackIds.slice(i, i + 50)
    const res = await fetch(`${SPOTIFY_API_BASE}/me/tracks`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: batch }),
    })
    if (!res.ok) throw new Error(`Failed to unlike batch starting at index ${i}`)
  }
}
