# AGENTS.md

Правила для AI-агентов и контрибьюторов проекта StreamHata frontend.

## Источники правил

- `CODESTYLE.md` — стиль кода и Angular-конвенции.
- `CONTRIBUTING.md` — процесс разработки и проверки.
- `eslint.config.js` — обязательные ESLint-правила.
- `tsconfig.json` — strict TypeScript.

## Обязательные команды

```bash
pnpm install
pnpm lint
pnpm test --watch=false
pnpm test:coverage
pnpm build
```

Перед коммитом:

```bash
pnpm lint
pnpm test --watch=false
pnpm build
```

## ESLint-first

- Сначала читать текст ESLint-ошибки и правило, которое её выдало.
- Исправлять только затронутые файлы:

```bash
pnpm exec eslint <files> --fix
pnpm exec eslint <files>
```

- После `--fix` проверять `git diff`, чтобы не получить чужие перестановки.
- Не отключать правила без причины и не добавлять `eslint-disable` вместо исправления.
- `max-len`, `no-alert`, `stream-hata/no-output-to-input` требуют ручного исправления, не только auto-fix.
- HTML форматируется кастомным ESLint-правилом `stream-hata/html-format` (2 пробела).
- Prettier как форматтер проекта не используется. Пакет `prettier` остаётся только как runtime-библиотека для форматирования кода в чате.
- `stream-hata/component-imports-unused` отключён: правило давало false positive на Angular-компонентах; отсутствующие imports ловит сборка.

## Angular

- Standalone-компоненты, `ChangeDetectionStrategy.OnPush`.
- `inject()` вместо constructor injection.
- Сигналы: `signal`, `computed`, `input`, `model`.
- Шаблоны — внешние `templateUrl` / `styleUrl`.
- Управляющие конструкции — `@if`, `@for`, `@switch`.
- Все подписки — с `takeUntilDestroyed(this.destroyRef)`.
- Не использовать `window.confirm` и `window.alert`; подтверждения — через `TuiDialog` и `model()`.
- Не делать ручной two-way binding через `[input]` + `(inputChange)="signal.set($event)"`; использовать `[(input)]` или метод-обработчик.
- Не дублировать атрибуты в HTML; у `<img>` должен быть `alt` (статический или `[alt]`).

## RxJS

- `pipe(map(...), tap(...), takeUntilDestroyed(...))`.
- `switchMap` для переключения потоков и отмены предыдущего запроса.
- `timer(0, N)` + `switchMap` вместо `setInterval`.
- Debounce поиска/автоформата — `Subject` + `debounceTime` + `switchMap`.
- Параллельные запросы — `forkJoin`; последовательная обработка — `concatMap`.
- Ошибки — `catchError`, не пустые `subscribe`.
- Не вкладывать `subscribe` внутрь `subscribe`.
- Не оборачивать `toObservable(signal)` обратно в `toSignal`.

## TypeScript

- `strict`, без `any`; для неизвестных значений — `unknown` + narrowing.
- Импорты только типов — `import type`.
- Сортировка импортов и имён — по ESLint.
- Не оставлять неиспользуемые импорты, переменные и параметры.
- Публичные методы и сервисы возвращают `Observable`, а не подписываются внутри.

## Состояние и сервисы

- Локальное состояние — `signal`/`computed`.
- Глобальное состояние — signalStore в `src/app/store/`.
- HTTP-сервисы — в `shared/services/`, без побочных подписок.
- Общие типы — в `shared/types/`.
- Ошибки пользователю показывать понятным текстом; не терять backend `error`.

## Тесты

- Vitest, `*.spec.ts` рядом с кодом.
- Coverage: `pnpm test:coverage`, отчёт загружается в Codecov из CI.
- Проверять поведение, а не только создание компонента.
- Мокать HTTP/сервисы провайдерами.
- Перед завершением задачи: `pnpm test --watch=false`.

## Безопасность

- Не коммитить токены, ключи, keystore и `.env`.
- Не логировать секреты и персональные данные.
- Для E2EE не отправлять содержимое сообщений на сервер без явного согласия.
- Проверка ссылок в E2EE — на клиенте.

## Исключения

- Кастомные ESLint-правила и SQL-парсер живут в `Stream-Hata/eslint-rules` и подключаются как `@stream-hata/eslint-rules`.
- `src/app/components/overlays/dice-overlay/dice-scene.ts` — legacy Three.js-сцена с `@ts-nocheck`; для неё отключено только `ts/ban-ts-comment`. При рефакторинге сцены убрать исключение.
- Отключённые кастомные правила перечислены выше; заменять их TypeScript/сборкой, а не новыми глобальными disable-комментариями.
