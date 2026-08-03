-- (2) The limiter counted only FAILED attempts, because invite codes were the
-- real cap. Without them one IP could create unlimited accounts as fast as it
-- could POST. Successes now count too, under a separate ceiling.
drop function if exists public.register_signup_attempt(text, integer);

create function public.register_signup_attempt(p_ip_hash text, p_window_minutes integer default 15)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_failures int; v_successes int;
begin
  delete from public.signup_attempts where attempted_at < now() - interval '24 hours';
  select count(*) filter (where succeeded = false), count(*) filter (where succeeded = true)
    into v_failures, v_successes
  from public.signup_attempts
  where ip_hash = p_ip_hash and attempted_at > now() - make_interval(mins => p_window_minutes);
  insert into public.signup_attempts (ip_hash) values (p_ip_hash);
  return jsonb_build_object('failures', v_failures, 'successes', v_successes);
end $$;

revoke all on function public.register_signup_attempt(text, integer) from public, anon, authenticated;
grant execute on function public.register_signup_attempt(text, integer) to service_role;

-- (3) Nothing throttled writes once someone held a session. A scripted account
-- could insert unlimited rows and the bill lands on the project owner.
create or replace function public.log_entry(
  p_entry_date date, p_meal_type text, p_mins integer, p_items jsonb,
  p_felt_excessive boolean default false, p_emotion text default null,
  p_context_note text default null
) returns uuid language plpgsql set search_path to 'public' as $$
declare
  v_entry_id uuid; v_today_count int;
  c_daily_cap constant int := 40; c_max_items constant int := 40;
begin
  if auth.uid() is null then raise exception 'Not signed in.' using errcode='28000'; end if;
  if p_entry_date > current_date + 1 then
    raise exception 'Cannot log a meal in the future.' using errcode='22007'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'A meal needs at least one food.' using errcode='22023'; end if;
  if jsonb_array_length(p_items) > c_max_items then
    raise exception 'Too many foods in one meal.' using errcode='22023'; end if;

  select count(*) into v_today_count from public.entries
   where user_id = auth.uid() and entry_date = p_entry_date;
  if v_today_count >= c_daily_cap then
    raise exception 'Daily logging limit reached for that date.' using errcode='54000'; end if;

  insert into public.entries (user_id, entry_date, meal_type, mins_since_midnight,
                              felt_excessive, emotion, context_note)
  values (auth.uid(), p_entry_date, p_meal_type, p_mins, coalesce(p_felt_excessive,false),
          nullif(trim(coalesce(p_emotion,'')),''), nullif(trim(coalesce(p_context_note,'')),''))
  returning id into v_entry_id;

  insert into public.entry_items (entry_id, food_item_id, qty)
  select v_entry_id, (item->>'food_item_id')::uuid, (item->>'qty')::numeric
  from jsonb_array_elements(p_items) as item;

  return v_entry_id;
end $$;

-- (4) "Delete all data" left the profile and auth user behind, so the account
-- still existed. Incomplete erasure for special-category health data.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not signed in.' using errcode='28000'; end if;
  delete from auth.users where id = v_uid;
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- (5) Consent has to be recorded, not assumed, once strangers can sign up.
alter table public.profiles
  add column if not exists consented_at    timestamptz,
  add column if not exists consent_version text;

comment on column public.profiles.consented_at is
  'When this person accepted the privacy notice. Null for accounts created before consent capture existed.';
