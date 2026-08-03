#!/usr/bin/env bash
# Full logical backup of the Supabase database, restorable with psql.
#
# Supabase's own backups on the free tier are daily snapshots with no
# point-in-time recovery, and — more importantly — nobody has ever restored
# one. This produces a backup you hold, in a format you can test.
#
# Usage:
#   export SUPABASE_DB_URL='postgresql://postgres:PASSWORD@db.<ref>.supabase.co:5432/postgres'
#   scripts/backup.sh [output-dir]
#
# The connection string is in the Supabase dashboard under
# Project Settings -> Database -> Connection string (URI).
#
# WARNING: the output contains every user's food log and journal in plain text.
# Treat it as the most sensitive file the project produces: encrypt it at rest,
# never commit it, never put it in shared storage unencrypted.
set -euo pipefail

: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL first — see the comment at the top of this script}"
OUT="${1:-./backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$OUT"

FILE="$OUT/recovery-tracker-$STAMP.sql"

echo "Dumping schema + data (public and auth)..."
pg_dump "$SUPABASE_DB_URL" \
  --no-owner --no-privileges \
  --schema=public --schema=auth \
  --file="$FILE"

gzip -f "$FILE"
echo "Wrote $FILE.gz ($(du -h "$FILE.gz" | cut -f1))"

cat <<'NOTE'

A backup you have not restored is not a backup. To verify this one:

  scripts/restore-test.sh backups/<file>.sql.gz

That applies the dump to a scratch local database and reports the row counts,
so you know the file is complete and readable BEFORE you need it.
NOTE
