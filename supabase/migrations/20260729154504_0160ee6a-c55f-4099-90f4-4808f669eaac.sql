CREATE TABLE public.business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '18:00',
  workdays smallint[] NOT NULL DEFAULT ARRAY[1,2,3,4,5]::smallint[],
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.business_hours TO authenticated;
GRANT INSERT, UPDATE ON public.business_hours TO authenticated;
GRANT ALL ON public.business_hours TO service_role;

ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view business hours"
  ON public.business_hours FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestor can insert business hours"
  ON public.business_hours FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'gestor'::public.app_role));

CREATE POLICY "Gestor can update business hours"
  ON public.business_hours FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'gestor'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'gestor'::public.app_role));

CREATE TRIGGER trg_business_hours_updated_at
  BEFORE UPDATE ON public.business_hours
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.business_hours (singleton) VALUES (true);