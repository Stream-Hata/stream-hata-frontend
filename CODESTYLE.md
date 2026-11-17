# Кодстайл (CODESTYLE)

Стиль кода описан по фактическим конвенциям проекта. Правила enforced инструментами (ESLint, Stylelint) — обязательны; остальное — рекомендации, которым следует следовать для единообразия.

> English version: [CODESTYLE.en.md](CODESTYLE.en.md)

## 1. Форматирование (enforced)

| Правило                  | Значение                                              |
| ------------------------ | ----------------------------------------------------- |
| Отступы в TS/JS          | **Tabs** (eslint: `indent: tab`)                      |
| Отступы в SCSS/HTML/JSON | 2 пробела                                             |
| Кавычки                  | одинарные (`'...'`)                                   |
| Точки с запятой          | обязательны                                           |
| Ширина строки            | максимум 120 (eslint `max-len`)                       |
| Кодировка                | UTF-8, перевод строки LF                              |

Конфиги: `eslint.config.js` (antfu), `.stylelintrc.json` (stylelint-config-standard-scss), `.editorconfig`.

## 2. Именование

- **Файлы и каталоги** — kebab-case: `platform-bar.ts`, `hotbar.store.ts`, `yaml-parser.service.ts` → но см. ниже про суффиксы: в проекте суффикс типа в имени класса, не файла.
- **Классы** — PascalCase + суффикс типа (`addTypeToClassName` в `angular.json`):
  - компонент: `Hotbar`, `Timer`, `TimeRow`, `Hours`, `Minutes`, `Seconds`, `Settings`, `SettingsDropdown`, `PlatformMaintainer`, `PlatformBar`, `Slot`, `App`
  - стор: `HotbarStore`, `SettingsStore`
  - сервис: `HotbarService`, `YamlParser`, `PlatformBar`
- **Переменные/функции** — camelCase: `initialState`, `padded()`, `togglePlatform()`, `isSelected`.
- **Константы** — `SCREAMING_SNAKE_CASE`: `INITIAL_STATE`, `TUI_ICON_RESOLVER`.
- **Файлы компонента** — одноимённые `hotbar.ts` / `hotbar.html` / `hotbar.scss` / `hotbar.spec.ts` (без суффикса `.component`).
- **Тесты** — `*.spec.ts` рядом с кодом.

## 3. Селекторы

- **Компоненты** — префикс `app`, kebab-case, тип `element`: `app-hotbar`, `app-platform-bar`, `app-time-row`, `app-slot`.
- **Директивы** — префикс `app`, camelCase, тип `attribute`: `appPlatformGuard`, `appSlotIcon` (enforced `@angular-eslint` правилами в `eslint.config.js`).

## 4. Angular

- **Standalone-компоненты**: `imports` в декораторе, без NgModule.
- **Шаблоны и стили** — внешними файлами: `templateUrl`, `styleUrl` (единственное число, Angular 22).
- **ChangeDetection** — `ChangeDetectionStrategy.OnPush` для компонентов (задано схематиком по умолчанию).
- **Сигналы**:
  - входные данные: `readonly data = input.required<T>()`, `readonly hours = input.required<number>()`
  - локальное состояние: `signal`, `computed`
  - доступ к сигналам в шаблоне через вызов: `mode()`, `time()`
- **DI** — функция `inject()`, не конструктор (конструктор — только для `effect()` и т.п.).
- **Утечки** — `takeUntilDestroyed(this.destroy)` c `DestroyRef`.
- **Типизация** — `strict` режим, запрещены `any` (если не крайняя необходимость), `noImplicitReturns`, `noFallthroughCasesInSwitch`.

## 5. Сторы (NgRx signalStore)

```ts
export const HotbarStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withHooks((state, ...) => ({ onInit: () => {...} })),
  withComputed((state) => ({ ... })),
  withMethods((state, ...) => ({ ... })),
);
```

- Состояние — `interface` + `initialState` рядом со стором.
- Изменения — только через `patchState`.
- `withHooks` — загрузка данных на `onInit`, с `takeUntilDestroyed`.
- Файл — `*.store.ts` в `apps/web/src/app/store/`.

## 6. Сервисы

- `@Injectable({ providedIn: 'root' })` (или `@Service({ autoProvided: true })` Angular 22).
- HTTP-сервисы возвращают `Observable`, не подписываются внутри.
- Общие сервисы — в `packages/api/` (например `yaml-parser.ts`, `platform-bar.ts`).

## 7. Типы

- **Общие типы между фронтом и `backend/server.ts`** — в `packages/shared/types/`: `AppState`, `TimerState`, `HotbarState`, `Time`.
- Утилитарные типы (например `Default<Type, Field, Value>`) — там же.
- Типы, специфичные для слоя, — рядом с кодом (интерфейсы в `hotbar.service.ts`, `yaml-parser.ts`).

## 8. RxJS

- Пайпинг: `pipe(map(...), tap(...), takeUntilDestroyed(...))`.
- `switchMap` для переключения потоков (см. `Timer.startTimer`).
- Именование потоков — по сути: `initialLoad()`, `updateState()`.
- Без вложенных подписок в шаблонах; подписки — только с уничтожением.
- Не использовать `setInterval` в компонентах: `timer(0, N)` + `switchMap` + `takeUntilDestroyed`.
- Debounce/search/autosave — `Subject` + `debounceTime` + `switchMap`.
- Не использовать `window.confirm`/`window.alert`: подтверждения — через `TuiDialog` или `model()`.
- Перед правкой читать сообщение ESLint; `eslint --fix` — только по изменённым файлам, затем проверять diff.

## 9. Стили (SCSS)

- SCSS + кастомная тема Taiga UI в `packages/styles/taiga.scss` (шаред-стили — в `packages/styles/`).
- Импорт шаред-стилей: `@use 'mixins';` / `@import 'taiga';` (includePaths `./packages/styles` в `angular.json`) .
- Глобальные стили — `apps/web/src/styles.scss`; стили компонента — в его `*.scss`.
- Переменные Taiga UI — через CSS-переменные `--tui-*`.
- Стилизация через классы (`:host`, `.chip`, `.row`), без inline-стилей в разметке.
- Лишние единицы не ставить; придерживаться существующих паттернов (миксин `expanded`, анимация `pulse`).

## 10. HTML

- Отступы — 2 пробела, строки короче 100 символов.
- Управляющие конструкции Angular: `@if` / `@for` (новый синтаксис) или `*ngIf` в унаследованном коде не вносить.
- Одиночные теги-кнопки с атрибутами — формат из существующего кода (`tuiButton`, `tuiIconButton`, `[iconEnd]`).

## 11. Тесты

- Vitest, `*.spec.ts` рядом с кодом.
- Подготовка — `TestBed.configureTestingModule({ imports: [...] })`.
- Внешние зависимости (сервисы, HTTP, сторонние токены) — мокаются провайдерами (`provide: ..., useValue: ...`).
- Требуемые входы сигналов задаются через `fixture.componentRef.setInput(...)`.
- Тест должен проверять поведение, а не только «should create».

## 12. Прочее

- **Комментарии** — на русском, по делу; не комментировать очевидное.
- **Лишние импорты** — запрещены (eslint-plugin-unused-imports); сортировка импортов — antfu-конвенция.
- **Структура каталогов** — фичи в `apps/web/src/app/components/<feature>/`, общее в `packages/shared/`, сторы в `apps/web/src/app/store/`.
- **Сервер** — `backend/server.ts` (Express, type-stripping); изменения протокола `/rgg-sync` синхронно с типами в `packages/shared/types/`.

## 13. Проверки перед коммитом

```bash
npx eslint .                  # 0 ошибок
npx stylelint "**/*.scss"     # стили
pnpm test                     # юнит-тесты
pnpm build                    # сборка
```

Линтинг и форматирование застейдженных файлов выполняются автоматически через husky + lint-staged (см. `package.json` → `lint-staged`).
