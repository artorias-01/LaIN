import React, { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { NowPlaying } from '@/components/layout/NowPlaying'
import { NearbyListeners } from '@/components/features/NearbyListeners'
import { SearchResults } from '@/components/features/SearchResults'
import { TrackCard } from '@/components/features/TrackCard'
import { useSearch } from '@/hooks/useSearch'
import { usePlayer } from '@/hooks/usePlayer'
import { useNearby } from '@/hooks/useNearby'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabaseClient'
import type { Track } from '@/types'

// Recent play history section
const ContinueListening: React.FC<{ userId: string }> = ({ userId }) => {
  const [history, setHistory] = React.useState<Track[]>([])

  useEffect(() => {
    supabase
      .from('play_history')
      .select('track_id, title, artist, thumbnail')
      .eq('user_id', userId)
      .order('played_at', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (!data) return
        // Deduplicate by track_id
        const seen = new Set<string>()
        const unique = data.filter((row: any) => {
          if (seen.has(row.track_id)) return false
          seen.add(row.track_id)
          return true
        })
        setHistory(
          unique.map((row: any) => ({
            id: row.track_id,
            title: row.title,
            artist: row.artist,
            thumbnail: row.thumbnail,
            duration: 0,
            channel: '',
          }))
        )
      })
  }, [userId])

  if (history.length === 0) return null

  return (
    <div className="home-section">
      <div className="home-section-title">continue listening</div>
      <div className="track-list">
        {history.map((track, i) => (
          <TrackCard key={track.id} track={track} queue={history} index={i} />
        ))}
      </div>
    </div>
  )
}

export const Home: React.FC = () => {
  const [searchParams] = useSearchParams()
  const searchQuery = searchParams.get('q') || ''
  const { user, isGuest } = useAuthStore()
  const { results, isSearching, error, search } = useSearch()
  const { updateNowPlaying } = useNearby()

  // Initialize player with nearby listener update callback
  usePlayer((track) => {
    updateNowPlaying({
      track_id: track.id,
      track_title: track.title,
      track_artist: track.artist,
      track_thumbnail: track.thumbnail,
    })
  })

  // Trigger search when URL query changes
  useEffect(() => {
    if (searchQuery) {
      search(searchQuery)
    }
  }, [searchQuery])

  const isSearchMode = !!searchQuery

  return (
    <div className="app-layout">
      <Sidebar />

      <TopBar />

      <main className="app-main" id="main-content" tabIndex={-1}>
        {isSearchMode ? (
          <SearchResults
            query={searchQuery}
            results={results}
            isSearching={isSearching}
            error={error}
          />
        ) : (
          <div className="home-content">
            {user && <ContinueListening userId={user.id} />}

            <div className="home-section">
              <div className="home-section-title">nearby listeners</div>
              <NearbyListeners />
            </div>

            {!user && (
              <div className="empty-state">
                <span className="prompt-line">
                  {isGuest ? 'guest mode — ' : ''}
                  <a href="/login" style={{ color: 'var(--accent2)' }}>log in</a> to see your
                  history and nearby listeners
                </span>
                <span className="prompt-line" style={{ color: 'var(--fg-dim)', fontSize: '0.78rem' }}>
                  {isGuest
                    ? 'search and playback work fine as a guest — those two features need a real account'
                    : 'or search for music above to start playing'}
                </span>
              </div>
            )}
          </div>
        )}
      </main>

      <NowPlaying />
    </div>
  )
}
