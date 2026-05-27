
create table public.reservas (
  id uuid primary key default gen_random_uuid(),
  cliente_nome text not null,
  cliente_email text not null,
  cliente_telefone text not null,
  tipo_evento text not null,
  pacote_id text not null,
  data_evento date not null,
  periodo text not null,
  status text not null default 'Pendente',
  entidade_pagamento text not null,
  referencia_pagamento text not null unique,
  criado_em timestamptz not null default now(),
  evento_nome text,
  hora_inicio text,
  hora_fim text,
  mensagem_boas_vindas text,
  design_convite jsonb,
  local_evento jsonb
);
create index idx_reservas_ref on public.reservas(referencia_pagamento);
create index idx_reservas_data on public.reservas(data_evento);

create table public.convidados (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid not null references public.reservas(id) on delete cascade,
  nome_convidado text not null,
  telefone text,
  qr_code_hash text not null unique,
  status_checkin boolean not null default false,
  sms_enviado_em timestamptz,
  whatsapp_enviado_em timestamptz
);
create index idx_convidados_reserva on public.convidados(reserva_id);
create index idx_convidados_hash on public.convidados(qr_code_hash);

grant select, insert, update, delete on public.reservas to anon, authenticated;
grant all on public.reservas to service_role;
grant select, insert, update, delete on public.convidados to anon, authenticated;
grant all on public.convidados to service_role;

alter table public.reservas enable row level security;
alter table public.convidados enable row level security;

create policy "Public read reservas" on public.reservas for select to anon, authenticated using (true);
create policy "Public insert reservas" on public.reservas for insert to anon, authenticated with check (true);
create policy "Public update reservas" on public.reservas for update to anon, authenticated using (true) with check (true);
create policy "Public delete reservas" on public.reservas for delete to anon, authenticated using (true);

create policy "Public read convidados" on public.convidados for select to anon, authenticated using (true);
create policy "Public insert convidados" on public.convidados for insert to anon, authenticated with check (true);
create policy "Public update convidados" on public.convidados for update to anon, authenticated using (true) with check (true);
create policy "Public delete convidados" on public.convidados for delete to anon, authenticated using (true);

alter table public.reservas replica identity full;
alter table public.convidados replica identity full;
alter publication supabase_realtime add table public.reservas;
alter publication supabase_realtime add table public.convidados;
