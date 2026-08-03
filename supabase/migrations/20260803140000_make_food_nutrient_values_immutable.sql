-- entry_items stores only (food_item_id, qty); every nutrient value is read
-- live from food_items. So correcting a value -- say oats iron 4.7 -> 3.9 --
-- silently rewrote every historical day's iron total.
--
-- The textbook fix is to snapshot nutrients onto each entry_item. Measured
-- against this app's own data that costs ~291 kB per user per year, to defend
-- against an event that happens a handful of times in the app's life. Instead
-- the values are made IMMUTABLE: a correction adds a NEW row and deprecates
-- the old one. Cost: ~900 bytes per correction, ever.
alter table public.food_items
  add column if not exists deprecated_at timestamptz,
  add column if not exists replaced_by   uuid references public.food_items(id);

comment on column public.food_items.deprecated_at is
  'Set when a food is superseded. Deprecated rows stay queryable forever so historical entries still resolve, but are hidden from the picker.';
comment on column public.food_items.replaced_by is
  'The row that supersedes this one, when a value was corrected.';

create index if not exists food_items_active_idx
  on public.food_items (name) where deprecated_at is null;

create or replace function public.food_items_values_are_immutable()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  -- Deliberate corrections must be explicit:
  --   set local app.allow_food_value_change = 'on';
  if coalesce(current_setting('app.allow_food_value_change', true), 'off') = 'on' then
    return new;
  end if;

  if (new.protein, new.carbs, new.fat, new.fibre, new.iron, new.calcium,
      new.portion, new.unit, new.food_group, new.density, new.name)
     is distinct from
     (old.protein, old.carbs, old.fat, old.fibre, old.iron, old.calcium,
      old.portion, old.unit, old.food_group, old.density, old.name)
  then
    raise exception
      'food_items values are immutable. Insert a replacement row and set deprecated_at/replaced_by on this one, so historical entries keep the values they were logged against.'
      using errcode = '23514';
  end if;

  return new;
end $$;

drop trigger if exists food_items_immutable on public.food_items;
create trigger food_items_immutable
  before update on public.food_items
  for each row execute function public.food_items_values_are_immutable();
