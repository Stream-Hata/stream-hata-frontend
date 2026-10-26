# Nameless StreamHata

[Русская версия](README.md)

**Nameless StreamHata** is an open-source Twitch streamer panel and OBS widget suite. It brings game catalog, roulette, points, chat jury, moderation, donations, music, notifications and a desktop client into one workspace.

Current version: **0.6.0-pre-alpha**.

## Who it is for

- Twitch streamers who want one panel instead of a dozen tabs;
- small channels and community projects;
- streamers who want OBS overlays without manual frontend work;
- developers who want to extend an open project.

## Features

### Streamer panel

- Dashboard with channel, stream and recent activity.
- Events: followers, subscriptions, gifts, raids, donations and rewards.
- Notifications and desktop notification settings.

### Games and catalog

- Game catalog with search, filters, platforms, tiers and emulators.
- Import from RAWG, IGDB and Steam.
- Game details with cover, description, genres, sources and links.
- Background enrichment from external services.
- Steam avatar and profile in the desktop client.

### Stream and community

- Roulette and wheel with configurable pools and animation.
- Platform hotbar, timers and alerts.
- Points, rewards, polls and chat commands.
- Chat jury: viewer voting and AI verdict.
- Moderation: filters, rules and anti-spam actions.

### Donations, music and TTS

- Donations via DonationAlerts and other providers.
- Donation card, table, goal and sound.
- Donation TTS: Groq for English, Google TTS for Russian with caching.
- Music queue and now-playing track.

### OBS widgets

- Hotbar, Roulette, Chat Jury, Timer, Alerts, Event List, Audio and System.
- Enable/disable, configure and copy Browser Source URLs.
- Local System widget: CPU, GPU, memory, network, processes, uptime and disks.
- System metrics overlay at `http://127.0.0.1:17890/`.

### Desktop client

- Tauri 2: separate window, tray, splash and single instance.
- Browser-based login with token stored in OS keychain.
- Native terms and changelog dialogs.
- System notifications and auto-updates.
- Floating search/profile dock in the bottom-right corner.
- Windows/Linux builds.

## How it works

```text
Twitch / Steam / RAWG / IGDB
             │
             ▼
      Go backend (API, OAuth, EventSub, IRC)
             │  PostgreSQL + OpenBao
             ▼
   Angular panel  ──────────────►  OBS Browser Source
             │                         (widgets)
             ▼
      Tauri desktop
   (Rust: window, tray, keychain,
    notifications, metrics)
```

- **Frontend** uses Angular + Taiga UI for the panel and public pages.
- **Backend** on Go handles Twitch events, state, APIs and overlays.
- **OBS** opens a widget URL as a Browser Source; the panel controls its settings.
- **Desktop** on Tauri loads the same panel and adds native Rust-powered features.
- **Secrets** live in OpenBao and the OS keychain, never in the repository.

## Quick start

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

Requires Rust and a system WebView: WebKitGTK on Linux, WebView2 on Windows.

### Backend

The backend lives in `nameless-streamhata-backend` and requires PostgreSQL and OpenBao. Connection settings come from environment variables; secrets are never committed.

## Documentation

- [User guide (Russian)](docs/USER_GUIDE.md)
- [Hotbar and games API](docs/API_HOTBAR_GAMES.md)
- [Russian README](README.md)

## Repositories

- Frontend: https://github.com/Stream-Hata/stream-hata-frontend
- Desktop: https://github.com/Stream-Hata/streamhata-desktop
- Backend: https://github.com/Stream-Hata/nameless-streamhata-backend

## Status

The project is in active pre-alpha development. Some features and external integrations may change. Check for updates and back up your settings before production use.

## Contributing

Issues and pull requests are welcome. For large changes, open an issue first.
