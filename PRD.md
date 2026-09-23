# Product Requirements Document (PRD) — Personal Notes & Productivity App

**Platform:** Desktop app
**Users:** Single-user, personal use
**Data:** Stored locally on device — no cloud sync, no accounts, no collaboration

This PRD supersedes the earlier "basic notes only" requirement list — the scope has grown into a small productivity suite (notes + calendar + to-do + timetable), and this document reflects that.

---

## 1. App Structure — Pages

| Page | Purpose |
|---|---|
| **Home** | Daily overview: to-do list, mini calendar, recent notes |
| **Notes** | Browse, create, and edit all notes |
| **Calendar** | Full calendar, manage events |
| **Timetable** | Weekly recurring class/schedule reference |
| **Settings** | App preferences and note group management |

**Navigation:** a collapsible left sidebar (toggled via a menu icon) holds links to Home, Notes, Calendar, Timetable, and Settings, plus a persistent "+ Add new note" quick-action button near the top for creating a note from anywhere in the app.

---

## 2. Home Page
- To-do list widget — add, check off, delete tasks
- Mini calendar showing upcoming day(s)/events at a glance
- List of most recently created/edited notes (quick jump-back-in)
- Optional photo widget — upload a photo to display on the home page; can be shown or hidden whenever you like

## 3. Notes Page
- Grid/list view of all notes
- Double-click a note to open it in edit mode
- Create / edit / delete notes
- Search notes (by title + content)
- Basic text formatting: bold, italic, underline, headings, bullet/numbered lists
- Insert images inline
- **Foldable sections** — collapse/expand chapters or headings within a note (Notion-style), so long notes with many chapters stay organized
- **Cover image** — upload a photo per note that displays as a banner across the top of that note (Notion-style); each note can have its own, different from the rest
- **Note groups** — organize notes into categories (e.g. School, Work, Games); create/rename/delete groups, assign a note to a group, and filter the notes list by group from the sidebar

## 4. Calendar Page
- Full calendar view (month view as the default)
- Create / edit / delete events
- Each event has: title, date, and an **optional reminder toggle**
- If reminder is turned on for that event: a warning pop-up appears 1–2 days before the event date
- Used for assessment dates, deadlines, and general events (same event type for now)

## 5. Timetable Page
- A fixed weekly grid (e.g. Monday–Sunday, time blocks) to log your recurring class/weekly schedule
- Not tied to specific dates — a persistent reference table you can edit anytime, always visible in one place

## 6. Settings Page
- Manage note groups (create, rename, delete)
- Set reminder lead time (1 day vs 2 days before an event)
- View where local data is stored

## 7. App-Wide Features
- **Auto-save** — all changes (notes, events, todos, timetable) save automatically as you work
- **Manual save** — also available as a backup/peace-of-mind option (e.g. Ctrl+S)
- All data stored locally only

---

## Judgment calls I made — flag anything you want changed
- **Home page photo widget:** assumed it shows one photo at a time (not a rotating gallery/slideshow of multiple photos). Say the word if you want multiple photos cycling through.
- **Reminder pop-ups only work while the app is open.** Making it notify you even when the app is closed needs deeper OS-level integration — I'm treating that as a V2 upgrade, not part of this build.
- **Assessments vs. general events:** treated as the same event type for now (both just "events" with an optional reminder). A visual distinction (e.g. different color for assessments) is an easy later addition if you want it.
- **To-do list kept simple:** just task text + checkbox + optional due date. No priority levels or categories yet.
- **Calendar default view:** month view. Week/day views can be added later if month view feels too zoomed-out for you.
- **Note groups:** you can create as many groups as you want with any names — I used School, Work, and Games as examples since you mentioned them, but they're not hardcoded categories.

---

## Still deferred to a later version (V2) — not in this build
- Video/audio embedding in notes
- Full rich editor tools: tables, drawing/sketch tool, code blocks
- Pin/favorite notes
- Version history
- Note-level password/lock
- Cross-device sync
- Export/share (PDF, Word)
- Collaboration/multi-user
- System notifications when the app isn't running
- Multiple/per-page wallpapers
- Recurring calendar events (weekly recurring events beyond the Timetable page)

---

## 8. Design Language (V1 baseline)
- **Aesthetic:** clean, minimal, Notion-inspired — generous whitespace, subtle borders instead of heavy shadows, no visual clutter
- **Color palette:** mostly neutral grays/whites with a single accent color for interactive elements (buttons, active states, links); light mode first, dark mode as a stretch goal
- **Typography:** one clean sans-serif font (e.g. Inter or system default), a simple size scale (small / body / heading), consistent line-height for readability
- **Spacing:** a consistent spacing scale (e.g. 4/8/12/16/24px) so elements don't feel cramped or randomly placed
- **Components:** subtle 1px borders, rounded corners, soft hover states — no heavy shadows, no gradients, no visual noise
- **Styling tool:** Tailwind CSS — keeps a consistent, minimal design system without writing custom CSS for every component
- **Deferred to V2:** custom themes/color picker, animations and transitions beyond simple hover states, illustrations or decorative graphics

## 9. Testing & Definition of Done
Every component/feature must meet this checklist before moving on to the next one:
1. Works as described in this PRD — the feature does what it's supposed to
2. No crashes or errors in the console when using it
3. At least one basic automated test covering its core logic (e.g. does the reminder trigger 1–2 days before an event, does the group filter show the right notes)
4. If it saves data, that data survives closing and reopening the app
5. UI matches the agreed design language (spacing, colors, typography) — not final polish, just "on-brand"

**Testing tools:** Vitest (test runner, pairs well with the Electron + Vite setup) + React Testing Library (for testing that components render and respond to clicks/input correctly)

This is a lightweight safety net appropriate for a solo personal project — not full test coverage, just enough to catch real bugs before they compound across features.

## 10. Recommended Tech Stack
- **App framework:** Electron (packages a web app as a cross-platform desktop app)
- **UI:** React + TypeScript
- **Notes editor:** BlockNote (Notion-style block editor — supports foldable sections, images, text formatting out of the box)
- **Calendar:** FullCalendar (month view, event creation/editing)
- **Local storage:** SQLite (single local database file for notes, events, todos, timetable)
- **Images:** stored as files on disk, referenced by file path in the database
- **Styling:** Tailwind CSS (minimal, consistent design system — see section 8)
- **Testing:** Vitest + React Testing Library

---

## 11. Folder Structure

```
notes-app/
├── PRD.md
├── package.json
├── tsconfig.json
├── tailwind.config.ts
│
├── src/
│   ├── main/                      # Electron backend (runs on your computer, not in the window)
│   │   ├── index.ts               # App startup
│   │   ├── db/
│   │   │   ├── database.ts        # Connects to the SQLite file
│   │   │   └── schema.sql         # Defines tables: notes, note_groups, events, todos, timetable
│   │   ├── ipc/                   # Handles requests from the UI (save note, add event, etc.)
│   │   │   ├── notesHandlers.ts
│   │   │   ├── noteGroupsHandlers.ts
│   │   │   ├── calendarHandlers.ts
│   │   │   ├── todoHandlers.ts
│   │   │   └── timetableHandlers.ts
│   │   └── storage/
│   │       └── imageStorage.ts    # Saves uploaded images (covers, wallpaper) to disk
│   │
│   ├── preload/
│   │   └── index.ts               # Safe bridge between backend and UI
│   │
│   └── renderer/                  # The React UI (what you see on screen)
│       ├── main.tsx
│       ├── App.tsx                # Switches between Home / Notes / Calendar / Timetable / Settings
│       │
│       ├── pages/
│       │   ├── HomePage/
│       │   │   ├── HomePage.tsx
│       │   │   ├── TodoWidget.tsx
│       │   │   ├── MiniCalendarWidget.tsx
│       │   │   ├── RecentNotesWidget.tsx
│       │   │   └── PhotoWidget.tsx        # hideable photo widget
│       │   ├── NotesPage/
│       │   │   ├── NotesPage.tsx          # grid/list of all notes, filterable by group
│       │   │   ├── NoteEditor.tsx         # the actual note editor (BlockNote)
│       │   │   ├── NoteCover.tsx          # per-note cover image
│       │   │   └── NoteGroupList.tsx      # group filter list (School, Work, Games, etc.)
│       │   ├── CalendarPage/
│       │   │   ├── CalendarPage.tsx
│       │   │   └── EventModal.tsx         # create/edit event popup, reminder toggle
│       │   ├── TimetablePage/
│       │   │   └── TimetablePage.tsx
│       │   └── SettingsPage/
│       │       └── SettingsPage.tsx       # manage note groups, reminder lead time, data location
│       │
│       ├── components/                    # reusable pieces shared across pages
│       │   ├── Sidebar.tsx                # collapsible nav: Home / Notes / Calendar / Timetable / Settings + Add note button
│       │   └── ReminderPopup.tsx          # the 1-2 day warning popup
│       │
│       ├── hooks/
│       │   ├── useNotes.ts
│       │   ├── useNoteGroups.ts
│       │   ├── useEvents.ts
│       │   └── useAutosave.ts
│       │
│       └── types/
│           └── index.ts
│                                   # Note: test files sit next to what they test, e.g.
│                                   # useAutosave.test.ts beside useAutosave.ts
│
├── assets/
│   └── icons/                     # app icon files
│
└── userdata/                      # created automatically when the app runs
    ├── app.db                     # the SQLite database
    └── images/                    # uploaded cover images, wallpaper, note images
```

---

*This document is the baseline for the build. Update it as decisions change during development.*
