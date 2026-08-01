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
npm run build    # production build
```

There is no `.env` file to create — see "Why there's no `.env`" below.

## Routes

| Route | What it does |
| --- | --- |
| `/` | Redirects to `/app` when signed in, `/login` otherwise. |
| `/login`, `/signup` | The two auth screens. Sign-up requires an invite code. |
| `/app` | **Today** — timeline ribbon of when you ate, what you've eaten, facts selected from your own log, and nutrient adequacy bars. |
| `/app/log` | **Log a meal** — four steps: time, eating occasion, foods via fuzzy autocomplete, then how the episode felt. |
| `/app/journal` | **Journal** — evening reflection prompts that rotate by weekly theme, plus an always-present free-text slot. |
| `/app/summary` | **Summary** — nutrition totals, meal timing, fuel consistency, food diversity, recovery observations, per-entry deletion. |
| `/app/history` | **History** — meal timing across every logged day including overnight fasts, and every past reflection. |
| `/app/sources` | **Sources** — every reference value with its citation, and an explicit list of the numbers the app invented itself. |
| `/app/data` | **Data** — saved days, full JSON export, and permanent delete-everything. |

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

## Why there's no `.env`

The Supabase project URL and anon key aren't secret — they're meant to be
public, and are safe sitting in the source files (`middleware.ts`,
`lib/supabase/client.ts`, `lib/supabase/server.ts`). Privacy is enforced by Row
Level Security in the database, not by hiding these two values. Nothing in this
app currently requires a real environment-variable secret.

If the app ever gains a genuine server-side secret — an Anthropic API key for
the planned Coach tab, for instance — that one *does* belong in an environment
variable and must never be committed.

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

### Still outstanding

- **Leaked-password protection is disabled** in Supabase Auth. Turn it on in
  Dashboard → Authentication → Policies; it checks new passwords against
  HaveIBeenPwned. Cannot be set from a migration.
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
