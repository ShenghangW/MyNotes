# myNote

A free, local-first desktop app for notes, to-dos, a calendar and a weekly timetable. Inspired by Notion, but everything stays on your own computer: no account, no cloud, no subscription.

> **Status: in active development.** The app shell, local database and installer packaging are working. The note editor, to-do list, calendar and timetable pages are being built step by step. See the [Roadmap](#roadmap). Full requirements are in the [PRD](./PRD.md).

## Planned features

| Feature | What it does |
| --- | --- |
| **Block-based notes** | A Notion-style editor with headings, lists and formatting |
| **Foldable sections** | Collapse and expand headings to keep long notes tidy |
| **Auto-save + manual save** | Changes are saved in the background, or on demand |
| **7-day timetable** | Plan your week as time blocks across seven days |
| **To-do list** | Add, tick off and remove tasks |
| **Calendar** | Events with optional reminders |
| **Local only** | All data is stored on your computer in a SQLite file |

## Screenshots

_Coming soon._

## Quick start

Requires [Node.js](https://nodejs.org) 22 or newer.

```bash
git clone https://github.com/ShenghangW/myNote.git
cd myNote
npm install
npm run dev
```

To build a Windows installer: `npm run build:win`

## Tech stack

- **Electron** for the desktop app
- **React + TypeScript + Tailwind CSS** for the interface
- **BlockNote** for the rich-text editor
- **SQLite** (via sql.js) for local storage
- **Vitest + React Testing Library** for automated tests
- **GitHub Actions** for continuous integration (lint, type-check, test and build on every push)

## Project structure

```
myNote/
├── src/
│   ├── main/        # Electron main process: database, storage, IPC handlers
│   ├── preload/     # Safe bridge between main process and UI
│   ├── renderer/    # React interface: pages, components
│   └── shared/      # Types shared by both sides
├── .github/         # CI workflow
├── PRD.md           # Product requirements
└── electron-builder.yml
```

## Documentation

- [Product Requirements Document (PRD)](./PRD.md): what myNote is for, the features planned, design language, testing standards and tech stack.

## Roadmap

- [x] App shell with sidebar navigation (Home, Notes, Calendar, Timetable, Settings)
- [x] Local SQLite database with schema and settings
- [x] Image storage
- [x] Automated tests (Vitest)
- [x] Windows installer packaging
- [ ] GitHub Actions CI
- [ ] Notes: create, edit, delete
- [ ] Block editor with foldable headings
- [ ] Auto-save and manual save
- [ ] 7-day timetable
- [ ] To-do list
- [ ] Calendar with reminders

## Development

```bash
npm run lint        # code style
npm run typecheck   # type checking
npm test            # automated tests
npm run build       # production build
```

## License

MIT
