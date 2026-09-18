import React, { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'

const GLITCH_DURATION_MS = 280
const GLITCH_MIN_INTERVAL_MS = 5000
const GLITCH_MAX_INTERVAL_MS = 9000

export interface GlitchWordmarkHandle {
  triggerGlitch: () => void
}

interface GlitchWordmarkProps {
  text?: string
  className?: string
}

export const GlitchWordmark = forwardRef<GlitchWordmarkHandle, GlitchWordmarkProps>(
  ({ text = 'terminal.fm', className = '' }, ref) => {
    const wordmarkRef = useRef<HTMLSpanElement>(null)
    const timerRef = useRef<ReturnType<typeof setTimeout>>()
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const triggerGlitch = useCallback(() => {
      if (prefersReduced) return
      const el = wordmarkRef.current
      if (!el) return

      el.classList.add('glitch-active')
      setTimeout(() => {
        el.classList.remove('glitch-active')
      }, GLITCH_DURATION_MS)
    }, [prefersReduced])

    // Expose triggerGlitch to parent (for WebSocket-driven glitches)
    useImperativeHandle(ref, () => ({ triggerGlitch }), [triggerGlitch])

    // Periodic random glitch interval
    useEffect(() => {
      if (prefersReduced) return

      const scheduleNext = () => {
        const delay =
          GLITCH_MIN_INTERVAL_MS +
          Math.random() * (GLITCH_MAX_INTERVAL_MS - GLITCH_MIN_INTERVAL_MS)
        timerRef.current = setTimeout(() => {
          triggerGlitch()
          scheduleNext()
        }, delay)
      }

      scheduleNext()
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current)
      }
    }, [triggerGlitch, prefersReduced])

    // Split the text to apply accent color to the dot
    const parts = text.split('.')
    const displayText = parts.length >= 2
      ? `${parts.slice(0, -1).join('.')}.${parts[parts.length - 1]}`
      : text

    return (
      <span
        ref={wordmarkRef}
        className={`glitch-wordmark hero-wordmark ${className}`}
        data-text={text}
        aria-label={text}
      >
        {parts.length >= 2 ? (
          <>
            {parts.slice(0, -1).join('.')}
            <span className="accent">.</span>
            {parts[parts.length - 1]}
          </>
        ) : (
          text
        )}
      </span>
    )
  }
)

GlitchWordmark.displayName = 'GlitchWordmark'
