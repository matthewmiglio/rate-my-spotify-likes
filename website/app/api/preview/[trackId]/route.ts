import { type NextRequest } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  const { trackId } = await params

  try {
    const res = await fetch(`https://open.spotify.com/embed/track/${trackId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })
    if (!res.ok) {
      return Response.json({ preview_url: null })
    }

    const html = await res.text()
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/)
    if (!match) {
      return Response.json({ preview_url: null })
    }

    const data = JSON.parse(match[1])
    const previewUrl = data?.props?.pageProps?.state?.data?.entity?.audioPreview?.url ?? null

    return Response.json(
      { preview_url: previewUrl },
      { headers: { 'Cache-Control': 'public, max-age=86400' } }
    )
  } catch {
    return Response.json({ preview_url: null })
  }
}
