UPDATE public.leads
SET phase_index = 0
WHERE id = '8303d7c4-721c-4f54-b9bd-6c0f8fb6e308'
  AND name = 'Lia Campos'
  AND phase_index = 1
  AND created_at >= now() - interval '1 day';