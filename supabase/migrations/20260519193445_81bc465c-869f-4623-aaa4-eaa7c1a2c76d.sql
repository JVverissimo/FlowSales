
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS confirmed boolean NOT NULL DEFAULT false;
