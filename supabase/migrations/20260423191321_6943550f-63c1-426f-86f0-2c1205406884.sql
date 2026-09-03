
-- Track completed/skipped activities per lead/cadence step
CREATE TABLE public.activity_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  cadence_id UUID,
  day_number INTEGER NOT NULL,
  activity_index INTEGER NOT NULL,
  activity_type TEXT NOT NULL,
  activity_name TEXT,
  status TEXT NOT NULL DEFAULT 'done', -- 'done' | 'skipped'
  notes TEXT,
  user_id UUID NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own completions"
  ON public.activity_completions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Gestores can view all completions"
  ON public.activity_completions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Users can insert their own completions"
  ON public.activity_completions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own completions"
  ON public.activity_completions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_activity_completions_user_date
  ON public.activity_completions (user_id, completed_at);
CREATE INDEX idx_activity_completions_lead
  ON public.activity_completions (lead_id);
