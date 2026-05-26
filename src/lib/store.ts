import type { Reserva, Convidado, Period, Status } from "./types";

const K_RES = "agd_reservas";
const K_CON = "agd_convidados";
const K_ADMIN = "agd_admin";

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}
function write<T>(key: string, v: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(v));
  window.dispatchEvent(new Event("agd:update"));
}

export const Store = {
  reservas: (): Reserva[] => read<Reserva>(K_RES),
  convidados: (): Convidado[] => read<Convidado>(K_CON),

  getReserva: (id: string) => read<Reserva>(K_RES).find((r) => r.id === id),
  getReservaByRef: (ref: string) =>
    read<Reserva>(K_RES).find((r) => r.referencia_pagamento === ref),
  getConvidadoByHash: (hash: string) =>
    read<Convidado>(K_CON).find((c) => c.qr_code_hash === hash),

  reservasNoDia: (data: string) =>
    read<Reserva>(K_RES).filter((r) => r.data_evento === data && r.status !== "Cancelado"),

  criarReserva: (input: Omit<Reserva, "id" | "status" | "entidade_pagamento" | "referencia_pagamento" | "criado_em">): Reserva => {
    const all = read<Reserva>(K_RES);
    const ref = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join("");
    const entidade = String(99000 + Math.floor(Math.random() * 999));
    const nova: Reserva = {
      ...input,
      id: crypto.randomUUID(),
      status: "Pendente",
      entidade_pagamento: entidade,
      referencia_pagamento: ref,
      criado_em: new Date().toISOString(),
    };
    write(K_RES, [...all, nova]);
    return nova;
  },

  atualizarStatus: (id: string, status: Status) => {
    const all = read<Reserva>(K_RES);
    write(K_RES, all.map((r) => (r.id === id ? { ...r, status } : r)));
  },

  atualizarReserva: (id: string, patch: Partial<Reserva>) => {
    const all = read<Reserva>(K_RES);
    write(K_RES, all.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  },

  convidadosDaReserva: (reserva_id: string) =>
    read<Convidado>(K_CON).filter((c) => c.reserva_id === reserva_id),

  addConvidado: (reserva_id: string, nome: string, telefone?: string): Convidado => {
    const all = read<Convidado>(K_CON);
    const c: Convidado = {
      id: crypto.randomUUID(),
      reserva_id,
      nome_convidado: nome,
      telefone,
      qr_code_hash: `AGD-${reserva_id.slice(0, 8)}-${crypto.randomUUID().slice(0, 8)}`.toUpperCase(),
      status_checkin: false,
    };
    write(K_CON, [...all, c]);
    return c;
  },

  atualizarConvidado: (id: string, patch: Partial<Convidado>) => {
    const all = read<Convidado>(K_CON);
    write(K_CON, all.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  },

  removerConvidado: (id: string) => {
    write(K_CON, read<Convidado>(K_CON).filter((c) => c.id !== id));
  },

  checkin: (hash: string): { ok: boolean; msg: string; convidado?: Convidado } => {
    const all = read<Convidado>(K_CON);
    const idx = all.findIndex((c) => c.qr_code_hash === hash);
    if (idx === -1) return { ok: false, msg: "QR Code inválido" };
    if (all[idx].status_checkin) return { ok: false, msg: "Convidado já fez check-in", convidado: all[idx] };
    all[idx] = { ...all[idx], status_checkin: true };
    write(K_CON, all);
    return { ok: true, msg: "Entrada autorizada", convidado: all[idx] };
  },

  periodosOcupados: (data: string): Period[] => {
    return read<Reserva>(K_RES)
      .filter((r) => r.data_evento === data && r.status !== "Cancelado")
      .map((r) => r.periodo);
  },

  isAdmin: () => typeof window !== "undefined" && localStorage.getItem(K_ADMIN) === "1",
  loginAdmin: (password: string) => {
    if (password === "agd2026") { localStorage.setItem(K_ADMIN, "1"); return true; }
    return false;
  },
  logoutAdmin: () => localStorage.removeItem(K_ADMIN),
};
