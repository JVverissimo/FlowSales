-- Create leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  role TEXT,
  source TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  cadence_id TEXT,
  step_index INTEGER NOT NULL DEFAULT 0,
  owner_id UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Gestor: full access
CREATE POLICY "Gestores can view all leads"
ON public.leads FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Gestores can insert leads"
ON public.leads FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Gestores can update any lead"
ON public.leads FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Gestores can delete leads"
ON public.leads FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'gestor'));

-- SDR: view + update own assigned leads
CREATE POLICY "SDRs can view assigned leads"
ON public.leads FOR SELECT TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "SDRs can update assigned leads"
ON public.leads FOR UPDATE TO authenticated
USING (owner_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER set_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_leads_owner ON public.leads(owner_id);
CREATE INDEX idx_leads_cadence ON public.leads(cadence_id);