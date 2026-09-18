import axios from 'axios'

const YTDLP_BASE = import.meta.env.VITE_YTDLP_SERVICE_URL || '/ytapi'

export const ytdlpClient = axios.create({
  baseURL: YTDLP_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const getStreamUrl = (videoId: string): string => {
  return `${YTDLP_BASE}/api/stream/${videoId}`
}
