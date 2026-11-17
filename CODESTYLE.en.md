# Code Style (CODESTYLE)

The style described here is derived from the actual conventions used in this project. Rules enforced by tooling (ESLint, Stylelint) are mandatory; everything else is a recommendation that should be followed for consistency.

> Russian version: [CODESTYLE.md](CODESTYLE.md)

## 1. Formatting (enforced)

| Rule                          | Value                                                 |
| ----------------------------- | ----------------------------------------------------- |
| Indentation in TS/JS          | **Tabs** (eslint: `indent: tab`)                      |
| Indentation in SCSS/HTML/JSON | 2 spaces                                              |
| Quotes                        | single (`'...'`)                                      |
| Semicolons                    | required                                              |
| Line width                    | max 120 (eslint `max-len`)                            |
| Encoding                      | UTF-8, LF line endings                                |

Configs: `eslint.config.js` (antfu), `.stylelintrc.json` (stylelint-config-standard-scss), `.editorconfig`.

## 2. Naming

- **Files and directories** — kebab-case: `platform-bar.ts`, `hotbar.store.ts`, `yaml-parser.service.ts` → but see the suffix note below: the type suffix goes in the class name, not the file name.
- **Classes** — PascalCase + type suffix (`addTypeToClassName` in `angular.json`):
  - component: `Hotbar`, `Timer`, `TimeRow`, `Hours`, `Minutes`, `Seconds`, `Settings`, `SettingsDropdown`, `PlatformMaintainer`, `PlatformBar`, `Slot`, `App`
  - store: `HotbarStore`, `SettingsStore`
  - service: `HotbarService`, `YamlParser`, `PlatformBar`
- **Variables/functions** — camelCase: `initialState`, `padded()`, `togglePlatform()`, `isSelected`.
- **Constants** — `SCREAMING_SNAKE_CASE`: `INITIAL_STATE`, `TUI_ICON_RESOLVER`.
- **Component files** — same-named `hotbar.ts` / `hotbar.html` / `hotbar.scss` / `hotbar.spec.ts` (no `.component` suffix).
- **Tests** — `*.spec.ts` next to the code.

## 3. Selectors

- **Components** — `app` prefix, kebab-case, `element` type: `app-hotbar`, `app-platform-bar`, `app-time-row`, `app-slot`.
- **Directives** — `app` prefix, camelCase, `attribute` type: `appPlatformGuard`, `appSlotIcon` (enforced by `@angular-eslint` rules in `eslint.config.js`).

## 4. Angular

- **Standalone components**: `imports` in the decorator, no NgModule.
- **Templates and styles** — external files: `templateUrl`, `styleUrl` (singular, Angular 22).
- **ChangeDetection** — `ChangeDetectionStrategy.OnPush` for components (set by the default schematic).
- **Signals**:
  - inputs: `readonly data = input.required<T>()`, `readonly hours = input.required<number>()`
  - local state: `signal`, `computed`
  - signals are read in templates by calling them: `mode()`, `time()`
- **DI** — the `inject()` function, not the constructor (constructor only for `effect()` etc.).
- **Leaks** — `takeUntilDestroyed(this.destroy)` with `DestroyRef`.
- **Typing** — `strict` mode, no `any` (unless unavoidable), `noImplicitReturns`, `noFallthroughCasesInSwitch`.

## 5. Stores (NgRx signalStore)

```ts
export const HotbarStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withHooks((state, ...) => ({ onInit: () => {...} })),
  withComputed((state) => ({ ... })),
  withMethods((state, ...) => ({ ... })),
);
```

- State is an `interface` + `initialState` next to the store.
- Mutations only via `patchState`.
- `withHooks` — data loading on `onInit`, with `takeUntilDestroyed`.
- File — `*.store.ts` in `src/app/store/`.

## 6. Services

- `@Injectable({ providedIn: 'root' })` (or Angular 22's `@Service({ autoProvided: true })`).
- HTTP services return `Observable` and never subscribe internally.
- Shared services live in `src/app/shared/services/` (e.g. `yaml-parser.ts`, `platform-bar.ts`).

## 7. Types

- **Types shared between the frontend and `backend/server.ts`** — in the root `shared/types/`: `AppState`, `TimerState`, `HotbarState`, `Time`.
- Utility types (e.g. `Default<Type, Field, Value>`) — also there.
- Layer-specific types — next to the code (interfaces in `hotbar.service.ts`, `yaml-parser.ts`).

## 8. RxJS

- Piping: `pipe(map(...), tap(...), takeUntilDestroyed(...))`.
- `switchMap` for switching streams (see `Timer.startTimer`).
- Streams named by purpose: `initialLoad()`, `updateState()`.
- No nested subscriptions in templates; subscriptions only with teardown.

## 9. Styles (SCSS)

- SCSS + custom Taiga UI theme in `@app/styles/taiga.scss` (shared styles live in `@app/styles/`).
- Shared style imports: `@use '@app/styles/mixins';` / `@import '@app/styles/taiga'` (includePaths `./` in `angular.json`).
- Global styles — `src/styles.scss`; component styles — in its `*.scss`.
- Taiga UI variables — via CSS variables `--tui-*`.
- Styling through classes (`:host`, `.chip`, `.row`), no inline styles in markup.
- Do not add redundant units; stick to existing patterns (the `expanded` mixin, the `pulse` animation).

## 10. HTML

- Indentation — 2 spaces, lines shorter than 100 characters.
- Angular control flow: `@if` / `@for` (new syntax); do not introduce `*ngIf` in legacy code.
- Single-tag buttons with attributes — follow the existing code format (`tuiButton`, `tuiIconButton`, `[iconEnd]`).

## 11. Tests

- Vitest, `*.spec.ts` next to the code.
- Setup — `TestBed.configureTestingModule({ imports: [...] })`.
- External dependencies (services, HTTP, third-party tokens) are mocked via providers (`provide: ..., useValue: ...`).
- Required signal inputs are set via `fixture.componentRef.setInput(...)`.
- A test should verify behaviour, not just "should create".

## 12. Misc

- **Comments** — in Russian, to the point; do not comment the obvious.
- **Unused imports** — forbidden (eslint-plugin-unused-imports); import sorting follows the antfu convention.
- **Directory structure** — features in `src/app/components/<feature>/`, shared code in `src/app/shared/`, stores in `src/app/store/`.
- **Server** — `backend/server.ts` (Express, type stripping); changes to the `/rgg-sync` protocol go together with the types in `shared/types/`.

## 13. Pre-commit checks

```bash
npx eslint .                  # 0 errors
npx stylelint "**/*.scss"     # styles
pnpm test                     # unit tests
pnpm build                    # build
```

Linting and formatting of staged files run automatically via husky + lint-staged (see `package.json` → `lint-staged`).
