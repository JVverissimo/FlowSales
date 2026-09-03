-- Adicionar novas colunas à tabela leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS fonte TEXT,
  ADD COLUMN IF NOT EXISTS segmento TEXT,
  ADD COLUMN IF NOT EXISTS faturamento TEXT,
  ADD COLUMN IF NOT EXISTS data_entrada DATE,
  ADD COLUMN IF NOT EXISTS origem_importacao TEXT;

-- Tornar owner_id opcional para suportar leads importados sem atendente reconhecido
ALTER TABLE public.leads ALTER COLUMN owner_id DROP NOT NULL;

-- Index para acelerar checagem de duplicatas por telefone
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads (phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_name_company ON public.leads (lower(name), lower(company));