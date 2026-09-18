// ─── Track & Search ───────────────────────────────────────────────────────────

export interface Track {
  id: string        // YouTube video ID
  title: string
  artist: string
  thumbnail: string
  duration: number  // seconds
  channel: string
  view_count?: number
}

export interface SearchResult {
  query: string
  results: Track[]
  count: number
}

// ─── User & Auth ──────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  username: string
  avatar_url: string | null
  bio: string | null
  created_at: string
}

export interface AuthUser {
  id: string
  email: string
  profile: UserProfile | null
}

// ─── Play History & Library ────────────────────────────────────────────────────

export interface PlayHistoryEntry {
  id: string
  user_id: string
  track_id: string
  title: string
  artist: string
  thumbnail: string
  played_at: string
}

export interface LikedTrack {
  id: string
  user_id: string
  track_id: string
  title: string
  artist: string
  thumbnail: string
  duration: number
  added_at: string
}

export interface SearchHistoryEntry {
  id: string
  user_id: string
  query: string
  searched_at: string
}

// ─── Nearby Listeners ─────────────────────────────────────────────────────────

export interface ListenerStatus {
  user_id: string
  username: string
  avatar_url: string | null
  geohash: string
  track_title: string | null
  track_artist: string | null
  track_thumbnail: string | null
  track_id: string | null
  is_sharing: boolean
  updated_at: string
}

export interface NearbyListener {
  user_id: string
  username: string
  avatar_url: string | null
  track_title: string | null
  track_artist: string | null
  track_thumbnail: string | null
  track_id: string | null
}

// ─── Player ───────────────────────────────────────────────────────────────────

export interface PlayerState {
  currentTrack: Track | null
  isPlaying: boolean
  progress: number    // 0–1
  duration: number    // seconds
  volume: number      // 0–1
  queue: Track[]
  queueIndex: number
}

// ─── Location ─────────────────────────────────────────────────────────────────

export interface CoarseLocation {
  geohash: string
  lat: number
  lng: number
}
