import { supabase } from "@/integrations/supabase/client";
import type { Reserva, Convidado, Period, Status } from "./types";

const K_ADMIN = "agd_admin";

// In-memory caches (hydrated from Supabase + kept in sync via Realtime)
let _reservas: Reserva[] = [];
let _convidados: Convidado[] = [];
let _initialized = false;
let _initPromise: Promise<void> | null = null;

function emit() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("agd:update"));
  }
}

// Map DB row → Reserva type
function rowToReserva(r: Record<string, unknown>): Reserva {
  return r as unknown as Reserva;
}
function rowToConvidado(r: Record<string, unknown>): Convidado {
  return r as unknown as Convidado;
}

async function hydrate() {
  const [{ data: rs }, { data: cs }] = await Promise.all([
    supabase.from("reservas").select("*").order("criado_em", { ascending: false }),
    supabase.from("convidados").select("*"),
  ]);
  _reservas = (rs ?? []).map(rowToReserva);
  _convidados = (cs ?? []).map(rowToConvidado);
  emit();
}

function subscribe() {
  supabase
    .channel("agd-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "reservas" }, (p) => {
      if (p.eventType === "INSERT") {
        const r = rowToReserva(p.new as Record<string, unknown>);
        if (!_reservas.some((x) => x.id === r.id)) _reservas = [r, ..._reservas];
      } else if (p.eventType === "UPDATE") {
        const r = rowToReserva(p.new as Record<string, unknown>);
        _reservas = _reservas.map((x) => (x.id === r.id ? r : x));
      } else if (p.eventType === "DELETE") {
        const id = (p.old as { id: string }).id;
        _reservas = _reservas.filter((x) => x.id !== id);
      }
      emit();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "convidados" }, (p) => {
      if (p.eventType === "INSERT") {
        const c = rowToConvidado(p.new as Record<string, unknown>);
        if (!_convidados.some((x) => x.id === c.id)) _convidados = [..._convidados, c];
      } else if (p.eventType === "UPDATE") {
        const c = rowToConvidado(p.new as Record<string, unknown>);
        _convidados = _convidados.map((x) => (x.id === c.id ? c : x));
      } else if (p.eventType === "DELETE") {
        const id = (p.old as { id: string }).id;
        _convidados = _convidados.filter((x) => x.id !== id);
      }
      emit();
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

  reservas: (): Reserva[] => _reservas,
  convidados: (): Convidado[] => _convidados,

  getReserva: (id: string) => _reservas.find((r) => r.id === id),
  getReservaByRef: (ref: string) =>
    _reservas.find((r) => r.referencia_pagamento === ref.trim()),
  getConvidadoByHash: (hash: string) =>
    _convidados.find((c) => c.qr_code_hash === hash),

  reservasNoDia: (data: string) =>
    _reservas.filter((r) => r.data_evento === data && r.status !== "Cancelado"),

  periodosOcupados: (data: string): Period[] =>
    _reservas
      .filter((r) => r.data_evento === data && r.status !== "Cancelado")
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
      .from("reservas")
      .insert(payload as never)
      .select()
      .single();
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

  convidadosDaReserva: (reserva_id: string) =>
    _convidados.filter((c) => c.reserva_id === reserva_id),

  async addConvidado(reserva_id: string, nome: string, telefone?: string): Promise<Convidado> {
    const qr = `AGD-${reserva_id.slice(0, 8)}-${crypto.randomUUID().slice(0, 8)}`.toUpperCase();
    const payload = {
      reserva_id,
      nome_convidado: nome,
      telefone: telefone || null,
      qr_code_hash: qr,
      status_checkin: false,
    };
    const { data, error } = await supabase
      .from("convidados")
      .insert(payload)
      .select()
      .single();
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

  isAdmin: () => typeof window !== "undefined" && localStorage.getItem(K_ADMIN) === "1",
  loginAdmin: (password: string) => {
    if (password === "agd2026") { localStorage.setItem(K_ADMIN, "1"); return true; }
    return false;
  },
  logoutAdmin: () => localStorage.removeItem(K_ADMIN),
};
