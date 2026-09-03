-- Tabela de agendamentos
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  sdr_id UUID NOT NULL,
  cadence_id UUID,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  sdr_notes TEXT,
  outcome_notes TEXT,
  outcome_by UUID,
  outcome_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointments_sdr ON public.appointments(sdr_id);
CREATE INDEX idx_appointments_lead ON public.appointments(lead_id);
CREATE INDEX idx_appointments_status ON public.appointments(status);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- SDRs: ver/criar próprios
CREATE POLICY "SDRs can view own appointments"
ON public.appointments FOR SELECT TO authenticated
USING (sdr_id = auth.uid());

CREATE POLICY "SDRs can insert own appointments"
ON public.appointments FOR INSERT TO authenticated
WITH CHECK (sdr_id = auth.uid());

-- Gestores: tudo
CREATE POLICY "Gestores can view all appointments"
ON public.appointments FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Gestores can insert any appointment"
ON public.appointments FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Gestores can update any appointment"
ON public.appointments FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Gestores can delete any appointment"
ON public.appointments FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'gestor'::app_role));

-- Trigger updated_at
CREATE TRIGGER appointments_set_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;