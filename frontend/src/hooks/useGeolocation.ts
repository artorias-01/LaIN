import { useState, useCallback } from 'react'
import type { CoarseLocation } from '@/types'

// Geohash encoding — 5 char precision ≈ 4.9km × 4.9km cell
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz'

function encodeGeohash(lat: number, lng: number, precision = 5): string {
  let idx = 0
  let bit = 0
  let evenBit = true
  let geohash = ''
  let minLat = -90, maxLat = 90
  let minLng = -180, maxLng = 180

  while (geohash.length < precision) {
    if (evenBit) {
      const midLng = (minLng + maxLng) / 2
      if (lng >= midLng) { idx = idx * 2 + 1; minLng = midLng }
      else { idx = idx * 2; maxLng = midLng }
    } else {
      const midLat = (minLat + maxLat) / 2
      if (lat >= midLat) { idx = idx * 2 + 1; minLat = midLat }
      else { idx = idx * 2; maxLat = midLat }
    }
    evenBit = !evenBit

    if (++bit === 5) {
      geohash += BASE32[idx]
      bit = 0
      idx = 0
    }
  }
  return geohash
}

export const useGeolocation = () => {
  const [location, setLocation] = useState<CoarseLocation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const getCoarseLocation = useCallback((): Promise<CoarseLocation> => {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation is not supported by this browser'))
        return
      }

      setIsLoading(true)
      setError(null)

      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Coarsen: truncate to 2 decimal places ≈ 1.1km precision
          const lat = Math.round(position.coords.latitude * 100) / 100
          const lng = Math.round(position.coords.longitude * 100) / 100
          const geohash = encodeGeohash(lat, lng, 5)
          const coarse: CoarseLocation = { geohash, lat, lng }
          setLocation(coarse)
          setIsLoading(false)
          resolve(coarse)
        },
        (err) => {
          const msg = err.code === 1
            ? 'Location access denied — please allow in browser settings'
            : err.code === 2
            ? 'Location unavailable'
            : 'Location request timed out'
          setError(msg)
          setIsLoading(false)
          reject(new Error(msg))
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      )
    })
  }, [])

  return { location, error, isLoading, getCoarseLocation }
}
