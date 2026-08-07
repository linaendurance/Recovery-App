-- Security assertions, run against the database rebuilt from migrations.
--
-- These cannot be checked by grepping migration files. Migration HISTORY is not
-- current STATE: `add_coach_usage_limit` grants increment_coach_usage to
-- authenticated, and a later migration revokes it. A static scan sees the grant
-- and cries wolf; only the rebuilt schema knows what is actually true.
--
-- Run by scripts/rebuild-test.sh after every migration has been applied, so a
-- migration that quietly re-opens a privilege fails CI rather than shipping.
-- Each assertion raises, so the first failure aborts with a readable message.

do $$
declare n int; ok boolean;
begin
  -- 1. RLS on every table in public. A table without it is fully readable by
  --    anyone holding the anon key, which is public by design.
  select count(*) into n
  from pg_class c
  where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
    and not c.relrowsecurity;
  if n > 0 then
    raise exception 'SECURITY: % table(s) in public have RLS disabled', n;
  end if;

  -- 2. Privileged RPCs take a user id as a PARAMETER instead of from
  --    auth.uid(), so a client able to call one could act as any user.
  --    They must be service_role only.
  for n in
    select 1 from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('increment_coach_usage','register_signup_attempt',
                        'mark_signup_success','handle_new_user')
      and (has_function_privilege('authenticated', p.oid, 'EXECUTE')
        or has_function_privilege('anon', p.oid, 'EXECUTE'))
  loop
    raise exception 'SECURITY: a privileged RPC is executable by anon or authenticated';
  end loop;

  -- 3. profiles.birth_year must not be writable by the role being age-gated.
  --    This was exploitable: a user could PATCH their own birth_year and walk
  --    through the 16+ check. See README "Invariants".
  if has_column_privilege('authenticated', 'public.profiles', 'birth_year', 'UPDATE') then
    raise exception 'SECURITY: authenticated can UPDATE profiles.birth_year — the age gate is bypassable';
  end if;
  if has_column_privilege('authenticated', 'public.profiles', 'consent_version', 'UPDATE') then
    raise exception 'SECURITY: authenticated can UPDATE profiles.consent_version — consent is not evidence';
  end if;

  -- 4. display_name must REMAIN writable. A security fix that breaks the
  --    product is still a broken product, and this is the check that would
  --    have caught over-revoking.
  if not has_column_privilege('authenticated', 'public.profiles', 'display_name', 'UPDATE') then
    raise exception 'REGRESSION: authenticated can no longer update display_name';
  end if;

  -- 5. Deny-all tables must stay unreadable. invite_codes leaks who invited
  --    whom; signup_attempts holds IP hashes.
  if has_table_privilege('authenticated', 'public.invite_codes', 'SELECT')
     or has_table_privilege('anon', 'public.invite_codes', 'SELECT') then
    raise exception 'SECURITY: invite_codes is readable by a client role';
  end if;
  if has_table_privilege('authenticated', 'public.signup_attempts', 'SELECT')
     or has_table_privilege('anon', 'public.signup_attempts', 'SELECT') then
    raise exception 'SECURITY: signup_attempts is readable by a client role';
  end if;

  -- 6. Every UPDATE policy needs a WITH CHECK, explicitly. Without one Postgres
  --    silently reuses USING, which happens to be correct here but is a default
  --    rather than a decision — and defaults do not survive refactoring.
  select count(*) into n
  from pg_policies
  where schemaname = 'public' and cmd = 'UPDATE' and with_check is null;
  if n > 0 then
    raise exception 'SECURITY: % UPDATE policy/policies have no explicit WITH CHECK', n;
  end if;

  -- 7. The only unbounded user-controlled write path was journal answers.
  --    Without a size bound one user can exhaust the database for everyone.
  select count(*) into n
  from pg_constraint
  where conrelid = 'public.journal_entries'::regclass and contype = 'c'
    and conname = 'journal_entries_answers_size';
  if n = 0 then
    raise exception 'SECURITY: journal_entries.answers has no size bound';
  end if;

  raise notice 'All security assertions passed.';
end $$;
