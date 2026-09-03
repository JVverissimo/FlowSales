
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS channel text,
  ADD COLUMN IF NOT EXISTS closed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- SDR can update own appointment status (sdr self-report)
CREATE POLICY "SDRs update own appointments"
ON public.appointments
FOR UPDATE TO authenticated
USING (sdr_id = auth.uid())
WITH CHECK (sdr_id = auth.uid());

-- Drop the previously created meetings table (replaced by appointments)
DROP TABLE IF EXISTS public.meetings;
