import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/authStore'

const NAV_ITEMS = [
  { icon: '⌂', label: 'Home', to: '/home' },
  { icon: '♫', label: 'Library', to: '/library' },
  { icon: '♡', label: 'Liked', to: '/liked' },
  { icon: '◎', label: 'Nearby', to: '/nearby' },
]

export const Sidebar: React.FC = () => {
  const [expanded, setExpanded] = useState(false)
  const location = useLocation()
  const { user } = useAuthStore()

  return (
    <aside className={`sidebar ${expanded ? 'expanded' : ''}`} aria-label="Main navigation">
      <div className="sidebar-icon-rail">
        {/* Logo / Toggle */}
        <button
          className="sidebar-icon-btn"
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '0.8rem' }}
        >
          {expanded ? '◁' : '▷'}
        </button>

        <div className="divider" style={{ width: '32px', margin: 'var(--s-1) auto' }} />

        {NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`sidebar-icon-btn ${location.pathname === item.to ? 'active' : ''}`}
            aria-label={item.label}
            title={item.label}
            style={{ textDecoration: 'none' }}
          >
            {item.icon}
          </Link>
        ))}
      </div>

      {/* Expanded library panel */}
      <div className="sidebar-library">
        <div className="library-section-title">// library</div>

        {!user ? (
          <div className="empty-state" style={{ padding: 'var(--s-2) 0' }}>
            <span className="prompt-line" style={{ fontSize: '0.75rem' }}>
              log in to see your library
            </span>
          </div>
        ) : (
          <LibraryContent userId={user.id} currentPath={location.pathname} />
        )}
      </div>
    </aside>
  )
}

const LibraryContent: React.FC<{ userId: string; currentPath: string }> = ({
  userId,
  currentPath,
}) => {
  const [liked, setLiked] = React.useState<Array<{ track_id: string; title: string }>>([])

  React.useEffect(() => {
    supabase
      .from('liked_tracks')
      .select('track_id, title')
      .eq('user_id', userId)
      .order('added_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setLiked(data ?? []))
  }, [userId])

  if (liked.length === 0) {
    return (
      <div className="empty-state" style={{ padding: 'var(--s-2) 0' }}>
        <span className="prompt-line" style={{ fontSize: '0.75rem' }}>no liked tracks yet</span>
      </div>
    )
  }

  return (
    <>
      <div className="library-section-title">liked tracks</div>
      {liked.map((t) => (
        <Link
          key={t.track_id}
          to={`/track/${t.track_id}`}
          className={`library-item ${currentPath.includes(t.track_id) ? 'active' : ''}`}
          style={{ textDecoration: 'none' }}
        >
          <span>♥</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t.title}
          </span>
        </Link>
      ))}
    </>
  )
}
