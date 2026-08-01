-- Defence in depth on the shared reference table.
--
-- food_items was safe only because it has a SELECT policy and no write policy,
-- so writes matched zero rows. But the UPDATE/INSERT/DELETE GRANTS were still
-- held by anon and authenticated. That means the protection rested entirely on
-- nobody ever adding a permissive `FOR ALL` policy — a one-line mistake that
-- would silently let any signed-in user rewrite the nutrient values every
-- other user's analysis is computed from.
--
-- Revoking the grants makes it fail at the privilege layer instead, which no
-- future policy can undo by accident.
revoke insert, update, delete, truncate on public.food_items from anon;
revoke insert, update, delete, truncate on public.food_items from authenticated;

-- Profiles are created by the handle_new_user trigger (SECURITY DEFINER, so
-- unaffected by this) and never inserted or deleted by the client. Only the
-- owner-scoped UPDATE policy is actually used.
revoke insert, delete, truncate on public.profiles from anon;
revoke insert, delete, truncate on public.profiles from authenticated;

-- invite_codes is read only by the service-role edge function. anon and
-- authenticated should not hold any grant on it at all.
revoke all on public.invite_codes from anon;
revoke all on public.invite_codes from authenticated;

-- coach_usage is written only by increment_coach_usage (service_role).
revoke insert, update, delete, truncate on public.coach_usage from anon;
revoke insert, update, delete, truncate on public.coach_usage from authenticated;
