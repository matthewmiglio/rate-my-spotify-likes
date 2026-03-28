# Rate My Spotify Likes

Rate every song in your Spotify liked library on a 1–7 scale, view stats, and bulk-unlike the ones that don't make the cut.

<img width="1893" height="898" alt="image" src="https://github.com/user-attachments/assets/475ce4e4-560e-4c75-bab8-99fb28be539c" />
<img width="1893" height="898" alt="image" src="https://github.com/user-attachments/assets/ff967ff2-095a-4b9c-b778-667461f44067" />


## Architecture

```
┌──────────────┐       OAuth        ┌─────────────────┐
│   Spotify    │◄──────────────────►│                 │
│   Web API    │  tokens / liked    │   Next.js 16    │
└──────────────┘  songs / unlike    │   App Router    │
                                    │                 │
┌──────────────┐   service role     │  /rate          │
│   Supabase   │◄──────────────────►│  /stats         │
│   Postgres   │   users, songs,    │  /review        │
│              │   ratings          │                 │
└──────────────┘                    └─────────────────┘
                                           │
                                    Scrapes embed page
                                    for audio previews
                                           │
                                    ┌──────▼──────┐
                                    │  Spotify    │
                                    │  Embed CDN  │
                                    ���─────────────┘
```

**Stack:** Next.js 16 · React 19 · Tailwind CSS 4 · Supabase · Spotify Web API

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/rate` | Listen to previews and rate songs 1–7 |
| `/stats` | 10 visualizations (distribution, top/worst songs, artists, timeline, etc.) |
| `/review` | Filter by rating threshold, preview, and bulk-unlike |

## Setup

1. **Spotify App** — Create one at [developer.spotify.com](https://developer.spotify.com/dashboard). Add `http://127.0.0.1:3000/api/auth/callback` as a redirect URI.

2. **Supabase** — Create a project and run the SQL files in `sql/` in order (001 → 003).

3. **Environment** — Copy `.env.example` or create `website/.env.local`:
   ```
   SPOTIFY_CLIENT_ID=your_client_id
   SPOTIFY_CLIENT_SECRET=your_client_secret
   SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/callback
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   SESSION_SECRET=any-random-string
   ```

4. **Run:**
   ```bash
   cd website
   npm install
   npm run dev
   ```

5. Open `http://127.0.0.1:3000`, log in with Spotify, sync your library, and start rating.
