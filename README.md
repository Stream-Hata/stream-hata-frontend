# Nameless StreamHata

Панель и OBS-виджеты для Twitch-стримеров: каталог игр, рулетка, баллы, чат-жюри, модерация, донаты, музыка, уведомления и desktop-приложение.

- **Frontend:** Angular + Taiga UI
- **Desktop:** Tauri 2 + Rust
- **Backend:** Go + PostgreSQL + OpenBao
- **Документация:** [руководство пользователя](docs/USER_GUIDE.md) · [FAQ](docs/USER_GUIDE.md#8-проблемы-и-решения)

## Репозитории

- Frontend: `https://github.com/Stream-Hata/streamhata`
- Desktop: `https://github.com/Stream-Hata/streamhata-desktop`
- Backend: `https://github.com/Stream-Hata/streamhata-backend`

## Быстрый старт

```bash
pnpm install
pnpm start
```

Откройте `http://localhost:4200/`, войдите через Twitch и настройте виджеты в разделе «Виджеты».

## Сборка

```bash
pnpm build
```

Результат: `dist/nameless-streamhata/browser`.

## Desktop

Desktop-клиент собирается отдельно из репозитория `streamhata-desktop`:

```bash
cargo build --release
```

Требования: Rust и системный WebView (WebKitGTK на Linux, WebView2 на Windows).

## Основные возможности

- Каталог игр с импортом из RAWG, IGDB и Steam.
- Рулетка и колесо с настройкой пула и анимации.
- Хотбар, таймеры, алерты, чат-жюри и OBS-оверлеи.
- Баллы, награды, опросы и команды.
- Донаты, музыка и TTS-озвучка.
- Уведомления и модерация.
- Desktop: трей, keychain, нативные диалоги, системный виджет и обновления.

## Документация

- [Руководство пользователя](docs/USER_GUIDE.md)
- [API хотбара и игр](docs/API_HOTBAR_GAMES.md)
- [Лицензия](LICENSE)
