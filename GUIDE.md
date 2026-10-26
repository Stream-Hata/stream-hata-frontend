# Nameless StreamHata — полное руководство

Приложение для стримеров Twitch: чат-жюри, OBS-виджеты, баллы, игры, модерация, донаты, музыка и интеграции.

- **Фронтенд:** Angular 22 + Taiga UI 5 — https://github.com/p7x-dev/nameless-streamhata
- **Бэкенд:** Go — https://github.com/p7x-dev/nameless-streamhata-backend (локальная папка `../rgg-inv-go-backend`).
- **БД:** PostgreSQL.

---

## 1. Быстрый старт (разработка)

### 1.1. Требования

- Node.js 22+ и `pnpm` 11+
- Go 1.27+
- PostgreSQL 15+
- OBS Studio 30+ (для виджетов)

### 1.2. База данных

Создайте базу и пользователя:

```sql
CREATE DATABASE rgg;
```

Миграции применяются автоматически при старте Go-бэкенда (таблица `migrations`).

### 1.3. Бэкенд

```bash
cd ../rgg-inv-go-backend   # репозиторий nameless-streamhata-backend
cp .env.example .env   # если есть, иначе создайте .env вручную
# заполните DB_*, TWITCH_*, GROQ_* и остальные ключи
go run .
```

Бэкенд слушает `http://127.0.0.1:3000`.

Проверка:

```bash
curl http://127.0.0.1:3000/rgg-sync/twitch
curl http://127.0.0.1:3000/rgg-sync/integrations
curl http://127.0.0.1:3000/rgg-sync/widgets
```

### 1.4. Фронтенд

```bash
cd ../rgg-inv
pnpm install
pnpm start
```

Откройте `http://localhost:4200`. Dev-прокси уже настроен на `127.0.0.1:3000`.

Сборка:

```bash
pnpm build
# результат: dist/nameless-streamhata/browser
```

---

## 2. Переменные окружения бэкенда

Создайте `.env` в папке бэкенда. Секреты не коммитьте.

| Переменная                                                | Назначение                                                     |
| --------------------------------------------------------- | -------------------------------------------------------------- |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL                                                     |
| `SSL_MODE`                                                | `false` для локальной БД, иначе `require`                      |
| `IS_PROD`                                                 | `1` включает `Secure` cookie                                   |
| `TWITCH_CLIENT_KEY`                                       | Client ID приложения Twitch                                    |
| `TWITCH_SECRET_KEY` или `TWITCH_CLIENT_SECRET`            | Client Secret                                                  |
| `TWITCH_APP_URL`                                          | Redirect URI, например `http://localhost:3000/twitch/callback` |
| `TWITCH_ID_URL`                                           | `https://id.twitch.tv/oauth2`                                  |
| `GROQ_API_KEY`                                            | ключ Groq для AI-жюри (опционально)                            |
| `GROQ_MODEL`                                              | модель, по умолчанию `openai/gpt-oss-20b`                      |
| `DONATIONALERTS_CLIENT_ID` / `_SECRET`                    | OAuth DonationAlerts                                           |
| `DONATIONALERTS_REDIRECT_URI`                             | callback DonationAlerts                                        |
| `KOFI_VERIFICATION_TOKEN`                                 | токен верификации Ko-fi                                        |
| `DONATIONS_WEBHOOK_SECRET_*`                              | секреты вебхуков провайдеров                                   |
| `OBS_URL`, `OBS_PASSWORD`                                 | OBS WebSocket 5                                                |
| `DECK_API_KEY`                                            | ключ HTTP API для Stream Deck                                  |
| `APP_DOWNLOAD_URL`                                        | прямой URL файла desktop-сборки                                |
| `APP_DOWNLOAD_FILE`                                       | локальный путь к файлу сборки                                  |

---

## 3. Подключение Twitch

1. Создайте приложение на [dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps).
2. Redirect URI: `http://localhost:3000/twitch/callback` (для продакшена — ваш домен).
3. Скопируйте Client ID и Client Secret в `.env`.
4. Перезапустите бэкенд.
5. В приложении откройте **Вход → Войти через Twitch** или **Настройки → Twitch → Подключить**.

После OAuth бэкенд сохраняет refresh token и поднимает чат-рантайм: IRC, EventSub, чат-жюри, музыку, модерацию.

Проверка: `GET /rgg-sync/twitch` должен вернуть `valid: true` и данные канала.

---

## 4. DonationAlerts

1. Создайте приложение на [donationalerts.com/application/clients](https://www.donationalerts.com/application/clients).
2. Redirect URI: `http://localhost:3000/rgg-sync/donations/donationalerts/callback`.
3. Заполните `DONATIONALERTS_*` в `.env`.
4. Перезапустите бэкенд.
5. **Настройки → Интеграции → DonationAlerts → Подключить**.

После авторизации донаты приходят через Centrifugo WebSocket и попадают в шину донатов, топы, алерты и Telegram/Discord.

Вебхуки для остальных провайдеров:

- Ko-fi, DonationTo, Donate.stream, DonatePay, generic.
- URL: `http://<домен>/rgg-sync/donations/webhook/<provider>`.
- Секреты — в `.env` (`DONATIONS_WEBHOOK_SECRET_*`).

Для локальной разработки внешние вебхуки требуют туннель (cloudflared, ngrok).

---

## 5. Telegram и Discord

1. **Настройки → Уведомления**.
2. Включите **Telegram / Discord**.
3. Discord: вставьте webhook URL канала.
4. Telegram: создайте бота через `@BotFather`, вставьте токен и chat ID (бот должен быть добавлен в чат/канал).
5. Нажмите **Тест**, затем **Сохранить**.
6. **Дайджест** — автоотправка итогов при завершении стрима (если включён).

Отправка вручную: **Настройки → Сеть и метрики → Дайджест в Telegram → Отправить**.

---

## 6. OBS-виджеты

Включите нужные виджеты на странице **Виджеты** (состояние сохраняется в БД).

URL для OBS Browser Source:

| Виджет               | URL                  |
| -------------------- | -------------------- |
| Чат-жюри             | `/overlay/jury`      |
| Таймер               | `/overlay/timer`     |
| Алерты               | `/overlay/alerts`    |
| Донаты               | `/overlay/donations` |
| События              | `/overlay/events`    |
| Аудио (звук алертов) | `/overlay/audio`     |
| Колесо               | `/overlay/wheel`     |

Настройка OBS:

1. Добавьте источник **Browser**.
2. URL: `http://localhost:4200/overlay/jury` (dev) или `https://<домен>/overlay/jury` (prod).
3. Ширина/высота: 1920×1080 или под макет.
4. Включите **Shutdown source when not visible** = off, **Refresh browser when scene becomes active** = on.
5. Фон прозрачный: страница добавляет `body.overlay-mode`.
6. Для звука (alerts/audio) включите **Control audio via OBS** и выставьте громкость.

Настройка внешнего вида и звука — в **Настройки виджета** (стиль, тема, плотность, звук, громкость).

---

## 7. Чат-жюри

1. Подключите Twitch.
2. Настройте порог AI, длительность и кворум: **Настройки → Чат-жюри** или страница **Чат-жюри**.
3. Зрители пишут советы в чат. AI классифицирует совет; при уверенности выше порога открывается голосование.
4. Голоса: `!yea` / `!nei`.
5. Результат и вердикт появляются в панели и оверлее `/overlay/jury`.

Кнопка **Стоп** завершает голосование досрочно.

---

## 8. Баллы, магазин и игры

### 8.1. Баллы

- Начисление за сообщения, время просмотра, стрики, подписки и битсы.
- Команды: `!points`, `!top`, `!shop`, `!redeem`.
- Настройки и лидерборд: **Баллы**.

### 8.2. Магазин

- Награды за баллы с ценой и текстом ответа.
- Покупка: `!redeem <название>`.

### 8.3. Игры

- Слоты: `!slots <ставка>`.
- Колесо: `!wheel <ставка>`.
- Викторина: `!trivia`, ответ в чат.
- Дуэль: `!duel <ставка>` / `!accept`.

### 8.4. Колесо на выбывание

Пример: `!wheel TBoI 5000`.

1. Первый участник запускает раунд (или ведущий нажимает **Запустить** в **Баллы → Игры**).
2. Зрители входят той же командой: `!wheel TBoI <ставка>`.
3. Таймер сбора — `wheelRoundSeconds` (по умолчанию 60 секунд).
4. После таймера колесо крутится; порядок выбывания уже определён на сервере.
5. Последний оставшийся забирает банк (сумму ставок).
6. Оверлей `/overlay/wheel` показывает участников, выбывших и победителя.

Настройки: режим (`spin` / `elimination`), длительность раунда, мин/макс ставка, сектора (label, множитель, вес, цвет), звук.

Ручной запуск/спин: **Баллы → Игры → Колесо на выбывание**.

---

## 9. Модерация

### 9.1. Фильтры

**Модерация**:

- запрещённые слова (файл, пресеты, URL, плагины обработки);
- ссылки, капс, эмодзи-спам, повторы;
- действие: удалить / таймаут;
- сухой прогон;
- AI-проверка токсичности;
- лог действий.

### 9.2. Профиль зрителя из чата

1. Откройте **Чат**.
2. Нажмите на ник зрителя.
3. В попапе: баллы, сообщений, стрики, первый/последний визит, последнее сообщение, история модерации.
4. Действия: **Бан**, **Таймаут 10 мин**, **Удалить сообщение**, **Голосование за бан**.

«Голосование за бан» создаёт нативный Twitch-опрос «Забанить <ник>?» с вариантами «Да/Нет» на 60 секунд.

---

## 10. Команды и таймеры

**Команды**:

- команды с ответом, алиасами, кулдауном, уровнем доступа;
- переменные: `$(user)`, `$(login)`, `$(channel)`, `$(count)`, `$(date)`, `$(time)`;
- кнопка **Тест**;
- таймеры сообщений: интервал, active-only, random;
- триггеры: переназначение команд на действия (`games.wheel`, `points.balance` и т.д.).

---

## 11. Опросы и предикты

Страница **Опросы**:

- текущий нативный опрос Twitch с полосами;
- создание/завершение опроса;
- зеркало предиктов;
- история.

---

## 12. Музыка

- Зрители кидают YouTube-ссылки в чат — трек попадает в таблицу.
- Метаданные: title, author, duration, thumbnail; альбом/год — через iTunes, fallback YouTube Music.
- Ручное добавление по ссылке.
- Удаление, экспорт CSV.
- Выгрузка трек-листа в Telegram: **Музыка → В Telegram**.

Если YouTube не резолвится (DNS/регион), настройте прокси: **Настройки → Сеть и метрики**.

---

## 13. Донаты и топы

Страница **Донаты**:

- всего/сегодня/количество;
- последние донаты;
- топ-10 донатеров;
- статусы провайдеров.

Источники: DonationAlerts, Ko-fi, DonationTo, Donate.stream, DonatePay, generic webhook.

---

## 14. Настройки

### 14.1. Общее

- язык интерфейса (ru/en), Taiga UI тоже переключается;
- часовой пояс;
- авто-открытие жюри.

### 14.2. Внешний вид

- тема (dark/light/system), плотность, масштаб шрифта;
- акцентный цвет: выбор цвета и пресеты;
- проверка контраста WCAG: минимум 4.5:1 к фону; нечитаемый цвет не применяется, можно нажать «Подобрать читаемый».

### 14.3. Доступность

- уменьшить движение;
- повышенный контраст;
- размер текста S/M/L.

Настройки сохраняются в `localStorage` и применяются глобально.

### 14.4. Сеть и метрики

- прокси для исходящих запросов (музыка, 7TV, уведомления);
- тест сети;
- метрики сессии/донатов/музыки;
- отправка дайджеста в Telegram.

### 14.5. Интеграции

- список подсистем с тумблерами;
- DonationAlerts OAuth;
- URL вебхуков.

---

## 15. Desktop-приложение (Tauri)

Целевая модель:

- домен отдаёт только лендинг;
- кнопка **Скачать приложение** ведёт на `GET /rgg-sync/app/download`;
- приложение стартует с экрана входа через Twitch;
- данные — только реального канала, без демо-заглушек.

Настройка прямого скачивания:

```env
# вариант 1: прямой URL на файл
APP_DOWNLOAD_URL=https://cdn.example.com/nameless-streamhata.AppImage

# вариант 2: файл на сервере
APP_DOWNLOAD_FILE=/var/www/downloads/nameless-streamhata.AppImage
```

Пока endpoint не настроен, он возвращает `404` с понятной ошибкой.

---

## 16. Тесты и проверки

Фронтенд:

```bash
pnpm lint
npx ng test --watch=false
pnpm build
```

Бэкенд:

```bash
cd ../rgg-inv-go-backend
go build ./...
go test ./...
go test -race ./...
```

Проверка API:

```bash
curl http://127.0.0.1:3000/rgg-sync/widgets
curl http://127.0.0.1:3000/rgg-sync/games/wheel
curl http://127.0.0.1:3000/rgg-sync/integrations
```

---

## 17. Частые проблемы

### YouTube: `dial tcp: lookup www.youtube.com: no such host`

DNS провайдера/роутера блокирует домен. Проверьте:

```bash
getent hosts www.youtube.com
dig +short www.youtube.com @77.88.8.8
```

Решения: сменить DNS, настроить прокси в **Настройки → Сеть и метрики** или в `.env`.

### Twitch не подключается

- Проверьте `TWITCH_CLIENT_KEY` и `TWITCH_SECRET_KEY` (код принимает оба варианта).
- Redirect URI в приложении Twitch должен совпадать с `TWITCH_APP_URL`.
- Очистите cookie `e-hub-refresh-token` и войдите заново.
- Проверьте `GET /rgg-sync/twitch`.

### Telegram не отправляет

- Токен и chat ID заполнены.
- Бот добавлен в чат/канал и имеет право писать.
- Включён тумблер **Telegram / Discord**.
- Для дайджеста включён **Дайджест**.
- Нажмите **Тест**.

### Виджеты выключены/сбрасываются

- Включите их на странице **Виджеты**; состояние сохраняется в `app_setting`.
- После перезапуска бэкенда состояние должно сохраниться.
- Проверьте `GET /rgg-sync/widgets`.

### OBS: виджет не виден

- URL открывается в браузере без ошибок.
- Browser Source: прозрачный фон, правильные размеры.
- Для звука включите **Control audio via OBS**.
- Проверьте консоль OBS (правый клик → **Interact**).

### Ошибка миграций/БД

- PostgreSQL запущен, база создана.
- `DB_PASSWORD` с спецсимволами экранируется автоматически.
- `SSL_MODE=false` для локальной БД.

---

## 18. Структура проекта

```
rgg-inv/                     # Angular-фронтенд
  src/app/components/pages/  # страницы панели
  src/app/components/overlays/ # OBS-оверлеи
  shared/services/           # API-сервисы
  shared/types/              # типы
rgg-inv-go-backend/          # Go-бэкенд (после переименования — nameless-streamhata-backend)
  alerts/ chat/ chatjury/ donations/ games/ moderation/ music/ ...
  migrations/                # SQL-миграции
```

---

## 19. Безопасность

- Секреты — только в `.env` или OS keychain (desktop).
- Не коммитьте токены, пароли и client secret.
- OAuth refresh token в вебе — `httpOnly` cookie; в desktop — OS keychain.
- Для вебхуков используйте секреты и HTTPS.
- Не открывайте PostgreSQL в интернет; для desktop используйте API, а не прямой доступ к БД.
