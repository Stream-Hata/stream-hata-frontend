# API contract: hotbar, games catalog, roulette, event inventory

Status: draft for approval. Backend: `../rgg-inv-go-backend`. Frontend consumes `/rgg-sync/*` through the dev proxy.

## 1. Principles

- One channel per installation. No multi-tenant identifiers in public routes.
- `YAML` is the versioned seed and export format. `Postgres` is the runtime source of truth for catalog, moderation, history and channel state.
- The server decides roulette outcomes and stores history. Clients only animate and render state.
- Sensitive values (tokens, webhook URLs, passwords) are never indexed by search and never returned in public search results.
- All list endpoints are paginated and support server-side search/filtering.
- Images are stored as URLs. The backend proxies or caches remote images when a source requires it.

## 2. Shared types

```ts
type GameTier = 'none' | 'gold' | 'diamond' | 'platinum';
type GameAge = 'classic' | 'retro' | 'modern' | 'new';
type CatalogStatus = 'seed' | 'pending' | 'approved' | 'rejected' | 'merged';

interface PlatformRef {
  code: string;
  name: string;
  icon: string;
  maintainer: string;
}

interface EmulatorLink {
  name: string;
  url: string;
  platforms: string[];
  os: Array<'windows' | 'macos' | 'linux' | 'android' | 'ios'>;
  free: boolean;
  note?: string;
}

interface GameSource {
  id: string;
  name: string;
  url: string;
  externalId?: string;
  importedAt: string;
}

interface Game {
  id: string;
  slug: string;
  title: string;
  originalTitle?: string;
  aliases: string[];
  year?: number;
  releaseDate?: string;
  platforms: PlatformRef[];
  genres: string[];
  modes: string[];
  perspectives: string[];
  themes: string[];
  developers: string[];
  publishers: string[];
  description: string;
  cover?: string;
  screenshots: string[];
  tier: GameTier;
  age: GameAge;
  status: CatalogStatus;
  emulatorsRequired: boolean;
  emulators: EmulatorLink[];
  sources: GameSource[];
  rating?: number;
  aggregatedRating?: number;
  completion?: {
    hastilyHours?: number;
    normallyHours?: number;
    completelyHours?: number;
  };
  dlc: string[];
  editions: string[];
  mods: string[];
  website?: string;
  createdAt: string;
  updatedAt: string;
}
```

## 3. Catalog endpoints

### `GET /rgg-sync/games`

Query:

```text
q, platform, tier, age, emulator=true|false, yearFrom, yearTo, status=approved,
sort=title|year|tier|rating|updated, order=asc|desc, page, pageSize
```

Response:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "pageSize": 24,
  "facets": {
    "platforms": [{ "code": "ps1", "name": "PlayStation", "count": 120 }],
    "tiers": [{ "value": "gold", "count": 42 }],
    "ages": [{ "value": "retro", "count": 80 }]
  }
}
```

### `GET /rgg-sync/games/:slug`

Returns `Game`.

### `GET /rgg-sync/games/search`

Fast typeahead for global search and the games page.

```text
q, limit=8, platforms, tiers
```

Response:

```json
{ "items": [{ "id": "", "slug": "", "title": "", "year": 1998, "cover": "", "tier": "gold", "platforms": [] }] }
```

### `GET /rgg-sync/platforms`

Returns the platform catalog from `platforms.yaml`, grouped by maintainer, with optional `gamesCount`.

### `GET /rgg-sync/emulators`

Returns `EmulatorLink[]`. The frontend derives the “emulator required” label from the selected platforms.

### Admin / moderation

```text
POST   /rgg-sync/games/submissions
GET    /rgg-sync/games/submissions?status=pending
PATCH  /rgg-sync/games/submissions/:id   { status, tier, mergedInto }
POST   /rgg-sync/games/import            { source, url?, dryRun }
POST   /rgg-sync/games/export            { format: "yaml" }
PATCH  /rgg-sync/games/:id               partial Game fields
DELETE /rgg-sync/games/:id
```

Import is idempotent by `(source.id, externalId)` and falls back to `slug + platform`. Ambiguous duplicates go to `status=pending` and require manual merge.

## 4. Hotbar

### Config (stored through the existing widget config API)

```ts
interface HotbarConfig {
  slots: string[];          // exactly 10 platform codes, unique, ordered
  showTimer: boolean;
  showSettings: boolean;
  iconSize: 's' | 'm' | 'l';
  gap: number;
  background: string;
  labelColor: string;
  emptySlotColor: string;
}
```

### Endpoints

```text
GET  /rgg-sync/widgets/hotbar/config
PUT  /rgg-sync/widgets/hotbar/config
GET  /rgg-sync/hotbar/state
PUT  /rgg-sync/hotbar/slots        { slots: string[] }
```

`GET /rgg-sync/hotbar/state` returns slots plus `completedGamesCount` per platform.

### Overlay

`/overlay/hotbar` renders the 10 slots. The existing `app-platform-bar` becomes the shared renderer for panel, preview and overlay.

## 5. Roulette

### Modes

```ts
type RouletteMode = 'classic' | 'cat-bag' | 'elimination';
```

- `classic` — one server-selected game from the filtered pool.
- `cat-bag` — one random platform + one game from that platform; reveal shows cat, game and platform.
- `elimination` — repeated draws without replacement until the pool is empty; history stores the order.

### Config

```ts
interface RouletteConfig {
  mode: RouletteMode;
  filters: {
    platforms: string[];
    tiers: GameTier[];
    ages: GameAge[];
    emulator?: boolean | null;
    yearFrom?: number;
    yearTo?: number;
  };
  weights: {
    tiers: Record<GameTier, number>;
    platforms: Record<string, number>;
    games: Record<string, number>;
  };
  avoidRecent: number;
  seed?: string;
  appearance: {
    background: string;
    accent: string;
    text: string;
    fontFamily: string;
    fontUrl: string;
    scale: number;
  };
  audio: {
    spinUrl: string;
    revealUrl: string;
    volume: number;
  };
  reveal: {
    durationSeconds: number;
    showCat: boolean;
    catImage: string;
    titleTemplate: string;
  };
}
```

### Endpoints

```text
GET  /rgg-sync/roulette/config
PUT  /rgg-sync/roulette/config
GET  /rgg-sync/roulette/state
POST /rgg-sync/roulette/spin          { mode }
POST /rgg-sync/roulette/reset
GET  /rgg-sync/roulette/history?limit=50
POST /rgg-sync/roulette/eliminate     { gameId }
```

`POST /spin` response:

```json
{
  "roundId": "uuid",
  "mode": "classic",
  "platform": { "code": "ps1", "name": "PlayStation" },
  "game": { "slug": "metal-gear-solid", "title": "Metal Gear Solid", "cover": "" },
  "createdAt": "2026-01-01T00:00:00Z"
}
```

Server behavior:

- Applies filters, removes recent games (`avoidRecent`), multiplies weights; zero-weight games are excluded.
- If the pool is empty, returns `409` with `{"error":"empty pool"}`.
- Records the round before returning, so overlay and panel see the same result.
- SSE/polling exposes the round id and reveal timestamps.

## 6. Events and inventory

### Event config (`events.yaml` in the backend)

```yaml
events:
  - id: rgg
    name: RGG
    enabled: true
    baseUrl: https://rgg.land
    auth:
      type: bearer
      tokenEnv: RGG_EVENT_TOKEN
    endpoints:
      participant: /api/participants/{login}
      inventory: /api/inventory/{login}
      games: /api/games/{login}
    mapping:
      coins: coins
      tears: tears
      items: inventory
      plays: games
  - id: example
    name: Example Event
    enabled: false
    baseUrl: https://example.com
    auth:
      type: header
      header: X-Api-Key
      keyEnv: EXAMPLE_EVENT_KEY
    endpoints:
      participant: /v1/users/{login}
      inventory: /v1/users/{login}/inventory
    mapping:
      coins: balance
      tears: currency.tears
      items: items
```

### Endpoints

```text
GET  /rgg-sync/events/config
PUT  /rgg-sync/events/config
GET  /rgg-sync/event/state
GET  /rgg-sync/event/inventory
POST /rgg-sync/event/refresh
```

`GET /rgg-sync/event/state`:

```json
{
  "mode": "event",
  "eventId": "rgg",
  "participant": true,
  "login": "streamer",
  "coins": 0,
  "tears": 0,
  "items": [],
  "updatedAt": "2026-01-01T00:00:00Z"
}
```

Mode is `event` when the streamer is found in any enabled event source, otherwise `solo`. In `solo` the inventory widget is disabled.

## 7. Global search

### `GET /rgg-sync/search?q=&scope=&limit=`

`scope` is a comma-separated list: `pages,settings,widgets,games,commands,events,donations,viewers,chat,inventory`.

Response:

```json
{
  "groups": [
    {
      "group": "games",
      "items": [
        {
          "id": "metal-gear-solid",
          "type": "game",
          "title": "Metal Gear Solid",
          "subtitle": "1998 · PlayStation",
          "link": "/app/games/metal-gear-solid",
          "thumbnail": "",
          "score": 0.98,
          "highlight": "Metal Gear Solid"
        }
      ]
    }
  ],
  "tookMs": 12
}
```

- Games are searched with Postgres FTS + trigram over `title`, `originalTitle`, `aliases`, `genres`, `developers`, `publishers`.
- UI features (pages, settings, widgets) come from a static client index; the backend endpoint merges them when `scope` includes them.
- Sensitive fields are excluded at the index level.
- Search history is client-local by default; optional server storage per channel.

## 8. Realtime

Polling is acceptable for the first version. The preferred contract also exposes SSE:

```text
GET /rgg-sync/events
event: roulette
data: { roundId, mode, game, platform, revealedAt }
event: event-mode
data: { mode, eventId, coins, tears }
event: hotbar
data: { slots }
```

## 9. MVP order

1. Platform catalog and hotbar slots (unique, drag&drop, overlay).
2. Games catalog schema + YAML seed + list/detail/search UI.
3. Roulette classic + cat-bag + elimination with server-side selection.
4. Event config, participant detection, inventory widget.
5. Moderation/import jobs and full search indexing.

## 10. Frontend routes

```text
/app/games              games list, search, filters
/app/games/:slug        game detail
/app/widgets/hotbar/config
/overlay/hotbar
/overlay/roulette
/overlay/inventory
/overlay/cat-bag
```
