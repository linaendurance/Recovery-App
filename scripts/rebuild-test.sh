#!/usr/bin/env bash
# Proves that supabase/migrations can rebuild the deployed schema from nothing.
#
# A backup nobody has restored is not a backup, and a migration set nobody has
# replayed is not a restore path. This applies every migration to an empty
# database, fingerprints the result, and diffs it against the committed
# fingerprint of production.
#
# Requires a local PostgreSQL (16+). Run: scripts/rebuild-test.sh
set -euo pipefail

PORT="${PGTEST_PORT:-54329}"
WORK="${PGTEST_DIR:-/var/tmp/pgtest}"
# Highest installed PostgreSQL, so this is not pinned to one CI image version.
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
if [ -z "$PGBIN" ] || [ ! -x "$PGBIN/initdb" ]; then
  echo "No local PostgreSQL found. Install it, or set PGBIN." >&2
  exit 1
fi
HERE="$(cd "$(dirname "$0")/.." && pwd)"

# initdb refuses to run as root. CI runners are unprivileged so this is a
# no-op there, but it keeps the script usable in a root shell or container.
if [ "$(id -u)" = "0" ]; then
  id -u pgtest >/dev/null 2>&1 || useradd -m pgtest
  mkdir -p "$WORK"; chown -R pgtest:pgtest "$WORK"
  exec su pgtest -c "PGTEST_PORT='$PORT' PGTEST_DIR='$WORK' PGBIN='$PGBIN' bash '$0'"
fi

cleanup() { "$PGBIN/pg_ctl" -D "$WORK/data" stop -m immediate >/dev/null 2>&1 || true; }
trap cleanup EXIT

rm -rf "$WORK"; mkdir -p "$WORK"
"$PGBIN/initdb" -D "$WORK/data" -A trust -U postgres >/dev/null
"$PGBIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -k $WORK" -l "$WORK/pg.log" start >/dev/null
sleep 3

PSQL="psql -h $WORK -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -c "create database rebuild_test;" >/dev/null
PSQL="$PSQL -d rebuild_test"

# The Supabase surface our own DDL references. Not a Supabase clone.
$PSQL >/dev/null <<'SQL'
create role anon; create role authenticated; create role service_role;
create schema if not exists auth;
create schema if not exists extensions;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb
);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
SQL

echo "Applying migrations..."
for f in $(ls "$HERE"/supabase/migrations/*.sql | sort); do
  $PSQL -f "$f" >/dev/null || { echo "FAILED: $(basename "$f")"; exit 1; }
  echo "  ok $(basename "$f")"
done

echo
echo "Running security assertions against the rebuilt schema..."
$PSQL -v ON_ERROR_STOP=1 -f "$HERE/scripts/security-assertions.sql" || {
  echo "SECURITY ASSERTIONS FAILED — a migration has weakened an invariant." >&2
  exit 1
}

echo "Comparing rebuilt schema against committed fingerprint..."
$PSQL -A -F'|' -t -f "$HERE/scripts/schema-fingerprint.sql" > "$WORK/actual.txt"

if diff -u "$HERE/supabase/schema.fingerprint" "$WORK/actual.txt"; then
  echo "MATCH — the repository can rebuild the deployed schema."
else
  echo
  echo "DRIFT — the migrations no longer reproduce the recorded schema."
  echo "Either a migration is missing from the repo, or production was changed"
  echo "outside of a migration. Do not assume the restore path works."
  exit 1
fi
