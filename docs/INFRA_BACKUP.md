# Infrastructure backup

## Что бэкапится

Еженедельно, воскресенье 03:50 МСК, `streamhata-infra-backup.timer` создаёт
зашифрованный архив инфраструктуры 78 и конфигурации 152:

- 78: systemd, nginx, HAProxy, PostgreSQL config, `/etc/streamhata`, SSH, UFW,
  fail2ban, `/opt/streamhata` без uploads/quarantine, zapret config, K3s state,
  cron, root SSH keys.
- 152: `/etc`, `/opt/trusttunnel`, cron, root SSH keys.

Архив лежит:

- локально на 78: `/root/backups/infra-YYYY-MM-DD/infra.tar.gz.gpg`
- на 152: `/var/backups/streamhata-infra/YYYY-MM-DD/infra.tar.gz.gpg`

Хранится 14 дней. База данных бэкапится отдельно ежедневно.

## Шифрование

GPG symmetric, AES-256. Пароль:

- на 78: `/etc/streamhata/infra-backup.pass`
- на рабочей машине: `~/.config/streamhata-infra-backup.pass`

Пароль нужно хранить в менеджере паролей: без него архивы не расшифровать.

## Проверка

```bash
gpg --batch --decrypt --passphrase-file /etc/streamhata/infra-backup.pass \
  /root/backups/infra-YYYY-MM-DD/infra.tar.gz.gpg | tar tzf - | head
```

## Восстановление

```bash
mkdir -p /tmp/streamhata-restore
gpg --batch --decrypt --passphrase-file /path/to/infra-backup.pass \
  infra.tar.gz.gpg > /tmp/streamhata-restore/infra.tar.gz
tar xzf /tmp/streamhata-restore/infra.tar.gz -C /tmp/streamhata-restore
tar xzf /tmp/streamhata-restore/78-config.tar.gz -C /
tar xzf /tmp/streamhata-restore/152-config.tar.gz -C /
systemctl daemon-reload
```

Перед восстановлением на живой сервер проверить архив на тестовой машине.
