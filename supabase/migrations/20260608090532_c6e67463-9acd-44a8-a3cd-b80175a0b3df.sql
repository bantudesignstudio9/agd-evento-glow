
-- =========== ESPACOS ===========
CREATE TABLE public.espacos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  endereco text NOT NULL,
  capacidade integer NOT NULL DEFAULT 150,
  lat double precision,
  lng double precision,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.espacos TO anon, authenticated;
GRANT ALL ON public.espacos TO service_role;

ALTER TABLE public.espacos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read espacos" ON public.espacos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert espacos" ON public.espacos FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update espacos" ON public.espacos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete espacos" ON public.espacos FOR DELETE TO anon, authenticated USING (true);

-- Seed espaço default
INSERT INTO public.espacos (nome, endereco, capacidade, lat, lng) VALUES (
  'Anfiteatro do Gab. Prov. Cultura e Turismo',
  'Cidade Alta, Av. Imaculada da Conceição, Huambo, Angola',
  150, -12.7763, 15.7392
);

-- =========== RESERVAS: add espaco_id ===========
ALTER TABLE public.reservas
  ADD COLUMN espaco_id uuid REFERENCES public.espacos(id) ON DELETE SET NULL;

-- =========== SESSOES (cursos/formações) ===========
CREATE TABLE public.sessoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reserva_id uuid NOT NULL REFERENCES public.reservas(id) ON DELETE CASCADE,
  titulo text NOT NULL DEFAULT 'Sessão',
  data date NOT NULL,
  hora_inicio text,
  hora_fim text,
  ordem integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessoes_reserva ON public.sessoes(reserva_id);
CREATE INDEX idx_sessoes_data ON public.sessoes(data);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessoes TO anon, authenticated;
GRANT ALL ON public.sessoes TO service_role;

ALTER TABLE public.sessoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read sessoes" ON public.sessoes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert sessoes" ON public.sessoes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update sessoes" ON public.sessoes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete sessoes" ON public.sessoes FOR DELETE TO anon, authenticated USING (true);

-- =========== PRESENCAS (1 registo por convidado x sessão) ===========
CREATE TABLE public.presencas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id uuid NOT NULL REFERENCES public.sessoes(id) ON DELETE CASCADE,
  convidado_id uuid NOT NULL REFERENCES public.convidados(id) ON DELETE CASCADE,
  marcado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sessao_id, convidado_id)
);

CREATE INDEX idx_presencas_sessao ON public.presencas(sessao_id);
CREATE INDEX idx_presencas_convidado ON public.presencas(convidado_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.presencas TO anon, authenticated;
GRANT ALL ON public.presencas TO service_role;

ALTER TABLE public.presencas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read presencas" ON public.presencas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert presencas" ON public.presencas FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update presencas" ON public.presencas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete presencas" ON public.presencas FOR DELETE TO anon, authenticated USING (true);

-- =========== CONVIDADOS: RSVP ===========
ALTER TABLE public.convidados
  ADD COLUMN rsvp_status text NOT NULL DEFAULT 'pendente' CHECK (rsvp_status IN ('pendente','confirmado','recusado')),
  ADD COLUMN rsvp_acompanhantes integer NOT NULL DEFAULT 0,
  ADD COLUMN rsvp_em timestamptz,
  ADD COLUMN lembrete_enviado_em timestamptz;

-- =========== REALTIME ===========
ALTER PUBLICATION supabase_realtime ADD TABLE public.espacos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.presencas;
