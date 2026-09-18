import { create } from 'zustand'
import type { Track } from '@/types'

interface PlayerStore {
  currentTrack: Track | null
  isPlaying: boolean
  progress: number
  duration: number
  volume: number
  queue: Track[]
  queueIndex: number
  setCurrentTrack: (track: Track) => void
  setPlaying: (playing: boolean) => void
  setProgress: (progress: number) => void
  setDuration: (duration: number) => void
  setVolume: (volume: number) => void
  setQueue: (queue: Track[], index?: number) => void
  nextTrack: () => Track | null
  prevTrack: () => Track | null
  clearPlayer: () => void
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  progress: 0,
  duration: 0,
  volume: 0.8,
  queue: [],
  queueIndex: 0,

  setCurrentTrack: (track) => set({ currentTrack: track, isPlaying: true, progress: 0 }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setProgress: (progress) => set({ progress }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),

  setQueue: (queue, index = 0) =>
    set({ queue, queueIndex: index, currentTrack: queue[index] ?? null }),

  nextTrack: () => {
    const { queue, queueIndex } = get()
    const nextIdx = queueIndex + 1
    if (nextIdx >= queue.length) return null
    const next = queue[nextIdx]
    set({ queueIndex: nextIdx, currentTrack: next, isPlaying: true, progress: 0 })
    return next
  },

  prevTrack: () => {
    const { queue, queueIndex } = get()
    const prevIdx = queueIndex - 1
    if (prevIdx < 0) return null
    const prev = queue[prevIdx]
    set({ queueIndex: prevIdx, currentTrack: prev, isPlaying: true, progress: 0 })
    return prev
  },

  clearPlayer: () =>
    set({ currentTrack: null, isPlaying: false, progress: 0, duration: 0, queue: [], queueIndex: 0 }),
}))
