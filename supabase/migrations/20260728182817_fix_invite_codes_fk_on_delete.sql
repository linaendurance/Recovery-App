-- Bug: these foreign keys had no ON DELETE behavior, which defaults to
-- RESTRICT. That silently conflicts with the account-deletion capability
-- this app is committed to (matching the original tracker's "delete all
-- my data" feature, and GDPR's right to erasure) — deleting any user who
-- had ever created or redeemed an invite code would fail outright.
-- Fix: the historical invite-code record survives, but stops pointing at
-- a person who no longer exists.

alter table public.invite_codes
  drop constraint invite_codes_created_by_fkey,
  add constraint invite_codes_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null;

alter table public.invite_codes
  drop constraint invite_codes_used_by_fkey,
  add constraint invite_codes_used_by_fkey
    foreign key (used_by) references auth.users(id) on delete set null;
