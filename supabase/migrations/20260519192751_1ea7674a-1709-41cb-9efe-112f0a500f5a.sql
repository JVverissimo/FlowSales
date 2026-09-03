
-- =========================
-- SDR ↔ Empresas
-- =========================
CREATE TABLE public.sdr_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sdr_id uuid NOT NULL,
  company text NOT NULL CHECK (company IN ('neurochat','neuro-analytics','residi','impl-residi')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sdr_id, company)
);
ALTER TABLE public.sdr_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SDRs view own companies" ON public.sdr_companies
  FOR SELECT TO authenticated USING (sdr_id = auth.uid());
CREATE POLICY "Gestores view all companies" ON public.sdr_companies
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'gestor'));
CREATE POLICY "Gestores manage companies" ON public.sdr_companies
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'gestor'))
  WITH CHECK (public.has_role(auth.uid(),'gestor'));

-- =========================
-- Channel commission configs
-- =========================
CREATE TABLE public.channel_commission_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL,
  company text NOT NULL,
  meeting_value numeric NOT NULL DEFAULT 0,
  closing_value numeric NOT NULL DEFAULT 0,
  bonus_value numeric NOT NULL DEFAULT 0,
  bonus_threshold integer NOT NULL DEFAULT 7,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, company)
);
ALTER TABLE public.channel_commission_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read commission configs" ON public.channel_commission_configs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestores manage commission configs" ON public.channel_commission_configs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'gestor'))
  WITH CHECK (public.has_role(auth.uid(),'gestor'));

CREATE TRIGGER set_channel_commission_configs_updated_at
BEFORE UPDATE ON public.channel_commission_configs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- Meetings
-- =========================
CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sdr_id uuid NOT NULL,
  company text NOT NULL,
  client_company text NOT NULL,
  responsible_name text NOT NULL,
  phone text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  meeting_responsible text NOT NULL,
  channel text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','occurred','no-show')),
  closed boolean NOT NULL DEFAULT false,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_meetings_sdr_scheduled ON public.meetings (sdr_id, scheduled_at);

CREATE POLICY "SDRs view own meetings" ON public.meetings
  FOR SELECT TO authenticated USING (sdr_id = auth.uid());
CREATE POLICY "Gestores view all meetings" ON public.meetings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'gestor'));
CREATE POLICY "SDRs insert own meetings" ON public.meetings
  FOR INSERT TO authenticated WITH CHECK (sdr_id = auth.uid());
CREATE POLICY "Gestores insert meetings" ON public.meetings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'gestor'));
CREATE POLICY "SDRs update own pending meetings" ON public.meetings
  FOR UPDATE TO authenticated
  USING (sdr_id = auth.uid() AND status = 'pending')
  WITH CHECK (sdr_id = auth.uid() AND status = 'pending');
CREATE POLICY "Gestores update any meeting" ON public.meetings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'gestor'))
  WITH CHECK (public.has_role(auth.uid(),'gestor'));
CREATE POLICY "Gestores delete meetings" ON public.meetings
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'gestor'));

CREATE TRIGGER set_meetings_updated_at
BEFORE UPDATE ON public.meetings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
