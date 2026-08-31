CREATE TABLE public.config_pagamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iban text NOT NULL DEFAULT '',
  titular text NOT NULL DEFAULT '',
  banco text NOT NULL DEFAULT '',
  express_numero text NOT NULL DEFAULT '',
  instrucoes text NOT NULL DEFAULT '',
  criado_em timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.config_pagamento TO anon;
GRANT SELECT ON public.config_pagamento TO authenticated;
GRANT ALL ON public.config_pagamento TO service_role;

ALTER TABLE public.config_pagamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read config_pagamento" ON public.config_pagamento FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_config_pagamento_updated_at BEFORE UPDATE ON public.config_pagamento
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.config_pagamento (iban, titular, banco, express_numero, instrucoes)
VALUES ('0040.0000.2456.6626.1024.7', 'Abréu G.Daniel - Comercial Lda', 'BAI', '925788112',
        'Após a transferência ou pagamento por Multicaixa Express, carregue o comprovativo para validarmos a sua reserva.');

ALTER TABLE public.reservas
  ADD COLUMN IF NOT EXISTS metodo_pagamento text,
  ADD COLUMN IF NOT EXISTS comprovativo_url text,
  ADD COLUMN IF NOT EXISTS comprovativo_em timestamptz;

ALTER TABLE public.reservas ALTER COLUMN entidade_pagamento SET DEFAULT '';