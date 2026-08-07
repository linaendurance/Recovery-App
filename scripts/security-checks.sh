#!/usr/bin/env bash
# Static security guardrails. Runs in CI on every push.
#
# These are the mistakes that are cheap to make and expensive to discover. Each
# one below has a specific reason to exist rather than being a generic lint:
# every check either corresponds to something that actually went wrong in this
# repository, or to the single failure mode that would be unrecoverable.
#
# Deliberately NOT a general-purpose scanner. A check that fires on things that
# are fine trains people to ignore it, and an ignored gate is worse than no gate
# — which is why `npm audit` runs informationally in CI rather than as a wall.
set -uo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$HERE"

fails=0
pass() { printf '  \033[32mok\033[0m    %s\n' "$1"; }
fail() { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; shift; [ $# -gt 0 ] && printf '        %s\n' "$@"; fails=$((fails+1)); }

echo "Security guardrails"

# ---------------------------------------------------------------------------
# 1. The service-role key must never be reachable from the browser.
#
# It bypasses RLS entirely — and RLS is this app's whole security boundary. A
# single import into client code would expose every user's journal. The key
# lives only in Supabase Edge Function env, and nothing under app/, lib/ or
# components/ has any business naming it.
# ---------------------------------------------------------------------------
if grep -rnE "SERVICE_ROLE|service_role" app lib components 2>/dev/null | grep -v "^\S*:.*//" | grep -q .; then
  fail "service-role key referenced in client-reachable code" \
       "$(grep -rnE 'SERVICE_ROLE|service_role' app lib components 2>/dev/null | head -3)"
else
  pass "no service-role reference in app/, lib/, components/"
fi

# ---------------------------------------------------------------------------
# 2. A service-role JWT must never reach the built bundle.
#
# Checks the compiled output rather than the source, because that is what
# actually ships. A JWT with "role":"service_role" base64-encodes to a
# recognisable fragment.
# ---------------------------------------------------------------------------
if [ -d .next ]; then
  if grep -rl "cm9sZSI6InNlcnZpY2Vfcm9sZS" .next/static .next/server 2>/dev/null | grep -q .; then
    fail "a service_role JWT is present in the build output"
  else
    pass "no service_role JWT in build output"
  fi
else
  pass "no build output to scan (run after npm run build for full coverage)"
fi

# ---------------------------------------------------------------------------
# 3. No migration may disable RLS.
#
# RLS is the primary boundary. Turning it off on any table exposes every row to
# anyone holding the anon key, which is public by design.
# ---------------------------------------------------------------------------
if grep -rniE "disable[[:space:]]+row[[:space:]]+level[[:space:]]+security" supabase/migrations 2>/dev/null | grep -q .; then
  fail "a migration disables row level security" \
       "$(grep -rniE 'disable[[:space:]]+row[[:space:]]+level[[:space:]]+security' supabase/migrations | head -3)"
else
  pass "no migration disables RLS"
fi

# ---------------------------------------------------------------------------
# 4. Every new table must enable RLS in the same migration that creates it.
#
# A table created without RLS is fully readable and writable by anyone with the
# anon key. Catching it at the migration is the only cheap moment — afterwards
# it needs a probe against a live database to notice.
# ---------------------------------------------------------------------------
missing=""
for f in supabase/migrations/*.sql; do
  # tables created in this migration, ignoring temp/unlogged and IF NOT EXISTS noise
  for t in $(grep -oiE "create table (if not exists )?(public\.)?[a-z_]+" "$f" 2>/dev/null \
             | sed -E 's/.*[[:space:]](public\.)?//' | sort -u); do
    if ! grep -qiE "alter table (public\.)?${t}[[:space:]]+enable row level security" "$f"; then
      missing="${missing}${f##*/}: ${t}"$'\n'
    fi
  done
done
if [ -n "$missing" ]; then
  fail "table(s) created without ENABLE ROW LEVEL SECURITY in the same migration" "$missing"
else
  pass "every created table enables RLS in the same migration"
fi

# ---------------------------------------------------------------------------
# 5. No policy may be written as USING (true) on a user-data table.
#
# food_items is the one legitimate exception: shared read-only reference data,
# SELECT-granted only. Anywhere else it means "every authenticated user can see
# every row", which is the single most common critical bug in this class of app.
#
# Parses whole CREATE POLICY statements rather than single lines — the table
# name and the USING clause sit on different lines, so a line-based grep either
# misses the exception or fires on it.
# # ---------------------------------------------------------------------------
bad_policies=$(python3 - <<'PYEOF'
import glob, re
bad = []
for path in sorted(glob.glob("supabase/migrations/*.sql")):
    sql = open(path).read()
    for stmt in re.findall(r"create\s+policy.*?;", sql, re.S | re.I):
        if re.search(r"using\s*\(\s*true\s*\)", stmt, re.I):
            m = re.search(r"\bon\s+(?:public\.)?(\w+)", stmt, re.I)
            table = m.group(1) if m else "?"
            if table != "food_items":
                bad.append(f"{path.split('/')[-1]}: policy on {table}")
print("\n".join(bad))
PYEOF
)
if [ -n "$bad_policies" ]; then
  fail "a policy uses USING (true) on a user-data table" "$bad_policies"
else
  pass "no USING (true) outside the food_items reference table"
fi

# ---------------------------------------------------------------------------
# 6. .env files must never be committed.
#
# .env.example is intentionally tracked and must hold placeholders only — it
# previously carried the real production project ref, which meant the documented
# `cp .env.example .env.local` pointed local development at the live database.
# ---------------------------------------------------------------------------
if git ls-files | grep -qE "^\.env($|\.local|\..*\.local)"; then
  fail "an .env file is tracked by git" "$(git ls-files | grep -E '^\.env' | head -3)"
elif grep -qE "^NEXT_PUBLIC_SUPABASE_URL=https://[a-z]{20}\.supabase\.co" .env.example 2>/dev/null; then
  fail ".env.example contains a real project ref, not a placeholder" \
       "cp .env.example .env.local would point development at production"
else
  pass ".env files not tracked; .env.example holds placeholders"
fi

# ---------------------------------------------------------------------------
# 7. Privilege invariants are checked against the REBUILT DATABASE, not here.
#
# Migration history is not current state: add_coach_usage_limit grants
# increment_coach_usage to authenticated and a later migration revokes it. A
# static scan sees the grant and cries wolf. scripts/security-assertions.sql
# runs inside rebuild-test.sh against a real schema built from the migrations,
# which is the only place the answer is actually knowable.
# ---------------------------------------------------------------------------
if [ -f scripts/security-assertions.sql ]; then
  pass "privilege invariants asserted against the rebuilt DB (security-assertions.sql)"
else
  fail "scripts/security-assertions.sql is missing" \
       "privilege state cannot be checked from migration text alone"
fi

# ---------------------------------------------------------------------------
# 8. The reportError scrubbing choke point must stay intact.
#
# Grepping call sites for words like "journal" or "password" fires on the fixed
# LABELS ("journal.load", "reset.passwordCheck") which are exactly what belongs
# there — a false positive that would train everyone to ignore this script.
#
# What is actually checkable is that the single choke point still scrubs:
# truncation and the per-load cap client-side, truncation server-side. This app
# stores journal writing about somebody's eating disorder; none of it may reach
# a log line.
# ---------------------------------------------------------------------------
missing_guard=""
grep -q "function scrub" lib/reportError.ts || missing_guard="scrub() removed"
grep -q "MAX_REPORTS_PER_LOAD" lib/reportError.ts || missing_guard="$missing_guard per-load cap removed"
grep -q "value.slice(0, 200)" lib/reportError.ts || missing_guard="$missing_guard truncation removed"
grep -q "MAX_VALUE_CHARS" netlify/functions/report-error.mjs || missing_guard="$missing_guard server truncation removed"
if [ -n "$missing_guard" ]; then
  fail "the reportError scrubbing choke point has been weakened" "$missing_guard"
else
  pass "reportError scrubbing choke point intact (client + server)"
fi

# ---------------------------------------------------------------------------
# 9. Invite codes must never be committed.
#
# THIS REPOSITORY IS PUBLIC. Sign-up is gated by nothing except an invite code,
# so a code in a tracked file is an open registration form for anyone reading
# GitHub. Codes are distributed out of band — a message to the person, never a
# file.
#
# Two precise patterns rather than one broad one. A generic "CODE-CODE" shape
# was tried and rejected: it fired on CVE-2025-29927, YOUR-PROJECT-REF and
# ALLOW-LIST. A check that cries wolf gets ignored, and an ignored gate is
# worse than no gate.
# ---------------------------------------------------------------------------
leaked=""
if git grep -qIE "\bDEMO-[A-Z0-9]{4,}" -- . 2>/dev/null; then
  leaked="$(git grep -nIE '\bDEMO-[A-Z0-9]{4,}' -- . | head -3)"
fi
if git grep -qIiE "insert +into +(public\.)?invite_codes" -- . 2>/dev/null; then
  leaked="${leaked}"$'\n'"$(git grep -nIiE 'insert +into +(public\.)?invite_codes' -- . | head -3)"
fi
if [ -n "${leaked// /}" ]; then
  fail "an invite code (or a migration seeding one) is committed to a PUBLIC repo" "$leaked"
else
  pass "no invite codes committed"
fi

echo
if [ "$fails" -eq 0 ]; then
  echo "All security guardrails passed."
  exit 0
fi
echo "$fails guardrail(s) FAILED — this must not be merged."
exit 1
