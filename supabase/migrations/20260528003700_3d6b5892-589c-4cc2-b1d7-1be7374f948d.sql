ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS max_convidados integer;
ALTER TABLE public.convidados ADD COLUMN IF NOT EXISTS detalhes jsonb;