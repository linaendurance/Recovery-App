-- ============================================================
-- SECURITY FIX (real issue)
-- handle_new_user() is a SECURITY DEFINER trigger function, but it was
-- also exposed as a callable API endpoint (/rest/v1/rpc/handle_new_user)
-- to both anonymous and signed-in users. A trigger function should never
-- be callable directly. Revoking EXECUTE closes that endpoint entirely;
-- the trigger still fires normally, because triggers run as the table
-- owner and don't depend on these grants.
-- ============================================================
revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- ============================================================
-- PERFORMANCE FIX 1 — missing indexes on foreign keys
-- Without these, loading a day's log has to scan the whole table
-- instead of jumping straight to the matching rows. Invisible at
-- 10 entries, very visible at 10,000.
-- ============================================================
create index if not exists entry_items_entry_id_idx on public.entry_items (entry_id);
create index if not exists entry_items_food_item_id_idx on public.entry_items (food_item_id);
create index if not exists invite_codes_created_by_idx on public.invite_codes (created_by);
create index if not exists invite_codes_used_by_idx on public.invite_codes (used_by);

-- ============================================================
-- PERFORMANCE FIX 2 — RLS policies re-evaluating auth.uid() per row
-- Written as auth.uid(), Postgres re-runs that function once for EVERY
-- row it checks. Wrapped in (select auth.uid()), it runs once per query
-- and the result is reused. Identical security, dramatically less work.
-- ============================================================

drop policy "profiles are viewable by their owner" on public.profiles;
create policy "profiles are viewable by their owner"
  on public.profiles for select
  using ((select auth.uid()) = id);

drop policy "profiles are editable by their owner" on public.profiles;
create policy "profiles are editable by their owner"
  on public.profiles for update
  using ((select auth.uid()) = id);

drop policy "users manage only their own entries" on public.entries;
create policy "users manage only their own entries"
  on public.entries for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy "users manage only items on their own entries" on public.entry_items;
create policy "users manage only items on their own entries"
  on public.entry_items for all
  using (exists (
    select 1 from public.entries e
    where e.id = entry_items.entry_id and e.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.entries e
    where e.id = entry_items.entry_id and e.user_id = (select auth.uid())
  ));

drop policy "users manage only their own journal entries" on public.journal_entries;
create policy "users manage only their own journal entries"
  on public.journal_entries for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
