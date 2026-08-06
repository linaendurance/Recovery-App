-- The previous migration revoked UPDATE on specific columns and did nothing,
-- because a TABLE-level UPDATE grant was still in place. In Postgres, table and
-- column privileges are independent: holding UPDATE on the table permits
-- updating every column regardless of column-level revokes. The column revoke
-- was a no-op, and re-running the probe proved it — birth_year still went
-- 2004 -> 1990 as the authenticated role.
--
-- The correct shape is to drop the table-level privilege and grant back only
-- the column a user has a legitimate reason to change.
--
-- Re-probed after this: birth_year and consent_version both unchanged with
-- "permission denied for table profiles"; display_name still updates cleanly.
revoke update on public.profiles from authenticated, anon;

-- display_name is the only field a person should be able to edit about
-- themselves. No screen offers it yet; the grant is here so that adding one
-- later does not require touching privileges again.
grant update (display_name) on public.profiles to authenticated;
