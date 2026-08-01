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
| `/app` | **Today** — the day's food fact, a timeline ribbon of when you ate, what you've eaten so far, and nutrient adequacy bars. |
| `/app/log` | **Log a meal** — three steps: time, eating occasion, then foods via a fuzzy autocomplete with portion multipliers. |
| `/app/journal` | **Journal** — evening reflection prompts that rotate by weekly theme. |
| `/app/summary` | **Summary** — nutrition totals, meal timing, food diversity, written recovery observations, and per-entry deletion. |
| `/app/data` | **Data** — saved days, full JSON export, and permanent delete-everything. |

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

## What this repo does not contain

This is the front end only. It expects a Supabase project providing:

- Tables `profiles`, `food_items`, `entries`, `entry_items` and
  `journal_entries`, with Row Level Security scoping every row to its owning
  `user_id`.
- A cascade delete from `entries` to `entry_items`.
- A `log_entry` RPC that writes an entry and its items in one transaction.
- The `signup-with-invite` Edge Function.

## Verifying a deployment

1. Visit the deployed URL — it should redirect to `/login`.
2. Sign in with a made-up email — expect "That email and password don't match an account."
3. At `/signup`, use a real invite code, a name, an email, and an 8+ character password.
4. Expect to land on `/app`.
5. Log a meal at `/app/log`, then confirm it appears on Today and in the Summary.
6. Sign out — expect to land back on `/login`.
7. Visit `/app` directly while signed out — expect a redirect to `/login`. This
   confirms the route protection is real, not just a UI choice.
