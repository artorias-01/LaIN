import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { GlitchWordmark, GlitchWordmarkHandle } from './GlitchWordmark'
import { TypingLine } from './TypingLine'
import { supabase } from '@/lib/supabaseClient'

export const HeroSection: React.FC = () => {
  const glitchRef = useRef<GlitchWordmarkHandle>(null)

  // Listen to Supabase Realtime nearby listener events
  // When a new nearby listener appears, fire the glitch pulse as a functional signal
  useEffect(() => {
    const channel = supabase
      .channel('hero-nearby-signal')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'listener_status',
          filter: 'is_sharing=eq.true',
        },
        () => {
          glitchRef.current?.triggerGlitch()
        }
      )
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [])

  return (
    <main className="hero-page scanlines" role="main">
      {/* Ambient scanlines */}
      <div className="hero-bg-scanlines" aria-hidden="true" />
      {/* Vignette */}
      <div className="hero-vignette" aria-hidden="true" />

      <div className="hero-content">
        {/* Glitching wordmark */}
        <GlitchWordmark ref={glitchRef} text="terminal.fm" />

        {/* Tagline */}
        <p className="hero-tagline" aria-label="Stream music. Find nearby listeners.">
          stream music &nbsp;·&nbsp; find nearby listeners
        </p>

        {/* Typing animation line */}
        <TypingLine />

        {/* CTA Buttons */}
        <div className="hero-cta">
          <Link to="/signup" className="cta-btn">
            ▶ enter_
          </Link>
          <Link to="/login" className="cta-btn cta-btn-secondary">
            $ login
          </Link>
        </div>

        {/* Footnote */}
        <p style={{ fontSize: '0.7rem', color: 'var(--fg-dim)', marginTop: 'var(--s-4)' }}>
          location sharing is <span style={{ color: 'var(--accent2)' }}>off by default</span>
          &nbsp;·&nbsp; opt in any time
        </p>
      </div>
    </main>
  )
}
