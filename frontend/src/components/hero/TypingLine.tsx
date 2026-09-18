import React, { useEffect, useRef, useState } from 'react'

const PHRASES = [
  '> search "lofi beats to code to"',
  '> now playing: nearby, 3 listeners detected',
  '> privacy: location sharing is off by default',
  '> streaming audio via yt-dlp proxy',
  '> your play history is yours alone',
  '> terminal.fm — no UI, just music',
]

const TYPING_SPEED_MS = 48
const DELETING_SPEED_MS = 24
const PAUSE_AFTER_TYPE_MS = 2200
const PAUSE_AFTER_DELETE_MS = 400

export const TypingLine: React.FC = () => {
  const [displayed, setDisplayed] = useState('')
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const rafRef = useRef<number>()
  const lastTimeRef = useRef<number>(0)
  const pauseUntilRef = useRef<number>(0)

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (prefersReduced) {
      setDisplayed(PHRASES[0])
      return
    }

    const tick = (now: number) => {
      if (now < pauseUntilRef.current) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const phrase = PHRASES[phraseIndex]

      if (!isDeleting) {
        // Typing
        if (displayed.length < phrase.length) {
          const delay = TYPING_SPEED_MS
          if (now - lastTimeRef.current >= delay) {
            setDisplayed(phrase.slice(0, displayed.length + 1))
            lastTimeRef.current = now
          }
        } else {
          // Fully typed — pause then start deleting
          pauseUntilRef.current = now + PAUSE_AFTER_TYPE_MS
          setIsDeleting(true)
        }
      } else {
        // Deleting
        if (displayed.length > 0) {
          if (now - lastTimeRef.current >= DELETING_SPEED_MS) {
            setDisplayed(displayed.slice(0, -1))
            lastTimeRef.current = now
          }
        } else {
          // Fully deleted — advance phrase
          pauseUntilRef.current = now + PAUSE_AFTER_DELETE_MS
          setIsDeleting(false)
          setPhraseIndex((i) => (i + 1) % PHRASES.length)
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [displayed, isDeleting, phraseIndex, prefersReduced])

  return (
    <div className="typing-line hero-typing-line" aria-live="polite" aria-label="Terminal messages">
      <span className="typing-text">{displayed}</span>
      <span className="cursor-blink" aria-hidden="true" />
    </div>
  )
}
