-- The grant to `authenticated` was intentional. The gap the advisor just
-- caught is that `anon` (not signed in at all) could also call this —
-- auth.uid() would be null for them, so it wouldn't succeed, but there's
-- no reason to leave that door even partly open.
revoke execute on function public.increment_coach_usage(int) from anon, public;
