-- log_entry rejected p_entry_date > current_date. current_date is evaluated in
-- the database's timezone, which is UTC; the client sends its LOCAL date. For
-- anyone east of UTC, their own "today" is tomorrow in UTC for part of every
-- day, so the app told them "Cannot log a meal in the future" and refused to
-- save anything at all. Verified live: a user in Auckland was being rejected.
--
-- Allowing current_date + 1 covers every real offset (max is UTC+14) while
-- still refusing a genuinely future date, which is what the guard is for.
create or replace function public.log_entry(
  p_entry_date      date,
  p_meal_type       text,
  p_mins            integer,
  p_items           jsonb,
  p_felt_excessive  boolean default false,
  p_emotion         text    default null,
  p_context_note    text    default null
)
returns uuid
language plpgsql
set search_path to 'public'
as $$
declare
  v_entry_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in.' using errcode = '28000';
  end if;
  -- One day of slack for timezones ahead of UTC. Not a licence to log the
  -- future: anything beyond tomorrow-in-UTC is still refused.
  if p_entry_date > current_date + 1 then
    raise exception 'Cannot log a meal in the future.' using errcode = '22007';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'A meal needs at least one food.' using errcode = '22023';
  end if;

  insert into public.entries (
    user_id, entry_date, meal_type, mins_since_midnight,
    felt_excessive, emotion, context_note
  )
  values (
    auth.uid(), p_entry_date, p_meal_type, p_mins,
    coalesce(p_felt_excessive, false),
    nullif(trim(coalesce(p_emotion, '')), ''),
    nullif(trim(coalesce(p_context_note, '')), '')
  )
  returning id into v_entry_id;

  insert into public.entry_items (entry_id, food_item_id, qty)
  select v_entry_id, (item->>'food_item_id')::uuid, (item->>'qty')::numeric
  from jsonb_array_elements(p_items) as item;

  return v_entry_id;
end;
$$;
