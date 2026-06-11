
-- Remover policies abertas residuais (nomes não cobertos pela 1ª migração)
DROP POLICY IF EXISTS "reserva_alteracoes open"      ON public.reserva_alteracoes;
DROP POLICY IF EXISTS "reserva_servicos open"        ON public.reserva_servicos;
DROP POLICY IF EXISTS "fornecedores public read"     ON public.fornecedores;

-- Aproveitar para limpar duplicados de SELECT pública (mantém só uma policy SELECT por tabela)
DROP POLICY IF EXISTS "Public read convidados" ON public.convidados;
DROP POLICY IF EXISTS "Public read reservas"   ON public.reservas;
