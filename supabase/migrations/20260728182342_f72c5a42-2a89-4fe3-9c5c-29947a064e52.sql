ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS not_sold boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS not_sold_reason text;