import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSearch } from '@/hooks/useSearch'
import { usePlayerStore } from '@/store/playerStore'
import { useAuthStore } from '@/store/authStore'
import { useAuth } from '@/hooks/useAuth'
import type { Track } from '@/types'

export const TopBar: React.FC = () => {
  const [query, setQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { user } = useAuthStore()
  const { signOut } = useAuth()
  const { searchHistory, fetchSearchHistory } = useSearch()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) fetchSearchHistory()
  }, [user])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        !dropdownRef.current?.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setShowDropdown(false)
    navigate(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  const handleFocus = () => {
    if (searchHistory.length > 0) setShowDropdown(true)
  }

  const handleHistoryClick = (q: string) => {
    setQuery(q)
    setShowDropdown(false)
    navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <header className="topbar">
      <form className="topbar-search" onSubmit={handleSubmit}>
        <div className="search-input-wrap">
          <span className="search-prompt" aria-hidden="true">$</span>
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleFocus}
            placeholder="search music..."
            autoComplete="off"
            spellCheck={false}
            aria-label="Search music"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
          />
        </div>

        {showDropdown && searchHistory.length > 0 && (
          <div className="search-dropdown" ref={dropdownRef} role="listbox">
            <div className="search-dropdown-label">recent searches</div>
            {searchHistory.map((entry) => (
              <div
                key={entry.id}
                className="search-dropdown-item"
                role="option"
                aria-selected={false}
                onClick={() => handleHistoryClick(entry.query)}
              >
                <span style={{ color: 'var(--fg-dim)', fontSize: '0.8rem' }}>↺</span>
                {entry.query}
              </div>
            ))}
          </div>
        )}
      </form>

      <div className="topbar-actions">
        {user ? (
          <>
            <span style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>
              {user.profile?.username ?? user.email}
            </span>
            <button
              className="btn btn-ghost"
              style={{ fontSize: '0.75rem' }}
              onClick={signOut}
            >
              logout
            </button>
          </>
        ) : (
          <a href="/login" className="btn btn-ghost" style={{ fontSize: '0.75rem' }}>
            login
          </a>
        )}
      </div>
    </header>
  )
}
