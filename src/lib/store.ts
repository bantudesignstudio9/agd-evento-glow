import { supabase } from "@/integrations/supabase/client";
import type {
  Reserva, Convidado, Period, Status, Espaco, Sessao, Presenca, RsvpStatus,
  Fornecedor, Servico, ReservaServico, ReservaAlteracao, ReservaServicoEstado,
  ConfigPagamento,
} from "./types";
import { DEFAULT_CONFIG_PAGAMENTO } from "./types";
import {
  sfCriarReserva, sfAtualizarReserva, sfRemoverReserva,
  sfAddConvidado, sfAtualizarConvidado, sfRemoverConvidado,
  sfInserirPresenca, sfRemoverPresenca,
  sfCriarEspaco, sfAtualizarEspaco, sfRemoverEspaco,
  sfCriarSessao, sfAtualizarSessao, sfRemoverSessao,
  sfListarFornecedores, sfCriarFornecedor, sfAtualizarFornecedor, sfRemoverFornecedor,
  sfCriarServico, sfAtualizarServico, sfRemoverServico,
  sfAdicionarReservaServico, sfAtualizarReservaServico, sfRemoverReservaServico,
  sfListarAlteracoes, sfRegistarAlteracoes,
  sfLerConfigPagamento, sfAtualizarConfigPagamento,
} from "./data.functions";

const K_ADMIN = "agd_admin";

// In-memory caches (hydrated from Supabase + kept in sync via Realtime para leituras públicas)
let _reservas: Reserva[] = [];
let _convidados: Convidado[] = [];
let _espacos: Espaco[] = [];
let _sessoes: Sessao[] = [];
let _presencas: Presenca[] = [];
let _fornecedores: Fornecedor[] = [];
let _servicos: Servico[] = [];
let _reservaServicos: ReservaServico[] = [];
let _alteracoes: ReservaAlteracao[] = [];
let _configPagamento: ConfigPagamento = DEFAULT_CONFIG_PAGAMENTO;
let _initialized = false;
let _initPromise: Promise<void> | null = null;

function emit() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("agd:update"));
  }
}

function rowToReserva(r: Record<string, unknown>): Reserva { return r as unknown as Reserva; }
function rowToConvidado(r: Record<string, unknown>): Convidado { return r as unknown as Convidado; }
function rowToEspaco(r: Record<string, unknown>): Espaco { return r as unknown as Espaco; }
function rowToSessao(r: Record<string, unknown>): Sessao { return r as unknown as Sessao; }
function rowToPresenca(r: Record<string, unknown>): Presenca { return r as unknown as Presenca; }
function rowToFornecedor(r: Record<string, unknown>): Fornecedor { return r as unknown as Fornecedor; }
function rowToServico(r: Record<string, unknown>): Servico { return r as unknown as Servico; }
function rowToReservaServico(r: Record<string, unknown>): ReservaServico { return r as unknown as ReservaServico; }
function rowToAlteracao(r: Record<string, unknown>): ReservaAlteracao { return r as unknown as ReservaAlteracao; }

async function hydrate() {
  // Leituras públicas via anon (RLS permite SELECT em reservas, convidados, espacos,
  // sessoes, presencas, servicos, reserva_servicos — modelo anónimo por design)
  const sbAny = supabase as never as { from: (t: string) => { select: (c: string) => { order?: (k: string, o?: { ascending: boolean }) => Promise<{ data: unknown[] | null }> } & Promise<{ data: unknown[] | null }> } };
  const [
    { data: rs }, { data: cs }, { data: es }, { data: ss }, { data: ps },
    { data: svs }, { data: rsv },
    fornecedoresRows, alteracoesRows, configRow,
  ] = await Promise.all([
    supabase.from("reservas").select("*").order("criado_em", { ascending: false }),
    supabase.from("convidados").select("*"),
    supabase.from("espacos").select("*").order("nome"),
    supabase.from("sessoes").select("*").order("data"),
    supabase.from("presencas").select("*"),
    sbAny.from("servicos").select("*").order!("nome"),
    sbAny.from("reserva_servicos").select("*"),
    // Leituras de admin via server fn (tabelas trancadas para anon)
    sfListarFornecedores().catch(() => [] as unknown[]),
    sfListarAlteracoes().catch(() => [] as unknown[]),
    sfLerConfigPagamento().catch(() => null),
  ]) as unknown as [
    { data: Record<string, unknown>[] | null }, { data: Record<string, unknown>[] | null },
    { data: Record<string, unknown>[] | null }, { data: Record<string, unknown>[] | null },
    { data: Record<string, unknown>[] | null }, { data: Record<string, unknown>[] | null },
    { data: Record<string, unknown>[] | null },
    Record<string, unknown>[], Record<string, unknown>[], unknown,
  ];
  _reservas = (rs ?? []).map(rowToReserva);
  _convidados = (cs ?? []).map(rowToConvidado);
  _espacos = (es ?? []).map(rowToEspaco);
  _sessoes = (ss ?? []).map(rowToSessao);
  _presencas = (ps ?? []).map(rowToPresenca);
  _servicos = ((svs ?? []) as Record<string, unknown>[]).map(rowToServico);
  _reservaServicos = ((rsv ?? []) as Record<string, unknown>[]).map(rowToReservaServico);
  _fornecedores = (fornecedoresRows as Record<string, unknown>[]).map(rowToFornecedor);
  _alteracoes = (alteracoesRows as Record<string, unknown>[]).map(rowToAlteracao);
  if (configRow) _configPagamento = configRow as unknown as ConfigPagamento;
  emit();
}

function applyChange<T extends { id: string }>(
  arr: T[],
  p: { eventType: "INSERT" | "UPDATE" | "DELETE"; new: Record<string, unknown>; old: Record<string, unknown> },
  map: (r: Record<string, unknown>) => T,
): T[] {
  if (p.eventType === "INSERT") {
    const r = map(p.new);
    return arr.some((x) => x.id === r.id) ? arr : [...arr, r];
  }
  if (p.eventType === "UPDATE") {
    const r = map(p.new);
    return arr.map((x) => (x.id === r.id ? r : x));
  }
  const id = (p.old as { id: string }).id;
  return arr.filter((x) => x.id !== id);
}

function subscribe() {
  supabase
    .channel("agd-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "espacos" }, (p) => {
      _espacos = applyChange(_espacos, p as never, rowToEspaco); emit();
    })
    .subscribe();
  // NOTA: realtime de reservas/convidados/sessoes/presencas foi removido da
  // publicação para não expor dados sensíveis em canais abertos. O update local
  // (optimistic) garante UI responsiva; um refresh manual recarrega o estado.
}

export function initStore(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (_initialized) return Promise.resolve();
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    await hydrate();
    subscribe();
    _initialized = true;
  })();
  return _initPromise;
}

export const Store = {
  initialized: () => _initialized,
  ready: initStore,
  refresh: hydrate,

  // RESERVAS
  reservas: (): Reserva[] => _reservas,
  getReserva: (id: string) => _reservas.find((r) => r.id === id),
  getReservaByRef: (ref: string) => _reservas.find((r) => r.referencia_pagamento === ref.trim()),
  reservasNoDia: (data: string) =>
    _reservas.filter((r) => r.data_evento === data && r.status !== "Cancelado"),
  periodosOcupados: (data: string, espaco_id?: string | null): Period[] =>
    _reservas
      .filter((r) =>
        r.data_evento === data &&
        r.status !== "Cancelado" &&
        (!espaco_id || (r.espaco_id ?? null) === espaco_id),
      )
      .map((r) => r.periodo),

  async criarReserva(
    input: Omit<Reserva, "id" | "status" | "entidade_pagamento" | "referencia_pagamento" | "criado_em">,
  ): Promise<Reserva> {
    const data = await sfCriarReserva({ data: { input: input as unknown as Record<string, unknown> } });
    const nova = rowToReserva(data as unknown as Record<string, unknown>);
    if (!_reservas.some((x) => x.id === nova.id)) _reservas = [nova, ..._reservas];
    emit();
    return nova;
  },

  async atualizarStatus(id: string, status: Status) {
    _reservas = _reservas.map((r) => (r.id === id ? { ...r, status } : r));
    emit();
    await sfAtualizarReserva({ data: { id, patch: { status } } });
  },

  async atualizarReserva(id: string, patch: Partial<Reserva>) {
    _reservas = _reservas.map((r) => (r.id === id ? { ...r, ...patch } : r));
    emit();
    await sfAtualizarReserva({ data: { id, patch: patch as unknown as Record<string, unknown> } });
  },

  async removerReserva(id: string) {
    _reservas = _reservas.filter((r) => r.id !== id);
    emit();
    await sfRemoverReserva({ data: { id } });
  },

  // CONVIDADOS
  convidados: (): Convidado[] => _convidados,
  getConvidadoByHash: (hash: string) => _convidados.find((c) => c.qr_code_hash === hash),
  convidadosDaReserva: (reserva_id: string) =>
    _convidados.filter((c) => c.reserva_id === reserva_id),

  async addConvidado(reserva_id: string, nome: string, telefone?: string): Promise<Convidado> {
    const data = await sfAddConvidado({ data: { reserva_id, nome, telefone: telefone || null } });
    const c = rowToConvidado(data as unknown as Record<string, unknown>);
    if (!_convidados.some((x) => x.id === c.id)) _convidados = [..._convidados, c];
    emit();
    return c;
  },

  async atualizarConvidado(id: string, patch: Partial<Convidado>) {
    _convidados = _convidados.map((c) => (c.id === id ? { ...c, ...patch } : c));
    emit();
    await sfAtualizarConvidado({ data: { id, patch: patch as unknown as Record<string, unknown> } });
  },

  async removerConvidado(id: string) {
    _convidados = _convidados.filter((c) => c.id !== id);
    emit();
    await sfRemoverConvidado({ data: { id } });
  },

  async rsvp(hash: string, status: RsvpStatus, acompanhantes = 0) {
    const c = _convidados.find((x) => x.qr_code_hash === hash);
    if (!c) throw new Error("Convidado não encontrado");
    const patch: Partial<Convidado> = {
      rsvp_status: status,
      rsvp_acompanhantes: Math.max(0, acompanhantes),
      rsvp_em: new Date().toISOString(),
    };
    await Store.atualizarConvidado(c.id, patch);
    return { ...c, ...patch };
  },

  async checkin(hash: string): Promise<{ ok: boolean; msg: string; convidado?: Convidado }> {
    const c = _convidados.find((x) => x.qr_code_hash === hash);
    if (!c) return { ok: false, msg: "QR Code inválido" };
    if (c.status_checkin) return { ok: false, msg: "Convidado já fez check-in", convidado: c };
    const updated = { ...c, status_checkin: true };
    _convidados = _convidados.map((x) => (x.id === c.id ? updated : x));
    emit();
    await sfAtualizarConvidado({ data: { id: c.id, patch: { status_checkin: true } } });
    return { ok: true, msg: "Entrada autorizada", convidado: updated };
  },

  async checkinSessao(hash: string, sessao_id: string): Promise<{ ok: boolean; msg: string; convidado?: Convidado }> {
    const c = _convidados.find((x) => x.qr_code_hash === hash);
    if (!c) return { ok: false, msg: "QR Code inválido" };
    const sessao = _sessoes.find((s) => s.id === sessao_id);
    if (!sessao) return { ok: false, msg: "Sessão inválida" };
    if (c.reserva_id !== sessao.reserva_id) return { ok: false, msg: "QR não pertence a este curso" };
    const existe = _presencas.find((p) => p.sessao_id === sessao_id && p.convidado_id === c.id);
    if (existe) return { ok: false, msg: "Presença já marcada nesta sessão", convidado: c };
    try {
      const data = await sfInserirPresenca({ data: { sessao_id, convidado_id: c.id } });
      _presencas = [..._presencas, rowToPresenca(data as unknown as Record<string, unknown>)];
      emit();
      return { ok: true, msg: `Presença marcada · ${sessao.titulo}`, convidado: c };
    } catch (e) {
      return { ok: false, msg: e instanceof Error ? e.message : "Falha ao marcar presença" };
    }
  },

  // ESPACOS
  espacos: (): Espaco[] => _espacos,
  espacosAtivos: () => _espacos.filter((e) => e.ativo),
  getEspaco: (id: string) => _espacos.find((e) => e.id === id),

  async criarEspaco(input: Omit<Espaco, "id" | "criado_em">): Promise<Espaco> {
    const data = await sfCriarEspaco({ data: { input: input as unknown as Record<string, unknown> } });
    const e = rowToEspaco(data as unknown as Record<string, unknown>);
    if (!_espacos.some((x) => x.id === e.id)) _espacos = [..._espacos, e];
    emit();
    return e;
  },
  async atualizarEspaco(id: string, patch: Partial<Espaco>) {
    _espacos = _espacos.map((e) => (e.id === id ? { ...e, ...patch } : e));
    emit();
    await sfAtualizarEspaco({ data: { id, patch: patch as unknown as Record<string, unknown> } });
  },
  async removerEspaco(id: string) {
    _espacos = _espacos.filter((e) => e.id !== id);
    emit();
    await sfRemoverEspaco({ data: { id } });
  },

  // SESSOES
  sessoes: (): Sessao[] => _sessoes,
  sessoesDaReserva: (reserva_id: string) =>
    _sessoes
      .filter((s) => s.reserva_id === reserva_id)
      .sort((a, b) => (a.data + (a.hora_inicio ?? "")).localeCompare(b.data + (b.hora_inicio ?? ""))),

  async criarSessao(input: Omit<Sessao, "id" | "criado_em">) {
    const data = await sfCriarSessao({ data: { input: input as unknown as Record<string, unknown> } });
    const s = rowToSessao(data as unknown as Record<string, unknown>);
    if (!_sessoes.some((x) => x.id === s.id)) _sessoes = [..._sessoes, s];
    emit();
    return s;
  },
  async atualizarSessao(id: string, patch: Partial<Sessao>) {
    _sessoes = _sessoes.map((s) => (s.id === id ? { ...s, ...patch } : s));
    emit();
    await sfAtualizarSessao({ data: { id, patch: patch as unknown as Record<string, unknown> } });
  },
  async removerSessao(id: string) {
    _sessoes = _sessoes.filter((s) => s.id !== id);
    _presencas = _presencas.filter((p) => p.sessao_id !== id);
    emit();
    await sfRemoverSessao({ data: { id } });
  },

  // PRESENCAS
  presencas: (): Presenca[] => _presencas,
  presencasDaSessao: (sessao_id: string) => _presencas.filter((p) => p.sessao_id === sessao_id),
  presencasDoConvidado: (convidado_id: string) => _presencas.filter((p) => p.convidado_id === convidado_id),
  async removerPresenca(id: string) {
    _presencas = _presencas.filter((p) => p.id !== id);
    emit();
    await sfRemoverPresenca({ data: { id } });
  },

  // MARKETPLACE
  fornecedores: (): Fornecedor[] => _fornecedores,
  servicos: (): Servico[] => _servicos,
  servicosAtivos: (): Servico[] => _servicos.filter((s) => s.activo),
  servicosPorCategoria: (cat: string) => _servicos.filter((s) => s.categoria === cat && s.activo),
  reservaServicos: (): ReservaServico[] => _reservaServicos,
  servicosDaReserva: (reserva_id: string) => _reservaServicos.filter((rs) => rs.reserva_id === reserva_id),

  async criarFornecedor(input: Omit<Fornecedor, "id" | "criado_em">): Promise<Fornecedor> {
    const data = await sfCriarFornecedor({ data: { input: input as unknown as Record<string, unknown> } });
    const f = rowToFornecedor(data as unknown as Record<string, unknown>);
    _fornecedores = [..._fornecedores, f]; emit(); return f;
  },
  async atualizarFornecedor(id: string, patch: Partial<Fornecedor>) {
    _fornecedores = _fornecedores.map((f) => f.id === id ? { ...f, ...patch } : f); emit();
    await sfAtualizarFornecedor({ data: { id, patch: patch as unknown as Record<string, unknown> } });
  },
  async removerFornecedor(id: string) {
    _fornecedores = _fornecedores.filter((f) => f.id !== id); emit();
    await sfRemoverFornecedor({ data: { id } });
  },

  async criarServico(input: Omit<Servico, "id" | "criado_em">): Promise<Servico> {
    const data = await sfCriarServico({ data: { input: input as unknown as Record<string, unknown> } });
    const s = rowToServico(data as unknown as Record<string, unknown>);
    _servicos = [..._servicos, s]; emit(); return s;
  },
  async atualizarServico(id: string, patch: Partial<Servico>) {
    _servicos = _servicos.map((s) => s.id === id ? { ...s, ...patch } : s); emit();
    await sfAtualizarServico({ data: { id, patch: patch as unknown as Record<string, unknown> } });
  },
  async removerServico(id: string) {
    _servicos = _servicos.filter((s) => s.id !== id); emit();
    await sfRemoverServico({ data: { id } });
  },

  async adicionarServicoReserva(reserva_id: string, servico_id: string, quantidade = 1): Promise<ReservaServico> {
    const sv = _servicos.find((s) => s.id === servico_id);
    if (!sv) throw new Error("Serviço não encontrado");
    const subtotal = Number(sv.preco_base) * quantidade;
    const payload = { reserva_id, servico_id, quantidade, preco_unit: sv.preco_base, subtotal, estado: "pendente" as ReservaServicoEstado };
    const data = await sfAdicionarReservaServico({ data: { input: payload as unknown as Record<string, unknown> } });
    const rs = rowToReservaServico(data as unknown as Record<string, unknown>);
    _reservaServicos = [..._reservaServicos, rs]; emit(); return rs;
  },
  async atualizarServicoReserva(id: string, patch: Partial<ReservaServico>) {
    _reservaServicos = _reservaServicos.map((rs) => rs.id === id ? { ...rs, ...patch } : rs); emit();
    await sfAtualizarReservaServico({ data: { id, patch: patch as unknown as Record<string, unknown> } });
  },
  async removerServicoReserva(id: string) {
    _reservaServicos = _reservaServicos.filter((rs) => rs.id !== id); emit();
    await sfRemoverReservaServico({ data: { id } });
  },

  // HISTÓRICO DE ALTERAÇÕES
  alteracoes: (): ReservaAlteracao[] => _alteracoes,
  alteracoesDaReserva: (reserva_id: string) =>
    _alteracoes.filter((a) => a.reserva_id === reserva_id)
      .sort((a, b) => b.criado_em.localeCompare(a.criado_em)),

  async editarReservaAdmin(
    reserva_id: string,
    patch: Partial<Reserva>,
    motivo: string,
    staff_nome = "Admin",
  ) {
    const original = _reservas.find((r) => r.id === reserva_id);
    if (!original) throw new Error("Reserva não encontrada");

    const eventoEm = new Date(original.data_evento + "T12:00:00").getTime();
    const horas = (eventoEm - Date.now()) / 36e5;
    const mudaData = patch.data_evento && patch.data_evento !== original.data_evento;
    const mudaPeriodo = patch.periodo && patch.periodo !== original.periodo;
    const urgente = (horas < 48 && (mudaData || mudaPeriodo)) ? true : false;

    const rows: Record<string, unknown>[] = [];
    for (const [campo, valor_novo] of Object.entries(patch)) {
      const valor_antigo = (original as unknown as Record<string, unknown>)[campo];
      if (JSON.stringify(valor_antigo) === JSON.stringify(valor_novo)) continue;
      rows.push({
        reserva_id, staff_nome, campo, motivo,
        valor_antigo: valor_antigo == null ? null : String(typeof valor_antigo === "object" ? JSON.stringify(valor_antigo) : valor_antigo),
        valor_novo: valor_novo == null ? null : String(typeof valor_novo === "object" ? JSON.stringify(valor_novo) : valor_novo),
        urgente,
      });
    }
    if (rows.length > 0) {
      await sfRegistarAlteracoes({ data: { rows } });
      // recarrega histórico
      try {
        const rows2 = await sfListarAlteracoes();
        _alteracoes = (rows2 as unknown as Record<string, unknown>[]).map(rowToAlteracao);
      } catch { /* ignora */ }
    }
    await Store.atualizarReserva(reserva_id, { ...patch, alteracao_urgente: urgente || original.alteracao_urgente });
  },

  // CONFIG PAGAMENTO
  configPagamento: (): ConfigPagamento => _configPagamento,
  async atualizarConfigPagamento(patch: Partial<ConfigPagamento>) {
    _configPagamento = { ..._configPagamento, ...patch };
    emit();
    if (!_configPagamento.id) return;
    const c = _configPagamento;
    const clean = {
      iban: c.iban, titular: c.titular, banco: c.banco,
      express_numero: c.express_numero, instrucoes: c.instrucoes,
    };
    await sfAtualizarConfigPagamento({ data: { id: c.id, patch: clean } });
  },


  // ADMIN AUTH (provisional — partilha de password até implementarmos auth próprio)
  isAdmin: () => typeof window !== "undefined" && localStorage.getItem(K_ADMIN) === "1",
  loginAdmin: (password: string) => {
    if (password === "agd2026") { localStorage.setItem(K_ADMIN, "1"); return true; }
    return false;
  },
  logoutAdmin: () => localStorage.removeItem(K_ADMIN),
};
