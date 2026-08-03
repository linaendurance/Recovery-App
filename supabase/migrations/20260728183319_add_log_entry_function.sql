-- Wraps "create an entry" + "attach its foods" in one transaction. Without
-- this, a dropped connection between the two separate inserts could leave
-- an entry with no foods on it. security invoker (the default, stated
-- explicitly) means this runs as the calling user — RLS still applies in
-- full, so this grants no extra privilege, only atomicity.
create or replace function public.log_entry(
  p_entry_date date,
  p_meal_type text,
  p_mins int,
  p_items jsonb -- array of {"food_item_id": uuid, "qty": number}
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_entry_id uuid;
begin
  insert into public.entries (user_id, entry_date, meal_type, mins_since_midnight)
  values (auth.uid(), p_entry_date, p_meal_type, p_mins)
  returning id into v_entry_id;

  insert into public.entry_items (entry_id, food_item_id, qty)
  select v_entry_id, (item->>'food_item_id')::uuid, (item->>'qty')::numeric
  from jsonb_array_elements(p_items) as item;

  return v_entry_id;
end;
$$;

grant execute on function public.log_entry(date, text, int, jsonb) to authenticated;
