# StreamHata plugin/mod manifest

Манифест — единственный формат метаданных плагина или мода. Он лежит в корне
архива как `streamhata.manifest.json` и проверяется SDK, backend и trust-реестром.

Схема: [`plugin-manifest.schema.json`](./plugin-manifest.schema.json).
Пример: [`examples/obs-tools.manifest.json`](./examples/obs-tools.manifest.json).

## Обязательные поля

| Поле | Тип | Описание |
|---|---|---|
| `schemaVersion` | `1` | Версия формата. Сейчас только `1`. |
| `kind` | `plugin` или `mod` | Тип пакета. |
| `id` | string | Стабильный lowercase id: `dev.streamhata.obs-tools`. |
| `name` | string | Отображаемое имя. |
| `version` | semver | `1.2.3` или `1.2.3-beta.1`. |
| `apiVersion` | string | Только для плагинов, например `1`. |
| `entry` | string | Только для плагинов, безопасный относительный путь. |

## Необязательные поля

- `description`, `authors`, `license`, `homepage`
- `permissions` — только из allowlist:
  `network`, `filesystem.read`, `filesystem.write`, `clipboard.read`,
  `clipboard.write`, `notifications`, `obs`, `twitch.chat`, `stream.state`,
  `commands`, `ui.panel`, `storage`.
- `compatibility.gameVersions`, `compatibility.loaders`, `compatibility.platforms`
- `artifact` — `url`, `sha256`, `size`, `signatureType`, `signature`
- `publisher` — `id`, `name`, `trust`

## Правила безопасности

1. `id` не меняется между версиями.
2. `entry` не может быть абсолютным путём или содержать `..`.
3. Неизвестные поля запрещены.
4. `sha256` — 64 hex-символа; `size` не отрицательный.
5. Если задан `signature`, обязателен `signatureType` (`minisign` или `ed25519`).
6. Плагин без `permissions` получает только базовый UI-доступ; опасные
   разрешения (`filesystem.write`, `network`, `obs`) показываются пользователю
   перед установкой.
7. Манифест не является доказательством безопасности: артефакт дополнительно
   проверяется ClamAV и trust-реестром.

## Валидация

Go-валидатор: `pluginmanifest.Parse([]byte)`. Он проверяет размер (до 64 КБ),
JSON, неизвестные поля, id, semver, allowlist разрешений, пути и подпись.

Проверка через API:

```http
POST /rgg-sync/trust/manifest/validate
Content-Type: application/json
X-Security-Token: <internal token>

{ ... manifest ... }
```

Успех: `{"valid":true,"manifest":{...}}`.
Ошибка: `400` с `{"error":"..."}`.

## Пример мода

```json
{
  "schemaVersion": 1,
  "kind": "mod",
  "id": "dev.streamhata.example-mod",
  "name": "Example Mod",
  "version": "1.2.3",
  "compatibility": {
    "gameVersions": ["1.21"],
    "loaders": ["fabric"]
  },
  "artifact": {
    "sha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
  }
}
```
