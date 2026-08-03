-- Compact, order-stable fingerprint of the public schema.
--
-- Purpose: prove that applying supabase/migrations to an empty database
-- reproduces the schema that is actually deployed. A migration set that
-- applies without error but yields a different schema is worse than none,
-- because it looks like a working restore path.
--
-- Compared as per-object-type counts plus an md5 over the sorted definitions,
-- so a drift shows up as a changed hash without dumping the whole schema.
with cols as (
  select 'column' as kind,
         table_name||'.'||column_name||':'||data_type||
         ':'||is_nullable||':'||coalesce(column_default,'-') as def
  from information_schema.columns where table_schema='public'
),
cons as (
  select 'constraint', conrelid::regclass::text||'.'||conname||':'||pg_get_constraintdef(oid)
  from pg_constraint where connamespace='public'::regnamespace
),
idx as (
  select 'index', indexname||':'||indexdef from pg_indexes where schemaname='public'
),
pol as (
  select 'policy', tablename||'.'||policyname||':'||cmd||':'||
         coalesce(qual,'-')||':'||coalesce(with_check,'-')
  from pg_policies where schemaname='public'
),
fn as (
  select 'function', p.proname||':'||pg_get_function_identity_arguments(p.oid)||
         ':secdef='||p.prosecdef
  from pg_proc p where p.pronamespace='public'::regnamespace
),
trg as (
  select 'trigger', tgrelid::regclass::text||'.'||tgname
  from pg_trigger where not tgisinternal
    and tgrelid in (select oid from pg_class where relnamespace='public'::regnamespace)
),
rls as (
  select 'rls_enabled', relname::text from pg_class
  where relnamespace='public'::regnamespace and relkind='r' and relrowsecurity
),
all_objs as (
  select * from cols union all select * from cons union all select * from idx
  union all select * from pol union all select * from fn
  union all select * from trg union all select * from rls
)
select kind, count(*) as n, md5(string_agg(def, '|' order by def)) as fingerprint
from all_objs group by kind order by kind;
