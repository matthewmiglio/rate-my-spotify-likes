export default function Home() {
  return (
    <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-10 p-8"
      style={{ background: 'linear-gradient(135deg, #1db954 0%, #121212 50%, #1db954 100%)' }}
    >
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

      <div className="mt-4 flex gap-6">
        {[
          { step: '1', text: 'Login with Spotify' },
          { step: '2', text: 'Rate your songs 1–7' },
          { step: '3', text: 'Purge the rest' },
        ].map((item) => (
          <div
            key={item.step}
            className="glass-card flex flex-col items-center gap-2 px-6 py-4 text-center"
          >
            <span className="text-2xl font-black text-spotify">{item.step}</span>
            <span className="text-sm font-semibold text-white/70">{item.text}</span>
          </div>
        ))}
      </div>
    </main>
  )
}
