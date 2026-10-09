type IconProps = {
  className?: string
}

const stroke = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
}

export function IconMenu({ className }: IconProps): React.JSX.Element {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden {...stroke}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

export function IconPlus({ className }: IconProps): React.JSX.Element {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden {...stroke}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function IconHome({ className }: IconProps): React.JSX.Element {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden {...stroke}>
      <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5.5v-6h-3v6H5a1 1 0 0 1-1-1v-8.5Z" />
    </svg>
  )
}

export function IconNotes({ className }: IconProps): React.JSX.Element {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden {...stroke}>
      <path d="M7 4h8l5 5v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      <path d="M15 4v5h5M9 13h6M9 17h4" />
    </svg>
  )
}

export function IconCalendar({ className }: IconProps): React.JSX.Element {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden {...stroke}>
      <rect x="4" y="6" width="16" height="14" rx="1" />
      <path d="M8 4v4M16 4v4M4 11h16" />
    </svg>
  )
}

export function IconTimetable({ className }: IconProps): React.JSX.Element {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden {...stroke}>
      <rect x="4" y="5" width="16" height="15" rx="1" />
      <path d="M4 10h16M10 5v15M16 5v15" />
    </svg>
  )
}

export function IconSettings({ className }: IconProps): React.JSX.Element {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden {...stroke}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4v2.2M12 17.8V20M4 12h2.2M17.8 12H20M6.4 6.4l1.6 1.6M16 16l1.6 1.6M17.6 6.4 16 8M8 16l-1.6 1.6" />
    </svg>
  )
}

export function IconSearch({ className }: IconProps): React.JSX.Element {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden {...stroke}>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.2-4.2" />
    </svg>
  )
}

export function IconTrash({ className }: IconProps): React.JSX.Element {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden {...stroke}>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3" />
    </svg>
  )
}

export function IconGrid({ className }: IconProps): React.JSX.Element {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden {...stroke}>
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
    </svg>
  )
}

export function IconList({ className }: IconProps): React.JSX.Element {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden {...stroke}>
      <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  )
}

export function IconArrowLeft({ className }: IconProps): React.JSX.Element {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden {...stroke}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  )
}

export function IconImage({ className }: IconProps): React.JSX.Element {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden {...stroke}>
      <path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM3 16l5-5 4 4 3-3 6 6M9 9h.01" />
    </svg>
  )
}

export function IconPencil({ className }: IconProps): React.JSX.Element {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden {...stroke}>
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17l-1 3ZM14 7l3 3" />
    </svg>
  )
}

export function IconChevronDown({ className }: IconProps): React.JSX.Element {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden {...stroke}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
