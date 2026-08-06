-- The age gate reads profiles.birth_year. Until now `authenticated` held UPDATE
-- on EVERY column of profiles, and the RLS policy allows a user to update their
-- own row — so the value the gate depends on was writable by the person being
-- gated. Verified by role-switched probe: birth_year 2004 -> 1990 and
-- consent_version null -> 'i-never-agreed', both CHANGED, as the authenticated
-- role with an ordinary user's JWT. One PATCH to /rest/v1/profiles defeated the
-- age check permanently.
--
-- A gate must read a value the gated party cannot write. Column-level privileges
-- enforce that in the database rather than in app code that has to remember.
--
-- consented_at/consent_version are revoked for a related reason: a consent
-- record the subject can rewrite is not evidence of anything. GDPR Art 7(1)
-- requires the controller to be able to DEMONSTRATE consent.
--
-- created_at anchors journal prompt rotation; id is the primary key and the
-- RLS subject. Neither has any business being client-writable.
--
-- NOTE: this migration DID NOT WORK on its own. See the next one.
revoke update (birth_year, consented_at, consent_version, created_at, id)
  on public.profiles from authenticated, anon;

revoke insert, delete on public.profiles from authenticated, anon;
