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
        'flex h-full shrink-0 flex-col border-r border-border bg-sidebar py-3',
        collapsed ? 'w-14 px-2' : 'w-[220px] px-3'
      )}
    >
      <div className={cn('mb-3 flex items-center', collapsed ? 'justify-center' : 'gap-2')}>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-sm text-text-muted hover:bg-hover hover:text-text"
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
          'mb-3 flex h-8 items-center gap-2 rounded-sm text-sm text-text-muted hover:bg-hover hover:text-text',
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
                  ? 'bg-hover font-medium text-text'
                  : 'text-text-muted hover:bg-hover hover:text-text'
              )}
              onClick={() => onNavigate(item.id)}
            >
              <Icon />
              {!collapsed ? <span>{item.label}</span> : null}
            </button>
          )
        })}
      </nav>

      {/* Settings lives at the bottom-left, where people expect it. */}
      <div className="mt-auto flex flex-col gap-1 border-t border-border pt-3">
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
                  ? 'bg-hover font-medium text-text'
                  : 'text-text-muted hover:bg-hover hover:text-text'
              )}
              onClick={() => onNavigate(item.id)}
            >
              <Icon />
              {!collapsed ? <span>{item.label}</span> : null}
            </button>
          )
        })}
      </div>
    </aside>
  )
}
