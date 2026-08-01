-- signup-with-invite is a public, unauthenticated endpoint (verify_jwt=false,
-- CORS *) that validates invite codes. Nothing stopped an attacker POSTing to
-- it forever to brute-force codes. This backs a per-IP + per-code attempt
-- limiter. Service role only: no client ever reads or writes it.
create table if not exists public.signup_attempts (
  id          uuid primary key default gen_random_uuid(),
  ip_hash     text not null,
  attempted_at timestamptz not null default now(),
  succeeded   boolean not null default false
);

create index if not exists signup_attempts_ip_time_idx
  on public.signup_attempts (ip_hash, attempted_at desc);

alter table public.signup_attempts enable row level security;
-- Intentionally no policies: deny-all to anon/authenticated. Only the
-- service-role edge function touches this table.

revoke all on table public.signup_attempts from anon;
revoke all on table public.signup_attempts from authenticated;

-- Counts recent failures for an IP and records the current attempt.
create or replace function public.register_signup_attempt(
  p_ip_hash text,
  p_window_minutes integer default 15
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_recent int;
begin
  delete from public.signup_attempts
  where attempted_at < now() - interval '24 hours';

  select count(*) into v_recent
  from public.signup_attempts
  where ip_hash = p_ip_hash
    and succeeded = false
    and attempted_at > now() - make_interval(mins => p_window_minutes);

  insert into public.signup_attempts (ip_hash) values (p_ip_hash);

  return v_recent;
end;
$$;

create or replace function public.mark_signup_success(p_ip_hash text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.signup_attempts
  set succeeded = true
  where id = (
    select id from public.signup_attempts
    where ip_hash = p_ip_hash
    order by attempted_at desc
    limit 1
  );
end;
$$;

revoke all on function public.register_signup_attempt(text, integer) from public, anon, authenticated;
revoke all on function public.mark_signup_success(text) from public, anon, authenticated;
grant execute on function public.register_signup_attempt(text, integer) to service_role;
grant execute on function public.mark_signup_success(text) to service_role;
