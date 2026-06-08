import { supabase } from "@/integrations/supabase/client";
import type {
  Reserva, Convidado, Period, Status, Espaco, Sessao, Presenca, RsvpStatus,
} from "./types";

const K_ADMIN = "agd_admin";

// In-memory caches (hydrated from Supabase + kept in sync via Realtime)
let _reservas: Reserva[] = [];
let _convidados: Convidado[] = [];
let _espacos: Espaco[] = [];
let _sessoes: Sessao[] = [];
let _presencas: Presenca[] = [];
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

async function hydrate() {
  const [{ data: rs }, { data: cs }, { data: es }, { data: ss }, { data: ps }] = await Promise.all([
    supabase.from("reservas").select("*").order("criado_em", { ascending: false }),
    supabase.from("convidados").select("*"),
    supabase.from("espacos").select("*").order("nome"),
    supabase.from("sessoes").select("*").order("data"),
    supabase.from("presencas").select("*"),
  ]);
  _reservas = (rs ?? []).map(rowToReserva);
  _convidados = (cs ?? []).map(rowToConvidado);
  _espacos = (es ?? []).map(rowToEspaco);
  _sessoes = (ss ?? []).map(rowToSessao);
  _presencas = (ps ?? []).map(rowToPresenca);
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
    .on("postgres_changes", { event: "*", schema: "public", table: "reservas" }, (p) => {
      _reservas = applyChange(_reservas, p as never, rowToReserva); emit();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "convidados" }, (p) => {
      _convidados = applyChange(_convidados, p as never, rowToConvidado); emit();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "espacos" }, (p) => {
      _espacos = applyChange(_espacos, p as never, rowToEspaco); emit();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "sessoes" }, (p) => {
      _sessoes = applyChange(_sessoes, p as never, rowToSessao); emit();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "presencas" }, (p) => {
      _presencas = applyChange(_presencas, p as never, rowToPresenca); emit();
    })
    .subscribe();
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
    const ref = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join("");
    const entidade = String(99000 + Math.floor(Math.random() * 999));
    const payload = {
      ...input,
      status: "Pendente" as Status,
      entidade_pagamento: entidade,
      referencia_pagamento: ref,
    };
    const { data, error } = await supabase
      .from("reservas").insert(payload as never).select().single();
    if (error || !data) throw new Error(error?.message || "Falha ao criar reserva");
    const nova = rowToReserva(data);
    if (!_reservas.some((x) => x.id === nova.id)) _reservas = [nova, ..._reservas];
    emit();
    return nova;
  },

  async atualizarStatus(id: string, status: Status) {
    _reservas = _reservas.map((r) => (r.id === id ? { ...r, status } : r));
    emit();
    await supabase.from("reservas").update({ status }).eq("id", id);
  },

  async atualizarReserva(id: string, patch: Partial<Reserva>) {
    _reservas = _reservas.map((r) => (r.id === id ? { ...r, ...patch } : r));
    emit();
    await supabase.from("reservas").update(patch as never).eq("id", id);
  },

  // CONVIDADOS
  convidados: (): Convidado[] => _convidados,
  getConvidadoByHash: (hash: string) => _convidados.find((c) => c.qr_code_hash === hash),
  convidadosDaReserva: (reserva_id: string) =>
    _convidados.filter((c) => c.reserva_id === reserva_id),

  async addConvidado(reserva_id: string, nome: string, telefone?: string): Promise<Convidado> {
    const qr = `AGD-${reserva_id.slice(0, 8)}-${crypto.randomUUID().slice(0, 8)}`.toUpperCase();
    const payload = {
      reserva_id, nome_convidado: nome,
      telefone: telefone || null, qr_code_hash: qr, status_checkin: false,
    };
    const { data, error } = await supabase
      .from("convidados").insert(payload).select().single();
    if (error || !data) throw new Error(error?.message || "Falha ao adicionar convidado");
    const c = rowToConvidado(data);
    if (!_convidados.some((x) => x.id === c.id)) _convidados = [..._convidados, c];
    emit();
    return c;
  },

  async atualizarConvidado(id: string, patch: Partial<Convidado>) {
    _convidados = _convidados.map((c) => (c.id === id ? { ...c, ...patch } : c));
    emit();
    await supabase.from("convidados").update(patch as never).eq("id", id);
  },

  async removerConvidado(id: string) {
    _convidados = _convidados.filter((c) => c.id !== id);
    emit();
    await supabase.from("convidados").delete().eq("id", id);
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

  // CHECK-IN (evento simples - 1ª vez)
  async checkin(hash: string): Promise<{ ok: boolean; msg: string; convidado?: Convidado }> {
    const c = _convidados.find((x) => x.qr_code_hash === hash);
    if (!c) return { ok: false, msg: "QR Code inválido" };
    if (c.status_checkin) return { ok: false, msg: "Convidado já fez check-in", convidado: c };
    const updated = { ...c, status_checkin: true };
    _convidados = _convidados.map((x) => (x.id === c.id ? updated : x));
    emit();
    await supabase.from("convidados").update({ status_checkin: true }).eq("id", c.id);
    return { ok: true, msg: "Entrada autorizada", convidado: updated };
  },

  // CHECK-IN por sessão (cursos/formações)
  async checkinSessao(hash: string, sessao_id: string): Promise<{ ok: boolean; msg: string; convidado?: Convidado }> {
    const c = _convidados.find((x) => x.qr_code_hash === hash);
    if (!c) return { ok: false, msg: "QR Code inválido" };
    const sessao = _sessoes.find((s) => s.id === sessao_id);
    if (!sessao) return { ok: false, msg: "Sessão inválida" };
    if (c.reserva_id !== sessao.reserva_id) return { ok: false, msg: "QR não pertence a este curso" };
    const existe = _presencas.find((p) => p.sessao_id === sessao_id && p.convidado_id === c.id);
    if (existe) return { ok: false, msg: "Presença já marcada nesta sessão", convidado: c };
    const { data, error } = await supabase.from("presencas")
      .insert({ sessao_id, convidado_id: c.id }).select().single();
    if (error || !data) return { ok: false, msg: error?.message ?? "Falha ao marcar presença" };
    _presencas = [..._presencas, rowToPresenca(data)];
    emit();
    return { ok: true, msg: `Presença marcada · ${sessao.titulo}`, convidado: c };
  },

  // ESPACOS
  espacos: (): Espaco[] => _espacos,
  espacosAtivos: () => _espacos.filter((e) => e.ativo),
  getEspaco: (id: string) => _espacos.find((e) => e.id === id),

  async criarEspaco(input: Omit<Espaco, "id" | "criado_em">): Promise<Espaco> {
    const { data, error } = await supabase.from("espacos").insert(input as never).select().single();
    if (error || !data) throw new Error(error?.message || "Falha ao criar espaço");
    const e = rowToEspaco(data);
    if (!_espacos.some((x) => x.id === e.id)) _espacos = [..._espacos, e];
    emit();
    return e;
  },
  async atualizarEspaco(id: string, patch: Partial<Espaco>) {
    _espacos = _espacos.map((e) => (e.id === id ? { ...e, ...patch } : e));
    emit();
    await supabase.from("espacos").update(patch as never).eq("id", id);
  },
  async removerEspaco(id: string) {
    _espacos = _espacos.filter((e) => e.id !== id);
    emit();
    await supabase.from("espacos").delete().eq("id", id);
  },

  // SESSOES (cursos)
  sessoes: (): Sessao[] => _sessoes,
  sessoesDaReserva: (reserva_id: string) =>
    _sessoes
      .filter((s) => s.reserva_id === reserva_id)
      .sort((a, b) => (a.data + (a.hora_inicio ?? "")).localeCompare(b.data + (b.hora_inicio ?? ""))),

  async criarSessao(input: Omit<Sessao, "id" | "criado_em">) {
    const { data, error } = await supabase.from("sessoes").insert(input as never).select().single();
    if (error || !data) throw new Error(error?.message || "Falha ao criar sessão");
    const s = rowToSessao(data);
    if (!_sessoes.some((x) => x.id === s.id)) _sessoes = [..._sessoes, s];
    emit();
    return s;
  },
  async atualizarSessao(id: string, patch: Partial<Sessao>) {
    _sessoes = _sessoes.map((s) => (s.id === id ? { ...s, ...patch } : s));
    emit();
    await supabase.from("sessoes").update(patch as never).eq("id", id);
  },
  async removerSessao(id: string) {
    _sessoes = _sessoes.filter((s) => s.id !== id);
    _presencas = _presencas.filter((p) => p.sessao_id !== id);
    emit();
    await supabase.from("sessoes").delete().eq("id", id);
  },

  // PRESENCAS
  presencas: (): Presenca[] => _presencas,
  presencasDaSessao: (sessao_id: string) => _presencas.filter((p) => p.sessao_id === sessao_id),
  presencasDoConvidado: (convidado_id: string) => _presencas.filter((p) => p.convidado_id === convidado_id),
  async removerPresenca(id: string) {
    _presencas = _presencas.filter((p) => p.id !== id);
    emit();
    await supabase.from("presencas").delete().eq("id", id);
  },

  // ADMIN AUTH (provisional)
  isAdmin: () => typeof window !== "undefined" && localStorage.getItem(K_ADMIN) === "1",
  loginAdmin: (password: string) => {
    if (password === "agd2026") { localStorage.setItem(K_ADMIN, "1"); return true; }
    return false;
  },
  logoutAdmin: () => localStorage.removeItem(K_ADMIN),
};
