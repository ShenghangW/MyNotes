# myNotes

A free, local-first note-taking and planning app that runs on your own computer. Think of it as a lightweight Notion for localhost: write Markdown notes, fold sections away, plan your week on a 7-day timetable, and tick off a to-do list. No account, no cloud, no subscription.

> **Status: in active development.** The design and project structure are in place and features are being built step by step. See the [Roadmap](#roadmap) for what is done and what is next.

## Why this project

Most note apps want an account, an internet connection or a paid plan. myNotes keeps everything on your machine, so it is fast, private and always available. It is also my hands-on project for practising full-stack development, automated testing and CI.

## Features

| Feature | What it does |
| --- | --- |
| **Markdown notes** | Write in Markdown, see it formatted as you type |
| **Foldable sections** | Collapse and expand headings to keep long notes tidy, like Notion |
| **Auto-save** | Changes are saved in the background while you type |
| **Manual save** | Save on demand (Ctrl/Cmd + S) for peace of mind |
| **7-day timetable** | Plan your week as time blocks across seven days |
| **To-do list** | Add, tick off and remove tasks |
| **Local only** | Runs on `localhost`, data stays on your computer |

## Screenshots

_Coming soon._

## Quick start

Requires [Node.js](https://nodejs.org) 20 or newer.

```bash
git clone https://github.com/ShenghangW/myNotes.git
cd myNotes
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Tech stack

- **React + TypeScript** for the interface
- **Markdown** for note content
- **SQLite** for local storage
- **Vitest + Testing Library** for tests
- **GitHub Actions** for continuous integration (lint, type-check and tests on every push)

## Project structure

```
myNotes/
├── src/          # React pages, components and editor
├── server/       # Local storage and save logic
├── tests/        # Unit and component tests
├── docs/         # Requirements and design notes
└── .github/      # CI workflow
```

## Roadmap

- [x] Project setup and design
- [ ] Notes: create, edit, delete
- [ ] Markdown editor
- [ ] Foldable headings
- [ ] Auto-save and manual save
- [ ] 7-day timetable
- [ ] To-do list
- [ ] GitHub Actions CI pipeline
- [ ] Backup and export

## Development

```bash
npm run lint        # code style
npm run typecheck   # type checking
npm test            # tests
npm run build       # production build
```

## License

MIT
