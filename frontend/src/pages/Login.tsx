import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import { isSupabaseConfigured } from '@/lib/supabaseClient'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export const Login: React.FC = () => {
  const { signIn } = useAuth()
  const { enterGuestMode } = useAuthStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!isSupabaseConfigured) {
      setError(
        'Supabase isn\u2019t connected yet, so login can\u2019t reach a real account. ' +
        'Use "continue as guest" below to try the rest of the app.'
      )
      return
    }

    if (!email || !password) {
      setError('Email and password are required')
      return
    }

    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/home', { replace: true })
    } catch (err: any) {
      setError(err?.message ?? 'Login failed — check your credentials')
    } finally {
      setLoading(false)
    }
  }

  const handleGuest = () => {
    enterGuestMode()
    navigate('/home', { replace: true })
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          terminal<span style={{ color: 'var(--fg-muted)' }}>.</span>
          <span style={{ color: 'var(--accent)' }}>fm</span>
        </div>
        <p className="auth-subtitle">sign in</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {error && <div className="auth-error">{error}</div>}

          <Input
            label="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          <Input
            label="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />

          <Button type="submit" variant="primary" size="lg" loading={loading} style={{ width: '100%' }}>
            $ login
          </Button>
        </form>

        <div className="auth-divider" style={{ margin: 'var(--s-3) 0', textAlign: 'center', color: 'var(--fg-dim)', fontSize: '0.75rem' }}>
          — or —
        </div>

        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={handleGuest}
          style={{ width: '100%' }}
        >
          $ continue as guest
        </Button>
        <p style={{ fontSize: '0.72rem', color: 'var(--fg-dim)', marginTop: 'var(--s-2)', textAlign: 'center' }}>
          browse and play music without an account — history, liked tracks, and nearby
          listeners need a real login
        </p>

        <div className="auth-footer">
          no account?{' '}
          <Link to="/signup" style={{ color: 'var(--accent2)' }}>
            create one →
          </Link>
        </div>
      </div>
    </div>
  )
}
