-- ============================================================
-- Recovery Nutrition Tracker — initial schema
-- Every table holding personal data has Row Level Security (RLS)
-- turned on. RLS is enforced by Postgres itself, at the database
-- layer — so even a bug in the app's code cannot make one user's
-- request return another user's rows. This is the single most
-- important security decision in this schema.
-- ============================================================

-- 1. Profiles: one row per signed-up user.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are viewable by their owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles are editable by their owner"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile the moment someone signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Invite codes: gates signup to people who were actually invited.
-- No policies are defined on purpose. With RLS on and zero policies,
-- ordinary signed-in users get zero access to this table at all —
-- only the server-side signup route (using the service-role key,
-- which bypasses RLS) can read or mark a code as used.
create table public.invite_codes (
  code text primary key,
  created_by uuid references auth.users(id),
  used_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  used_at timestamptz
);

alter table public.invite_codes enable row level security;

-- 3. Food items: shared reference data. Every signed-in user can
-- read it; nobody can write to it from the app — only migrations
-- change it, so the data can't be corrupted by a client bug.
create table public.food_items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  food_group text not null check (food_group in ('protein','carbs','fats','fruit','veg','dairy','legumes','nuts')),
  portion numeric not null,
  unit text not null check (unit in ('g','ml')),
  protein numeric not null default 0,
  fibre numeric not null default 0,
  iron numeric not null default 0,
  calcium numeric not null default 0,
  density text not null check (density in ('low','medium','high'))
);

alter table public.food_items enable row level security;

create policy "food items are readable by any signed-in user"
  on public.food_items for select
  to authenticated
  using (true);

-- 4. Entries: one row per logged eating occasion.
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  meal_type text not null,
  mins_since_midnight int not null check (mins_since_midnight between 0 and 1439),
  logged_at timestamptz not null default now()
);

create index entries_user_date_idx on public.entries (user_id, entry_date);

alter table public.entries enable row level security;

create policy "users manage only their own entries"
  on public.entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. Entry items: the specific foods (and quantity) within one entry.
create table public.entry_items (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  food_item_id uuid not null references public.food_items(id),
  qty numeric not null check (qty > 0)
);

alter table public.entry_items enable row level security;

create policy "users manage only items on their own entries"
  on public.entry_items for all
  using (exists (
    select 1 from public.entries e
    where e.id = entry_items.entry_id and e.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.entries e
    where e.id = entry_items.entry_id and e.user_id = auth.uid()
  ));

-- 6. Journal entries: one per user per day.
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  format text not null,
  answers jsonb not null default '{}'::jsonb,
  saved_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

alter table public.journal_entries enable row level security;

create policy "users manage only their own journal entries"
  on public.journal_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
