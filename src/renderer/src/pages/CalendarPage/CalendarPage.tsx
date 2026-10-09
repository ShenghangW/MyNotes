import { useMemo, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type {
  DateSelectArg,
  DatesSetArg,
  EventClickArg,
  EventDropArg,
  EventInput
} from '@fullcalendar/core'
import type { DateClickArg, EventResizeDoneArg } from '@fullcalendar/interaction'
import type { CalendarEvent } from '@shared/api'
import { addDays } from '@shared/dates'
import { nextEventColor } from '@shared/eventColors'
import { IconPlus } from '@renderer/components/icons'
import { useEvents } from '@renderer/hooks/useEvents'
import { useTodos } from '@renderer/hooks/useTodos'
import { scheduleFromFc, toFcEvent, toFcTodo } from '@renderer/lib/calendarMapping'
import { toLocalIsoDate } from '@renderer/lib/date'
import { draftFromEvent, draftToInput, newDraft, type EventDraft } from '@renderer/lib/eventDraft'
import DayTodoPanel from './DayTodoPanel'
import EventModal from './EventModal'

type ModalState = { event: CalendarEvent | null; draft: EventDraft } | null
type ViewState = { type: string; date: string }

const DAY_VIEW = 'timeGridDay'
const MONTH_VIEW = 'dayGridMonth'

export default function CalendarPage(): React.JSX.Element {
  const { events, error, clearError, addEvent, updateEvent, deleteEvent } = useEvents()
  const {
    todos,
    error: todoError,
    addTodo,
    updateTodo,
    deleteTodo,
    reload: reloadTodos
  } = useTodos()
  const calendarRef = useRef<FullCalendar>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const [view, setView] = useState<ViewState>({ type: MONTH_VIEW, date: toLocalIsoDate() })

  // A to-do created from an event is shown as that event, so it isn't drawn twice.
  const calendarItems = useMemo<EventInput[]>(() => {
    const linked = new Set(events.map((event) => event.todoId).filter((id) => id !== null))
    return [
      ...events.map(toFcEvent),
      ...todos.filter((todo) => todo.dueDate !== null && !linked.has(todo.id)).map(toFcTodo)
    ]
  }, [events, todos])

  const goToDay = (date: string): void => {
    calendarRef.current?.getApi().changeView(DAY_VIEW, date)
  }

  const openCreate = (options: Partial<Parameters<typeof newDraft>[0]>): void => {
    clearError()
    setModal({
      event: null,
      draft: newDraft({ ...options, color: nextEventColor(events.length) })
    })
  }

  const openEdit = (event: CalendarEvent): void => {
    clearError()
    setModal({ event, draft: draftFromEvent(event) })
  }

  const handleDateClick = (arg: DateClickArg): void => {
    // In the month grid a click expands that day into its 24-hour schedule.
    if (arg.view.type === MONTH_VIEW) {
      goToDay(arg.dateStr)
    }
  }

  const handleSelect = (arg: DateSelectArg): void => {
    const api = arg.view.calendar
    api.unselect()
    if (arg.view.type === MONTH_VIEW) {
      const lastDay = addDays(toLocalIsoDate(arg.end), -1)
      const firstDay = toLocalIsoDate(arg.start)
      // One day = a plain click, handled by dateClick. Several days = a multi-day event.
      if (lastDay > firstDay) {
        openCreate({ startDate: firstDay, endDate: lastDay, allDay: true })
      }
      return
    }
    const schedule = scheduleFromFc(arg.start, arg.end, arg.allDay)
    openCreate({
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      startTime: schedule.startTime ?? undefined,
      endTime: schedule.endTime ?? undefined,
      allDay: schedule.allDay
    })
  }

  const handleEventClick = (arg: EventClickArg): void => {
    if (arg.event.extendedProps.kind === 'todo') {
      // To-dos are edited in the day panel; jump to their day.
      if (view.type !== DAY_VIEW) {
        goToDay(String(arg.event.extendedProps.date))
      }
      return
    }
    const found = events.find((event) => event.id === arg.event.id)
    if (found) {
      openEdit(found)
    }
  }

  // Dragging or resizing an event reschedules it; if saving fails it snaps back.
  const handleReschedule = async (arg: EventDropArg | EventResizeDoneArg): Promise<void> => {
    if (arg.event.extendedProps.kind !== 'event' || !arg.event.start) {
      arg.revert()
      return
    }
    const schedule = scheduleFromFc(arg.event.start, arg.event.end, arg.event.allDay)
    if (!(await updateEvent({ id: arg.event.id, ...schedule }))) {
      arg.revert()
      return
    }
    await reloadTodos()
  }

  const handleDatesSet = (arg: DatesSetArg): void => {
    const next = { type: arg.view.type, date: toLocalIsoDate(arg.view.currentStart) }
    setView((current) =>
      current.type === next.type && current.date === next.date ? current : next
    )
  }

  const handleSave = async (draft: EventDraft): Promise<boolean> => {
    const saved = modal?.event
      ? await updateEvent({ id: modal.event.id, ...draftToInput(draft) })
      : await addEvent(draftToInput(draft))
    if (saved) {
      await reloadTodos() // the event may have created, changed or removed a linked to-do
    }
    return saved
  }

  const handleDelete = async (): Promise<boolean> => {
    if (!modal?.event) {
      return false
    }
    const deleted = await deleteEvent(modal.event.id)
    if (deleted) {
      await reloadTodos()
    }
    return deleted
  }

  const showDayPanel = view.type === DAY_VIEW

  return (
    <section>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <button
          type="button"
          className="flex h-9 items-center gap-2 rounded-sm border border-border bg-surface px-3 text-sm text-text hover:border-accent hover:text-accent"
          onClick={() => openCreate({ startDate: showDayPanel ? view.date : undefined })}
        >
          <IconPlus className="h-4 w-4" />
          New event
        </button>
      </div>

      {error && !modal ? (
        <p className="mt-3 text-sm text-text" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex h-[calc(100vh-8rem)] min-h-[520px] gap-4">
        <div className="mn-calendar min-w-0 flex-1 rounded-md border border-border bg-surface p-4">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={MONTH_VIEW}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            buttonText={{ today: 'Today', month: 'Month', week: 'Week', day: 'Day' }}
            events={calendarItems}
            editable
            selectable
            selectMirror
            navLinks
            nowIndicator
            fixedWeekCount={false}
            dayMaxEvents={3}
            slotDuration="00:30:00"
            snapDuration="00:15:00"
            scrollTime="07:00:00"
            slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            height="100%"
            dateClick={handleDateClick}
            select={handleSelect}
            eventClick={handleEventClick}
            eventDrop={(arg) => void handleReschedule(arg)}
            eventResize={(arg) => void handleReschedule(arg)}
            datesSet={handleDatesSet}
          />
        </div>

        {showDayPanel ? (
          <DayTodoPanel
            date={view.date}
            todos={todos}
            error={todoError}
            onAdd={(text, dueDate) => addTodo(text, dueDate)}
            onUpdate={updateTodo}
            onDelete={deleteTodo}
          />
        ) : null}
      </div>

      {modal ? (
        <EventModal
          event={modal.event}
          initial={modal.draft}
          error={error}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
        />
      ) : null}
    </section>
  )
}
