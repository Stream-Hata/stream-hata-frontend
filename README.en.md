# Nameless StreamHata

[Русская версия](README.md)

**Nameless StreamHata** is an open-source Twitch streamer panel, OBS widget suite and desktop client. It brings the game catalog, roulette, points, chat jury, moderation, donations, music, notifications and local system metrics into one streamer workspace.

Current version: **0.6.23-pre-alpha**. The project is in active development.

## Contents

- [What it is](#what-it-is)
- [Who it is for](#who-it-is-for)
- [Features](#features)
- [How it works](#how-it-works)
- [Quick start](#quick-start)
- [Commands](#commands)
- [Project structure](#project-structure)
- [Desktop and OTA](#desktop-and-ota)
- [Security](#security)
- [Development](#development)
- [Documentation](#documentation)
- [Repositories](#repositories)

## What it is

StreamHata is more than a stats page. It is a working panel that:

- receives Twitch events through the backend;
- stores channel settings, games, points, donations and widgets;
- serves OBS overlays as regular Browser Sources;
- controls OBS over WebSocket;
- runs as a Tauri desktop app with native system access.

StreamHata does not replace OBS. OBS handles scenes, audio and recording; StreamHata manages data, overlays and automation.

## Who it is for

- Twitch streamers who want one panel instead of a dozen tabs;
- small channels and community projects;
- event, tournament and giveaway hosts;
- developers who want to extend an open project.

## Features

### Streamer panel

- Dashboard with channel, stream, events and quick actions.
- Event feed: followers, subscriptions, gifts, raids, donations, rewards.
- Notifications and per-type settings.
- Profile, roles, Steam library and achievements.

### Games and catalog

- Game catalog with search, filters, platforms, tiers and emulators.
- Import from RAWG, IGDB and Steam.
- Background enrichment from external sources.
- Steam avatar and profile data in desktop.
- Public pages for games, suggestions and events.

### Stream and OBS

- OBS WebSocket connection.
- Scenes, audio inputs, mute/unmute.
- Start/stop stream and recording, save replay buffer.
- Channel info, stream title and game.
- Timer, alerts and events.

### Community

- Chat jury: viewer voting and AI verdict.
- Vote commands are configurable: defaults are `!yea` and `!nei`; plain `yea`/`nei` messages and emotes also count.
- Points, rewards, polls, predictions and chat commands.
- Moderation: filters, rules and AI checks.
- Raids, achievements and watch streaks.

### Donations, music and TTS

- Donations via DonationAlerts and other providers.
- Donation card, table, goal and sound.
- Donation TTS: Groq for English, Google TTS for Russian with caching.
- Music queue, now-playing track and playback control.

### Widgets and overlays

- Hotbar, Roulette, Chat Jury, Timer, Alerts, Event List, Audio, System.
- Enable/disable, configure and copy Browser Source URLs.
- Local System widget: CPU, GPU, memory, network, processes, disks.
- System metrics overlay: `http://127.0.0.1:17890/`.

### Desktop client

- Tauri 2 + Rust.
- Tray, splash, single instance and close-to-tray.
- Browser login with token stored in OS keychain.
- Native terms and changelog dialogs.
- System notifications and OTA updates.
- Background and manual update checks with download/install progress.
- Floating search/profile dock.
- Idle cat reminder: animated SVG, voice, three stages and a tray icon.

## How it works

```text
Twitch / Steam / RAWG / IGDB / OBS
                  │
                  ▼
        Go backend (API, OAuth, EventSub, IRC)
                  │  PostgreSQL + OpenBao
                  ▼
     Angular panel ───────────────► OBS Browser Source
                  │                     (widgets)
                  ▼
          Tauri desktop
   (Rust: window, tray, keychain,
    notifications, metrics, OTA)
```

- **Frontend** — Angular 22 and Taiga UI 5.
- **Backend** — Go: Twitch OAuth, EventSub/IRC, catalog, points, donations, music, widgets.
- **PostgreSQL** — data and settings.
- **OpenBao** — server secrets.
- **OBS** — opens widget URLs as Browser Sources.
- **Tauri** — desktop shell, native commands and updates.

## Quick start

### Requirements

- Node.js 20+;
- pnpm 11+;
- desktop: Rust and a system WebView;
- backend: Go, PostgreSQL, OpenBao.

### Frontend

```bash
pnpm install
pnpm start
```

Open `http://localhost:4200/`.

### Build

```bash
pnpm build
```

Output: `dist/nameless-streamhata/browser`.

### Desktop

```bash
git clone https://github.com/Stream-Hata/streamhata-desktop.git
cd streamhata-desktop
cargo build --release
```

Linux: WebKitGTK 4.1. Windows: WebView2 and MSVC.

### Backend

```bash
git clone https://github.com/Stream-Hata/nameless-streamhata-backend.git
cd nameless-streamhata-backend
go build ./...
```

Database and OpenBao settings come from the environment; secrets are never committed.

## Commands

| Command         | Purpose             |
| --------------- | ------------------- |
| `pnpm start`    | Angular dev server  |
| `pnpm build`    | Production build    |
| `pnpm watch`    | Build in watch mode |
| `pnpm test`     | Unit tests          |
| `pnpm lint`     | ESLint              |
| `pnpm lint:fix` | ESLint with autofix |

## Project structure

```text
src/
  app/
    components/
      layout/        # shell, sidebar, search, dock
      pages/         # panel and public pages
      widgets/       # widgets and previews
      overlays/      # OBS overlays
      ui/            # shared UI, including the cat
    guards/          # desktop and landing guards
    services/        # state and API clients
  styles.scss
shared/
  services/          # HTTP services
  types/             # shared types
  components/        # shared components
@app/styles/         # Taiga UI theme and design tokens
public/              # static files, changelog, terms
docs/                # user documentation
scripts/             # version.json/changelog.json generation
```

## Desktop and OTA

The desktop client is built from a separate repository. OTA uses:

- GitHub Releases;
- `latest.json` in the release;
- minisign signatures for artifacts;
- fallback to `https://streamhata.rdpctd.dev/desktop/latest.json`.

Updates are checked on startup and every 30 minutes. A notification appears only when the artifact is actually downloadable. Installation requires confirmation, shows steps and progress, then restarts the app.

## Security

- Twitch passwords are entered only on Twitch.
- Desktop tokens are stored in the OS keychain.
- Server secrets live in OpenBao.
- Never publish webhook URLs, bot tokens or OAuth secrets.
- Verify game and ROM sources; some content may violate local law.
- If a token may be stolen, revoke Twitch sessions and change passwords.

## Development

- Commits use Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`).
- Before a PR: `pnpm lint`, `pnpm test`, `pnpm build`.
- Discuss large changes in an issue first.
- Desktop changes are tested in `streamhata-desktop`.
- Backend changes live in `nameless-streamhata-backend`.

## Documentation

- [User guide (Russian)](docs/USER_GUIDE.md)
- [Hotbar and games API](docs/API_HOTBAR_GAMES.md)
- [Russian README](README.md)

## Repositories

- Frontend: https://github.com/Stream-Hata/stream-hata-frontend
- Desktop: https://github.com/Stream-Hata/streamhata-desktop
- Backend: https://github.com/Stream-Hata/nameless-streamhata-backend

## Status

`pre-alpha`. APIs, UI and data formats may change. Back up settings and check updates before production use.
