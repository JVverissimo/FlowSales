ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS company_target text,
  ADD COLUMN IF NOT EXISTS channel text;