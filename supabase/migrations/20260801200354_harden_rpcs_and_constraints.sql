-- 1. increment_coach_usage took the daily cap as a CALLER-SUPPLIED parameter and
-- was executable by `authenticated` over /rest/v1/rpc. Any signed-in user could
-- call it with p_limit => 999999 and never be rate limited. The cap is now a
-- server-side constant, and the function is callable only by service_role, so
-- the future Coach edge function enforces the limit rather than the browser.
drop function if exists public.increment_coach_usage(integer);
drop function if exists public.increment_coach_usage();

create function public.increment_coach_usage(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_count int;
  v_limit constant int := 40;
begin
  insert into public.coach_usage (user_id, usage_date, message_count)
  values (p_user_id, current_date, 1)
  on conflict (user_id, usage_date)
  do update set message_count = coach_usage.message_count + 1
  returning message_count into v_count;

  return v_count <= v_limit;
end;
$$;

revoke all on function public.increment_coach_usage(uuid) from public;
revoke all on function public.increment_coach_usage(uuid) from anon;
revoke all on function public.increment_coach_usage(uuid) from authenticated;
grant execute on function public.increment_coach_usage(uuid) to service_role;

-- 2. meal_type was free text with no constraint: log_entry accepted any string
-- of any length from the client and stored it. Pin it to the list the UI offers.
alter table public.entries
  add constraint entries_meal_type_check
  check (meal_type in (
    'Breakfast','Morning snack','Lunch','Afternoon snack',
    'Dinner','Evening snack','Other'
  ));

-- 3. entry_date was unbounded — an entry could be filed in year 9999.
-- CHECK cannot reference current_date (not immutable), so bound it statically
-- here and reject future dates inside log_entry.
alter table public.entries
  add constraint entries_entry_date_sane
  check (entry_date >= date '2020-01-01' and entry_date < date '2100-01-01');
