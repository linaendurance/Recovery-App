-- Tracks message COUNTS only, per user per day — never message content.
-- This is what makes the cost ceiling provable: no client can inflate or
-- reset their own count, because there is no insert/update policy for
-- regular users at all. Only the function below (security definer) can
-- write to it, and it always writes for auth.uid(), never a client-
-- supplied id, so no one can increment on someone else's behalf either.
--
-- NOTE: p_limit being caller-supplied was later found to be a real
-- vulnerability and is fixed in 20260801200354_harden_rpcs_and_constraints.
create table public.coach_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  message_count int not null default 0,
  primary key (user_id, usage_date)
);

alter table public.coach_usage enable row level security;

create policy "users can view only their own usage"
  on public.coach_usage for select
  using ((select auth.uid()) = user_id);

create or replace function public.increment_coach_usage(p_limit int default 40)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.coach_usage (user_id, usage_date, message_count)
  values (auth.uid(), current_date, 1)
  on conflict (user_id, usage_date)
  do update set message_count = coach_usage.message_count + 1
  returning message_count into v_count;

  return v_count <= p_limit;
end;
$$;

grant execute on function public.increment_coach_usage(int) to authenticated;
