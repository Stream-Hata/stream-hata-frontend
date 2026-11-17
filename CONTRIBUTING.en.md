# Contributing to RGG Inventory

Thanks for wanting to help with RGG Inventory. Below are the rules and guidelines for contributors.

> Russian version: [CONTRIBUTING.md](CONTRIBUTING.md). The full code style is described in [CODESTYLE.en.md](CODESTYLE.en.md). Expected participant behaviour is covered in [CODE_OF_CONDUCT.en.md](CODE_OF_CONDUCT.en.md).

## Getting started

1. Install Node.js (LTS) and [pnpm](https://pnpm.io/).
2. Clone the repository and install dependencies:

   ```bash
   git clone <repository-url>
   cd rgg-inv
   pnpm install
   ```

3. Run the app and the sync server (see the README, "Running" section).
4. Find a task: bugs, new platforms, UI improvements.

## Development rules

### Code style

- **TypeScript**, Angular standalone components, signals (`signal`, `computed`, `input`).
- Class names carry a type suffix (`HotbarStore`, `SettingsStore`, `PlatformBar`, `YamlParser`) — enforced by the schematics in `angular.json`.
- Component selectors: `app` prefix, kebab-case (`app-platform-bar`); directives — `app` + camelCase (`appPlatformGuard`).
- `ChangeDetectionStrategy.OnPush` for components where appropriate.
- Formatting: **tabs** in TS, 2 spaces in HTML/SCSS, single quotes, semicolons. Configured by ESLint/Stylelint — do not disable rules locally.
- State lives in `signalStore` (`apps/web/src/app/store/`), services in `packages/api/`.
- Shared types (`AppState`, `TimerState`, `HotbarState`) live in `packages/shared/types/` and are reused by both the frontend and `backend/server.ts`.
- Comments are in Russian (as in the existing code).

### Checks before committing

```bash
npx eslint .                  # lint without errors
npx stylelint "**/*.scss"     # styles
pnpm test                     # unit tests (Vitest)
pnpm build                    # build passes
```

If a lint rule can be fixed automatically:

```bash
npx eslint . --fix
```

### Components and code generation

Create files via the Angular CLI to follow the conventions (`angular.json` automatically adds type suffixes and `OnPush`):

```bash
npx ng g component componenents/foo/foo
npx ng g service services/foo
```

> Note: the project uses the `componenents` folder (with a typo) — follow the existing structure.

## Adding platforms

The platform reference is `packages/shared/data/platforms.yaml` (structure: `maintainer` → `platforms[]` with `name`, `code`, `icon` fields). Icons are SVGs in `apps/web/public/icons/platforms/`.

- Put the icon file name in the `icon` field (e.g. `ps1.svg`).
- The platform `code` is unique and used for matching against the hotbar.
- If there is no icon, use `icon: null` (as with PlayStation Vita).

## State sync

- `backend/server.ts` is the local server; when changing the `/rgg-sync` protocol, update the types in `packages/shared/types/`, `hotbar.service.ts` and `hotbar.store.ts` together.
- Do not add secrets/tokens to the code — the server must not depend on external credentials.

## Commits and PRs

- Working branch: `feature/<description>` or `fix/<description>`.
- Commits are small and atomic. The message must follow [conventional commits](https://www.conventionalcommits.org/) and is validated by commitlint on commit: `type(scope): subject` (e.g. `feat(hotbar): add platform slots`). Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- Subject — in Russian or English, without a trailing period.
- One PR = one task. In the description, state what changed and how to verify.
- Make sure all checks from the section above pass on your branch.

## Useful links

- Angular: https://angular.dev
- Taiga UI: https://taiga-ui.dev
- NgRx Signals: https://ngrx.io/guide/signals
- Pnpm: https://pnpm.io
