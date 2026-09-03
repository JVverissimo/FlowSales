
-- 1) Toggle CRM na cadência
ALTER TABLE public.cadences
  ADD COLUMN IF NOT EXISTS linked_to_crm boolean NOT NULL DEFAULT true;

-- 2) Histórico de fases
CREATE TABLE IF NOT EXISTS public.lead_phase_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  cadence_id text NOT NULL,
  phase_index integer NOT NULL,
  phase_id text,
  phase_name text,
  entered_at timestamptz NOT NULL DEFAULT now(),
  exited_at timestamptz,
  moved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lph_lead ON public.lead_phase_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lph_cadence ON public.lead_phase_history(cadence_id);
CREATE INDEX IF NOT EXISTS idx_lph_open ON public.lead_phase_history(lead_id, cadence_id) WHERE exited_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_phase_history TO authenticated;
GRANT ALL ON public.lead_phase_history TO service_role;

ALTER TABLE public.lead_phase_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores can view all phase history"
  ON public.lead_phase_history FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "SDRs can view phase history of their leads"
  ON public.lead_phase_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.owner_id = auth.uid()));

CREATE POLICY "Gestores can write phase history"
  ON public.lead_phase_history FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'gestor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "SDRs can write phase history of their leads"
  ON public.lead_phase_history FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.owner_id = auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_phase_history;
