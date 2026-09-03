ALTER TABLE public.activity_library ADD COLUMN IF NOT EXISTS shift text NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_library TO authenticated;
GRANT ALL ON public.activity_library TO service_role;

ALTER TABLE public.activity_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage activity library"
ON public.activity_library
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
