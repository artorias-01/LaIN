import React, { useCallback } from 'react'
import { usePlayerStore } from '@/store/playerStore'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabaseClient'
import type { Track } from '@/types'

const formatDuration = (seconds: number): string => {
  if (!seconds) return '--:--'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface TrackCardProps {
  track: Track
  queue?: Track[]
  index?: number
}

export const TrackCard: React.FC<TrackCardProps> = ({ track, queue, index }) => {
  const { currentTrack, isPlaying, setCurrentTrack, setQueue } = usePlayerStore()
  const { user } = useAuthStore()
  const isCurrentTrack = currentTrack?.id === track.id

  const handlePlay = useCallback(() => {
    if (queue && queue.length > 0) {
      const idx = index ?? queue.findIndex((t) => t.id === track.id)
      setQueue(queue, idx >= 0 ? idx : 0)
    } else {
      setCurrentTrack(track)
    }
  }, [track, queue, index])

  const handleLike = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!user) return
      await supabase.from('liked_tracks').upsert({
        user_id: user.id,
        track_id: track.id,
        title: track.title,
        artist: track.artist,
        thumbnail: track.thumbnail,
        duration: track.duration,
      })
    },
    [track, user]
  )

  return (
    <div
      className={`track-card ${isCurrentTrack ? 'playing' : ''}`}
      onClick={handlePlay}
      role="button"
      tabIndex={0}
      aria-label={`Play ${track.title} by ${track.artist}`}
      aria-pressed={isCurrentTrack && isPlaying}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handlePlay()
        }
      }}
    >
      {/* Index or playing indicator */}
      <span
        style={{
          width: '1.5em',
          textAlign: 'right',
          color: isCurrentTrack ? 'var(--accent)' : 'var(--fg-dim)',
          fontSize: '0.78rem',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {isCurrentTrack && isPlaying ? '▶' : (index !== undefined ? index + 1 : '·')}
      </span>

      {/* Thumbnail */}
      {track.thumbnail ? (
        <img
          src={track.thumbnail}
          alt=""
          className="track-thumbnail"
          loading="lazy"
        />
      ) : (
        <div className="track-thumbnail-placeholder" aria-hidden="true">♫</div>
      )}

      {/* Track info */}
      <div className="track-info">
        <div className="track-title">{track.title}</div>
        <div className="track-artist">{track.artist || track.channel}</div>
      </div>

      {/* Duration */}
      <span className="track-duration" aria-label={`Duration: ${formatDuration(track.duration)}`}>
        {formatDuration(track.duration)}
      </span>

      {/* Like button */}
      {user && (
        <button
          className="btn btn-ghost btn-icon"
          onClick={handleLike}
          aria-label={`Like ${track.title}`}
          style={{ fontSize: '0.85rem', flexShrink: 0 }}
        >
          ♡
        </button>
      )}
    </div>
  )
}
