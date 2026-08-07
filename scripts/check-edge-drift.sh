#!/usr/bin/env bash
# Proves the DEPLOYED Edge Functions are the ones in this repository.
#
# WHY THIS EXISTS: the two Edge Functions hold security decisions that exist
# nowhere else — the origin allow-list, the server-side 16+ age gate, and
# breach screening of every password. Those live in the repo, get reviewed in
# the repo, and are asserted by CI in the repo. None of that means anything if
# what is RUNNING is a different file.
#
# It is not hypothetical: signup-with-invite was once claimed to match the
# deployment on the strength of seven matching markers, and had in fact
# diverged. Markers are not a diff. This compares bytes.
#
# Requires SUPABASE_ACCESS_TOKEN (a personal access token from
# https://supabase.com/dashboard/account/tokens) and SUPABASE_PROJECT_REF.
# Without them it SKIPS rather than fails: an unconfigured check that blocks
# every build gets deleted, and then there is no check at all. Set them as
# repository secrets to turn it into a real gate.
set -uo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$HERE"

TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
REF="${SUPABASE_PROJECT_REF:-}"

if [ -z "$TOKEN" ] || [ -z "$REF" ]; then
  echo "Edge function drift: SKIPPED (SUPABASE_ACCESS_TOKEN / SUPABASE_PROJECT_REF not set)"
  echo "  Set both as repository secrets to verify deployed functions match the repo."
  exit 0
fi

API="https://api.supabase.com/v1/projects/$REF/functions"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

drift=0
echo "Edge function drift"

for dir in supabase/functions/*/; do
  slug="$(basename "$dir")"
  local_file="$dir/index.ts"
  [ -f "$local_file" ] || continue

  # The body endpoint returns the deployed source as an eszip; the plain
  # /body route serves the raw entrypoint for single-file functions.
  code=$(curl -sS -o "$WORK/$slug.ts" -w '%{http_code}' \
    -H "Authorization: Bearer $TOKEN" "$API/$slug/body")

  if [ "$code" != "200" ]; then
    printf '  \033[31mFAIL\033[0m  %s: could not fetch deployed source (HTTP %s)\n' "$slug" "$code"
    drift=$((drift+1))
    continue
  fi

  if diff -q "$local_file" "$WORK/$slug.ts" >/dev/null 2>&1; then
    printf '  \033[32mok\033[0m    %s matches the deployed version\n' "$slug"
  else
    printf '  \033[31mFAIL\033[0m  %s DIFFERS from what is deployed\n' "$slug"
    diff -u "$local_file" "$WORK/$slug.ts" | head -40
    drift=$((drift+1))
  fi
done

echo
if [ "$drift" -eq 0 ]; then
  echo "Deployed edge functions match the repository."
  exit 0
fi
# Deliberately the same exit code for "differs" and "could not check". An
# unverifiable deployment is not a passing one — treating a failed fetch as
# success is how a drift check becomes decorative.
echo "$drift function(s) could not be confirmed to match the repository."
echo "Either the deployed code differs from the reviewed code, or it could not be read."
exit 1
