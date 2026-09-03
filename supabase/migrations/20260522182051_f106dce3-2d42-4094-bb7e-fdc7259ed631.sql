CREATE POLICY "SDRs can delete own appointments"
ON public.appointments
FOR DELETE
TO authenticated
USING (sdr_id = auth.uid());