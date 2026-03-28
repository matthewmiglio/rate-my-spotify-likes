import { type NextRequest } from 'next/server'
import { redirect } from 'next/navigation'
import { exchangeCode, getSpotifyProfile } from '@/lib/spotify'
import { getServiceSupabase } from '@/lib/supabase'
import { setSession } from '@/lib/session'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (!code) {
    return new Response('Missing code', { status: 400 })
  }

  const tokens = await exchangeCode(code)
  const profile = await getSpotifyProfile(tokens.access_token)
  const avatarUrl = profile.images?.[0]?.url ?? null
  const supabase = getServiceSupabase()

  // Upsert user
  const { data: existingUser } = await supabase
    .from('spotify_liker_users')
    .select('id')
    .eq('spotify_id', profile.id)
    .single()

  let userId: string

  if (existingUser) {
    userId = existingUser.id
    await supabase
      .from('spotify_liker_users')
      .update({
        display_name: profile.display_name,
        avatar_url: avatarUrl,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      })
      .eq('id', userId)
  } else {
    const { data: newUser } = await supabase
      .from('spotify_liker_users')
      .insert({
        spotify_id: profile.id,
        display_name: profile.display_name,
        avatar_url: avatarUrl,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      })
      .select('id')
      .single()
    userId = newUser!.id
  }

  await setSession(userId)
  redirect('/rate')
}
