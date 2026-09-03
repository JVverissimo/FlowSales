
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.activity_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  instructions TEXT,
  preferred_network TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view library"
ON public.activity_library FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Gestor can insert library"
ON public.activity_library FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Gestor can update library"
ON public.activity_library FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Gestor can delete library"
ON public.activity_library FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'gestor'));

CREATE TRIGGER activity_library_updated_at
BEFORE UPDATE ON public.activity_library
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_library;
