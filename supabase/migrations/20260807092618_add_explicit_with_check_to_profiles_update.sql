-- The profiles UPDATE policy had a USING clause and no WITH CHECK. Postgres
-- falls back to USING for the check when WITH CHECK is absent, so this was not
-- exploitable — a probe confirmed ownership reassignment is refused. But the
-- fallback is implicit, and the protection currently rests on a single control:
-- the column-level revoke of `id` added earlier today. If a future migration
-- re-grants UPDATE on the table (which is exactly what happened before), the
-- policy would be the only thing left, and its intent should be written down
-- rather than inferred from a Postgres default.
--
-- Stating it explicitly costs nothing and makes the row-ownership rule legible
-- to the next person reading pg_policies.
alter policy "profiles are editable by their owner" on public.profiles
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
