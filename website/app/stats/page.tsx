'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

interface Rating {
  rating: number
  updated_at: string
}

interface Song {
  id: string
  spotify_track_id: string
  track_name: string
  artist_name: string
  album_name: string
  album_art_url: string
  added_at: string | null
  ratings: Rating[]
}

function TimelineChart({ data }: { data: [string, number][] }) {
  if (data.length === 0) return null
  const maxCount = Math.max(...data.map(([, c]) => c))
  const W = 600, H = 140, PAD_BOTTOM = 24
  const chartH = H - PAD_BOTTOM

  const points = data.map(([, count], i) => {
    const x = data.length === 1 ? W / 2 : (i / (data.length - 1)) * W
    const y = chartH - (count / maxCount) * (chartH - 8)
    return { x, y }
  })

  const line = points.map((p) => `${p.x},${p.y}`).join(' ')
  const area = `0,${chartH} ${line} ${W},${chartH}`

  // Adaptive x-axis labels
  const firstDate = new Date(data[0][0] + '-01')
  const lastDate = new Date(data[data.length - 1][0] + '-01')
  const spanMonths = (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + (lastDate.getMonth() - firstDate.getMonth())

  const labels: { x: number; text: string }[] = []
  if (spanMonths > 12) {
    // Show year labels
    const years = new Set<string>()
    data.forEach(([month], i) => {
      const yr = month.slice(0, 4)
      if (!years.has(yr)) {
        years.add(yr)
        labels.push({ x: data.length === 1 ? W / 2 : (i / (data.length - 1)) * W, text: yr })
      }
    })
  } else if (spanMonths > 1) {
    // Show month labels
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    data.forEach(([month], i) => {
      const m = parseInt(month.slice(5, 7), 10) - 1
      labels.push({ x: data.length === 1 ? W / 2 : (i / (data.length - 1)) * W, text: months[m] })
    })
  } else {
    data.forEach(([month], i) => {
      labels.push({ x: data.length === 1 ? W / 2 : (i / (data.length - 1)) * W, text: month })
    })
  }

  // Limit to ~8 labels to avoid crowding
  const step = Math.max(1, Math.ceil(labels.length / 8))
  const visibleLabels = labels.filter((_, i) => i % step === 0)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="tl-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1DB954" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#1DB954" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#tl-fill)" />
      <polyline points={line} fill="none" stroke="#1DB954" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {/* Hover targets with tooltips */}
      {points.map((p, i) => (
        <g key={i} className="group">
          <circle cx={p.x} cy={p.y} r="8" fill="transparent" className="cursor-pointer" />
          <circle cx={p.x} cy={p.y} r="3" fill="#1DB954" opacity="0" className="transition-opacity group-hover:opacity-100" />
          <rect x={p.x - 40} y={p.y - 28} width="80" height="20" rx="4" fill="rgba(0,0,0,0.85)" opacity="0" className="pointer-events-none transition-opacity group-hover:opacity-100" />
          <text x={p.x} y={p.y - 15} textAnchor="middle" fill="white" fontSize="10" fontWeight="700" fontFamily="inherit" opacity="0" className="pointer-events-none transition-opacity group-hover:opacity-100">
            {data[i][0]}: {data[i][1]}
          </text>
        </g>
      ))}
      {visibleLabels.map((l, i) => (
        <text key={i} x={l.x} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="10" fontWeight="600" fontFamily="inherit">
          {l.text}
        </text>
      ))}
    </svg>
  )
}

export default function StatsPage() {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSongs = useCallback(async () => {
    const res = await fetch('/api/ratings')
    if (res.status === 401) {
      window.location.href = '/api/auth/login'
      return
    }
    const data = await res.json()
    setSongs(data.songs || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSongs()
  }, [fetchSongs])

  const rated = useMemo(() => songs.filter((s) => s.ratings.length > 0), [songs])
  const unrated = useMemo(() => songs.filter((s) => s.ratings.length === 0), [songs])

  // 1. Rating Distribution
  const distribution = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 }
    for (const s of rated) counts[s.ratings[0].rating]++
    return counts
  }, [rated])

  // 2. Summary Stats
  const avgRating = useMemo(() => {
    if (rated.length === 0) return 0
    const sum = rated.reduce((acc, s) => acc + s.ratings[0].rating, 0)
    return sum / rated.length
  }, [rated])

  // 5. Top Artists by Avg Rating (min 3 songs rated)
  const topArtistsByRating = useMemo(() => {
    const map = new Map<string, number[]>()
    for (const s of rated) {
      const arr = map.get(s.artist_name) || []
      arr.push(s.ratings[0].rating)
      map.set(s.artist_name, arr)
    }
    return [...map.entries()]
      .filter(([, ratings]) => ratings.length >= 3)
      .map(([name, ratings]) => ({
        name,
        avg: ratings.reduce((a, b) => a + b, 0) / ratings.length,
        count: ratings.length,
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 10)
  }, [rated])

  // 6. Most Saved Artists
  const topArtistsBySongs = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of songs) map.set(s.artist_name, (map.get(s.artist_name) || 0) + 1)
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }))
  }, [songs])

  // 7. Rating Pace (by day)
  const ratingPace = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of rated) {
      const day = s.ratings[0].updated_at?.slice(0, 10)
      if (day) map.set(day, (map.get(day) || 0) + 1)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [rated])

  // 8. Library Timeline (by month)
  const libraryTimeline = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of songs) {
      if (!s.added_at) continue
      const month = s.added_at.slice(0, 7) // YYYY-MM
      map.set(month, (map.get(month) || 0) + 1)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [songs])

  // 9. Top Albums
  const topAlbums = useMemo(() => {
    const map = new Map<string, { count: number; art: string; artist: string }>()
    for (const s of songs) {
      const key = `${s.album_name}|||${s.artist_name}`
      const existing = map.get(key)
      if (existing) {
        existing.count++
      } else {
        map.set(key, { count: 1, art: s.album_art_url, artist: s.artist_name })
      }
    }
    return [...map.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([key, val]) => ({
        album: key.split('|||')[0],
        artist: val.artist,
        count: val.count,
        art: val.art,
      }))
  }, [songs])

  // 10. Artist Polarization (widest spread, min 3 rated)
  const polarized = useMemo(() => {
    const map = new Map<string, number[]>()
    for (const s of rated) {
      const arr = map.get(s.artist_name) || []
      arr.push(s.ratings[0].rating)
      map.set(s.artist_name, arr)
    }
    return [...map.entries()]
      .filter(([, ratings]) => ratings.length >= 3)
      .map(([name, ratings]) => {
        const min = Math.min(...ratings)
        const max = Math.max(...ratings)
        return { name, min, max, spread: max - min, count: ratings.length }
      })
      .sort((a, b) => b.spread - a.spread || b.count - a.count)
      .slice(0, 10)
  }, [rated])

  // 3. Top Rated Songs
  const topSongs = useMemo(
    () =>
      [...rated]
        .sort((a, b) => b.ratings[0].rating - a.ratings[0].rating)
        .slice(0, 10),
    [rated]
  )

  // 4. Lowest Rated Songs
  const worstSongs = useMemo(
    () =>
      [...rated]
        .sort((a, b) => a.ratings[0].rating - b.ratings[0].rating)
        .slice(0, 10),
    [rated]
  )

  if (loading) {
    return (
      <main className="relative z-10 flex flex-1 items-center justify-center">
        <p className="text-lg font-semibold text-white/60">Loading stats...</p>
      </main>
    )
  }

  const maxDist = Math.max(...Object.values(distribution), 1)
  const maxPace = Math.max(...ratingPace.map(([, c]) => c), 1)

  return (
    <main className="relative z-10 flex flex-1 flex-col items-center gap-8 p-6 md:p-8">
      {/* Header */}
      <div className="flex w-full max-w-3xl items-center justify-between">
        <h1 className="text-xl font-black uppercase tracking-wider">
          <span className="text-spotify">Your</span> Stats
        </h1>
        <div className="flex gap-2">
          <a href="/rate" className="glass-card rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition hover:bg-white/15">
            Rate
          </a>
          <a href="/review" className="glass-card rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition hover:bg-white/15">
            Review
          </a>
          <a href="/api/auth/logout" className="glass-card rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition hover:bg-white/15">
            Logout
          </a>
        </div>
      </div>

      {/* 2. Summary Stats */}
      <div className="grid w-full max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Total Songs', value: songs.length.toLocaleString() },
          { label: 'Rated', value: rated.length.toLocaleString() },
          { label: 'Unrated', value: unrated.length.toLocaleString() },
          { label: 'Avg Rating', value: avgRating.toFixed(1) },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4 text-center">
            <p className="text-2xl font-black text-spotify">{stat.value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/40">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* 1. Rating Distribution */}
      <div className="glass-card w-full max-w-3xl p-6">
        <h2 className="mb-4 text-sm font-black uppercase tracking-wider text-white/50">Rating Distribution</h2>
        <div className="flex items-end gap-3" style={{ height: 160 }}>
          {[1, 2, 3, 4, 5, 6, 7].map((r) => (
            <div key={r} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-xs font-bold text-white/50">{distribution[r]}</span>
              <div className="flex w-full items-end overflow-hidden rounded-t-lg bg-white/5" style={{ height: 120 }}>
                <div
                  className="w-full rounded-t-lg bg-spotify transition-all"
                  style={{ height: `${(distribution[r] / maxDist) * 100}%` }}
                />
              </div>
              <span className="text-sm font-black text-white/60">{r}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Top Rated Songs & 4. Lowest Rated Songs — side by side */}
      <div className="grid w-full max-w-3xl gap-4 md:grid-cols-2">
        {/* Top Rated */}
        <div className="glass-card p-6">
          <h2 className="mb-4 text-sm font-black uppercase tracking-wider text-white/50">Top Rated Songs</h2>
          <div className="space-y-2">
            {topSongs.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="w-5 text-right text-xs font-black text-white/30">{i + 1}</span>
                {s.album_art_url && (
                  <img src={s.album_art_url} alt="" className="h-8 w-8 rounded" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{s.track_name}</p>
                  <p className="truncate text-xs text-white/40">{s.artist_name}</p>
                </div>
                <span className="text-sm font-black text-spotify">{s.ratings[0].rating}</span>
              </div>
            ))}
            {topSongs.length === 0 && <p className="text-sm text-white/30">No rated songs yet</p>}
          </div>
        </div>

        {/* Lowest Rated */}
        <div className="glass-card p-6">
          <h2 className="mb-4 text-sm font-black uppercase tracking-wider text-white/50">Lowest Rated Songs</h2>
          <div className="space-y-2">
            {worstSongs.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="w-5 text-right text-xs font-black text-white/30">{i + 1}</span>
                {s.album_art_url && (
                  <img src={s.album_art_url} alt="" className="h-8 w-8 rounded" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{s.track_name}</p>
                  <p className="truncate text-xs text-white/40">{s.artist_name}</p>
                </div>
                <span className="text-sm font-black text-red-400">{s.ratings[0].rating}</span>
              </div>
            ))}
            {worstSongs.length === 0 && <p className="text-sm text-white/30">No rated songs yet</p>}
          </div>
        </div>
      </div>

      {/* 5. Top Artists by Avg Rating */}
      <div className="glass-card w-full max-w-3xl p-6">
        <h2 className="mb-4 text-sm font-black uppercase tracking-wider text-white/50">Top Artists by Avg Rating <span className="font-semibold text-white/30">(min 3 rated)</span></h2>
        <div className="space-y-3">
          {topArtistsByRating.map((a, i) => (
            <div key={a.name} className="flex items-center gap-3">
              <span className="w-5 text-right text-xs font-black text-white/30">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-bold">{a.name}</p>
                  <span className="ml-2 text-sm font-black text-spotify">{a.avg.toFixed(1)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-spotify" style={{ width: `${(a.avg / 7) * 100}%` }} />
                </div>
              </div>
              <span className="text-xs font-semibold text-white/30">{a.count} songs</span>
            </div>
          ))}
          {topArtistsByRating.length === 0 && <p className="text-sm text-white/30">Rate at least 3 songs per artist</p>}
        </div>
      </div>

      {/* 6. Most Saved Artists */}
      <div className="glass-card w-full max-w-3xl p-6">
        <h2 className="mb-4 text-sm font-black uppercase tracking-wider text-white/50">Most Saved Artists</h2>
        <div className="space-y-3">
          {topArtistsBySongs.map((a, i) => {
            const maxCount = topArtistsBySongs[0]?.count || 1
            return (
              <div key={a.name} className="flex items-center gap-3">
                <span className="w-5 text-right text-xs font-black text-white/30">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-bold">{a.name}</p>
                    <span className="ml-2 text-sm font-black text-spotify">{a.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-spotify" style={{ width: `${(a.count / maxCount) * 100}%` }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 7. Rating Pace */}
      <div className="glass-card w-full max-w-3xl p-6">
        <h2 className="mb-4 text-sm font-black uppercase tracking-wider text-white/50">Rating Pace</h2>
        {ratingPace.length > 0 ? (
          <div className="flex items-end gap-1 overflow-x-auto" style={{ height: 120 }}>
            {ratingPace.map(([day, count]) => (
              <div key={day} className="group relative flex flex-col items-center" style={{ minWidth: ratingPace.length > 20 ? 12 : 32 }}>
                <div className="flex w-full items-end overflow-hidden rounded-t bg-white/5" style={{ height: 100 }}>
                  <div
                    className="w-full rounded-t bg-spotify"
                    style={{ height: `${(count / maxPace) * 100}%` }}
                  />
                </div>
                <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-black/80 px-2 py-1 text-xs font-bold opacity-0 transition group-hover:opacity-100 whitespace-nowrap">
                  {day}: {count}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/30">No ratings yet</p>
        )}
      </div>

      {/* 8. Library Timeline */}
      <div className="glass-card w-full max-w-3xl p-6">
        <h2 className="mb-4 text-sm font-black uppercase tracking-wider text-white/50">Library Timeline</h2>
        {libraryTimeline.length > 0 ? (
          <TimelineChart data={libraryTimeline} />
        ) : (
          <p className="text-sm text-white/30">No timeline data</p>
        )}
      </div>

      {/* 9. Top Albums */}
      <div className="glass-card w-full max-w-3xl p-6">
        <h2 className="mb-4 text-sm font-black uppercase tracking-wider text-white/50">Top Albums</h2>
        <div className="space-y-2">
          {topAlbums.map((a, i) => (
            <div key={`${a.album}-${a.artist}`} className="flex items-center gap-3">
              <span className="w-5 text-right text-xs font-black text-white/30">{i + 1}</span>
              {a.art && <img src={a.art} alt="" className="h-10 w-10 rounded" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{a.album}</p>
                <p className="truncate text-xs text-white/40">{a.artist}</p>
              </div>
              <span className="text-sm font-black text-spotify">{a.count} songs</span>
            </div>
          ))}
        </div>
      </div>

      {/* 10. Artist Polarization */}
      <div className="glass-card w-full max-w-3xl p-6">
        <h2 className="mb-4 text-sm font-black uppercase tracking-wider text-white/50">Most Polarizing Artists <span className="font-semibold text-white/30">(min 3 rated)</span></h2>
        <div className="space-y-3">
          {polarized.map((a) => (
            <div key={a.name} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-bold">{a.name}</p>
                  <span className="ml-2 text-xs font-semibold text-white/40">{a.count} songs</span>
                </div>
                {/* Range bar showing min to max */}
                <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="absolute h-full rounded-full"
                    style={{
                      left: `${((a.min - 1) / 6) * 100}%`,
                      width: `${((a.spread) / 6) * 100}%`,
                      background: 'linear-gradient(90deg, #ef4444, #1DB954)',
                    }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-xs font-bold">
                  <span className="text-red-400">Low: {a.min}</span>
                  <span className="text-spotify">High: {a.max}</span>
                </div>
              </div>
            </div>
          ))}
          {polarized.length === 0 && <p className="text-sm text-white/30">Rate at least 3 songs per artist</p>}
        </div>
      </div>

      <div className="h-8" />
    </main>
  )
}
