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

export function IconChevronLeft({ className }: IconProps): React.JSX.Element {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden {...stroke}>
      <path d="M15 5 8 12l7 7" />
    </svg>
  )
}

export function IconTrash({ className }: IconProps): React.JSX.Element {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden {...stroke}>
      <path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" />
    </svg>
  )
}
