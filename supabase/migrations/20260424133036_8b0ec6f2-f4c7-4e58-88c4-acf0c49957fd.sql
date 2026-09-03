-- Allow SDRs to delete their own assigned leads
CREATE POLICY "SDRs can delete assigned leads"
ON public.leads
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());