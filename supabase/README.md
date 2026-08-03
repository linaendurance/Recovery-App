# Back end

The database and the `signup-with-invite` Edge Function live in the Supabase
project `gzhujyagleysqqmhsdyg` (`recovery-nutrition-tracker`).

## What's in here

- `migrations/` — the migrations applied in the security-and-features pass.
  These are the ones this repo authored. The seven earlier migrations
  (`init_schema` through `restrict_coach_usage_to_authenticated_only`) were
  applied before the back end was version-controlled and still live only in
  the project. Pull them down with:

  ```bash
  supabase link --project-ref gzhujyagleysqqmhsdyg
  supabase db pull
  ```

- `functions/signup-with-invite/` — source of the deployed Edge Function.
- `functions/password-check/` — breach-screens a candidate password during the
  password-RESET flow, which goes through Supabase Auth directly and so never
  reaches `signup-with-invite`. Deployed with `verify_jwt = true`: the reset
  link establishes a recovery session first, so a caller always has a token,
  which stops it being used as an open proxy to the HIBP API.
  Deployed with `verify_jwt = false`, which is required: sign-up happens
  before a session exists. That makes it a public endpoint, which is why it
  does its own origin checking and rate limiting.

## Required function secrets

Set these on the Edge Function before the app is used by anyone real:

| Secret | Why |
| --- | --- |
| `ALLOWED_ORIGINS` | Comma-separated exact origins allowed to call sign-up, e.g. `https://recovery.example.com`. Until this is set the function falls back to allowing `localhost` and `*.vercel.app` only — fine for development, not for production. |
| `IP_HASH_SALT` | Long random string. Salts the hash of caller IPs used for rate limiting so the attempt log cannot be reversed into a list of who tried to sign up. |

```bash
supabase secrets set ALLOWED_ORIGINS="https://your-domain" IP_HASH_SALT="$(openssl rand -hex 32)"
```

## Deliberately policy-free tables

`invite_codes` and `signup_attempts` both have RLS enabled with **no policies**.
That is intentional and correct: it denies all access to `anon` and
`authenticated`, leaving only the service-role Edge Function able to read them.
Supabase's linter reports this as an INFO-level `rls_enabled_no_policy` finding
on both tables — it is a false positive here, not something to "fix" by adding
a policy.

## Email delivery — required before real users

Password reset sends mail through Supabase's built-in SMTP, which is rate
limited to a handful of messages per hour and is explicitly not intended for
production. Configure a real provider under *Project Settings → Auth → SMTP*
before anyone depends on being able to recover their account.

Until that is done, the reset flow works but will silently stop delivering
under any real volume — and a reset email that never arrives is
indistinguishable, to the person waiting, from an account that no longer
exists.

## Backups and the restore path

Supabase's free tier gives daily snapshots and no point-in-time recovery. More
to the point, a backup nobody has restored is not a backup — so this repo
carries the tooling to prove both halves.

| Script | What it proves |
| --- | --- |
| `scripts/rebuild-test.sh` | Every migration applies to an empty database and reproduces the deployed schema exactly. Runs in CI on every push. |
| `scripts/backup.sh` | Produces a full logical dump (schema + data, `public` and `auth`) that you hold yourself. |
| `scripts/restore-test.sh` | Restores that dump into a throwaway database and reports row counts, so you find out the file is unusable *before* you need it. |

The rebuild test compares against `supabase/schema.fingerprint`, a committed
hash of every column, constraint, index, policy, function, trigger and
RLS-enabled table. If someone changes production outside a migration, CI fails
with `DRIFT` rather than the divergence going unnoticed until a restore.

**Regenerating the fingerprint** — only after a deliberate schema change that
is already captured in a migration:

```bash
scripts/rebuild-test.sh                     # confirm migrations apply
psql "$SUPABASE_DB_URL" -A -F'|' -t \
  -f scripts/schema-fingerprint.sql > supabase/schema.fingerprint
```

**Backup files contain every user's food log and journal in plain text.**
Encrypt at rest, never commit, never put in unencrypted shared storage.
