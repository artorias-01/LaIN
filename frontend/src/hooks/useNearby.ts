import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/authStore'
import { useGeolocation } from './useGeolocation'
import type { NearbyListener } from '@/types'

export const useNearby = () => {
  const { user } = useAuthStore()
  const { getCoarseLocation } = useGeolocation()
  const [listeners, setListeners] = useState<NearbyListener[]>([])
  const [isSharing, setIsSharing] = useState(false)
  const [hasSeenModal, setHasSeenModal] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const locationRef = useRef<string | null>(null)

  // Load user's sharing preference
  useEffect(() => {
    if (!user) return
    supabase
      .from('listener_status')
      .select('is_sharing, geohash')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setIsSharing(data.is_sharing ?? false)
          locationRef.current = data.geohash ?? null
        }
      })

    // Check if user has seen the modal
    const seen = localStorage.getItem(`nearby-modal-seen-${user.id}`)
    setHasSeenModal(!!seen)
  }, [user])

  const fetchNearbyListeners = useCallback(async (geohash: string) => {
    if (!user) return
    // Match on first 4 chars of geohash ≈ 39km² area, then filter to 5-char match for ~5km
    const prefix = geohash.slice(0, 4)
    const { data } = await supabase
      .from('listener_status')
      .select(`
        user_id,
        geohash,
        track_title,
        track_artist,
        track_thumbnail,
        track_id,
        is_sharing,
        profiles!listener_status_user_id_fkey(username, avatar_url)
      `)
      .like('geohash', `${prefix}%`)
      .eq('is_sharing', true)
      .neq('user_id', user.id)
      .limit(20)

    if (!data) return
    const nearby = data
      .filter((row: any) => row.geohash?.startsWith(geohash.slice(0, 5)))
      .map((row: any) => ({
        user_id: row.user_id,
        username: row.profiles?.username ?? 'unknown',
        avatar_url: row.profiles?.avatar_url ?? null,
        track_title: row.track_title,
        track_artist: row.track_artist,
        track_thumbnail: row.track_thumbnail,
        track_id: row.track_id,
      }))
    setListeners(nearby)
  }, [user])

  // Subscribe to realtime updates on the nearby geohash cell
  useEffect(() => {
    if (!user || !isSharing || !locationRef.current) {
      channelRef.current?.unsubscribe()
      channelRef.current = null
      return
    }

    const currentGeo = locationRef.current
    fetchNearbyListeners(currentGeo)

    const channel = supabase
      .channel('nearby-listeners')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'listener_status',
          filter: `is_sharing=eq.true`,
        },
        () => {
          // Re-fetch on any change
          if (locationRef.current) fetchNearbyListeners(locationRef.current)
        }
      )
      .subscribe()

    channelRef.current = channel
    return () => { channel.unsubscribe() }
  }, [user, isSharing, fetchNearbyListeners])

  const doEnableSharing = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const location = await getCoarseLocation()
      locationRef.current = location.geohash

      await supabase.from('listener_status').upsert({
        user_id: user.id,
        geohash: location.geohash,
        is_sharing: true,
        updated_at: new Date().toISOString(),
      })
      setIsSharing(true)
    } catch (err) {
      console.error('Failed to enable sharing:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user, getCoarseLocation])

  const enableSharing = useCallback(async () => {
    if (!user) return
    if (!hasSeenModal) {
      setShowModal(true)
      return
    }
    await doEnableSharing()
  }, [user, hasSeenModal, doEnableSharing])

  const disableSharing = useCallback(async () => {
    if (!user) return
    await supabase
      .from('listener_status')
      .update({ is_sharing: false })
      .eq('user_id', user.id)
    setIsSharing(false)
    setListeners([])
    channelRef.current?.unsubscribe()
    channelRef.current = null
    locationRef.current = null
  }, [user])

  const onModalConfirm = async () => {
    if (!user) return
    localStorage.setItem(`nearby-modal-seen-${user.id}`, 'true')
    setHasSeenModal(true)
    setShowModal(false)
    await doEnableSharing()
  }

  const onModalDismiss = () => setShowModal(false)

  const updateNowPlaying = useCallback(async (track: {
    track_id: string
    track_title: string
    track_artist: string
    track_thumbnail: string
  }) => {
    if (!user || !isSharing) return
    await supabase
      .from('listener_status')
      .update({
        ...track,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
  }, [user, isSharing])

  return {
    listeners,
    isSharing,
    isLoading,
    showModal,
    enableSharing,
    disableSharing,
    onModalConfirm,
    onModalDismiss,
    updateNowPlaying,
  }
}
