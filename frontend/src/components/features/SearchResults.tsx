import React from 'react'
import { TrackCard } from './TrackCard'
import type { Track } from '@/types'

interface SearchResultsProps {
  query: string
  results: Track[]
  isSearching: boolean
  error: string | null
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  query,
  results,
  isSearching,
  error,
}) => {
  if (isSearching) {
    return (
      <div className="search-results">
        <div className="empty-state">
          <span className="prompt-line">
            searching for "{query}"
            <span className="loading-dots" />
          </span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="search-results">
        <div className="error-banner">
          error: {error}
        </div>
      </div>
    )
  }

  if (!query) return null

  if (results.length === 0) {
    return (
      <div className="search-results">
        <div className="empty-state">
          <span className="prompt-line">no music found for "{query}"</span>
          <span className="prompt-line" style={{ color: 'var(--fg-dim)', fontSize: '0.78rem' }}>
            try a different query or check yt-dlp is running
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="search-results">
      <div className="section-header">
        <span className="section-label">results for</span>
        <span className="section-title">"{query}"</span>
        <span className="section-label" style={{ marginLeft: 'auto' }}>
          {results.length} tracks
        </span>
      </div>

      <div className="track-list" role="list">
        {results.map((track, index) => (
          <div key={track.id} role="listitem">
            <TrackCard track={track} queue={results} index={index} />
          </div>
        ))}
      </div>
    </div>
  )
}
