import React from 'react'
import { useNearby } from '@/hooks/useNearby'
import { PrivacyToggle } from './PrivacyToggle'
import { LocationModal } from './LocationModal'
import { useAuthStore } from '@/store/authStore'
import type { NearbyListener } from '@/types'

const ListenerRow: React.FC<{ listener: NearbyListener }> = ({ listener }) => (
  <div className="nearby-listener">
    {listener.avatar_url ? (
      <img src={listener.avatar_url} alt="" className="listener-avatar" />
    ) : (
      <div className="listener-avatar" aria-hidden="true">
        {listener.username.slice(0, 2).toUpperCase()}
      </div>
    )}
    <div className="listener-info">
      <div className="listener-name">{listener.username}</div>
      {listener.track_title ? (
        <div className="listener-track">
          {listener.track_artist && <span>{listener.track_artist} — </span>}
          {listener.track_title}
        </div>
      ) : (
        <div className="listener-track" style={{ color: 'var(--fg-dim)' }}>
          idle
        </div>
      )}
    </div>
    {listener.track_thumbnail && (
      <img
        src={listener.track_thumbnail}
        alt=""
        className="listener-thumb"
        loading="lazy"
      />
    )}
  </div>
)

export const NearbyListeners: React.FC = () => {
  const { user } = useAuthStore()
  const {
    listeners,
    isSharing,
    isLoading,
    showModal,
    enableSharing,
    disableSharing,
    onModalConfirm,
    onModalDismiss,
  } = useNearby()

  if (!user) {
    return (
      <div className="nearby-panel">
        <div className="nearby-header">
          <div className="nearby-title">◎ nearby listeners</div>
        </div>
        <div className="empty-state">
          <span className="prompt-line">log in to see nearby listeners</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="nearby-panel">
        <div className="nearby-header">
          <div className="nearby-title">
            <span className={`status-live ${isSharing ? 'is-playing' : ''}`} />
            nearby listeners
          </div>
          <PrivacyToggle
            isSharing={isSharing}
            isLoading={isLoading}
            onEnable={enableSharing}
            onDisable={disableSharing}
          />
        </div>

        {!isSharing ? (
          <div className="empty-state">
            <span className="prompt-line">sharing is off — enable to see nearby listeners</span>
          </div>
        ) : listeners.length === 0 ? (
          <div className="empty-state">
            <span className="prompt-line">no listeners detected nearby</span>
            <span
              className="prompt-line"
              style={{ fontSize: '0.75rem', color: 'var(--fg-dim)' }}
            >
              within ~5km of your location
            </span>
          </div>
        ) : (
          <div className="nearby-list" role="list">
            {listeners.map((listener) => (
              <div key={listener.user_id} role="listitem">
                <ListenerRow listener={listener} />
              </div>
            ))}
          </div>
        )}
      </div>

      <LocationModal
        isOpen={showModal}
        onConfirm={onModalConfirm}
        onDismiss={onModalDismiss}
      />
    </>
  )
}
