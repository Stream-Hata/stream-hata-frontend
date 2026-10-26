# Nameless StreamHata

Nameless StreamHata is a Twitch streamer panel and OBS widget suite: chat jury, points and games, moderation, donations, music, alerts and integrations.

Full Russian guide: [GUIDE.md](./GUIDE.md).

- Frontend: https://github.com/p7x-dev/nameless-streamhata
- Backend: https://github.com/p7x-dev/nameless-streamhata-backend

> Russian version: [README.md](README.md) · Contributing: [CONTRIBUTING.en.md](CONTRIBUTING.en.md) · code style: [CODESTYLE.en.md](CODESTYLE.en.md) · [CODE_OF_CONDUCT.en.md](CODE_OF_CONDUCT.en.md)

## Tech stack

- **Angular 22** — standalone components, signals (`signal`, `computed`, `input`)
- **@ngrx/signals** — stores (`signalStore`) for the hotbar and settings state
- **Taiga UI 5.x** — UI kit (buttons, dropdowns, icons)
- **Express 5 + cors + express-rate-limit** — local sync backend (`backend/server.ts`)
- **Luxon** — timer time handling
- **YAML** — parsing `public/platforms.yaml` (platform/manufacturer reference)
- **SCSS** — styles, custom dark Taiga UI theme in `@app/styles/taiga.scss`
- **Vitest** — unit tests, **ESLint** (@antfu/eslint-config), **Prettier**, **Stylelint**
- Package manager: **pnpm** (see `pnpm-workspace.yaml`, `packageManager` in `package.json`)

## Project structure

```
src/
  main.ts                         # entry point (bootstrapApplication)
  index.html
  styles.scss                     # global styles
  app/
    app.ts / app.html             # root component
    app.config.ts                 # providers (Taiga UI, HTTP, router)
    app.routes.ts
    components/                   # UI components
      hotbar/                     # hotbar: platforms + timer + settings
        platform-bar/             # row of selected platforms (slots)
        timer/                    # timer (hours/minutes/seconds, start/pause/reset)
      settings/                   # settings dropdown
        settings-dropdown/        # list of manufacturers
        platform-maintainer/      # platform picker for a specific manufacturer
    shared/
      components/slot/            # platform slot + directives (appPlatformGuard, appSlotIcon)
      helpers/is-overlay.ts       # transparent overlay mode
      services/
        hotbar.service.ts         # HTTP wrapper around /rgg-sync
        yaml-parser.ts            # parsing public/platforms.yaml
        platform-bar.ts           # selecting/deselecting platforms (via SettingsStore)
    store/
      hotbar.store.ts             # timer and hotbar state, backend sync
      settings.store.ts           # platforms loaded from YAML
shared/
  types/                          # shared types (AppState, TimerState, HotbarState)
@app/styles/                      # custom Taiga UI theme + SCSS mixins
server.ts                         # local Express /rgg-sync server
public/
  platforms.yaml                  # platform and manufacturer reference
  icons/platforms/                # platform SVG icons
proxy.conf.json                   # dev proxy (rgg.land, bot.rgg.land, rgg-sync)
```

## Installation

Requires Node.js and [pnpm](https://pnpm.io/):

```bash
pnpm install
```

## Running

### Angular dev server

```bash
pnpm start        # or pnpm ng serve
```

The app is available at `http://localhost:4200/` with hot reload. Proxying of external hosts is configured in `proxy.conf.json`:

- `/rgg-api` → `https://rgg.land`
- `/rgg-bot` → `https://bot.rgg.land` (including WebSocket)
- `/rgg-sync` → `http://127.0.0.1:3000` (local sync server)

### Local sync server

The state (timer, selected platforms) is stored on a local Express server:

```bash
node --experimental-strip-types server.ts
```

- `GET /rgg-sync` — get the current state (`AppState`)
- `POST /rgg-sync` — update the state (partial merge)
- Server listens on `127.0.0.1:3000`, rate limit 100 req/sec

> The server must be running for the hotbar to work: `HotbarService` loads the state on startup.

## Build

```bash
pnpm build                       # production build into dist/
pnpm watch                       # dev build with watch
```

## Tests

```bash
pnpm test                        # unit tests (Vitest)
```

## Linters and formatters

```bash
npx eslint .                     # ESLint (@antfu/eslint-config, tabs, single quotes, semicolons)
npx prettier --check .           # Prettier (printWidth: 100)
npx stylelint "**/*.scss"        # Stylelint (.stylelintrc.json)
```

## How it works

1. On startup `HotbarStore` loads the state via `GET /rgg-sync`.
2. `SettingsStore` parses `public/platforms.yaml` and groups platforms by manufacturer.
3. Platforms are picked in settings — `PlatformBar.toggleSelected()` updates the hotbar via `POST /rgg-sync`.
4. The timer (`Timer`) sends the current time to the server every second in `play`/`pause` mode, so the state survives page reloads.

## Adding a platform

1. Add an SVG icon to `public/icons/platforms/`.
2. Add an entry to `public/platforms.yaml` (name, code, icon) under the relevant manufacturer.
3. The icon is resolved from `icons/platforms/<icon-name>` (see `SlotIconDirective` / `TUI_ICON_RESOLVER` in `slot.ts`).
