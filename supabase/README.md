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
