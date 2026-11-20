#!/bin/bash
# Deploy script run by the GitHub webhook (/opt/deploy-webhook/server.js).
# The live copy is /opt/deploy-webhook/deploy.sh on the server. Editing this
# file in the repo does NOT change the server: copy it there by hand.
# One-time nginx /pb/ proxy setup lives in scripts/ensure-nginx-pb.sh.
set -e
# Only one deploy at a time; a second webhook call waits for the first to finish.
exec 9>/var/lock/ordinem-deploy.lock
flock 9
echo "=== Deploy started $(date) ==="
cd /tmp && rm -rf deploy_app
git clone --depth 1 https://github.com/drrubanesmohan-spec/anaesthesia-residency-app.git deploy_app
chmod 700 /tmp/deploy_app
cd deploy_app
npm ci --silent
echo "VITE_PB_URL=https://ordinemmed.ru/pb" > .env.local
npx tsc -b && npx vite build --config vite.static.config.ts

# --- PocketBase migrations (added 2026-11-20) ---
# Additive only: copies migration files the server does not have yet.
# Never overwrites or deletes anything already in pb_migrations
# (the server holds migrations that are not in git).
PB_DIR=/opt/pocketbase
PB_DB="$PB_DIR/pb_data/data.db"
BACKUP_DIR=/root/pb_backups
NEW=()
for f in pb_migrations/*.js; do
  [ -e "$f" ] || continue
  name=$(basename "$f")
  [ -e "$PB_DIR/pb_migrations/$name" ] || NEW+=("$name")
done

if [ ${#NEW[@]} -gt 0 ]; then
  echo "New migrations: ${NEW[*]}"
  mkdir -p "$BACKUP_DIR" && chmod 700 "$BACKUP_DIR"
  SNAP="$BACKUP_DIR/data-$(date +%Y%m%d-%H%M%S).db"
  sqlite3 -cmd ".timeout 5000" "$PB_DB" ".backup '$SNAP'"
  echo "Database snapshot: $SNAP"
  ls -1t "$BACKUP_DIR"/data-*.db | tail -n +11 | xargs -r rm -f
  for name in "${NEW[@]}"; do cp "pb_migrations/$name" "$PB_DIR/pb_migrations/$name"; done
  systemctl restart pocketbase || true
  healthy=0
  for _ in $(seq 1 20); do
    if curl -fsS -o /dev/null http://127.0.0.1:8090/api/health; then healthy=1; break; fi
    sleep 1
  done
  if [ "$healthy" -ne 1 ]; then
    echo "ERROR: PocketBase did not come back up. Removing new migrations and restarting."
    for name in "${NEW[@]}"; do rm -f "$PB_DIR/pb_migrations/$name"; done
    systemctl restart pocketbase || true
    echo "Site NOT updated. Database snapshot: $SNAP"
    exit 1
  fi
  for name in "${NEW[@]}"; do
    n=$(sqlite3 -cmd ".timeout 5000" "$PB_DB" "select count(*) from _migrations where file='$name';")
    if [ "$n" != "1" ]; then
      echo "ERROR: $name was not recorded as applied. Site NOT updated. Database snapshot: $SNAP"
      exit 1
    fi
  done
  echo "Migrations applied, PocketBase healthy"
else
  echo "No new migrations"
fi
# --- end PocketBase migrations ---

find /var/www/ordinemmed -mindepth 1 -delete
cp -r dist/. /var/www/ordinemmed/
echo "=== Deploy done $(date) ==="
