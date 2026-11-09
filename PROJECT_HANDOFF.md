# StreamHata — статус разработки

Дата фиксации: 2026-11-09
Статус: активная разработка. CI/CD настраивается на автоматический деплой по push.

## Версии

- Frontend: `1.2.1-alpha`.
- Desktop: `1.2.1-alpha`; установленный бинарник может быть старше исходников.
- Android: `0.7.4-alpha`, `versionCode 704`; Chat: `1.0.1-alpha`, `versionCode 2`; release APK подписаны.
- Backend: S3-адаптер для загрузок, blog API, расширенный graph; много незакоммиченных изменений.
- Android release keystore: локально, вне git. Пароль — в локальном защищённом файле.

## Инфраструктура

- `78.17.181.135` — RU-нода: nginx, frontend, backend, statuspage, K3s, SSH-туннели к 62, zapret2.
- `201.3.227.152` — Frankfurt: nginx, backend, statuspage, TLS; warm standby/резерв.
- `62.113.114.50` — PostgreSQL, OpenBao, Loki, Prometheus, Grafana.
- `64.188.115.211` — Frankfurt: AmneziaWG + TrustTunnel на `9443/tcp`, SOCKS/relay.
- `152.234.227.187` — US node (Utah): пока только мониторинг, приложение не развёрнуто.
- `78` дополнительно: S3-совместимое хранилище (`rclone serve s3`) для загрузок; данные `/var/lib/streamhata/s3`.
- `201` проксирует uploads/media на 78; деплой 201 через jump-host 78.
- Старый `144.31.182.213` выведен; `79.137.226.78` не используется.

Домены:

- `https://streamhata.rdpctd.dev` — глобальный сайт/API.
- `https://ru.streamhata.rdpctd.dev` — RU-нода.
- `https://ru.api.streamhata.rdpctd.dev` — API RU.
- `https://status.streamhata.rdpctd.dev` — статус.
- `https://grafana.streamhata.rdpctd.dev` — Grafana.
- `https://vpn.rdpctd.dev:9443` — TrustTunnel.
- `https://blog.streamhata.rdpctd.dev` — блог (A→78, отдельный Let's Encrypt).

OpenBao восстановлен: данные целы, AppRole `streamhata`/`statuspage`/`dns-controller` перевыпущены, backend/status читают секреты через systemd credentials.

## Сделано

Web:

- статус-страница, Grafana, Prometheus и Loki работают; мониторинг 78/201/62.
- игры: каталог ускорен, facets кэшируются, страница грузится ~1–2с.
- обсуждения: inline внизу игры + отдельная страница, ветки, лайки, удаление, сортировка, редактор Taiga UI, режимы редактора, i18n, a11y, уведомления.
- исправлены header и scrollbar, добавлен indeterminate-индикатор прокрутки.
- в команды чата добавлен интерпретатор выражений `{{ ... }}` (`user`, `args`, `counter`, `upper`, `len`, `clamp` и др.).
- TLS для streamhata/ru/status/grafana/блога; Let's Encrypt.
- блог: публичная лента, статья, TOC/scrollspy, админка, TuiEditor, загрузка обложки/изображений.
- загрузки блога/чата: S3-совместимое хранилище на 78, изображения сжимаются/ресайзятся.
- граф отношений расширен на пользователей с сообщениями/баллами/identity.
- zapret2 на 78: YouTube/Discord/Twitch работают; Telegram — через SOCKS 64.

Android (всё нативно, HTTP-клиент, без WebView):

- drawer-навигация: группы, «Ещё разделы», без нижнего меню.
- дашборд стрима, детальная игра, загрузочная анимация.
- отдельный редактор команд/триггеров/переменных.
- «Чат»/«Сообщения» открываются отдельным StreamHata Chat с автологином по коду.
- экраны: чат, сообщения, игры, обсуждение, события, зрители, баллы, уведомления, музыка, опросы, рулетка, стрим, OBS, команды, виджеты, модерация, донаты, чат-жюри, Telegram, колесо, журнал, настройки, профиль.
- обсуждение: ответы, лайки, удаление.
- региональный выбор API по локали/таймзоне.
- Gradle/Kotlin daemon ограничены по памяти.

Backend:

- messaging, reaction/edit/block/presence, recovery, conversation state.
- game discussions: миграции 041–044, likes, delete/edit, notifications.
- command expression interpreter (`expr-lang/expr`).
- catalog: async facets, skip enrich by default.

## Что делать дальше

1. OBS/stream: расширенные настройки сцен и источников.
2. Widget config и command editor на Android.
3. Chat-jury settings на Android.
4. Полный i18n/a11y остальных разделов.
5. SDK и публичная документация API.
6. Финальный паритет desktop-функций на Android.
7. Проверить autologin и сессию Android на реальном устройстве.
8. CI/CD: deploy-пользователь настроен, секреты GitHub добавлены; workflows ещё нужно запушить.
9. MinIO не используется: upstream архивирован, вместо него S3-совместимый rclone; при необходимости заменить на Garage/внешний S3.

## Важно

- Секреты, пароли и приватные ключи в этот файл не записываются.
- Перед деплоем/пушем проверять, что не коммитятся keystore, `.env`, токены и локальные credentials.
