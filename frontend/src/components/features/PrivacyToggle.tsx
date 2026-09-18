import React from 'react'

interface PrivacyToggleProps {
  isSharing: boolean
  isLoading?: boolean
  onEnable: () => void
  onDisable: () => void
}

export const PrivacyToggle: React.FC<PrivacyToggleProps> = ({
  isSharing,
  isLoading = false,
  onEnable,
  onDisable,
}) => {
  const handleToggle = () => {
    if (isLoading) return
    if (isSharing) onDisable()
    else onEnable()
  }

  return (
    <div
      className="privacy-toggle"
      onClick={handleToggle}
      role="switch"
      aria-checked={isSharing}
      aria-label="Share my listening and location with nearby users"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleToggle()
        }
      }}
    >
      <div className={`toggle-switch ${isSharing ? 'on' : ''} ${isLoading ? 'loading' : ''}`}>
        <div className="toggle-knob" />
      </div>
      <span className="privacy-label">
        {isLoading ? (
          <span className="loading-dots">locating</span>
        ) : isSharing ? (
          <span style={{ color: 'var(--accent2)' }}>sharing nearby</span>
        ) : (
          'share nearby [off]'
        )}
      </span>
    </div>
  )
}
