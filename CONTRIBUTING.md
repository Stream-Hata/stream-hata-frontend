# Руководство по участию (CONTRIBUTING)

Спасибо, что хотите помочь проекту RGG Inventory. Ниже — правила и рекомендации для контрибьюторов.

> English version: [CONTRIBUTING.en.md](CONTRIBUTING.en.md). Полный стиль кода описан в [CODESTYLE.md](CODESTYLE.md). Ожидаемое поведение участников — в [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## С чего начать

1. Установите Node.js (LTS) и [pnpm](https://pnpm.io/).
2. Склонируйте репозиторий и установите зависимости:

   ```bash
   git clone <url-репозитория>
   cd rgg-inv
   pnpm install
   ```

3. Запустите приложение и сервер синхронизации (см. README, раздел «Запуск»).
4. Найдите задачу: баги, новые платформы, улучшения UI.

## Правила разработки

### Стиль кода

- **TypeScript**, Angular standalone-компоненты, сигналы (`signal`, `computed`, `input`).
- Имена классов с суффиксом типа (`HotbarStore`, `SettingsStore`, `PlatformBar`, `YamlParser`) — задано схематиками в `angular.json`.
- Селекторы компонентов: префикс `app`, kebab-case (`app-platform-bar`); директивы — `app` + camelCase (`appPlatformGuard`).
- `ChangeDetectionStrategy.OnPush` для компонентов, где это уместно.
- Форматирование: **tabs** в TS, 2 пробела в HTML/SCSS, single quotes, semicolons. Настраивается ESLint/Stylelint — не отключайте правила локально.
- Состояние выносится в `signalStore` (`apps/web/src/app/store/`), сервисы — в `packages/shared/services/`.
- Общие типы (`AppState`, `TimerState`, `HotbarState`) живут в `packages/shared/types/` и переиспользуются и фронтом, и `backend/server.ts`.
- Язык комментариев — русский (как в существующем коде).

### Проверки перед коммитом

```bash
npx eslint .                  # линт без ошибок
npx stylelint "**/*.scss"     # стили
pnpm test                     # юнит-тесты (Vitest)
pnpm build                    # сборка проходит
```

Если правило линтера можно исправить автоматически:

```bash
npx eslint . --fix
```

### Компоненты и кодогенерация

Создавайте файлы через Angular CLI, чтобы соблюсти конвенции (`angular.json` автоматически добавит суффиксы и `OnPush`):

```bash
npx ng g component componenents/foo/foo
npx ng g service services/foo
```

> Внимание: в проекте используется папка `componenents` (с опечаткой) — следуйте существующей структуре.

## Добавление платформ

Справочник платформ — `apps/web/public/platforms.yaml` (структура: `maintainer` → `platforms[]` с полями `name`, `code`, `icon`). Иконки — SVG в `apps/web/public/icons/platforms/`.

- Имя файла иконки указывайте в поле `icon` (например `ps1.svg`).
- Код платформы (`code`) — уникальный, используется для сопоставления с хотбаром.
- Если иконки нет — ставьте `icon: null` (как у PlayStation Vita).

## Синхронизация состояния

- `backend/server.ts` — локальный сервер; при изменении протокола `/rgg-sync` обновляйте типы в `packages/shared/types/`, `hotbar.service.ts` и `hotbar.store.ts` одновременно.
- Не добавляйте секреты/токены в код — сервер не должен зависеть от внешних credentials.

## Коммиты и PR

- Ветка для работы: `feature/<описание>` или `fix/<описание>`.
- Коммиты — маленькие, атомарные. Сообщение — в формате [conventional commits](https://www.conventionalcommits.org/), проверяется commitlint при коммите: `type(scope): subject` (например `feat(hotbar): добавить слоты платформ`). Допустимые типы: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- Subject — на русском или английском, без точки в конце.
- Один PR = одна задача. В описании укажите, что изменилось и как проверить.
- Убедитесь, что все проверки из раздела выше проходят на вашей ветке.

## Полезные ссылки

- Angular: https://angular.dev
- Taiga UI: https://taiga-ui.dev
- NgRx Signals: https://ngrx.io/guide/signals
- Pnpm: https://pnpm.io
