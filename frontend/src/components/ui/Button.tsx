import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger' | 'ghost' | 'icon'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'default',
  size = 'md',
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const variantClass = {
    default: 'btn',
    primary: 'btn btn-primary',
    danger: 'btn btn-danger',
    ghost: 'btn btn-ghost',
    icon: 'btn btn-icon',
  }[variant]

  const sizeClass = size === 'lg' ? 'btn-lg' : size === 'sm' ? 'btn-sm' : ''

  return (
    <button
      className={`${variantClass} ${sizeClass} ${className}`.trim()}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span className="loading-dots" aria-label="Loading" /> : children}
    </button>
  )
}
