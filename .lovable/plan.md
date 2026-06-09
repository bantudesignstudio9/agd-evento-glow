# Plano — Auth Admin (estrutura), Marketplace+ e Controlo Operacional

Auth dos clientes fica como está. Foco: preparar fundação para login admin por código alfanumérico, ampliar marketplace, e dar ao admin um mapa-calendário com edição completa dos eventos.

## 1. Estrutura para Auth Admin por código de 6 dígitos (apenas staff/companhia)

Objectivo: deixar tudo pronto para activar mais tarde sem refactor. Nenhum fluxo é ligado ao cliente final.

Novas tabelas (criadas agora, ainda não usadas em runtime):

- `staff_users` — id, nome, email (único), telefone, papel (`admin` | `staff` | `companhia`), activo, criado_em.
- `staff_auth_codes` — id, staff_user_id, code_hash (sha-256 do código 6-char A–Z/0–9, sem 0/O/1/I), expires_at (10 min), used_at, ip, user_agent, tentativas.
- `staff_sessions` — id, staff_user_id, token_hash, expires_at (8h), revogado_em.
- `staff_audit_log` — id, staff_user_id, accao, entidade, entidade_id, payload jsonb, criado_em.

Todas com RLS activa, **sem** policies para `anon`; acesso só via server functions com `supabaseAdmin`. Seed de 1 utilizador `admin` placeholder.

Server functions (esqueleto, ainda não plugadas ao UI atual):

- `staff.requestCode({ email })` — gera código, guarda hash, envia por SMS (Twilio) ou email; rate-limit por IP/email.
- `staff.verifyCode({ email, code })` — valida hash + expiração + tentativas; cria `staff_sessions`; devolve token httpOnly.
- `staff.me()` / `staff.logout()` — usados depois pelo middleware `requireStaff`.
- Middleware `requireStaff` (TanStack) para futuras rotas `/admin/*`.

Página `/admin/login` é criada mas escondida atrás de feature flag (`VITE_STAFF_AUTH=off`). Login actual por palavra-passe (`agd2026`) permanece como hoje. Documenta-se em `.lovable/plan.md` como ligar quando a AGD decidir.

## 2. Marketplace — mais serviços

Expande o catálogo já previsto (`servicos` + `fornecedores`). Migração cria:

- `fornecedores` (id, nome, contacto, telefone, email, categoria, activo, notas).
- `servicos` (id, fornecedor_id, categoria, nome, descricao, preco_base, unidade, imagem_url, activo).
- `reserva_servicos` (id, reserva_id, servico_id, quantidade, preco_unit, subtotal, estado).

Categorias seedadas: **Catering, Bar/Bebidas, Decoração & Floral, Bolos & Doces, Fotografia, Vídeo & Drone, DJ/Som, Banda ao Vivo, Iluminação cénica, Mestre de Cerimónias, Segurança, Protocolo, Transporte/Shuttle, Babysitting, Tradução, Cabine Fotográfica, Fogo de artifício, Convites impressos, Lembranças, Limpeza pós-evento**.

UI:

- `/admin/marketplace` — CRUD de fornecedores e serviços (staff).
- No `/dashboard` do cliente, aba **"Serviços extra"**: cliente adiciona à reserva, vê subtotal e total, estado por item (pendente/confirmado/pago).
- Admin vê pedidos em `/admin/reservas/:id` e pode aceitar/recusar/ajustar preço.

## 3. Mapa-calendário operacional do admin

Nova rota `/admin/agenda` com:

- Vista **Mês / Semana / Dia** (FullCalendar — `@fullcalendar/react`, já compatível Vite).
- Filtros: espaço, tipo de evento, estado, período (manhã/tarde/noite).
- Cada bloco mostra: nome do evento, cliente, espaço, período, % ocupação.
- Cores por estado (Pendente/Pago/Cancelado) e padrão por período.
- Click → drawer lateral com detalhes + botão "Editar evento".
- Drag para mover data/período (com confirmação e registo em `staff_audit_log`).
- Indicador de conflito quando dois eventos colidem no mesmo espaço+período.

Dashboard admin ganha widget "Próximos 7 dias" com mini-calendário.

## 4. Edição de eventos pelo admin (a pedido do cliente)

Hoje só o cliente edita pelo dashboard. Adiciona-se ao admin:

- `/admin/reservas/:id/editar` — mesmo formulário do cliente, com todos os campos editáveis: data, período, espaço, tipo, horários, local, design do convite, max convidados, detalhes por convidado, sessões (para cursos), serviços contratados.
- Validação de conflitos (espaço + data + período) antes de guardar.
- Campo **"Motivo da alteração"** obrigatório → grava em `staff_audit_log` + cria entrada `reserva_alteracoes` (data, campo, valor_antigo, valor_novo, motivo, staff_id).
- Aba **"Histórico"** na ficha da reserva mostra todas as alterações.
- Botão **"Notificar cliente"** dispara SMS/email automático com o resumo das mudanças (template pronto, opcional por checkbox).
- Política de janela: alterações a <48h do evento marcam reserva com flag `alteracao_urgente` e destacam a vermelho no dashboard.

## Detalhes técnicos

- Migrations Supabase: `staff_*`, `fornecedores`, `servicos`, `reserva_servicos`, `reserva_alteracoes`. Todas com `GRANT` explícito (service_role; authenticated quando aplicável) e RLS.
- Server functions em `src/lib/staff.functions.ts`, `src/lib/marketplace.functions.ts`, `src/lib/reserva-admin.functions.ts` (usam `supabaseAdmin` por enquanto, dado que admin actual é por palavra-passe partilhada).
- FullCalendar instalado via `bun add @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction`.
- Store (`src/lib/store.ts`) ganha helpers `listarServicos`, `adicionarServicoReserva`, `editarReservaAdmin`, `listarAlteracoes`.
- Tipos novos em `src/lib/types.ts`: `StaffUser`, `Fornecedor`, `Servico`, `ReservaServico`, `ReservaAlteracao`.
- Erro de runtime React #419 (hidratação) é investigado e corrigido em paralelo se reaparecer após estas mudanças.

## Ordem de execução

1. Migrations (staff_*, marketplace, alteracoes) — 1 migração agrupada.
2. Server fns + tipos + store helpers.
3. Marketplace UI (admin + cliente).
4. `/admin/agenda` (FullCalendar).
5. Edição admin + histórico + notificação.
6. Esqueleto `/admin/login` por código (feature-flag off).

Confirma e avanço para build.