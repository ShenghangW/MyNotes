# Development Plan — Personal Notes & Productivity App (V1)

**Status:** Approved — decisions locked 2026-09-02  
**Source of truth:** `PRD.md`  
**Product:** Local-only desktop app (notes + calendar + to-do + timetable)  
**Stack (locked by PRD):** Electron · React · TypeScript · Tailwind · BlockNote · FullCalendar · SQLite · Vitest + React Testing Library

This plan is ordered by **dependency**, not by page in the PRD. Each phase has concrete tasks, files, tests, and a gate. Do not start the next phase until the current gate passes.

---

## 0. How to use this plan

1. Review the **locked decisions**, **open questions**, and **phase order** below.
2. Approve, or mark changes in the review checklist at the bottom.
3. Implement **one phase at a time**. After each phase, run that phase’s gate before moving on.
4. If a decision in `PRD.md` changes, update this plan in the same change.

**Suggested pace:** one phase per focused work block. Calendar estimate for a solo builder: **~18–24 working days** to a usable V1 installer, assuming the open questions stay as currently assumed.

---

## 1. Locked decisions (from PRD)

Treat these as constraints unless you explicitly change them:

| Topic | V1 decision |
|---|---|
| Users | Single user, personal, no accounts |
| Data | Local SQLite + files on disk. No cloud, no sync |
| Reminders | In-app popup only, while the app is open. Lead time 1 or 2 days (Settings) |
| Events | One event type (assessments and general events look the same) |
| Calendar view | Month view only |
| App name | `myNote` (window title + installer) |
| Package | Windows `.exe` only for V1 |
| To-dos | Text + checkbox + optional due date. No priority/categories. **Due todos also appear on the calendar as all-day items** (not stored as events) |
| Calendar events | All-day only (no start/end time) |
| Groups | Notes may be ungrouped. Deleting a group ungroups notes (`ON DELETE SET NULL`) |
| Timetable | Mon–Sun, 07:00–21:00, 60-minute slots, reject overlaps |
| Images | Copied into the app data folder |
| Home photo | One photo at a time, hideable. Not a gallery |
| Note groups | User-created names. Not hardcoded School/Work/Games |
| Theme | Light mode. Dark mode is stretch, not a gate |
| Editor extras | No tables, code blocks, drawing, video/audio |
| Recurring calendar events | Out of scope (use Timetable for weekly repeating schedule) |
| Styling | Tailwind, Notion-like: neutrals + one accent, 1px borders, no heavy shadows/gradients |
| Tests | At least one automated test per feature’s core logic; persist-and-reopen for anything that saves |

---

## 2. Previously open questions — now locked

| ID | Decision |
|---|---|
| Q1 | App name: `myNote` |
| Q2 | Default reminder lead: 1 day |
| Q3 | **Due todos show on the calendar** as derived all-day items (separate from `events`). Empty-day click still creates an event, not a todo. Checking off a todo does not delete it from the calendar until the due date is cleared or the todo is deleted. |
| Q4 | Timetable: 07:00–21:00, 60-minute slots, Mon–Sun |
| Q5 | Ungrouped notes allowed |
| Q6 | Delete group → ungroup notes |
| Q7 | Copy images into app data |
| Q8 | Windows `.exe` only |
| Q9 | Sidebar toggle: menu icon + `Ctrl+\` |
| Q10 | “Add new note” opens the editor immediately |

---

## 3. Architecture (what we will actually build)

```
Renderer (React UI)
    │  window.api.*  (typed preload bridge)
    ▼
Preload (contextBridge — no Node in the UI)
    │  ipcRenderer.invoke
    ▼
Main process (Electron)
    ├── SQLite (better-sqlite3)  →  userdata/app.db
    └── Image files              →  userdata/images/{id}.{ext}
```

**Rules that stay true for every phase:**

- The renderer never imports `fs`, `path`, or `better-sqlite3`. All I/O goes through IPC.
- Every mutating IPC handler writes to SQLite (and disk for images) **before** returning success.
- Auto-save is a renderer hook (`useAutosave`) that calls the same save IPC as Ctrl+S.
- `userdata/` lives under Electron `userData` (not inside the repo). The Settings page shows that path.

**Scaffold note:** electron-vite keeps renderer sources at `src/renderer/src/` (not `src/renderer/` as sketched in the PRD). Main and preload match the PRD.

---

## 4. Data model (implement in P2, freeze after P2)

### 4.1 Tables

**`app_settings`** (single row, `id = 1`)

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | Always 1 |
| `reminder_lead_days` | INTEGER | 1 or 2 |
| `home_photo_path` | TEXT NULL | Relative path under `userdata/images` |
| `home_photo_visible` | INTEGER | 0/1 |
| `updated_at` | TEXT | ISO timestamp |

**`note_groups`**

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `name` | TEXT UNIQUE | User-defined |
| `sort_order` | INTEGER | Sidebar order |
| `created_at` / `updated_at` | TEXT | ISO |

**`notes`**

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `title` | TEXT | Default `"Untitled"` |
| `content_json` | TEXT | BlockNote document JSON |
| `group_id` | TEXT NULL | FK `note_groups(id)` ON DELETE SET NULL |
| `cover_image_path` | TEXT NULL | Relative path |
| `created_at` / `updated_at` | TEXT | ISO |

**`todos`**

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `text` | TEXT | |
| `done` | INTEGER | 0/1 |
| `due_date` | TEXT NULL | `YYYY-MM-DD` |
| `sort_order` | INTEGER | |
| `created_at` / `updated_at` | TEXT | ISO |

**`events`**

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `title` | TEXT | |
| `event_date` | TEXT | `YYYY-MM-DD` (all-day in V1) |
| `reminder_enabled` | INTEGER | 0/1 |
| `created_at` / `updated_at` | TEXT | ISO |

**`timetable_entries`**

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `day_of_week` | INTEGER | 0=Monday … 6=Sunday (ISO-ish; document in schema comment) |
| `start_minutes` | INTEGER | Minutes from 00:00 |
| `end_minutes` | INTEGER | Must be > start |
| `title` | TEXT | e.g. class name |
| `location` | TEXT NULL | Optional |
| `updated_at` | TEXT | ISO |

**`reminder_dismissals`** (so a popup does not spam every launch the same day)

| Column | Type | Notes |
|---|---|---|
| `event_id` | TEXT PK | FK events ON DELETE CASCADE |
| `for_date` | TEXT | Local calendar date the popup was dismissed |
| `dismissed_at` | TEXT | ISO |

### 4.2 Images

- Store files as `{uuid}.{ext}` under `userdata/images/`.
- Database stores **relative** paths only (`images/{uuid}.png`).
- Deleting a note/cover/home photo deletes the file if nothing else references it.

---

## 5. IPC contract (typed in preload)

Expose a single `window.api` object. Do not add ad-hoc channels later.

| Channel | Direction | Used by |
|---|---|---|
| `settings:get` / `settings:update` | invoke | Settings, Home photo, Reminder lead |
| `groups:list` / `create` / `rename` / `delete` | invoke | Notes sidebar, Settings |
| `notes:list` / `get` / `create` / `update` / `delete` / `search` | invoke | Notes, Home recent |
| `notes:setCover` / `notes:clearCover` | invoke | NoteCover |
| `todos:list` / `create` / `update` / `delete` / `reorder` | invoke | Home TodoWidget |
| `events:list` / `get` / `create` / `update` / `delete` | invoke | Calendar, Home mini cal, Reminders |
| `events:listDueReminders` | invoke | App startup + daily check |
| `events:dismissReminder` | invoke | ReminderPopup |
| `timetable:list` / `upsert` / `delete` | invoke | TimetablePage |
| `images:saveFromPath` | invoke | Cover, inline, home photo (file picker in main) |
| `app:getUserDataPath` | invoke | Settings |
| `app:manualSave` | invoke | Ctrl+S (flush pending autosave + no-op if already persisted) |

All responses: `{ ok: true, data } | { ok: false, error: string }`. Renderer hooks throw or surface a toast on `ok: false`.

---

## 6. Cross-cutting Definition of Done (every feature)

Copied from PRD §9 — every phase gate includes these:

1. Matches this plan + PRD for that feature.
2. No console errors during the happy path and the documented edge cases.
3. At least one automated test for core logic.
4. If it saves, data survives quit + relaunch.
5. UI uses the design tokens (spacing 4/8/12/16/24, one accent, 1px borders).

---

## 7. Phases

### Phase 0 — Project scaffold

**Goal:** Empty Electron window that boots from TypeScript, with Tailwind and Vitest wired.

**Tasks**

1. Initialize `electron-vite` + React + TypeScript in this folder (keep `PRD.md` and this plan).
2. Add Tailwind with a small design token set in `tailwind.config.ts`:
   - colors: `bg`, `surface`, `border`, `text`, `textMuted`, `accent`
   - radius: `sm` / `md`
   - font: Inter (or system UI stack as fallback)
3. Add Vitest + Testing Library; `npm test` runs unit tests; renderer tests use jsdom.
4. Main process creates `userdata` dirs on first launch (`app.db` placeholder later).
5. README with `npm install`, `npm run dev`, `npm test`, `npm run build`.

**Files:** `package.json`, `tsconfig*.json`, `electron.vite.config.ts`, `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/main.tsx`, `src/renderer/App.tsx`, `tailwind.config.ts`, `src/renderer/index.css`

**Tests:** smoke test that a trivial util (e.g. `cn` / date format) runs under Vitest.

**Gate:** `npm run dev` opens a window. `npm test` is green. No extra pages yet.

---

### Phase 1 — App shell, navigation, design language

**Goal:** Five empty pages, collapsible sidebar, “+ Add new note” button (create can be stubbed until P3).

**Tasks**

1. `App.tsx` client-side page state (no React Router required): `home | notes | calendar | timetable | settings`.
2. `Sidebar.tsx`: links, collapse toggle (menu icon), collapsed icon-only mode.
3. Persistent “+ Add new note” near top of sidebar. Until P3, it can switch to Notes and log a stub.
4. Shared layout: left sidebar + main content with padding from the spacing scale.
5. Empty page shells with H1 matching PRD page names.

**Files:** `src/renderer/components/Sidebar.tsx`, `src/renderer/pages/*/…Page.tsx` (stubs), `src/renderer/types/index.ts`

**Tests:** Sidebar renders five destinations; clicking a link changes the active page (Testing Library).

**Gate:** You can navigate all five pages. Collapse works. Looks on-brand (light, sparse, 1px borders).

---

### Phase 2 — SQLite, schema, IPC skeleton, image storage

**Goal:** Real local database and a typed `window.api` that Settings can already query for the data path.

**Tasks**

1. Add `better-sqlite3` (native module — configure electron-vite / electron-builder for it).
2. Implement `src/main/db/schema.sql` exactly as §4.
3. `database.ts`: open DB in `app.getPath('userData')`, run migrations (version table or `PRAGMA user_version`).
4. Seed `app_settings` row. No default groups.
5. `imageStorage.ts`: copy file into `images/`, return relative path; delete unused files.
6. Preload: whitelist channels; export TypeScript `window.api` types.
7. Implement `settings:get`, `settings:update`, `app:getUserDataPath` first as the vertical slice.

**Files:** `src/main/db/*`, `src/main/ipc/*` (stubs returning `{ ok: false }` until filled), `src/main/storage/imageStorage.ts`, `src/preload/index.ts`

**Tests:** Node-side tests against a temp SQLite file: schema applies; settings round-trip; image copy writes a file.

**Gate:** Settings page can display the real userData path. Killing the app keeps the DB file.

**Risk:** `better-sqlite3` native rebuild on Windows. Budget time here; do not skip this gate.

---

### Phase 3 — Notes CRUD + BlockNote editor + cover + search + images

**Goal:** The hardest feature. A usable notes product even if other pages stay empty.

**Tasks**

1. IPC: `notes:*` and `images:saveFromPath`.
2. `useNotes.ts`: list, get, create, update, delete; debounce updates.
3. `NotesPage.tsx`: grid view first (list view toggle can be a small extra in this phase).
4. Double-click opens `NoteEditor.tsx` (full page or overlay — **recommend full page with back button**).
5. BlockNote: bold/italic/underline, headings, bullet/numbered lists, foldable headings/toggles, inline images.
6. Inline image upload: file picker in **main** (security), copy via `imageStorage`, insert BlockNote image block with `file://` or custom protocol.
7. **Custom `app-image://` protocol** in main so renderer can load local images without `webSecurity` holes. Do this before shipping images.
8. `NoteCover.tsx`: upload / replace / remove banner.
9. Title field above editor; empty title stores `"Untitled"`.
10. Search: SQL `LIKE` on title + `content_json` (good enough for V1).
11. `useAutosave.ts`: debounce 500–800ms on note updates; Ctrl+S flushes immediately.

**Files:** `notesHandlers.ts`, `NotesPage.tsx`, `NoteEditor.tsx`, `NoteCover.tsx`, `useNotes.ts`, `useAutosave.ts`

**Tests:**

- notes CRUD against temp DB
- search returns a note whose body matches
- autosave debounce: timer fires one update (fake timers)

**Gate:** Create, edit, format, fold a heading, add cover, search, delete. Quit and relaunch — note is intact including cover.

---

### Phase 4 — Note groups

**Goal:** Create / rename / delete groups; assign notes; filter list from sidebar.

**Tasks**

1. IPC `groups:*`. Delete policy = **Q6 default: SET NULL on notes**.
2. `NoteGroupList.tsx` on Notes page: All | Ungrouped | each group.
3. Note editor: group picker.
4. Settings: same group CRUD (reuse hook, two UIs).
5. Filter is client-side on already-fetched notes **or** `notes:list?groupId=` — prefer server filter for search+group together.

**Files:** `noteGroupsHandlers.ts`, `useNoteGroups.ts`, `NoteGroupList.tsx`, Settings groups section

**Tests:** Filter by group returns only those notes; deleting a group leaves notes with `group_id = null`.

**Gate:** Groups work from Notes and Settings. “Add new note” can optionally inherit the currently selected group.

---

### Phase 5 — To-do widget (data + Home partial)

**Goal:** Todos persist; widget is usable even before the rest of Home exists.

**Tasks**

1. IPC `todos:*` including toggle `done` and optional `due_date`.
2. `TodoWidget.tsx` on Home: add, check, delete.
3. `useTodos.ts`.
4. Temporary: mount widget on Home stub.

**Tests:** Toggle done persists; list order stable after reload.

**Gate:** Add/check/delete/reopen. Optional due date shows on the row.

---

### Phase 6 — Calendar + event modal + in-app reminders

**Goal:** Month calendar, CRUD events, reminder popup 1–2 days before (app must be open).

**Tasks**

1. IPC `events:*`, `listDueReminders`, `dismissReminder`.
2. FullCalendar month view in `CalendarPage.tsx`.
3. Click empty day → `EventModal` create; click event → edit/delete.
4. Fields: title, date, reminder toggle.
5. Reminder logic (pure function, easy to test):

   ```
   due if reminder_enabled
     AND today >= event_date - lead_days
     AND today <= event_date
     AND not dismissed for today's local date
   ```

6. `ReminderPopup.tsx` on app load and on a timer (every 15–30 min while running) + when returning to foreground.
7. `useEvents.ts`.
8. Mini calendar on Home can wait until P8, but the same `list` API is used.
9. Calendar also loads todos that have `due_date` as a second FullCalendar source (distinct styling, e.g. muted/checkbox look). Clicking a todo item does not open EventModal — it is display-only on Calendar in V1 (edit on Home). Empty-day click still creates an **event**.

**Files:** `calendarHandlers.ts`, `CalendarPage.tsx`, `EventModal.tsx`, `ReminderPopup.tsx`, reminder util + test

**Tests:** Pure reminder function: 2-day lead, event in 2 days → due; event in 3 days → not due; dismissed today → not due; event yesterday → not due.

**Gate:** Create event with reminder, set lead to 1 day in DB, launch “today” with mocked clock in unit tests. Manual: create event tomorrow with reminder, see popup.

---

### Phase 7 — Timetable

**Goal:** Persistent weekly grid, not date-tied.

**Tasks**

1. IPC `timetable:*`.
2. Grid UI: days as columns, time slots as rows (defaults from **Q4**).
3. Click slot → set title (and optional location); click existing → edit/delete.
4. Overlap: V1 **reject overlap** on the same day (simpler than stacking).

**Files:** `timetableHandlers.ts`, `TimetablePage.tsx`, `useTimetable.ts`

**Tests:** Upsert two overlapping slots on Monday fails; non-overlap succeeds; data reloads.

**Gate:** Fill a week, quit, relaunch, grid matches.

---

### Phase 8 — Home page assembly

**Goal:** Daily overview as specified.

**Tasks**

2. Mini calendar: upcoming 7 days of **events and due todos**.
2. Photo: pick image via main, save path in `app_settings`, hide/show toggle without deleting the file.
3. Recent note click → Notes page in that note’s editor.
4. Mini calendar click on a day with events → Calendar page focused on that month (nice-to-have: open EventModal).

**Files:** `HomePage.tsx`, `MiniCalendarWidget.tsx`, `RecentNotesWidget.tsx`, `PhotoWidget.tsx`

**Tests:** Recent notes order by `updated_at`; photo hidden flag persists.

**Gate:** Home is useful as a morning dashboard. Hide photo, relaunch, still hidden.

---

### Phase 9 — Settings page (complete)

**Goal:** Groups (already from P4), reminder lead time, data location.

**Tasks**

1. Radio or select: 1 day vs 2 days; writes `app_settings`.
2. Show `app:getUserDataPath` as read-only + “Open folder” via `shell.openPath`.
3. Group management UI if not already complete.

**Tests:** Updating lead days changes `listDueReminders` results in DB tests.

**Gate:** Changing lead time is visible on next reminder check without a full reinstall.

---

### Phase 10 — Auto-save / manual save polish + global UX

**Goal:** Every entity auto-saves; Ctrl+S is a peace-of-mind flush.

**Tasks**

1. Apply `useAutosave` (or equivalent) to notes, events modal, todos, timetable cells, settings.
2. Global Ctrl/Cmd+S: flush pending debounce; optional subtle “Saved” indicator (no toast spam).
3. Unsaved indicator only if debounce is pending.
4. Sidebar “Add new note” creates a real note and opens the editor (**Q10**).

**Tests:** Ctrl+S path calls update once; rapid typing does not write on every keystroke.

**Gate:** Type in a note, wait, kill app without Ctrl+S, content still there.

---

### Phase 11 — Packaging, icon, final DoD pass

**Goal:** Installable Windows build; app icon; walk the PRD as a user.

**Tasks**

1. `electron-builder` Windows NSIS (or portable) target (**Q8**).
2. App icons in `assets/icons`.
3. Production `app-image://` protocol + asar unpack for `better-sqlite3`.
4. Manual DoD checklist (appendix A) on a clean machine profile / extra Windows user if possible.
5. Stretch (not required): dark mode.

**Gate:** Installed `.exe` creates DB on first run, all five pages work, no console errors on the happy path.

---

## 8. Dependency graph (do not reorder casually)

```
P0 Scaffold
 └─ P1 Shell
      └─ P2 Database + IPC
           ├─ P3 Notes ────────────┐
           │    └─ P4 Groups       │
           ├─ P5 Todos             ├─ P8 Home
           ├─ P6 Calendar/Reminders┤
           └─ P7 Timetable         │
                P4 + P6 ───────────┴─ P9 Settings (lead time needs P6)
                                      └─ P10 Save polish
                                           └─ P11 Package
```

P5 / P6 / P7 can proceed **in parallel after P2** if you want, but P3 should stay first among product features because it de-risks BlockNote + image protocol.

---

## 9. Test map (minimum — PRD “lightweight safety net”)

| Area | Must-have automated test |
|---|---|
| Settings | get/update round-trip on temp DB |
| Notes | create/update/delete; search by content |
| Autosave | debounce coalesces writes |
| Groups | filter; delete group ungroups notes |
| Todos | toggle done persists |
| Reminders | lead-time window + dismissal |
| Timetable | overlap rejected |
| Home | recent notes sorted by `updated_at` |

Put tests next to the code (`useAutosave.test.ts`, `reminderWindow.test.ts`, `db.notes.test.ts`).

---

## 10. Risks and how we handle them

| Risk | Mitigation |
|---|---|
| `better-sqlite3` native build fails on Windows | Prove in **P2**. Alternative fallback: `sql.js` (WASM) only if native is blocked — slower, but unblocks. Prefer native. |
| BlockNote + Electron file images | Custom protocol in **P3**, not `webSecurity: false`. |
| FullCalendar React 18/19 + Vite bundling | Spike inside **P6** day 1; if blocked, month grid can be a simple CSS grid for V1. |
| Autosave races (quit mid-debounce) | `beforeunload` / `window.onbeforeunload` + main `close` handler flush in **P10**; implement a “pending saves” registry in P3. |
| Scope creep from V2 list | If a request is in PRD § “deferred”, park it. Do not start it in V1 phases. |

---

## 11. What we will not build in this plan (PRD V2)

Video/audio in notes, tables/drawing/code blocks, pin/favorite, version history, note lock, sync, export, collaboration, OS notifications when closed, multi-wallpaper, recurring calendar events, dark mode (stretch only), assessment vs event colors.

---

## 12. Review checklist (you)

Please mark each item:

- [x] Phase order is acceptable (Notes before Calendar/Home)
- [x] Q1–Q10 locked (see §2) — due todos **do** show on the calendar
- [x] Delete-group behavior (ungroup notes) is OK
- [x] Timetable 07:00–21:00 hourly Mon–Sun is OK
- [x] Windows-only installer for first package is OK
- [x] All-day events (no start/end time) on calendar is OK for V1
- [x] Full-page note editor (not a modal) is OK
- [x] Implementation starts at Phase 0 after these locks

---

## Appendix A — Manual QA script (run at P11)

1. Fresh install / delete `userData` folder once.
2. Create two groups, three notes (one ungrouped), covers, inline image, fold a heading.
3. Search by a word that exists only in the body.
4. Add todos including one with a due date; check one off; relaunch.
5. Create an event today+1 with reminder on; set lead to 1 day; relaunch; expect popup; dismiss; relaunch same day; no popup.
6. Fill timetable Mon 09:00–10:00; attempt overlap; expect rejection.
7. Home: recent notes jump to editor; hide photo; relaunch.
8. Settings: path opens in Explorer; change lead to 2 days.
9. Ctrl+S on a note; kill app during typing after wait >1s; content kept.
10. Sidebar collapse; Add new note from Calendar page.

---

*Next step after you approve: Phase 0 scaffold in this folder.*
