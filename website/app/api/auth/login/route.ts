import { redirect } from 'next/navigation'

export async function GET() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    scope: 'user-library-read user-library-modify',
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
  })

  redirect(`https://accounts.spotify.com/authorize?${params.toString()}`)
}
