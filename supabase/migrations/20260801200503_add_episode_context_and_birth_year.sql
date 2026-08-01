-- The log captured only what was eaten and when. For a restriction/binge
-- population that is not enough to tell a restrictive day from a binge day.
-- These three columns are the CBT-E monitoring-record fields chosen for
-- this build: the "felt excessive / out of control" marker and the
-- context around the episode. Compensatory-behaviour logging is
-- deliberately NOT included.
alter table public.entries
  add column if not exists felt_excessive boolean not null default false,
  add column if not exists emotion        text,
  add column if not exists context_note   text;

comment on column public.entries.felt_excessive is
  'The CBT-E asterisk: the person felt this episode was excessive or out of their control. Self-reported perception, never computed from quantity.';

alter table public.entries
  add constraint entries_emotion_check check (
    emotion is null or emotion in (
      'Calm','Anxious','Sad','Angry','Numb','Happy','Stressed','Bored','Lonely','Guilty'
    )
  ),
  add constraint entries_context_note_len check (
    context_note is null or char_length(context_note) <= 2000
  );

-- Age band drives the nutrient reference values. Adolescent needs differ
-- sharply from adult (calcium 1300 vs 1000 mg/d), so the app cannot show a
-- correct reference without knowing roughly how old someone is. Birth YEAR
-- only — full date of birth is more identifying than this needs.
alter table public.profiles
  add column if not exists birth_year integer;

alter table public.profiles
  add constraint profiles_birth_year_range check (
    birth_year is null or (birth_year >= 1900 and birth_year <= 2100)
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (id, display_name, birth_year)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data->>'birth_year', '')::int
  );
  return new;
end;
$$;

-- Rebuilt to carry the new episode fields and to validate input that was
-- previously accepted unchecked: future-dated entries and empty item lists.
drop function if exists public.log_entry(date, text, integer, jsonb);

create function public.log_entry(
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
  if p_entry_date > current_date then
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
