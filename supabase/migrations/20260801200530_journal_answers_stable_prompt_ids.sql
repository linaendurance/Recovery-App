-- journal_entries.answers was keyed by the PROMPT TEXT itself:
--   {"Where did you notice hunger today...": "I felt..."}
-- Editing a single word in lib/journalBank.ts therefore orphaned every
-- historical answer written against the old wording — unacceptable for a
-- journal meant to be kept for months. Answers are now keyed by a stable
-- prompt id, with the question text stored ALONGSIDE each answer so past
-- entries always render exactly as they were written, even if the bank
-- is later reworded or a prompt is retired entirely.
--
-- New shape: {"<prompt_id>": {"q": "<question as asked>", "a": "<answer>"}}

update public.journal_entries je
set answers = (
  select coalesce(
    jsonb_object_agg(
      'legacy-' || substr(md5(kv.key), 1, 12),
      jsonb_build_object('q', kv.key, 'a', kv.value)
    ),
    '{}'::jsonb
  )
  from jsonb_each_text(je.answers) as kv
)
where exists (
  -- only rows still in the old {text: text} shape
  select 1 from jsonb_each(je.answers) as e
  where jsonb_typeof(e.value) = 'string'
);

comment on column public.journal_entries.answers is
  'Keyed by stable prompt id. Each value is {"q": question as asked at the time, "a": the answer}. The question text is denormalised on purpose so historical entries survive any change to the prompt bank.';
