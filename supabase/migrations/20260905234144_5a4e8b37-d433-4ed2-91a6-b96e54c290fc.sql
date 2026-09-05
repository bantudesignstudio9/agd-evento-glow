CREATE TABLE public.planos (
  id text PRIMARY KEY,
  nome text NOT NULL,
  preco numeric NOT NULL DEFAULT 0,
  descricao text[] NOT NULL DEFAULT '{}',
  permite_convites_digitais boolean NOT NULL DEFAULT false,
  activo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.planos TO anon;
GRANT SELECT ON public.planos TO authenticated;
GRANT ALL ON public.planos TO service_role;

ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read planos" ON public.planos FOR SELECT USING (true);

CREATE TRIGGER update_planos_updated_at BEFORE UPDATE ON public.planos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.planos (id, nome, preco, descricao, permite_convites_digitais, activo, ordem) VALUES
('prata', 'Plano Prata', 45000, ARRAY['Espaço completo','Decoração própria','Convites tradicionais'], false, true, 1),
('ouro', 'Plano Ouro', 75000, ARRAY['Espaço completo','Sistema de som profissional','Climatização','Projector e ecrã','Protocolo AGD','Convites digitais com QR Code'], true, true, 2);

CREATE TABLE public.transacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL DEFAULT 'receita',
  categoria text NOT NULL DEFAULT 'Outros',
  descricao text NOT NULL DEFAULT '',
  valor numeric NOT NULL DEFAULT 0,
  data date NOT NULL DEFAULT CURRENT_DATE,
  metodo text,
  reserva_id uuid REFERENCES public.reservas(id) ON DELETE SET NULL,
  notas text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.transacoes TO service_role;

ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transacoes service only" ON public.transacoes FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX transacoes_data_idx ON public.transacoes (data DESC);

CREATE TRIGGER update_transacoes_updated_at BEFORE UPDATE ON public.transacoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();