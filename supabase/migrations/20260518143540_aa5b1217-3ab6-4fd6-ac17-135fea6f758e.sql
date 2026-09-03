ALTER TABLE public.cadences ADD COLUMN IF NOT EXISTS phases jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS phase_index integer NOT NULL DEFAULT 0;
ALTER TABLE public.activity_completions ADD COLUMN IF NOT EXISTS phase_index integer NOT NULL DEFAULT 0;