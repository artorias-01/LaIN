import React, { useCallback } from 'react'
import { usePlayerStore } from '@/store/playerStore'
import { usePlayer } from '@/hooks/usePlayer'
import { useNearby } from '@/hooks/useNearby'
import type { Track } from '@/types'

const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const AsciiProgress: React.FC<{ progress: number; width?: number }> = ({
  progress,
  width = 20,
}) => {
  const filled = Math.round(progress * (width - 2))
  const empty = width - 2 - filled
  return (
    <span style={{ color: 'var(--fg-dim)', letterSpacing: '-0.05em', userSelect: 'none' }}>
      [<span style={{ color: 'var(--accent)' }}>{'='.repeat(filled)}</span>
      {empty > 0 && <span>{'─'.repeat(empty)}</span>}]
    </span>
  )
}

export const NowPlaying: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    volume,
    setVolume,
    nextTrack,
    prevTrack,
  } = usePlayerStore()
  const { togglePlay, seek } = usePlayer()
  const { updateNowPlaying } = useNearby()

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const ratio = (e.clientX - rect.left) / rect.width
      seek(Math.max(0, Math.min(1, ratio)))
    },
    [seek]
  )

  const handleLike = useCallback(async () => {
    // Handled in TrackCard; this is placeholder for quick-like
  }, [])

  if (!currentTrack) {
    return (
      <div className="nowplaying" aria-label="Now playing — nothing loaded">
        <div className="empty-state" style={{ padding: 0 }}>
          <span className="prompt-line" style={{ fontSize: '0.8rem' }}>
            nothing playing
          </span>
        </div>
        <div />
        <div />
      </div>
    )
  }

  return (
    <footer className="nowplaying" aria-label={`Now playing: ${currentTrack.title} by ${currentTrack.artist}`}>
      {/* Track info */}
      <div className="nowplaying-track">
        {currentTrack.thumbnail ? (
          <img
            src={currentTrack.thumbnail}
            alt=""
            className="nowplaying-thumb"
            loading="lazy"
          />
        ) : (
          <div className="nowplaying-thumb-placeholder" aria-hidden="true">♫</div>
        )}
        <div className="nowplaying-meta">
          <div className="nowplaying-title">{currentTrack.title}</div>
          <div className="nowplaying-artist">{currentTrack.artist}</div>
        </div>
        <span
          className={`status-live ${isPlaying ? 'is-playing' : ''}`}
          aria-hidden="true"
        />
      </div>

      {/* Transport Controls + Progress */}
      <div className="nowplaying-controls">
        <div className="transport-controls">
          <button
            className="transport-btn"
            onClick={() => prevTrack()}
            aria-label="Previous track"
          >
            ◁◁
          </button>
          <button
            className="transport-btn play-pause"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            className="transport-btn"
            onClick={() => nextTrack()}
            aria-label="Next track"
          >
            ▷▷
          </button>
        </div>

        <div className="progress-row">
          <span>{formatTime(progress * duration)}</span>
          <div
            className="progress-track"
            style={{ flex: 1 }}
            onClick={handleSeek}
            role="slider"
            aria-label="Seek"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') seek(Math.min(1, progress + 0.02))
              if (e.key === 'ArrowLeft') seek(Math.max(0, progress - 0.02))
            }}
          >
            <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume + extra */}
      <div className="nowplaying-extra">
        <div className="volume-row" aria-label="Volume control">
          <span aria-hidden="true">{volume === 0 ? '×' : volume < 0.4 ? '♪' : '♫'}</span>
          <input
            type="range"
            className="volume-slider"
            min={0}
            max={1}
            step={0.02}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            aria-label="Volume"
          />
          <span style={{ width: '2.5em', textAlign: 'right' }}>
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>
    </footer>
  )
}
