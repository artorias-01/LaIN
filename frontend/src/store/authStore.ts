import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@/types'

interface AuthStore {
  user: AuthUser | null
  isLoading: boolean
  // Guest mode lets someone explore the UI (search, player, layout) without a real
  // Supabase account. It intentionally does NOT create a fake `user` — every feature
  // that needs a real logged-in user (history, liked tracks, nearby listeners) already
  // renders its own "log in to use this" empty state when `user` is null, so guests see
  // an honest, working preview instead of fake data or crashes.
  isGuest: boolean
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  clearUser: () => void
  enterGuestMode: () => void
  exitGuestMode: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      isGuest: false,
      setUser: (user) => set({ user, isLoading: false, isGuest: false }),
      setLoading: (isLoading) => set({ isLoading }),
      clearUser: () => set({ user: null, isLoading: false }),
      enterGuestMode: () => set({ isGuest: true, user: null, isLoading: false }),
      exitGuestMode: () => set({ isGuest: false }),
    }),
    {
      name: 'terminal-fm-auth',
      partialize: (state) => ({ user: state.user, isGuest: state.isGuest }),
    }
  )
)
