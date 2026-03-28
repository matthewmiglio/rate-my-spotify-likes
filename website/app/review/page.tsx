'use client'

import { useState, useEffect, useCallback } from 'react'

interface Song {
  id: string
  track_name: string
  artist_name: string
  ratings: { rating: number }[] | null
}

export default function ReviewPage() {
  const [songs, setSongs] = useState<Song[]>([])
  const [threshold, setThreshold] = useState(3)
  const [purging, setPurging] = useState(false)
  const [result, setResult] = useState<{ unliked: number } | null>(null)
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

  const ratedSongs = songs.filter((s) => s.ratings && s.ratings.length > 0)
  const breakdown: Record<number, Song[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] }
  for (const s of ratedSongs) {
    const r = s.ratings![0].rating
    breakdown[r]?.push(s)
  }

  const songsToRemove = ratedSongs.filter(
    (s) => s.ratings![0].rating <= threshold
  )

  const handlePurge = async () => {
    if (!confirm(`This will unlike ${songsToRemove.length} songs from your Spotify library. Continue?`)) return
    setPurging(true)
    const res = await fetch('/api/unlike', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threshold }),
    })
    const data = await res.json()
    setResult(data)
    setPurging(false)
  }

  if (loading) {
    return (
      <main className="relative z-10 flex flex-1 items-center justify-center">
        <p className="text-lg font-semibold text-white/60">Loading...</p>
      </main>
    )
  }

  if (result) {
    return (
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 p-8"
        style={{ background: 'linear-gradient(135deg, #1db954 0%, #121212 50%, #1db954 100%)' }}
      >
        <h1 className="text-4xl font-black">Purge Complete!</h1>
        <p className="text-2xl font-bold text-white/80">{result.unliked} songs unliked.</p>
        <a
          href="/"
          className="glass-card rounded-full px-8 py-3 font-bold transition hover:bg-white/15"
        >
          Back to Home
        </a>
      </main>
    )
  }

  const maxCount = Math.max(...Object.values(breakdown).map((arr) => arr.length), 1)

  return (
    <main className="relative z-10 flex flex-1 flex-col items-center gap-8 p-6 md:p-8">
      {/* Header */}
      <div className="flex w-full max-w-lg items-center justify-between">
        <h1 className="text-xl font-black uppercase tracking-wider">
          <span className="text-spotify">Review</span> Ratings
        </h1>
        <div className="flex gap-2">
          <a
            href="/rate"
            className="glass-card rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition hover:bg-white/15"
          >
            Back to Rating
          </a>
          <a
            href="/api/auth/logout"
            className="glass-card rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition hover:bg-white/15"
          >
            Logout
          </a>
        </div>
      </div>

      {/* Breakdown */}
      <div className="glass-card w-full max-w-lg space-y-4 p-6">
        <h2 className="text-sm font-black uppercase tracking-wider text-white/50">Rating Breakdown</h2>
        {[7, 6, 5, 4, 3, 2, 1].map((star) => (
          <div key={star} className="flex items-center gap-3">
            <span className="w-6 text-right text-sm font-black text-white/60">{star}</span>
            <div className="h-5 flex-1 overflow-hidden rounded-full bg-white/5">
              <div
                className={`h-full rounded-full transition-all ${star <= threshold ? 'bg-red-500/80' : 'bg-spotify'}`}
                style={{
                  width: `${(breakdown[star].length / maxCount) * 100}%`,
                }}
              />
            </div>
            <span className="w-10 text-right text-sm font-bold text-white/40">
              {breakdown[star].length}
            </span>
          </div>
        ))}
        <p className="text-xs font-bold uppercase tracking-wider text-white/30">
          {ratedSongs.length} songs rated out of {songs.length} total
        </p>
      </div>

      {/* Threshold Picker */}
      <div className="glass-card w-full max-w-lg space-y-4 p-6">
        <h2 className="text-sm font-black uppercase tracking-wider text-white/50">Purge Threshold</h2>
        <p className="text-xs font-semibold text-white/30">
          Songs rated at or below this value will be unliked.
        </p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((val) => (
            <button
              key={val}
              onClick={() => setThreshold(val)}
              className={`flex-1 rounded-xl py-3 text-center text-sm font-black transition ${
                val === threshold
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                  : val < threshold
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-white/5 text-white/40 hover:bg-white/10'
              }`}
            >
              {val}
            </button>
          ))}
        </div>
        <p className="text-center text-sm font-bold text-white/40">
          {songsToRemove.length} songs will be unliked
        </p>
      </div>

      {/* Purge Button */}
      <button
        onClick={handlePurge}
        disabled={purging || songsToRemove.length === 0}
        className="rounded-full bg-red-500 px-10 py-4 text-lg font-black text-white shadow-lg shadow-red-500/30 transition hover:bg-red-600 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
      >
        {purging ? 'Purging...' : `Unlike ${songsToRemove.length} Songs`}
      </button>

      {/* Preview of songs to remove */}
      {songsToRemove.length > 0 && (
        <div className="glass-card w-full max-w-lg p-6">
          <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-white/40">Songs to be removed</h3>
          <div className="max-h-64 space-y-1 overflow-y-auto pr-2">
            {songsToRemove.map((s) => (
              <div key={s.id} className="flex justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-white/5">
                <span className="font-semibold">{s.track_name} <span className="font-normal text-white/40">— {s.artist_name}</span></span>
                <span className="font-black text-red-400">{s.ratings![0].rating}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
