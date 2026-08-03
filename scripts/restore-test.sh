#!/usr/bin/env bash
# Restores a backup produced by scripts/backup.sh into a throwaway local
# database and reports what came back. This is the half people skip.
set -euo pipefail

DUMP="${1:?Usage: scripts/restore-test.sh <dump.sql.gz>}"
PORT="${PGTEST_PORT:-54330}"
WORK="${PGTEST_DIR:-/var/tmp/pgrestore}"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"

if [ "$(id -u)" = "0" ]; then
  id -u pgtest >/dev/null 2>&1 || useradd -m pgtest
  mkdir -p "$WORK"; chown -R pgtest:pgtest "$WORK"
  cp "$DUMP" "$WORK/dump.sql.gz"; chown pgtest:pgtest "$WORK/dump.sql.gz"
  exec su pgtest -c "PGTEST_PORT='$PORT' PGTEST_DIR='$WORK' PGBIN='$PGBIN' bash '$0' '$WORK/dump.sql.gz'"
fi

cleanup() { "$PGBIN/pg_ctl" -D "$WORK/data" stop -m immediate >/dev/null 2>&1 || true; }
trap cleanup EXIT

rm -rf "$WORK/data"; mkdir -p "$WORK"
"$PGBIN/initdb" -D "$WORK/data" -A trust -U postgres >/dev/null
"$PGBIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -k $WORK" -l "$WORK/pg.log" start >/dev/null
sleep 3

psql -h "$WORK" -p "$PORT" -U postgres -c "create database restored;" >/dev/null
gunzip -c "$DUMP" | psql -h "$WORK" -p "$PORT" -U postgres -d restored -q > "$WORK/restore.log" 2>&1 || true

echo "Restored contents:"
psql -h "$WORK" -p "$PORT" -U postgres -d restored -c "
  select 'auth.users' as t, count(*) from auth.users
  union all select 'profiles', count(*) from public.profiles
  union all select 'entries', count(*) from public.entries
  union all select 'entry_items', count(*) from public.entry_items
  union all select 'journal_entries', count(*) from public.journal_entries
  union all select 'food_items', count(*) from public.food_items
  order by 1;"

echo
echo "If any count above is zero where you expected data, the backup is NOT usable."
echo "Errors during restore: $(grep -ci 'error' "$WORK/restore.log" || true) (see $WORK/restore.log)"
