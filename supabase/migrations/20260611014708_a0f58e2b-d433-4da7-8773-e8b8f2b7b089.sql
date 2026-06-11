
-- ====================================================================
-- LOCKDOWN RLS — todas as escritas passam a exigir service_role
-- (chamadas via server functions). Tabelas internas (fornecedores,
-- reserva_alteracoes, staff_*) ficam totalmente fechadas para anon.
-- ====================================================================

-- ---- RESERVAS ----
DROP POLICY IF EXISTS "Anyone can insert reservas" ON public.reservas;
DROP POLICY IF EXISTS "Anyone can update reservas" ON public.reservas;
DROP POLICY IF EXISTS "Anyone can delete reservas" ON public.reservas;
DROP POLICY IF EXISTS "public can insert reservas" ON public.reservas;
DROP POLICY IF EXISTS "public can update reservas" ON public.reservas;
DROP POLICY IF EXISTS "public can delete reservas" ON public.reservas;
DROP POLICY IF EXISTS "reservas insert" ON public.reservas;
DROP POLICY IF EXISTS "reservas update" ON public.reservas;
DROP POLICY IF EXISTS "reservas delete" ON public.reservas;

-- ---- CONVIDADOS ----
DROP POLICY IF EXISTS "Anyone can insert convidados" ON public.convidados;
DROP POLICY IF EXISTS "Anyone can update convidados" ON public.convidados;
DROP POLICY IF EXISTS "Anyone can delete convidados" ON public.convidados;
DROP POLICY IF EXISTS "public can insert convidados" ON public.convidados;
DROP POLICY IF EXISTS "public can update convidados" ON public.convidados;
DROP POLICY IF EXISTS "public can delete convidados" ON public.convidados;

-- ---- ESPACOS ----
DROP POLICY IF EXISTS "Anyone can insert espacos" ON public.espacos;
DROP POLICY IF EXISTS "Anyone can update espacos" ON public.espacos;
DROP POLICY IF EXISTS "Anyone can delete espacos" ON public.espacos;
DROP POLICY IF EXISTS "public can insert espacos" ON public.espacos;
DROP POLICY IF EXISTS "public can update espacos" ON public.espacos;
DROP POLICY IF EXISTS "public can delete espacos" ON public.espacos;

-- ---- SESSOES ----
DROP POLICY IF EXISTS "Anyone can insert sessoes" ON public.sessoes;
DROP POLICY IF EXISTS "Anyone can update sessoes" ON public.sessoes;
DROP POLICY IF EXISTS "Anyone can delete sessoes" ON public.sessoes;

-- ---- PRESENCAS ----
DROP POLICY IF EXISTS "Anyone can insert presencas" ON public.presencas;
DROP POLICY IF EXISTS "Anyone can update presencas" ON public.presencas;
DROP POLICY IF EXISTS "Anyone can delete presencas" ON public.presencas;

-- ---- FORNECEDORES (fecho total: nem SELECT anon) ----
DROP POLICY IF EXISTS "Anyone can view fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "Anyone can manage fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "public can view fornecedores" ON public.fornecedores;

-- ---- SERVICOS (catálogo público mantém SELECT, write só admin) ----
DROP POLICY IF EXISTS "Anyone can insert servicos" ON public.servicos;
DROP POLICY IF EXISTS "Anyone can update servicos" ON public.servicos;
DROP POLICY IF EXISTS "Anyone can delete servicos" ON public.servicos;
DROP POLICY IF EXISTS "Anyone can manage servicos" ON public.servicos;

-- ---- RESERVA_SERVICOS ----
DROP POLICY IF EXISTS "Anyone can manage reserva_servicos" ON public.reserva_servicos;
DROP POLICY IF EXISTS "public can manage reserva_servicos" ON public.reserva_servicos;

-- ---- RESERVA_ALTERACOES (fecho total: histórico interno) ----
DROP POLICY IF EXISTS "Anyone can view reserva_alteracoes" ON public.reserva_alteracoes;
DROP POLICY IF EXISTS "Anyone can manage reserva_alteracoes" ON public.reserva_alteracoes;
DROP POLICY IF EXISTS "public can manage reserva_alteracoes" ON public.reserva_alteracoes;

-- ====================================================================
-- Limpa policies anteriores com nomes genéricos (segunda passagem)
-- ====================================================================
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('reservas','convidados','espacos','sessoes','presencas',
                        'servicos','fornecedores','reserva_servicos',
                        'reserva_alteracoes')
      AND policyname ILIKE ANY (ARRAY['%insert%','%update%','%delete%','%manage%','%write%','%all access%'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- ====================================================================
-- Garantir RLS activa e GRANTS coerentes
-- ====================================================================
ALTER TABLE public.reservas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convidados          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.espacos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessoes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presencas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reserva_servicos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reserva_alteracoes  ENABLE ROW LEVEL SECURITY;

-- Revoga privilégios de escrita do anon/authenticated em tudo
REVOKE INSERT, UPDATE, DELETE ON public.reservas           FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.convidados         FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.espacos            FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.sessoes            FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.presencas          FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.servicos           FROM anon, authenticated;
REVOKE ALL                    ON public.fornecedores       FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.reserva_servicos   FROM anon, authenticated;
REVOKE ALL                    ON public.reserva_alteracoes FROM anon, authenticated;

-- Leitura anon mantida apenas onde o app público precisa
GRANT SELECT ON public.reservas         TO anon, authenticated;
GRANT SELECT ON public.convidados       TO anon, authenticated;
GRANT SELECT ON public.espacos          TO anon, authenticated;
GRANT SELECT ON public.sessoes          TO anon, authenticated;
GRANT SELECT ON public.presencas        TO anon, authenticated;
GRANT SELECT ON public.servicos         TO anon, authenticated;
GRANT SELECT ON public.reserva_servicos TO anon, authenticated;

-- service_role sempre com acesso total
GRANT ALL ON public.reservas            TO service_role;
GRANT ALL ON public.convidados          TO service_role;
GRANT ALL ON public.espacos             TO service_role;
GRANT ALL ON public.sessoes             TO service_role;
GRANT ALL ON public.presencas           TO service_role;
GRANT ALL ON public.servicos            TO service_role;
GRANT ALL ON public.fornecedores        TO service_role;
GRANT ALL ON public.reserva_servicos    TO service_role;
GRANT ALL ON public.reserva_alteracoes  TO service_role;

-- ====================================================================
-- POLICIES — só SELECT públicas (escritas: nenhuma policy = bloqueado)
-- service_role bypassa RLS automaticamente.
-- ====================================================================
CREATE POLICY "public read reservas"         ON public.reservas         FOR SELECT USING (true);
CREATE POLICY "public read convidados"       ON public.convidados       FOR SELECT USING (true);
CREATE POLICY "public read espacos"          ON public.espacos          FOR SELECT USING (true);
CREATE POLICY "public read sessoes"          ON public.sessoes          FOR SELECT USING (true);
CREATE POLICY "public read presencas"        ON public.presencas        FOR SELECT USING (true);
CREATE POLICY "public read servicos"         ON public.servicos         FOR SELECT USING (true);
CREATE POLICY "public read reserva_servicos" ON public.reserva_servicos FOR SELECT USING (true);
-- fornecedores e reserva_alteracoes: sem policy → nenhum acesso via anon/authenticated.

-- ====================================================================
-- Realtime — remover tabelas sensíveis da publicação para não vazar
-- via subscriptions abertas (o app já não usa realtime nestas tabelas)
-- ====================================================================
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.reservas; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.convidados; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.sessoes; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime DROP TABLE public.presencas; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- ====================================================================
-- STORAGE — bucket event-assets fica public para leitura (convites
-- partilháveis) mas escritas/eliminações só via service_role
-- ====================================================================
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname ILIKE '%event-assets%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "event-assets public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-assets');
-- Sem policies de INSERT/UPDATE/DELETE — só service_role pode escrever
-- (uploads passam pela server function sfUploadAsset).
