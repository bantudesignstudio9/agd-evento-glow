
-- ========== STAFF AUTH (estrutura, desactivada por feature flag) ==========
CREATE TABLE public.staff_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text NOT NULL UNIQUE,
  telefone text,
  papel text NOT NULL DEFAULT 'staff' CHECK (papel IN ('admin','staff','companhia')),
  activo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.staff_users TO service_role;
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_users service only" ON public.staff_users FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.staff_auth_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id uuid NOT NULL REFERENCES public.staff_users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  ip text,
  user_agent text,
  tentativas int NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.staff_auth_codes TO service_role;
ALTER TABLE public.staff_auth_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_auth_codes service only" ON public.staff_auth_codes FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.staff_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id uuid NOT NULL REFERENCES public.staff_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revogado_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.staff_sessions TO service_role;
ALTER TABLE public.staff_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_sessions service only" ON public.staff_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.staff_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id uuid REFERENCES public.staff_users(id) ON DELETE SET NULL,
  accao text NOT NULL,
  entidade text,
  entidade_id text,
  payload jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.staff_audit_log TO service_role;
ALTER TABLE public.staff_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_audit_log service only" ON public.staff_audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Seed admin placeholder
INSERT INTO public.staff_users (nome, email, papel) VALUES ('Admin AGD', 'admin@agd.local', 'admin') ON CONFLICT (email) DO NOTHING;

-- ========== MARKETPLACE ==========
CREATE TABLE public.fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  contacto text,
  telefone text,
  email text,
  categoria text NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  notas text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fornecedores TO anon, authenticated;
GRANT ALL ON public.fornecedores TO service_role;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fornecedores public read" ON public.fornecedores FOR SELECT USING (true);
CREATE POLICY "fornecedores service write" ON public.fornecedores FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  categoria text NOT NULL,
  nome text NOT NULL,
  descricao text,
  preco_base numeric(12,2) NOT NULL DEFAULT 0,
  unidade text NOT NULL DEFAULT 'unidade',
  imagem_url text,
  activo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.servicos TO anon, authenticated;
GRANT ALL ON public.servicos TO service_role;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "servicos public read" ON public.servicos FOR SELECT USING (true);
CREATE POLICY "servicos service write" ON public.servicos FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.reserva_servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reserva_id uuid NOT NULL REFERENCES public.reservas(id) ON DELETE CASCADE,
  servico_id uuid NOT NULL REFERENCES public.servicos(id) ON DELETE RESTRICT,
  quantidade numeric(10,2) NOT NULL DEFAULT 1,
  preco_unit numeric(12,2) NOT NULL DEFAULT 0,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'pendente' CHECK (estado IN ('pendente','confirmado','recusado','pago','cancelado')),
  notas text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reserva_servicos TO anon, authenticated;
GRANT ALL ON public.reserva_servicos TO service_role;
ALTER TABLE public.reserva_servicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reserva_servicos open" ON public.reserva_servicos FOR ALL USING (true) WITH CHECK (true);

-- Seed de fornecedor + serviços por categoria
INSERT INTO public.fornecedores (nome, categoria, contacto, activo) VALUES
  ('AGD — Catálogo interno', 'Geral', 'AGD Huambo', true)
ON CONFLICT DO NOTHING;

DO $seed$
DECLARE f uuid;
BEGIN
  SELECT id INTO f FROM public.fornecedores WHERE nome = 'AGD — Catálogo interno' LIMIT 1;
  IF f IS NOT NULL THEN
    INSERT INTO public.servicos (fornecedor_id, categoria, nome, descricao, preco_base, unidade) VALUES
      (f,'Catering','Buffet completo','Entrada, prato principal, sobremesa',8500,'pessoa'),
      (f,'Catering','Coffee-break','Café, chá, salgados e doces',2500,'pessoa'),
      (f,'Bar/Bebidas','Bar aberto (5h)','Cervejas, vinhos, sumos e águas',6000,'pessoa'),
      (f,'Decoração & Floral','Decoração temática','Flores, tecidos, centros de mesa',180000,'evento'),
      (f,'Bolos & Doces','Bolo de celebração','3 andares personalizado',95000,'unidade'),
      (f,'Fotografia','Cobertura fotográfica','Fotógrafo + edição (entrega digital)',120000,'evento'),
      (f,'Vídeo & Drone','Cobertura vídeo + drone','Filme de 5 minutos',180000,'evento'),
      (f,'DJ/Som','DJ profissional','Equipamento + DJ (5h)',150000,'evento'),
      (f,'Banda ao Vivo','Banda ao vivo','Banda 5 elementos (2h)',350000,'evento'),
      (f,'Iluminação cénica','Iluminação cénica','Par LED + moving heads',120000,'evento'),
      (f,'Mestre de Cerimónias','Mestre de cerimónias','Apresentador profissional',80000,'evento'),
      (f,'Segurança','Segurança privada','2 seguranças (6h)',60000,'evento'),
      (f,'Protocolo','Equipa de protocolo AGD','4 elementos',75000,'evento'),
      (f,'Transporte/Shuttle','Shuttle convidados','Mini-bus 30 lugares',90000,'unidade'),
      (f,'Babysitting','Espaço infantil','Animadores + materiais',55000,'evento'),
      (f,'Tradução','Tradução simultânea','PT/EN/FR',95000,'evento'),
      (f,'Cabine Fotográfica','Photobooth','Cabine + impressões ilimitadas',75000,'evento'),
      (f,'Fogo de artifício','Fogo de artifício','Show de 3 minutos',180000,'evento'),
      (f,'Convites impressos','Convites impressos','100 unidades premium',45000,'lote'),
      (f,'Lembranças','Lembranças personalizadas','100 unidades',35000,'lote'),
      (f,'Limpeza pós-evento','Limpeza pós-evento','Equipa + materiais',25000,'evento')
    ON CONFLICT DO NOTHING;
  END IF;
END $seed$;

-- ========== HISTÓRICO DE ALTERAÇÕES DE RESERVAS ==========
CREATE TABLE public.reserva_alteracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reserva_id uuid NOT NULL REFERENCES public.reservas(id) ON DELETE CASCADE,
  staff_user_id uuid REFERENCES public.staff_users(id) ON DELETE SET NULL,
  staff_nome text,
  campo text NOT NULL,
  valor_antigo text,
  valor_novo text,
  motivo text,
  urgente boolean NOT NULL DEFAULT false,
  notificado_cliente boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reserva_alteracoes TO anon, authenticated;
GRANT ALL ON public.reserva_alteracoes TO service_role;
ALTER TABLE public.reserva_alteracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reserva_alteracoes open" ON public.reserva_alteracoes FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS alteracao_urgente boolean NOT NULL DEFAULT false;
