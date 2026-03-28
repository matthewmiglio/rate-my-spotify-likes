'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Song {
  id: string
  spotify_track_id: string
  track_name: string
  artist_name: string
  album_name: string
  album_art_url: string
  preview_url: string | null
  ratings: { rating: number }[] | null
}

interface User {
  display_name: string
  avatar_url: string | null
}

export default function RatePage() {
  const [songs, setSongs] = useState<Song[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const noPreviewSetRef = useRef<Set<string>>(new Set())
  const audioRef = useRef<HTMLAudioElement>(null)
  const volumeRef = useRef(parseFloat(typeof window !== 'undefined' ? localStorage.getItem('rater-volume') ?? '0.3' : '0.3'))

  const fetchUser = useCallback(async () => {
    const res = await fetch('/api/auth/me')
    if (res.ok) {
      const data = await res.json()
      setUser(data.user)
    }
  }, [])

  const fetchSongs = useCallback(async () => {
    const res = await fetch('/api/ratings')
    if (res.status === 401) {
      window.location.href = '/api/auth/login'
      return
    }
    const data = await res.json()
    const allSongs: Song[] = data.songs || []

    // Separate rated and unrated, shuffle unrated, then combine
    const rated = allSongs.filter((s) => s.ratings && s.ratings.length > 0)
    const unrated = allSongs.filter((s) => !s.ratings || s.ratings.length === 0)
    for (let i = unrated.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unrated[i], unrated[j]] = [unrated[j], unrated[i]]
    }
    const shuffled = [...rated, ...unrated]

    setSongs(shuffled)
    // Start at first unrated song (right after all the rated ones)
    setCurrentIndex(rated.length < shuffled.length ? rated.length : shuffled.length)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchUser()
    fetchSongs()
  }, [fetchUser, fetchSongs])

  const song = songs[currentIndex]
  const trackId = song?.spotify_track_id ?? null

  // Fetch preview URL from embed page whenever the track changes
  useEffect(() => {
    if (!trackId) {
      setPreviewUrl(null)
      return
    }
    let cancelled = false
    setPreviewLoading(true)
    setPreviewUrl(null)

    fetch(`/api/preview/${trackId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (data.preview_url) {
          setPreviewUrl(data.preview_url)
          setPreviewLoading(false)
        } else {
          // No preview — mark and auto-skip
          noPreviewSetRef.current.add(trackId)
          setPreviewLoading(false)
          setCurrentIndex((prev) => {
            const next = songs.findIndex(
              (s, i) => i > prev && (!s.ratings || s.ratings.length === 0) && !noPreviewSetRef.current.has(s.spotify_track_id)
            )
            return next === -1 ? songs.length : next
          })
        }
      })
      .catch(() => {
        if (!cancelled) setPreviewLoading(false)
      })

    return () => { cancelled = true }
  }, [trackId])

  // When preview URL loads, seek to middle and autoplay
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !previewUrl) return

    audio.volume = volumeRef.current

    const handleLoaded = () => {
      audio.play().catch(() => {
        // Browser blocked autoplay — user needs to interact first, that's fine
      })
    }

    const handleVolumeChange = () => {
      volumeRef.current = audio.volume
      localStorage.setItem('rater-volume', String(audio.volume))
    }

    audio.addEventListener('loadedmetadata', handleLoaded)
    audio.addEventListener('volumechange', handleVolumeChange)
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoaded)
      audio.removeEventListener('volumechange', handleVolumeChange)
    }
  }, [previewUrl])

  const handleSync = async () => {
    setSyncing(true)
    setSyncMessage(null)
    const res = await fetch('/api/songs/sync', { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setSyncMessage(`Synced ${data.synced} songs!`)
      await fetchSongs()
    } else {
      setSyncMessage(`Sync failed: ${data.error}`)
    }
    setSyncing(false)
  }

  const handleRate = async (rating: number) => {
    const song = songs[currentIndex]
    if (!song) return

    // Stop audio before moving on
    if (audioRef.current) {
      audioRef.current.pause()
    }

    await fetch('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ song_id: song.id, rating }),
    })

    const updated = [...songs]
    updated[currentIndex] = { ...song, ratings: [{ rating }] }
    setSongs(updated)

    const nextIdx = updated.findIndex(
      (s, i) => i > currentIndex && (!s.ratings || s.ratings.length === 0) && !noPreviewSetRef.current.has(s.spotify_track_id)
    )
    setCurrentIndex(nextIdx === -1 ? updated.length : nextIdx)
  }

  const handleSkip = () => {
    if (audioRef.current) {
      audioRef.current.pause()
    }

    // Remove skipped song from current position
    const skipped = songs[currentIndex]
    const updated = [...songs]
    updated.splice(currentIndex, 1)

    // Find remaining unrated songs after current position
    const remaining = updated.filter(
      (s, i) => i >= currentIndex && (!s.ratings || s.ratings.length === 0)
    )

    if (remaining.length === 0) {
      // No more unrated songs — just append at end
      updated.push(skipped)
    } else {
      // Insert into a random spot in the back 40% of the remaining unrated range
      const lastUnratedIdx = updated.length - 1 - [...updated].reverse().findIndex(
        (s) => !s.ratings || s.ratings.length === 0
      )
      const rangeStart = currentIndex
      const rangeLen = lastUnratedIdx - rangeStart + 1
      const back40Start = rangeStart + Math.ceil(rangeLen * 0.6)
      const insertIdx = back40Start + Math.floor(Math.random() * (lastUnratedIdx - back40Start + 1))
      updated.splice(insertIdx + 1, 0, skipped)
    }

    setSongs(updated)
    // currentIndex now points to the next song (since we spliced the current one out)
    const nextIdx = updated.findIndex(
      (s, i) => i >= currentIndex && (!s.ratings || s.ratings.length === 0) && !noPreviewSetRef.current.has(s.spotify_track_id)
    )
    setCurrentIndex(nextIdx === -1 ? updated.length : nextIdx)
  }

  if (loading) {
    return (
      <main className="relative z-10 flex flex-1 items-center justify-center">
        <p className="text-lg font-semibold text-white/60">Loading...</p>
      </main>
    )
  }

  const skippedCount = noPreviewSetRef.current.size
  const totalSongs = songs.length - skippedCount
  const ratedCount = songs.filter((s) => s.ratings && s.ratings.length > 0).length
  const allDone = !song || currentIndex >= songs.length

  return (
    <main className="relative z-10 flex flex-1 flex-col items-center gap-6 p-6 md:p-8">
      {/* Header */}
      <div className="flex w-full max-w-md items-center justify-between">
        <h1 className="text-xl font-black uppercase tracking-wider">
          <span className="text-spotify">Rate</span> Songs
        </h1>
        <div className="flex items-center gap-2">
          <a href="/stats" className="glass-card rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition hover:bg-white/15">
            Stats
          </a>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="glass-card rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition hover:bg-white/15 disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
          {user && (
            <a href="/api/auth/logout" className="glass-card flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition hover:bg-white/15">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="h-5 w-5 rounded-full" />
              ) : (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-spotify text-[10px] font-black text-white">
                  {user.display_name?.[0]?.toUpperCase() ?? '?'}
                </span>
              )}
              {user.display_name}
            </a>
          )}
          {!user && (
            <a
              href="/api/auth/logout"
              className="glass-card rounded-full px-3 py-1.5 text-xs font-bold transition hover:bg-white/15"
            >
              Logout
            </a>
          )}
        </div>
      </div>

      {/* Sync message */}
      {syncMessage && (
        <div className={`glass-card w-full max-w-md px-4 py-2 text-sm font-semibold ${
          syncMessage.startsWith('Sync failed') ? 'border-red-500/30 text-red-400' : 'border-spotify/30 text-spotify'
        }`}>
          {syncMessage}
        </div>
      )}

      {songs.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <p className="text-lg font-semibold text-white/50">No songs found. Sync your library first!</p>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="rounded-full bg-spotify px-8 py-3 font-bold text-white transition hover:bg-spotify-light hover:scale-105 disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      ) : allDone ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <p className="text-3xl font-black">All done!</p>
          <p className="text-lg font-semibold text-white/60">
            You&apos;ve rated {ratedCount} of {totalSongs} songs.
          </p>
          <a
            href="/review"
            className="rounded-full bg-spotify px-8 py-3 font-bold text-white transition hover:bg-spotify-light hover:scale-105"
          >
            Review &amp; Purge
          </a>
        </div>
      ) : (
        <>
          {/* Progress */}
          <div className="w-full max-w-md">
            <div className="mb-1.5 flex justify-between text-xs font-bold uppercase tracking-wider text-white/40">
              <span>{ratedCount} / {totalSongs} rated</span>
              <span>{Math.round((ratedCount / totalSongs) * 100)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-spotify transition-all"
                style={{ width: `${(ratedCount / totalSongs) * 100}%` }}
              />
            </div>
          </div>

          {/* Album Art */}
          <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-2xl bg-white/5 shadow-2xl shadow-black/50">
            {song.album_art_url ? (
              <img
                src={song.album_art_url}
                alt={song.album_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-6xl opacity-30">?</div>
            )}
          </div>

          {/* Track Info */}
          <div className="text-center">
            <h2 className="text-xl font-black">{song.track_name}</h2>
            <p className="mt-1 font-semibold text-white/50">{song.artist_name}</p>
            <p className="text-sm font-semibold text-white/30">{song.album_name}</p>
          </div>

          {/* Audio Preview Player */}
          {previewLoading && (
            <p className="text-xs font-semibold text-white/30">Loading preview...</p>
          )}
          {previewUrl && (
            <audio
              ref={audioRef}
              key={trackId}
              src={previewUrl}
              controls
              className="w-full max-w-md"
            />
          )}
          {!previewLoading && !previewUrl && (
            <p className="text-xs font-semibold text-white/20">No preview available</p>
          )}

          {/* Rating Buttons */}
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((star) => (
              <button
                key={star}
                onClick={() => handleRate(star)}
                className="glass-card flex h-12 w-12 items-center justify-center text-lg font-black transition hover:bg-spotify/30 hover:border-spotify/50 hover:scale-110 hover:text-spotify"
                style={{ borderRadius: '14px' }}
              >
                {star}
              </button>
            ))}
          </div>

          {/* Skip */}
          <button
            onClick={handleSkip}
            className="text-xs font-bold uppercase tracking-wider text-white/30 transition hover:text-white/60"
          >
            Skip this song &rarr;
          </button>
        </>
      )}
    </main>
  )
}
