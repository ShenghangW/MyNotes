import { APP_PAGES, type AppPage } from '@renderer/types'
import { cn } from '@renderer/lib/cn'
import {
  IconCalendar,
  IconHome,
  IconMenu,
  IconNotes,
  IconPlus,
  IconSettings,
  IconTimetable
} from './icons'

const ICONS: Record<AppPage, typeof IconHome> = {
  home: IconHome,
  notes: IconNotes,
  calendar: IconCalendar,
  timetable: IconTimetable,
  settings: IconSettings
}

// Each area keeps its own colour everywhere (the same tone as its cards and highlights).
const ICON_COLORS: Record<AppPage, string> = {
  home: 'text-tone-purple-fg',
  notes: 'text-tone-yellow-fg',
  calendar: 'text-tone-orange-fg',
  timetable: 'text-tone-green-fg',
  settings: 'text-tone-gray-fg'
}

type SidebarProps = {
  currentPage: AppPage
  collapsed: boolean
  onNavigate: (page: AppPage) => void
  onToggleCollapsed: () => void
  onAddNote: () => void
}

export default function Sidebar({
  currentPage,
  collapsed,
  onNavigate,
  onToggleCollapsed,
  onAddNote
}: SidebarProps): React.JSX.Element {
  return (
    <aside
      className={cn(
        'lg-sidebar flex h-full shrink-0 flex-col py-3',
        collapsed ? 'w-14 px-2' : 'w-[220px] px-3'
      )}
    >
      <div className={cn('mb-3 flex items-center', collapsed ? 'justify-center' : 'gap-2')}>
        <button
          type="button"
          className="lg-text-2 flex h-8 w-8 items-center justify-center rounded-sm hover:bg-hover hover:text-text"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          onClick={onToggleCollapsed}
        >
          <IconMenu />
        </button>
        {!collapsed ? (
          <span className="text-sm font-medium tracking-tight text-text">myNote</span>
        ) : null}
      </div>

      <button
        type="button"
        className={cn(
          'lg-text-2 mb-3 flex h-8 items-center gap-2 rounded-sm text-sm hover:bg-hover hover:text-text',
          collapsed ? 'justify-center px-0' : 'px-2'
        )}
        aria-label="Add new note"
        title="Add new note"
        onClick={onAddNote}
      >
        <IconPlus />
        {!collapsed ? <span>Add new note</span> : null}
      </button>

      <nav className="flex flex-col gap-1" aria-label="Main">
        {APP_PAGES.filter((item) => item.id !== 'settings').map((item) => {
          const Icon = ICONS[item.id]
          const active = currentPage === item.id
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex h-8 items-center rounded-sm text-sm',
                collapsed ? 'justify-center' : 'gap-2 px-2',
                active
                  ? 'lg-active font-medium'
                  : 'lg-text-2 hover:bg-hover hover:text-text'
              )}
              onClick={() => onNavigate(item.id)}
            >
              <Icon className={ICON_COLORS[item.id]} />
              {!collapsed ? <span>{item.label}</span> : null}
            </button>
          )
        })}
      </nav>

      {/* Settings lives at the bottom-left, where people expect it. */}
      <div className="lg-divider mt-auto flex flex-col gap-1 border-t pt-3">
        {APP_PAGES.filter((item) => item.id === 'settings').map((item) => {
          const Icon = ICONS[item.id]
          const active = currentPage === item.id
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex h-8 items-center rounded-sm text-sm',
                collapsed ? 'justify-center' : 'gap-2 px-2',
                active
                  ? 'lg-active font-medium'
                  : 'lg-text-2 hover:bg-hover hover:text-text'
              )}
              onClick={() => onNavigate(item.id)}
            >
              <Icon className={ICON_COLORS[item.id]} />
              {!collapsed ? <span>{item.label}</span> : null}
            </button>
          )
        })}
      </div>
    </aside>
  )
}
