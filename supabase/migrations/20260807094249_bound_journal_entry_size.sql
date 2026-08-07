-- journal_entries had NO check constraints, and `answers` is jsonb written by a
-- direct PostgREST upsert rather than through a validating RPC. It was the only
-- unbounded user-controlled write path left in the schema:
--
--   entries.context_note   capped at 2000 chars
--   entries                written via log_entry(), which caps 40/day
--   journal_entries        nothing
--
-- An authenticated user could PUT a 200MB jsonb and exhaust the 500MB database,
-- denying service to everybody else — and on the free tier there are no
-- automated backups to restore from. RLS does not help here: the row is
-- legitimately theirs. Size is a separate axis from ownership.
--
-- 64 KB against a real-world maximum of 727 bytes across 9 rows — roughly 90x
-- headroom, so it constrains an attack without ever constraining a person who
-- writes a great deal. Enforced in the database because the client cannot be
-- trusted to enforce it and the upsert does not pass through server code.
alter table public.journal_entries
  add constraint journal_entries_answers_size
  check (octet_length(answers::text) <= 65536);

-- `format` is the prompt-set title the app writes ("This week's theme: Hunger").
-- Real maximum is 29 characters; it is user-controllable over the API because
-- the upsert is direct.
alter table public.journal_entries
  add constraint journal_entries_format_len
  check (char_length(format) <= 200);
