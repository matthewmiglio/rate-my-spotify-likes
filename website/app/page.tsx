export default function Home() {
  return (
    <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-10 p-8">
      <div className="text-center">
        <div className="mb-6 inline-block rounded-full border border-white/20 bg-white/10 px-8 py-2 text-sm font-bold uppercase tracking-[4px] backdrop-blur-sm">
          Your Library
        </div>
        <h1 className="text-5xl font-black tracking-tight md:text-7xl">
          Spotify<br />
          <span className="gradient-text">Rater</span>
        </h1>
        <p className="mx-auto mt-6 max-w-md text-lg font-semibold text-white/70">
          Rate your liked songs, then purge the ones you don&apos;t love anymore.
        </p>
      </div>

      <a
        href="/api/auth/login"
        className="rounded-full bg-spotify px-10 py-4 text-lg font-bold text-white transition hover:bg-spotify-light hover:scale-105"
      >
        Login with Spotify
      </a>

      <div className="mt-2 flex items-center gap-3 text-sm font-semibold text-white/40">
        <span>Login</span>
        <span className="text-spotify">→</span>
        <span>Listen</span>
        <span className="text-spotify">→</span>
        <span>Rate 1–7</span>
        <span className="text-spotify">→</span>
        <span>Purge</span>
      </div>
    </main>
  )
}
