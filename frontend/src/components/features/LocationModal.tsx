import React from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface LocationModalProps {
  isOpen: boolean
  onConfirm: () => void
  onDismiss: () => void
}

export const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  onConfirm,
  onDismiss,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onDismiss}
      title="// nearby_listeners.enable"
      footer={
        <>
          <Button variant="ghost" onClick={onDismiss}>
            cancel
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            ▶ enable sharing
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
        <p className="modal-text">
          Enabling <span style={{ color: 'var(--accent2)' }}>nearby listeners</span> will share
          the following with other opted-in users near you:
        </p>

        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
          {[
            { icon: '◎', text: 'Your approximate location (±5 km grid — not your exact GPS coordinates)' },
            { icon: '♫', text: 'The track you are currently playing (title + artist)' },
            { icon: '◉', text: 'Your username and avatar' },
          ].map(({ icon, text }) => (
            <li
              key={icon}
              style={{
                display: 'flex',
                gap: 'var(--s-3)',
                fontSize: '0.82rem',
                color: 'var(--fg-muted)',
                alignItems: 'flex-start',
              }}
            >
              <span style={{ color: 'var(--accent)', flexShrink: 0 }}>{icon}</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>

        <div
          style={{
            padding: 'var(--s-3)',
            background: 'rgba(255, 107, 107, 0.04)',
            borderLeft: '2px solid var(--accent2)',
            fontSize: '0.8rem',
            color: 'var(--fg-muted)',
          }}
        >
          <span style={{ color: 'var(--accent2)' }}>Default: off.</span> You can disable this
          at any time from the nearby panel. Your location is not stored permanently — only
          while you are actively sharing.
        </div>
      </div>
    </Modal>
  )
}
