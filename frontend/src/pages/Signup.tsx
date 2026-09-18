import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export const Signup: React.FC = () => {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email || !username || !password) {
      setError('All fields are required')
      return
    }
    if (username.length < 3 || username.length > 24) {
      setError('Username must be 3–24 characters')
      return
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setError('Username: only letters, numbers, _ and - allowed')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await signUp(email, password, username)
      setSuccess(true)
    } catch (err: any) {
      setError(err?.message ?? 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">terminal<span>.</span>fm</div>
          <p className="auth-subtitle" style={{ color: 'var(--accent2)' }}>
            ✓ account created — check your email to confirm
          </p>
          <Link to="/login" className="btn btn-primary" style={{ marginTop: 'var(--s-4)' }}>
            go to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          terminal<span style={{ color: 'var(--fg-muted)' }}>.</span>
          <span style={{ color: 'var(--accent)' }}>fm</span>
        </div>
        <p className="auth-subtitle">create account</p>

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
            label="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="handle_01"
            autoComplete="username"
            required
          />
          <Input
            label="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="min 8 characters"
            autoComplete="new-password"
            required
          />
          <Input
            label="confirm password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="repeat password"
            autoComplete="new-password"
            required
          />

          <Button type="submit" variant="primary" size="lg" loading={loading} style={{ width: '100%' }}>
            $ create_account
          </Button>
        </form>

        <div className="auth-footer">
          already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent2)' }}>
            login →
          </Link>
        </div>
      </div>
    </div>
  )
}
