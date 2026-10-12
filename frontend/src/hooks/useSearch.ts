import { useState, useCallback, useRef } from 'react'
import { ytdlpClient } from '@/api/client'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/authStore'
import type { Track, SearchHistoryEntry } from '@/types'

export const useSearch = () => {
  const { user } = useAuthStore()
  const [results, setResults] = useState<Track[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([])
  const abortRef = useRef<AbortController | null>(null)

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([])
      return
    }

    // Cancel any in-flight search
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsSearching(true)
    setError(null)

    try {
      const { data } = await ytdlpClient.get('/api/search', {
        params: { q: query },
        signal: controller.signal,
      })
      setResults(data.results ?? [])

      // Save to search history if logged in
      if (user) {
        await supabase.from('search_history').insert({
          user_id: user.id,
          query: query.trim(),
        })
      }
    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED') return
      const status = err?.response?.status
      const detail = err?.response?.data?.detail
      const msg = detail
        ? `Search failed (${status}): ${detail}`
        : err?.message
          ? `Search failed: ${err.message}`
          : 'Search failed — is the yt-dlp service running?'
      console.error('[useSearch]', msg, err)
      setError(msg)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [user])

  const fetchSearchHistory = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', user.id)
      .order('searched_at', { ascending: false })
      .limit(10)
    setSearchHistory((data as SearchHistoryEntry[]) ?? [])
  }, [user])

  const clearResults = () => {
    setResults([])
    setError(null)
  }

  return { results, isSearching, error, searchHistory, search, fetchSearchHistory, clearResults }
}
