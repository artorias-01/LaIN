import { useEffect, useRef, useCallback } from 'react'
import { usePlayerStore } from '@/store/playerStore'
import { useAuthStore } from '@/store/authStore'
import { getStreamUrl } from '@/api/client'
import { supabase } from '@/lib/supabaseClient'
import type { Track } from '@/types'

export const usePlayer = (onTrackChange?: (track: Track) => void) => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const {
    currentTrack, isPlaying, volume,
    setPlaying, setProgress, setDuration, nextTrack, setCurrentTrack
  } = usePlayerStore()
  const { user } = useAuthStore()

  // Initialize audio element once
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.preload = 'metadata'
    }
    const audio = audioRef.current

    const onTimeUpdate = () => {
      if (audio.duration) setProgress(audio.currentTime / audio.duration)
    }
    const onDurationChange = () => setDuration(audio.duration || 0)
    const onEnded = () => {
      const next = nextTrack()
      if (!next) setPlaying(false)
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onError = (e: Event) => {
      console.error('Audio error:', (e.target as HTMLAudioElement).error)
      setPlaying(false)
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('error', onError)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('error', onError)
    }
  }, [nextTrack, setDuration, setPlaying, setProgress])

  // React to track changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return

    const streamUrl = getStreamUrl(currentTrack.id)
    audio.src = streamUrl
    audio.load()
    audio.play().catch(console.error)

    // Log play history
    if (user) {
      supabase.from('play_history').insert({
        user_id: user.id,
        track_id: currentTrack.id,
        title: currentTrack.title,
        artist: currentTrack.artist,
        thumbnail: currentTrack.thumbnail,
      }).then()
    }

    onTrackChange?.(currentTrack)
  }, [currentTrack?.id, user, onTrackChange])

  // React to play/pause toggle
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) audio.play().catch(console.error)
    else audio.pause()
  }, [isPlaying])

  // React to volume changes
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  const togglePlay = useCallback(() => setPlaying(!isPlaying), [isPlaying, setPlaying])

  const seek = useCallback((ratio: number) => {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    audio.currentTime = ratio * audio.duration
    setProgress(ratio)
  }, [setProgress])

  const playTrack = useCallback((track: Track, queue?: Track[]) => {
    if (queue) {
      const idx = queue.findIndex(t => t.id === track.id)
      usePlayerStore.getState().setQueue(queue, idx >= 0 ? idx : 0)
    } else {
      setCurrentTrack(track)
    }
  }, [setCurrentTrack])

  return { togglePlay, seek, playTrack, audioRef }
}
