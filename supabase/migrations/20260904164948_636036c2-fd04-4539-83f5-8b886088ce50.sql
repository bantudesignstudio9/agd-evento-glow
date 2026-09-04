ALTER TABLE public.reservas
  ADD COLUMN IF NOT EXISTS periodos text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS valor_total numeric;

UPDATE public.reservas SET periodos = ARRAY[periodo] WHERE cardinality(periodos) = 0;