# Recovery Nutrition Tracker

A private food, meal-timing and recovery journal. Next.js 14 (App Router) on
Supabase, gated behind an invite code.

The app is deliberately built around *timing, variety and adequacy* — not
calories. There are no calorie figures anywhere in it, by design, and nutrient
references are described as floors below which deficiency risk rises, never as
targets or ceilings.

## Running it locally

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # 40 unit tests over the pure logic
npm run build    # production build
```

Requires Node 20+ (pinned in `package.json` engines and `netlify.toml`).

## Configuration

Copy `.env.example` to `.env.local`:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Which Supabase project to talk to. Also derives the Edge Function base URL and the `connect-src` origin in the Content-Security-Policy, so those can never drift from it. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public API key. Grants nothing on its own — every table is protected by Row Level Security. |

Both are public by design. They are environment variables so the app can be
pointed at a staging database **without editing source**, not because they are
secret. A missing value fails the build with an explicit message rather than
producing an app that renders and then breaks on first use.

Set the same two variables in Netlify under *Site configuration → Environment
variables* before the first deploy, or the build will fail.

## Routes

| Route | What it does |
| --- | --- |
| `/` | Redirects to `/app` when signed in, `/login` otherwise. |
| `/login`, `/signup` | The two auth screens. Sign-up requires an invite code. |
| `/forgot`, `/reset` | Password reset. `/forgot` emails a link; `/reset` consumes the recovery session and sets the new password, screening it against known breaches first. |
| `/app` | **Today** — timeline ribbon of when you ate, what you've eaten, facts selected from your own log, and nutrient adequacy bars. |
| `/app/log` | **Log a meal** — four steps: time, eating occasion, foods via fuzzy autocomplete, then how the episode felt. |
| `/app/journal` | **Journal** — evening reflection prompts that rotate by weekly theme, plus an always-present free-text slot. |
| `/app/summary` | **Summary** — nutrition totals, meal timing, fuel consistency, food diversity, recovery observations, per-entry deletion. |
| `/app/history` | **History** — meal timing across every logged day including overnight fasts, and every past reflection. |
| `/app/sources` | **Sources** — every reference value with its citation, and an explicit list of the numbers the app invented itself. |
| `/app/data` | **Data** — saved days, full JSON export, delete-everything, and permanent account deletion. |
| `/privacy` | **Privacy notice** — public, readable before creating an account. Versioned; `profiles.consent_version` records which text each person accepted. |

## The four things this app is for

1. **Food logging for restriction and binge patterns.** Each eating occasion
   records a "this felt excessive or out of my control" marker, how you were
   feeling, and what was going on — the CBT-E monitoring record, minus
   compensatory-behaviour logging, which is deliberately excluded as it is not
   safe to self-monitor without a clinician. The marker is self-report only;
   the app never infers it from quantity.
2. **Journalling.** Prompts rotate by theme from each person's own start date.
   Answers are stored against stable prompt ids with the question text saved
   alongside, so a reflection written in March still reads correctly in
   December after the prompt bank has changed.
3. **Time between meals.** Gaps within a day on Today and Summary; longest gap,
   overnight fast and eating-occasion counts across every logged day on
   History. The overnight fast can only be computed across days, because it
   crosses midnight into a different `entry_date`.
4. **Sourced nutrition information.** Reference values are age-banded (13-18
   vs 19+) and every one carries a citation. Facts on Today are selected from
   what was actually logged rather than from the date, and each says why it
   appeared. Carbohydrate, fat and protein are tracked per eating occasion, so
   "did this meal carry all three" is answerable — that is the fuel-consistency
   view.

## Reference values and honesty about them

Reference floors come from the Institute of Medicine Dietary Reference Intakes
and change with age band — calcium is 1300 mg/d before about 19 against
1000 mg/d after, which is the only reason sign-up asks for a year of birth.
Clinical claims about energy availability and menstrual function are cited to
the IOC REDs consensus, NICE NG69, or Fairburn's CBT-E manual.

Total fat has **no gram floor**, because none is published — the reference is a
percentage of energy intake, which this app cannot compute since it holds no
calorie figures by design. It is shown as an amount rather than against a fake
target.

Three numbers on screen are the app's own heuristics, not published values: the
3 h 30 min "long gap" threshold and the per-meal grams at which carbohydrate,
fat and protein count as "present". All three are listed as such on `/app/sources`.

## How the code is organised

- `middleware.ts` — runs on every request. Refreshes the Supabase session
  cookie and keeps signed-out people out of `/app` (and signed-in people out
  of `/login` / `/signup`).
- `app/app/layout.tsx` — re-checks the session server-side and renders the tab
  bar. This check is deliberately redundant with the middleware: route
  protection does not rest on middleware alone.
- `lib/supabase/client.ts` / `server.ts` — the two ways the app talks to
  Supabase (browser vs. server). Neither ever uses the service-role key, so
  both are fully subject to Row Level Security.
- `lib/foods.ts` — the food list (fetched once per session and cached) plus the
  fuzzy search behind the autocomplete.
- `lib/analysis.ts` — turns a day's entries into totals, gaps, food-group
  coverage and the written recovery observations. Holds the nutrient reference
  floors.
- `lib/facts.ts` — morning food facts and evening recovery insights. Both
  rotate once per calendar day, the same for everyone.
- `lib/journalBank.ts` — journal prompts, organised by theme. Rotation is
  anchored to each person's own sign-up date, so "week one" looks like week one
  whenever they joined; formats change after roughly a month of use.
- `lib/dates.ts` — date/time formatting plus the stable hash that makes the
  rotating content deterministic per day without any server-side state.

## Why sign-up isn't a plain Supabase call

`app/signup/page.tsx` doesn't call Supabase's sign-up API directly — it calls a
Supabase Edge Function (`signup-with-invite`, deployed separately from this
repo) that checks the invite code first. That function is the only code
anywhere that touches the database's service-role key, and that key never
leaves Supabase's own servers.

## Testing

```bash
npm run lint      # react-hooks rules — the only check that catches a
                  # conditional hook, which crashed two screens once
npm test          # 40 unit tests over the pure logic
npm run e2e       # renders every signed-in screen in a real browser
npm run a11y      # axe-core, WCAG 2.1 A + AA, every screen
npm run audit:mobile  # overflow + effective tap targets at 320-430px
```

The end-to-end run needs two servers:

```bash
npm run mock &                                    # fixture Supabase, port 54321
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=mock npm run build && npm start &
npm run e2e
```

`scripts/mock-supabase.js` is a **fixture server, not a Supabase emulator**. It
enforces no RLS and runs none of the real SQL, so a passing run says the React
renders and the data flows — nothing about whether the database agrees. It
exists because it is the only check that renders a component twice, and every
crash-level bug in this app has lived in the loading → loaded transition.

Its fixtures are deliberately hostile: a day with a long gap, an occasion
missing a macro, one marked as feeling excessive, and one entry whose nested
select came back `null` — the exact shape that hung History permanently.

## Invariants a new developer must not break

- **Food nutrient values are immutable.** Enforced by a database trigger, not
  convention. `entry_items` stores only `(food_item_id, qty)`, so editing a
  value would silently rewrite every historical day's totals. Corrections
  insert a NEW row and set `deprecated_at`/`replaced_by` on the old one. There
  is an explicit escape hatch (`set local app.allow_food_value_change = 'on'`)
  for deliberate migrations.
- **The repo must be able to rebuild the schema.** `scripts/rebuild-test.sh`
  applies every migration to an empty database and diffs the result against
  `supabase/schema.fingerprint`. It runs in CI. If it reports `DRIFT`, either a
  migration is missing from the repo or production was changed outside one —
  in both cases the restore path is broken until it is fixed.

## Module boundaries worth preserving

`lib/foods.ts` holds pure logic (types, labels, fuzzy search) and imports
nothing that touches the network. Fetching lives in `lib/foodsRepo.ts`. These
were one file until importing `searchFoods` in a test dragged in the Supabase
client and its configuration, and the whole test suite failed. Keep I/O out of
the pure modules — the test suite is the thing that notices when it creeps back
in.

## Back end

Schema, RLS policies, RPCs and the Edge Function live in `supabase/` — see
`supabase/README.md`. Two secrets must be set on the Edge Function before real
use: `ALLOWED_ORIGINS` and `IP_HASH_SALT`.

## Security posture

- Every table is scoped by Row Level Security to its owning `user_id`.
  `invite_codes` and `signup_attempts` have RLS on with **no policies**, which
  denies all client access and leaves them readable only by the service-role
  Edge Function. Supabase's linter flags that as INFO `rls_enabled_no_policy`
  on both — a false positive, not something to fix.
- `log_entry` is SECURITY INVOKER and takes the user from `auth.uid()`, so it
  cannot be made to write to another account.
- Privileged RPCs (`increment_coach_usage`, `register_signup_attempt`,
  `mark_signup_success`) are `service_role`-only; `authenticated` cannot reach
  them over `/rest/v1/rpc`.
- Security headers including a CSP are set in `next.config.mjs`. `connect-src`
  is restricted to Supabase, so injected script cannot post journal content to
  an arbitrary host.
- Fonts are self-hosted via `next/font`; the app makes no third-party requests
  at runtime and runs no analytics.

### Abuse and erasure controls

- Sign-up is limited per IP on both failed *and* successful attempts, so
  removing the invite gate does not leave account creation unbounded.
- `log_entry` caps 40 eating occasions per date and 40 foods per occasion.
- Passwords are screened against Have I Been Pwned using k-anonymity.
- `delete_my_account()` removes the auth user, cascading to profile, entries,
  entry items and journal answers.
- Turnstile CAPTCHA is wired but inactive until `TURNSTILE_SECRET` is set.

### Still outstanding

- **Supabase Auth's own leaked-password protection is still disabled** (a
  dashboard toggle; it cannot be set from a migration). Both app paths that set
  a password — sign-up and reset — already screen against Have I Been Pwned via
  Edge Functions, so this is defence in depth rather than an open gap. Turning
  it on would also cover any auth flow added later that bypasses those.
- **SMTP is not configured.** Password reset sends through Supabase's built-in
  sender, which is rate limited and not for production.
- `npm audit` reports advisories that are only fixed in Next 15/16. This app is
  on 14.2.35, the last of the 14.x line, so clearing them means a major upgrade.

## Verifying a deployment

1. Visit the deployed URL — it should redirect to `/login`.
2. Sign in with a made-up email — expect "That email and password don't match an account."
3. At `/signup`, use a real invite code, a name, an email, and an 8+ character password.
4. Expect to land on `/app`.
5. Log a meal at `/app/log`, then confirm it appears on Today and in the Summary.
6. Sign out — expect to land back on `/login`.
7. Visit `/app` directly while signed out — expect a redirect to `/login`. This
   confirms the route protection is real, not just a UI choice.
