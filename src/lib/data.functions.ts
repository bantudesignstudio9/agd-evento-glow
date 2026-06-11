// Todas as escritas + leituras admin passam por aqui.
// Usa supabaseAdmin (service-role) por baixo, executado sempre no servidor.
// Sem auth de cliente final por design (continuamos com password partilhada de
// admin enquanto não introduzimos um método novo). As políticas RLS bloqueiam
// escritas via anon key, forçando que todo write passe por este ficheiro.
import { createServerFn } from "@tanstack/react-start";

// ---------- helpers ----------
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as {
    from: (t: string) => {
      select: (c?: string) => {
        order: (k: string, o?: { ascending: boolean }) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
      };
      insert: (v: unknown) => {
        select: () => { single: () => Promise<{ data: unknown; error: { message: string } | null }> };
      } & Promise<{ error: { message: string } | null }>;
      update: (v: unknown) => { eq: (k: string, v: string) => Promise<{ error: { message: string } | null }> };
      delete: () => { eq: (k: string, v: string) => Promise<{ error: { message: string } | null }> };
    };
  };
}

function throwIf(error: { message: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback);
}

// ---------- RESERVAS (público) ----------
export const sfCriarReserva = createServerFn({ method: "POST" })
  .inputValidator((d: { input: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    const sb = await admin();
    const ref = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join("");
    const entidade = String(99000 + Math.floor(Math.random() * 999));
    const payload = { ...data.input, status: "Pendente", entidade_pagamento: entidade, referencia_pagamento: ref };
    const { data: row, error } = await sb.from("reservas").insert(payload).select().single();
    throwIf(error, "Falha ao criar reserva");
    return row as never;
  });

export const sfAtualizarReserva = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; patch: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb.from("reservas").update(data.patch).eq("id", data.id);
    throwIf(error, "Falha ao atualizar");
    return { ok: true };
  });

export const sfRemoverReserva = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb.from("reservas").delete().eq("id", data.id);
    throwIf(error, "Falha ao remover");
    return { ok: true };
  });

// ---------- CONVIDADOS (público) ----------
export const sfAddConvidado = createServerFn({ method: "POST" })
  .inputValidator((d: { reserva_id: string; nome: string; telefone?: string | null }) => d)
  .handler(async ({ data }) => {
    const sb = await admin();
    const qr = `AGD-${data.reserva_id.slice(0, 8)}-${crypto.randomUUID().slice(0, 8)}`.toUpperCase();
    const payload = {
      reserva_id: data.reserva_id, nome_convidado: data.nome,
      telefone: data.telefone || null, qr_code_hash: qr, status_checkin: false,
    };
    const { data: row, error } = await sb.from("convidados").insert(payload).select().single();
    throwIf(error, "Falha ao adicionar convidado");
    return row as never;
  });

export const sfAtualizarConvidado = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; patch: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb.from("convidados").update(data.patch).eq("id", data.id);
    throwIf(error, "Falha ao atualizar convidado");
    return { ok: true };
  });

export const sfRemoverConvidado = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb.from("convidados").delete().eq("id", data.id);
    throwIf(error, "Falha ao remover convidado");
    return { ok: true };
  });

// ---------- PRESENCAS (sessões / check-in) ----------
export const sfInserirPresenca = createServerFn({ method: "POST" })
  .inputValidator((d: { sessao_id: string; convidado_id: string }) => d)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: row, error } = await sb.from("presencas").insert(data).select().single();
    throwIf(error, "Falha ao marcar presença");
    return row as never;
  });

export const sfRemoverPresenca = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb.from("presencas").delete().eq("id", data.id);
    throwIf(error, "Falha");
    return { ok: true };
  });

// ---------- ESPACOS (admin) ----------
export const sfCriarEspaco = createServerFn({ method: "POST" })
  .inputValidator((d: { input: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: row, error } = await sb.from("espacos").insert(data.input).select().single();
    throwIf(error, "Falha ao criar espaço");
    return row as never;
  });

export const sfAtualizarEspaco = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; patch: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb.from("espacos").update(data.patch).eq("id", data.id);
    throwIf(error, "Falha");
    return { ok: true };
  });

export const sfRemoverEspaco = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb.from("espacos").delete().eq("id", data.id);
    throwIf(error, "Falha");
    return { ok: true };
  });

// ---------- SESSOES ----------
export const sfCriarSessao = createServerFn({ method: "POST" })
  .inputValidator((d: { input: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: row, error } = await sb.from("sessoes").insert(data.input).select().single();
    throwIf(error, "Falha ao criar sessão");
    return row as never;
  });

export const sfAtualizarSessao = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; patch: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb.from("sessoes").update(data.patch).eq("id", data.id);
    throwIf(error, "Falha");
    return { ok: true };
  });

export const sfRemoverSessao = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb.from("sessoes").delete().eq("id", data.id);
    throwIf(error, "Falha");
    return { ok: true };
  });

// ---------- MARKETPLACE (admin) ----------
export const sfListarFornecedores = createServerFn({ method: "GET" })
  .handler(async () => {
    const sb = await admin();
    const { data, error } = await sb.from("fornecedores").select("*").order("nome");
    throwIf(error, "Falha ao listar fornecedores");
    return (data ?? []) as Record<string, unknown>[];
  });

export const sfCriarFornecedor = createServerFn({ method: "POST" })
  .inputValidator((d: { input: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: row, error } = await sb.from("fornecedores").insert(data.input).select().single();
    throwIf(error, "Falha");
    return row as never;
  });

export const sfAtualizarFornecedor = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; patch: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb.from("fornecedores").update(data.patch).eq("id", data.id);
    throwIf(error, "Falha");
    return { ok: true };
  });

export const sfRemoverFornecedor = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb.from("fornecedores").delete().eq("id", data.id);
    throwIf(error, "Falha");
    return { ok: true };
  });

export const sfCriarServico = createServerFn({ method: "POST" })
  .inputValidator((d: { input: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: row, error } = await sb.from("servicos").insert(data.input).select().single();
    throwIf(error, "Falha");
    return row as never;
  });

export const sfAtualizarServico = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; patch: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb.from("servicos").update(data.patch).eq("id", data.id);
    throwIf(error, "Falha");
    return { ok: true };
  });

export const sfRemoverServico = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb.from("servicos").delete().eq("id", data.id);
    throwIf(error, "Falha");
    return { ok: true };
  });

export const sfAdicionarReservaServico = createServerFn({ method: "POST" })
  .inputValidator((d: { input: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: row, error } = await sb.from("reserva_servicos").insert(data.input).select().single();
    throwIf(error, "Falha");
    return row as never;
  });

export const sfAtualizarReservaServico = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; patch: Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb.from("reserva_servicos").update(data.patch).eq("id", data.id);
    throwIf(error, "Falha");
    return { ok: true };
  });

export const sfRemoverReservaServico = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb.from("reserva_servicos").delete().eq("id", data.id);
    throwIf(error, "Falha");
    return { ok: true };
  });

// ---------- ALTERAÇÕES (admin) ----------
export const sfListarAlteracoes = createServerFn({ method: "GET" })
  .handler(async () => {
    const sb = await admin();
    const { data, error } = await sb.from("reserva_alteracoes").select("*").order("criado_em", { ascending: false });
    throwIf(error, "Falha ao listar alterações");
    return (data ?? []) as Record<string, unknown>[];
  });

export const sfRegistarAlteracoes = createServerFn({ method: "POST" })
  .inputValidator((d: { rows: Record<string, unknown>[] }) => d)
  .handler(async ({ data }) => {
    if (data.rows.length === 0) return { ok: true };
    const sb = await admin();
    const { error } = await (sb.from("reserva_alteracoes").insert(data.rows) as unknown as Promise<{ error: { message: string } | null }>);
    throwIf(error, "Falha ao registar alterações");
    return { ok: true };
  });

// ---------- STORAGE upload ----------
export const sfUploadAsset = createServerFn({ method: "POST" })
  .inputValidator((d: { reservaId: string; kind: "logo" | "bg" | "template"; filename: string; contentType: string; base64: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ext = data.filename.split(".").pop()?.toLowerCase() || "png";
    const path = `${data.reservaId}/${data.kind}-${Date.now()}.${ext}`;
    const bin = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    const { error } = await supabaseAdmin.storage.from("event-assets")
      .upload(path, bin, { upsert: true, contentType: data.contentType });
    if (error) throw new Error(error.message);
    const { data: pub } = supabaseAdmin.storage.from("event-assets").getPublicUrl(path);
    return { url: pub.publicUrl, path };
  });
