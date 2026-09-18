# terminal.fm

> Stream music. Find nearby listeners. Terminal aesthetic.

A full-stack music streaming web application built with React + TypeScript (frontend) and a small FastAPI service (backend) using `yt-dlp` to search and stream YouTube audio. User accounts, play history, liked tracks, and a location-based "nearby listeners" social feature are powered by **Supabase** (managed Postgres + Auth + Realtime).

---

## ⚠️ YouTube Terms of Service Notice

Streaming audio from YouTube via `yt-dlp` may conflict with [YouTube's Terms of Service](https://www.youtube.com/static?template=terms). This project is intended for **personal / educational use only**. Do not deploy publicly or monetize without reviewing YouTube's API Terms and potentially switching to the official [YouTube Data API](https://developers.google.com/youtube/v3).

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| Python | 3.10+ | [python.org](https://python.org) |
| yt-dlp | latest | `pip install yt-dlp` |
| ffmpeg | any | [ffmpeg.org](https://ffmpeg.org) — add to PATH |
| Supabase project | free tier | [supabase.com](https://supabase.com) |

Verify your setup:
```bash
node --version        # v18+
python --version      # 3.10+
yt-dlp --version      # 2024.x.x
ffmpeg -version       # any
```

---

## Project Structure

```
project-root/
├── ytdlp-service/          # FastAPI — search & stream only, no DB
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── routers/
│   │   │   ├── search.py   # GET /api/search?q=
│   │   │   └── stream.py   # GET /api/stream/:videoId
│   │   └── services/
│   │       └── ytdlp.py    # subprocess wrapper + TTL cache
│   ├── requirements.txt
│   └── .env.example
├── frontend/               # React + TypeScript + Vite
│   ├── src/
│   │   ├── lib/supabaseClient.ts
│   │   ├── hooks/          # useAuth, usePlayer, useSearch, useNearby, useGeolocation
│   │   ├── store/          # Zustand: authStore, playerStore
│   │   ├── components/     # layout/, features/, hero/, ui/
│   │   ├── pages/          # Landing, Login, Signup, Home
│   │   └── styles/         # global.css, animations.css, components.css
│   ├── package.json
│   └── .env.example
└── supabase/
    └── schema.sql          # Tables + RLS policies — run in Supabase SQL Editor
```

---

## Setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and paste + run the contents of [`supabase/schema.sql`](./supabase/schema.sql)
3. Go to **Settings → API** and copy your **Project URL** and **anon/public key**
4. In **Authentication → Providers**, ensure Email is enabled

### 2. Frontend

```bash
cd frontend
cp .env.example .env
# Edit .env — fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
# → http://localhost:5173
```

### 3. yt-dlp Service

```bash
cd ytdlp-service
cp .env.example .env
# Optionally edit .env (defaults are fine for local dev)
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
# → http://localhost:8000
# → API docs: http://localhost:8000/docs
```

Both services must be running simultaneously. The Vite dev server proxies `/ytapi/*` → `http://localhost:8000` automatically.

---

## How It Works

### Search
`GET /api/search?q=lofi beats`
- Calls `yt-dlp ytsearch20:{query} --dump-json`
- Filters results to music-only: duration > 60s, not live, checks `categories`/`tags`/`artist` metadata
- Caches results in-memory for 5 minutes
- Returns `{ id, title, artist, thumbnail, duration, channel }`

### Streaming
`GET /api/stream/:videoId`
- Calls `yt-dlp -f bestaudio --get-url` to resolve a direct stream URL
- Proxies audio through the FastAPI service (never exposes raw YouTube URLs to the client)
- Handles `Range` headers for seeking
- Re-resolves automatically if the URL expires (403/410)

### Auth
Handled entirely by **Supabase Auth**:
- `supabase.auth.signUp()` / `signInWithPassword()` / `signOut()`
- Sessions persist across reloads via Supabase's built-in session management
- A PostgreSQL trigger auto-creates a `profiles` row on signup

### Nearby Listeners
- On opt-in, the browser's Geolocation API is called
- Coordinates are **coarsened** (rounded to 2 decimal places ≈ 1.1km, then encoded as a 5-char geohash ≈ 4.9km cell)
- Coarse geohash is stored in `listener_status.geohash` alongside the current track
- **Privacy toggle is OFF by default** — users are invisible until they explicitly opt in
- When off: `is_sharing = false` — RLS policy blocks other users from reading the row server-side
- Supabase Realtime subscription on `listener_status` delivers live updates when a nearby user changes their track
- The hero page wordmark glitch pulse is also triggered by real incoming Realtime events

---

## Environment Variables

### `frontend/.env`
| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_YTDLP_SERVICE_URL` | yt-dlp service base URL (default: `/ytapi` — proxied by Vite) |

### `ytdlp-service/.env`
| Variable | Description |
|----------|-------------|
| `YTDLP_SERVICE_HOST` | Host to bind (default: `0.0.0.0`) |
| `YTDLP_SERVICE_PORT` | Port (default: `8000`) |
| `CORS_ORIGINS` | Allowed origins (default: `http://localhost:5173`) |
| `CACHE_TTL_SECONDS` | Search cache duration (default: `300`) |
| `MAX_SEARCH_RESULTS` | Max tracks returned per search (default: `10`) |
| `MIN_TRACK_DURATION` | Minimum duration filter in seconds (default: `60`) |

---

## Database Schema

Five tables, all with Row Level Security:

| Table | Purpose |
|-------|---------|
| `profiles` | User display info (username, avatar, bio) |
| `play_history` | Per-user track play log |
| `liked_tracks` | User's liked/saved tracks |
| `search_history` | Real search queries (drives recent-searches dropdown) |
| `listener_status` | One row per user for nearby listeners feature |

RLS enforces that users can only access their own data. The one exception: `listener_status` rows where `is_sharing = true` are visible to all authenticated users — this is what enables the nearby panel. The geohash proximity filter is applied in the query, not at the RLS level.

---

## UI Design

- **Font:** JetBrains Mono
- **Background:** `#0a0a0a`
- **Accent red:** `#ff2222` (playing state, errors, wordmark)
- **Accent green:** `#00ff41` (active states, opt-in, success)
- **No rounded corners** anywhere
- Scanline overlay (CSS `repeating-linear-gradient`) on the hero page
- Vignette via radial gradient
- Hero wordmark glitch: RGB channel-split using `text-shadow` + `clip-path`, fires every 5–9s randomly and on real Supabase Realtime nearby events
- `prefers-reduced-motion` disables all animations

---

## Development Scripts

```bash
# Frontend
npm run dev        # Start Vite dev server (port 5173)
npm run typecheck  # TypeScript type check
npm run build      # Production build

# yt-dlp service
python -m uvicorn app.main:app --reload --port 8000
```

---

## Updating yt-dlp

YouTube changes frequently. Keep yt-dlp updated:
```bash
pip install -U yt-dlp
# or
yt-dlp -U
```

If search or streaming stops working, this is the first fix to try.

---

## License

Personal / educational use only. See YouTube ToS caveat at the top.
