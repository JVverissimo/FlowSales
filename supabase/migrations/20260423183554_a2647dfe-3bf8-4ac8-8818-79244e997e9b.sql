CREATE TABLE public.cadences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  focus TEXT NOT NULL DEFAULT 'outbound',
  status TEXT NOT NULL DEFAULT 'active',
  inactivity_days INTEGER,
  loss_reason TEXT,
  participants JSONB NOT NULL DEFAULT '[]'::jsonb,
  days JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cadences ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view cadences (SDRs need them to execute)
CREATE POLICY "Authenticated can view cadences"
ON public.cadences FOR SELECT TO authenticated
USING (true);

-- Only Gestor can write
CREATE POLICY "Gestores can insert cadences"
ON public.cadences FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Gestores can update cadences"
ON public.cadences FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Gestores can delete cadences"
ON public.cadences FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'gestor'));

CREATE TRIGGER set_cadences_updated_at
BEFORE UPDATE ON public.cadences
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Realtime
ALTER TABLE public.cadences REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cadences;