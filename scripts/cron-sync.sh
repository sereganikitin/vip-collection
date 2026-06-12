#!/bin/bash
# Ежедневный sync товаров vip-collection.ru → vipcoll.ru (БД + картинки).
#
# Запускается по cron, файл cron-entry: scripts/cron.d/vipcoll-sync.
# Логи: /var/log/vipcoll-sync.log (rotate weekly через scripts/logrotate.d/).
# Telegram-уведомление приходит, если произошло что-то заметное
# (созданы/деактивированы товары) или если sync упал.
#
# Установка на сервере (один раз):
#   chmod +x /var/www/vip-collection/scripts/cron-sync.sh
#   cp /var/www/vip-collection/scripts/cron.d/vipcoll-sync /etc/cron.d/vipcoll-sync
#   cp /var/www/vip-collection/scripts/logrotate.d/vipcoll-sync /etc/logrotate.d/vipcoll-sync
#   touch /var/log/vipcoll-sync.log
#   chmod 644 /var/log/vipcoll-sync.log
#
# Ручной запуск для проверки:
#   /var/www/vip-collection/scripts/cron-sync.sh

set -u

APP_DIR=/var/www/vip-collection
LOG=/var/log/vipcoll-sync.log
LOCK=/var/lock/vipcoll-sync.lock
TMP_DIR="$APP_DIR/tmp-recon"
SYNC_OUTPUT=$(mktemp)
export NODE_OPTIONS="--max-old-space-size=1024"

# PATH для cron — иначе npx/node не находятся
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

cd "$APP_DIR" || { echo "[sync] cd failed" >&2; exit 1; }

# Защита от наложения запусков (если предыдущий завис)
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "[$(date -Iseconds)] previous sync still running, skipping" >> "$LOG"
  exit 0
fi

log() { echo "[$(date -Iseconds)] $1" >> "$LOG"; }

notify_tg() {
  local msg="$1"
  # Уведомление не должно ломать sync — игнорируем ошибки
  npx tsx scripts/notify-sync.ts "$msg" >>"$LOG" 2>&1 || log "TG notify failed for: $msg"
}

log "============================================================"
log "nightly sync start"
log "============================================================"

# Полная очистка tmp-recon, чтобы старые картинки не накапливались
rm -rf "$TMP_DIR"

# 1) scrape всех категорий
log "scrape: starting"
if ! npx tsx scripts/scrape-old-site.ts >>"$LOG" 2>&1; then
  log "scrape: FAILED"
  notify_tg "❌ Не удалось спарсить vip-collection.ru. Подробности в /var/log/vipcoll-sync.log"
  exit 1
fi
log "scrape: ok"

# 2) sync в БД
log "sync: starting"
if ! npx tsx scripts/sync-old-products.ts "$TMP_DIR/products.json" "$TMP_DIR/images" >"$SYNC_OUTPUT" 2>&1; then
  cat "$SYNC_OUTPUT" >>"$LOG"
  log "sync: FAILED"
  notify_tg "❌ Sync упал. См. /var/log/vipcoll-sync.log"
  rm -f "$SYNC_OUTPUT"
  exit 1
fi

cat "$SYNC_OUTPUT" >>"$LOG"
SUMMARY=$(grep -E "^Result:" "$SYNC_OUTPUT" | tail -1)
SKIPPED_GUARD=$(grep -c "Catastrophe guard" "$SYNC_OUTPUT" || true)
rm -f "$SYNC_OUTPUT"

# Уведомления:
#   1) если сработал catastrophe guard — vip-collection.ru вернул сильно меньше товаров,
#      деактивация пропущена → нужно глазами посмотреть, что там не так
#   2) если есть created/deactivated/failed > 0 — отдельная сводка
#   3) если всё unchanged — тишина (не спамим)
if [ "$SKIPPED_GUARD" -gt 0 ]; then
  notify_tg "⚠ Catastrophe guard: vip-collection.ru вернул меньше товаров, чем в нашей БД. Деактивация пропущена. $SUMMARY"
elif echo "$SUMMARY" | grep -qE "(created=[1-9]|deactivated=[1-9]|failed=[1-9])"; then
  notify_tg "✅ $SUMMARY"
fi

log "sync complete: $SUMMARY"
