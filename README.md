# myNote

Personal desktop app for notes, calendar, to-dos, and a weekly timetable. All data stays on this computer.

## Requirements

- Node.js 20+ (22/24 is fine)
- Windows for the V1 installer later; `npm run dev` works during development

## Start the app (Windows)

After a package build you can double-click **myNote.exe** — no terminal needed.

```bash
npm run package:exe
```

That creates:

- `dist/win-unpacked/myNote.exe` — double-click this anytime
- `dist/myNote-setup.exe` — installer (desktop + Start Menu shortcuts)

A **myNote** shortcut is also placed on your Desktop and in this project folder.

Rebuild with `npm run package:exe` after code changes if you want the .exe to pick them up. Use `npm run dev` while actively developing (hot reload).

## Commands

```bash
npm install
npm run dev
npm test
npm run typecheck
npm run build
npm run package:exe
```

## Data location

On first launch the app creates folders under Electron’s user data directory (not inside this repo):

- Windows: `%APPDATA%\myNote\` (exact path is shown later on the Settings page)
- `images\` for uploaded photos

The SQLite file (`app.db`) is added in Phase 2.

## Docs

- `PRD.md` — product requirements
- `DEVELOPMENT_PLAN.md` — phased build plan
